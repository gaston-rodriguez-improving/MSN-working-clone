import React, { useState, useContext, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import pinnedEmoticons from '../../imports/pinnedEmoticons';
import EmoticonContext from '../../context/EmoticonContext';

const EmoticonSelector = () => {
  const { t } = useTranslation("chat")

  const [isOpen, setIsOpen] = useState(false);
  const [recentEmoticons, setRecentEmoticons] = useState([]);
  const { setSelectedEmoticon } = useContext(EmoticonContext);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const savedEmoticons = JSON.parse(localStorage.getItem('recentEmoticons'));
    if (savedEmoticons) {
      setRecentEmoticons(savedEmoticons);
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
    localStorage.setItem('recentEmoticons', JSON.stringify(recentEmoticons));
  }, [recentEmoticons]);

  const handleEmoticonClick = (alias) => {
    setSelectedEmoticon(alias);
    setIsOpen(false);

    setRecentEmoticons((prev) => {
      const updatedRecentEmoticons = [alias, ...prev.filter((item) => item !== alias)];
      return updatedRecentEmoticons.slice(0, 11);
    });
  };

  const uniqueEmoticonMap = new Map();
  Object.entries(pinnedEmoticons).forEach(([alias, src]) => {
    if (!uniqueEmoticonMap.has(src)) {
      uniqueEmoticonMap.set(src, alias);
    }
  });

  const displayRecentEmoticons = [...recentEmoticons, ...Array(11 - recentEmoticons.length).fill(null)];

  return (
    <>
      {/* Dropdown button */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center aerobutton p-1 h-6" onClick={() => setIsOpen(!isOpen)}>
          <div className="w-5">
            <img src="./assets/chat/select_emoticon.png" alt="Select Emoticon" />
          </div>
          <div>
            <img src="./assets/general/arrow.png" alt="Dropdown Arrow" />
          </div>
        </div>

        {/* Dropdown options */}
        {isOpen && (
          <div className="absolute w-[384px] h-auto bottom-[19px] left-[-9px] m-2 bg-white border border-gray-300 p-1">
            <div className="w-full border-b pb-1 flex justify-between">
              <p className="font-bold">{t("emoticons.title")}</p>
              <p className="link">{t("emoticons.all")}</p>
            </div>
            <div>
              <p className="my-1 opacity-75">{t("emoticons.recently")}</p>
              <div className="w-full border-b flex justify-center gap-1.5 pb-0.5">
                {displayRecentEmoticons.map((alias, index) => (
                  <div
                    key={index}
                    className="cursor-pointer border w-7 h-7 flex justify-center items-center"
                    onClick={() => alias && handleEmoticonClick(alias)}
                  >
                    {alias && <img src={pinnedEmoticons[alias]} alt={alias} />}
                  </div>
                ))}
              </div>
              <p className="my-1 opacity-75">{t("emoticons.pinned")}</p>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {Array.from(uniqueEmoticonMap.entries()).map(([src, alias]) => (
                <div
                  key={alias}
                  className="cursor-pointer border w-7 h-7 flex justify-center items-center"
                  onClick={() => handleEmoticonClick(alias)}
                >
                  <div>
                    <img src={src} alt={alias} />
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

export default EmoticonSelector;
