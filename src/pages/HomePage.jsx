import React, { useContext } from 'react';
import Background from '../components/Background';
import SearchBar from '../components/SearchBar';
import ContactCategory from '../components/ContactList';
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

const HomePage = () => {
  const { activeChatId, chatRequest, contacts, friendRequests, sendFriendInvitation, respondToFriendInvitation, setActiveChatId } = useContext(ChatContext);
  const [openChatIds, setOpenChatIds] = React.useState([]);
  const [minimizedChatIds, setMinimizedChatIds] = React.useState([]);
  const [showAddFriend, setShowAddFriend] = React.useState(false);
  const [showFriendMenu, setShowFriendMenu] = React.useState(false);
  const [activeInvitation, setActiveInvitation] = React.useState(null);
  const friendMenuRef = React.useRef(null);
  const friendMenuButtonRef = React.useRef(null);
  const [friendMenuPosition, setFriendMenuPosition] = React.useState(null);
  const incomingRequests = friendRequests.filter((request) => request.direction !== 'outgoing');
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

  // Filtrage des contacts par statut
  const favoritesContacts = contacts.filter((contact) => contact.isFavorite === 1);
  const groupsContacts = contacts.filter((contact) => contact.status === 'group');
  const availableContacts = contacts.filter((contact) => contact.status !== 'offline');
  const offlineContacts = contacts.filter((contact) => contact.status === 'offline');

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
              <SearchBar initialValue="Search contacts or the web..." />
              <div className="relative ml-1" ref={friendMenuRef}>
                <div
                  ref={friendMenuButtonRef}
                  role="button"
                  tabIndex={0}
                  className="add-friend-button flex h-6 w-fit cursor-pointer items-center gap-1 p-1 outline-none"
                  aria-label="Add a friend"
                  aria-haspopup="menu"
                  aria-expanded={showFriendMenu}
                  onClick={toggleFriendMenu}
                  onKeyDown={(event) => handleFriendMenuKeyDown(event, toggleFriendMenu)}
                >
                  <span className="flex h-4 w-5 items-center justify-center"><img src={addcontact} alt="" className="h-4 w-4 object-contain" /></span>
                  <span><img src={arrow} alt="" className="h-2 w-2 object-contain" /></span>
                </div>
                {showFriendMenu && (
                  <div role="menu" className="fixed z-[80] max-h-[calc(100vh-16px)] overflow-y-auto rounded border border-[#7894a5] bg-gradient-to-b from-white via-[#f7fbfd] to-[#e3edf3] p-1 shadow-lg" style={friendMenuPosition}>
                    <div role="menuitem" tabIndex={0} className="cursor-pointer rounded px-2 py-1 text-[12px] text-[#17364a] hover:bg-[#d9effb] focus:bg-[#d9effb]" onClick={() => { setShowFriendMenu(false); setShowAddFriend(true); }} onKeyDown={(event) => handleFriendMenuKeyDown(event, () => { setShowFriendMenu(false); setShowAddFriend(true); })}>
                      Add a friend...
                    </div>
                    <div role="menuitem" tabIndex={0} aria-disabled={!incomingRequests.length} className={`flex items-center justify-between rounded px-2 py-1 text-[12px] text-[#17364a] ${incomingRequests.length ? 'cursor-pointer hover:bg-[#d9effb] focus:bg-[#d9effb]' : 'cursor-default opacity-50'}`} onClick={() => { if (!incomingRequests.length) return; setShowFriendMenu(false); setActiveInvitation(incomingRequests[0]); }} onKeyDown={(event) => { if (incomingRequests.length) handleFriendMenuKeyDown(event, () => { setShowFriendMenu(false); setActiveInvitation(incomingRequests[0]); }); }}>
                      <span>Review friend invitations</span>
                      {incomingRequests.length > 0 && <span className="ml-2 rounded bg-[#c43131] px-1.5 text-white">{incomingRequests.length}</span>}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-1 items-center aerobutton p-1 h-6">
                <div className="w-5">
                  <img src={contactlistlayout} alt="" />
                </div>
              </div>
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
              <ContactCategory title="Favorites" contacts={favoritesContacts} count={favoritesContacts.length} onOpenChat={openChat} />
              <ContactCategory title="Groups" contacts={groupsContacts} count={groupsContacts.length} onOpenChat={openChat} />
              <ContactCategory title="Available" contacts={availableContacts} count={availableContacts.length} onOpenChat={openChat} />
              <ContactCategory title="Offline" contacts={offlineContacts} count={offlineContacts.length} onOpenChat={openChat} />
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
      {activeInvitation && <FriendInvitationModal request={activeInvitation} onClose={() => setActiveInvitation(null)} onRespond={respondToFriendInvitation} />}
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
