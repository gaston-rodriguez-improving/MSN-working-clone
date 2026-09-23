import './index.css';

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { Analytics } from "@vercel/analytics/react"

import { EmoticonProvider } from './context/EmoticonContext.jsx';
import { WindowManagerProvider } from './context/WindowManagerContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ChatProvider } from './context/ChatContext.jsx';

import './i18next.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <Analytics />

    <ToastProvider>
      <WindowManagerProvider>
        <AuthProvider>
          <ChatProvider>
            <EmoticonProvider>
              <App />
            </EmoticonProvider>
          </ChatProvider>
        </AuthProvider>
      </WindowManagerProvider>
    </ToastProvider>
  </>
)