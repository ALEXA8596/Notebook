import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/store';

export interface ContextMenuOption {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action?: () => void;
  submenu?: ContextMenuOption[];
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  options: ContextMenuOption[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const theme = useAppStore((state) => state.theme);
  const isDark = theme === 'dark' || theme === 'obsidian';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Calculate position after mount to get accurate menu dimensions
  useEffect(() => {
    if (!menuRef.current) return;
    
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8;
    
    let adjustedX = x;
    let adjustedY = y;
    
    // Adjust horizontal position if menu overflows right edge
    if (x + rect.width > viewportWidth - padding) {
      adjustedX = Math.max(padding, viewportWidth - rect.width - padding);
    }
    
    // Adjust vertical position if menu overflows bottom edge
    if (y + rect.height > viewportHeight - padding) {
      adjustedY = Math.max(padding, viewportHeight - rect.height - padding);
    }
    
    setPosition({ top: adjustedY, left: adjustedX });
  }, [x, y]);

  const menuClasses = isDark
    ? "fixed z-50 bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-lg shadow-xl py-1 min-w-[200px] text-sm select-none"
    : "fixed z-50 bg-white text-gray-800 border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px] text-sm select-none";

  // Use portal to render at document.body level, avoiding any parent transform issues
  return createPortal(
    <div 
      ref={menuRef}
      className={menuClasses}
      style={position ? position : { top: y, left: x, visibility: 'hidden' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {options.map((option, index) => (
        <ContextMenuItem key={index} option={option} onClose={onClose} isDark={isDark} />
      ))}
    </div>,
    document.body
  );
};

const ContextMenuItem: React.FC<{ option: ContextMenuOption; onClose: () => void; isDark: boolean }> = ({ option, onClose, isDark }) => {
  const [showSubmenu, setShowSubmenu] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [submenuPosition, setSubmenuPosition] = useState<{ left?: string; right?: string; top: number }>({ top: 0 });

  // Calculate submenu position when shown
  useEffect(() => {
    if (!showSubmenu || !itemRef.current || !submenuRef.current) return;
    
    const itemRect = itemRef.current.getBoundingClientRect();
    const submenuRect = submenuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8;
    
    // Check if submenu would overflow right edge
    const wouldOverflowRight = itemRect.right + submenuRect.width > viewportWidth - padding;
    
    // Check if submenu would overflow bottom edge
    let topOffset = 0;
    if (itemRect.top + submenuRect.height > viewportHeight - padding) {
      topOffset = viewportHeight - padding - submenuRect.height - itemRect.top;
      topOffset = Math.min(0, topOffset); // Only adjust upward
    }
    
    if (wouldOverflowRight) {
      setSubmenuPosition({ right: '100%', top: topOffset });
    } else {
      setSubmenuPosition({ left: '100%', top: topOffset });
    }
  }, [showSubmenu]);

  if (option.separator) {
    return <div className={isDark ? "h-[1px] bg-neutral-700 my-1" : "h-[1px] bg-gray-200 my-1"} />;
  }

  const handleClick = () => {
    if (option.action) {
      option.action();
      onClose();
    }
  };

  const itemClasses = isDark
    ? "relative px-3 py-1.5 hover:bg-neutral-700 cursor-pointer flex items-center justify-between group"
    : "relative px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between group";

  const submenuClasses = isDark
    ? "absolute bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-1 min-w-[200px]"
    : "absolute bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px]";

  const shortcutClasses = isDark ? "text-neutral-500 text-xs" : "text-gray-400 text-xs";

  return (
    <div 
      ref={itemRef}
      className={itemClasses}
      onMouseEnter={() => setShowSubmenu(true)}
      onMouseLeave={() => setShowSubmenu(false)}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        {option.icon && <span className="w-4 h-4">{option.icon}</span>}
        <span>{option.label}</span>
      </div>
      <div className="flex items-center gap-4">
        {option.shortcut && <span className={shortcutClasses}>{option.shortcut}</span>}
        {option.submenu && <ChevronRight size={14} />}
      </div>

      {option.submenu && showSubmenu && (
        <div 
          ref={submenuRef}
          className={submenuClasses}
          style={{ 
            left: submenuPosition.left, 
            right: submenuPosition.right, 
            top: submenuPosition.top,
            marginLeft: submenuPosition.left ? '-1px' : undefined,
            marginRight: submenuPosition.right ? '-1px' : undefined,
          }}
        >
          {option.submenu.map((subOption, index) => (
            <ContextMenuItem key={index} option={subOption} onClose={onClose} isDark={isDark} />
          ))}
        </div>
      )}
    </div>
  );
};
