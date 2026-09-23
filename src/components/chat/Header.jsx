import React, { useState, useEffect, useRef, useContext } from 'react';
import AvatarSmall from '../AvatarSmall';
import Dropdown from '../dropdown/Dropdown';
import statusFrames from '../../imports/statusFrames';
import { replaceEmoticons } from '../../helpers/replaceEmoticons';
import { AuthContext } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function Header() {
    const { user, changeBio } = useContext(AuthContext);
    const { t } = useTranslation("chat");

    const [isEditing, setIsEditing] = useState(false);
    const [bio, setBio] = useState(user.bio || "");
    const inputRef = useRef(null);

    useEffect(() => {
        setBio(user.bio || "");
    }, [user.bio]);

    const handleInputChange = (e) => {
        setBio(e.target.value);
        adjustInputWidth();
    };

    const handleInputBlur = () => {
        changeBio(bio);
        localStorage.setItem('bio', bio); // opcional
        setIsEditing(false);
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // evita quebra de linha
            inputRef.current.blur(); // força blur para salvar
        }
    };

    const adjustInputWidth = () => {
        if (inputRef.current) {
            inputRef.current.style.width = `${inputRef.current.value.length || 1}ch`;
        }
    };

    useEffect(() => {
        if (isEditing) {
            adjustInputWidth();
        }
    }, [isEditing]);

    const options = [
        { value: 'online', label: t('status.online'), image: statusFrames.onlineDot },
        { value: 'busy', label: t('status.busy'), image: statusFrames.busyDot },
        { value: 'away', label: t('status.away'), image: statusFrames.awayDot },
        { value: 'offline', label: t('status.offline'), image: statusFrames.offlineDot },
        { separator: true },
        { value: 'Sign out', label: t('dropdown.logout') },
        { separator: true },
        { value: 'ChangeDisplayPicture', label: t('dropdown.picture') },
        { value: 'ChangeScene', label: t('dropdown.scene') },
        { value: 'ChangeDisplayName', label: t('dropdown.name') },
    ];

    return (
        <div className="flex">
            <AvatarSmall />
            <div className="ml-[-12px]">
                <div className="flex items-center">
                    <Dropdown options={options} value={user.username} />
                </div>

                {isEditing ? (
                    <div className="ml-[9.5px] relative inline-block cursor-pointer">
                        <input
                            ref={inputRef}
                            type="text"
                            value={bio}
                            onChange={handleInputChange}
                            onKeyDown={handleInputKeyDown}
                            onBlur={handleInputBlur}
                            autoFocus
                            className="border w-full border-gray-300 rounded outline-none bg-transparent"
                        />
                    </div>
                ) : (
                    <p
                        className="ml-[9.5px] text-gray-700 bg-transparent relative inline-block cursor-pointer"
                        onClick={() => setIsEditing(true)}
                    >
                        {!bio ? (
                            t('header-message')
                        ) : (
                            <p
                                className="flex gap-1 max-w-56 truncated"
                                dangerouslySetInnerHTML={{
                                    __html: replaceEmoticons(bio),
                                }}
                            />
                        )}
                    </p>
                )}

                <div className="flex aerobutton pl-1 ml-1 items-center white-light" onClick={() => setIsEditing(true)}>
                    <div className="ml-1">
                        <img src="./assets/general/arrow.png" alt="arrow icon" />
                    </div>
                </div>
            </div>
        </div>
    );
}
