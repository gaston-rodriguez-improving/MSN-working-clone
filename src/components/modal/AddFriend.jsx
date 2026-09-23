import React, { useContext, useState } from 'react';
import '7.css/dist/7.scoped.css'

import { sendFriendshipInviteWithEmail } from '../../data/friendships'
import { ToastContext } from '../../context/ToastContext';
import { useTranslation } from 'react-i18next';

export default function AddFriend({ isOpen, onClose }) {
    if (!isOpen) return null;

    const { t } = useTranslation("friendship");

    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');

    const { showCustomToast } = useContext(ToastContext);

    const onSubmit = () => {
        setIsLoading(true);

        sendFriendshipInviteWithEmail({ email })
            .then(response => {
                if (response.status === 201) {
                    showCustomToast(
                        t("request-sent-title"),
                        t("request-sent")
                    );
                } else if (response.status === 401 || response.status === 404) {
                    showCustomToast(
                        t("invalid-title"),
                        t("invalid")
                    );
                } else if (response.status === 409) {
                    showCustomToast(
                        t("already-sent-title"),
                        t("already-sent")
                    );
                } else {
                    showCustomToast(
                        t("error-title"),
                        t("error")
                    );
                }
            })
            .catch(() => {
                showCustomToast(
                    t("error-title"),
                    t("error")
                );
            })
            .finally(() => setIsLoading(false));
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-xs">
            <div
                className="window active"
                style={{
                    width: '300px',
                    maxWidth: '90%',
                    zIndex: 1000,
                }}
            >
                <div className="title-bar">
                    <div className="title-bar-text flex items-center gap-2">
                        <img src="/assets/general/wlm-icon.png" alt="WLM Icon" />
                        {t("add-user")}
                    </div>
                    <div className="title-bar-controls">
                        <button aria-label="Close" onClick={onClose}></button>
                    </div>
                </div>
                <div className="window-body">
                    <form
                        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
                        className="flex flex-col gap-2 p-5"
                    >
                        <div className="field-row-stacked">
                            <label htmlFor="email">{t("email")}</label>
                            <input
                                id="email"
                                type="email"
                                className="w-full"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="field-row mt-3 justify-end">
                            <button type="submit" className="default" disabled={isLoading}>
                                {isLoading ? t("sending") : t("send-request")}
                            </button>
                            <button type="button" onClick={onClose}>
                                {t("cancel")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
