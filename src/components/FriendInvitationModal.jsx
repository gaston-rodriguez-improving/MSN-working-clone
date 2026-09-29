import { useState } from 'react';
import WLMIcon from '/assets/general/wlm-icon.png';

const FriendInvitationModal = ({ request, onRespond, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const person = request.user;
  const respond = async (status) => {
    setLoading(true);
    try {
      await onRespond(request.id, status);
      onClose();
    } catch {
      setError('The invitation could not be updated.');
    } finally {
      setLoading(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="msn-font relative w-[430px] rounded-lg bg-white shadow-xl">
      <div className="flex items-center justify-between rounded-t-lg bg-[#f3f3f3] px-2 py-1">
        <div className="flex items-center gap-1 text-[12px]"><img src={WLMIcon} alt="" className="h-4 w-4" /> Friend invitation</div>
        <button type="button" className="rounded px-2 hover:bg-red-700 hover:text-white" onClick={onClose}>×</button>
      </div>
      <div className="p-4 text-[12px]">
        <p className="mb-3 text-[18px] text-[#1D2F7F]">{person.username} wants to add you</p>
        <div className="flex gap-3 rounded border border-[#c5d5df] bg-[#f7fbfd] p-3">
          <img src={person.avatar === 'default' ? '/assets/usertiles/default.png' : person.avatar} alt="" className="h-16 w-16 rounded" />
          <div><strong>{person.username}</strong><p className="mt-1 text-gray-600">{request.message || 'Would like to add you to their contacts.'}</p></div>
        </div>
        {error && <p className="mt-2 text-red-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={loading} onClick={() => respond('declined')}>Decline</button>
          <button type="button" disabled={loading} onClick={() => respond('accepted')}>{loading ? 'Updating...' : 'Accept'}</button>
        </div>
      </div>
    </div>
    <div className="fixed inset-0 -z-10 bg-black opacity-25" />
  </div>;
};

export default FriendInvitationModal;
