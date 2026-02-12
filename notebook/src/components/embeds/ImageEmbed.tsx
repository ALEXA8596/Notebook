import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Download } from 'lucide-react';

interface ImageEmbedProps {
  dataString: string; // Base64 string or file path
  filePath: string;   // Original file path for determining mime type
}

const getMimeType = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
  };
  return mimeTypes[ext || ''] || 'image/png';
};

export const ImageEmbed: React.FC<ImageEmbedProps> = ({ dataString, filePath }) => {
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const mimeType = getMimeType(filePath);
  const imageSrc = `data:${mimeType};base64,${dataString}`;

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 5.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  
  const handleReset = () => {
    setScale(1.0);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = filePath.split(/[\\/]/).pop() || 'image';
    link.click();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(0.25, Math.min(5.0, prev + delta)));
  };

  // Reset position when scale changes to avoid image going off-screen
  useEffect(() => {
    if (scale === 1.0) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  if (imageError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-500">
        <svg className="w-16 h-16 mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">Failed to load image</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10">
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-sm w-14 text-center font-mono">{Math.round(scale * 100)}%</span>
          <button
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-2" />
          <button
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={handleRotate}
            title="Rotate 90°"
          >
            <RotateCw size={18} />
          </button>
          <button
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={handleReset}
            title="Reset View"
          >
            <Maximize2 size={18} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={handleDownload}
            title="Download"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="flex-grow overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ 
          background: 'repeating-conic-gradient(#e5e5e5 0% 25%, #f5f5f5 0% 50%) 50% / 20px 20px',
        }}
      >
        {!imageLoaded && !imageError && (
          <div className="absolute flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Loading image...</span>
          </div>
        )}
        <img
          src={imageSrc}
          alt={filePath.split(/[\\/]/).pop() || 'Image'}
          className="max-w-none select-none transition-transform duration-75"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            opacity: imageLoaded ? 1 : 0,
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          draggable={false}
        />
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
        <span>{filePath.split(/[\\/]/).pop()}</span>
        <span>Scroll to zoom • Drag to pan • Click reset to fit</span>
      </div>
    </div>
  );
};
