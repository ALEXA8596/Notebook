import React from 'react';

interface WebsiteEmbedProps {
  url: string;
}

export const WebsiteEmbed: React.FC<WebsiteEmbedProps> = ({ url }) => {
  return (
    <div className="w-full h-full border rounded overflow-hidden">
      <iframe 
        src={url} 
        className="w-full h-full" 
        title="Website Embed"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
};
