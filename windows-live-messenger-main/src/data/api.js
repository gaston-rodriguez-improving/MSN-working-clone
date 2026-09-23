import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
export const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('messenger_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
const configuredWebsocketUrl = import.meta.env.VITE_WEBSOCKET_URL || API_URL.replace(/^http/, 'ws');
export const websocketUrl = configuredWebsocketUrl.replace(/\/$/, '').endsWith('/ws') ? configuredWebsocketUrl.replace(/\/$/, '') : `${configuredWebsocketUrl.replace(/\/$/, '')}/ws`;
export const signIn = (data) => api.post('/auth/sign-in', data);
export const signInWithMicrosoft = (idToken) => api.post('/auth/microsoft', { id_token: idToken });
export const signUp = (data) => api.post('/auth/sign-up', data);
export const checkToken = () => api.get('/auth/check-token');
export const getUsers = (search = '') => api.get('/users', { params: search ? { search } : undefined });
export const getFriendRequests = () => api.get('/friend-requests');
export const sendFriendRequest = (userId, message) => api.post('/friend-requests', { userId, message });
export const respondToFriendRequest = (requestId, status) => api.patch(`/friend-requests/${requestId}`, { status });
export const startConversation = (userId) => api.post('/conversations', { userId });
export const getAllMessages = () => api.get('/messages/chats');
export const sendMessage = (data) => api.post('/messages', data);
export const resetUnread = (chatId) => api.post('/unread-messages/reset', { chatId });
export const updateBio = (bio) => api.patch('/users/bio', { bio });
export const updateAvatar = (avatar) => api.patch('/users/avatar', { avatar });
