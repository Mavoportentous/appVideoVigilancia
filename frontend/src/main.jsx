import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { isRelayForced } from './utils/webrtc.js';
import './index.css';

// Se lee al arrancar, mientras la dirección todavía trae ?relay=1: al navegar entre
// páginas el parámetro se pierde, pero el modo queda recordado durante la sesión.
isRelayForced();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
