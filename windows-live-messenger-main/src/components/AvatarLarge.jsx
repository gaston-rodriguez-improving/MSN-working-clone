import React from 'react';
import defaultAvatar from '/assets/usertiles/default.png';
import statusFrames from '../imports/statusFrames';

const AvatarLarge = ({ image, status }) => {
  const discordId = localStorage.getItem('discord_id');
  const currentStatus = String(status || localStorage.getItem('status') || 'offline').toLowerCase();
  const frameByStatus = {
    available: statusFrames.OnlineLarge,
    online: statusFrames.OnlineLarge,
    busy: statusFrames.BusyLarge,
    away: statusFrames.AwayLarge,
    offline: statusFrames.OfflineLarge,
  };
  const frameUrl = frameByStatus[currentStatus] || statusFrames.OfflineLarge;
  const avatarUrl = typeof image === 'string' && image ? image : discordId ? `https://api.t3d.uk/discord/avatar/${discordId}` : defaultAvatar;

  return (
    <div className="relative h-[126px] w-[134px] shrink-0">
      <img className="absolute left-[18px] top-[14px] h-[98px] w-[98px] rounded-sm object-cover" src={avatarUrl} alt="Avatar" />
      <img className="absolute left-0 top-0 h-[126px] w-[134px]" src={frameUrl} alt="Frame" />
    </div>
  );
};

export default AvatarLarge;
