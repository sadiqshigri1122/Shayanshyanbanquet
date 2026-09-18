import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}

export default function Modal({ title, children, onClose, wide }: ModalProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`modal-panel bg-white rounded-t-2xl sm:rounded-2xl shadow-md w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[92vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="no-print flex items-center justify-between p-4 sm:p-5 border-b border-border sticky top-0 bg-white rounded-t-2xl sm:rounded-t-2xl z-10">
          <h2 className="font-bold text-primary text-sm sm:text-base pr-2">{title}</h2>
          <button onClick={onClose} className="touch-target flex items-center justify-center rounded-lg hover:bg-gray-100 text-muted shrink-0" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body p-4 sm:p-5 overflow-x-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
