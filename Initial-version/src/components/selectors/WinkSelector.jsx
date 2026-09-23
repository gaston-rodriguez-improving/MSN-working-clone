import React, { useState, useEffect, useRef, useContext } from 'react';
import { useTranslation } from 'react-i18next';

import { winks, winks_icons } from '../../imports/winks';
import { ChatContext } from '../../context/ChatContext';

const WinkSelector = ({ chatId }) => {
  const { t } = useTranslation("chat")
  const { sendWink } = useContext(ChatContext);

  const [isOpen, setIsOpen] = useState(false);
  const [recentWinks, setRecentWinks] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const savedWinks = JSON.parse(localStorage.getItem('recentWinks'));
    if (savedWinks) {
      setRecentWinks(savedWinks);
    }

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('recentWinks', JSON.stringify(recentWinks));
  }, [recentWinks]);

  const handleWinkClick = (alias) => {
    setIsOpen(false);

    // Update recent winks
    setRecentWinks((prev) => {
      const updatedRecentWinks = [alias, ...prev.filter((item) => item !== alias)];
      return updatedRecentWinks.slice(0, 11);
    });

    sendWink(alias, chatId)
  };

  // Ensure there are 11 slots for recently used winks
  const displayRecentWinks = [...recentWinks, ...Array(11 - recentWinks.length).fill(null)];

  return (
    <>
      {/* Dropdown button */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center aerobutton p-1 h-6" onClick={() => setIsOpen(!isOpen)}>
          <div className="w-5">
            <img src="./assets/chat/select_wink.png" alt="Select Wink" />
          </div>
          <div>
            <img src="./assets/general/arrow.png" alt="Dropdown Arrow" />
          </div>
        </div>

        {/* Dropdown options */}
        {isOpen && (
          <div className="absolute w-[384px] h-auto bottom-[19px] left-[-9px] m-2 bg-white border border-gray-300 p-1">
            <div className="w-full border-b pb-1 flex justify-between">
              <p className="font-bold">{t("winks.title")}</p>
              <p className="link">{t("winks.all")}</p>
            </div>
            <div>
              <p className="my-1 opacity-75">{t("winks.recently")}</p>
              <div className="w-full border-b flex justify-center gap-1.5 pb-0.5">
                {displayRecentWinks.map((alias, index) => (
                  <div
                    key={index}
                    className="cursor-pointer border w-7 h-7 flex justify-center items-center"
                    onClick={() => alias && handleWinkClick(alias)}
                  >
                    {alias && <img src={winks_icons[`${alias}_icon`]} alt={alias} />}
                  </div>
                ))}
              </div>
              <p className="my-1 opacity-75">{t("winks.pinned")}</p>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {Object.keys(winks).map((alias) => (
                <div
                  key={alias}
                  className="cursor-pointer border w-7 h-7 flex justify-center items-center"
                  onClick={() => handleWinkClick(alias)}
                >
                  <div>
                    <img src={winks_icons[`${alias}_icon`]} alt={alias} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default WinkSelector;
