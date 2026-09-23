import { useContext, useEffect, useState } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";
import {
    accpeptFriendshipInvite,
    getPendingFriendshipsInvites,
    rejectFriendshipInvite,
} from "../../data/friendships";
import { ToastContext } from "../../context/ToastContext";
import statusFrames from "../../imports/statusFrames";
import usertiles from "../../imports/usertiles";
import { ChatContext } from "../../context/ChatContext";
import { useTranslation } from "react-i18next";

export default function PendingInvites() {
    const { t } = useTranslation(["toast", "friendship"]);

    const { getContacts } = useContext(ChatContext);

    const {
        pendingInvites,
        loadingId,
        setLoadingId,
        setPendingInvites,
        fetchPendingInvites
    } = useContext(ChatContext);

    const { showCustomToast } = useContext(ToastContext);
    const [showModal, setShowModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    useEffect(() => {
        fetchPendingInvites()
    }, [pendingInvites]);

    const handleAccept = (id) => {
        setLoadingId(id);
        accpeptFriendshipInvite(id)
            .then((response) => {
                if (response.status === 200 || response.status === 201) {
                    showCustomToast(
                        t("friendship:accepted-title"),
                        t("friendship:accepted-text")
                    );
                    setPendingInvites((prev) => {
                        const updated = prev.filter((inv) => inv.id !== id);
                        if (updated.length === 0) setShowModal(false);
                        return updated;
                    });
                    getContacts();
                } else {
                    showCustomToast(
                        t("friendship:accepted-error-title"),
                        t("friendship:accepted-error")
                    );
                }
            })
            .catch(() => {
                showCustomToast(
                    t("friendship:generic-error-title"),
                    t("friendship:generic-error")
                );
            })
            .finally(() => {
                setLoadingId(null);
                setConfirmAction(null);
            });
    };

    const handleReject = (id) => {
        setLoadingId(id);
        rejectFriendshipInvite(id)
            .then((response) => {
                if (response.status === 200 || response.status === 201) {
                    showCustomToast(
                        t("friendship:rejected-title"),
                        t("friendship:rejected")
                    );
                    setPendingInvites((prev) => {
                        const updated = prev.filter((inv) => inv.id !== id);
                        if (updated.length === 0) setShowModal(false);
                        return updated;
                    });
                } else {
                    showCustomToast(
                        t("friendship:rejected-error-title"),
                        t("friendship:rejected-error")
                    );
                }
            })
            .catch(() => {
                showCustomToast(
                    t("friendship:generic-error-title"),
                    t("friendship:generic-error")
                );
            })
            .finally(() => {
                setLoadingId(null);
                setConfirmAction(null);
            });
    };

    if (!showModal && pendingInvites.length > 0) {
        return (
            <div className="flex gap-2 ml-4 mt-2 items-center">
                <img
                    src="./assets/general/info.png"
                    alt="Info icon"
                    className="w-4 h-4"
                />
                <div
                    onClick={() => setShowModal(true)}
                    className="text-blue-500 text-base cursor-pointer underline"
                >
                    {t("friendship:new-invites", { count: pendingInvites.length })}
                </div>
            </div>
        );
    } else if (showModal) {
        return (
            <>
                <div className="flex gap-2 ml-4 mt-2 items-center">
                    <img
                        src="./assets/general/info.png"
                        alt="Info icon"
                        className="w-4 h-4"
                    />
                    <div
                        onClick={() => setShowModal(true)}
                        className="text-blue-500 text-base cursor-pointer underline"
                    >
                        {t("friendship:new-invites", { count: pendingInvites.length })}
                    </div>
                </div>

                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-xs">
                    <div
                        className="window active"
                        style={{ width: "350px", maxWidth: "90%", zIndex: 1000 }}
                    >
                        <div className="title-bar">
                            <div className="title-bar-text flex items-center gap-2">
                                <img src="/assets/general/wlm-icon.png" alt="WLM Icon" />
                                {t("friendship:invites-title")}
                            </div>
                            <div className="title-bar-controls">
                                <button aria-label="Close" onClick={() => setShowModal(false)} />
                            </div>
                        </div>
                        <div className="window-body">
                            <div className="flex flex-col gap-4">
                                {pendingInvites.length === 0 && (
                                    <div className="text-center">
                                        {t("friendship:no-pending")}
                                    </div>
                                )}
                                {pendingInvites.map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="flex items-center justify-between bg-gray-100 px-2 pt-2 mb-2 rounded"
                                    >
                                        <div className="flex items-center w-full">
                                            <div className="h-[60px] w-[60px] relative">
                                                <img
                                                    className="absolute m-[2px] rounded-sm w-[40px]"
                                                    src={
                                                        invite.sender.avatar !== "default"
                                                            ? usertiles[invite.sender.avatar]
                                                            : "./assets/usertiles/default.png"
                                                    }
                                                    alt="Avatar"
                                                />
                                                <img
                                                    className="absolute w-full h-full bottom-2 right-2"
                                                    src={statusFrames.OfflineSmall}
                                                    alt="Status Frame"
                                                />
                                            </div>
                                            <div className="flex-1 -ml-2 mb-5 overflow-hidden">
                                                <p className="font-bold truncate">{invite.sender.username}</p>
                                                <p className="text-xs truncate">{invite.sender.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center gap-1">
                                            {confirmAction && confirmAction.id === invite.id ? (
                                                <>
                                                    <button
                                                        disabled={loadingId === invite.id}
                                                        onClick={() =>
                                                            confirmAction.type === "accept"
                                                                ? handleAccept(invite.id)
                                                                : handleReject(invite.id)
                                                        }
                                                        className="p-1 text-xs font-semibold rounded border flex items-center justify-center"
                                                    >
                                                        {loadingId === invite.id ? (
                                                            "..."
                                                        ) : (
                                                            <p>
                                                                {confirmAction.type === "accept"
                                                                    ? t("friendship:accept")
                                                                    : t("friendship:reject")}
                                                            </p>
                                                        )}
                                                    </button>
                                                    <button
                                                        disabled={loadingId === invite.id}
                                                        onClick={() => setConfirmAction(null)}
                                                        className="p-1 text-xs font-semibold rounded border flex items-center justify-center"
                                                    >
                                                        {t("friendship:cancel")}
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="flex flex-row gap-1 mb-5">
                                                    <div
                                                        onClick={() =>
                                                            setConfirmAction({ id: invite.id, type: "accept" })
                                                        }
                                                        className="cursor-pointer p-1 border border-green-500 text-white rounded flex items-center justify-center"
                                                    >
                                                        <FaCheck className="text-green-500" size={15} />
                                                    </div>
                                                    <div
                                                        onClick={() =>
                                                            setConfirmAction({ id: invite.id, type: "reject" })
                                                        }
                                                        className="cursor-pointer p-1 border border-red-500 text-white rounded flex items-center justify-center"
                                                    >
                                                        <FaTimes className="text-red-500" size={16} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div >
            </>
        );
    }
}
