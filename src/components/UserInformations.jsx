import { formatName } from '../helpers/stripHtml';
// UserInformation.jsx
import { useState, useEffect, useRef, useContext } from 'react';
import AvatarSmall from '../components/AvatarSmall';
import arrow from '/assets/general/arrow.png';
import Dropdown from './Dropdown';
import ChangeDisplayPictureModal from './ChangeDisplayPictureModal';
import statusFrames from '../imports/statusFrames';
import { replaceEmoticons } from '../helpers/replaceEmoticons';
import { updateBio } from '../data/api';
import { ChatContext } from '../contexts/ChatContext';
import { AuthContext } from '../contexts/AuthContext';
import ListeningStatus from './ListeningStatus';
import { listeningEnabled } from '../features/musicConfig';

const UserInformation = () => {
  const { user: account } = useContext(AuthContext);
  const { listeningActivities, listeningSharing, setListeningSharing } = useContext(ChatContext);
  const [user, setUser] = useState({
    message: account?.bio ?? localStorage.getItem('message') ?? '',
    status: localStorage.getItem('status') || 'Available',
    name: localStorage.getItem('name') || localStorage.getItem('discord_username') || '',
  });

  const ownActivity = account?.id == null ? null : listeningActivities[account.id];
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState(user.message || '');
  const [showChangePictureModal, setShowChangePictureModal] = useState(false);
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
      <div className="cursor-pointer" onClick={() => setShowChangePictureModal(true)}>
        <AvatarSmall />
      </div>
      <div className="ml-1 pt-1">
        <div className="flex items-center gap-1">
          <Dropdown options={options} value={user.status} onChange={handleStatusChange} showUserName />
        </div>
        <div className="flex w-fit max-w-full aerobutton pl-1 items-center white-light" onClick={handleMessageClick}>
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
              {ownActivity ? (
                <ListeningStatus activity={ownActivity} bio={message} />
              ) : !message ? (
                'Share a quick message...'
              ) : (
                <span
                  className="inline"
                  dangerouslySetInnerHTML={{
                    __html: replaceEmoticons(formatName(message, 80)),
                  }}
                ></span>
              )}
            </p>
          )}
          <div className="ml-1">
            <img src={arrow} alt="arrow icon" />
          </div>
        </div>
        {listeningEnabled && <label className="mt-1 flex items-center gap-1 text-[11px] text-[#24466a]">
          <input type="checkbox" checked={listeningSharing} onChange={(event) => setListeningSharing(event.target.checked).catch(() => {})} />
          Share what I’m listening to with friends
        </label>}
      </div>
      {showChangePictureModal && <ChangeDisplayPictureModal setShowChangePictureModal={setShowChangePictureModal} />}
    </div>
  );
};

export default UserInformation;
