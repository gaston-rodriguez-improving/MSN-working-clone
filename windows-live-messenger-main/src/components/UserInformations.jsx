// UserInformation.jsx
import React, { useState, useEffect, useRef } from 'react';
import AvatarSmall from '../components/AvatarSmall';
import arrow from '/assets/general/arrow.png';
import Dropdown from './Dropdown';
import statusFrames from '../imports/statusFrames';
import { replaceEmoticons } from '../helpers/replaceEmoticons';
import { updateBio } from '../data/api';

const UserInformation = () => {
  const [user, setUser] = useState({
    message: localStorage.getItem('message') || '',
    status: localStorage.getItem('status') || 'Available',
    name: localStorage.getItem('name') || localStorage.getItem('discord_username') || '',
  });

  const account = JSON.parse(localStorage.getItem('messenger_user') || 'null');
  const displayName = user.name || account?.username || account?.email || 'User';
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState(user.message || '');
  const inputRef = useRef(null);

  const options = [
    { value: 'Available', label: 'online', image: statusFrames.onlineDot },
    { value: 'Busy', label: 'busy', image: statusFrames.busyDot },
    { value: 'Away', label: 'away', image: statusFrames.awayDot },
    {
      value: 'Offline',
      label: 'offline',
      image: statusFrames.offlineDot,
    },
    { separator: true },
    { value: 'Sign out', label: 'Sign out' },
    { separator: true },
    { value: 'ChangeDisplayPicture', label: 'Change display picture...' },
    { value: 'ChangeScene', label: 'Change scene...' },
    { value: 'ChangeDisplayName', label: 'Change display name...' },
  ];

  const handleMessageClick = () => {
    setIsEditing(true);
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    adjustInputWidth();
  };

  const handleInputBlur = async () => {
    setUser({ ...user, message });
    localStorage.setItem('message', message);
    setIsEditing(false);
    await updateBio(message).catch(() => {});
  };

  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  const adjustInputWidth = () => {
    if (inputRef.current) {
      inputRef.current.style.width = `${Math.max(inputRef.current.value.length + 2, 12)}ch`;
    }
  };

  useEffect(() => {
    if (isEditing) {
      adjustInputWidth();
    }
  }, [isEditing]);

  const handleStatusChange = (status) => {
    setUser({ ...user, status });
    localStorage.setItem('status', status);
  };
  return (
    <div className="flex items-start">
      <AvatarSmall />
      <div className="ml-1 pt-1">
        <div className="flex items-center gap-1">
          <Dropdown options={options} value={user.status} onChange={handleStatusChange} showUserName />
        </div>
        <div className="flex aerobutton pl-1 items-center white-light" onClick={handleMessageClick}>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyPress={handleInputKeyPress}
              autoFocus
              className="border border-gray-300 rounded outline-none"
              style={{ width: `${Math.max(message.length + 2, 12)}ch` }}
            />
          ) : (
            <p className="cursor-pointer flex gap-1">
              {!message ? (
                'Share a quick message...'
              ) : (
                <span
                  className="flex gap-1"
                  dangerouslySetInnerHTML={{
                    __html: replaceEmoticons(message),
                  }}
                ></span>
              )}
            </p>
          )}
          <div className="ml-1">
            <img src={arrow} alt="arrow icon" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInformation;
