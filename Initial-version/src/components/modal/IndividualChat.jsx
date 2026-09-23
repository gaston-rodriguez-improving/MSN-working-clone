import React, { useState, useContext, useEffect, useRef } from 'react';
import '7.css/dist/7.scoped.css';
import { useTranslation } from 'react-i18next';

import Footer from '../Footer';

import EmoticonSelector from '../selectors/EmoticonSelector';
import WinkSelector from '../selectors/WinkSelector';

import EmoticonContext from '../../context/EmoticonContext';
import { ChatContext } from '../../context/ChatContext';
import { useWindowManager } from '../../context/WindowManagerContext';
import { AuthContext } from '../../context/AuthContext';

import usertiles from '../../imports/usertiles';
import statusLarge from '../../imports/statusLarge';
import sounds from '../../imports/sounds';
import scenes from '../../imports/scenes';

import { replaceEmoticons } from '../../helpers/replaceEmoticons';
import { getOpenAIResponse } from '../../data/openai';

//const apiKey = import.meta.env.VITE_OPEN_AI_API_KEY;
const apiProxy = import.meta.env.VITE_PROXY_URL;

export default function IndividualChat({ windowId = 'chat', close }) {
    const { topWindowId, setTopWindowId } = useWindowManager();

    const { t } = useTranslation("chat")

    const bringToFront = () => {
        setTopWindowId(windowId);
    };

    const isTop = topWindowId === windowId;
    const zIndex = isTop ? 100 : 10;

    useEffect(() => {
        bringToFront();
        const win = windowRef.current;
        if (!win) return;

        win.addEventListener('mousedown', bringToFront);
        return () => win.removeEventListener('mousedown', bringToFront);
    }, []);

    const containerRef = useRef(null);
    const windowRef = useRef(null);
    const isDragging = useRef(false);
    const coords = useRef({ startX: 0, startY: 0, lastX: 0, lastY: 0 });

    useEffect(() => {
        const container = containerRef.current;
        const win = windowRef.current;
        if (!container || !win) return;

        const onMouseDown = (e) => {
            if (!e.target.closest('.title-bar')) return;
            isDragging.current = true;
            coords.current.startX = e.clientX;
            coords.current.startY = e.clientY;
            coords.current.lastX = win.offsetLeft;
            coords.current.lastY = win.offsetTop;
        };

        const onMouseUp = () => {
            isDragging.current = false;
        };

        const onMouseMove = (e) => {
            if (!isDragging.current) return;
            const deltaX = e.clientX - coords.current.startX;
            const deltaY = e.clientY - coords.current.startY;
            win.style.left = `${coords.current.lastX + deltaX}px`;
            win.style.top = `${coords.current.lastY + deltaY}px`;
        };

        const onTouchStart = (e) => {
            if (!e.target.closest('.title-bar')) return;
            isDragging.current = true;
            const touch = e.touches[0];
            coords.current.startX = touch.clientX;
            coords.current.startY = touch.clientY;
            coords.current.lastX = win.offsetLeft;
            coords.current.lastY = win.offsetTop;
        };

        const onTouchMove = (e) => {
            if (!isDragging.current) return;
            const touch = e.touches[0];
            const deltaX = touch.clientX - coords.current.startX;
            const deltaY = touch.clientY - coords.current.startY;
            win.style.left = `${coords.current.lastX + deltaX}px`;
            win.style.top = `${coords.current.lastY + deltaY}px`;
        };

        const onTouchEnd = () => {
            isDragging.current = false;
        };

        win.addEventListener('mousedown', onMouseDown);
        container.addEventListener('mousemove', onMouseMove);
        container.addEventListener('mouseup', onMouseUp);
        container.addEventListener('mouseleave', onMouseUp);

        win.addEventListener('touchstart', onTouchStart);
        container.addEventListener('touchmove', onTouchMove);
        container.addEventListener('touchend', onTouchEnd);
        container.addEventListener('touchcancel', onTouchEnd);

        return () => {
            win.removeEventListener('mousedown', onMouseDown);
            container.removeEventListener('mousemove', onMouseMove);
            container.removeEventListener('mouseup', onMouseUp);
            container.removeEventListener('mouseleave', onMouseUp);

            win.removeEventListener('touchstart', onTouchStart);
            container.removeEventListener('touchmove', onTouchMove);
            container.removeEventListener('touchend', onTouchEnd);
            container.removeEventListener('touchcancel', onTouchEnd);
        };
    }, []);

    const {
        contacts,
        messages,
        selectedContact,
        closeIndividualChat,
        addMessageWithAI,
        addMessage,
        shaking,
        setShaking } = useContext(ChatContext);

    const { user } = useContext(AuthContext);

    const [input, setInput] = useState('');
    const [lastMessageTime, setLastMessageTime] = useState(null);
    const [contactTyping, setContactTyping] = useState(false);
    const { selectedEmoticon, setSelectedEmoticon } = useContext(EmoticonContext);

    useEffect(() => {
        if (selectedEmoticon) {
            setInput((prevInput) => prevInput + selectedEmoticon);
            setSelectedEmoticon(null);
        }
    }, [selectedEmoticon, setSelectedEmoticon]);

    const scrollToBottom = () => {
        const messageContainer = document.getElementById('message-container');
        if (messageContainer) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        if (selectedContact.ai) {
            messageWithAI()
        } else {
            messageWithUser()
        }
    };

    function messageWithAI() {
        const newUserMessage = {
            id: Date.now(),
            role: 'user',
            chatId: selectedContact.chatId,
            senderId: user.id,
            content: input,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        addMessageWithAI(selectedContact.chatId, newUserMessage);

        const newHist = [...messages[selectedContact?.chatId] || [], newUserMessage];
        setInput('');
        setContactTyping(true);
        scrollToBottom();

        // Pegando apenas as últimas 6 mensagens para o contexto
        // Ignorando nudges e winks
        const lastMessages = newHist
            .filter(msg => !msg.drawAttention && !msg.winks)
            .slice(-6)
            .map(msg => ({
                role: msg.role,
                content: msg.content
            }));

        // Chamando a IA apenas com as mensagens filtradas
        // função antiga -> getOpenAIResponse(lastMessages, apiKey)
        
        getOpenAIResponse(lastMessages, apiProxy).then(reply => {
            setContactTyping(false);

            const newAIMessage = {
                id: Date.now(),
                role: 'assistant',
                chatId: selectedContact.chatId,
                senderId: selectedContact.id,
                content: reply,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            addMessageWithAI(selectedContact.chatId, newAIMessage);
            scrollToBottom();
        }).catch(err => {
            console.error('Error from AI:', err);
            setContactTyping(false);
        });
    }


    function messageWithUser() {
        const newMessage = {
            id: Date.now(),
            chatId: selectedContact.chatId,
            senderId: user.id,
            content: input,
            drawAttention: false,
            winks: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        addMessage(selectedContact.chatId, newMessage);
        setInput('');

        scrollToBottom();
    }

    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView();
        }
    }, [messages[selectedContact?.chatId]]);

    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === 'assistant') {
                const currentDate = new Date();
                const options = { year: '2-digit', month: '2-digit', day: '2-digit' };
                const formattedDate = currentDate.toLocaleDateString([], options);
                const formattedTime = currentDate.toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit',
                });
                setLastMessageTime(`${formattedTime} on ${formattedDate}`);
            }
        }
    }, [messages]);

    const simulateContactTyping = () => {
        setContactTyping(true);
        setTimeout(() => setContactTyping(false), 1500);
    };

    const handleNudgeClick = () => {
        const newMessage = {
            id: Date.now(),
            chatId: selectedContact.chatId,
            senderId: user.id,
            content: "Nudge",
            drawAttention: true,
            winks: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (selectedContact.ai) {
            addMessageWithAI(selectedContact.chatId, newMessage)
        } else {
            addMessage(selectedContact.chatId, newMessage);
        }

        setShaking(true);
        const audio = new Audio(sounds.nudge);
        audio.play();
        setTimeout(() => {
            setShaking(false);
        }, 500);
    };

    return (
        <div

            ref={containerRef}
            className="p-1 md:p-5"
            style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%',
                maxWidth: '850px',
                zIndex: zIndex,
                cursor: 'default',
            }}
        >

            <div
                id="chat-scope"
                ref={windowRef}
                className="win7 p-1 md:p-5"
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '100%',
                    maxWidth: '800px',
                    cursor: 'default',
                }}
            >


                <div data-scope="chat" className={`window active ${shaking ? 'nudge' : ''}`} >
                    <div className="title-bar">
                        <div className="title-bar-text flex items-center gap-2">
                            <img src="./wlm-logo.png" alt="MSN Icon" className="w-5 h-5" />
                            Modern Live Messenger
                        </div>
                        <div className="title-bar-controls">
                            <button aria-label="Close" onClick={() => closeIndividualChat()} />
                        </div>
                    </div>
                    <div className="window-body">
                        <div
                            className={`bg-no-repeat bg-[length:100%_100px]  ${shaking ? 'nudge' : ''}`}
                            style={{ backgroundImage: 'url(/assets/background/background.jpg)' }}
                        >
                            <div className="flex flex-col w-full font-sans text-base h-full">
                                <div className="flex items-center w-full h-[31.4px] bg-white p-2 gap-2">
                                    <img src="/assets/chat/contact_chat_icon.png" alt="" />
                                    <p className="flex gap-1 items-center" dangerouslySetInnerHTML={{ __html: replaceEmoticons(selectedContact.username) }} />
                                    <p>&lt;{selectedContact.email}&gt;</p>
                                </div>
                                <div
                                    className="flex items-center justify-between h-[31.4px] bg-no-repeat shadow-lg"
                                    style={{ backgroundImage: 'url(/assets/background/chat_navbar_background.png)' }}
                                >
                                    <div className="flex gap-1 items-center aerobutton p-2 h-6">
                                        <div className="w-5">
                                            <img src="/assets/contacts/1489.png" alt="" />
                                        </div>
                                        <div>
                                            <img src="/assets/general/arrow_white.png" alt="" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col overflow-hidden relative">

                                    {/* Contact Background */}
                                    <div
                                        className={`bg-no-repeat absolute top-0 left-0 w-full z-0`}
                                        style={{
                                            height: '80px',
                                            backgroundImage: `url(${selectedContact.banner == "default" ? "/assets/scenes/default_background.jpg" : scenes[selectedContact.banner]})`,
                                            backgroundSize: scenes[selectedContact.banner] !== './assets/scenes/default_background.jpg' ? 'cover' : '',
                                            backgroundPosition: scenes[selectedContact.banner] !== './assets/scenes/default_background.jpg' ? 'center' : '',
                                        }}
                                    />

                                    {/* Contact Info Header (Small screens) */}
                                    <div className="sm:hidden p-3 flex items-center gap-1 flex-shrink-0">

                                        {/* Avatar */}
                                        <div className="relative h-14 w-14">
                                            <img
                                                className="absolute top-[5px] left-[6px] w-[43px] h-[44px] rounded-sm"
                                                src={selectedContact.avatar !== "default" ? usertiles[selectedContact.avatar] : "./assets/usertiles/default.png"}
                                                alt="Avatar"
                                            />
                                            <img
                                                className="absolute top-0 left-0 w-14 h-14"
                                                src={statusLarge[selectedContact.status]}
                                                alt="Frame"
                                            />
                                        </div>

                                        {/* Username and bio */}
                                        <div className="text-black mb-1">
                                            <p className="font-bold opacity-90 flex items-center" dangerouslySetInnerHTML={{ __html: replaceEmoticons(selectedContact.username) }} />
                                            <p className="text-xs opacity-90 flex items-center" dangerouslySetInnerHTML={{ __html: replaceEmoticons(selectedContact.bio) }} />
                                        </div>
                                    </div>

                                    {/* Contact Info Header (Large screens) */}
                                    <div className="hidden sm:block flex items-center h-20 p-3 flex-shrink-0">
                                        <div className="ml-[140px] mt-1 text-black h-full">
                                            <p className="font-bold opacity-90 flex items-center" dangerouslySetInnerHTML={{ __html: replaceEmoticons(selectedContact.username) }} />
                                            <p className="text-xs opacity-90 flex items-center" dangerouslySetInnerHTML={{ __html: replaceEmoticons(selectedContact.bio) }} />
                                        </div>
                                    </div>


                                    <div className="flex flex-1 overflow-hidden bg-white">

                                        {/* Left Column - Large screens only */}
                                        <div className="hidden sm:flex sm:flex-col justify-between absolute top-[95px] bottom-[0px] w-40 pl-4 pr-2 pb-5">

                                            {/* Contact Photo - Top */}
                                            <div className="-mt-20 z-20 rounded">
                                                <div className="relative h-24 mb-2 w-full">
                                                    <img
                                                        className="absolute top-[12px] left-[12px] w-[88px] h-[89px] rounded-sm"
                                                        src={selectedContact.avatar !== "default" ? usertiles[selectedContact.avatar] : "./assets/usertiles/default.png"}
                                                        alt="Avatar"
                                                    />
                                                    <img className="absolute top-0 left-0 w-[115px] h-[115px]" src={statusLarge[selectedContact.status]} alt="Frame" />
                                                </div>
                                            </div>

                                            {/* User's Photo - Bottom */}
                                            <div className="bottom-0 flex justify-center">
                                                <div className="relative h-24 mb-2 w-full">
                                                    <img
                                                        className="absolute top-[12px] left-[12px] w-[88px] h-[89px] rounded-sm"
                                                        src={user.avatar !== "default" ? usertiles[user.avatar] : "./assets/usertiles/default.png"}
                                                        alt="Avatar"
                                                    />
                                                    <img className="absolute top-0 left-0 w-[115px] h-[115px]" src={statusLarge[user.status]} alt="Frame" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column */}
                                        <div className="flex-1 flex flex-col sm:ml-[130px] mt">

                                            {/* Messages */}
                                            <div className="flex-1 bg-white p-3 overflow-y-auto hide-scrollbar mt-2">
                                                <div className="text-xs text-gray-600 mb-2">
                                                    <span className="text-red-500">✕</span> {t("alert")}
                                                </div>

                                                {/* Map */}
                                                <div className="space-y-2 bottom-0 min-h-52 max-h-52 message-container">
                                                    {(messages[selectedContact?.chatId] || []).map((message, index, arr) => {
                                                        const prev = arr[index - 1];
                                                        const isUserMessage = message.senderId === user.id;
                                                        const isPrevSameSender = prev && prev.senderId === message.senderId;

                                                        return (
                                                            <div key={message.id} className={`message ${isUserMessage ? 'user' : 'contact'}`}>
                                                                {isUserMessage ? (
                                                                    <div>
                                                                        {!isPrevSameSender && (
                                                                            <div className="flex text-black text-opacity-70">
                                                                                <p className="flex items-center gap-1" dangerouslySetInnerHTML={{
                                                                                    __html: replaceEmoticons(
                                                                                        isUserMessage ? (user.username || user.email) : selectedContact.username
                                                                                    )
                                                                                }} />
                                                                                <p className="ml-1">{t("says")}</p>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex gap-2 items-center ml-1">
                                                                            <div className="flex-shrink-0">
                                                                                <img src="/assets/chat/message_dot.png" alt="Message Dot" />
                                                                            </div>
                                                                            {message.drawAttention === true ? (
                                                                                <div>
                                                                                    <p className="flex items-center gap-1 ">{t('nudge.me')}</p>
                                                                                </div>
                                                                            ) : message.winks === true ? (
                                                                                <div>
                                                                                    <p className="flex items-center gap-1">{t('winks.me')}</p>
                                                                                </div>
                                                                            ) :
                                                                                <div>
                                                                                    <p className="flex items-center gap-1" dangerouslySetInnerHTML={{ __html: replaceEmoticons(message.content) }} />
                                                                                </div>
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        {!isPrevSameSender && (
                                                                            <div className="flex text-black text-opacity-70">
                                                                                <p className="flex items-center gap-1" dangerouslySetInnerHTML={{
                                                                                    __html: replaceEmoticons(
                                                                                        isUserMessage ? (user.username || user.email) : selectedContact.username
                                                                                    )
                                                                                }} />
                                                                                <p className="ml-1">{t("says")}</p>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex gap-2 items-start ml-1">
                                                                            <div className="flex-shrink-0 mt-2.5">
                                                                                <img src="/assets/chat/message_dot.png" alt="Message Dot" />
                                                                            </div>
                                                                            {message.drawAttention === true ? (
                                                                                <div>
                                                                                    <p className="flex items-center gap-1">{t('nudge.contact')}</p>
                                                                                </div>
                                                                            ) : message.winks === true ? (
                                                                                <div>
                                                                                    <p className="flex items-center gap-1">{t('winks.contact')}</p>
                                                                                </div>
                                                                            ) :
                                                                                <div>
                                                                                    <p className="flex items-center gap-1" dangerouslySetInnerHTML={{ __html: replaceEmoticons(message.content) }} />
                                                                                </div>
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    <div ref={messagesEndRef} />
                                                </div>
                                            </div>

                                            {/* Input */}
                                            <div className="px-2 py-1 w-full flex-shrink-0">
                                                {contactTyping && (
                                                    <div className="flex gap-1 items-center">
                                                        <p className="flex items-center" dangerouslySetInnerHTML={{ __html: replaceEmoticons(selectedContact.username) }} />
                                                        <p>is typing...</p>
                                                    </div>
                                                )}
                                                {lastMessageTime && <p className="opacity-50 my-1">Last message received at {lastMessageTime}</p>}
                                                <img src="/assets/general/divider.png" alt="" className="pointer-events-none" />
                                                <form onSubmit={handleSubmit}>
                                                    <input
                                                        type="text"
                                                        value={input}
                                                        onChange={(e) => setInput(e.target.value)}
                                                        className="w-full border rounded-t-[4px] outline-none p-1 border-[#bdd5df]"
                                                    />
                                                </form>

                                                <div className="flex border-x border-b rounded-b-[4px] border-[#bdd5df]" style={{ backgroundImage: 'url(/assets/background/chat_icons_background.png)' }}>
                                                    <EmoticonSelector />
                                                    <WinkSelector chatId={selectedContact.chatId} />
                                                    <div className="flex items-center aerobutton p-1 h-6" onClick={handleNudgeClick}>
                                                        <img src="/assets/chat/send_nudge.png" alt="" />
                                                    </div>
                                                    <div className="px-2">
                                                        <img src="/assets/background/chat_icons_separator.png" alt="" />
                                                    </div>
                                                    <div className="flex items-center aerobutton p-1 h-6">
                                                        <img src="/assets/chat/change_font.png" alt="" />
                                                    </div>
                                                    <div className="flex items-center aerobutton p-1 h-6">
                                                        <img src="/assets/chat/select_background.png" alt="" />
                                                        <img src="/assets/general/arrow.png" alt="" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>


                            </div>
                        </div>
                        <Footer />
                    </div>
                </div>
            </div>
        </div >
    );
}
