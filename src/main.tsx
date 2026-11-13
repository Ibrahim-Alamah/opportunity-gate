import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { registerServiceWorker } from './utils/registerServiceWorker.ts';
import App from './App.tsx';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>
);

registerServiceWorker();
