import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TextBlockProps {
  content: string;
  onChange: (newContent: string) => void;
  onContextMenu?: (e: React.MouseEvent, cursorIndex?: number) => void;
}

export const TextBlock: React.FC<TextBlockProps> = ({ content, onChange, onContextMenu }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(content);
  }, [content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (value !== content) {
      onChange(value);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      let cursorIndex = undefined;
      if (isEditing && textareaRef.current) {
        cursorIndex = textareaRef.current.selectionStart;
      }
      onContextMenu(e, cursorIndex);
    }
  };

  return (
    <div 
      className="w-full min-h-[2rem] p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
      onContextMenu={handleContextMenu}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full bg-transparent outline-none resize-none font-mono"
          rows={1}
        />
      ) : (
        <div onClick={() => setIsEditing(true)} className="prose dark:prose-invert max-w-none cursor-text min-h-[1rem]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};
