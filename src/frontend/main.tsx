'use client';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './lib/AuthContext';



const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element with id "root" not found');
}

createRoot(container).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);

