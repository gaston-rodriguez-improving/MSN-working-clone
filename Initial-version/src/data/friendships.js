import { requestConfig } from "./config";

export const sendFriendshipInvite = async (data) => {
    try {
        const res = await requestConfig.post("/friendships", data);
        return res
    } catch (err) {
        return err.response
    }
};

export const sendFriendshipInviteWithEmail = async (data) => {
    try {
        const res = await requestConfig.post("/friendships/with-email", data);
        return res
    } catch (err) {
        return err.response
    }
};

export const getFriendships = async () => {
    try {
        const res = await requestConfig.get("/friendships/friends");
        return res
    } catch (err) {
        return err.response
    }
};

export const getPendingFriendshipsInvites = async () => {
    try {
        const res = await requestConfig.get("/friendships/pending");
        return res
    } catch (err) {
        return err.response
    }
};

export const accpeptFriendshipInvite = async (id) => {
    try {
        const res = await requestConfig.post(`/friendships/accept/${id}`);
        return res
    } catch (err) {
        return err.response
    }
};

export const rejectFriendshipInvite = async (id) => {
    try {
        const res = await requestConfig.post(`/friendships/reject/${id}`);
        return res
    } catch (err) {
        return err.response
    }
};
