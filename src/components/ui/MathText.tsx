import { memo } from 'react';
import { renderMath } from '../../utils/mathRender';

interface MathTextProps {
  expr: string;
  display?: boolean;
  className?: string;
}

// Memoized: KaTeX parse là phần đắt nhất khi chat streaming (mỗi delta
// render lại toàn bộ tin nhắn). Props đều nguyên thủy nên so sánh nông đủ.
export const MathText = memo(function MathText({ expr, display = false, className = '' }: MathTextProps) {
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: renderMath(expr, display) }}
    />
  );
});
