import { useState } from 'react';
import WLMIcon from '/assets/general/wlm-icon.png';

const ContactListLayoutModal = ({ viewMode, onClose, onApply }) => {
  const [selectedView, setSelectedView] = useState(viewMode);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="msn-font relative w-[470px] max-w-[calc(100vw-24px)] rounded-lg border border-[#8098a7] bg-[#f0f0f0] shadow-xl" role="dialog" aria-modal="true" aria-labelledby="contact-layout-title">
        <div className="flex items-center justify-between rounded-t-lg bg-[#f3f3f3] px-2 py-1">
          <div className="flex items-center gap-1 text-[12px]"><img src={WLMIcon} alt="" className="h-4 w-4" /> Contact List Layout</div>
          <button type="button" className="rounded px-2 hover:bg-red-700 hover:text-white" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="p-4 text-[12px]">
          <p id="contact-layout-title" className="mb-3 text-[18px] text-[#1D2F7F]">Choose how to organize your contacts</p>
          <fieldset className="rounded border border-[#aebdc7] bg-white p-3">
            <legend className="px-1">Display contacts by</legend>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-[#e8f5fb]">
              <input type="radio" name="contact-view" value="status" checked={selectedView === 'status'} onChange={() => setSelectedView('status')} />
              <span><strong>Online status</strong><span className="block text-gray-500">Show Available and Offline contact lists.</span></span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-[#e8f5fb]">
              <input type="radio" name="contact-view" value="categories" checked={selectedView === 'categories'} onChange={() => setSelectedView('categories')} />
              <span><strong>Categories</strong><span className="block text-gray-500">Show your custom categories and uncategorized contacts.</span></span>
            </label>
          </fieldset>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="button" onClick={() => { onApply(selectedView); onClose(); }}>OK</button>
          </div>
        </div>
      </div>
      <div className="fixed inset-0 -z-10 bg-black opacity-25" />
    </div>
  );
};

export default ContactListLayoutModal;
