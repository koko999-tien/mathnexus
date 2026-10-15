import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Send, Sparkles, BookOpen, Trash2, ArrowUpRight, GraduationCap, Mic, ImagePlus, Volume2, VolumeX, X, Target } from 'lucide-react';
import { detectSkillTemplates } from '../utils/generatedQuiz';
import { buildKnowledgeContext } from '../utils/knowledgeSearch';
import { buildTutorPlan, tutorModeLabel, type TutorMode, type TutorModePreference } from '../utils/tutorPlanner';
import { useProgress } from '../hooks/useProgress';
import { useLearningGoal } from '../hooks/useLearningGoal';
import { buildGoalTutorContext } from '../learning/goalTutorContext';
import { createSseParser } from '../utils/sseClient';
import { ChatText } from '../components/ui/ChatText';

interface Message {
  role: 'user' | 'bot';
  text: string;
  source?: 'gemini' | 'local';
  model?: string;
  fallbackUsed?: boolean;
  tutorMode?: TutorMode;
  links?: { to: string; label: string }[];
  imagePreview?: string;
  streaming?: boolean;
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

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return scope.SpeechRecognition || scope.webkitSpeechRecognition || null;
}

function downscalePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxSide = 1536;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Không xử lý được ảnh này.'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh này.'));
    };
    img.src = url;
  });
}

function speakableText(text: string): string {
  return text
    .split('\\[').join(' công thức ')
    .split('\\]').join(' ')
    .replace(/\$\$[\s\S]*?\$\$|\\\([\s\S]*?\\\)|\$[^$\n]+\$/g, ' công thức ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[#*_`>|()]/g, '')
    .replace(/[[\\\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
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
  const navigate = useNavigate();
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;

    try {
      const persistable = messages.slice(-30).map(message => {
        const { imagePreview, streaming, ...rest } = message;
        void imagePreview;
        void streaming;
        return rest;
      });
      sessionStorage.setItem(CHAT_KEY, JSON.stringify(persistable));
    } catch {
      // Chat persistence is convenience only.
    }
  }, [messages, loading]);

  useEffect(() => {
    try { sessionStorage.setItem(TUTOR_PREF_KEY, tutorPreference); } catch { /* no-op */ }
  }, [tutorPreference]);

  useEffect(() => () => {
    controllerRef.current?.abort();
    recognitionRef.current?.abort();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeakingIndex(null);
  };

  const toggleSpeaking = (index: number, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speakingIndex === index) {
      stopSpeaking();
      return;
    }
    window.speechSynthesis.cancel();
    const plain = speakableText(text);
    if (!plain) return;
    const utterance = new SpeechSynthesisUtterance(plain);
    utterance.lang = 'vi-VN';
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  };

  const toggleListening = () => {
    if (listening) {
      stopListening();
      return;
    }
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) return;
    try {
      const recognition = new Recognition();
      recognition.lang = 'vi-VN';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = event => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result && result.isFinal) transcript += result[0]?.transcript || '';
        }
        if (transcript) setInput(current => (current ? `${current} ${transcript}` : transcript).slice(0, 12000));
      };
      recognition.onerror = () => stopListening();
      recognition.onend = () => {
        recognitionRef.current = null;
        setListening(false);
      };
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      stopListening();
    }
  };

  const clearConversation = () => {
    controllerRef.current?.abort();
    stopSpeaking();
    if (listening) stopListening();
    busy.current = false;
    setLoading(false);
    setActiveTutorMode(null);
    setMessages([WELCOME]);
    try { sessionStorage.removeItem(CHAT_KEY); } catch { /* no-op */ }
  };

  const drillSimilar = (botIndex: number) => {
    const userText = messages.slice(0, botIndex).reverse().find(message => message.role === 'user')?.text || '';
    const botText = messages[botIndex]?.text || '';
    const templates = detectSkillTemplates(`${userText}\n${botText}`);
    const params = new URLSearchParams();
    params.set('src', 'gen');
    params.set('seed', String(Date.now()));
    params.set('size', '5');
    if (templates.length) params.set('tpl', templates.join(','));
    navigate('/practice?' + params.toString());
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    const photo = photoDataUrl;
    if ((!text && !photo) || busy.current) return;

    busy.current = true;
    stopSpeaking();
    if (listening) stopListening();
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
    const timer = window.setTimeout(() => controller.abort('timeout'), 60000);

    setInput('');
    setPhotoPreview(null);
    setPhotoDataUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setLoading(true);
    setMessages(current => [...current, { role: 'user', text: text || '(đã gửi ảnh bài toán)', imagePreview: photo || undefined }]);

    const history: { role: 'user' | 'model'; text: string }[] = [];
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].source === 'gemini' && messages[i - 1].role === 'user') {
        history.push(
          { role: 'user', text: messages[i - 1].text },
          { role: 'model', text: messages[i].text },
        );
      }
    }

    const requestPayload = {
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
      image: photo ? { mime: 'image/jpeg', data: photo } : undefined,
    };

    const appendBotMessage = (message: Message) => {
      setMessages(current => [...current, message]);
    };

    const appendLocalFallback = (detail: string) => {
      const localContext = context.text || 'Thư viện chưa tìm thấy nội dung liên quan. Bạn có thể thử hỏi theo tên khái niệm, chủ đề hoặc mục tiêu học.';
      const localGoal = turnGoalContext
        ? `\n\n**Mục tiêu đang theo:** ${turnGoalContext.targetTitle} · ${turnGoalContext.progressPercent}% theo dữ liệu học tập.`
        : '';
      appendBotMessage({
        role: 'bot',
        source: 'local',
        tutorMode: plan.mode,
        text: `${detail}\n\n**Cách tiếp cận ${tutorModeLabel(plan.mode)}:** ${plan.localOpening}\n\n${localContext}${localGoal}`,
        links: responseLinks,
      });
    };

    try {
      if (!navigator.onLine) throw new Error('Bạn đang ngoại tuyến.');
      if (import.meta.env.BASE_URL === '/mathnexus/') throw new Error('Bản GitHub Pages đang dùng thư viện tra cứu cục bộ.');

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ ...requestPayload, stream: true }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (response.ok && contentType.includes('text/event-stream') && response.body) {
        appendBotMessage({ role: 'bot', text: '', source: 'gemini', tutorMode: plan.mode, streaming: true, links: responseLinks });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamed = '';
        let doneMeta: { model?: string; fallbackUsed?: boolean } = {};
        let streamFailed = false;

        const applyDelta = (delta: string) => {
          streamed += delta;
          const snapshot = streamed;
          setMessages(current => {
            const next = [...current];
            const last = next[next.length - 1];
            if (last && last.role === 'bot') next[next.length - 1] = { ...last, text: snapshot };
            return next;
          });
          const container = scrollRef.current;
          if (container) container.scrollTop = container.scrollHeight;
        };

        const parser = createSseParser(eventPayload => {
          if (eventPayload.type === 'delta' && typeof eventPayload.delta === 'string') {
            applyDelta(eventPayload.delta);
          } else if (eventPayload.type === 'done') {
            doneMeta = { model: eventPayload.model, fallbackUsed: eventPayload.fallbackUsed };
          } else if (eventPayload.type === 'error') {
            streamFailed = true;
          }
        });

        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            parser.feed(decoder.decode(value, { stream: true }));
          }
          parser.finish();
        } catch (readError) {
          if (readError instanceof Error && readError.name === 'AbortError') return;
          streamFailed = true;
        } finally {
          try {
            reader.releaseLock();
          } catch {
            // Lock release is best-effort.
          }
        }

        if (!streamed.trim()) {
          setMessages(current => current.slice(0, -1));
          throw new Error(streamFailed ? 'Gemini đang quá tải tạm thời.' : 'Gemini chưa trả về câu trả lời.');
        }

        setMessages(current => {
          const next = [...current];
          const last = next[next.length - 1];
          if (last && last.role === 'bot') {
            next[next.length - 1] = {
              ...last,
              text: streamed.trim(),
              streaming: false,
              model: doneMeta.model,
              fallbackUsed: doneMeta.fallbackUsed === true,
            };
          }
          return next;
        });
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as GeminiPayload;

      if (!response.ok) {
        throw new Error(friendlyGeminiError(payload, response.status));
      }

      if (typeof payload.text !== 'string' || !payload.text.trim()) {
        throw new Error('Gemini chưa trả về câu trả lời.');
      }

      appendBotMessage({
        role: 'bot',
        text: payload.text as string,
        source: 'gemini',
        model: typeof payload.model === 'string' ? payload.model : undefined,
        fallbackUsed: payload.fallbackUsed === true,
        tutorMode: plan.mode,
        links: responseLinks,
      });
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== 'timeout') return;

      const detail = controller.signal.aborted
        ? 'Kết nối Gemini mất quá nhiều thời gian.'
        : error instanceof Error
          ? error.message
          : 'Chưa kết nối được Gemini.';

      appendLocalFallback(detail);
    } finally {
      window.clearTimeout(timer);
      busy.current = false;
      setActiveTutorMode(null);
      if (!controller.signal.aborted || controller.signal.reason === 'timeout') setLoading(false);
    }
  };

  return <section className="page-enter ai-page">
    <div className="page-header">
      <p className="eyebrow">TRỢ LÝ TOÁN HỌC</p>
      <h1>Hỏi đáp toán học</h1>
      <p>Trợ lý dùng câu hỏi, nội dung liên quan và tiến độ học hiện có để chọn cách trả lời. Mặc định sẽ gợi ý từng bước; bạn vẫn có thể yêu cầu lời giải đầy đủ.</p>
    </div>

    {goalContext && <div className="helper-text mb-3" role="status">
      Đang dùng mục tiêu bạn đã đặt: <strong>{goalContext.targetTitle}</strong> · {goalContext.progressPercent}% theo dữ liệu học tập · <Link to={'/map?concept=' + encodeURIComponent(goalContext.targetConceptId)}>xem trên bản đồ kiến thức</Link>
    </div>}

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
        ? 'Tự chọn cách hỗ trợ phù hợp với câu hỏi.'
        : 'Chế độ thủ công được ưu tiên cho các lượt tiếp theo.'}</small>
    </div>

    <div className="filter-row">
      {QUICK.map(question => <button className="filter-chip" key={question} onClick={() => void send(question)} disabled={loading}>{question}</button>)}
    </div>

    <div className="chat-panel">
      <div className="chat-header">
        <span><Sparkles size={18} />Trợ lý MathNexus · Gemini</span>
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
          {message.imagePreview && <img src={message.imagePreview} alt="Ảnh bài toán đã gửi" className="chat-photo" />}
          <div className="chat-text"><ChatText text={message.text} />{message.streaming && <span className="chat-caret" aria-hidden="true">▍</span>}</div>
          {!!message.links?.length && <div className="chat-links">
            {message.links.map(link => <Link key={link.to} to={link.to}>{link.label}<ArrowUpRight size={13} /></Link>)}
          </div>}
          {message.role === 'bot' && message.text && !message.streaming && message.source && (
            <span className="chat-actions">
              {'speechSynthesis' in window && <button
                className="text-link"
                onClick={() => toggleSpeaking(i, message.text)}
                aria-label={speakingIndex === i ? 'Dừng đọc to' : 'Đọc to câu trả lời'}
              >
                {speakingIndex === i ? <><VolumeX size={14} /> Dừng đọc</> : <><Volume2 size={14} /> Đọc to</>}
              </button>}
              <button className="text-link" onClick={() => drillSimilar(i)} aria-label="Luyện 5 bài tương tự">
                <Target size={14} /> Luyện 5 bài tương tự
              </button>
            </span>
          )}
        </div>)}

        {loading && <div className="chat-message bot" role="status">
          <span className="chat-source"><Sparkles size={13} />Gemini đang xử lý câu hỏi{activeTutorMode ? ` · ${tutorModeLabel(activeTutorMode)}` : ''}…</span>
          <button className="text-link" onClick={() => {
            controllerRef.current?.abort();
            stopSpeaking();
            busy.current = false;
            setLoading(false);
            setActiveTutorMode(null);
          }}>Dừng trả lời</button>
        </div>}
      </div>

      {photoPreview && <div className="chat-photo-preview">
        <img src={photoPreview} alt="Ảnh bài toán sắp gửi" />
        <button
          className="icon-button"
          aria-label="Gỡ ảnh đính kèm"
          disabled={loading}
          onClick={() => {
            setPhotoPreview(null);
            setPhotoDataUrl(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        ><X size={16} /></button>
      </div>}

      <form className="chat-input" onSubmit={event => { event.preventDefault(); void send(input); }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Đính kèm ảnh bài toán"
          style={{ display: 'none' }}
          disabled={loading}
          onChange={event => {
            const file = event.target.files?.[0];
            if (!file) return;
            void downscalePhoto(file)
              .then(dataUrl => {
                setPhotoPreview(dataUrl);
                setPhotoDataUrl(dataUrl);
              })
              .catch(() => {
                setPhotoPreview(null);
                setPhotoDataUrl(null);
              });
          }}
        />
        <button
          type="button"
          aria-label="Đính kèm ảnh bài toán"
          title="Chụp hoặc chọn ảnh bài toán"
          className="icon-button"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
        ><ImagePlus size={18} /></button>
        {getSpeechRecognitionConstructor() && <button
          type="button"
          aria-label={listening ? 'Dừng nói' : 'Nói thay vì gõ'}
          aria-pressed={listening}
          title="Nói câu hỏi bằng tiếng Việt"
          className="icon-button"
          disabled={loading}
          onClick={toggleListening}
        ><Mic size={18} /></button>}
        <input
          aria-label="Câu hỏi cho trợ lý"
          value={input}
          onChange={event => setInput(event.target.value)}
          maxLength={12000}
          disabled={loading}
          placeholder={listening ? 'Đang nghe… hãy nói câu hỏi' : 'Ví dụ: mình yếu đạo hàm, nên học gì trước?'}
          autoComplete="off"
        />
        <button type="submit" aria-label="Gửi câu hỏi" className="button button-dark" disabled={loading || (!input.trim() && !photoDataUrl)}><Send size={18} /></button>
      </form>
    </div>

    <p className="helper-text mt-3">Các liên kết dưới câu trả lời là tài liệu MathNexus đã dùng để tham chiếu. Tiến độ học chỉ dùng để điều chỉnh cách hỗ trợ và không được dùng để tự suy đoán năng lực khi chưa có đủ dữ liệu.</p>
  </section>;
}
