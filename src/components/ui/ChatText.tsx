import { Fragment } from 'react';
import { MathText } from './MathText';

// Render a small, safe subset of formatting without interpreting HTML from a model.
export function ChatText({ text }: { text: string }) {
  return <>{text.split(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$\n]+\$|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('$$') || part.startsWith('\\[')) return <MathText key={index} expr={part.slice(2, -2)} display className="block max-w-full overflow-x-auto" />;
    if (part.startsWith('\\(')) return <MathText key={index} expr={part.slice(2, -2)} />;
    if (part.startsWith('$') && part.endsWith('$')) return <MathText key={index} expr={part.slice(1, -1)} />;
    if (part.startsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    return <Fragment key={index}>{part}</Fragment>;
  })}</>;
}
