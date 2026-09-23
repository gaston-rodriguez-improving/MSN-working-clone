import { requestConfig } from "./config";

export const loginRequest = async (credentials) => {
    try {
        console.log(requestConfig)
        const res = await requestConfig.post("/auth/sign-in", credentials);
        console.log(res)
        return res
    } catch (err) {
        return err.response
    }
};

export const registerRequest = async (user) => {
    try {
        const res = await requestConfig.post("/auth/sign-up", user);
        return res
    } catch (err) {
        return err.response
    }
};

export const checkToken = async () => {
    try {
        const res = await requestConfig.get("/auth/check-token");
        return res
    } catch (err) {
        return err.response
    }
};

export const resetPassword = async (data) => {
    try {
        const res = await requestConfig.post("/email/reset-code", data);
        return res
    } catch (err) {
        return err.response
    }
};
