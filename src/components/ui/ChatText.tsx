import { Fragment, memo } from 'react';
import { MathText } from './MathText';

const INLINE_PATTERN = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$\n]+\$|\*\*[^*]+\*\*)/g;
// Đuôi **chưa đóng ở block đang stream: hiện đậm luôn thay vì nháy dấu *.
const TENTATIVE_BOLD_TAIL = /\*\*([^*]+)$/;

// Một block (đoạn văn) memo riêng: khi stream, chỉ block cuối render lại,
// các block đã đóng đứng yên (học theo Streamdown/stream-md).
const ChatBlock = memo(function ChatBlock({ text, tentative }: { text: string; tentative: boolean }) {
  let body: string = text;
  let tail: string | null = null;
  if (tentative) {
    const match = TENTATIVE_BOLD_TAIL.exec(text);
    if (match) {
      body = text.slice(0, match.index);
      tail = match[1];
    }
  }
  return <>
    {body.split(INLINE_PATTERN).map((part, index) => {
      if (part.startsWith('$$') || part.startsWith('\\[')) return <MathText key={index} expr={part.slice(2, -2)} display className="block max-w-full overflow-x-auto" />;
      if (part.startsWith('\\(')) return <MathText key={index} expr={part.slice(2, -2)} />;
      if (part.startsWith('$') && part.endsWith('$')) return <MathText key={index} expr={part.slice(1, -1)} />;
      if (part.startsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
      return <Fragment key={index}>{part}</Fragment>;
    })}
    {tail !== null && <strong>{tail}</strong>}
  </>;
});

// Render a small, safe subset of formatting without interpreting HTML from a model.
// Memoized: tin nhắn đã xong không parse lại khi tin nhắn khác đang stream.
export const ChatText = memo(function ChatText({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const blocks = text.split(/\n{2,}/);
  return <>{blocks.map((block, index) => <ChatBlock key={index} text={block} tentative={streaming && index === blocks.length - 1} />)}</>;
});
