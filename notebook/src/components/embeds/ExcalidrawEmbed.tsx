import React, { useState, Suspense, useRef } from 'react';
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { Taskbone } from '../../lib/taskbone';
import { ScanText, Loader2 } from 'lucide-react';

interface ExcalidrawEmbedProps {
  dataString: string;
  onChange: (newData: string) => void;
}

export const ExcalidrawEmbed: React.FC<ExcalidrawEmbedProps> = ({ dataString, onChange }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);

  const [initialData] = useState<any>(() => {
    if (dataString && dataString.trim() !== '') {
      try {
        const parsed = JSON.parse(dataString);
        return { elements: parsed.elements, appState: parsed.appState };
      } catch (e) {
        console.error("Failed to parse Excalidraw data", e);
        return null;
      }
    }
    return null;
  });

  const timeoutRef = useRef<any>(null);

  const handleChange = (elements: any, appState: any) => {
    // Debounce the update to prevent freezing
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      // We only want to save relevant data
      const data = {
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
          // Add other needed appState props
        }
      };
      onChange(JSON.stringify(data));
    }, 500);
  };

  const handleOCR = async () => {
    if (!excalidrawAPI) return;
    setIsScanning(true);

    try {
      const elements = excalidrawAPI.getSceneElements();
      // Filter for freedraw and image elements as per reference implementation recommendation
      // to avoid sending unnecessary data, but sending all is safer for context.
      // Let's send all visible elements.
      
      const blob = await exportToBlob({
        elements,
        appState: {
          ...excalidrawAPI.getAppState(),
          exportWithDarkMode: false, // OCR usually works better on light mode
        },
        files: excalidrawAPI.getFiles(),
        mimeType: "image/png",
        quality: 1,
      });

      if (blob) {
        const text = await Taskbone.getTextForImage(blob);
        if (text) {
          await navigator.clipboard.writeText(text);
          alert(`Scanned Text (copied to clipboard):\n\n${text}`);
        } else {
          alert("No text found or error occurred.");
        }
      }
    } catch (e) {
      console.error("OCR Failed", e);
      alert("OCR Failed. Check console for details.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="w-full h-full border rounded overflow-hidden relative isolate">
      <button
        className="absolute top-2 left-2 z-10 p-2 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
        onClick={handleOCR}
        disabled={isScanning}
        title="Scan Text (OCR)"
      >
        {isScanning ? <Loader2 className="animate-spin" size={16} /> : <ScanText size={16} />}
      </button>
      <Suspense fallback={<div className="flex items-center justify-center h-full">Loading Excalidraw...</div>}>
        <Excalidraw
          initialData={initialData}
          onChange={handleChange}
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
        />
      </Suspense>
    </div>
  );
};
