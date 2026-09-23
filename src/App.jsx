import React, { useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import ErrorBoundary from './ErrorBoundary';
import Desktop from './pages/Desktop';

import { AuthContext } from './context/AuthContext';
import { ChatContext } from './context/ChatContext';

function App() {
  const { connectOnSocket } = useContext(ChatContext);
  const { checkSession, logout } = useContext(AuthContext);

  useEffect(() => {

    const verifySession = async () => {
      const sessionValid = await checkSession();
      console.log("Valid session?", sessionValid);
      if (sessionValid) {
        connectOnSocket();
      }
    };

    verifySession();
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>

          <Route
            path="/"
            element={<Desktop />}
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
