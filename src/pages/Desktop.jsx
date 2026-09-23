import React, { useContext, useState } from "react"
import Toolbar from "../components/desktop/Toolbar"
import DesktopIcons from "../components/desktop/DesktopIcons";
import Window from "../components/modal/Window";
import IndividualChat from "../components/modal/IndividualChat";
import { ChatContext } from "../context/ChatContext";
import Ruffle from "../helpers/ruffle";

export default function Desktop() {
    const { showIndividualChat, closeIndividualChat, ruffleRef } = useContext(ChatContext);

    const [isChatActive, setIsChatActive] = useState(false);
    const [showChat, setShowChat] = useState(false);


    function openChat() {
        setShowChat(true);
        setIsChatActive(true);
    }

    function minimizeChat() {
        closeIndividualChat();
        setShowChat(false);
    }

    function closeChat() {
        closeIndividualChat();
        setShowChat(false);
        setIsChatActive(false);
    }

    return (
        <div
            className="h-screen w-full relative overflow-hidden bg-cover bg-center"
            style={{
                backgroundImage: `url('./assets/wallpapers/win7.jpg')`,
            }}
        >

            <div className="absolute top-4 left-4">
                <DesktopIcons onChatClick={openChat} />
            </div>


            {showChat && (
                <Window closeChat={closeChat} minimizeChat={minimizeChat} />
            )}

            {showIndividualChat && (
                <IndividualChat />
            )}

            <Ruffle ref={ruffleRef} />

            <div className="absolute bottom-0 w-full">
                <Toolbar showChat={showChat} isChatActive={isChatActive} openChat={openChat} closeChat={closeChat} />
            </div>

        </div>
    );
}
