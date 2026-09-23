import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Background from '../components/Background';
import AvatarLarge from '../components/AvatarLarge';
import { ChatContext } from '../contexts/ChatContext';
import sounds from '../imports/sounds';
import EmoticonSelector from '../components/EmoticonSelector';
import WinkSelector from '../components/WinkSelector';
import EmoticonContext from '../contexts/EmoticonContext';
import navbarBackground from '/assets/background/chat_navbar_background.png';
import contactChatIcon from '/assets/chat/contact_chat_icon.png';
import showmenu from '/assets/contacts/1489.png';
import arrowWhite from '/assets/general/arrow_white.png';
import arrow from '/assets/general/arrow.png';
import divider from '/assets/general/divider.png';
import bg from '/assets/background/background.jpg';
import sendNudge from '/assets/chat/send_nudge.png';
import changeFont from '/assets/chat/change_font.png';
import changeBackground from '/assets/chat/select_background.png';
import messageDot from '/assets/chat/message_dot.png';
import chatIconsBackground from '/assets/background/chat_icons_background.png';
import chatPointBackground from '/assets/background/chat_background_point.png';
import chatIconsSeparator from '/assets/background/chat_icons_separator.png';
import { replaceEmoticons } from '../helpers/replaceEmoticons';

export const ChatWindow = ({ contactId, onClose, windowIndex = 0 }) => {
  const { id: routeId } = useParams();
  const id = contactId ?? routeId;
  const [shaking, setShaking] = useState(false);
  const [input, setInput] = useState('');
  const [lastMessageTime, setLastMessageTime] = useState(null);
  const user = JSON.parse(localStorage.getItem('messenger_user') || 'null');
  const { selectedEmoticon, setSelectedEmoticon } = useContext(EmoticonContext);
  const { contacts, messages: conversations, openConversation, setActiveChatId, send } = useContext(ChatContext);
  const [conversationId, setConversationId] = useState(null);
  const messageContainerRef = useRef(null);
  const windowRef = useRef(null);
  const interactionRef = useRef(null);
  const [windowBounds, setWindowBounds] = useState(null);
  const navigate = useNavigate();
  const closeWindow = onClose || (() => navigate('/'));
  const contact = contacts.find((item) => item.id === Number(id));
  const messages = conversationId ? conversations[conversationId] || [] : [];

  useEffect(() => {
    let cancelled = false;
    if (id) openConversation(id).then(result => { if (!cancelled && result) { setConversationId(result.chatId); setActiveChatId(result.chatId); } });
    return () => { cancelled = true; };
  }, [id, openConversation, setActiveChatId]);
  useEffect(() => { if (selectedEmoticon) { setInput(prev => prev + selectedEmoticon); setSelectedEmoticon(null); } }, [selectedEmoticon, setSelectedEmoticon]);
  useEffect(() => { if (messageContainerRef.current) messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight; }, [messages]);
  const scrollToBottom = () => { if (messageContainerRef.current) messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight; };
  const handleSubmit = async (e) => { e.preventDefault(); if (!input.trim() || !conversationId) return; const content = input.trim(); setInput(''); await send(conversationId, content); scrollToBottom(); };

  useEffect(() => {
    const getLastMessageTime = () => {
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.senderId && lastMessage.senderId !== user?.id) {
          const currentDate = new Date();
          const options = { year: '2-digit', month: '2-digit', day: '2-digit' };
          const formattedDate = currentDate.toLocaleDateString([], options);
          const formattedTime = currentDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          setLastMessageTime(`${formattedTime} on ${formattedDate}`);
        }
      }
    };
    getLastMessageTime();
  }, [messages]);

  const nudgeMessage = 'You have just sent a nudge.';

  const handleNudgeClick = async () => {
    if (!conversationId) return;
    const audio = new Audio(sounds.nudge);
    audio.play().catch(() => {});
    setShaking(true);
    await send(conversationId, nudgeMessage, { drawAttention: true });
    setTimeout(() => setShaking(false), 500);
  };

  const stopWindowInteraction = () => {
    interactionRef.current = null;
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', stopWindowInteraction);
  };

  const handleWindowPointerMove = (event) => {
    const interaction = interactionRef.current;
    if (!interaction) return;

    const deltaX = event.clientX - interaction.startX;
    const deltaY = event.clientY - interaction.startY;

    if (interaction.type === 'drag') {
      setWindowBounds((current) => ({
        ...current,
        left: Math.max(0, Math.min(window.innerWidth - current.width, interaction.left + deltaX)),
        top: Math.max(0, Math.min(window.innerHeight - current.height, interaction.top + deltaY)),
      }));
      return;
    }

    const { direction, left, top, width, height } = interaction;
    const minWidth = 420;
    const minHeight = 360;
    let nextLeft = left;
    let nextTop = top;
    let nextWidth = width;
    let nextHeight = height;

    if (direction.includes('e')) nextWidth = Math.max(minWidth, width + deltaX);
    if (direction.includes('s')) nextHeight = Math.max(minHeight, height + deltaY);
    if (direction.includes('w')) {
      nextWidth = Math.max(minWidth, width - deltaX);
      nextLeft = left + width - nextWidth;
    }
    if (direction.includes('n')) {
      nextHeight = Math.max(minHeight, height - deltaY);
      nextTop = top + height - nextHeight;
    }

    nextWidth = Math.min(nextWidth, window.innerWidth - nextLeft);
    nextHeight = Math.min(nextHeight, window.innerHeight - nextTop);
    setWindowBounds({ left: nextLeft, top: nextTop, width: nextWidth, height: nextHeight });
  };

  const startWindowInteraction = (event, type, direction = '') => {
    if (event.button !== 0 || !windowRef.current) return;
    event.preventDefault();
    const rect = windowRef.current.getBoundingClientRect();
    setWindowBounds({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    interactionRef.current = {
      type,
      direction,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', stopWindowInteraction);
  };

  const resizeDirections = [
    ['n', 'top-0 left-2 right-2 h-2 cursor-ns-resize'],
    ['s', 'bottom-0 left-2 right-2 h-2 cursor-ns-resize'],
    ['e', 'right-0 top-2 bottom-2 w-2 cursor-ew-resize'],
    ['w', 'left-0 top-2 bottom-2 w-2 cursor-ew-resize'],
    ['ne', 'right-0 top-0 h-3 w-3 cursor-nesw-resize'],
    ['nw', 'left-0 top-0 h-3 w-3 cursor-nwse-resize'],
    ['se', 'right-0 bottom-0 h-3 w-3 cursor-nwse-resize'],
    ['sw', 'left-0 bottom-0 h-3 w-3 cursor-nesw-resize'],
  ];

  if (!contact) return null;
  return (
    <div
      ref={windowRef}
      className={`msn-font chat-window pointer-events-auto fixed w-[min(720px,calc(100vw-24px))] h-[min(680px,calc(100vh-24px))] overflow-hidden rounded-lg border border-[#55758c] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] bg-no-repeat bg-[length:100%_100px] ${shaking ? 'nudge' : ''}`}
      style={{
        backgroundImage: `url(${bg})`,
        ...(windowBounds
          ? {
              left: windowBounds.left,
              top: windowBounds.top,
              width: windowBounds.width,
              height: windowBounds.height,
            }
          : {
              top: `${12 + windowIndex * 28}px`,
              right: `${12 + windowIndex * 28}px`,
            }),
        zIndex: 60 + windowIndex,
      }}
    >
      {resizeDirections.map(([direction, className]) => (
        <div
          key={direction}
          className={`absolute z-20 ${className}`}
          onPointerDown={(event) => startWindowInteraction(event, 'resize', direction)}
        />
      ))}
      <div className="flex flex-col w-full font-sans text-base h-full">
        <div
          className="flex items-center w-full h-[31.4px] shrink-0 bg-white p-2 gap-2 cursor-move"
          onPointerDown={(event) => startWindowInteraction(event, 'drag')}
        >
          <img src={contactChatIcon} alt="" />
          <p className="flex gap-1" dangerouslySetInnerHTML={{ __html: replaceEmoticons(contact.name) }}></p>
          <p>&lt;{contact.email}&gt;</p>
          <button
            type="button"
            className="ml-auto flex h-5 w-7 items-center justify-center rounded-sm border border-transparent text-sm leading-none text-[#17364a] hover:border-[#b3261e] hover:bg-[#e81123] hover:text-white active:bg-[#b40000]"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={closeWindow}
            aria-label={`Close chat with ${contact.name}`}
          >
            ×
          </button>
        </div>
        <div
          className="hidden flex items-center justify-between h-[31.4px] bg-no-repeat shadow-lg"
          style={{ backgroundImage: `url(${navbarBackground})` }}
        >
          <div className="flex items-center text-white gap-3">
            <div className="aerobutton cursor-pointer p-1 opacity-50">Photos</div>
            <div className="aerobutton cursor-pointer p-1">Files</div>
            <div className="aerobutton cursor-pointer p-1 opacity-50">Video</div>
            <div className="aerobutton cursor-pointer p-1 opacity-50">Call</div>
            <div className="aerobutton cursor-pointer p-1 opacity-50">Games</div>
            <div className="aerobutton cursor-pointer p-1 opacity-50">Activities</div>
            <div className="aerobutton cursor-pointer p-1">Invite</div>
            <div className="aerobutton cursor-pointer p-1">Block</div>
          </div>
          <div className="flex gap-1 items-center aerobutton p-2 h-6">
            <div className="w-5">
              <img src={showmenu} alt="" />
            </div>
            <div>
              <img src={arrowWhite} alt="" />
            </div>
          </div>
        </div>

        <Background className="h-full min-h-0">
          <div className="px-4 pt-4 grid grid-cols-[134px__1fr] h-full min-h-0">
            <div className="h-full flex flex-col items-center justify-between">
              <AvatarLarge image={contact.image} status={contact.status} />
              <div>
                <AvatarLarge image={localStorage.getItem('picture')} />
                <div className="h-10" />
              </div>
            </div>
            <div className="win7 flex h-full min-h-0 flex-col">
              <div className="flex items-center white-light mb-10">
                <p
                  className="flex gap-1 text-lg"
                  dangerouslySetInnerHTML={{
                    __html: replaceEmoticons(contact.name),
                  }}
                ></p>
                <p className="ml-1 capitalize">({contact.status})</p>
              </div>
              <img src={divider} alt="" className="mb-[-5px] pointer-events-none" />

              <div className="flex min-h-0 flex-1 flex-col justify-between w-full my-4 text-sm pr-2">
                <div ref={messageContainerRef} className="min-h-0 flex-1 overflow-y-auto break-all has-scrollbar">
                  {messages.map((message, index) => {
                    const previousMessage = messages[index - 1];

                    return (
                      <div key={index} className={`message ${message.role}`}>
                        {message.content === nudgeMessage && (
                          <div>
                            {previousMessage && previousMessage.content === nudgeMessage ? (
                              <>
                                <p className="ml-1">{nudgeMessage}</p>
                                <p>━━━━</p>
                              </>
                            ) : (
                              <>
                                <p>━━━━</p>
                                <p className="ml-1">{nudgeMessage}</p>
                                <p>━━━━</p>
                              </>
                            )}
                          </div>
                        )}

                        {message.senderId === user?.id && message.content !== nudgeMessage && (
                          <div>
                            <div className="flex text-black text-opacity-70">
                              <p
                                className="flex gap-1"
                                dangerouslySetInnerHTML={{
                                  __html: replaceEmoticons(user?.username || user?.email || 'You'),
                                }}
                              />
                              <p className="ml-1">says:</p>
                            </div>
                            <div className="flex gap-2 items-start ml-1">
                              <div className="flex-shrink-0 mt-2.5">
                                <img src={messageDot} alt="Message Dot" />
                              </div>
                              <div>
                                <p
                                  className="flex gap-1"
                                  dangerouslySetInnerHTML={{
                                    __html: replaceEmoticons(message.content),
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {message.senderId !== user?.id && message.content !== nudgeMessage && (
                          <div>
                            <div className="flex text-black text-opacity-70">
                              <p
                                className="flex gap-1"
                                dangerouslySetInnerHTML={{
                                  __html: replaceEmoticons(contact.name),
                                }}
                              />
                              <p className="ml-1">says:</p>
                            </div>
                            <div className="flex gap-2 items-start ml-1">
                              <div className="flex-shrink-0 mt-2.5">
                                <img src={messageDot} alt="Message Dot" />
                              </div>
                              <div>
                                <p
                                  className="flex gap-1"
                                  dangerouslySetInnerHTML={{
                                    __html: replaceEmoticons(message.content),
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="w-full mb-10">
                  {lastMessageTime && <p className="opacity-50 my-1">Last message received at {lastMessageTime}</p>}
                  <img src={divider} alt="" className="pointer-events-none" />
                  {/*--------------------- INPUT ---------------------*/}
                  <form onSubmit={handleSubmit}>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="w-full border rounded-t-[4px] outline-none p-1 border-[#bdd5df]"
                    />
                  </form>
                  <div>
                    <img className="absolute bottom-[68px] left-[150px]" src={chatPointBackground} alt="" />
                  </div>
                  <div
                    className="flex border-x border-b rounded-b-[4px] border-[#bdd5df]"
                    style={{ backgroundImage: `url(${chatIconsBackground})` }}
                  >
                    {EmoticonSelector()}

                    {WinkSelector()}

                    <div className="flex items-center aerobutton p-1 h-6" onClick={handleNudgeClick}>
                      <div>
                        <img src={sendNudge} alt="" />
                      </div>
                    </div>
                    <div className="px-2">
                      <img src={chatIconsSeparator} alt="" />
                    </div>
                    <div className="flex items-center aerobutton p-1 h-6">
                      <div>
                        <img src={changeFont} alt="" />
                      </div>
                    </div>
                    <div className="flex items-center aerobutton p-1 h-6">
                      <div className="w-5">
                        <img src={changeBackground} alt="" />
                      </div>
                      <div>
                        <img src={arrow} alt="" />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </Background>
      </div>
    </div>
  );
};

const ChatPage = () => <ChatWindow />;

export default ChatPage;
