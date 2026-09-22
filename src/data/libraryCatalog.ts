import type { MathDomainId } from './mathKnowledge';

export interface LibraryDomainProfile {
  id: MathDomainId;
  wikipediaVi: string;
  wikipediaEn: string;
  openLibraryQuery: string;
  relatedBookIds: string[];
}

export const LIBRARY_DOMAIN_PROFILES: LibraryDomainProfile[] = [
  {
    id: 'foundations',
    wikipediaVi: 'cơ sở toán học logic toán học lý thuyết tập hợp',
    wikipediaEn: 'foundations of mathematics mathematical logic set theory',
    openLibraryQuery: 'foundations of mathematics logic proofs',
    relatedBookIds: ['polya', 'velleman', 'courant'],
  },
  {
    id: 'algebra',
    wikipediaVi: 'đại số phương trình hàm số số phức',
    wikipediaEn: 'algebra equations functions complex numbers',
    openLibraryQuery: 'algebra mathematics equations',
    relatedBookIds: ['aops', 'courant'],
  },
  {
    id: 'geometry',
    wikipediaVi: 'hình học Euclid vectơ hình học tọa độ',
    wikipediaEn: 'Euclidean geometry vectors analytic geometry',
    openLibraryQuery: 'geometry mathematics Euclidean analytic',
    relatedBookIds: ['euclid', 'courant'],
  },
  {
    id: 'trigonometry',
    wikipediaVi: 'lượng giác hàm lượng giác đường tròn đơn vị',
    wikipediaEn: 'trigonometry trigonometric functions unit circle',
    openLibraryQuery: 'trigonometry mathematics',
    relatedBookIds: ['thpt', 'courant'],
  },
  {
    id: 'calculus',
    wikipediaVi: 'giải tích đạo hàm tích phân giới hạn chuỗi Taylor',
    wikipediaEn: 'calculus derivative integral limits Taylor series',
    openLibraryQuery: 'calculus analysis mathematics',
    relatedBookIds: ['thpt', 'courant', 'tao'],
  },
  {
    id: 'linear-algebra',
    wikipediaVi: 'đại số tuyến tính ma trận không gian vectơ trị riêng',
    wikipediaEn: 'linear algebra matrices vector spaces eigenvalues',
    openLibraryQuery: 'linear algebra matrices vector spaces',
    relatedBookIds: ['axler', 'courant'],
  },
  {
    id: 'probability-statistics',
    wikipediaVi: 'xác suất thống kê định lý Bayes phương sai',
    wikipediaEn: 'probability statistics Bayes theorem variance',
    openLibraryQuery: 'probability statistics mathematics',
    relatedBookIds: ['courant'],
  },
  {
    id: 'discrete',
    wikipediaVi: 'toán rời rạc tổ hợp lý thuyết đồ thị',
    wikipediaEn: 'discrete mathematics combinatorics graph theory',
    openLibraryQuery: 'discrete mathematics combinatorics graph theory',
    relatedBookIds: ['rosen', 'concrete', 'aops'],
  },
  {
    id: 'number-theory',
    wikipediaVi: 'lý thuyết số số nguyên tố số học modulo',
    wikipediaEn: 'number theory prime numbers modular arithmetic',
    openLibraryQuery: 'number theory prime numbers mathematics',
    relatedBookIds: ['proofsbook', 'courant'],
  },
  {
    id: 'differential-equations',
    wikipediaVi: 'phương trình vi phân phương trình vi phân thường',
    wikipediaEn: 'differential equations ordinary differential equations',
    openLibraryQuery: 'differential equations mathematics',
    relatedBookIds: ['courant'],
  },
  {
    id: 'mathematical-physics',
    wikipediaVi: 'vật lý toán học cơ học cổ điển hấp dẫn Newton',
    wikipediaEn: 'mathematical physics classical mechanics Newtonian gravity',
    openLibraryQuery: 'mathematical physics classical mechanics',
    relatedBookIds: ['feynman', 'courant'],
  },
];

export const LIBRARY_DOMAIN_PROFILE_BY_ID = new Map(
  LIBRARY_DOMAIN_PROFILES.map(profile => [profile.id, profile])
);
