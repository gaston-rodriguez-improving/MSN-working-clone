import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from './AuthContext';
import { useToast } from './ToastContext';
import sounds from '../imports/sounds';
import { getChatMessages, getUnreadChats, getFriendRequests, getFriends, resetUnread, respondToFriendRequest, sendFriendRequest, sendMessage, startConversation, websocketUrl } from '../data/api';

export const ChatContext = createContext(null);

const toContact = (contact) => ({ ...contact, name: contact.username, message: contact.bio || '', image: contact.avatar === 'default' ? '/assets/usertiles/default.png' : contact.avatar });

export function ChatProvider({ children }) {
  const { user } = useContext(AuthContext);
  const { showNotification, playSound } = useToast();
  const [contacts, setContacts] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friendInvitationToReview, setFriendInvitationToReview] = useState(null);
  const [messages, setMessages] = useState({});
  const [hasMoreMessages, setHasMoreMessages] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatRequest, setChatRequest] = useState(null);
  const [unread, setUnread] = useState({});
  const unreadRef = useRef({});
  const socketRef = useRef(null);
  const hasConnectedSocket = useRef(false);
  const contactsRef = useRef([]);
  const activeRef = useRef(null);
  const messageIds = useRef(new Set());
  const messageLoads = useRef(new Map());
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
  useEffect(() => { unreadRef.current = unread; }, [unread]);

  const appendMessage = useCallback((message) => {
    if (messageIds.current.has(message.id)) return false;
    messageIds.current.add(message.id);
    setMessages((prev) => ({ ...prev, [message.chatId]: [...(prev[message.chatId] || []), message] }));
    return true;
  }, []);

  const loadMessages = useCallback((chatId, beforeId) => {
    const key = `${chatId}:${beforeId || 'latest'}`;
    if (messageLoads.current.has(key)) return messageLoads.current.get(key);
    const params = beforeId ? { before: beforeId, limit: 10 } : { limit: 10 };
    const request = getChatMessages(chatId, params).then(({ data }) => {
      const fetchedMessages = data.messages || [];
      fetchedMessages.forEach((message) => messageIds.current.add(message.id));
      setMessages((prev) => {
        const existing = prev[chatId] || [];
        const combined = new Map(existing.map((message) => [message.id, message]));
        fetchedMessages.forEach((message) => combined.set(message.id, message));
        return { ...prev, [chatId]: [...combined.values()].sort((a, b) => a.id - b.id) };
      });
      setHasMoreMessages((prev) => ({ ...prev, [chatId]: data.hasMore }));
      return fetchedMessages.length;
    }).finally(() => messageLoads.current.delete(key));
    messageLoads.current.set(key, request);
    return request;
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    Promise.all([getFriends(), getFriendRequests()]).then(([usersResponse, requestsResponse]) => {
      if (cancelled) return;
      const users = (usersResponse.data.users || []).map(toContact);
      setContacts(users);
      setFriendRequests(requestsResponse.data.requests || []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    hasConnectedSocket.current = false;
    let closed = false; let socket; let retryTimer;
    const refreshUnread = (notify) => getUnreadChats().then(({ data }) => {
      const next = {}; let increased = null;
      (data.conversations || []).forEach((chat) => {
        if (chat.chatId === activeRef.current && !document.hidden) { if (chat.unreadCount > 0) resetUnread(chat.chatId).catch(() => {}); return; }
        if (chat.unreadCount > 0) { next[chat.userId] = chat.unreadCount; if (chat.unreadCount > (unreadRef.current[chat.userId] || 0)) increased = chat; }
      });
      unreadRef.current = next; setUnread(next);
      if (notify && increased) showNotification({ title: increased.username, text: 'sent you a message.', avatar: increased.avatar, onOpen: () => setChatRequest({ id: increased.userId, at: Date.now() }) });
    }).catch(() => {});
    const reviveConnection = () => {
      if (closed || document.hidden) return;
      if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) { clearTimeout(retryTimer); connect(); }
      else if (socket.readyState === WebSocket.OPEN) {
        refreshUnread(true);
      }
    };
    const connect = () => {
    const token = localStorage.getItem('messenger_token');
    if (!token) return;
    socket = new WebSocket(`${websocketUrl}?token=${encodeURIComponent(token)}`);
    socketRef.current = socket;
    socket.onopen = () => {
      const isReconnect = hasConnectedSocket.current;
      hasConnectedSocket.current = true;
      refreshUnread(isReconnect);
      if (!isReconnect) return;
      Promise.all([getFriends(), getFriendRequests()]).then(([usersResponse, requestsResponse]) => {
        const list = (usersResponse.data.users || []).map(toContact);
        setContacts((prev) => { const known = new Set(prev.map((contact) => contact.id)); return [...prev, ...list.filter((contact) => !known.has(contact.id))]; });
        setFriendRequests(requestsResponse.data.requests || []);
      }).catch(() => {});
    };
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
          const isActiveChat = payload.chatId === activeRef.current && !document.hidden;
          if (isActiveChat) resetUnread(payload.chatId).catch(() => {});
          else if (!opensChatForEffect) setUnread((prev) => ({ ...prev, [payload.senderId]: (prev[payload.senderId] || 0) + 1 }));
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
          showNotification({ title: payload.user.username, text: 'sent you a friend invitation.', avatar: payload.user.avatar, actionLabel: 'Review invitation', onOpen: () => setFriendInvitationToReview(request) });
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
    document.addEventListener('visibilitychange', reviveConnection);
    window.addEventListener('online', reviveConnection);
    window.addEventListener('focus', reviveConnection);
    return () => { closed = true; clearTimeout(retryTimer); document.removeEventListener('visibilitychange', reviveConnection); window.removeEventListener('online', reviveConnection); window.removeEventListener('focus', reviveConnection); socket?.close(); socketRef.current = null; };
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
    setUnread((prev) => { if (!prev[contact.id]) return prev; const { [contact.id]: _, ...rest } = prev; return rest; });
    await resetUnread(chatId).catch(() => {});
    return { contact, chatId };
  }, []);
  const send = useCallback(async (chatId, content, options = {}) => { const { data } = await sendMessage({ chatId, content, ...options }); appendMessage(data); return data; }, [appendMessage]);

  return <ChatContext.Provider value={{ unread, chatRequest, contacts, friendRequests, friendInvitationToReview, setFriendInvitationToReview, messages, hasMoreMessages, activeChatId, setActiveChatId, sendFriendInvitation, respondToFriendInvitation, openConversation, loadMessages, subscribeToMessageEffects, send }}>{children}</ChatContext.Provider>;
}
