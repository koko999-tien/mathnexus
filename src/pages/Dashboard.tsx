import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Brain,
  Calculator,
  ChartSpline,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  History,
  Layers3,
  Library,
  LoaderCircle,
  Network,
  RefreshCcw,
  Search,
  Sigma,
  SlidersHorizontal,
  Target,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { LESSONS } from '../data/lessons';
import { BOOKS } from '../data/books';
import { FORMS } from '../data/formulas';
import { MATH_CONCEPTS, MATH_DOMAINS } from '../data/mathKnowledge';
import { useProgress } from '../hooks/useProgress';
import { useLearningGoal } from '../hooks/useLearningGoal';
import { recommendLessons } from '../utils/learningInsights';
import { buildLearningGoalState } from '../learning/learningGoal';
import {
  buildBibTeX,
  getResearchShelf,
  saveResearchShelf,
  toggleResearchShelfItem,
  type ResearchShelfItem,
} from '../utils/researchShelf';
import { ChatText } from '../components/ui/ChatText';
import './dashboard.css';

type SourceKind = 'web' | 'paper' | 'video' | 'tool';
type ResultView = 'all' | 'sources' | 'papers' | 'videos';
type PaperSort = 'relevance' | 'newest' | 'cited';
type PaperProvider = 'all' | 'arxiv' | 'openalex' | 'crossref' | 'semantic';
type PaperWindow = 'all' | '1y' | '5y';

interface LiveSource {
  title: string;
  uri: string;
  domain: string;
  kind: SourceKind;
  provider?: string;
  age?: string;
  description?: string;
}

interface ResearchPaper {
  id: string;
  title: string;
  url: string;
  date: string;
  language: string;
  type: string;
  citedBy: number;
  source: string;
  authors: string[];
  openAccess: boolean;
  database?: string;
}

interface VideoResult {
  id: string;
  title: string;
  url: string;
  channel: string;
  publishedAt: string;
  description: string;
  language: string;
}

interface DiscoveryPayload {
  mode: 'feed' | 'search';
  generatedAt: string;
  briefing?: string;
  synthesis?: string;
  sources: LiveSource[];
  queries: string[];
  papers: ResearchPaper[];
  videos?: VideoResult[];
  model?: string | null;
  searchAvailable: boolean;
  synthesisAvailable?: boolean;
  providers?: {
    gdelt?: boolean;
    openAlex?: boolean;
    crossref?: boolean;
    semanticScholar?: boolean;
    arxiv?: boolean;
    youtubeRss?: boolean;
    editorialRss?: boolean;
  };
  warning?: string | null;
}

const FEED_CACHE_KEY = 'mathnexus:discovery-feed:v4';
const FEED_CACHE_MS = 15 * 60 * 1000;
const SEARCH_HISTORY_KEY = 'mathnexus:research-history:v1';
const SAVED_TOPICS_KEY = 'mathnexus:saved-research-topics:v1';

const RESEARCH_SEEDS = [
  'algebraic topology',
  'number theory',
  'differential geometry',
  'partial differential equations',
  'mathematical physics',
  'probability theory',
];

const LEARNING_TOOLS = [
  { to: '/map', Icon: Network, title: 'Bản đồ tri thức', text: 'Quan hệ tiên quyết, khái niệm liên quan và lộ trình.' },
  { to: '/library', Icon: BookOpen, title: 'Thư viện kiến thức', text: 'Bài học từ nền tảng đến đại học.' },
  { to: '/formulas', Icon: Sigma, title: 'Công thức', text: 'Biểu thức, ý nghĩa, điều kiện sử dụng và ví dụ.' },
  { to: '/graph', Icon: ChartSpline, title: 'Đồ thị hàm số', text: 'Khảo sát trực quan và thay đổi tham số.' },
  { to: '/tools', Icon: Calculator, title: 'Công cụ toán học', text: 'Tính toán, kiểm tra và thử nghiệm.' },
  { to: '/canvas', Icon: Layers3, title: 'Math Canvas', text: 'Ghi chú, công thức và cấu trúc ý tưởng trên một mặt phẳng.' },
  { to: '/ai', Icon: Brain, title: 'Trợ lý toán học', text: 'Giải thích, phản biện và hỗ trợ suy luận.' },
  { to: '/books', Icon: Library, title: 'Tủ sách', text: 'Giáo trình và sách tham khảo theo chủ đề.' },
];

const sourceLabel: Record<SourceKind, string> = {
  web: 'Web',
  paper: 'Paper',
  video: 'Video',
  tool: 'Tool',
};

function sourceIcon(kind: SourceKind) {
  if (kind === 'paper') return FileText;
  if (kind === 'video') return Video;
  if (kind === 'tool') return Calculator;
  return Globe2;
}

function formatDate(value: string) {
  if (!value) return '';
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})\d{6}$/);
  const normalized = compact ? `${compact[1]}-${compact[2]}-${compact[3]}` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function readFeedCache(): DiscoveryPayload | null {
  try {
    const raw = sessionStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; data?: DiscoveryPayload };
    if (!parsed.savedAt || !parsed.data || Date.now() - parsed.savedAt > FEED_CACHE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeFeedCache(data: DiscoveryPayload) {
  try {
    sessionStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Discovery cache is optional.
  }
}

function readStringList(key: string, limit = 10) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value)
      ? value.map(item => String(item).trim()).filter(Boolean).slice(0, limit)
      : [];
  } catch {
    return [];
  }
}

function writeStringList(key: string, values: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Local research history is optional.
  }
}

function paperTimestamp(value: string) {
  const stamp = Date.parse(value || '');
  return Number.isFinite(stamp) ? stamp : 0;
}

async function fetchOpenAlexFallback(query = ''): Promise<ResearchPaper[]> {
  const params = new URLSearchParams({
    per_page: '8',
    select: 'id,title,doi,publication_date,language,type,cited_by_count,primary_location,authorships,open_access',
  });

  const today = new Date().toISOString().slice(0, 10);
  if (query) {
    params.set('search', query.slice(0, 500));
    params.set('filter', `to_publication_date:${today},is_retracted:false`);
  } else {
    const from = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    params.set('sort', 'publication_date:desc');
    params.set('filter', `primary_topic.field.id:26,from_publication_date:${from},to_publication_date:${today},is_retracted:false`);
  }

  const response = await fetch(`https://api.openalex.org/works?${params.toString()}`);
  if (!response.ok) throw new Error('OpenAlex unavailable');
  const payload = await response.json() as { results?: Array<Record<string, unknown>> };

  return (payload.results || []).map(work => {
    const primary = work.primary_location as {
      landing_page_url?: string;
      pdf_url?: string;
      source?: { display_name?: string };
    } | null;
    const authorships = Array.isArray(work.authorships) ? work.authorships as Array<{ author?: { display_name?: string } }> : [];
    const openAccess = work.open_access as { is_oa?: boolean } | null;

    return {
      id: String(work.id || ''),
      title: String(work.title || 'Untitled'),
      url: String(primary?.landing_page_url || primary?.pdf_url || work.doi || work.id || ''),
      date: String(work.publication_date || ''),
      language: String(work.language || ''),
      type: String(work.type || 'work'),
      citedBy: Number(work.cited_by_count || 0),
      source: String(primary?.source?.display_name || ''),
      authors: authorships.map(item => item.author?.display_name || '').filter(Boolean).slice(0, 4),
      openAccess: Boolean(openAccess?.is_oa),
      database: 'OpenAlex',
    };
  });
}

export default function Dashboard() {
  const progress = useProgress();
  const learningGoal = useLearningGoal();
  const recommended = recommendLessons(progress, 3);
  const focusGoal = buildLearningGoalState(progress, learningGoal.goal);

  const [feed, setFeed] = useState<DiscoveryPayload | null>(() => readFeedCache());
  const [feedLoading, setFeedLoading] = useState(!feed);
  const [feedError, setFeedError] = useState('');
  const [query, setQuery] = useState('');
  const [youtubeQuery, setYoutubeQuery] = useState('');
  const [searchResult, setSearchResult] = useState<DiscoveryPayload | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [recentQueries, setRecentQueries] = useState<string[]>(() => readStringList(SEARCH_HISTORY_KEY, 8));
  const [savedTopics, setSavedTopics] = useState<string[]>(() => readStringList(SAVED_TOPICS_KEY, 12));
  const [resultView, setResultView] = useState<ResultView>('all');
  const [paperSort, setPaperSort] = useState<PaperSort>('relevance');
  const [paperProvider, setPaperProvider] = useState<PaperProvider>('all');
  const [paperWindow, setPaperWindow] = useState<PaperWindow>('all');
  const [paperTextFilter, setPaperTextFilter] = useState('');
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [researchShelf, setResearchShelf] = useState<ResearchShelfItem[]>(() => getResearchShelf());

  const domains = useMemo(() => MATH_DOMAINS.map(domain => {
    const concepts = MATH_CONCEPTS.filter(concept => concept.domain === domain.id);
    const anchor = concepts[0];
    return {
      ...domain,
      count: concepts.length,
      to: anchor ? `/map?concept=${encodeURIComponent(anchor.id)}` : '/map',
    };
  }), []);

  const loadFeed = async (force = false) => {
    if (!force) {
      const cached = readFeedCache();
      if (cached) {
        setFeed(cached);
        setFeedLoading(false);
        return;
      }
    }

    setFeedLoading(true);
    setFeedError('');

    try {
      const response = await fetch('/api/discovery', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Discovery API unavailable');
      const data = await response.json() as DiscoveryPayload;
      setFeed(data);
      writeFeedCache(data);
    } catch {
      try {
        const papers = await fetchOpenAlexFallback();
        const fallback: DiscoveryPayload = {
          mode: 'feed',
          generatedAt: new Date().toISOString(),
          sources: [],
          queries: [],
          papers,
          videos: [],
          searchAvailable: false,
          warning: 'Discovery backend chưa phản hồi; danh sách paper đang lấy trực tiếp từ OpenAlex.',
        };
        setFeed(fallback);
      } catch {
        setFeedError('Chưa tải được nguồn cập nhật. Thử lại sau.');
      }
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    if (feed) return;
    void loadFeed();
  }, []);

  const runYoutubeSearch = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = youtubeQuery.trim();
    if (!trimmed) return;

    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const rememberQuery = (value: string) => {
    setRecentQueries(current => {
      const next = [value, ...current.filter(item => item.toLowerCase() !== value.toLowerCase())].slice(0, 8);
      writeStringList(SEARCH_HISTORY_KEY, next);
      return next;
    });
  };

  const toggleSavedTopic = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setSavedTopics(current => {
      const exists = current.some(item => item.toLowerCase() === trimmed.toLowerCase());
      const next = exists
        ? current.filter(item => item.toLowerCase() !== trimmed.toLowerCase())
        : [trimmed, ...current].slice(0, 12);
      writeStringList(SAVED_TOPICS_KEY, next);
      return next;
    });
  };

  const executeSearch = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || searchLoading) return;

    setQuery(trimmed);
    setSearchLoading(true);
    setSearchError('');
    setSearchResult(null);
    setResultView('all');
    setPaperSort('relevance');
    setPaperProvider('all');
    setPaperWindow('all');
    setPaperTextFilter('');
    setOpenAccessOnly(false);

    try {
      const response = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await response.json().catch(() => ({})) as DiscoveryPayload & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Search unavailable');
      setSearchResult(data);
      rememberQuery(trimmed);
    } catch {
      try {
        const papers = await fetchOpenAlexFallback(trimmed);
        setSearchResult({
          mode: 'search',
          generatedAt: new Date().toISOString(),
          synthesis: '',
          sources: [],
          queries: [],
          papers,
          videos: [],
          searchAvailable: false,
          warning: 'Discovery backend chưa phản hồi. Kết quả hiện tại đến từ OpenAlex.',
        });
        rememberQuery(trimmed);
      } catch {
        setSearchError('Không thực hiện được tìm kiếm lúc này.');
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const runSearch = (event: FormEvent) => {
    event.preventDefault();
    void executeSearch(query);
  };

  const updateResearchShelf = (item: Omit<ResearchShelfItem, 'savedAt'> & { savedAt?: string }) => {
    setResearchShelf(current => {
      const next = toggleResearchShelfItem(current, item);
      saveResearchShelf(next);
      return next;
    });
  };

  const isOnResearchShelf = (url: string) => researchShelf.some(
    item => item.url.toLowerCase() === url.toLowerCase(),
  );

  const savePaper = (paper: ResearchPaper) => updateResearchShelf({
    id: `paper:${paper.id}`,
    kind: 'paper',
    title: paper.title,
    url: paper.url || paper.id,
    provider: paper.database,
    source: paper.source,
    authors: paper.authors,
    date: paper.date,
    openAccess: paper.openAccess,
  });

  const saveSource = (source: LiveSource) => updateResearchShelf({
    id: `source:${source.uri}`,
    kind: source.kind === 'paper' ? 'paper' : source.kind === 'video' ? 'video' : 'source',
    title: source.title,
    url: source.uri,
    provider: source.provider,
    source: source.domain,
    date: source.age,
    openAccess: source.kind === 'paper' && /arxiv/i.test(`${source.provider || ''} ${source.domain || ''}`),
  });

  const saveVideo = (video: VideoResult) => updateResearchShelf({
    id: `video:${video.id}`,
    kind: 'video',
    title: video.title,
    url: video.url,
    provider: video.channel,
    source: video.channel,
    date: video.publishedAt,
  });

  const exportResearchBibTeX = () => {
    const text = buildBibTeX(researchShelf);
    if (!text) return;
    const blob = new Blob([text], { type: 'application/x-bibtex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mathnexus-research-${new Date().toISOString().slice(0, 10)}.bib`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const filteredPapers = useMemo(() => {
    const now = Date.now();
    const windowMs = paperWindow === '1y'
      ? 365 * 24 * 60 * 60 * 1000
      : paperWindow === '5y'
        ? 5 * 365 * 24 * 60 * 60 * 1000
        : 0;
    const needle = paperTextFilter.trim().toLowerCase();

    const papers = [...(searchResult?.papers || [])]
      .filter(paper => !openAccessOnly || paper.openAccess)
      .filter(paper => {
        if (paperProvider === 'all') return true;
        const database = (paper.database || '').toLowerCase();
        if (paperProvider === 'semantic') return database.includes('semantic');
        return database.includes(paperProvider);
      })
      .filter(paper => {
        if (!windowMs) return true;
        const stamp = paperTimestamp(paper.date);
        return stamp > 0 && now - stamp <= windowMs;
      })
      .filter(paper => {
        if (!needle) return true;
        return [paper.title, paper.source, ...(paper.authors || [])]
          .some(value => value.toLowerCase().includes(needle));
      });

    if (paperSort === 'newest') {
      papers.sort((left, right) => paperTimestamp(right.date) - paperTimestamp(left.date));
    } else if (paperSort === 'cited') {
      papers.sort((left, right) => right.citedBy - left.citedBy);
    }

    return papers;
  }, [searchResult, openAccessOnly, paperSort, paperProvider, paperWindow, paperTextFilter]);

  const resultCounts = {
    sources: searchResult?.sources.length || 0,
    papers: searchResult?.papers.length || 0,
    videos: searchResult?.videos?.length || 0,
  };

  const youtubeShortcuts = [...new Set([...savedTopics, ...recentQueries, ...RESEARCH_SEEDS])].slice(0, 6);
  const featuredLesson = recommended[0] || LESSONS[0];

  return (
    <section className="overview-workspace page-enter">
      <header className="overview-header">
        <div>
          <p className="overview-kicker">MATHNEXUS / DISCOVERY WORKSPACE</p>
          <h1>Theo dõi, tìm kiếm và học toán trong một không gian.</h1>
          <p>
            Trang tổng quan được tổ chức theo ba tác vụ: cập nhật nội dung mới, tra cứu tài liệu cho một ý tưởng,
            và truy cập hệ tri thức cùng các công cụ toán học của MathNexus.
          </p>
        </div>
        <nav className="overview-modes" aria-label="Ba chế độ sử dụng chính">
          <a href="#radar"><span>01</span><strong>Cập nhật</strong><small>Nội dung mới và đáng chú ý</small></a>
          <a href="#research"><span>02</span><strong>Tìm kiếm</strong><small>Paper, web, video và truy vấn đã lưu</small></a>
          <a href="#learn"><span>03</span><strong>Học & công cụ</strong><small>Tri thức nội bộ và workspace</small></a>
        </nav>
      </header>

      <section id="radar" className="overview-section">
        <div className="overview-section-heading">
          <div>
            <p className="eyebrow">LIVE DISCOVERY</p>
            <h2>Radar toán học</h2>
            <p>
              Theo dõi bài viết, preprint, paper và video mới; kết quả được loại trùng và ưu tiên theo độ mới, mức liên quan và tín hiệu học thuật.
            </p>
          </div>
          <button
            type="button"
            className="overview-refresh"
            onClick={() => void loadFeed(true)}
            disabled={feedLoading}
          >
            <RefreshCcw size={15} className={feedLoading ? 'is-spinning' : ''} />
            Cập nhật
          </button>
        </div>

        <div className="overview-radar-grid">
          <div className="overview-live-panel">
            <div className="overview-panel-head">
              <div>
                <span>WEB RADAR</span>
                <strong>
                  {[
                    feed?.providers?.gdelt ? 'GDELT' : '',
                    feed?.providers?.editorialRss ? 'Quanta/arXiv RSS' : '',
                    feed?.providers?.openAlex ? 'OpenAlex' : '',
                    feed?.providers?.crossref ? 'Crossref' : '',
                    feed?.providers?.youtubeRss ? 'YouTube RSS' : '',
                  ].filter(Boolean).join(' · ') || 'OpenAlex'}
                </strong>
              </div>
              <Globe2 size={19} />
            </div>

            {feedLoading && !feed && (
              <div className="overview-loading"><LoaderCircle size={20} className="is-spinning" /> Đang rà soát nguồn mới…</div>
            )}

            {feedError && <p className="overview-error">{feedError}</p>}

            {feed?.briefing ? (
              <div className="overview-briefing"><ChatText text={feed.briefing} /></div>
            ) : !feedLoading && (
              <p className="overview-muted">
                {feed?.warning || 'Chưa có bản tổng hợp trực tiếp từ web.'}
              </p>
            )}

            {feed?.sources.length ? (
              <div className="overview-source-list">
                {feed.sources.slice(0, 7).map(source => {
                  const Icon = sourceIcon(source.kind);
                  return (
                    <a key={source.uri} href={source.uri} target="_blank" rel="noreferrer" className="overview-source-row">
                      <span className="overview-source-icon"><Icon size={15} /></span>
                      <span>
                        <strong>{source.title}</strong>
                        <small>
                          {[source.provider, sourceLabel[source.kind], source.domain, source.age ? formatDate(source.age) : '']
                            .filter(Boolean).join(' · ')}
                        </small>
                      </span>
                      <ExternalLink size={14} />
                    </a>
                  );
                })}
              </div>
            ) : null}

            <div className="overview-live-meta">
              <span><Clock size={13} /> {feed?.generatedAt ? formatDate(feed.generatedAt) : '—'}</span>
              <span>{feed?.searchAvailable ? 'Nguồn mở, không yêu cầu API trả phí' : 'OpenAlex fallback'}</span>
            </div>
          </div>

          <div className="overview-papers-panel">
            <div className="overview-panel-head">
              <div>
                <span>RECENT RESEARCH</span>
                <strong>
                  {[
                    feed?.providers?.openAlex ? 'OpenAlex' : '',
                    feed?.providers?.crossref ? 'Crossref' : '',
                  ].filter(Boolean).join(' · ') || 'OpenAlex'}
                </strong>
              </div>
              <FileText size={19} />
            </div>

            <div className="overview-paper-list">
              {(feed?.papers || []).slice(0, 7).map(paper => (
                <a key={paper.id} href={paper.url || paper.id} target="_blank" rel="noreferrer" className="overview-paper-row">
                  <div>
                    <strong>{paper.title}</strong>
                    <small>
                      {[
                          paper.database,
                          paper.source,
                          paper.date ? formatDate(paper.date) : '',
                          paper.language?.toUpperCase(),
                          paper.openAccess ? 'Open access' : '',
                          paper.citedBy > 0 ? `${paper.citedBy} trích dẫn` : '',
                        ].filter(Boolean).join(' · ')}
                    </small>
                  </div>
                  <ExternalLink size={14} />
                </a>
              ))}
              {!feedLoading && !feed?.papers.length && <p className="overview-muted">Chưa có dữ liệu paper.</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="overview-youtube-search" aria-labelledby="youtube-search-title">
        <div className="overview-youtube-copy">
          <div className="overview-youtube-icon"><Video size={22} /></div>
          <div>
            <p className="eyebrow">YOUTUBE SEARCH</p>
            <h2 id="youtube-search-title">Tìm video toán học trên YouTube</h2>
            <p>
              Tìm trực tiếp trên YouTube mà không cần API key. Truy vấn sẽ mở trang kết quả YouTube trong tab mới.
            </p>
          </div>
        </div>

        <form className="overview-youtube-box" onSubmit={runYoutubeSearch}>
          <Search size={20} />
          <input
            value={youtubeQuery}
            onChange={event => setYoutubeQuery(event.target.value)}
            placeholder="Ví dụ: Riemann hypothesis visual explanation"
            aria-label="Tìm video toán học trên YouTube"
          />
          <button type="submit" disabled={!youtubeQuery.trim()}>
            <Video size={16} />
            Tìm trên YouTube
          </button>
        </form>

        <div className="overview-query-chips" aria-label="Gợi ý tìm kiếm YouTube">
          {youtubeShortcuts.map(item => (
            <button key={item} type="button" onClick={() => setYoutubeQuery(item)}>{item}</button>
          ))}
        </div>

        {feed?.videos?.length ? (
          <div className="overview-youtube-recent">
            <span>Video mới từ các kênh đang theo dõi</span>
            <div>
              {feed.videos.slice(0, 4).map(video => (
                <a key={video.id} href={video.url} target="_blank" rel="noreferrer">
                  <Video size={15} />
                  <span>
                    <strong>{video.title}</strong>
                    <small>{video.channel}{video.publishedAt ? ` · ${formatDate(video.publishedAt)}` : ''}</small>
                  </span>
                  <ExternalLink size={13} />
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section id="research" className="overview-search-section">
        <div className="overview-search-copy">
          <p className="eyebrow">RESEARCH SEARCH</p>
          <h2>Tìm nội dung liên quan đến một ý tưởng</h2>
          <p>
            Truy vấn được gửi đồng thời tới arXiv, OpenAlex, Crossref, Semantic Scholar và GDELT; video được lấy từ các kênh toán học
            theo dõi qua RSS. Kết quả giữ nguyên tiêu đề và ngôn ngữ của nguồn.
          </p>
        </div>

        <form className="overview-search-box" onSubmit={runSearch}>
          <Search size={21} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Ví dụ: geometric deep learning và discrete differential geometry"
            aria-label="Tìm kiếm tài liệu toán học trên web"
          />
          <button type="submit" disabled={!query.trim() || searchLoading}>
            {searchLoading ? <LoaderCircle size={16} className="is-spinning" /> : <Search size={16} />}
            Tra cứu
          </button>
        </form>

        <div className="overview-search-notes">
          <span>GDELT</span>
          <span>arXiv API</span>
          <span>Quanta/arXiv RSS</span>
          <span>OpenAlex</span>
          <span>Crossref</span>
          <span>Semantic Scholar</span>
          <span>YouTube RSS</span>
          <span>không yêu cầu API trả phí</span>
        </div>

        <div className="overview-research-memory">
          <div className="overview-memory-group">
            <div className="overview-memory-label">
              <Bookmark size={14} />
              <span>Chủ đề đã lưu</span>
              {query.trim() && (
                <button type="button" onClick={() => toggleSavedTopic(query)}>
                  {savedTopics.some(item => item.toLowerCase() === query.trim().toLowerCase()) ? 'Bỏ lưu truy vấn này' : 'Lưu truy vấn này'}
                </button>
              )}
            </div>
            <div className="overview-query-chips">
              {savedTopics.length ? savedTopics.map(item => (
                <span key={item} className="overview-saved-chip">
                  <button type="button" onClick={() => void executeSearch(item)}>{item}</button>
                  <button type="button" aria-label={`Bỏ lưu ${item}`} onClick={() => toggleSavedTopic(item)}><X size={11} /></button>
                </span>
              )) : <small>Chưa có chủ đề được lưu trên trình duyệt này.</small>}
            </div>
          </div>

          {recentQueries.length > 0 && (
            <div className="overview-memory-group">
              <div className="overview-memory-label"><History size={14} /><span>Tìm gần đây</span></div>
              <div className="overview-query-chips">
                {recentQueries.map(item => (
                  <button key={item} type="button" onClick={() => void executeSearch(item)}>{item}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {researchShelf.length > 0 && (
          <div className="overview-research-shelf">
            <div className="overview-shelf-head">
              <div>
                <p className="eyebrow">RESEARCH SHELF</p>
                <h3>Tài liệu đang giữ</h3>
                <small>{researchShelf.length} mục được lưu cục bộ trên trình duyệt này.</small>
              </div>
              <button
                type="button"
                onClick={exportResearchBibTeX}
                disabled={!researchShelf.some(item => item.kind === 'paper')}
              >
                <Download size={14} />
                Xuất BibTeX
              </button>
            </div>
            <div className="overview-shelf-list">
              {researchShelf.slice(0, 10).map(item => (
                <div key={item.id} className="overview-shelf-row">
                  <span className="overview-shelf-kind">{item.kind === 'paper' ? 'Paper' : item.kind === 'video' ? 'Video' : 'Nguồn'}</span>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <strong>{item.title}</strong>
                    <small>
                      {[item.provider, item.source, item.date ? formatDate(item.date) : '', item.openAccess ? 'Open access' : '']
                        .filter(Boolean).join(' · ')}
                    </small>
                  </a>
                  <button type="button" aria-label={`Bỏ khỏi Research Shelf: ${item.title}`} onClick={() => updateResearchShelf(item)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchError && <p className="overview-error">{searchError}</p>}

        {searchResult && (
          <div className="overview-search-results">
            <div className="overview-result-toolbar">
              <div className="overview-result-tabs" role="group" aria-label="Loại kết quả">
                <button type="button" className={resultView === 'all' ? 'active' : ''} onClick={() => setResultView('all')}>
                  Tất cả <span>{resultCounts.sources + resultCounts.papers + resultCounts.videos}</span>
                </button>
                <button type="button" className={resultView === 'papers' ? 'active' : ''} onClick={() => setResultView('papers')}>
                  Paper <span>{resultCounts.papers}</span>
                </button>
                <button type="button" className={resultView === 'sources' ? 'active' : ''} onClick={() => setResultView('sources')}>
                  Nguồn <span>{resultCounts.sources}</span>
                </button>
                <button type="button" className={resultView === 'videos' ? 'active' : ''} onClick={() => setResultView('videos')}>
                  Video <span>{resultCounts.videos}</span>
                </button>
              </div>

              {(resultView === 'all' || resultView === 'papers') && (
                <div className="overview-paper-controls">
                  <SlidersHorizontal size={14} />
                  <select value={paperSort} onChange={event => setPaperSort(event.target.value as PaperSort)} aria-label="Sắp xếp paper">
                    <option value="relevance">Độ liên quan</option>
                    <option value="newest">Mới nhất</option>
                    <option value="cited">Trích dẫn nhiều</option>
                  </select>
                  <select value={paperProvider} onChange={event => setPaperProvider(event.target.value as PaperProvider)} aria-label="Lọc theo cơ sở dữ liệu">
                    <option value="all">Mọi cơ sở dữ liệu</option>
                    <option value="arxiv">arXiv</option>
                    <option value="openalex">OpenAlex</option>
                    <option value="crossref">Crossref</option>
                    <option value="semantic">Semantic Scholar</option>
                  </select>
                  <select value={paperWindow} onChange={event => setPaperWindow(event.target.value as PaperWindow)} aria-label="Lọc theo thời gian xuất bản">
                    <option value="all">Mọi thời gian</option>
                    <option value="1y">1 năm gần đây</option>
                    <option value="5y">5 năm gần đây</option>
                  </select>
                  <input
                    className="overview-paper-filter-input"
                    value={paperTextFilter}
                    onChange={event => setPaperTextFilter(event.target.value)}
                    placeholder="Lọc tiêu đề / tác giả"
                    aria-label="Lọc paper trong kết quả"
                  />
                  <label>
                    <input type="checkbox" checked={openAccessOnly} onChange={event => setOpenAccessOnly(event.target.checked)} />
                    Open access
                  </label>
                </div>
              )}
            </div>

            <div className="overview-external-search">
              <span>Tra cứu trực tiếp:</span>
              <a href={`https://arxiv.org/search/?query=${encodeURIComponent(query.trim())}&searchtype=all`} target="_blank" rel="noreferrer">
                arXiv <ExternalLink size={11} />
              </a>
              <a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(query.trim())}`} target="_blank" rel="noreferrer">
                Google Scholar <ExternalLink size={11} />
              </a>
              <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`} target="_blank" rel="noreferrer">
                YouTube <ExternalLink size={11} />
              </a>
            </div>

            <div className="overview-search-summary">
              <div className="overview-result-head">
                <span>PHẠM VI KẾT QUẢ</span>
                <small>
                  {[
                    searchResult.providers?.gdelt ? 'GDELT' : '',
                    searchResult.providers?.openAlex ? 'OpenAlex' : '',
                    searchResult.providers?.crossref ? 'Crossref' : '',
                    searchResult.providers?.semanticScholar ? 'Semantic Scholar' : '',
                    searchResult.providers?.arxiv ? 'arXiv API' : '',
                    searchResult.providers?.youtubeRss ? 'YouTube RSS' : '',
                    searchResult.providers?.editorialRss ? 'Quanta/arXiv RSS' : '',
                  ].filter(Boolean).join(' · ') || 'OpenAlex fallback'}
                </small>
              </div>
              {searchResult.synthesis ? (
                <div className="overview-briefing"><ChatText text={searchResult.synthesis} /></div>
              ) : (
                <p className="overview-muted">{searchResult.warning || 'Không có bản tổng hợp.'}</p>
              )}
            </div>

            {(resultView === 'all' || resultView === 'sources' || resultView === 'papers') && (
              <div className={`overview-result-columns ${resultView !== 'all' ? 'single' : ''}`}>
              {(resultView === 'all' || resultView === 'sources') && <div>
                <h3>Nguồn cập nhật</h3>
                <div className="overview-source-list compact">
                  {searchResult.sources.slice(0, 8).map(source => {
                    const Icon = sourceIcon(source.kind);
                    return (
                      <div key={source.uri} className="overview-result-save-row">
                        <a href={source.uri} target="_blank" rel="noreferrer" className="overview-source-row">
                          <span className="overview-source-icon"><Icon size={15} /></span>
                          <span>
                            <strong>{source.title}</strong>
                            <small>
                              {[source.provider, sourceLabel[source.kind], source.domain, source.age ? formatDate(source.age) : '']
                                .filter(Boolean).join(' · ')}
                            </small>
                          </span>
                          <ExternalLink size={14} />
                        </a>
                        <button
                          type="button"
                          className={isOnResearchShelf(source.uri) ? 'is-saved' : ''}
                          aria-label={isOnResearchShelf(source.uri) ? `Bỏ lưu ${source.title}` : `Lưu ${source.title}`}
                          onClick={() => saveSource(source)}
                        >
                          <Bookmark size={13} />
                        </button>
                      </div>
                    );
                  })}
                  {!searchResult.sources.length && <p className="overview-muted">Không có nguồn cập nhật phù hợp trong chế độ hiện tại.</p>}
                </div>
              </div>}

              {(resultView === 'all' || resultView === 'papers') && <div>
                <h3>Paper liên quan <small className="overview-paper-count">{filteredPapers.length}/{searchResult.papers.length}</small></h3>
                <div className="overview-paper-list compact">
                  {filteredPapers.slice(0, 12).map(paper => (
                    <div key={paper.id} className="overview-result-save-row">
                      <a href={paper.url || paper.id} target="_blank" rel="noreferrer" className="overview-paper-row">
                        <div>
                          <strong>{paper.title}</strong>
                          {paper.authors?.length ? (
                            <small className="overview-paper-authors">{paper.authors.slice(0, 4).join(' · ')}</small>
                          ) : null}
                          <small>
                            {[
                              paper.database,
                              paper.source,
                              paper.date ? formatDate(paper.date) : '',
                              paper.language?.toUpperCase(),
                              paper.openAccess ? 'Open access' : '',
                              paper.citedBy > 0 ? `${paper.citedBy} trích dẫn` : '',
                            ].filter(Boolean).join(' · ')}
                          </small>
                        </div>
                        <ExternalLink size={14} />
                      </a>
                      <button
                        type="button"
                        className={isOnResearchShelf(paper.url || paper.id) ? 'is-saved' : ''}
                        aria-label={isOnResearchShelf(paper.url || paper.id) ? `Bỏ lưu ${paper.title}` : `Lưu ${paper.title}`}
                        onClick={() => savePaper(paper)}
                      >
                        <Bookmark size={13} />
                      </button>
                    </div>
                  ))}
                  {!filteredPapers.length && <p className="overview-muted">
                    {openAccessOnly ? 'Không có paper open access trong tập kết quả này.' : 'Chưa có paper phù hợp từ các nguồn hiện tại.'}
                  </p>}
                </div>
              </div>}
              </div>
            )}

            {(resultView === 'all' || resultView === 'videos') && searchResult.videos?.length ? (
              <div className="overview-video-strip">
                <h3>Video</h3>
                <div>
                  {searchResult.videos.map(video => (
                    <div key={video.id} className="overview-result-save-row">
                      <a href={video.url} target="_blank" rel="noreferrer">
                        <Video size={16} />
                        <span><strong>{video.title}</strong><small>{video.channel}</small></span>
                        <ExternalLink size={13} />
                      </a>
                      <button
                        type="button"
                        className={isOnResearchShelf(video.url) ? 'is-saved' : ''}
                        aria-label={isOnResearchShelf(video.url) ? `Bỏ lưu ${video.title}` : `Lưu ${video.title}`}
                        onClick={() => saveVideo(video)}
                      >
                        <Bookmark size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section id="learn" className="overview-section">
        <div className="overview-section-heading">
          <div>
            <p className="eyebrow">KNOWLEDGE & WORKBENCH</p>
            <h2>Học, tra cứu và thử nghiệm</h2>
            <p>
              Nội dung nội bộ của MathNexus được giữ riêng với tìm kiếm web: có cấu trúc, có quan hệ tiên quyết và có công cụ thao tác.
            </p>
          </div>
          <div className="overview-corpus">
            <span><strong>{MATH_CONCEPTS.length}</strong> khái niệm</span>
            <span><strong>{LESSONS.length}</strong> bài học</span>
            <span><strong>{FORMS.length}</strong> công thức</span>
            <span><strong>{BOOKS.length}</strong> sách</span>
          </div>
        </div>

        <div className="overview-tool-grid">
          {LEARNING_TOOLS.map(({ to, Icon, title, text }) => (
            <Link key={to} to={to} className="overview-tool-card">
              <span><Icon size={19} /></span>
              <div><strong>{title}</strong><small>{text}</small></div>
              <ArrowRight size={15} />
            </Link>
          ))}
        </div>

        <div className="overview-knowledge-grid">
          <div className="overview-domain-panel">
            <div className="overview-panel-head">
              <div>
                <span>KNOWLEDGE GRAPH</span>
                <strong>Miền kiến thức</strong>
              </div>
              <Network size={19} />
            </div>
            <div className="overview-domain-list">
              {domains.map(domain => (
                <Link key={domain.id} to={domain.to}>
                  <span>{String(domain.order).padStart(2, '0')}</span>
                  <strong>{domain.name}</strong>
                  <small>{domain.count} nút</small>
                </Link>
              ))}
            </div>
          </div>

          <div className="overview-continue-panel">
            <div className="overview-panel-head">
              <div>
                <span>CONTINUE</span>
                <strong>Điểm tiếp tục gần nhất</strong>
              </div>
              <Target size={19} />
            </div>

            <div className="overview-continue-main">
              <span>{featuredLesson.lv} · {featuredLesson.cat}</span>
              <h3>{featuredLesson.t}</h3>
              <p>Gợi ý được lấy từ tiến độ hiện có trong MathNexus.</p>
              <Link to={`/lesson/${featuredLesson.id}`} className="button button-dark">
                Mở bài học <ArrowRight size={15} />
              </Link>
            </div>

            <div className="overview-progress-data">
              <span><strong>{progress.lessonsRead.length}</strong> bài đã đọc</span>
              <span><strong>{progress.questionsDone}</strong> câu đã làm</span>
              <span><strong>{progress.streak}</strong> ngày hoạt động</span>
            </div>

            {focusGoal && (
              <Link to={`/map?concept=${encodeURIComponent(focusGoal.target.id)}`} className="overview-goal-row">
                <span>
                  <small>Mục tiêu đang theo</small>
                  <strong>{focusGoal.target.title}</strong>
                </span>
                <span>{focusGoal.progressPercent}%</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="overview-data-note">
        <span>Phân tách nguồn:</span>
        <p>
          Discovery sử dụng GDELT và RSS chuyên ngành cho nguồn cập nhật, arXiv/OpenAlex/Crossref/Semantic Scholar cho metadata học thuật,
          cùng RSS công khai của các kênh toán học cho video. Thư viện MathNexus vẫn là dữ liệu nội bộ; mọi nguồn ngoài đều mở tại trang gốc để kiểm tra trực tiếp.
        </p>
      </footer>
    </section>
  );
}
