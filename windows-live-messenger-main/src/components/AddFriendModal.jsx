import { useEffect, useState } from 'react';
import WLMIcon from '/assets/general/wlm-icon.png';
import { getUsers } from '../data/api';

const AddFriendModal = ({ onClose, onSend }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('Hi! Let’s connect on Windows Live Messenger.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!search.trim()) return setUsers([]);
      setLoading(true);
      try {
        const { data } = await getUsers(search.trim());
        if (!cancelled) setUsers(data.users || []);
      } catch {
        if (!cancelled) setError('We could not search for that person.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search]);

  const submit = async (event) => {
    event.preventDefault();
    if (!selectedUser) return setError('Select a person to invite.');
    setLoading(true);
    setError('');
    try {
      await onSend(selectedUser.id, message);
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'The invitation could not be sent.');
    } finally {
      setLoading(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="msn-font relative w-[430px] rounded-lg bg-white shadow-xl">
      <div className="flex items-center justify-between rounded-t-lg bg-[#f3f3f3] px-2 py-1">
        <div className="flex items-center gap-1 text-[12px]"><img src={WLMIcon} alt="" className="h-4 w-4" /> Add a Friend</div>
        <button type="button" className="rounded px-2 hover:bg-red-700 hover:text-white" onClick={onClose}>×</button>
      </div>
      <form onSubmit={submit} className="p-4 text-[12px]">
        <p className="mb-2 text-[18px] text-[#1D2F7F]">Add someone to your contacts</p>
        <p className="mb-2">Search by Messenger name or email address:</p>
        <input autoFocus value={search} onChange={(event) => { setSearch(event.target.value); setSelectedUser(null); setError(''); }} placeholder="Search for a person" className="searchbar w-full rounded border border-[#9bb7c9] bg-white px-2 py-1 outline-none" />
        <div className="mt-2 min-h-[58px] rounded border border-[#c5d5df] bg-[#f7fbfd] p-1">
          {loading && <p className="p-2 text-gray-500">Searching...</p>}
          {!loading && search.trim() && !users.length && <p className="p-2 text-gray-500">No people found.</p>}
          {users.map((person) => <button type="button" key={person.id} onClick={() => setSelectedUser(person)} className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-[#d9effb] ${selectedUser?.id === person.id ? 'bg-[#c6e8fa]' : ''}`}>
            <img src={person.avatar === 'default' ? '/assets/usertiles/default.png' : person.avatar} alt="" className="h-8 w-8 rounded" />
            <span><strong>{person.username}</strong><br /><span className="text-gray-500">{person.email}</span></span>
          </button>)}
        </div>
        <label className="mt-3 block">Personal message (optional):</label>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows="2" className="mt-1 w-full resize-none rounded border border-[#9bb7c9] px-2 py-1 outline-none" />
        {selectedUser && <p className="mt-2 text-[#1D2F7F]">Invitation will be sent to <strong>{selectedUser.username}</strong>.</p>}
        {error && <p className="mt-2 text-red-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={loading || !selectedUser}>{loading ? 'Sending...' : 'Send invitation'}</button>
        </div>
      </form>
    </div>
    <div className="fixed inset-0 -z-10 bg-black opacity-25" />
  </div>;
};

export default AddFriendModal;
