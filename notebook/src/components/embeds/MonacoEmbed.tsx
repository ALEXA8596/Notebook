import React, { useRef, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface MonacoEmbedProps {
  code: string;
  language?: string;
  onChange: (newCode: string) => void;
  readOnly?: boolean;
}

export const MonacoEmbed: React.FC<MonacoEmbedProps> = ({ code, language = 'javascript', onChange, readOnly = false }) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleEditorChange = useCallback((value: string | undefined) => {
    onChange(value || '');
  }, [onChange]);

  // Use controlled mode (value) for readOnly, uncontrolled (defaultValue) for editable
  // This prevents re-renders during editing while still allowing updates for preview
  return (
    <div className="w-full h-full overflow-hidden" data-embed="monaco">
      <Editor
        height="100%"
        defaultLanguage={language}
        {...(readOnly ? { value: code } : { defaultValue: code })}
        onMount={handleEditorMount}
        onChange={handleEditorChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          readOnly: readOnly,
        }}
      />
    </div>
  );
};
