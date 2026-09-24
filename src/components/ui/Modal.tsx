import { useEffect, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, onClose, children, className = '', initialFocusRef }: { title: string; onClose: () => void; children: ReactNode; className?: string; initialFocusRef?: RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    initialFocusRef?.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [initialFocusRef]);
  return (
    <dialog ref={ref} aria-label={title} onCancel={onClose} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }} className={`app-dialog ${className}`}>
      <div className="dialog-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Đóng"><X size={20} /></button></div>
      {children}
    </dialog>
  );
}
