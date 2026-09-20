import { useParams, Link } from 'react-router-dom';
import { FORMS } from '../data/formulas';
import { MathText } from '../components/ui/MathText';
import { ArrowLeft } from 'lucide-react';

export function FormulaDetail() {
  const { id } = useParams();
  const formula = FORMS.find(f => f.id === id);
  if (!formula) return <p className="text-muted">Công thức không tồn tại.</p>;

  return (
    <section>
      <Link to="/formulas" className="inline-flex items-center gap-1 text-accent font-semibold text-sm no-underline mb-4">
        <ArrowLeft size={14} /> Công thức
      </Link>
      <div className="text-[11px] tracking-[.14em] font-bold text-accent mb-1">{formula.cat}</div>
      <h1 className="text-3xl tracking-tight font-bold mb-4">{formula.name}</h1>
      <div className="bg-panel border border-line rounded-2xl p-6 mb-4">
        <div className="font-[Georgia] italic text-2xl mb-4"><MathText expr={formula.expr} display /></div>
        <div className="space-y-3">
          <Row label="Là gì" text={formula.what} />
          <Row label="Tại sao quan trọng" text={formula.why} />
          <Row label="Ứng dụng" text={formula.use} />
          <Row label="Ví dụ" text={formula.ex} />
        </div>
      </div>
    </section>
  );
}

function Row({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-muted m-0 mb-1">{label}</h3>
      <p className="m-0 text-sm">{text}</p>
    </div>
  );
}

export default FormulaDetail;
