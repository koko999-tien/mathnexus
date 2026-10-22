import { lazy, Suspense } from 'react';

const ChatText = lazy(() => import('./ChatText').then(module => ({ default: module.ChatText })));

interface ChatTextLazyProps {
  text: string;
  streaming?: boolean;
}

export function ChatTextLazy({ text, streaming = false }: ChatTextLazyProps) {
  return (
    <Suspense fallback={<span>{text}</span>}>
      <ChatText text={text} streaming={streaming} />
    </Suspense>
  );
}
