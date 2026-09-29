import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from './AuthContext';
import { useToast } from './ToastContext';
import { getAllMessages, getFriendRequests, getUsers, resetUnread, respondToFriendRequest, sendFriendRequest, sendMessage, startConversation, websocketUrl } from '../data/api';

export const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useContext(AuthContext);
  const { showNotification } = useToast();
  const [contacts, setContacts] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [messages, setMessages] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const socketRef = useRef(null);
  const contactsRef = useRef([]);
  const activeRef = useRef(null);
  const messageIds = useRef(new Set());

  useEffect(() => { contactsRef.current = contacts; }, [contacts]);
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
    Promise.all([getUsers(), getAllMessages(), getFriendRequests()]).then(([usersResponse, messagesResponse, requestsResponse]) => {
      if (cancelled) return;
      const users = (usersResponse.data.users || []).map((contact) => ({
        ...contact,
        name: contact.username,
        message: contact.bio || '',
        image: contact.avatar === 'default' ? '/assets/usertiles/default.png' : contact.avatar,
      }));
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
    const token = localStorage.getItem('messenger_token');
    const socket = new WebSocket(`${websocketUrl}?token=${encodeURIComponent(token)}`);
    socketRef.current = socket;
    socket.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        if (type === 'message' && appendMessage(payload)) {
          const sender = contactsRef.current.find((contact) => contact.id === payload.senderId);
          if (sender && payload.chatId !== activeRef.current && !payload.drawAttention && !payload.winks) showNotification({ title: sender.username, text: payload.content, avatar: sender.avatar, onOpen: () => { window.location.href = `/chat/${sender.id}`; } });
        }
        if (type === 'friend_request') {
          const request = { ...payload, user: payload.user };
          setFriendRequests((prev) => [request, ...prev.filter((item) => item.id !== request.id)]);
          showNotification({ title: payload.user.username, text: 'sent you a friend invitation.', avatar: payload.user.avatar });
        }
        if (type === 'friend_request_update') {
          setFriendRequests((prev) => prev.filter((request) => request.id !== payload.id));
          showNotification({ title: payload.user.username, text: payload.status === 'accepted' ? 'accepted your friend invitation.' : 'declined your friend invitation.', avatar: payload.user.avatar });
        }
        if (type === 'user_status_update' || type === 'user_bio_update' || type === 'user_avatar_update') setContacts((prev) => prev.map((contact) => contact.id === payload.id ? { ...contact, ...payload, message: payload.bio || contact.message || '', image: payload.avatar === 'default' ? '/assets/usertiles/default.png' : payload.avatar || contact.image } : contact));
      } catch {
        return;
      }
    };
    return () => { socket.close(); socketRef.current = null; };
  }, [user, appendMessage, showNotification]);

  const sendFriendInvitation = useCallback(async (userId, message) => {
    const { data } = await sendFriendRequest(userId, message);
    setFriendRequests((prev) => [data.request, ...prev.filter((request) => request.id !== data.request.id)]);
    return data.request;
  }, []);
  const respondToFriendInvitation = useCallback(async (requestId, status) => {
    await respondToFriendRequest(requestId, status);
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

  return <ChatContext.Provider value={{ contacts, friendRequests, messages, activeChatId, setActiveChatId, sendFriendInvitation, respondToFriendInvitation, openConversation, send }}>{children}</ChatContext.Provider>;
}
