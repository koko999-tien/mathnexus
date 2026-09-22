import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Calculator,
  ChartSpline,
  Clock,
  ExternalLink,
  FileText,
  Globe2,
  Layers3,
  Library,
  LoaderCircle,
  Network,
  RefreshCcw,
  Search,
  Sigma,
  Target,
  Video,
} from 'lucide-react';
import { LESSONS } from '../data/lessons';
import { BOOKS } from '../data/books';
import { FORMS } from '../data/formulas';
import { MATH_CONCEPTS, MATH_DOMAINS } from '../data/mathKnowledge';
import { useProgress } from '../hooks/useProgress';
import { useLearningGoal } from '../hooks/useLearningGoal';
import { recommendLessons } from '../utils/learningInsights';
import { buildLearningGoalState } from '../learning/learningGoal';
import { ChatText } from '../components/ui/ChatText';
import './dashboard.css';

type SourceKind = 'web' | 'paper' | 'video' | 'tool';

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
    youtubeRss?: boolean;
    editorialRss?: boolean;
  };
  warning?: string | null;
}

const FEED_CACHE_KEY = 'mathnexus:discovery-feed:v4';
const FEED_CACHE_MS = 15 * 60 * 1000;

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
  const [searchResult, setSearchResult] = useState<DiscoveryPayload | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

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

  const runSearch = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || searchLoading) return;

    setSearchLoading(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const response = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await response.json().catch(() => ({})) as DiscoveryPayload & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Search unavailable');
      setSearchResult(data);
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
      } catch {
        setSearchError('Không thực hiện được tìm kiếm lúc này.');
      }
    } finally {
      setSearchLoading(false);
    }
  };

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
          <a href="#research"><span>02</span><strong>Tìm kiếm</strong><small>Paper, video, notes, project</small></a>
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

      <section id="research" className="overview-search-section">
        <div className="overview-search-copy">
          <p className="eyebrow">RESEARCH SEARCH</p>
          <h2>Tìm nội dung liên quan đến một ý tưởng</h2>
          <p>
            Truy vấn được gửi đồng thời tới GDELT, OpenAlex, Crossref và Semantic Scholar; video được lấy từ các kênh toán học
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
          <span>Quanta/arXiv RSS</span>
          <span>OpenAlex</span>
          <span>Crossref</span>
          <span>Semantic Scholar</span>
          <span>YouTube RSS</span>
          <span>không yêu cầu API trả phí</span>
        </div>

        {searchError && <p className="overview-error">{searchError}</p>}

        {searchResult && (
          <div className="overview-search-results">
            <div className="overview-search-summary">
              <div className="overview-result-head">
                <span>PHẠM VI KẾT QUẢ</span>
                <small>
                  {[
                    searchResult.providers?.gdelt ? 'GDELT' : '',
                    searchResult.providers?.openAlex ? 'OpenAlex' : '',
                    searchResult.providers?.crossref ? 'Crossref' : '',
                    searchResult.providers?.semanticScholar ? 'Semantic Scholar' : '',
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

            <div className="overview-result-columns">
              <div>
                <h3>Nguồn cập nhật</h3>
                <div className="overview-source-list compact">
                  {searchResult.sources.slice(0, 8).map(source => {
                    const Icon = sourceIcon(source.kind);
                    return (
                      <a key={source.uri} href={source.uri} target="_blank" rel="noreferrer" className="overview-source-row">
                        <span className="overview-source-icon"><Icon size={15} /></span>
                        <span>
                          <strong>{source.title}</strong>
                          <small>{sourceLabel[source.kind]} · {source.domain}</small>
                        </span>
                        <ExternalLink size={14} />
                      </a>
                    );
                  })}
                  {!searchResult.sources.length && <p className="overview-muted">Không có nguồn cập nhật phù hợp trong chế độ hiện tại.</p>}
                </div>
              </div>

              <div>
                <h3>Paper liên quan</h3>
                <div className="overview-paper-list compact">
                  {searchResult.papers.slice(0, 8).map(paper => (
                    <a key={paper.id} href={paper.url || paper.id} target="_blank" rel="noreferrer" className="overview-paper-row">
                      <div>
                        <strong>{paper.title}</strong>
                        <small>
                          {[paper.database, paper.source, paper.date ? formatDate(paper.date) : '', paper.language?.toUpperCase()]
                            .filter(Boolean).join(' · ')}
                        </small>
                      </div>
                      <ExternalLink size={14} />
                    </a>
                  ))}
                  {!searchResult.papers.length && <p className="overview-muted">OpenAlex chưa trả về paper phù hợp.</p>}
                </div>
              </div>
            </div>

            {searchResult.videos?.length ? (
              <div className="overview-video-strip">
                <h3>Video</h3>
                <div>
                  {searchResult.videos.map(video => (
                    <a key={video.id} href={video.url} target="_blank" rel="noreferrer">
                      <Video size={16} />
                      <span><strong>{video.title}</strong><small>{video.channel}</small></span>
                      <ExternalLink size={13} />
                    </a>
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
          Discovery sử dụng GDELT và RSS chuyên ngành cho nguồn cập nhật, OpenAlex/Crossref/Semantic Scholar cho metadata học thuật,
          cùng RSS công khai của các kênh toán học cho video. Thư viện MathNexus vẫn là dữ liệu nội bộ; mọi nguồn ngoài đều mở tại trang gốc để kiểm tra trực tiếp.
        </p>
      </footer>
    </section>
  );
}
