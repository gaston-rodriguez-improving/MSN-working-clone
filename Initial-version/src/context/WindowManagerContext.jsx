import React, { createContext, useState, useContext } from 'react';

const WindowManagerContext = createContext();

export const WindowManagerProvider = ({ children }) => {
    const [topWindowId, setTopWindowId] = useState(null);

    return (
        <WindowManagerContext.Provider value={{ topWindowId, setTopWindowId }}>
            {children}
        </WindowManagerContext.Provider>
    );
};

export const useWindowManager = () => useContext(WindowManagerContext);