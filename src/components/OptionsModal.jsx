import React, { useContext, useState } from 'react';
import '7.css/dist/7.scoped.css';
import line from '/assets/general/subtitles_line_options.png';
import defaultAvatar from '/assets/usertiles/default.png';
import { replaceEmoticons } from '../helpers/replaceEmoticons';
import { AuthContext } from '../contexts/AuthContext';

const ChangeDisplayPictureModal = ({ setShowOptionsModal }) => {
  const { user: account, updateUsername } = useContext(AuthContext);
  const [user, setUser] = useState({
    message: localStorage.getItem('message'),
    email: localStorage.getItem('email'),
    name: localStorage.getItem('name') || account?.username || '',
  });

  const [message, setMessage] = useState(user.message);
  const [name, setName] = useState(user.name);
  const [isModified, setIsModified] = useState(false);
  const [saveError, setSaveError] = useState('');
  const usernameChanged = name.trim() !== account?.username;

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    setIsModified(true);
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    setIsModified(true);
  };

  const handleApplyChanges = async () => {
    const normalizedName = name.trim();
    if (!isModified && !usernameChanged) return true;
    if (!normalizedName) {
      setSaveError('Display name cannot be empty.');
      return false;
    }

    try {
      if (usernameChanged) await updateUsername(normalizedName);
      // Update localStorage with new values
      localStorage.setItem('message', message);
      localStorage.setItem('name', normalizedName);
      setUser({ ...user, message, name: normalizedName });
      setName(normalizedName);
      setIsModified(false);
      setSaveError('');
      return true;
    } catch (error) {
      setSaveError(error.response?.data?.error || 'Unable to save your display name. Please try again.');
      return false;
    }
  };

  const handleOk = async () => {
    // Save changes before closing modal
    if (!(await handleApplyChanges())) return;
    setShowOptionsModal(false); // Close modal
  };

  const handleCloseModal = () => {
    setShowOptionsModal(false);
  };

  return (
    <>
      <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-[1100] outline-none focus:outline-none">
        <div className="relative w-[520px] my-6 mx-auto max-w-3xl">
          {/*content*/}
          <div className="msn-font rounded-lg shadow-lg relative flex flex-col w-full bg-[#f0f0f0] outline-none focus:outline-none h-[605px] border border-black border-opacity-35">
            {/*header*/}
            <div className="flex items-start justify-between rounded-t-lg bg-[#f3f3f3]">
              <div className="flex items-center ml-1">
                <p className="ml-1 pt-1">Options</p>
              </div>
              <button className="pb-2 pt-1 px-3 rounded-tr-lg hover:bg-red-700 hover:text-white" onClick={handleCloseModal}>
                <p className="text-[10px]">╳</p>
              </button>
            </div>

            <div className="flex pl-2 h-full w-full">
              <div className="border border-black bg-white w-[110px] mr-2 h-full">
                <div className="py-[5px] pl-1 hover:bg-[#0078d7] hover:text-white cursor-pointer m-[1px]">Personal</div>
                <div className="py-[5px] pl-1 hover:bg-[#0078d7] hover:text-white cursor-pointer m-[1px]">Layout</div>
                <div className="py-[5px] pl-1 hover:bg-[#0078d7] hover:text-white cursor-pointer m-[1px]">Sign In</div>
                <div className="py-[5px] pl-1 hover:bg-[#0078d7] hover:text-white cursor-pointer m-[1px]">Messages</div>
                <div className="py-[5px] pl-1 hover:bg-[#0078d7] hover:text-white cursor-pointer m-[1px]">Alerts</div>
                <div className="py-[5px] pl-1 hover:bg-[#0078d7] hover:text-white cursor-pointer m-[1px]">Sounds</div>
                <div className="py-[5px] pl-1 hover:bg-[#0078d7] hover:text-white cursor-pointer m-[1px]">File Transfer</div>
                <div className="py-[5px] pl-1 hover:bg-[#0078d7] hover:text-white cursor-pointer m-[1px]">Privacy</div>
                <div className="py-[5px] pl-1 hover:bg-[#0078d7] hover:text-white cursor-pointer m-[1px]">Security</div>
                <div className="py-[5px] pl-1 hover:bg-[#0078d7] hover:text-white cursor-pointer m-[1px]">Connection</div>
              </div>
              <div className="w-full pr-1">
                <fieldset className="border border-black border-opacity-10 h-full">
                  <legend className="font-bold ml-2">Personal</legend>
                  <div className="flex gap-1 mt-2">
                    <p className="ml-6">Display Name</p>
                    <div className="mt-[10px]">
                      <img src={line} />
                    </div>
                  </div>
                  <div className="ml-12 mt-1">
                    <div>
                      <p>Type your name as you want others to see it:</p>
                      <input
                        type="text"
                        className="w-[145px] border border-black border-opacity-25 h-6 mt-1 outline-none"
                        value={name}
                        onChange={handleNameChange}
                      />
                    </div>
                    <div className="mt-1">
                      <p>Type a personal message for your contacts to see:</p>
                      <input
                        type="text"
                        className="w-[290px] border border-black border-opacity-25 h-6 mt-1 outline-none"
                        value={message}
                        onChange={handleMessageChange}
                      />
                    </div>
                    {saveError && <p className="ml-12 mt-2 text-red-700">{saveError}</p>}
                  </div>
                </fieldset>
              </div>
            </div>

            {/*footer*/}
            <div className="flex items-center justify-end rounded-b win7 p-3 gap-1.5">
              <button type="button" onClick={handleOk}>
                OK
              </button>
              <button type="button" onClick={handleCloseModal}>
                Cancel
              </button>
              <button type="button" onClick={handleApplyChanges} disabled={!isModified && !usernameChanged}>
                Apply
              </button>
              <button type="button">Help</button>
            </div>
          </div>
        </div>
      </div>
      <div className="opacity-25 fixed inset-0 z-[1050] bg-black"></div>
    </>
  );
};

export default ChangeDisplayPictureModal;
