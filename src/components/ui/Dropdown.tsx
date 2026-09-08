import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  dividerAfter?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  width?: string;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
  width = 'w-56',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
  };

  const toggle = () => setIsOpen(!isOpen);

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-bg-tertiary border border-border-subtle hover:border-border-strong transition-colors flex items-center gap-1.5"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full z-50 mt-1 ${width} bg-bg-secondary border border-border-default rounded-lg shadow-xl py-1 text-xs ${className}`}
          role="menu"
        >
          {items.map((item, index) => (
            <React.Fragment key={index}>
              <button
                onClick={() => { item.onClick(); setIsOpen(false); }}
                disabled={item.disabled}
                className={`w-full text-left px-3 py-1.5 hover:bg-bg-tertiary transition-colors flex items-center gap-2 ${
                  item.disabled ? 'opacity-50 cursor-not-allowed' : 'text-text-primary'
                } ${item.danger ? 'text-state-error-text' : ''}`}
                role="menuitem"
                aria-disabled={item.disabled}
              >
                {item.icon && <span className="w-3.5 h-3.5 flex-shrink-0">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border-subtle rounded text-text-secondary font-mono text-[10px]">{item.shortcut}</kbd>}
              </button>
              {item.dividerAfter && <hr className="border-border-subtle my-1" />}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};