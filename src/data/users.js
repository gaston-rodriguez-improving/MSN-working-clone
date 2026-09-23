import { requestConfig } from "./config";

export const getCompanyUsers = async (search = '') => {
    try {
        const params = search ? { search } : undefined;
        const res = await requestConfig.get("/users", { params });
        return res
    } catch (err) {
        return err.response
    }
};

export const startConversation = async (userId) => {
    try {
        const res = await requestConfig.post("/conversations", { userId });
        return res
    } catch (err) {
        return err.response
    }
};

export const updateAvatarAndBanner = async (data) => {
    try {
        const res = await requestConfig.patch("/users", data);
        return res
    } catch (err) {
        return err.response
    }
};

export const updateStatus = async (data) => {
    try {
        const res = await requestConfig.patch("/users/status", data);
        return res
    } catch (err) {
        return err.response
    }
};

export const updateBio = async (data) => {
    try {
        const res = await requestConfig.patch("/users/bio", data);
        return res
    } catch (err) {
        return err.response
    }
};

export const updateUsername = async (data) => {
    try {
        const res = await requestConfig.patch("/users/username", data);
        return res
    } catch (err) {
        return err.response
    }
};
