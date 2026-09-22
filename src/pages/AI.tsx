import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Send, Sparkles, BookOpen, Trash2, ArrowUpRight, GraduationCap } from 'lucide-react';
import { buildKnowledgeContext } from '../utils/knowledgeSearch';
import { buildTutorPlan, tutorModeLabel, type TutorMode, type TutorModePreference } from '../utils/tutorPlanner';
import { useProgress } from '../hooks/useProgress';
import { useLearningGoal } from '../hooks/useLearningGoal';
import { buildGoalTutorContext } from '../learning/goalTutorContext';
import { ChatText } from '../components/ui/ChatText';

interface Message {
  role: 'user' | 'bot';
  text: string;
  source?: 'gemini' | 'local';
  model?: string;
  fallbackUsed?: boolean;
  tutorMode?: TutorMode;
  links?: { to: string; label: string }[];
}

interface GeminiPayload {
  text?: unknown;
  error?: unknown;
  code?: unknown;
  model?: unknown;
  fallbackUsed?: unknown;
  upstreamStatus?: unknown;
}

const CHAT_KEY = 'mathnexus_ai_chat_v1';
const TUTOR_PREF_KEY = 'mathnexus_ai_tutor_mode_v1';
const WELCOME: Message = {
  role: 'bot',
  text: 'Chào bạn! Mình sẽ cố gắng dẫn bạn hiểu bản chất thay vì chỉ ném ra đáp án. Nếu bạn thực sự muốn lời giải đầy đủ, hãy chọn chế độ “Lời giải đầy đủ” hoặc nói rõ trong câu hỏi.',
};

const QUICK = [
  'Mình yếu đạo hàm, nên học gì trước?',
  'Giải thích trực quan số phức',
  'Gợi ý chứng minh định lý Pythagoras',
  'Tại sao energy drift tăng trong N-body?',
  'Cho lời giải đầy đủ: C(5,2) bằng bao nhiêu?',
];

const MODE_OPTIONS: TutorModePreference[] = [
  'AUTO',
  'DISCOVER',
  'GUIDED_HINT',
  'CONCEPT_EXPLANATION',
  'PROOF_GUIDANCE',
  'ERROR_DIAGNOSIS',
  'VISUAL_INTUITION',
  'DIRECT_SOLUTION',
];

function loadConversation(): Message[] {
  try {
    const raw = sessionStorage.getItem(CHAT_KEY);
    if (!raw) return [WELCOME];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [WELCOME];

    const safe = parsed
      .filter(item => item && (item.role === 'user' || item.role === 'bot') && typeof item.text === 'string')
      .slice(-30)
      .map(item => ({
        role: item.role as 'user' | 'bot',
        text: item.text.slice(0, 16000),
        source: item.source === 'gemini' || item.source === 'local' ? item.source : undefined,
        model: typeof item.model === 'string' ? item.model.slice(0, 120) : undefined,
        fallbackUsed: item.fallbackUsed === true,
        tutorMode: MODE_OPTIONS.includes(item.tutorMode) && item.tutorMode !== 'AUTO'
          ? item.tutorMode as TutorMode
          : undefined,
        links: Array.isArray(item.links)
          ? item.links
              .filter((link: unknown): link is { to: string; label: string } =>
                Boolean(link) &&
                typeof (link as { to?: unknown }).to === 'string' &&
                typeof (link as { label?: unknown }).label === 'string'
              )
              .slice(0, 6)
          : undefined,
      }));

    return safe.length ? safe : [WELCOME];
  } catch {
    return [WELCOME];
  }
}

function loadTutorPreference(): TutorModePreference {
  try {
    const value = sessionStorage.getItem(TUTOR_PREF_KEY) as TutorModePreference | null;
    return value && MODE_OPTIONS.includes(value) ? value : 'AUTO';
  } catch {
    return 'AUTO';
  }
}

function friendlyGeminiError(payload: GeminiPayload, status: number): string {
  const code = typeof payload.code === 'string' ? payload.code : '';
  const upstreamStatus = typeof payload.upstreamStatus === 'number' ? payload.upstreamStatus : null;

  if (status === 404 || code === 'MISSING_API_KEY') return 'Gemini chưa được cấu hình trên máy chủ này.';
  if (status === 429 || upstreamStatus === 429 || code === 'RESOURCE_EXHAUSTED') return 'Gemini đang giới hạn lượt gọi. Hãy thử lại sau một chút.';
  if (status === 503 || code === 'UNAVAILABLE') return 'Gemini đang quá tải tạm thời. MathNexus đã thử cả model dự phòng nhưng chưa nhận được phản hồi.';
  if (status === 504 || code === 'TIMEOUT') return 'Gemini phản hồi quá chậm nên MathNexus đã dừng yêu cầu.';
  if (code === 'NETWORK_ERROR') return 'Máy chủ MathNexus chưa kết nối được tới Gemini.';
  return 'Chưa kết nối được với Gemini. Hãy thử lại sau.';
}

export default function AI() {
  const [searchParams] = useSearchParams();
  const progress = useProgress();
  const { goal } = useLearningGoal();
  const goalContext = buildGoalTutorContext(progress, goal);
  const [messages, setMessages] = useState<Message[]>(loadConversation);
  const [input, setInput] = useState(() => searchParams.get('q')?.slice(0, 12000) || '');
  const [loading, setLoading] = useState(false);
  const [tutorPreference, setTutorPreference] = useState<TutorModePreference>(loadTutorPreference);
  const [activeTutorMode, setActiveTutorMode] = useState<TutorMode | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;

    try {
      sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // Chat persistence is convenience only.
    }
  }, [messages, loading]);

  useEffect(() => {
    try { sessionStorage.setItem(TUTOR_PREF_KEY, tutorPreference); } catch { /* no-op */ }
  }, [tutorPreference]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const clearConversation = () => {
    controllerRef.current?.abort();
    busy.current = false;
    setLoading(false);
    setActiveTutorMode(null);
    setMessages([WELCOME]);
    try { sessionStorage.removeItem(CHAT_KEY); } catch { /* no-op */ }
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy.current) return;

    busy.current = true;
    const context = buildKnowledgeContext(text, 6);
    const plan = buildTutorPlan(text, context.hits, progress, tutorPreference);
    const turnGoalContext = buildGoalTutorContext(progress, goal);
    const anchorConceptIds = [
      ...plan.anchorConceptIds,
      ...(turnGoalContext?.anchorConceptIds || []),
    ].filter((id, index, all) => all.indexOf(id) === index).slice(0, 6);
    const responseLinks = [
      ...context.links,
      ...(turnGoalContext?.links || []),
    ].filter((link, index, all) => all.findIndex(item => item.to === link.to) === index).slice(0, 8);
    setActiveTutorMode(plan.mode);

    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = window.setTimeout(() => controller.abort('timeout'), 30000);

    setInput('');
    setLoading(true);
    setMessages(current => [...current, { role: 'user', text }]);

    try {
      if (!navigator.onLine) throw new Error('Bạn đang ngoại tuyến.');
      if (import.meta.env.BASE_URL === '/mathnexus/') throw new Error('Bản GitHub Pages đang dùng thư viện tra cứu cục bộ.');

      const history: { role: 'user' | 'model'; text: string }[] = [];
      for (let i = 1; i < messages.length; i++) {
        if (messages[i].source === 'gemini' && messages[i - 1].role === 'user') {
          history.push(
            { role: 'user', text: messages[i - 1].text },
            { role: 'model', text: messages[i].text },
          );
        }
      }

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          history: history.slice(-8),
          appContext: context.text,
          tutor: {
            mode: plan.mode,
            directSolutionAllowed: plan.directSolutionAllowed,
            masterySummary: plan.masterySummary,
            anchorConceptIds,
            goalContext: turnGoalContext?.text || '',
          },
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as GeminiPayload;

      if (!response.ok) {
        throw new Error(friendlyGeminiError(payload, response.status));
      }

      if (typeof payload.text !== 'string' || !payload.text.trim()) {
        throw new Error('Gemini chưa trả về câu trả lời.');
      }

      setMessages(current => [
        ...current,
        {
          role: 'bot',
          text: payload.text as string,
          source: 'gemini',
          model: typeof payload.model === 'string' ? payload.model : undefined,
          fallbackUsed: payload.fallbackUsed === true,
          tutorMode: plan.mode,
          links: responseLinks,
        },
      ]);
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== 'timeout') return;

      const detail = controller.signal.aborted
        ? 'Kết nối Gemini mất quá nhiều thời gian.'
        : error instanceof Error
          ? error.message
          : 'Chưa kết nối được Gemini.';

      const localContext = context.text || 'Thư viện chưa tìm thấy nội dung liên quan. Bạn có thể thử hỏi theo tên khái niệm, chủ đề hoặc mục tiêu học.';
      const localGoal = turnGoalContext
        ? `\n\n**Mục tiêu đang theo:** ${turnGoalContext.targetTitle} · ${turnGoalContext.progressPercent}% theo evidence.`
        : '';
      setMessages(current => [
        ...current,
        {
          role: 'bot',
          source: 'local',
          tutorMode: plan.mode,
          text: `${detail}\n\n**Cách tiếp cận ${tutorModeLabel(plan.mode)}:** ${plan.localOpening}\n\n${localContext}${localGoal}`,
          links: responseLinks,
        },
      ]);
    } finally {
      window.clearTimeout(timer);
      busy.current = false;
      setActiveTutorMode(null);
      if (!controller.signal.aborted || controller.signal.reason === 'timeout') setLoading(false);
    }
  };

  return <section className="page-enter">
    <div className="page-header">
      <p className="eyebrow">SOCRATIC TUTOR · KNOWLEDGE GRAPH + MASTERY</p>
      <h1>Trợ lý MathNexus</h1>
      <p>Trợ lý chọn chiến lược theo câu hỏi, tri thức liên quan và bằng chứng học tập hiện có. Mặc định ưu tiên dẫn dắt; bạn vẫn có thể yêu cầu lời giải đầy đủ.</p>
    </div>

    <div className="tutor-mode-bar">
      <label>
        <GraduationCap size={16} />
        <span>Chế độ gia sư</span>
        <select
          aria-label="Chế độ gia sư"
          value={tutorPreference}
          disabled={loading}
          onChange={event => setTutorPreference(event.target.value as TutorModePreference)}
        >
          {MODE_OPTIONS.map(mode => <option key={mode} value={mode}>{tutorModeLabel(mode)}</option>)}
        </select>
      </label>
      <small>{tutorPreference === 'AUTO'
        ? 'MathNexus tự phân loại ý định mỗi lượt.'
        : 'Chế độ thủ công được ưu tiên cho các lượt tiếp theo.'}</small>
    </div>

    <div className="filter-row">
      {QUICK.map(question => <button className="filter-chip" key={question} onClick={() => void send(question)} disabled={loading}>{question}</button>)}
    </div>

    <div className="chat-panel">
      <div className="chat-header">
        <span><Sparkles size={18} />MathNexus AI · Socratic Gemini</span>
        <button className="icon-button" aria-label="Xóa cuộc trò chuyện" disabled={loading} onClick={clearConversation}><Trash2 size={17} /></button>
      </div>

      <div className="chat-messages" ref={scrollRef} role="log" aria-label="Cuộc trò chuyện" aria-live="polite">
        {messages.map((message, i) => <div key={i} className={`chat-message ${message.role}`}>
          {message.role === 'bot' && <span className="chat-source">
            {message.source === 'local'
              ? <><BookOpen size={13} />Tra cứu cục bộ{message.tutorMode ? ` · ${tutorModeLabel(message.tutorMode)}` : ''}</>
              : <><Sparkles size={13} />{message.source === 'gemini'
                  ? `Gemini${message.model ? ` · ${message.model}` : ''}${message.tutorMode ? ` · ${tutorModeLabel(message.tutorMode)}` : ''}${message.fallbackUsed ? ' · model dự phòng' : ''}`
                  : 'MathNexus'}</>}
          </span>}
          <div className="chat-text"><ChatText text={message.text} /></div>
          {!!message.links?.length && <div className="chat-links">
            {message.links.map(link => <Link key={link.to} to={link.to}>{link.label}<ArrowUpRight size={13} /></Link>)}
          </div>}
        </div>)}

        {loading && <div className="chat-message bot" role="status">
          <span className="chat-source"><Sparkles size={13} />Gemini đang tra cứu và lập chiến lược{activeTutorMode ? ` · ${tutorModeLabel(activeTutorMode)}` : ''}…</span>
          <button className="text-link" onClick={() => {
            controllerRef.current?.abort();
            busy.current = false;
            setLoading(false);
            setActiveTutorMode(null);
          }}>Dừng trả lời</button>
        </div>}
      </div>

      <form className="chat-input" onSubmit={event => { event.preventDefault(); void send(input); }}>
        <input
          aria-label="Câu hỏi cho trợ lý"
          value={input}
          onChange={event => setInput(event.target.value)}
          maxLength={12000}
          disabled={loading}
          placeholder="Ví dụ: mình yếu đạo hàm, nên học gì trước?"
          autoComplete="off"
        />
        <button type="submit" aria-label="Gửi câu hỏi" className="button button-dark" disabled={loading || !input.trim()}><Send size={18} /></button>
      </form>
    </div>

    <p className="helper-text mt-3">Các liên kết dưới câu trả lời là nội dung MathNexus được truy xuất làm bằng chứng/ngữ cảnh. Mastery chỉ dùng để điều chỉnh cách dẫn dắt, không tự suy diễn năng lực nếu chưa có dữ liệu.</p>
  </section>;
}
