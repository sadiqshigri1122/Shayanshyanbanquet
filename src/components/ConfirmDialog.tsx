import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Lock, Trash2, X } from 'lucide-react';
import type { ReactNode } from 'react';

type ConfirmVariant = 'default' | 'danger';
type ConfirmIcon = 'lock' | 'warning' | 'delete';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: ConfirmIcon | ReactNode;
  details?: ReactNode;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const iconMap = {
  lock: Lock,
  warning: AlertTriangle,
  delete: Trash2,
};

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  icon = 'warning',
  details,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const IconComponent = typeof icon === 'string' ? iconMap[icon as ConfirmIcon] : null;

  const iconStyles =
    variant === 'danger'
      ? 'bg-danger-light text-danger'
      : icon === 'lock'
        ? 'bg-primary/10 text-primary'
        : 'bg-warning/10 text-warning';

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
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="modal-panel bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="flex justify-end p-3 pb-0 sticky top-0 bg-white rounded-t-2xl sm:rounded-t-2xl z-10">
          <button
            onClick={onCancel}
            disabled={loading}
            className="touch-target flex items-center justify-center rounded-lg hover:bg-gray-100 text-muted disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 sm:px-6 pb-6 pt-1 text-center">
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${iconStyles}`}>
            {IconComponent ? <IconComponent size={26} strokeWidth={2} /> : icon}
          </div>

          <h2 id="confirm-dialog-title" className="text-lg font-bold text-primary mb-2">
            {title}
          </h2>
          <p className="text-sm text-muted leading-relaxed">{message}</p>

          {details && (
            <div className="mt-4 rounded-lg bg-surface-alt border border-border px-4 py-3 text-left text-sm">
              {details}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-lg border border-gray-200 text-sm font-semibold text-primary hover:bg-gray-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50 ${
                variant === 'danger'
                  ? 'bg-danger hover:bg-danger/90'
                  : 'bg-primary hover:bg-primary-hover'
              }`}
            >
              {loading ? 'Please wait…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
