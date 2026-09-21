export type OntologyKind =
  | 'definition'
  | 'theorem'
  | 'lemma'
  | 'proof'
  | 'example'
  | 'counterexample'
  | 'subskill'
  | 'misconception'
  | 'exercise'
  | 'application';

export type AtomDifficulty = 'Cơ bản' | 'Vừa' | 'Khó';

export interface MathAtom {
  id: string;
  conceptId: string;
  kind: OntologyKind;
  title: string;
  summary: string;
  body?: string;
  formula?: string;
  dependsOn?: string[];
  difficulty?: AtomDifficulty;
  tags?: string[];
}

export const ONTOLOGY_KIND_META: Record<OntologyKind, { label: string; short: string }> = {
  definition: { label: 'Định nghĩa', short: 'ĐN' },
  theorem: { label: 'Định lý', short: 'ĐL' },
  lemma: { label: 'Bổ đề', short: 'BL' },
  proof: { label: 'Chứng minh', short: 'CM' },
  example: { label: 'Ví dụ', short: 'VD' },
  counterexample: { label: 'Phản ví dụ', short: 'PV' },
  subskill: { label: 'Kỹ năng con', short: 'KN' },
  misconception: { label: 'Ngộ nhận', short: 'NN' },
  exercise: { label: 'Bài tập', short: 'BT' },
  application: { label: 'Ứng dụng', short: 'UD' },
};

export const MATH_ATOMS: MathAtom[] = [
  { id:'limit-neighborhood', conceptId:'limits', kind:'definition', title:'Giới hạn tại một điểm', summary:'Giá trị mà f(x) tiến tới khi x tiến gần a, không đòi hỏi x=a.', body:'Điểm cốt lõi là hành vi trong lân cận của a. Giá trị f(a) có thể tồn tại, không tồn tại hoặc khác giới hạn.', formula:'$\\lim_{x\\to a}f(x)=L$', tags:['epsilon delta','lân cận'] },
  { id:'limit-one-sided', conceptId:'limits', kind:'definition', title:'Giới hạn một phía', summary:'Tách hành vi khi x tiến tới a từ bên trái và bên phải.', formula:'$\\lim_{x\\to a^-}f(x),\\;\\lim_{x\\to a^+}f(x)$', dependsOn:['limit-neighborhood'] },
  { id:'limit-two-sided-rule', conceptId:'limits', kind:'theorem', title:'Tiêu chuẩn giới hạn hai phía', summary:'Giới hạn hai phía tồn tại khi và chỉ khi hai giới hạn một phía tồn tại và bằng nhau.', body:'Đây là công cụ chẩn đoán nhanh các hàm từng đoạn và điểm nhảy.', dependsOn:['limit-one-sided'] },
  { id:'limit-hole-example', conceptId:'limits', kind:'example', title:'Lỗ thủng nhưng vẫn có giới hạn', summary:'Hàm có thể không xác định tại a nhưng giới hạn vẫn tồn tại.', formula:'$f(x)=\\frac{x^2-1}{x-1},\\;x\\ne1$', dependsOn:['limit-neighborhood'] },
  { id:'limit-value-misconception', conceptId:'limits', kind:'misconception', title:'Nhầm giới hạn với giá trị hàm', summary:'Sai lầm thường gặp: nghĩ rằng lim f(x) luôn bằng f(a).', body:'Giới hạn nói về xu hướng quanh điểm; f(a) nói về đúng một điểm.' },
  { id:'limit-piecewise-exercise', conceptId:'limits', kind:'exercise', title:'Kiểm tra giới hạn hàm từng đoạn', summary:'So sánh giới hạn trái/phải trước khi kết luận giới hạn hai phía.', difficulty:'Vừa', dependsOn:['limit-one-sided','limit-two-sided-rule'] },

  { id:'continuity-point', conceptId:'continuity', kind:'definition', title:'Liên tục tại một điểm', summary:'Hàm liên tục tại a khi giá trị hàm, giới hạn và điểm tiếp cận khớp nhau.', formula:'$\\lim_{x\\to a}f(x)=f(a)$', dependsOn:['limit-neighborhood'] },
  { id:'continuity-three-tests', conceptId:'continuity', kind:'subskill', title:'Ba kiểm tra liên tục', summary:'Kiểm tra f(a) tồn tại, giới hạn tồn tại, rồi kiểm tra chúng bằng nhau.', dependsOn:['continuity-point'] },
  { id:'continuity-jump-counter', conceptId:'continuity', kind:'counterexample', title:'Điểm nhảy', summary:'Hai giới hạn một phía khác nhau nên hàm không liên tục.', dependsOn:['limit-two-sided-rule','continuity-point'] },
  { id:'ivt-theorem', conceptId:'continuity', kind:'theorem', title:'Định lý giá trị trung gian', summary:'Hàm liên tục trên đoạn đi qua mọi giá trị nằm giữa hai giá trị đầu mút.', body:'Định lý này là nền tảng cho lập luận tồn tại nghiệm.', dependsOn:['continuity-point'] },

  { id:'derivative-limit', conceptId:'derivative-definition', kind:'definition', title:'Đạo hàm từ tỷ số sai phân', summary:'Đạo hàm là giới hạn tốc độ thay đổi trung bình khi khoảng thay đổi co về 0.', formula:"$f'(a)=\\lim_{h\\to0}\\frac{f(a+h)-f(a)}{h}$" },
  { id:'derivative-tangent', conceptId:'derivative-definition', kind:'definition', title:'Ý nghĩa hình học', summary:'Đạo hàm tại a là hệ số góc của tiếp tuyến nếu giới hạn tồn tại.', dependsOn:['derivative-limit'] },
  { id:'derivative-rate', conceptId:'derivative-definition', kind:'application', title:'Ý nghĩa tốc độ tức thời', summary:'Nếu s(t) là vị trí thì s′(t) là vận tốc tức thời.', formula:"$v(t)=s'(t)$", dependsOn:['derivative-limit'] },
  { id:'derivative-absolute-counter', conceptId:'derivative-definition', kind:'counterexample', title:'|x| tại 0', summary:'Hàm liên tục nhưng không khả vi tại 0 vì độ dốc trái và phải khác nhau.', formula:'$f(x)=|x|$', dependsOn:['derivative-tangent'] },
  { id:'derivative-continuity-theorem', conceptId:'derivative-definition', kind:'theorem', title:'Khả vi suy ra liên tục', summary:'Nếu f khả vi tại a thì f liên tục tại a.', dependsOn:['derivative-limit'] },
  { id:'derivative-converse-misconception', conceptId:'derivative-definition', kind:'misconception', title:'Liên tục không suy ra khả vi', summary:'Chiều đảo là sai; |x| tại 0 là phản ví dụ chuẩn.', dependsOn:['derivative-absolute-counter','derivative-continuity-theorem'] },
  { id:'derivative-first-principles', conceptId:'derivative-definition', kind:'exercise', title:'Đạo hàm từ định nghĩa', summary:'Tính đạo hàm của x² trực tiếp từ tỷ số sai phân, không dùng công thức có sẵn.', difficulty:'Vừa', dependsOn:['derivative-limit'] },

  { id:'product-rule', conceptId:'derivative-rules', kind:'theorem', title:'Quy tắc tích', summary:'Đạo hàm của tích có hai hạng chứ không phải tích các đạo hàm.', formula:"$(fg)'=f'g+fg'$" },
  { id:'chain-rule-core', conceptId:'derivative-rules', kind:'theorem', title:'Quy tắc hàm hợp', summary:'Đạo hàm ngoài nhân với đạo hàm trong.', formula:"$(f\\circ g)'(x)=f'(g(x))g'(x)$" },
  { id:'chain-rule-proof-idea', conceptId:'derivative-rules', kind:'proof', title:'Ý tưởng chứng minh chain rule', summary:'Tách tỷ số biến thiên của f∘g thành biến thiên của f theo g và biến thiên của g theo x.', dependsOn:['chain-rule-core'] },
  { id:'chain-rule-subskill', conceptId:'derivative-rules', kind:'subskill', title:'Nhận diện lớp hàm', summary:'Trước khi đạo hàm, đánh dấu hàm ngoài, hàm trong và số lớp lồng nhau.', dependsOn:['chain-rule-core'] },
  { id:'product-rule-misconception', conceptId:'derivative-rules', kind:'misconception', title:'(fg)′ ≠ f′g′', summary:'Đây là một trong những lỗi đại số–giải tích phổ biến nhất.', dependsOn:['product-rule'] },
  { id:'chain-nested-exercise', conceptId:'derivative-rules', kind:'exercise', title:'Hàm hợp ba lớp', summary:'Đạo hàm biểu thức dạng sin((3x+1)²) và giải thích từng lớp.', difficulty:'Khó', dependsOn:['chain-rule-subskill'] },

  { id:'integral-riemann', conceptId:'definite-integrals', kind:'definition', title:'Tích phân như giới hạn tổng', summary:'Tích phân xác định là giới hạn của tổng diện tích có dấu trên các phân hoạch ngày càng mịn.', formula:'$\\int_a^b f(x)\\,dx$' },
  { id:'ftc-theorem', conceptId:'definite-integrals', kind:'theorem', title:'Định lý cơ bản của giải tích', summary:'Nối hai phép tưởng như khác nhau: đạo hàm và tích phân.', formula:'$\\int_a^b f(x)dx=F(b)-F(a),\\;F\'=f$', dependsOn:['integral-riemann'] },
  { id:'integral-signed-area', conceptId:'definite-integrals', kind:'subskill', title:'Phân biệt diện tích và diện tích có dấu', summary:'Phần đồ thị dưới trục Ox đóng góp giá trị âm vào tích phân.' },
  { id:'integral-area-misconception', conceptId:'definite-integrals', kind:'misconception', title:'Tích phân không luôn là diện tích hình học', summary:'Muốn diện tích hình học phải xử lý dấu hoặc tích phân |f|.', dependsOn:['integral-signed-area'] },
  { id:'integral-symmetry-example', conceptId:'definite-integrals', kind:'example', title:'Hàm lẻ trên đoạn đối xứng', summary:'Tích phân có thể bằng 0 dù miền hình học có diện tích dương.', formula:'$\\int_{-a}^{a}f(x)dx=0$ với f lẻ', dependsOn:['integral-signed-area'] },

  { id:'quadratic-standard', conceptId:'quadratics', kind:'definition', title:'Dạng chuẩn phương trình bậc hai', summary:'Phương trình bậc hai có hệ số a khác 0.', formula:'$ax^2+bx+c=0,\\;a\\ne0$' },
  { id:'quadratic-discriminant', conceptId:'quadratics', kind:'theorem', title:'Biệt thức và số nghiệm thực', summary:'Dấu của Δ quyết định số nghiệm thực phân biệt.', formula:'$\\Delta=b^2-4ac$', dependsOn:['quadratic-standard'] },
  { id:'quadratic-completing-square', conceptId:'quadratics', kind:'subskill', title:'Hoàn thành bình phương', summary:'Biến tam thức thành dạng đỉnh để thấy trực tiếp vị trí parabol.', formula:'$a(x-h)^2+k$', dependsOn:['quadratic-standard'] },
  { id:'quadratic-parabola-link', conceptId:'quadratics', kind:'application', title:'Phương trình ↔ giao điểm parabol', summary:'Nghiệm của phương trình là hoành độ giao điểm của y=ax²+bx+c với trục Ox.', dependsOn:['quadratic-discriminant'] },
  { id:'quadratic-delta-misconception', conceptId:'quadratics', kind:'misconception', title:'Δ=0 không có nghĩa là “không có nghiệm”', summary:'Δ=0 cho một nghiệm kép, tương ứng parabol tiếp xúc trục Ox.', dependsOn:['quadratic-discriminant'] },

  { id:'complex-unit', conceptId:'complex-numbers', kind:'definition', title:'Đơn vị ảo', summary:'Số i được định nghĩa bởi i²=-1.', formula:'$i^2=-1$' },
  { id:'complex-form', conceptId:'complex-numbers', kind:'definition', title:'Dạng đại số', summary:'Mỗi số phức viết dưới dạng a+bi với phần thực a và phần ảo b.', formula:'$z=a+bi$', dependsOn:['complex-unit'] },
  { id:'complex-modulus', conceptId:'complex-numbers', kind:'definition', title:'Môđun', summary:'Khoảng cách từ điểm biểu diễn số phức đến gốc tọa độ.', formula:'$|a+bi|=\\sqrt{a^2+b^2}$', dependsOn:['complex-form'] },
  { id:'complex-conjugate-theorem', conceptId:'complex-numbers', kind:'theorem', title:'Tích với liên hợp', summary:'Tích z với liên hợp của nó bằng bình phương môđun.', formula:'$z\\overline z=|z|^2$', dependsOn:['complex-modulus'] },
  { id:'complex-real-line-misconception', conceptId:'complex-numbers', kind:'misconception', title:'Số phức không “ít thật” hơn số thực', summary:'Số thực là tập con của số phức khi phần ảo bằng 0.', dependsOn:['complex-form'] },
  { id:'complex-plane-example', conceptId:'complex-numbers', kind:'example', title:'3+4i trên mặt phẳng phức', summary:'Điểm (3,4) có môđun 5 và minh họa trực tiếp định lý Pythagoras.', formula:'$|3+4i|=5$', dependsOn:['complex-modulus'] },

  { id:'conditional-prob-definition', conceptId:'conditional-probability', kind:'definition', title:'Xác suất có điều kiện', summary:'Xác suất của A khi biết B đã xảy ra được chuẩn hóa trên không gian B.', formula:'$P(A|B)=\\frac{P(A\\cap B)}{P(B)}$' },
  { id:'independence-definition', conceptId:'conditional-probability', kind:'definition', title:'Độc lập', summary:'Biết B không làm thay đổi xác suất của A.', formula:'$P(A|B)=P(A)$', dependsOn:['conditional-prob-definition'] },
  { id:'conditional-independence-misconception', conceptId:'conditional-probability', kind:'misconception', title:'Độc lập ≠ xung khắc', summary:'Hai biến cố xung khắc có xác suất dương thường không độc lập.', dependsOn:['independence-definition'] },

  { id:'bayes-theorem-atom', conceptId:'bayes', kind:'theorem', title:'Định lý Bayes', summary:'Đổi chiều điều kiện từ P(B|A) sang P(A|B).', formula:'$P(A|B)=\\frac{P(B|A)P(A)}{P(B)}$' },
  { id:'bayes-base-rate', conceptId:'bayes', kind:'subskill', title:'Giữ base rate trong bài toán', summary:'Luôn đưa xác suất tiên nghiệm P(A) vào trước khi nhìn độ chính xác của test.', dependsOn:['bayes-theorem-atom'] },
  { id:'bayes-medical-example', conceptId:'bayes', kind:'example', title:'Sàng lọc bệnh hiếm', summary:'Một test chính xác vẫn có thể cho xác suất hậu nghiệm thấp nếu bệnh rất hiếm.', dependsOn:['bayes-base-rate'] },
  { id:'bayes-base-rate-misconception', conceptId:'bayes', kind:'misconception', title:'Bỏ qua tỷ lệ nền', summary:'Không thể đồng nhất “test đúng 99%” với “dương tính thì 99% có bệnh”.', dependsOn:['bayes-medical-example'] },
  { id:'bayes-tree-exercise', conceptId:'bayes', kind:'exercise', title:'Dựng cây xác suất trước khi dùng Bayes', summary:'Tính posterior bằng cả công thức và cây xác suất để đối chiếu.', difficulty:'Khó', dependsOn:['bayes-theorem-atom','bayes-base-rate'] },

  { id:'matrix-definition', conceptId:'matrices', kind:'definition', title:'Ma trận như mảng tuyến tính', summary:'Ma trận vừa là bảng số vừa là cách biểu diễn một biến đổi tuyến tính theo cơ sở.' },
  { id:'determinant-geometry', conceptId:'matrices', kind:'definition', title:'Ý nghĩa hình học của định thức', summary:'|det A| là hệ số co giãn diện tích/thể tích; dấu cho biết hướng.', formula:'$\\det A$' },
  { id:'matrix-invertibility-theorem', conceptId:'matrices', kind:'theorem', title:'Định thức và khả nghịch', summary:'Ma trận vuông khả nghịch khi và chỉ khi định thức khác 0.', formula:'$A^{-1}\\text{ tồn tại}\\iff\\det A\\ne0$', dependsOn:['determinant-geometry'] },
  { id:'matrix-order-misconception', conceptId:'matrices', kind:'misconception', title:'Phép nhân ma trận không giao hoán', summary:'Thông thường AB và BA khác nhau, thậm chí một trong hai có thể không xác định.' },
  { id:'matrix-system-application', conceptId:'matrices', kind:'application', title:'Giải hệ tuyến tính', summary:'Ax=b gom toàn bộ hệ phương trình tuyến tính vào một biểu thức.', formula:'$Ax=b$', dependsOn:['matrix-definition'] },

  { id:'eigen-definition', conceptId:'eigen', kind:'definition', title:'Vector riêng và trị riêng', summary:'Vector riêng giữ nguyên phương sau biến đổi tuyến tính, chỉ bị co giãn bởi λ.', formula:'$Av=\\lambda v$' },
  { id:'eigen-characteristic', conceptId:'eigen', kind:'subskill', title:'Phương trình đặc trưng', summary:'Tìm λ từ điều kiện A-λI không khả nghịch.', formula:'$\\det(A-\\lambda I)=0$', dependsOn:['eigen-definition'] },
  { id:'eigen-pca-application', conceptId:'eigen', kind:'application', title:'Liên hệ với PCA', summary:'PCA dùng vector riêng của ma trận hiệp phương sai để tìm các phương biến thiên chính.', dependsOn:['eigen-definition'] },
  { id:'eigen-count-misconception', conceptId:'eigen', kind:'misconception', title:'Không phải ma trận nào cũng có đủ vector riêng thực', summary:'Số trị riêng/vector riêng thực phụ thuộc trường số và cấu trúc ma trận.', dependsOn:['eigen-definition'] },

  { id:'prime-definition', conceptId:'primes', kind:'definition', title:'Số nguyên tố', summary:'Số nguyên dương lớn hơn 1 có đúng hai ước dương là 1 và chính nó.' },
  { id:'fta-theorem', conceptId:'primes', kind:'theorem', title:'Định lý cơ bản của số học', summary:'Mỗi số nguyên dương >1 phân tích duy nhất thành tích các số nguyên tố, bỏ qua thứ tự.', dependsOn:['prime-definition'] },
  { id:'prime-one-counter', conceptId:'primes', kind:'counterexample', title:'Tại sao 1 không phải số nguyên tố?', summary:'Nếu coi 1 là nguyên tố thì tính duy nhất của phân tích thừa số bị phá vỡ.', dependsOn:['fta-theorem'] },
  { id:'prime-test-subskill', conceptId:'primes', kind:'subskill', title:'Kiểm tra nguyên tố tới √n', summary:'Nếu n hợp số thì có ít nhất một ước không vượt quá √n.', formula:'$d\\le\\sqrt n$' },

  { id:'pythagoras-theorem-atom', conceptId:'pythagoras', kind:'theorem', title:'Định lý Pythagoras', summary:'Trong tam giác vuông, bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông.', formula:'$a^2+b^2=c^2$' },
  { id:'pythagoras-converse', conceptId:'pythagoras', kind:'theorem', title:'Định lý đảo Pythagoras', summary:'Nếu ba cạnh thỏa a²+b²=c² thì tam giác là tam giác vuông.', dependsOn:['pythagoras-theorem-atom'] },
  { id:'pythagoras-distance', conceptId:'pythagoras', kind:'application', title:'Khoảng cách tọa độ', summary:'Công thức khoảng cách trong mặt phẳng là Pythagoras viết bằng tọa độ.', formula:'$d=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}$', dependsOn:['pythagoras-theorem-atom'] },
  { id:'pythagoras-hypotenuse-misconception', conceptId:'pythagoras', kind:'misconception', title:'Phải xác định đúng cạnh huyền', summary:'c phải là cạnh đối diện góc vuông và là cạnh dài nhất.' },

  { id:'graph-vertex-edge', conceptId:'graph-theory', kind:'definition', title:'Đồ thị G=(V,E)', summary:'Đồ thị gồm tập đỉnh V và tập cạnh E mô tả quan hệ giữa các đỉnh.', formula:'$G=(V,E)$' },
  { id:'graph-path', conceptId:'graph-theory', kind:'definition', title:'Đường đi và liên thông', summary:'Đường đi là chuỗi đỉnh nối bởi cạnh; liên thông nghĩa là mọi cặp đỉnh có đường đi nối nhau.', dependsOn:['graph-vertex-edge'] },
  { id:'euler-degree-theorem', conceptId:'graph-theory', kind:'theorem', title:'Điều kiện chu trình Euler', summary:'Đồ thị vô hướng liên thông có chu trình Euler khi mọi đỉnh có bậc chẵn.', dependsOn:['graph-path'] },
  { id:'graph-hamilton-misconception', conceptId:'graph-theory', kind:'misconception', title:'Euler và Hamilton không phải một bài toán', summary:'Euler đi qua mỗi cạnh một lần; Hamilton đi qua mỗi đỉnh một lần.', dependsOn:['euler-degree-theorem'] },
  { id:'graph-network-application', conceptId:'graph-theory', kind:'application', title:'Mạng giao thông và mạng xã hội', summary:'Đỉnh biểu diễn đối tượng, cạnh biểu diễn kết nối; từ đó phân tích đường đi và cấu trúc mạng.', dependsOn:['graph-vertex-edge'] },
];

export const QUIZ_CONCEPT_MAP: Record<string, string> = {
  'alg-discriminant': 'quadratics',
  'geom-pythagoras-6-8': 'pythagoras',
  'calc-power-derivative': 'derivative-rules',
  'calc-antiderivative-2x': 'antiderivatives',
  'comb-5-2': 'counting',
  'complex-i-square': 'complex-numbers',
  'complex-modulus-3-4': 'complex-numbers',
  'trig-identity': 'trig-identities',
  'alg-log-2-8': 'exponential-logarithmic',
  'prob-two-coins': 'probability-basics',
  'geom-circle-area-r3': 'euclidean-geometry',
  'calc-sin-derivative': 'derivative-rules',
  'comb-factorial-5': 'counting',
  'alg-absolute-equation-count': 'algebraic-expressions',
  'number-prime-17': 'primes',
  'calc-definite-integral': 'definite-integrals',
  'linear-matrix-det': 'matrices',
  'stats-mean': 'descriptive-statistics',
  'ineq-amgm': 'inequalities',
  'prob-bayes-screening': 'bayes',
  'calc-chain-rule': 'derivative-rules',
  'number-congruence': 'modular-arithmetic',
  'trig-radian': 'angle-radian',
  'complex-multiply': 'complex-numbers',
};

export const ATOM_BY_ID = new Map(MATH_ATOMS.map(atom => [atom.id, atom]));
