import { renderMath } from '../../utils/math';

interface MathTextProps {
  expr: string;
  display?: boolean;
  className?: string;
}

export function MathText({ expr, display = false, className = '' }: MathTextProps) {
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: renderMath(expr, display) }}
    />
  );
}
