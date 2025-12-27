import React from 'react';

interface WebsiteEmbedProps {
  url: string;
}

export const WebsiteEmbed: React.FC<WebsiteEmbedProps> = ({ url }) => {
  return (
    <div className="w-full h-full border rounded overflow-hidden">
      <iframe src={url} className="w-full h-full" title="Website Embed" />
    </div>
  );
};
