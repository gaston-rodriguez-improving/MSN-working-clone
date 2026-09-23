import React, { useContext, useState } from 'react';
import '7.css/dist/7.scoped.css'

import { AuthContext } from '../../context/AuthContext';

export default function ChangeNameAndBio({ setShowChangeNameAndBio }) {
    const { user, changeBio, changeUsername } = useContext(AuthContext);

    const [bio, setBio] = useState(user.bio);
    const [username, setUsername] = useState(user.username);

    function applyAndClose() {
        if (user.username !== username) {
            changeUsername(username)
        }

        if (user.bio !== bio) {
            changeBio(bio)
        }

        setShowChangeNameAndBio(false);
    }

    const handleMessageChange = (e) => {
        setBio(e.target.value);
    };

    const handleNameChange = (e) => {
        setUsername(e.target.value);
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center">

            <div className="justify-center mt-7 items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none">
                <div
                    className="window active"
                    style={{
                        width: '400px',
                        maxWidth: '90%',
                        zIndex: 1000,
                        maxHeight: '90%'
                    }}

                >
                    <div className="title-bar">
                        <div className="title-bar-text flex items-center gap-2">
                            <img src="/assets/general/wlm-icon.png" alt="WLM Icon" />
                            Display Picture
                        </div>
                        <div className="title-bar-controls">
                            <button aria-label="Close" onClick={() => setShowChangeNameAndBio(false)}></button>
                        </div>
                    </div>
                    <div className="window-body">

                        <div className="flex flex-col w-full bg-white bg-gradient-to-t from-[#c3d4ec83] via-white to-[#c3d4ec83]">

                            {/* Body */}
                            <div className="mx-4 mb-2">
                                <p className="mt-2 text-xl text-[#1D2F7F]">Your username</p>
                                <p className="opacity-60">Type your name as you want others to see it:</p>
                                <input
                                    type="text"
                                    className="w-[145px] border border-black border-opacity-25 h-6 mt-1 outline-none"
                                    value={username}
                                    onChange={handleNameChange}
                                />
                            </div>

                            <div className="mx-4 mb-2">
                                <p className="mt-2 text-xl text-[#1D2F7F]">Personal message</p>
                                <p className="opacity-60">Type a personal message for your contacts to see:</p>
                                <input
                                    type="text"
                                    className="w-[145px] border border-black border-opacity-25 h-6 mt-1 outline-none"
                                    value={bio}
                                    onChange={handleMessageChange}
                                />
                            </div>

                            {/* Footer */}
                            <div className="w-full bg-white h-[1px] shadow-sm shadow-[#6b8fa3]" />
                            <div className="flex items-center justify-end rounded-b win7 p-3 gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => applyAndClose()}
                                >
                                    Apply
                                </button>
                                <button type="button" onClick={() => setShowChangeNameAndBio(false)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
