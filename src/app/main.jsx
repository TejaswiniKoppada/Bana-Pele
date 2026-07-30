// Imported first so global base styles (reset/variables/typography/globals)
// always load before any feature/component's own co-located CSS — otherwise
// equal-specificity rules (e.g. a page overriding .card's default margin)
// would lose the cascade to whichever loaded later, purely by accident of
// JS import order rather than intent.
import '@/styles/main.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AppStateProvider } from './providers/AppStateProvider.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </BrowserRouter>
  </StrictMode>
);
