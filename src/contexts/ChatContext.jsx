import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from './AuthContext';
import { useToast } from './ToastContext';
import sounds from '../imports/sounds';
import { getAllMessages, getFriendRequests, getFriends, resetUnread, respondToFriendRequest, sendFriendRequest, sendMessage, startConversation, websocketUrl } from '../data/api';

export const ChatContext = createContext(null);

const toContact = (contact) => ({ ...contact, name: contact.username, message: contact.bio || '', image: contact.avatar === 'default' ? '/assets/usertiles/default.png' : contact.avatar });

export function ChatProvider({ children }) {
  const { user } = useContext(AuthContext);
  const { showNotification, playSound } = useToast();
  const [contacts, setContacts] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [messages, setMessages] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatRequest, setChatRequest] = useState(null);
  const socketRef = useRef(null);
  const contactsRef = useRef([]);
  const activeRef = useRef(null);
  const messageIds = useRef(new Set());
  const messageEffectListeners = useRef(new Map());
  const pendingMessageEffects = useRef(new Map());

  const subscribeToMessageEffects = useCallback((chatId, listener) => {
    const key = Number(chatId);
    const listeners = messageEffectListeners.current.get(key) || new Set();
    listeners.add(listener);
    messageEffectListeners.current.set(key, listeners);
    (pendingMessageEffects.current.get(key) || []).forEach((message) => listener(message));
    pendingMessageEffects.current.delete(key);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) messageEffectListeners.current.delete(key);
    };
  }, []);

  useEffect(() => { contactsRef.current = contacts; }, [contacts]);
  const requestsRef = useRef([]);
  useEffect(() => { requestsRef.current = friendRequests; }, [friendRequests]);
  useEffect(() => { activeRef.current = activeChatId; }, [activeChatId]);

  const appendMessage = useCallback((message) => {
    if (messageIds.current.has(message.id)) return false;
    messageIds.current.add(message.id);
    setMessages((prev) => ({ ...prev, [message.chatId]: [...(prev[message.chatId] || []), message] }));
    return true;
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    Promise.all([getFriends(), getAllMessages(), getFriendRequests()]).then(([usersResponse, messagesResponse, requestsResponse]) => {
      if (cancelled) return;
      const users = (usersResponse.data.users || []).map(toContact);
      setContacts(users);
      setFriendRequests(requestsResponse.data.requests || []);
      const data = messagesResponse.data;
      Object.values(data.chats || {}).flat().forEach((message) => messageIds.current.add(message.id));
      setMessages(data.chats || {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    let closed = false; let socket; let retryTimer;
    const connect = () => {
    const token = localStorage.getItem('messenger_token');
    if (!token) return;
    socket = new WebSocket(`${websocketUrl}?token=${encodeURIComponent(token)}`);
    socketRef.current = socket;
    socket.onopen = () => { getFriends().then(({ data }) => { const list = (data.users || []).map(toContact); setContacts((prev) => { const known = new Set(prev.map((c) => c.id)); return [...prev, ...list.filter((c) => !known.has(c.id))]; }); }).catch(() => {}); getFriendRequests().then(({ data }) => setFriendRequests(data.requests || [])).catch(() => {}); };
    socket.onclose = () => { if (!closed) retryTimer = setTimeout(connect, 2000); };
    socket.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        if (type === 'message' && appendMessage(payload)) {
          const listeners = messageEffectListeners.current.get(Number(payload.chatId));
          const isEffect = payload.drawAttention || payload.winks;
          const opensChatForEffect = isEffect && !listeners?.size;
          if (isEffect && listeners?.size) listeners.forEach((listener) => listener(payload));
          else if (opensChatForEffect) {
            const pending = pendingMessageEffects.current.get(Number(payload.chatId)) || [];
            pendingMessageEffects.current.set(Number(payload.chatId), [...pending, payload]);
            setChatRequest({ id: payload.senderId, at: Date.now() });
          }
          const isActiveChat = payload.chatId === activeRef.current;
          if (!isEffect && isActiveChat) playSound(sounds.newmessage);
          const notify = (sender) => {
            if (!sender || isActiveChat || opensChatForEffect) return;
            const text = payload.drawAttention ? 'sent you a nudge.' : payload.winks ? 'sent you a wink.' : payload.content;
            showNotification({ title: sender.username, text, avatar: sender.avatar, onOpen: () => setChatRequest({ id: sender.id, at: Date.now() }) }, { sound: !isEffect });
          };
          const sender = contactsRef.current.find((contact) => contact.id === payload.senderId);
          if (sender) notify(sender);
          else getFriends().then(({ data }) => { const list = data.users || []; const found = list.find((contact) => contact.id === payload.senderId); setContacts((prev) => { const known = new Set(prev.map((c) => c.id)); return [...prev, ...list.filter((c) => !known.has(c.id)).map((c) => ({ ...c, name: c.username, message: c.bio || '', image: c.avatar === 'default' ? '/assets/usertiles/default.png' : c.avatar }))]; }); notify(found); }).catch(() => {});
        }
        if (type === 'friend_request') {
          const request = { ...payload, user: payload.user };
          setFriendRequests((prev) => [request, ...prev.filter((item) => item.id !== request.id)]);
          showNotification({ title: payload.user.username, text: 'sent you a friend invitation.', avatar: payload.user.avatar });
        }
        if (type === 'friend_request_update') {
          setFriendRequests((prev) => prev.filter((request) => request.id !== payload.id));
          if (payload.status === 'accepted') setContacts((prev) => prev.some((c) => c.id === payload.user.id) ? prev : [...prev, toContact(payload.user)]);
          showNotification({ title: payload.user.username, text: payload.status === 'accepted' ? 'accepted your friend invitation.' : 'declined your friend invitation.', avatar: payload.user.avatar });
        }
        if (type === 'user_status_update' || type === 'user_bio_update' || type === 'user_avatar_update' || type === 'user_username_update') setContacts((prev) => prev.map((contact) => contact.id === payload.id ? { ...contact, ...payload, name: payload.username || contact.name, message: payload.bio || contact.message || '', image: payload.avatar === 'default' ? '/assets/usertiles/default.png' : payload.avatar || contact.image } : contact));
      } catch {
        return;
      }
    };
    };
    connect();
    return () => { closed = true; clearTimeout(retryTimer); socket?.close(); socketRef.current = null; };
  }, [user?.id, appendMessage, showNotification, playSound]);

  const sendFriendInvitation = useCallback(async (userId, message) => {
    const { data } = await sendFriendRequest(userId, message);
    setFriendRequests((prev) => [data.request, ...prev.filter((request) => request.id !== data.request.id)]);
    return data.request;
  }, []);
  const respondToFriendInvitation = useCallback(async (requestId, status) => {
    await respondToFriendRequest(requestId, status);
    const accepted = status === 'accepted' && requestsRef.current.find((request) => request.id === requestId)?.user;
    if (accepted) setContacts((prev) => prev.some((c) => c.id === accepted.id) ? prev : [...prev, toContact(accepted)]);
    setFriendRequests((prev) => prev.filter((request) => request.id !== requestId));
  }, []);
  const openConversation = useCallback(async (contactId) => {
    const contact = contactsRef.current.find((item) => item.id === Number(contactId));
    if (!contact) return null;
    const { data } = await startConversation(contact.id);
    const chatId = data.chatId || data.id;
    setActiveChatId(chatId);
    await resetUnread(chatId).catch(() => {});
    return { contact, chatId };
  }, []);
  const send = useCallback(async (chatId, content, options = {}) => { const { data } = await sendMessage({ chatId, content, ...options }); appendMessage(data); return data; }, [appendMessage]);

  return <ChatContext.Provider value={{ chatRequest, contacts, friendRequests, messages, activeChatId, setActiveChatId, sendFriendInvitation, respondToFriendInvitation, openConversation, subscribeToMessageEffects, send }}>{children}</ChatContext.Provider>;
}
