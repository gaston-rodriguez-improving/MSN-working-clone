import React, { useState } from 'react';
import online from '/assets/status/online-dot.png';
import busy from '/assets/status/busy-dot.png';
import away from '/assets/status/away-dot.png';
import offline from '/assets/status/offline-dot.png';
import favoritesIcon from '/assets/general/favorites.png';
import openTabArrow from '/assets/general/open_tab_arrow.png';
import closedTabArrow from '/assets/general/closed_tab_arrow.png';
import { replaceEmoticons } from '../helpers/replaceEmoticons';

import { useNavigate } from 'react-router-dom';

const ContactCategory = ({ title, contacts, count, onOpenChat }) => {
  const [isOpen, setIsOpen] = useState(true);

  const toggleAccordion = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="mt-2">
      <div className="flex items-center cursor-pointer ml-1 hovercontact border border-transparent" onClick={toggleAccordion}>
        <h2>{isOpen ? <img src={closedTabArrow} alt="close tab" /> : <img src={openTabArrow} alt="open tab" />}</h2>
        {title === 'Favorites' && <img src={favoritesIcon} className="mr-1" alt="favorites icon" />}
        <p className="text-[#1D2F7F] mr-1">{title}</p>
        <p className="opacity-40">({count})</p>
      </div>
      {isOpen && <ContactList contacts={contacts} onOpenChat={onOpenChat} />}
    </div>
  );
};

const Contacts = ({ contact, onOpenChat }) => {
  const navigate = useNavigate();

  const whichStatus = (contactStatus) => {
    switch (contactStatus) {
      case 'online':
        return online;
      case 'busy':
        return busy;
      case 'away':
        return away;
      case 'offline':
        return offline;
      default:
        return offline;
    }
  };

  const openChat = (contact) => {
    if (!contact?.id) return;

    if (onOpenChat) {
      onOpenChat(contact);
      return;
    }

    navigate(`/chat/${contact.id}`);
  };

  const statusMessage = contact.message || contact.bio || contact.statusMessage || contact.status_message || '';

  return (
    <div className="flex gap-1 px-6 items-center hovercontact border border-transparent" onClick={() => openChat(contact)}>
      <div className="w-2 mt-1">
        <img src={whichStatus(contact.status)} alt="contact-status" />
      </div>
      <span className="flex gap-1" dangerouslySetInnerHTML={{ __html: replaceEmoticons(contact.name) }}></span>
      <span>{!statusMessage ? null : '-'}</span>
      <span className="flex gap-1 text-gray-400" dangerouslySetInnerHTML={{ __html: replaceEmoticons(statusMessage) }}></span>
    </div>
  );
};

const ContactList = ({ contacts, onOpenChat }) => {
  return (
    <div className="accordion">
      {contacts
        .filter(Boolean)
        .slice()
        .sort((a, b) => String(a.name || a.username || a.email || '').localeCompare(String(b.name || b.username || b.email || '')))
        .map((contact) => (
          <Contacts key={contact.id} contact={contact} onOpenChat={onOpenChat} />
        ))}
    </div>
  );
};

export default ContactCategory;
