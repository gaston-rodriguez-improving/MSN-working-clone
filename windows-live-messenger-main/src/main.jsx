import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import PrivateRoute from './components/PrivateRoute';
import { EmoticonProvider } from './contexts/EmoticonContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ChatProvider } from './contexts/ChatContext';
import { DiscordAuthHandler } from './utils/discordAuth';

const Main = () => {
  return (
    <React.StrictMode>
      <ToastProvider>
        <AuthProvider>
          <ChatProvider>
            <EmoticonProvider>
              <Router>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/" element={<PrivateRoute element={HomePage} />} />
                  <Route path="/chat/:id" element={<PrivateRoute element={ChatPage} />} />
                  <Route path="/discordAuth" element={<DiscordAuthHandler />} />
                </Routes>
              </Router>
            </EmoticonProvider>
          </ChatProvider>
        </AuthProvider>
      </ToastProvider>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<Main />);
