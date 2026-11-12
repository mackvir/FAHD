/**
 * ============================================================================
 * منصة الإحصاء الزجري — محكمة الاستئناف بآسفي
 * Développeur exclusif : Abdelmoghit CHLIH (AbdelmoghitCHLIH@gmail.com)
 * Tous droits réservés © Abdelmoghit CHLIH - Code sous licence propriétaire stricte
 * ============================================================================
 */

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
