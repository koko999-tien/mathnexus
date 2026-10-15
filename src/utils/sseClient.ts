// Nhỏ, thuần, test được: tách các event SSE `data: {...}` từ body đang chảy về.
// Mỗi event là 1 JSON trên 1 dòng data:. Chunk có thể cắt ngang JSON nên phải dồn buffer.

export interface StreamEvent {
  type: string;
  delta?: string;
  text?: string;
  model?: string;
  fallbackUsed?: boolean;
  error?: string;
  code?: string;
  [key: string]: unknown;
}

export function createSseParser(onEvent: (event: StreamEvent) => void) {
  let buffer = '';

  const pump = () => {
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const event of events) {
      for (const line of event.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          onEvent(JSON.parse(data) as StreamEvent);
        } catch {
          // Bỏ qua dòng rác, giữ stream sống.
        }
      }
    }
  };

  return {
    feed(chunk: string) {
      buffer += chunk;
      pump();
    },
    finish() {
      buffer += '\n\n';
      pump();
      buffer = '';
    },
  };
}
