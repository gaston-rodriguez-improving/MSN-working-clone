import React, { createContext, useContext, useEffect, useState } from 'react';
import { Bounce, ToastContainer, toast } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";

import statusFrames from '../imports/statusFrames';
import sounds from '../imports/sounds';
import usertiles from '../imports/usertiles';

export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const showCustomToast = (
        title = "Notification",
        text,
        nudge = false,
        avatar = 'default',
        id = false,
        wink = false,
        isMessage = false,
        onWink = () => { },
        onOpenChat = () => { },
        translation,
    ) => {
        toast(
            <CustomToast
                text={text}
                title={title}
                nudge={nudge}
                avatar={avatar}
                id={id}
                wink={wink}
                isMessage={isMessage}
                onWink={onWink}
                onOpenChat={onOpenChat}
                translation={translation}
            />, {
            closeButton: false,
            autoClose: 5000,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            transition: Bounce,
            className: 'p-0 w-full bg-transparent border-none shadow-none',
            ariaLabel: 'Email received',
        });
    };

    const showToast = (message, type = null) => {
        const options = {
            position: "bottom-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            transition: Bounce,
            className: "light"
        };

        if (!type) {
            toast(message, options);
        } else {
            toast[type](message, options);
        }
    };


    return (
        <ToastContext.Provider value={{ showToast, showCustomToast }}>
            {children}
            <ToastContainer
                position="bottom-right"
                hideProgressBar
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
                className={"mb-2"}
            />
        </ToastContext.Provider>
    );
};


function CustomToast({
    title,
    text,
    nudge = false,
    avatar = false,
    id = false,
    wink = false,
    isMessage = false,
    color = 'bg-white',
    textColor = 'text-gray-800',
    onWink = () => { },
    onOpenChat = () => { },
    translation = null,
}) {
    const [nudgeClass, setNudgeClass] = useState('');

    useEffect(() => {
        if (nudge) {
            const sound = setTimeout(() => {
                const audio = new Audio(sounds.nudge);
                audio.play();
            }, 200);

            const shaking = setTimeout(() => {
                setNudgeClass('nudge');
            }, 500);
            return () => {
                clearTimeout(sound);
                clearTimeout(shaking);
            };
        }
    }, []);

    return (
        <div className={`w-full rounded-md p-2 ${nudgeClass} ${color} ${textColor}`}>
            <div className="flex w-full justify-between">
                <div className="flex items-center gap-1">
                    <img src="./assets/general/wlm-icon.png" alt="WLM Icon" />
                    {title}
                </div>
            </div>
            <div className="flex w-full items-center gap-1">
                {avatar && (
                    <div className="h-[60px] w-[60px] relative mt-5">
                        <img className="absolute m-[1px] rounded-sm w-[42px]" src={avatar !== "default" ? usertiles[avatar] : "./assets/usertiles/default.png"} alt="Avatar" />
                        <img className="absolute w-full h-full bottom-2 right-2" src={statusFrames.OfflineSmall} alt="Status Frame" />
                    </div>
                )}
                <div className="flex flex-col">
                    <p className="text-xs">{text}</p>
                    {wink && (
                        <p onClick={onWink} className="underline text-xs">{translation}</p>
                    )}
                    {nudge && (
                        <p onClick={onOpenChat} className="underline text-xs">{translation}</p>
                    )}
                    {isMessage && (
                        <p onClick={onOpenChat} className="underline text-xs">{translation}</p>
                    )}

                </div>
            </div>
        </div>
    );
}