import type { ReactNode } from 'react';

interface ConfirmationDialogProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function ConfirmationDialog({ title, children, onClose }: ConfirmationDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <button className="dialog-close" type="button" aria-label={`Close ${title}`} onClick={onClose}>×</button>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}
