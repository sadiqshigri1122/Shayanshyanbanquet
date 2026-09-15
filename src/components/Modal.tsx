import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}

export default function Modal({ title, children, onClose, wide }: ModalProps) {
  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className={`modal-panel bg-white rounded-2xl shadow-md w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
        <div className="no-print flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-bold text-primary">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-muted">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body p-5">{children}</div>
      </div>
    </div>
  );
}
