import React, { useState, useRef, useEffect, useContext } from 'react';
import '7.css/dist/7.scoped.css';
import scenes from '../../imports/scenes';
import colorSchemes from '../../imports/colorSchemes';
import { AuthContext } from '../../context/AuthContext';
import Color from 'color-thief-react';

export default function ChangeBannerModal({ setShowChangeBannerModal }) {
  const { user, changeBanner } = useContext(AuthContext);

  const [userBanner, setUserBanner] = useState(user.banner);
  const [userColorScheme, setUserColorScheme] = useState(localStorage.getItem('colorScheme'));
  const [selected, setSelected] = useState(null);

  const updateUserBanner = (banner) => {
    setUserBanner(banner);
  };

  const updateUserColorScheme = (color) => {
    setUserColorScheme(color);
  };

  function applyAndClose() {
    if (userBanner !== user.banner) {
      changeBanner(userBanner);
    }
    localStorage.setItem('colorScheme', userColorScheme);
    setShowChangeBannerModal(false);
  }

  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageSrc = event.target.result;
        updateUserBanner(imageSrc);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClick = (name) => {
    setSelected(name);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-xs">

      <div className="justify-center mt-6 items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none">
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
              Scene
            </div>
            <div className="title-bar-controls">
              <button aria-label="Close" onClick={() => setShowChangeBannerModal(false)}></button>
            </div>
          </div>
          <div className="window-body">

            <div className="flex flex-col w-full bg-white bg-gradient-to-t from-[#c3d4ec83] via-white to-[#c3d4ec83]">

              {/* Body */}
              <div className="mx-4 mb-2">
                <p className="mt-2 text-xl text-[#1D2F7F]">Select a scene</p>
                <p className="opacity-60">The people you chat with will see the scene and color scheme you choose.</p>
              </div>

              <div className="flex flex-row items-center ml-2">
                <div className="win7">
                  <div className="flex flex-wrap sm:w-[360px] h-[140px] overflow-y-auto p-2.5 has-scrollbar mb-2">
                    {Object.entries(scenes).map(([name, src]) => (
                      <div
                        key={name}
                        className={`hoverscene p-0.5 py-1 px-1 rounded-sm ${selected === name ? 'selectedscene' : ''}`}
                        onClick={() => handleClick(name)}
                      >
                        <div
                          onClick={() => updateUserBanner(name)}
                          className="cursor-pointer w-24 shadow-lg usertiles-shadow border border-hidden"
                        >
                          <img src={src} alt={name} className="object-cover h-12" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                  <button disabled className="ml-2 mt-1 mb-1" onClick={handleButtonClick}>
                    Browse...
                  </button>
                  <div className="win7 mr-4 mb-4">
                    <p className="ml-2 text-[16px] text-[#1D2F7F]">Select a color scheme</p>
                    <div className="flex gap-1.5 ml-2.5 m-2 mb-2">
                      {userBanner && (
                        <Color src={userBanner} crossOrigin="anonymous" format="hex">
                          {({ data }) => {
                            useEffect(() => {
                              if (data) {
                                updateUserColorScheme(data);
                              }
                            }, [data]);

                            return (
                              <div className="cursor-pointer flex">
                                <div style={{ backgroundColor: data }} className="w-[18px] h-[18px] absolute rounded-[3px]"></div>
                                <img src="/assets/color_schemes/smoke.png" alt="" className="mix-blend-luminosity" />
                              </div>
                            );
                          }}
                        </Color>
                      )}
                      {Object.entries(colorSchemes).map(([name, src]) => (
                        <div key={name} onClick={() => updateUserColorScheme(src)} className="cursor-pointer">
                          <img src={src} alt={name} />
                        </div>
                      ))}
                    </div>
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
                <button type="button" onClick={() => setShowChangeBannerModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};