
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const mountNode = document.getElementById('root');
if (mountNode) {
  const root = createRoot(mountNode);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Critical: Could not find mount point #root");
}
