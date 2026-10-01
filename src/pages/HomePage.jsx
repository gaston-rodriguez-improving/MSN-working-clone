import React, { useContext } from 'react';
import Background from '../components/Background';
import SearchBar from '../components/SearchBar';
import ContactCategory, { ContactCategoryGroup } from '../components/ContactList';
import arrow from '/assets/general/arrow.png';
import ad from '/assets/ad.png';
import addcontact from '/assets/contacts/add_contact.png';
import showmenu from '/assets/contacts/1489.png';
import contactlistlayout from '/assets/contacts/change_contact_list_layout.png';
import { ChatContext } from '../contexts/ChatContext';
import divider from '/assets/general/divider.png';
import WhatsNew from '../components/WhatsNew';
import UserInformations from '../components/UserInformations';
import hotmail from '/assets/general/hotmail.png';
import { ChatWindow } from './ChatPage';
import AddFriendModal from '../components/AddFriendModal';
import FriendInvitationModal from '../components/FriendInvitationModal';
import CategoryModal from '../components/CategoryModal';
import ContactListLayoutModal from '../components/ContactListLayoutModal';
import { AuthContext } from '../contexts/AuthContext';
import { getContactPreferences as getContactPreferencesRequest, saveContactPreferences as saveContactPreferencesRequest } from '../data/api';

const emptyContactPreferences = { favorites: [], categories: [], assignments: {}, layout: 'status' };
const contactPreferencesKey = (userId) => `msn-contact-preferences:${userId}`;
const matchesContact = (contact, query) => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  return [contact.name, contact.username, contact.email, contact.message, contact.bio, contact.statusMessage, contact.status_message]
    .some((value) => String(value || '').toLocaleLowerCase().includes(normalizedQuery));
};

const hasContactPreferences = (preferences) => preferences.favorites.length || preferences.categories.length || Object.keys(preferences.assignments).length || preferences.layout === 'categories';

const readContactPreferences = (userId) => {
  if (!userId) return emptyContactPreferences;
  try {
    const stored = JSON.parse(localStorage.getItem(contactPreferencesKey(userId)) || 'null');
    return {
      favorites: Array.isArray(stored?.favorites) ? stored.favorites.map(String) : [],
      categories: Array.isArray(stored?.categories) ? stored.categories.filter((category) => category?.id && category?.name).map((category) => ({ id: String(category.id), name: String(category.name) })) : [],
      assignments: stored?.assignments && typeof stored.assignments === 'object' ? stored.assignments : {},
      layout: stored?.layout === 'categories' ? 'categories' : 'status',
    };
  } catch {
    return emptyContactPreferences;
  }
};

const HomePage = () => {
  const { user } = useContext(AuthContext);
  const { activeChatId, chatRequest, contacts, friendRequests, friendInvitationToReview, setFriendInvitationToReview, sendFriendInvitation, respondToFriendInvitation, setActiveChatId } = useContext(ChatContext);
  const [openChatIds, setOpenChatIds] = React.useState([]);
  const [minimizedChatIds, setMinimizedChatIds] = React.useState([]);
  const [showAddFriend, setShowAddFriend] = React.useState(false);
  const [showFriendMenu, setShowFriendMenu] = React.useState(false);
  const [contactMenu, setContactMenu] = React.useState(null);
  const [categoryModal, setCategoryModal] = React.useState(null);
  const [showLayoutModal, setShowLayoutModal] = React.useState(false);
  const [contactSearch, setContactSearch] = React.useState('');
  const [storedContactPreferences, setStoredContactPreferences] = React.useState(() => ({ userId: user?.id, value: readContactPreferences(user?.id) }));
  const contactPreferenceRevision = React.useRef(0);
  const contactPreferenceSaveQueue = React.useRef(Promise.resolve());
  const friendMenuRef = React.useRef(null);
  const contactMenuRef = React.useRef(null);
  const friendMenuButtonRef = React.useRef(null);
  const [friendMenuPosition, setFriendMenuPosition] = React.useState(null);
  const incomingRequests = friendRequests.filter((request) => request.direction !== 'outgoing');
  const contactPreferences = storedContactPreferences.userId === user?.id ? storedContactPreferences.value : emptyContactPreferences;
  const focusChat = (contactId) => {
    setMinimizedChatIds((currentIds) => currentIds.filter((id) => id !== contactId));
    setOpenChatIds((currentIds) => {
      if (currentIds[currentIds.length - 1] === contactId) return currentIds;
      return currentIds.includes(contactId) ? [...currentIds.filter((id) => id !== contactId), contactId] : [...currentIds, contactId];
    });
  };
  const minimizeChat = (contactId, conversationId) => {
    setMinimizedChatIds((currentIds) => currentIds.includes(contactId) ? currentIds : [...currentIds, contactId]);
    if (conversationId === activeChatId) setActiveChatId(null);
  };
  const toggleFriendMenu = () => {
    if (showFriendMenu) {
      setShowFriendMenu(false);
      return;
    }
    const trigger = friendMenuButtonRef.current?.getBoundingClientRect();
    if (!trigger) return;
    const width = Math.max(0, Math.min(224, window.innerWidth - 16));
    setFriendMenuPosition({
      left: Math.max(8, Math.min(trigger.left, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(trigger.bottom + 4, window.innerHeight - 96)),
      width,
    });
    setShowFriendMenu(true);
  };
  const handleFriendMenuKeyDown = (event, action) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };
  const saveContactPreferences = (value) => {
    if (!user?.id) return;
    contactPreferenceRevision.current += 1;
    localStorage.setItem(contactPreferencesKey(user.id), JSON.stringify(value));
    setStoredContactPreferences({ userId: user.id, value });
    contactPreferenceSaveQueue.current = contactPreferenceSaveQueue.current
      .catch(() => {})
      .then(() => saveContactPreferencesRequest(value))
      .catch(() => {});
  };
  const showContactMenu = (event, target) => {
    const width = Math.min(240, window.innerWidth - 16);
    setContactMenu({
      ...target,
      left: Math.max(8, Math.min(event.clientX, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(event.clientY, window.innerHeight - 300)),
    });
  };
  const openCategoryModal = (contactId = null, categoryId = null) => {
    const category = contactPreferences.categories.find((item) => item.id === categoryId);
    setCategoryModal({ contactId, categoryId, initialName: category?.name || '' });
  };
  const saveCategory = (name, target) => {
    if (!name) return 'Enter a category name.';
    if (contactPreferences.categories.some((category) => category.id !== target.categoryId && category.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      return 'A category with that name already exists.';
    }
    if (target.categoryId) {
      saveContactPreferences({
        ...contactPreferences,
        categories: contactPreferences.categories.map((category) => category.id === target.categoryId ? { ...category, name } : category),
      });
      return '';
    }
    const id = `category-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const assignments = { ...contactPreferences.assignments };
    if (target.contactId !== null) {
      const contactId = String(target.contactId);
      const current = Array.isArray(assignments[contactId]) ? assignments[contactId] : [];
      assignments[contactId] = [...new Set([...current, id])];
    }
    saveContactPreferences({ ...contactPreferences, categories: [...contactPreferences.categories, { id, name }], assignments });
    return '';
  };
  const renameCategory = (categoryId) => openCategoryModal(null, categoryId);
  const deleteCategory = (categoryId) => {
    const assignments = Object.fromEntries(Object.entries(contactPreferences.assignments).map(([contactId, categoryIds]) => [
      contactId,
      Array.isArray(categoryIds) ? categoryIds.filter((id) => id !== categoryId) : [],
    ]));
    saveContactPreferences({
      ...contactPreferences,
      categories: contactPreferences.categories.filter((category) => category.id !== categoryId),
      assignments,
    });
  };
  const toggleFavorite = (contactId) => {
    const id = String(contactId);
    const favorites = contactPreferences.favorites.includes(id)
      ? contactPreferences.favorites.filter((favoriteId) => favoriteId !== id)
      : [...contactPreferences.favorites, id];
    saveContactPreferences({ ...contactPreferences, favorites });
  };
  const addFavorite = (contactId) => {
    const id = String(contactId);
    if (!contactPreferences.favorites.includes(id)) saveContactPreferences({ ...contactPreferences, favorites: [...contactPreferences.favorites, id] });
  };
  const toggleCategoryAssignment = (contactId, categoryId) => {
    const id = String(contactId);
    const current = Array.isArray(contactPreferences.assignments[id]) ? contactPreferences.assignments[id] : [];
    const categoryIds = current.includes(categoryId) ? current.filter((item) => item !== categoryId) : [...current, categoryId];
    const assignments = { ...contactPreferences.assignments, [id]: categoryIds };
    if (!categoryIds.length) delete assignments[id];
    saveContactPreferences({ ...contactPreferences, assignments });
  };
  const addContactToCategory = (contactId, categoryId) => {
    const id = String(contactId);
    const current = Array.isArray(contactPreferences.assignments[id]) ? contactPreferences.assignments[id] : [];
    if (!current.includes(categoryId)) {
      saveContactPreferences({ ...contactPreferences, assignments: { ...contactPreferences.assignments, [id]: [...current, categoryId] } });
    }
  };

  React.useEffect(() => {
    let cancelled = false;
    const userId = user?.id;
    const localPreferences = readContactPreferences(userId);
    const revisionAtLoad = contactPreferenceRevision.current;
    setStoredContactPreferences({ userId, value: localPreferences });
    if (!userId) return () => { cancelled = true; };

    getContactPreferencesRequest().then(async ({ data }) => {
      if (cancelled || contactPreferenceRevision.current !== revisionAtLoad) return;
      let preferences = data.preferences || emptyContactPreferences;
      if (!data.exists && hasContactPreferences(localPreferences)) {
        preferences = localPreferences;
        contactPreferenceSaveQueue.current = contactPreferenceSaveQueue.current
          .catch(() => {})
          .then(() => saveContactPreferencesRequest(preferences))
          .catch(() => {});
        await contactPreferenceSaveQueue.current;
        if (cancelled || contactPreferenceRevision.current !== revisionAtLoad) return;
      }
      localStorage.setItem(contactPreferencesKey(userId), JSON.stringify(preferences));
      setStoredContactPreferences({ userId, value: preferences });
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [user?.id]);

  React.useEffect(() => {
    if (!contactMenu) return undefined;
    const closeContactMenu = (event) => {
      if (contactMenuRef.current && !contactMenuRef.current.contains(event.target)) setContactMenu(null);
    };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setContactMenu(null); };
    document.addEventListener('mousedown', closeContactMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeContactMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [contactMenu]);

  React.useEffect(() => {
    const closeFriendMenu = (event) => {
      if (friendMenuRef.current && !friendMenuRef.current.contains(event.target)) setShowFriendMenu(false);
    };
    document.addEventListener('mousedown', closeFriendMenu);
    return () => document.removeEventListener('mousedown', closeFriendMenu);
  }, []);

  React.useEffect(() => {
    if (!chatRequest) return;
    setMinimizedChatIds((currentIds) => currentIds.filter((id) => id !== chatRequest.id));
    setOpenChatIds((currentIds) => currentIds.includes(chatRequest.id)
      ? [...currentIds.filter((id) => id !== chatRequest.id), chatRequest.id]
      : [...currentIds, chatRequest.id]);
  }, [chatRequest]);

  const favoriteIds = new Set(contactPreferences.favorites);
  const assignedContactIds = new Set(Object.entries(contactPreferences.assignments)
    .filter(([, categoryIds]) => Array.isArray(categoryIds) && categoryIds.some((id) => contactPreferences.categories.some((category) => category.id === id)))
    .map(([contactId]) => contactId));
  const hasContactSearch = contactSearch.trim().length > 0;
  const matchingContacts = contacts.filter((contact) => matchesContact(contact, contactSearch));
  const favoritesContacts = matchingContacts.filter((contact) => favoriteIds.has(String(contact.id)));
  const statusContacts = matchingContacts.filter((contact) => contact.status !== 'group');
  const categorizedContacts = contactPreferences.categories.map((category) => ({
    ...category,
    contacts: matchingContacts.filter((contact) => Array.isArray(contactPreferences.assignments[String(contact.id)]) && contactPreferences.assignments[String(contact.id)].includes(category.id)),
  }));
  const uncategorizedContacts = matchingContacts.filter((contact) => contact.status !== 'group' && !assignedContactIds.has(String(contact.id)));
  const availableContacts = statusContacts.filter((contact) => contact.status !== 'offline');
  const offlineContacts = statusContacts.filter((contact) => contact.status === 'offline');
  const layoutView = contactPreferences.layout === 'categories' ? 'categories' : 'status';
  const hasContactSearchResults = favoritesContacts.length || (layoutView === 'status'
    ? availableContacts.length || offlineContacts.length
    : categorizedContacts.some((category) => category.contacts.length) || uncategorizedContacts.length);

  const background = localStorage.getItem('scene');

  const openChat = (contact) => focusChat(contact.id);

  const closeChat = (contactId, conversationId) => {
    setOpenChatIds((currentIds) => currentIds.filter((id) => id !== contactId));
    setMinimizedChatIds((currentIds) => currentIds.filter((id) => id !== contactId));
    if (conversationId === activeChatId) setActiveChatId(null);
  };

  return (
    <>
      <Background>
      <div
        className={`bg-no-repeat ${
          background === '/assets/scenes/default_background.jpg' ? 'h-screen' : 'h-[97px]'
        } bg-[length:100%_100px]`}
        style={{
          backgroundImage: `url(${background})`,
          backgroundSize: background !== '/assets/scenes/default_background.jpg' ? 'cover' : '',
          backgroundPosition: background !== '/assets/scenes/default_background.jpg' ? 'center' : '',
        }}
      >
        <div className="msn-font flex flex-col w-full font-sans text-base h-screen win7">
          {/* Personnal informations row */}
          <div className="flex justify-between px-4 pt-4">
            <UserInformations />
            {/* Hotmail icon */}
            <div className="w-9 mb-2 flex items-end">
              <a href="https://outlook.cloud.microsoft/mail/" target="_blank" rel="noopener noreferrer" aria-label="Open Outlook Mail">
                <img src={hotmail} alt="Outlook Mail" />
              </a>
            </div>
          </div>

          {/* Contacts row */}
          <div className="h-full">
            <img src={divider} alt="" className="mb-[-5px] pointer-events-none mix-blend-multiply" />

            {/* Searchbar and icons */}
            <div className="flex items-center mt-2 px-4">
              <SearchBar value={contactSearch} onChange={setContactSearch} placeholder="Search your contacts..." />
              <div className="relative ml-1" ref={friendMenuRef}>
                <div
                  ref={friendMenuButtonRef}
                  role="button"
                  tabIndex={0}
                  className="add-friend-button flex h-6 w-fit cursor-pointer items-center gap-1 p-1 outline-none"
                  aria-label={incomingRequests.length ? `Add a friend, ${incomingRequests.length} pending invitation${incomingRequests.length === 1 ? '' : 's'}` : 'Add a friend'}
                  aria-haspopup="menu"
                  aria-expanded={showFriendMenu}
                  onClick={toggleFriendMenu}
                  onKeyDown={(event) => handleFriendMenuKeyDown(event, toggleFriendMenu)}
                >
                  <span className="relative flex h-4 w-5 items-center justify-center"><img src={addcontact} alt="" className="h-4 w-4 object-contain" />{incomingRequests.length > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#c43131] px-1 text-[9px] leading-none text-white">{incomingRequests.length}</span>}</span>
                  <span><img src={arrow} alt="" className="h-2 w-2 object-contain" /></span>
                </div>
                {showFriendMenu && (
                  <div role="menu" className="fixed z-[80] max-h-[calc(100vh-16px)] overflow-y-auto rounded border border-[#7894a5] bg-gradient-to-b from-white via-[#f7fbfd] to-[#e3edf3] p-1 shadow-lg" style={friendMenuPosition}>
                    <div role="menuitem" tabIndex={0} className="cursor-pointer rounded px-2 py-1 text-[12px] text-[#17364a] hover:bg-[#d9effb] focus:bg-[#d9effb]" onClick={() => { setShowFriendMenu(false); setShowAddFriend(true); }} onKeyDown={(event) => handleFriendMenuKeyDown(event, () => { setShowFriendMenu(false); setShowAddFriend(true); })}>
                      Add a friend...
                    </div>
                    <div role="menuitem" tabIndex={0} aria-disabled={!incomingRequests.length} className={`flex items-center justify-between rounded px-2 py-1 text-[12px] text-[#17364a] ${incomingRequests.length ? 'cursor-pointer hover:bg-[#d9effb] focus:bg-[#d9effb]' : 'cursor-default opacity-50'}`} onClick={() => { if (!incomingRequests.length) return; setShowFriendMenu(false); setFriendInvitationToReview(incomingRequests[0]); }} onKeyDown={(event) => { if (incomingRequests.length) handleFriendMenuKeyDown(event, () => { setShowFriendMenu(false); setFriendInvitationToReview(incomingRequests[0]); }); }}>
                      <span>Review friend invitations</span>
                      {incomingRequests.length > 0 && <span className="ml-2 rounded bg-[#c43131] px-1.5 text-white">{incomingRequests.length}</span>}
                    </div>
                  </div>
                )}
              </div>
              <button type="button" className="aerobutton flex h-6 items-center p-1" onClick={() => setShowLayoutModal(true)} aria-label="Change contact list layout" title="Change contact list layout">
                <img src={contactlistlayout} alt="" className="w-5" />
              </button>
              <div className="flex gap-1 items-center aerobutton p-1 h-6">
                <div className="w-5">
                  <img src={showmenu} alt="" />
                </div>
                <div>
                  <img src={arrow} alt="" />
                </div>
              </div>
            </div>

            <div className="overflow-y-auto has-scrollbar h-[58.8vh]">
              {/* Contacts */}
              {(!hasContactSearch || favoritesContacts.length > 0) && <ContactCategory title="Favorites" contacts={favoritesContacts} count={favoritesContacts.length} onOpenChat={openChat} onContextMenu={showContactMenu} onDropContact={addFavorite} />}
              {layoutView === 'status' ? (
                <>
                  {(!hasContactSearch || availableContacts.length > 0) && <ContactCategory title="Available" contacts={availableContacts} count={availableContacts.length} onOpenChat={openChat} onContextMenu={showContactMenu} />}
                  {(!hasContactSearch || offlineContacts.length > 0) && <ContactCategory title="Offline" contacts={offlineContacts} count={offlineContacts.length} onOpenChat={openChat} onContextMenu={showContactMenu} />}
                </>
              ) : (
                <>
                  <ContactCategoryGroup title="Categories" count={contactPreferences.categories.length}>
                    {categorizedContacts.filter((category) => !hasContactSearch || category.contacts.length > 0).map((category) => (
                      <ContactCategory
                        key={category.id}
                        title={category.name}
                        categoryId={category.id}
                        contacts={category.contacts}
                        count={category.contacts.length}
                        onOpenChat={openChat}
                        onContextMenu={showContactMenu}
                        onDropContact={(contactId) => addContactToCategory(contactId, category.id)}
                      />
                    ))}
                  </ContactCategoryGroup>
                  {(!hasContactSearch || uncategorizedContacts.length > 0) && <ContactCategory title="Uncategorized" contacts={uncategorizedContacts} count={uncategorizedContacts.length} onOpenChat={openChat} onContextMenu={showContactMenu} />}
                </>
              )}
              {hasContactSearch && !hasContactSearchResults && <p className="px-3 py-2 text-sm text-gray-500">No contacts found.</p>}
            </div>
          </div>

          {/* What's New row */}
          <WhatsNew />

          {/* Footer row */}
          <div className="w-full mix-blend-luminosity bg-white h-[1px] shadow-sm shadow-[#6b8fa3]"></div>
          <footer className="w-full flex justify-center pb-4">
            <div className="mt-4">
              <img src={ad} alt="" />
            </div>
          </footer>
        </div>
      </div>
      </Background>
      {showAddFriend && <AddFriendModal onClose={() => setShowAddFriend(false)} onSend={sendFriendInvitation} />}
      {friendInvitationToReview && <FriendInvitationModal request={friendInvitationToReview} onClose={() => setFriendInvitationToReview(null)} onRespond={respondToFriendInvitation} />}
      {categoryModal && <CategoryModal initialName={categoryModal.initialName} onClose={() => setCategoryModal(null)} onSave={(name) => saveCategory(name, categoryModal)} />}
      {showLayoutModal && <ContactListLayoutModal viewMode={layoutView} onClose={() => setShowLayoutModal(false)} onApply={(layout) => saveContactPreferences({ ...contactPreferences, layout })} />}
      {contactMenu && (
        <div
          ref={contactMenuRef}
          role="menu"
          className="fixed z-[1000] max-h-[calc(100vh-16px)] overflow-y-auto rounded border border-[#7894a5] bg-gradient-to-b from-white via-[#f7fbfd] to-[#e3edf3] p-1 shadow-lg"
          style={{ left: contactMenu.left, top: contactMenu.top, width: Math.min(240, window.innerWidth - 16) }}
        >
          {contactMenu.type === 'contact' && (
            <>
              <div className="border-b border-[#c5d4dc] px-2 py-1 text-[12px] font-semibold text-[#17364a]">{contactMenu.contact.name || contactMenu.contact.username}</div>
              <button type="button" role="menuitem" className="w-full rounded px-2 py-1 text-left text-[12px] text-[#17364a] hover:bg-[#d9effb]" onClick={() => { toggleFavorite(contactMenu.contact.id); setContactMenu(null); }}>
                {favoriteIds.has(String(contactMenu.contact.id)) ? 'Remove from Favorites' : 'Add to Favorites'}
              </button>
              <div className="px-2 pb-0.5 pt-1 text-[11px] text-gray-500">Add to category</div>
              {contactPreferences.categories.length ? contactPreferences.categories.map((category) => {
                const contactCategories = contactPreferences.assignments[String(contactMenu.contact.id)];
                const assigned = Array.isArray(contactCategories) && contactCategories.includes(category.id);
                return (
                  <button key={category.id} type="button" role="menuitem" className="w-full rounded px-2 py-1 text-left text-[12px] text-[#17364a] hover:bg-[#d9effb]" onClick={() => { toggleCategoryAssignment(contactMenu.contact.id, category.id); setContactMenu(null); }}>
                    {assigned ? '✓ ' : ''}{category.name}
                  </button>
                );
              }) : <div className="px-2 py-1 text-[12px] text-gray-500">No categories yet</div>}
              <div className="my-1 border-t border-[#c5d4dc]" />
              <button type="button" role="menuitem" className="w-full rounded px-2 py-1 text-left text-[12px] text-[#17364a] hover:bg-[#d9effb]" onClick={() => { const contactId = contactMenu.contact.id; setContactMenu(null); openCategoryModal(contactId); }}>Create category...</button>
            </>
          )}
          {contactMenu.type === 'category' && contactMenu.categoryId && (
            <>
              <button type="button" role="menuitem" className="w-full rounded px-2 py-1 text-left text-[12px] text-[#17364a] hover:bg-[#d9effb]" onClick={() => { const id = contactMenu.categoryId; setContactMenu(null); renameCategory(id); }}>Rename category...</button>
              <button type="button" role="menuitem" className="w-full rounded px-2 py-1 text-left text-[12px] text-[#9b2525] hover:bg-[#fbe3e3]" onClick={() => { const id = contactMenu.categoryId; setContactMenu(null); deleteCategory(id); }}>Delete category</button>
            </>
          )}
        </div>
      )}
      <div className="pointer-events-none fixed inset-0 z-50">
        {openChatIds.map((contactId, index) => (
          <ChatWindow
            key={contactId}
            contactId={contactId}
            isMinimized={minimizedChatIds.includes(contactId)}
            onClose={(conversationId) => closeChat(contactId, conversationId)}
            onFocus={() => focusChat(contactId)}
            onMinimize={(conversationId) => minimizeChat(contactId, conversationId)}
            windowIndex={index}
          />
        ))}
        {minimizedChatIds.length > 0 && (
          <div className="pointer-events-auto fixed bottom-3 left-3 z-[900] flex max-w-[calc(100vw-24px)] gap-1 overflow-x-auto rounded-md border border-[#7894a5] bg-gradient-to-b from-white via-[#eaf3f8] to-[#cddfe9] p-1 shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
            {minimizedChatIds.map((contactId) => {
              const contact = contacts.find((item) => item.id === Number(contactId));
              if (!contact) return null;
              return (
                <button key={contactId} type="button" className="chat-taskbar-button flex h-8 max-w-48 min-w-36 items-center gap-2 rounded px-2 text-left text-[12px] text-[#17364a]" onClick={() => focusChat(contactId)} title={contact.name || contact.username}>
                  <img src={contact.image || '/assets/usertiles/default.png'} alt="" className="h-5 w-5 shrink-0 rounded-sm object-cover" />
                  <span className="truncate">{contact.name || contact.username}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default HomePage;
