import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust position to keep in viewport
  const style = {
    top: y,
    left: x,
  };

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 bg-[#2b2b2b] text-white border border-[#454545] rounded shadow-lg py-1 min-w-[200px] text-sm select-none"
      style={style}
      onContextMenu={(e) => e.preventDefault()}
    >
      {options.map((option, index) => (
        <ContextMenuItem key={index} option={option} onClose={onClose} />
      ))}
    </div>
  );
};

const ContextMenuItem: React.FC<{ option: ContextMenuOption; onClose: () => void }> = ({ option, onClose }) => {
  const [showSubmenu, setShowSubmenu] = useState(false);

  if (option.separator) {
    return <div className="h-[1px] bg-[#454545] my-1" />;
  }

  const handleClick = () => {
    if (option.action) {
      option.action();
      onClose();
    }
  };

  return (
    <div 
      className="relative px-3 py-1.5 hover:bg-[#094771] cursor-pointer flex items-center justify-between group"
      onMouseEnter={() => setShowSubmenu(true)}
      onMouseLeave={() => setShowSubmenu(false)}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        {option.icon && <span className="w-4 h-4">{option.icon}</span>}
        <span>{option.label}</span>
      </div>
      <div className="flex items-center gap-4">
        {option.shortcut && <span className="text-gray-400 text-xs">{option.shortcut}</span>}
        {option.submenu && <ChevronRight size={14} />}
      </div>

      {option.submenu && showSubmenu && (
        <div className="absolute left-full top-0 ml-[-1px] bg-[#2b2b2b] border border-[#454545] rounded shadow-lg py-1 min-w-[200px]">
          {option.submenu.map((subOption, index) => (
            <ContextMenuItem key={index} option={subOption} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
};
