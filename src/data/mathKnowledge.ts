export type MathDomainId =
  | 'foundations'
  | 'algebra'
  | 'geometry'
  | 'trigonometry'
  | 'calculus'
  | 'linear-algebra'
  | 'probability-statistics'
  | 'discrete'
  | 'number-theory'
  | 'differential-equations';

export interface MathDomain {
  id: MathDomainId;
  name: string;
  short: string;
  description: string;
  order: number;
}

export type ConceptLevel = 'Nền tảng' | 'THCS' | 'THPT' | 'Đại học';

export interface MathConcept {
  id: string;
  title: string;
  domain: MathDomainId;
  level: ConceptLevel;
  description: string;
  prerequisites: string[];
  lessonIds?: string[];
  formulaIds?: string[];
  toolPaths?: string[];
  tags: string[];
}

export const MATH_DOMAINS: MathDomain[] = [
  { id: 'foundations', name: 'Nền tảng & Logic', short: 'Nền tảng', order: 1, description: 'Ngôn ngữ cơ bản của toán: số, tập hợp, logic, ánh xạ và chứng minh.' },
  { id: 'algebra', name: 'Đại số', short: 'Đại số', order: 2, description: 'Biểu thức, phương trình, hàm số, bất đẳng thức, dãy và cấu trúc đại số sơ cấp.' },
  { id: 'geometry', name: 'Hình học & Vector', short: 'Hình học', order: 3, description: 'Không gian, khoảng cách, góc, tọa độ, vector và quan hệ hình học.' },
  { id: 'trigonometry', name: 'Lượng giác', short: 'Lượng giác', order: 4, description: 'Hàm tuần hoàn, góc, đường tròn đơn vị và các đồng nhất thức lượng giác.' },
  { id: 'calculus', name: 'Giải tích', short: 'Giải tích', order: 5, description: 'Giới hạn, liên tục, đạo hàm, tích phân, chuỗi và xấp xỉ.' },
  { id: 'linear-algebra', name: 'Đại số tuyến tính', short: 'Tuyến tính', order: 6, description: 'Ma trận, hệ tuyến tính, không gian vector, trị riêng và biến đổi tuyến tính.' },
  { id: 'probability-statistics', name: 'Xác suất & Thống kê', short: 'Xác suất', order: 7, description: 'Ngẫu nhiên, phân phối, suy luận Bayes và mô tả dữ liệu.' },
  { id: 'discrete', name: 'Toán rời rạc', short: 'Rời rạc', order: 8, description: 'Tổ hợp, quan hệ, đồ thị, đệ quy và các cấu trúc hữu hạn/đếm được.' },
  { id: 'number-theory', name: 'Lý thuyết số', short: 'Số học', order: 9, description: 'Số nguyên, chia hết, nguyên tố, đồng dư và cấu trúc số học.' },
  { id: 'differential-equations', name: 'Phương trình vi phân', short: 'PT vi phân', order: 10, description: 'Mô hình động lực bằng đạo hàm, nghiệm ODE và hành vi hệ theo thời gian.' },
];

export const MATH_CONCEPTS: MathConcept[] = [
  { id:'number-systems', title:'Hệ số và biểu diễn số', domain:'foundations', level:'Nền tảng', description:'Từ số tự nhiên đến số thực; hiểu phép toán, thứ tự và biểu diễn.', prerequisites:[], lessonIds:['frac'], tags:['số','phân số','thực'] },
  { id:'sets', title:'Tập hợp', domain:'foundations', level:'THPT', description:'Phần tử, tập con, hợp, giao, phần bù và tích Descartes.', prerequisites:['number-systems'], lessonIds:['set'], tags:['tập hợp','phần tử','giao','hợp'] },
  { id:'functions', title:'Hàm số & ánh xạ', domain:'foundations', level:'THPT', description:'Miền xác định, miền giá trị, đơn ánh, toàn ánh và hợp hàm.', prerequisites:['sets'], lessonIds:['set'], tags:['hàm','ánh xạ','miền xác định'] },
  { id:'logic', title:'Logic mệnh đề', domain:'foundations', level:'THPT', description:'Mệnh đề, kéo theo, tương đương, phủ định và lượng từ.', prerequisites:['sets'], lessonIds:['proof'], tags:['logic','mệnh đề','suy luận'] },
  { id:'proof', title:'Phương pháp chứng minh', domain:'foundations', level:'THPT', description:'Trực tiếp, phản chứng, phản ví dụ và quy nạp.', prerequisites:['logic'], lessonIds:['proof'], tags:['chứng minh','quy nạp','phản chứng'] },

  { id:'algebraic-expressions', title:'Biểu thức đại số', domain:'algebra', level:'THCS', description:'Biến đổi biểu thức, hằng đẳng thức và phân tích nhân tử.', prerequisites:['number-systems'], tags:['biểu thức','nhân tử'] },
  { id:'linear-equations', title:'Phương trình bậc nhất', domain:'algebra', level:'THCS', description:'Giải ax+b=0 và diễn giải bằng giao điểm của đường thẳng.', prerequisites:['algebraic-expressions'], toolPaths:['/tools'], tags:['phương trình','bậc nhất'] },
  { id:'quadratics', title:'Phương trình & hàm bậc hai', domain:'algebra', level:'THPT', description:'Biệt thức, nghiệm, parabol, đỉnh và trục đối xứng.', prerequisites:['linear-equations','functions'], lessonIds:['quad'], formulaIds:['delta'], toolPaths:['/graph','/tools'], tags:['bậc hai','delta','parabol'] },
  { id:'inequalities', title:'Bất đẳng thức', domain:'algebra', level:'THPT', description:'So sánh, miền nghiệm và kỹ thuật đánh giá.', prerequisites:['algebraic-expressions'], lessonIds:['amgm'], formulaIds:['amgmf'], tags:['bất đẳng thức','am-gm'] },
  { id:'sequences', title:'Dãy số', domain:'algebra', level:'THPT', description:'Cấp số cộng, cấp số nhân, số hạng tổng quát và tổng hữu hạn.', prerequisites:['functions'], lessonIds:['seq'], toolPaths:['/tools'], tags:['dãy','cấp số'] },
  { id:'exponential-logarithmic', title:'Hàm mũ & logarit', domain:'algebra', level:'THPT', description:'Hàm ngược, quy tắc logarit, tăng trưởng và thang đo log.', prerequisites:['functions','algebraic-expressions'], lessonIds:['log'], formulaIds:['loglaw'], toolPaths:['/graph','/calculus'], tags:['log','mũ','exponential'] },
  { id:'complex-numbers', title:'Số phức', domain:'algebra', level:'Đại học', description:'Mặt phẳng phức, môđun, argument và dạng cực.', prerequisites:['quadratics','trigonometric-functions'], lessonIds:['cplx'], formulaIds:['euler'], toolPaths:['/tools'], tags:['số phức','euler'] },
  { id:'de-moivre', title:'De Moivre & căn phức', domain:'algebra', level:'Đại học', description:'Lũy thừa và khai căn số phức trong dạng lượng giác.', prerequisites:['complex-numbers'], lessonIds:['demoivre'], formulaIds:['deMoivre'], tags:['de moivre','căn phức'] },

  { id:'euclidean-geometry', title:'Hình học Euclid', domain:'geometry', level:'THCS', description:'Điểm, đường, góc, tam giác và các quan hệ cơ bản.', prerequisites:['number-systems'], tags:['tam giác','góc','hình học'] },
  { id:'pythagoras', title:'Định lý Pythagoras', domain:'geometry', level:'THCS', description:'Quan hệ độ dài trong tam giác vuông và khoảng cách tọa độ.', prerequisites:['euclidean-geometry'], lessonIds:['pyth'], formulaIds:['py'], tags:['pythagoras','tam giác vuông'] },
  { id:'coordinate-geometry', title:'Hình học tọa độ', domain:'geometry', level:'THPT', description:'Khoảng cách, phương trình đường và mô tả hình bằng tọa độ.', prerequisites:['pythagoras','linear-equations'], tags:['tọa độ','đường thẳng'] },
  { id:'vectors', title:'Vector', domain:'geometry', level:'THPT', description:'Độ lớn, hướng, cộng vector và tích vô hướng.', prerequisites:['coordinate-geometry'], lessonIds:['vec'], toolPaths:['/tools'], tags:['vector','tích vô hướng'] },
  { id:'cosine-law', title:'Định lý cosine', domain:'geometry', level:'THPT', description:'Mở rộng Pythagoras cho tam giác bất kỳ.', prerequisites:['pythagoras','trigonometric-functions'], formulaIds:['cos'], tags:['cosine','tam giác'] },

  { id:'angle-radian', title:'Góc & radian', domain:'trigonometry', level:'THPT', description:'Đo góc bằng radian và liên hệ với cung tròn.', prerequisites:['euclidean-geometry'], tags:['radian','góc'] },
  { id:'unit-circle', title:'Đường tròn lượng giác', domain:'trigonometry', level:'THPT', description:'Sin/cos như tọa độ trên đường tròn đơn vị.', prerequisites:['angle-radian','coordinate-geometry'], lessonIds:['trig'], tags:['sin','cos','đường tròn'] },
  { id:'trigonometric-functions', title:'Hàm lượng giác', domain:'trigonometry', level:'THPT', description:'Chu kỳ, biên độ, pha và đồ thị sin/cos/tan.', prerequisites:['unit-circle','functions'], lessonIds:['trig'], formulaIds:['sina'], toolPaths:['/graph','/calculus'], tags:['sin','cos','tan','chu kỳ'] },
  { id:'trig-identities', title:'Đồng nhất thức lượng giác', domain:'trigonometry', level:'THPT', description:'Biến đổi và chứng minh các đồng nhất thức lượng giác.', prerequisites:['trigonometric-functions','algebraic-expressions'], formulaIds:['sina'], tags:['đồng nhất thức','lượng giác'] },

  { id:'limits', title:'Giới hạn', domain:'calculus', level:'THPT', description:'Hành vi của hàm khi biến tiến gần một điểm hoặc vô cực.', prerequisites:['functions','exponential-logarithmic'], lessonIds:['lim'], toolPaths:['/calculus'], tags:['giới hạn','limit'] },
  { id:'continuity', title:'Tính liên tục', domain:'calculus', level:'THPT', description:'Khi giới hạn tại điểm khớp với giá trị của hàm.', prerequisites:['limits'], tags:['liên tục'] },
  { id:'derivative-definition', title:'Định nghĩa đạo hàm', domain:'calculus', level:'THPT', description:'Đạo hàm như giới hạn của tỷ số sai phân và hệ số góc tiếp tuyến.', prerequisites:['limits','continuity'], lessonIds:['der'], formulaIds:['derp'], toolPaths:['/graph','/calculus'], tags:['đạo hàm','tiếp tuyến'] },
  { id:'derivative-rules', title:'Quy tắc đạo hàm', domain:'calculus', level:'THPT', description:'Tổng, tích, thương, hàm hợp và đạo hàm các hàm cơ bản.', prerequisites:['derivative-definition','trigonometric-functions'], lessonIds:['der'], formulaIds:['derp','chain','exp'], toolPaths:['/calculus'], tags:['chain rule','đạo hàm'] },
  { id:'optimization', title:'Cực trị & tối ưu', domain:'calculus', level:'THPT', description:'Dùng đạo hàm để tìm cực trị và tối ưu hóa.', prerequisites:['derivative-rules','inequalities'], toolPaths:['/calculus','/graph'], tags:['cực trị','tối ưu'] },
  { id:'antiderivatives', title:'Nguyên hàm', domain:'calculus', level:'THPT', description:'Họ hàm có đạo hàm bằng một hàm đã cho.', prerequisites:['derivative-rules'], lessonIds:['intg'], formulaIds:['intp','parts'], tags:['nguyên hàm'] },
  { id:'definite-integrals', title:'Tích phân xác định', domain:'calculus', level:'THPT', description:'Tổng liên tục, diện tích có dấu và định lý cơ bản của giải tích.', prerequisites:['antiderivatives','limits'], lessonIds:['intg'], formulaIds:['intp'], toolPaths:['/calculus'], tags:['tích phân','diện tích'] },
  { id:'series', title:'Chuỗi vô hạn', domain:'calculus', level:'Đại học', description:'Hội tụ của tổng vô hạn và các tiêu chuẩn hội tụ.', prerequisites:['limits','sequences'], lessonIds:['series'], tags:['chuỗi','hội tụ'] },
  { id:'taylor', title:'Chuỗi Taylor', domain:'calculus', level:'Đại học', description:'Xấp xỉ hàm bằng đa thức từ các đạo hàm tại một điểm.', prerequisites:['series','derivative-rules'], lessonIds:['series'], toolPaths:['/calculus'], tags:['taylor','xấp xỉ'] },

  { id:'linear-systems', title:'Hệ phương trình tuyến tính', domain:'linear-algebra', level:'THPT', description:'Nhiều phương trình tuyến tính và cấu trúc nghiệm.', prerequisites:['linear-equations'], lessonIds:['matrix'], toolPaths:['/tools'], tags:['hệ tuyến tính'] },
  { id:'matrices', title:'Ma trận', domain:'linear-algebra', level:'Đại học', description:'Phép toán ma trận, định thức và nghịch đảo.', prerequisites:['linear-systems'], lessonIds:['matrix'], formulaIds:['det2'], toolPaths:['/tools'], tags:['ma trận','định thức'] },
  { id:'vector-spaces', title:'Không gian vector', domain:'linear-algebra', level:'Đại học', description:'Vector trừu tượng, tổ hợp tuyến tính, cơ sở và số chiều.', prerequisites:['vectors','matrices'], tags:['không gian vector','cơ sở'] },
  { id:'linear-transformations', title:'Biến đổi tuyến tính', domain:'linear-algebra', level:'Đại học', description:'Ánh xạ bảo toàn cộng và nhân vô hướng; ma trận là biểu diễn theo cơ sở.', prerequisites:['vector-spaces','functions'], tags:['biến đổi tuyến tính'] },
  { id:'eigen', title:'Trị riêng & vector riêng', domain:'linear-algebra', level:'Đại học', description:'Các hướng bất biến của biến đổi tuyến tính và chéo hóa.', prerequisites:['matrices','linear-transformations'], lessonIds:['eigen'], tags:['trị riêng','vector riêng','pca'] },

  { id:'counting', title:'Nguyên lý đếm', domain:'discrete', level:'THPT', description:'Quy tắc cộng, nhân, hoán vị, chỉnh hợp và tổ hợp.', prerequisites:['number-systems','logic'], lessonIds:['comb'], formulaIds:['ncr'], toolPaths:['/tools'], tags:['đếm','tổ hợp'] },
  { id:'binomial', title:'Nhị thức Newton', domain:'discrete', level:'THPT', description:'Khai triển nhị thức và hệ số tổ hợp.', prerequisites:['counting','algebraic-expressions'], lessonIds:['binom'], formulaIds:['ncr'], tags:['nhị thức','newton'] },
  { id:'relations', title:'Quan hệ & cấu trúc rời rạc', domain:'discrete', level:'Đại học', description:'Quan hệ hai ngôi, thứ tự và mô hình rời rạc.', prerequisites:['sets','logic'], lessonIds:['disc'], tags:['quan hệ','rời rạc'] },
  { id:'graph-theory', title:'Lý thuyết đồ thị', domain:'discrete', level:'Đại học', description:'Đỉnh, cạnh, đường đi, liên thông, Euler và Hamilton.', prerequisites:['relations','counting'], lessonIds:['graphth'], tags:['đồ thị','graph theory'] },

  { id:'divisibility', title:'Chia hết & UCLN', domain:'number-theory', level:'THCS', description:'Ước, bội, thuật toán Euclid và cấu trúc chia hết.', prerequisites:['number-systems'], toolPaths:['/tools'], tags:['chia hết','ucln'] },
  { id:'primes', title:'Số nguyên tố', domain:'number-theory', level:'THCS', description:'Phân tích thừa số và vai trò của số nguyên tố.', prerequisites:['divisibility'], lessonIds:['ntheory'], toolPaths:['/tools'], tags:['nguyên tố'] },
  { id:'modular-arithmetic', title:'Số học modulo', domain:'number-theory', level:'Đại học', description:'Lớp đồng dư, phép toán modulo và chu kỳ số học.', prerequisites:['divisibility','algebraic-expressions'], lessonIds:['ntheory'], formulaIds:['mod'], toolPaths:['/tools'], tags:['mod','đồng dư'] },

  { id:'probability-basics', title:'Không gian xác suất', domain:'probability-statistics', level:'THPT', description:'Biến cố, xác suất, hợp-giao và xác suất có điều kiện.', prerequisites:['sets','counting'], lessonIds:['prob'], formulaIds:['indep'], tags:['xác suất','biến cố'] },
  { id:'conditional-probability', title:'Xác suất có điều kiện', domain:'probability-statistics', level:'THPT', description:'Cập nhật xác suất khi đã biết một biến cố khác xảy ra.', prerequisites:['probability-basics'], formulaIds:['indep'], tags:['điều kiện'] },
  { id:'bayes', title:'Định lý Bayes', domain:'probability-statistics', level:'Đại học', description:'Đảo điều kiện bằng prior, likelihood và evidence.', prerequisites:['conditional-probability'], lessonIds:['bayes'], formulaIds:['bayesf'], tags:['bayes'] },
  { id:'descriptive-statistics', title:'Thống kê mô tả', domain:'probability-statistics', level:'THPT', description:'Trung bình, trung vị, phương sai, độ lệch chuẩn và tứ phân vị.', prerequisites:['number-systems'], lessonIds:['stat'], toolPaths:['/tools'], tags:['trung bình','phương sai','thống kê'] },

  { id:'first-order-ode', title:'ODE cấp một', domain:'differential-equations', level:'Đại học', description:'Phương trình y′=f(x,y), tách biến và nghiệm theo điều kiện đầu.', prerequisites:['derivative-rules','antiderivatives','exponential-logarithmic'], lessonIds:['de'], formulaIds:['exp'], tags:['ode','phương trình vi phân'] },
  { id:'exponential-growth-models', title:'Mô hình tăng trưởng & suy giảm', domain:'differential-equations', level:'Đại học', description:'Mô hình y′=ky cho tăng trưởng, phân rã và lãi liên tục.', prerequisites:['first-order-ode'], lessonIds:['de','finance'], formulaIds:['exp'], tags:['tăng trưởng','phân rã'] },
];

export const CONCEPT_BY_ID = new Map(MATH_CONCEPTS.map(concept => [concept.id, concept]));
