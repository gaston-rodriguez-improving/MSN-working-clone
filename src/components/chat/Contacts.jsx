import React, { useContext, useEffect, useState } from 'react';

import { replaceEmoticons } from '../../helpers/replaceEmoticons';
import { ChatContext } from '../../context/ChatContext';
import { useTranslation } from 'react-i18next';


export default function Contacts({ search = '' }) {
    const { contacts, getContacts } = useContext(ChatContext);
    const { t } = useTranslation("chat")

    const [favoritesContacts, setFavoritesContacts] = useState([]);
    const [groupsContacts, setGroupsContacts] = useState([]);
    const [availableContacts, setAvailableContacts] = useState([]);
    const [offlineContacts, setOfflineContacts] = useState([]);

    useEffect(() => {
        setFavoritesContacts(contacts.filter((contact) => contact.isFavorite));
        setGroupsContacts(contacts.filter((contact) => contact.status === 'group'));
        setAvailableContacts(contacts.filter((contact) => contact.status !== 'offline' && contact.status !== 'group' && !contact.isFavorite));
        setOfflineContacts(contacts.filter((contact) => contact.status === 'offline'));
    }, [contacts]);

    useEffect(() => {
        if (contacts.length === 1) {
            getContacts();
        }
    }, []);

    const normalizedSearch = search.trim().toLowerCase();
    const filteredContacts = normalizedSearch
        ? contacts.filter((contact) =>
            [contact.username, contact.email, contact.bio]
                .filter(Boolean)
                .some((field) => field.toLowerCase().includes(normalizedSearch))
        )
        : contacts;

    const filteredFavorites = filteredContacts.filter((contact) => contact.isFavorite);
    const filteredGroups = filteredContacts.filter((contact) => contact.status === 'group');
    const filteredAvailable = filteredContacts.filter((contact) => contact.status !== 'offline' && contact.status !== 'group' && !contact.isFavorite);
    const filteredOffline = filteredContacts.filter((contact) => contact.status === 'offline');

    return (
        <div>
            <ContactCategory title="Favorites" contacts={filteredFavorites} count={filteredFavorites.length} />
            <ContactCategory title={t('contacts.groups')} contacts={filteredGroups} count={filteredGroups.length} />
            <ContactCategory title={t('contacts.available')} contacts={filteredAvailable} count={filteredAvailable.length} />
            <ContactCategory title={t('contacts.offline')} contacts={filteredOffline} count={filteredOffline.length} />
        </div>
    )
}


const ContactCategory = ({ title, contacts, count }) => {
    const [isOpen, setIsOpen] = useState(true);
    const { t } = useTranslation("chat")

    const toggleAccordion = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="mt-2">
            <div className="flex items-center cursor-pointer ml-1 hovercontact border border-transparent" onClick={toggleAccordion}>
                <h2>
                    {isOpen ? (
                        <img src="/assets/general/closed_tab_arrow.png" alt="close tab" />
                    ) : (
                        <img src="/assets/general/open_tab_arrow.png" alt="open tab" />
                    )}
                </h2>
                {title === 'Favorites' && (
                    <img src="/assets/general/favorites.png" className="mr-1" alt="favorites icon" />
                )}
                <p className="text-[#1D2F7F] mr-1">{title === "Favorites" ? t('contacts.favorites') : title}</p>
                <p className="opacity-40">({count})</p>
            </div>
            {isOpen && <ContactList contacts={contacts} />}
        </div>
    );
};

const Contact = ({ contact }) => {
    const { selectContact } = useContext(ChatContext);

    const whichStatus = (contactStatus) => {
        switch (contactStatus) {
            case 'online':
                return '/assets/status/online-dot.png';
            case 'busy':
                return '/assets/status/busy-dot.png';
            case 'away':
                return '/assets/status/away-dot.png';
            case 'offline':
            default:
                return '/assets/status/offline-dot.png';
        }
    };

    const openChat = (contact) => {
        selectContact(contact.id)
    };

    return (
        <div className="flex gap-1 px-6 items-center hovercontact border border-transparent" onClick={() => openChat(contact)}>
            <div className="w-2">
                <img src={whichStatus(contact.status)} alt="contact-status" />
            </div>
            <span className="flex gap-1 text-sm" dangerouslySetInnerHTML={{ __html: replaceEmoticons(contact.username) }}></span>
            <span>{!contact.message ? null : '-'}</span>
            <span className="flex gap-1 text-gray-400 text-sm" dangerouslySetInnerHTML={{ __html: replaceEmoticons(contact.bio) }}></span>
        </div>
    );
};

const ContactList = ({ contacts }) => {
    return (
        <div className="accordion">
            {contacts
                .slice()
                .sort((a, b) => a.username.localeCompare(b.username))
                .map((contact) => (
                    <Contact key={contact.id} contact={contact} />
                ))}
        </div>
    );
};
