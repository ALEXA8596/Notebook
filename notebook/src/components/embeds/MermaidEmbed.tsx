import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidEmbedProps {
  definition: string;
  onChange?: (newDefinition: string) => void;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

export const MermaidEmbed: React.FC<MermaidEmbedProps> = ({ definition }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!definition) return;
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, definition);
        setSvg(svg);
        setError(null);
      } catch (e) {
        console.error("Mermaid render error", e);
        setError("Failed to render diagram. Check syntax.");
      }
    };

    renderDiagram();
  }, [definition]);

  return (
    <div className="w-full h-full overflow-auto bg-white p-4 flex items-center justify-center">
      {error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div 
          ref={containerRef}
          dangerouslySetInnerHTML={{ __html: svg }} 
          className="w-full h-full flex items-center justify-center"
        />
      )}
    </div>
  );
};
