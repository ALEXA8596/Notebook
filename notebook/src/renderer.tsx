import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CopilotPanel } from './components/CopilotPanel';
import './index.css';

// Check if this is the copilot window
const isCopilotWindow = window.location.hash === '#copilot';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isCopilotWindow ? (
      <div className="h-screen bg-white dark:bg-gray-900">
        <CopilotPanel />
      </div>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
