/* eslint react/prop-types: off */
import { useEffect, useRef, useState } from 'react';

export default function NewFolderDialog({ open, busy, error, onSubmit, onClose }) {
  const ref = useRef(null);
  const [name, setName] = useState('');
  useEffect(() => {
    if (open && !ref.current.open) { setName(''); ref.current.showModal(); }
    else if (!open && ref.current.open) ref.current.close();
  }, [open]);
  return <dialog ref={ref} className="winamp-add-dialog" aria-labelledby="folder-dialog-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="winamp-dialog-title"><span className="winamp-dialog-rule" /><h2 id="folder-dialog-title">NEW SHARED FOLDER</h2><span className="winamp-dialog-rule" /></div>
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(name.trim()); }}>
      <p>Everyone in the company can listen and add songs. Only admins can delete this folder.</p>
      <label htmlFor="folder-name">Folder name</label>
      <input autoFocus id="folder-name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
      {error && <p role="alert" className="winamp-dialog-error">{error}</p>}
      <div className="winamp-dialog-buttons"><button disabled={busy || !name.trim()} type="submit">{busy ? 'Creating…' : 'Create folder'}</button><button disabled={busy} type="button" onClick={onClose}>Cancel</button></div>
    </form>
  </dialog>;
}
