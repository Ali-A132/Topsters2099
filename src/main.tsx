import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';
import { Analytics } from "@vercel/analytics/react"; 

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
        <Analytics />
    </StrictMode>,
);