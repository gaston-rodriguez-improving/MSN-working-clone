import React, { createContext, useState, useContext, useEffect } from 'react';
import secureLocalStorage from 'react-secure-storage';

import { ToastContext } from './ToastContext';
import { useTranslation } from 'react-i18next';
import { checkToken } from '../data/authentication';
import { updateAvatarAndBanner, updateBio, updateStatus, updateUsername } from '../data/users';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { t } = useTranslation("toast");
  const { showCustomToast } = useContext(ToastContext);

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [options, setOptions] = useState(null);

  useEffect(() => {
    const storedUser = secureLocalStorage.getItem('flm-user');
    if (!storedUser) {
      secureLocalStorage.removeItem('flm-user');
      secureLocalStorage.removeItem('flm-token');
      secureLocalStorage.removeItem('flm-options');
      return
    }

    const storedToken = secureLocalStorage.getItem('flm-token');
    if (storedToken && typeof storedToken === 'object' && storedToken.expiresAt) {
      const now = new Date();
      const expiresAt = new Date(storedToken.expiresAt);

      if (now < expiresAt) {
        setUser(storedUser);
        setToken(storedToken.value);
        const opts = secureLocalStorage.getItem('flm-options');
        setOptions(opts);
      } else {
        secureLocalStorage.removeItem('flm-user');
        secureLocalStorage.removeItem('flm-token');
        secureLocalStorage.removeItem('flm-options');

        showCustomToast(t('errors.title'), t('errors.session-expired'));
      }
    } else {
      secureLocalStorage.removeItem('flm-user');
      secureLocalStorage.removeItem('flm-token');
      secureLocalStorage.removeItem('flm-options');
    }
  }, []);

  function login(data, options) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);

    const tokenData = {
      value: data.access_token,
      expiresAt: expirationDate.toISOString(),
    };

    setUser(data.user);
    setToken(data.access_token);
    setOptions(options)

    secureLocalStorage.setItem('flm-user', data.user);
    secureLocalStorage.setItem('flm-token', tokenData);
    secureLocalStorage.setItem('flm-options', options);

  }

  function logout(showToast = false) {
    secureLocalStorage.removeItem('flm-user');
    secureLocalStorage.removeItem('flm-token');
    secureLocalStorage.removeItem('chatMessages');
    secureLocalStorage.removeItem('flm-options');

    setUser(null);
    setToken(null);
    setOptions(null);

    if (showToast) {
      showCustomToast(t('errors.title'), t('errors.session-expired'));
    }
  }

  async function checkSession() {
    const storedToken = secureLocalStorage.getItem('flm-token');
    if (!storedToken) {
      logout();
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(storedToken.expiresAt);
    if (now > expiresAt) {
      logout();
      return false;
    }

    try {
      const response = await checkToken();
      if (response.status === 200) {
        return true;
      } else {
        logout();
        return false;
      }
    } catch (err) {
      logout();
      return false;
    }
  }

  function updateUserField(field, value, apiCall) {
    setUser((prevUser) => {
      if (!prevUser) return prevUser;

      const previousValue = prevUser[field];
      const updatedUser = { ...prevUser, [field]: value };
      setUser(updatedUser);
      secureLocalStorage.setItem('flm-user', updatedUser);

      apiCall({ [field]: value })
        .then((res) => {
          if (res.status !== 200) {
            revertUser();
          }
        })
        .catch(() => {
          revertUser();
        });

      function revertUser() {
        const revertedUser = { ...updatedUser, [field]: previousValue };
        setUser(revertedUser);
        secureLocalStorage.setItem('flm-user', revertedUser);
        showCustomToast(t('errors.title'), t('errors.update'));
      }

      return updatedUser;
    });
  }

  function changeStatus(status) {
    updateUserField("status", status, updateStatus);
  }

  function changeUsername(username) {
    updateUserField("username", username, updateUsername);
  }

  function changeBio(bio) {
    updateUserField("bio", bio, updateBio);
  }

  function changeAvatar(avatar) {
    updateUserField("avatar", avatar, updateAvatarAndBanner);
  }

  function changeBanner(banner) {
    updateUserField("banner", banner, updateAvatarAndBanner);
  }

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      token,
      setToken,
      login,
      logout,
      checkSession,
      changeStatus,
      changeUsername,
      changeBio,
      changeAvatar,
      changeBanner,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
