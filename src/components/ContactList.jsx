import { formatName } from '../helpers/stripHtml';
import { useContext, useState } from 'react';
import { ChatContext } from '../contexts/ChatContext';
import online from '/assets/status/online-dot.png';
import busy from '/assets/status/busy-dot.png';
import away from '/assets/status/away-dot.png';
import offline from '/assets/status/offline-dot.png';
import favoritesIcon from '/assets/general/favorites.png';
import openTabArrow from '/assets/general/open_tab_arrow.png';
import closedTabArrow from '/assets/general/closed_tab_arrow.png';
import { replaceEmoticons } from '../helpers/replaceEmoticons';
import { useNavigate } from 'react-router-dom';

const ContactCategory = ({ title, contacts, count, onOpenChat, onContextMenu, onDropContact, categoryId }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDropTarget(false);
    const contactId = event.dataTransfer.getData('text/plain');
    if (contactId) onDropContact?.(contactId);
  };

  return (
    <div
      className={`mt-2 ${isDropTarget ? 'rounded bg-[#d9effb]' : ''}`}
      onDragOver={onDropContact ? (event) => { event.preventDefault(); setIsDropTarget(true); } : undefined}
      onDragLeave={onDropContact ? (event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsDropTarget(false); } : undefined}
      onDrop={onDropContact ? handleDrop : undefined}
    >
      <div
        className="ml-1 flex cursor-pointer items-center border border-transparent hovercontact"
        onClick={() => setIsOpen((open) => !open)}
        onContextMenu={(event) => { if (categoryId) { event.preventDefault(); onContextMenu?.(event, { type: 'category', categoryId }); } }}
      >
        <h2>{isOpen ? <img src={closedTabArrow} alt="close tab" /> : <img src={openTabArrow} alt="open tab" />}</h2>
        {title === 'Favorites' && <img src={favoritesIcon} className="mr-1" alt="favorites icon" />}
        <p className="mr-1 text-[#1D2F7F]">{title}</p>
        <p className="opacity-40">({count})</p>
      </div>
      {isOpen && <ContactList contacts={contacts} onOpenChat={onOpenChat} onContextMenu={onContextMenu} />}
    </div>
  );
};

export const ContactCategoryGroup = ({ title, count, children }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mt-2">
      <div
        className="ml-1 flex cursor-pointer items-center border border-transparent hovercontact"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <h2>{isOpen ? <img src={closedTabArrow} alt="close section" /> : <img src={openTabArrow} alt="open section" />}</h2>
        <p className="mr-1 text-[#1D2F7F]">{title}</p>
        <p className="opacity-40">({count})</p>
      </div>
      {isOpen && children}
    </div>
  );
};

const Contacts = ({ contact, onOpenChat, onContextMenu }) => {
  const navigate = useNavigate();
  const hasUnread = !!useContext(ChatContext)?.unread?.[contact.id];

  const whichStatus = (contactStatus) => {
    switch (contactStatus) {
      case 'online': return online;
      case 'busy': return busy;
      case 'away': return away;
      case 'offline': return offline;
      default: return offline;
    }
  };

  const openChat = () => {
    if (!contact?.id) return;
    if (onOpenChat) {
      onOpenChat(contact);
      return;
    }
    navigate(`/chat/${contact.id}`);
  };

  const statusMessage = contact.message || contact.bio || contact.statusMessage || contact.status_message || '';

  return (
    <div
      className="flex items-center gap-1 border border-transparent px-6 hovercontact"
      draggable
      onClick={openChat}
      onContextMenu={(event) => { event.preventDefault(); onContextMenu?.(event, { type: 'contact', contact }); }}
      onDragStart={(event) => { event.dataTransfer.setData('text/plain', String(contact.id)); event.dataTransfer.effectAllowed = 'copy'; }}
    >
      <div className="mt-1 w-2">
        <img src={whichStatus(contact.status)} alt="contact-status" />
      </div>
      <span className={`flex gap-1 ${hasUnread ? 'font-bold' : ''}`} dangerouslySetInnerHTML={{ __html: replaceEmoticons(formatName(contact.name || contact.username)) }}></span>
      <span>{!statusMessage ? null : '-'}</span>
      <span className="flex gap-1 text-gray-400" dangerouslySetInnerHTML={{ __html: replaceEmoticons(formatName(statusMessage, 80)) }}></span>
    </div>
  );
};

const ContactList = ({ contacts, onOpenChat, onContextMenu }) => (
  <div className="accordion">
    {contacts
      .filter(Boolean)
      .slice()
      .sort((a, b) => String(a.name || a.username || a.email || '').localeCompare(String(b.name || b.username || b.email || '')))
      .map((contact) => <Contacts key={contact.id} contact={contact} onOpenChat={onOpenChat} onContextMenu={onContextMenu} />)}
  </div>
);

export default ContactCategory;
