import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { AuthContext } from './AuthContext';
import { useToast } from './ToastContext';
import sounds from '../imports/sounds';
import { createListeningState, reduceListeningState } from '../features/listening/state';
import { listeningEnabled } from '../features/musicConfig';
import { getChatMessages, getUnreadChats, getFriendRequests, getFriends, getListeningActivities, getListeningPreference, saveListeningPreference, resetUnread, respondToFriendRequest, sendFriendRequest, sendMessage, startConversation, websocketUrl } from '../data/api';

export const ChatContext = createContext(null);

const toContact = (contact) => ({ ...contact, name: contact.username, message: contact.bio ?? '', image: contact.avatar === 'default' ? '/assets/usertiles/default.png' : contact.avatar });

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
  const [listeningState, dispatchListening] = useReducer(reduceListeningState, undefined, createListeningState);
  const listeningActivities = listeningState.activities;
  const [listeningSharing, setListeningSharingState] = useState(false);
  const unreadRef = useRef({});
  const socketRef = useRef(null);
  const hasConnectedSocket = useRef(false);
  const contactsRef = useRef([]);
  const activeRef = useRef(null);
  const messageIds = useRef(new Set());
  const messageLoads = useRef(new Map());
  const messageEffectListeners = useRef(new Map());
  const pendingMessageEffects = useRef(new Map());
  const serverEventListeners = useRef(new Set());
  const socketOpenVersion = useRef(0);
  const listeningEventVersion = useRef(0);
  const listeningPreferenceSyncVersion = useRef(0);
  const awaitingListeningSnapshot = useRef(false);
  const pendingListeningDeltas = useRef([]);

  const publishServerEvent = useCallback((event) => {
    serverEventListeners.current.forEach((listener) => {
      try { listener(event); } catch { /* One feature listener must not block other subscribers. */ }
    });
  }, []);
  const subscribeToServerEvents = useCallback((listener) => {
    serverEventListeners.current.add(listener);
    return () => serverEventListeners.current.delete(listener);
  }, []);
  const sendSocketEvent = useCallback((type, payload) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try { socket.send(JSON.stringify({ type, payload })); return true; } catch { return false; }
  }, []);
  const setListeningSharing = useCallback(async (share) => {
    if (!listeningEnabled) return false;
    const { data } = await saveListeningPreference(Boolean(share));
    setListeningSharingState(Boolean(data.share));
    listeningPreferenceSyncVersion.current += 1;
    localStorage.setItem('messenger_listening_sharing', String(Boolean(data.share)));
    return Boolean(data.share);
  }, []);

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
  const unreadMessageTotal = Object.values(unread).reduce((total, count) => total + Number(count || 0), 0);
  useEffect(() => {
    const baseTitle = document.title || 'Windows Live Messenger';
    if (!unreadMessageTotal) {
      document.title = baseTitle;
      return undefined;
    }
    const attentionTitle = `${unreadMessageTotal} new message${unreadMessageTotal === 1 ? '' : 's'} - ${baseTitle}`;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const iconLink = document.querySelector('link[rel~="icon"]');
    const baseIconHref = iconLink?.href;
    let attentionIconHref = null;
    let showAttention = false;
    let timer;
    let cancelled = false;
    if (iconLink && baseIconHref) {
      const image = new Image();
      image.onload = () => {
        if (cancelled) return;
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.drawImage(image, 0, 0, 32, 32);
        context.lineWidth = 3;
        context.strokeStyle = '#ff9f1c';
        context.shadowColor = 'rgba(255, 159, 28, 0.8)';
        context.shadowBlur = 5;
        context.strokeRect(2, 2, 28, 28);
        attentionIconHref = canvas.toDataURL('image/png');
        if (showAttention) iconLink.href = attentionIconHref;
      };
      image.src = baseIconHref;
    }
    const updateAttention = () => {
      showAttention = !showAttention;
      document.title = showAttention ? attentionTitle : baseTitle;
      if (iconLink && attentionIconHref) iconLink.href = showAttention ? attentionIconHref : baseIconHref;
    };
    if (reducedMotion) {
      showAttention = true;
      document.title = attentionTitle;
      if (iconLink && attentionIconHref) iconLink.href = attentionIconHref;
    } else {
      updateAttention();
      timer = window.setInterval(updateAttention, 800);
    }
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      document.title = baseTitle;
      if (iconLink && baseIconHref) iconLink.href = baseIconHref;
    };
  }, [unreadMessageTotal]);
  const requestsRef = useRef([]);
  useEffect(() => { requestsRef.current = friendRequests; }, [friendRequests]);
  useEffect(() => { activeRef.current = activeChatId; }, [activeChatId]);
  useEffect(() => { unreadRef.current = unread; }, [unread]);

  useEffect(() => {
    if (!user || !listeningEnabled) {
      dispatchListening({ type: 'reset' });
      setListeningSharingState(false);
      return undefined;
    }
    let cancelled = false;
    const startedAtSocketVersion = socketOpenVersion.current;
    const startedAtListeningVersion = listeningEventVersion.current;
    const startedAtPreferenceVersion = listeningPreferenceSyncVersion.current;
    Promise.all([getListeningActivities(), getListeningPreference()]).then(([activitiesResponse, preferenceResponse]) => {
      if (cancelled) return;
      if (startedAtSocketVersion === socketOpenVersion.current && startedAtListeningVersion === listeningEventVersion.current) dispatchListening({ type: 'rest', activities: activitiesResponse.data.activities || [] });
      if (startedAtPreferenceVersion === listeningPreferenceSyncVersion.current) {
        const share = Boolean(preferenceResponse.data.share);
        setListeningSharingState(share);
        localStorage.setItem('messenger_listening_sharing', String(share));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    const syncListeningPreference = (event) => {
      if (event.key !== 'messenger_listening_sharing') return;
      listeningPreferenceSyncVersion.current += 1;
      setListeningSharingState(event.newValue === 'true');
    };
    window.addEventListener('storage', syncListeningPreference);
    return () => window.removeEventListener('storage', syncListeningPreference);
  }, []);

  useEffect(() => {
    if (!Object.keys(listeningActivities).length) return undefined;
    const timer = setInterval(() => dispatchListening({ type: 'expire', now: Date.now() }), 1000);
    return () => clearInterval(timer);
  }, [listeningActivities]);

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
    let closed = false; let socket; let retryTimer; let isReconnect = false;
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
      isReconnect = hasConnectedSocket.current;
      hasConnectedSocket.current = true;
      socketOpenVersion.current += 1;
      awaitingListeningSnapshot.current = true;
      pendingListeningDeltas.current = [];
      refreshUnread(isReconnect);
      if (!isReconnect) return;
      Promise.all([getFriends(), getFriendRequests()]).then(([usersResponse, requestsResponse]) => {
        const list = (usersResponse.data.users || []).map(toContact);
        setContacts(list);
        setFriendRequests(requestsResponse.data.requests || []);
      }).catch(() => {});
    };
    socket.onclose = () => {
      awaitingListeningSnapshot.current = false;
      pendingListeningDeltas.current = [];
      if (!closed) retryTimer = setTimeout(connect, 2000);
    };
    socket.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        if (type === 'socket_ready') publishServerEvent({ type: 'socket_open', payload: { reconnect: isReconnect } });
        if (type === 'message' && appendMessage(payload)) {
          const listeners = messageEffectListeners.current.get(Number(payload.chatId));
          const isEffect = payload.drawAttention || payload.winks;
          const opensChatForEffect = isEffect && !listeners?.size;
          if (isEffect && listeners?.size) listeners.forEach((listener) => listener(payload));
          else if (opensChatForEffect) {
            const pending = pendingMessageEffects.current.get(Number(payload.chatId)) || [];
            pendingMessageEffects.current.set(Number(payload.chatId), [...pending, payload]);
            setChatRequest({ id: payload.senderId, at: Date.now(), autoOpen: true });
          }
          const isActiveChat = payload.chatId === activeRef.current && !document.hidden;
          if (isActiveChat) resetUnread(payload.chatId).catch(() => {});
          else if (!opensChatForEffect) {
            setUnread((prev) => ({ ...prev, [payload.senderId]: (prev[payload.senderId] || 0) + 1 }));
            setChatRequest({ id: payload.senderId, at: Date.now(), autoOpen: true });
          }
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
          showNotification({ title: payload.user.username, text: 'sent you a friend invitation.', avatar: payload.user.avatar, actionLabel: 'Review invitation', onOpen: () => setFriendInvitationToReview(request) }, { soundPreference: 'friendInvitations' });
        }
        if (type === 'friend_request_update') {
          setFriendRequests((prev) => prev.filter((request) => request.id !== payload.id));
          if (payload.status === 'accepted') setContacts((prev) => prev.some((c) => c.id === payload.user.id) ? prev : [...prev, toContact(payload.user)]);
          showNotification({ title: payload.user.username, text: payload.status === 'accepted' ? 'accepted your friend invitation.' : 'declined your friend invitation.', avatar: payload.user.avatar }, { soundPreference: 'friendInvitations' });
        }
        if (type === 'user_status_update') {
          const contact = contactsRef.current.find((item) => item.id === payload.id);
          if (payload.id !== user.id && contact?.status === 'offline' && payload.status === 'online') playSound(sounds.online, 'contactsOnline');
          setContacts((prev) => prev.map((item) => item.id === payload.id ? { ...item, ...payload, name: payload.username || item.name, message: payload.bio !== undefined ? payload.bio : item.message, image: payload.avatar === 'default' ? '/assets/usertiles/default.png' : payload.avatar || item.image } : item));
        }
        if (type === 'user_bio_update' || type === 'user_avatar_update' || type === 'user_username_update') setContacts((prev) => prev.map((contact) => contact.id === payload.id ? { ...contact, ...payload, name: payload.username || contact.name, message: payload.bio !== undefined ? payload.bio : contact.message, image: payload.avatar === 'default' ? '/assets/usertiles/default.png' : payload.avatar || contact.image } : contact));
        if (listeningEnabled && type === 'listening_activity') {
          listeningEventVersion.current += 1;
          if (awaitingListeningSnapshot.current) pendingListeningDeltas.current.push(payload);
          else dispatchListening({ type: 'delta', envelope: payload });
        }
        if (listeningEnabled && type === 'listening_snapshot') {
          listeningEventVersion.current += 1;
          dispatchListening({ type: 'snapshot', envelopes: payload.activities || [] });
          awaitingListeningSnapshot.current = false;
          pendingListeningDeltas.current.splice(0).forEach((envelope) => dispatchListening({ type: 'delta', envelope }));
        }
        publishServerEvent({ type, payload });
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
  }, [user?.id, appendMessage, showNotification, playSound, publishServerEvent]);

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
  const markConversationRead = useCallback((contactId, chatId) => {
    setUnread((prev) => {
      if (!prev[contactId]) return prev;
      const next = { ...prev };
      delete next[contactId];
      return next;
    });
    if (chatId) resetUnread(chatId).catch(() => {});
  }, []);
  const openConversation = useCallback(async (contactId, { markRead = true } = {}) => {
    const contact = contactsRef.current.find((item) => item.id === Number(contactId));
    if (!contact) return null;
    const { data } = await startConversation(contact.id);
    const chatId = data.chatId || data.id;
    if (markRead) {
      setActiveChatId(chatId);
      markConversationRead(contact.id, chatId);
    }
    return { contact, chatId };
  }, [markConversationRead]);
  const send = useCallback(async (chatId, content, options = {}) => { const { data } = await sendMessage({ chatId, content, ...options }); appendMessage(data); return data; }, [appendMessage]);

  return <ChatContext.Provider value={{ unread, chatRequest, contacts, friendRequests, friendInvitationToReview, setFriendInvitationToReview, messages, hasMoreMessages, activeChatId, setActiveChatId, sendFriendInvitation, respondToFriendInvitation, openConversation, markConversationRead, loadMessages, subscribeToMessageEffects, subscribeToServerEvents, sendSocketEvent, listeningActivities, listeningSharing, setListeningSharing, playSound, send }}>{children}</ChatContext.Provider>;
}
