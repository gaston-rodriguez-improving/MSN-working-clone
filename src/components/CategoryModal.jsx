import { useEffect, useState } from 'react';
import WLMIcon from '/assets/general/wlm-icon.png';

const CategoryModal = ({ initialName = '', onClose, onSave }) => {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const isRename = Boolean(initialName);

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const submit = (event) => {
    event.preventDefault();
    const result = onSave(name.trim());
    if (result) {
      setError(result);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="msn-font relative w-[390px] max-w-[calc(100vw-24px)] rounded-lg border border-[#8098a7] bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
        <div className="flex items-center justify-between rounded-t-lg bg-[#f3f3f3] px-2 py-1">
          <div className="flex items-center gap-1 text-[12px]"><img src={WLMIcon} alt="" className="h-4 w-4" />{isRename ? 'Rename Category' : 'Create a Category'}</div>
          <button type="button" className="rounded px-2 hover:bg-red-700 hover:text-white" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={submit} className="p-4 text-[12px]">
          <p id="category-modal-title" className="mb-2 text-[18px] text-[#1D2F7F]">{isRename ? 'Rename this category' : 'Create a new category'}</p>
          <label htmlFor="category-name">Category name:</label>
          <input id="category-name" autoFocus maxLength={40} value={name} onChange={(event) => { setName(event.target.value); setError(''); }} className="mt-1 w-full rounded border border-[#9bb7c9] bg-white px-2 py-1 outline-none focus:border-[#179bf3]" />
          {error && <p className="mt-2 text-red-700">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={!name.trim()}>{isRename ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </div>
      <div className="fixed inset-0 -z-10 bg-black opacity-25" />
    </div>
  );
};

export default CategoryModal;
