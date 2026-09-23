import React, { useState } from 'react';
import Login from "./Login";
import Register from "./Register";
import ResetPassword from "./ResetPassword";

export default function Auth() {
    const [view, setView] = useState('login');

    return (
        <section>
            {view === 'login' && (
                <Login
                    showRegisterComponent={() => setView('register')}
                    showResetComponent={() => setView('reset')}
                />
            )}

            {view === 'register' && (
                <Register showLoginComponent={() => setView('login')} />
            )}

            {view === 'reset' && (
                <ResetPassword setShowLogin={() => setView('login')} />
            )}
        </section>
    );
}
