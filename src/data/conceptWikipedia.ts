import { CONCEPT_BY_ID, MATH_CONCEPTS, MATH_DOMAINS, type MathConcept } from './mathKnowledge';

export interface ConceptWikipediaProfile {
  conceptId: string;
  vi: string;
  en: string;
  aliases?: string[];
}

export const CONCEPT_WIKIPEDIA_PROFILES: ConceptWikipediaProfile[] = [
  { conceptId:'number-systems', vi:'Hệ thống số', en:'Number system', aliases:['natural numbers','real numbers','number system'] },
  { conceptId:'sets', vi:'Tập hợp (toán học)', en:'Set (mathematics)', aliases:['set theory','sets'] },
  { conceptId:'functions', vi:'Hàm số', en:'Function (mathematics)', aliases:['function','mapping','domain codomain'] },
  { conceptId:'logic', vi:'Logic toán học', en:'Mathematical logic', aliases:['propositional logic','logic'] },
  { conceptId:'proof', vi:'Chứng minh toán học', en:'Mathematical proof', aliases:['proof','induction','contradiction'] },
  { conceptId:'algebraic-expressions', vi:'Biểu thức (toán học)', en:'Expression (mathematics)', aliases:['algebraic expression','factorization'] },
  { conceptId:'linear-equations', vi:'Phương trình tuyến tính', en:'Linear equation', aliases:['linear equation'] },
  { conceptId:'quadratics', vi:'Phương trình bậc hai', en:'Quadratic equation', aliases:['quadratic equation','parabola'] },
  { conceptId:'inequalities', vi:'Bất đẳng thức', en:'Inequality (mathematics)', aliases:['inequality'] },
  { conceptId:'sequences', vi:'Dãy số', en:'Sequence', aliases:['sequence','arithmetic progression','geometric progression'] },
  { conceptId:'exponential-logarithmic', vi:'Hàm mũ', en:'Exponential function', aliases:['exponential function','logarithm','logarithmic function'] },
  { conceptId:'complex-numbers', vi:'Số phức', en:'Complex number', aliases:['complex number','complex plane'] },
  { conceptId:'de-moivre', vi:'Công thức de Moivre', en:"De Moivre's formula", aliases:['de moivre','complex roots'] },
  { conceptId:'euclidean-geometry', vi:'Hình học Euclid', en:'Euclidean geometry', aliases:['euclidean geometry'] },
  { conceptId:'pythagoras', vi:'Định lý Pythagoras', en:'Pythagorean theorem', aliases:['pythagorean theorem'] },
  { conceptId:'coordinate-geometry', vi:'Hình học giải tích', en:'Analytic geometry', aliases:['analytic geometry','coordinate geometry'] },
  { conceptId:'vectors', vi:'Vectơ', en:'Euclidean vector', aliases:['vector','dot product'] },
  { conceptId:'cosine-law', vi:'Định lý cosin', en:'Law of cosines', aliases:['law of cosines','cosine rule'] },
  { conceptId:'angle-radian', vi:'Radian', en:'Radian', aliases:['radian','angle'] },
  { conceptId:'unit-circle', vi:'Đường tròn đơn vị', en:'Unit circle', aliases:['unit circle'] },
  { conceptId:'trigonometric-functions', vi:'Hàm lượng giác', en:'Trigonometric functions', aliases:['trigonometric function','sine','cosine','tangent'] },
  { conceptId:'trig-identities', vi:'Đẳng thức lượng giác', en:'List of trigonometric identities', aliases:['trigonometric identity'] },
  { conceptId:'limits', vi:'Giới hạn (toán học)', en:'Limit (mathematics)', aliases:['limit','limits'] },
  { conceptId:'continuity', vi:'Hàm liên tục', en:'Continuous function', aliases:['continuity','continuous function'] },
  { conceptId:'derivative-definition', vi:'Đạo hàm', en:'Derivative', aliases:['derivative','differentiation','tangent'] },
  { conceptId:'derivative-rules', vi:'Đạo hàm', en:'Differentiation rules', aliases:['chain rule','product rule','quotient rule','differentiation'] },
  { conceptId:'optimization', vi:'Tối ưu hóa (toán học)', en:'Mathematical optimization', aliases:['optimization','maxima minima','extrema'] },
  { conceptId:'antiderivatives', vi:'Nguyên hàm', en:'Antiderivative', aliases:['antiderivative','indefinite integral'] },
  { conceptId:'definite-integrals', vi:'Tích phân', en:'Integral', aliases:['definite integral','integration','fundamental theorem of calculus'] },
  { conceptId:'series', vi:'Chuỗi (toán học)', en:'Series (mathematics)', aliases:['infinite series','convergence'] },
  { conceptId:'taylor', vi:'Chuỗi Taylor', en:'Taylor series', aliases:['taylor series','power series'] },
  { conceptId:'linear-systems', vi:'Hệ phương trình tuyến tính', en:'System of linear equations', aliases:['linear system','system of linear equations'] },
  { conceptId:'matrices', vi:'Ma trận (toán học)', en:'Matrix (mathematics)', aliases:['matrix','determinant','inverse matrix'] },
  { conceptId:'vector-spaces', vi:'Không gian vectơ', en:'Vector space', aliases:['vector space','basis','dimension'] },
  { conceptId:'linear-transformations', vi:'Ánh xạ tuyến tính', en:'Linear map', aliases:['linear transformation','linear map'] },
  { conceptId:'eigen', vi:'Giá trị riêng và vectơ riêng', en:'Eigenvalues and eigenvectors', aliases:['eigenvalue','eigenvector','diagonalization'] },
  { conceptId:'counting', vi:'Tổ hợp', en:'Combinatorics', aliases:['combinatorics','permutation','combination','counting'] },
  { conceptId:'binomial', vi:'Nhị thức Newton', en:'Binomial theorem', aliases:['binomial theorem'] },
  { conceptId:'relations', vi:'Quan hệ hai ngôi', en:'Binary relation', aliases:['binary relation','partial order'] },
  { conceptId:'graph-theory', vi:'Lý thuyết đồ thị', en:'Graph theory', aliases:['graph theory','eulerian path','hamiltonian path'] },
  { conceptId:'divisibility', vi:'Tính chia hết', en:'Divisibility rule', aliases:['divisibility','greatest common divisor','euclidean algorithm'] },
  { conceptId:'primes', vi:'Số nguyên tố', en:'Prime number', aliases:['prime number','prime factorization'] },
  { conceptId:'modular-arithmetic', vi:'Số học modulo', en:'Modular arithmetic', aliases:['modular arithmetic','congruence'] },
  { conceptId:'probability-basics', vi:'Xác suất', en:'Probability', aliases:['probability','sample space','event'] },
  { conceptId:'conditional-probability', vi:'Xác suất có điều kiện', en:'Conditional probability', aliases:['conditional probability'] },
  { conceptId:'bayes', vi:'Định lý Bayes', en:"Bayes' theorem", aliases:['bayes theorem','bayesian'] },
  { conceptId:'descriptive-statistics', vi:'Thống kê mô tả', en:'Descriptive statistics', aliases:['descriptive statistics','mean','median','variance','standard deviation'] },
  { conceptId:'first-order-ode', vi:'Phương trình vi phân thường', en:'Ordinary differential equation', aliases:['ordinary differential equation','first order differential equation','ode'] },
  { conceptId:'exponential-growth-models', vi:'Tăng trưởng theo cấp số nhân', en:'Exponential growth', aliases:['exponential growth','exponential decay'] },
  { conceptId:'classical-mechanics', vi:'Cơ học cổ điển', en:'Classical mechanics', aliases:['classical mechanics','newton laws','motion'] },
  { conceptId:'newtonian-gravity', vi:'Định luật vạn vật hấp dẫn Newton', en:"Newton's law of universal gravitation", aliases:['newtonian gravity','universal gravitation','inverse square'] },
  { conceptId:'nbody-problem', vi:'Bài toán n vật thể', en:'N-body problem', aliases:['n-body problem','n body'] },
  { conceptId:'hamiltonian-mechanics', vi:'Cơ học Hamilton', en:'Hamiltonian mechanics', aliases:['hamiltonian mechanics','phase space','symplectic'] },
];

export const CONCEPT_WIKIPEDIA_BY_ID = new Map(
  CONCEPT_WIKIPEDIA_PROFILES.map(profile => [profile.conceptId, profile])
);

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function wikipediaQueryForConcept(conceptId: string, lang: 'vi' | 'en' = 'vi') {
  const concept = CONCEPT_BY_ID.get(conceptId);
  const profile = CONCEPT_WIKIPEDIA_BY_ID.get(conceptId);
  if (!concept) return '';
  return profile?.[lang] || concept.title;
}

export function relatedConceptsForText(text: string, limit = 6): MathConcept[] {
  const normalizedText = ` ${normalize(text)} `;
  if (!normalizedText.trim()) return [];

  return MATH_CONCEPTS
    .map(concept => {
      const profile = CONCEPT_WIKIPEDIA_BY_ID.get(concept.id);
      const domain = MATH_DOMAINS.find(item => item.id === concept.domain);
      const terms = [
        concept.title,
        ...(concept.tags || []),
        profile?.en || '',
        profile?.vi || '',
        ...(profile?.aliases || []),
      ]
        .map(normalize)
        .filter(term => term.length >= 3);

      let score = 0;
      for (const term of new Set(terms)) {
        if (!term) continue;
        if (normalizedText.includes(` ${term} `)) score += term.length > 12 ? 8 : 5;
        else if (normalizedText.includes(term)) score += term.length > 12 ? 5 : 2;
      }

      const normalizedDomain = normalize(domain?.name || '');
      if (normalizedDomain && normalizedText.includes(normalizedDomain)) score += 2;
      return { concept, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.concept.title.localeCompare(b.concept.title, 'vi'))
    .slice(0, limit)
    .map(item => item.concept);
}
