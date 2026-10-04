import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  iconBg = 'bg-mode-utau/10',
  iconColor = 'text-mode-utau',
  children,
  size = 'md',
  showCloseButton = true,
}) => {
  const modalId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      contentRef.current?.focus();
    } else {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const focusable = contentRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? `${modalId}-title` : undefined}
      aria-describedby={description ? `${modalId}-description` : undefined}
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className={`${sizeClasses[size]} w-full bg-bg-secondary border border-border-default rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[88vh] text-text-primary`}
      >
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-bg-tertiary">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className={`p-2 rounded-lg ${iconBg} border ${iconBg.replace('bg-', 'border-').replace('/10', '/20')} ${iconColor}`}>
                {icon}
              </div>
            )}
            <div>
              <h2 id={`${modalId}-title`} className="text-sm font-bold text-text-primary">{title}</h2>
              {description && <p id={`${modalId}-description`} className="text-xs text-text-muted">{description}</p>}
            </div>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
};