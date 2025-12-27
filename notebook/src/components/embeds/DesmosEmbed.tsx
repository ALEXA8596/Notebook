import React, { useEffect, useRef, useState } from 'react';

interface DesmosEmbedProps {
  stateString: string;
  onChange: (newState: string) => void;
}

declare global {
  interface Window {
    Desmos: any;
  }
}

export const DesmosEmbed: React.FC<DesmosEmbedProps> = ({ stateString, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!window.Desmos) {
      const script = document.createElement('script');
      const apiKey = import.meta.env.VITE_DESMOS_API_KEY || 'dcb31709b452b1cf9dc26972add0fda6';
      script.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${apiKey}`;
      script.async = true;
      script.onload = () => setLoaded(true);
      document.body.appendChild(script);
    } else {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded && containerRef.current && !calculatorRef.current) {
      const elt = containerRef.current;
      const calculator = window.Desmos.GraphingCalculator(elt);
      calculatorRef.current = calculator;

      if (stateString && stateString.trim() !== '') {
        try {
          const state = JSON.parse(stateString);
          calculator.setState(state);
        } catch (e) {
          console.error("Failed to parse Desmos state", e);
        }
      }

      // Observe changes - REMOVED to prevent re-renders on every keystroke
      // We now update on blur or save
      /*
      calculator.observeEvent('change', () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          const state = calculator.getState();
          onChange(JSON.stringify(state));
        }, 1000);
      });
      */
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (calculatorRef.current) {
        calculatorRef.current.destroy();
        calculatorRef.current = null;
      }
    };
  }, [loaded]);

  const handleBlur = (e: React.FocusEvent) => {
    // Check if the new focus is still within the component
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    if (calculatorRef.current) {
      const state = calculatorRef.current.getState();
      onChange(JSON.stringify(state));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      e.stopPropagation();
      if (calculatorRef.current) {
        const state = calculatorRef.current.getState();
        onChange(JSON.stringify(state));
        // Trigger save after a short delay to allow state to propagate
        setTimeout(() => {
          window.dispatchEvent(new Event('app-save'));
        }, 100);
      }
    }
  };

  return (
    <div 
      className="w-full h-full border rounded overflow-hidden" 
      ref={containerRef}
      onBlur={handleBlur}
      onKeyDownCapture={handleKeyDown}
    ></div>
  );
};
