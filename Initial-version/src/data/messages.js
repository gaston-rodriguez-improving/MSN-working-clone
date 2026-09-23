import { requestConfig } from "./config";

export const sendMessage = async (data) => {
    try {
        const res = await requestConfig.post("/messages", data);
        return res
    } catch (err) {
        return err.response
    }
};

export const getMessagesByChat = async (chat_id) => {
    try {
        const res = await requestConfig.get(`/messages/chat/${chat_id}`);
        return res
    } catch (err) {
        return err.response
    }
};

export const getAllMessages = async () => {
    try {
        const res = await requestConfig.get(`/messages/chats`);
        return res
    } catch (err) {
        return err.response
    }
};

export const unreadMessages = async (data) => {
    try {
        const res = await requestConfig.post("/unread-messages/reset", data);
        return res
    } catch (err) {
        return err.response
    }
};