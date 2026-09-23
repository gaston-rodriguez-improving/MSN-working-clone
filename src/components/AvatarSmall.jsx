import React, { useContext, useEffect, useState } from 'react';
import usertiles from '../imports/usertiles';
import statusFrames from '../imports/statusFrames';
import { AuthContext } from '../context/AuthContext';

const AvatarSmall = () => {
  const { user } = useContext(AuthContext);

  const [userStatus, setUserStatus] = useState(statusFrames.OnlineSmall);

  useEffect(() => {
    switch (user.status) {
      case 'online':
        setUserStatus(statusFrames.OnlineSmall);
        break;
      case 'offline':
        setUserStatus(statusFrames.OfflineSmall);
        break;
      case 'away':
        setUserStatus(statusFrames.AwaySmall);
        break;
      case 'busy':
        setUserStatus(statusFrames.BusySmall);
        break;
      default:
        setUserStatus(statusFrames.OnlineSmall);
        break;
    }
  }, [user.status, user]);

  return (
    <div className="h-[80px] w-[80px] relative">
      <img className="absolute m-[7px] rounded-sm w-[52px]" src={user.avatar !== "default" ? usertiles[user.avatar] : "./assets/usertiles/default.png"} alt="Avatar" />
      <img className="absolute w-full h-full bottom-2 right-2" src={userStatus} alt="Status Frame" />
    </div>
  );
};

export default AvatarSmall;
