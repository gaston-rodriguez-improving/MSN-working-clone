/* eslint react/prop-types: off */
import { useEffect, useRef, useState } from 'react';

export default function AddTrackDialog({ open, busy, error, onSubmit, onClose, folderName, isPersonal }) {
  const dialogRef = useRef(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) {
      setUrl(''); setTitle(''); setArtist('');
      dialog.showModal();
      dialog.querySelector('input')?.focus();
    } else if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={dialogRef} className="winamp-add-dialog" aria-labelledby="winamp-add-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
      <div className="winamp-dialog-title"><span className="winamp-dialog-rule" /><h2 id="winamp-add-title">ADD YOUTUBE TRACK</h2><span className="winamp-dialog-rule" /><button type="button" aria-label="Close add track dialog" disabled={busy} onClick={onClose}>×</button></div>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit({ url, title: title.trim(), artist: artist.trim() }); }}>
        <p>Add a song to {folderName || 'the playlist'}.{isPersonal ? ' Only you can see this playlist.' : ' Shared with the company.'}</p>
        <label htmlFor="winamp-track-url">YouTube URL</label>
        <input id="winamp-track-url" required type="url" maxLength={2048} placeholder="https://youtu.be/…" value={url} onChange={(event) => setUrl(event.target.value)} />
        <label htmlFor="winamp-track-title">Track title</label>
        <input id="winamp-track-title" required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} />
        <label htmlFor="winamp-track-artist">Artist <span>(optional)</span></label>
        <input id="winamp-track-artist" maxLength={80} value={artist} onChange={(event) => setArtist(event.target.value)} />
        {error && <p className="winamp-dialog-error" role="alert">{error}</p>}
        <div className="winamp-dialog-buttons"><button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add to playlist'}</button><button type="button" disabled={busy} onClick={onClose}>Cancel</button></div>
      </form>
    </dialog>
  );
}
