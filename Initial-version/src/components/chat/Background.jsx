import React from 'react';

export default function Background({ children }) {
    const colorScheme = localStorage.getItem('colorScheme');

    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const colorSchemeRgba = colorScheme ? hexToRgba(colorScheme, 0.25) : 'rgba(255, 255, 255, 0.5)';

    return (
        <div
            className="relative top-0 h-full bg-no-repeat bg-bottom bg-[length:100%_400px] bg-gradient-to-t via-white"
            style={{
                backgroundImage: `linear-gradient(to top, ${colorSchemeRgba}, white), url("./assets/background/background.jpg")`,
                backgroundSize: '100% 400px',
            }}
        >
            <div className="h-full top-0 bg-no-repeat bg-[length:100%_100px]">
                {children}
            </div>
        </div>
    );
};
