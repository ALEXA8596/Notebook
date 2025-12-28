import React from 'react';
import Editor from '@monaco-editor/react';

interface MonacoEmbedProps {
  code: string;
  language?: string;
  onChange: (newCode: string) => void;
}

export const MonacoEmbed: React.FC<MonacoEmbedProps> = ({ code, language = 'javascript', onChange }) => {
  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '');
  };

  return (
    <div className="w-full h-full border rounded overflow-hidden">
      <Editor
        height="100%"
        defaultLanguage={language}
        value={code}
        onChange={handleEditorChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
        }}
      />
    </div>
  );
};
