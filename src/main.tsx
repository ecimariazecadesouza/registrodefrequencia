import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './App.css'
import App from './App'

// Register service worker for PWA
registerSW({ immediate: true })

// Global error listener to help debug white screen issues
window.onerror = function (message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; margin: 20px;">
        <h1 style="margin-top: 0;">Erro de Inicialização</h1>
        <p><strong>Mensagem:</strong> ${message}</p>
        <p><strong>Fonte:</strong> ${source}:${lineno}:${colno}</p>
        <pre style="white-space: pre-wrap; margin-top: 10px; background: rgba(0,0,0,0.05); padding: 10px;">${error?.stack || 'Sem stack trace'}</pre>
        <button onclick="localStorage.clear(); location.reload();" style="padding: 10px 20px; background: #721c24; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Limpar Dados e Reiniciar
        </button>
      </div>
    `;
  }
  return false;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Failed to find the root element');
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
