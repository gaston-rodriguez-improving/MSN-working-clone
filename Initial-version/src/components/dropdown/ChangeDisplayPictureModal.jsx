import React, { useState, useRef, useContext } from 'react';
import '7.css/dist/7.scoped.css';
import usertiles from '../../imports/usertiles';
import { AuthContext } from '../../context/AuthContext';
import statusLarge from '../../imports/statusLarge';

export default function ChangeDisplayPictureModal({ setShowChangePictureModal }) {
  const { user, changeAvatar } = useContext(AuthContext);

  const [userPicture, setUserPicture] = useState(user.avatar);
  const fileInputRef = useRef(null);

  const updateUserPicture = (name) => {
    setUserPicture(name)
  };

  const removeUserPicture = () => {
    setUserPicture("default");
  };

  function applyAndClose() {
    if (user.avatar !== userPicture) {
      changeAvatar(userPicture);
    }
    setShowChangePictureModal(false);
  }

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const croppedImage = cropToSquare(img);
          updateUserPicture(croppedImage);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const cropToSquare = (image) => {
    const canvas = document.createElement('canvas');
    const size = Math.min(image.width, image.height);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const x = (image.width - size) / 2;
    const y = (image.height - size) / 2;

    ctx.drawImage(image, x, y, size, size, 0, 0, size, size);
    return canvas.toDataURL('image/png');
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-xs">

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
              <button aria-label="Close" onClick={() => setShowChangePictureModal(false)}></button>
            </div>
          </div>
          <div className="window-body">

            <div className="flex flex-col w-full bg-white bg-gradient-to-t from-[#c3d4ec83] via-white to-[#c3d4ec83]">

              {/* Body */}
              <div className="mx-4 mb-2">
                <p className="mt-2 text-xl text-[#1D2F7F]">Select a display picture</p>
                <p className="opacity-60">Choose how you want to appear in Messenger:</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center ml-2">
                <div className="win7">
                  <div className="flex flex-wrap gap-2.5 h-32 sm:h-[255px] w-full sm:w-52 overflow-y-auto p-2.5 has-scrollbar mb-2">
                    <div className="font-bold w-full mb-[-5px]">Regular pictures</div>
                    {Object.entries(usertiles).map(([name, src]) => (
                      <div key={name} onClick={() => updateUserPicture(name)} className="cursor-pointer">
                        <img src={src} alt={name} className="w-12 shadow-lg usertiles-shadow border border-hidden" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex sm:flex-col flex-row gap-5 sm:gap-0 items-center mx-4">
                  <div className="mb-5">
                    <div className="h-28 w-28">
                      <img
                        className="absolute ml-[9px] mt-[8px] w-24 rounded-sm"
                        src={userPicture !== "default" ? usertiles[userPicture] : "./assets/usertiles/default.png"}
                        alt="Avatar"
                      />

                      <img
                        className="absolute ml-[-10px] mt-[-7px]"
                        src={statusLarge[user.status]}
                        alt="Frame"
                      />
                    </div>
                  </div>
                  <div className="win7 flex flex-col w-28 gap-0.5">
                    <button disabled>Webcam...</button>
                    <button disabled onClick={handleButtonClick}>Browse...</button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    <button onClick={removeUserPicture}>Remove</button>
                    <button disabled>Modify...</button>
                  </div>
                </div>
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
                <button type="button" onClick={() => setShowChangePictureModal(false)}>
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
