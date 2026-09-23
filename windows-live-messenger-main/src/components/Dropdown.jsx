import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import arrow from '/assets/general/arrow.png';
import ChangeDisplayPictureModal from './ChangeDisplayPictureModal';
import OptionsModal from './OptionsModal';
import { replaceEmoticons } from '../helpers/replaceEmoticons';
import ChangeSceneModal from '../components/ChangeSceneModal';

const Dropdown = ({ options = [], onChange, showStatusDots = false, showUserName = true, value }) => {
  const [user, setUser] = useState({
    loggedin: localStorage.getItem('loggedin') || '',
    email: localStorage.getItem('email') || '',
    message: localStorage.getItem('message') || '',
    status: value || localStorage.getItem('status') || 'Available',
    name:
      localStorage.getItem('name') ||
      localStorage.getItem('discord_username') ||
      JSON.parse(localStorage.getItem('messenger_user') || 'null')?.username ||
      '',
  });

  const [changePictureShowModal, setShowChangePictureModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showChangeSceneModal, setShowChangeSceneModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState(
    options.find((option) => option.value === user.status) || options.find((option) => !option.separator) || { value: '', label: '' },
  );
  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const handleOptionClick = (option) => {
    switch (option.value) {
      case 'Available':
      case 'Busy':
      case 'Away':
      case 'Offline':
        setSelectedOption(option);
        user.loggedin ? localStorage.setItem('status', option.value) : null;
        onChange(option.value);
        break;
      case 'Sign out':
        localStorage.removeItem('loggedin');
        navigate('/login');
        break;
      case 'ChangeDisplayPicture':
        setShowChangePictureModal(true);
        break;
      case 'ChangeScene':
        setShowChangeSceneModal(true);
        break;
      case 'ChangeDisplayName':
        setShowOptionsModal(true);
        break;
      default:
        break;
    }
    setIsOpen(false);
  };

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={handleToggleDropdown} className="aerobutton flex cursor-pointer items-baseline gap-2 mt-2.5 white-light">
        <div className="flex items-center gap-2">
          {showStatusDots && selectedOption.image && (
            <img src={selectedOption.image} alt={selectedOption.label} className="inline-block mt-0.5 mr-1 w-2" />
          )}

          {showUserName && (user.name || user.email) && (
            <p
              className="text-[20px] my-[-5px] glow"
              dangerouslySetInnerHTML={{ __html: replaceEmoticons(user.name || user.email) }}
            />
          )}

          <p className="glow">({selectedOption.label})</p>
        </div>
        {/* )} */}
        <img src={arrow} className="inline-block w-[7px]" alt="Toggle Dropdown" />
      </div>

      {isOpen && (
        <ul className="absolute bg-white border border-gray-300 rounded shadow w-[300px] mt-1 z-10 py-1">
          {options.map((option, index) =>
            option.separator ? (
              <li key={`separator-${index}`} className="border-t my-1"></li>
            ) : (
              <li
                key={option.value}
                className="px-4 hover:bg-gray-100 cursor-pointer flex items-center"
                onClick={() => handleOptionClick(option)}
              >
                {option.image ? (
                  <img src={option.image} alt={option.label} className="inline-block mt-0.5 mr-2 w-2" />
                ) : (
                  <div className="w-4" />
                )}
                {option.label}
              </li>
            )
          )}
        </ul>
      )}

      {changePictureShowModal && <ChangeDisplayPictureModal setShowChangePictureModal={setShowChangePictureModal} />}
      {showOptionsModal && <OptionsModal setShowOptionsModal={setShowOptionsModal} />}
      {showChangeSceneModal && <ChangeSceneModal setShowChangeSceneModal={setShowChangeSceneModal} />}
    </div>
  );
};

export default Dropdown;
