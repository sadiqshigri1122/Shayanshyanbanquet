import type { ReactNode } from 'react';

export const modalFormClass = 'space-y-4';
export const modalInputClass = 'w-full border rounded-lg px-3 py-2.5 text-sm';
export const modalSelectClass = modalInputClass;
export const modalTextareaClass = `${modalInputClass} resize-none`;

interface ModalFieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

export default function ModalField({ label, children, hint }: ModalFieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  );
}
