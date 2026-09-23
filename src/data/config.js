import axios from "axios";
import secureLocalStorage from "react-secure-storage";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export const requestConfig = axios.create({
  baseURL: BASE_URL,
});

requestConfig.interceptors.request.use((config) => {
  const tokenData = secureLocalStorage.getItem('flm-token');

  if (tokenData && typeof tokenData === 'object' && tokenData.value && tokenData.expiresAt) {
    const now = new Date();
    const expiresAt = new Date(tokenData.expiresAt);

    if (now < expiresAt) {
      config.headers.Authorization = `Bearer ${tokenData.value}`;
    } else {
      secureLocalStorage.removeItem('flm-token');
      secureLocalStorage.removeItem('flm-user');
    }
  }

  return config;
});

export default requestConfig;