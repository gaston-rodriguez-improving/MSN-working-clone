import React, { useState, useEffect, useContext } from 'react';
import Background from './Background';
import SearchBar from './SearchBar';
import Header from './Header';
import Contacts from './Contacts';

import { AuthContext } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

import scenes from '../../imports/scenes';

export default function Chat() {
    const { user } = useContext(AuthContext);
    const { t } = useTranslation("chat")

    const [banner, setBanner] = useState(user.banner)
    const [contactSearch, setContactSearch] = useState('')

    useEffect(() => {
        if (user.banner === "default") {
            setBanner("default_background")
        } else {
            setBanner(user.banner)
        }
    }, [user.banner]);

    return (
        <Background>
            <div
                className={`bg-no-repeat absolute top-0 left-0 w-full z-0`}
                style={{
                    height: '100px',
                    backgroundImage: `url(${scenes[banner]})`,
                    backgroundSize: scenes[banner] !== './assets/scenes/default_background.jpg' ? 'cover' : '',
                    backgroundPosition: scenes[banner] !== './assets/scenes/default_background.jpg' ? 'center' : '',
                }}
            />
            <div>
                <div className="flex flex-col w-full font-sans text-base win7">
                    {/* Personnal informations row */}
                    <div className="flex justify-between px-4 pt-4">
                        <Header />
                        {/* Hotmail icon */}
                        <div className="w-9 mb-2 flex items-end">
                            <div>
                                <img src="./assets/general/hotmail.png" alt="" />
                            </div>
                        </div>
                    </div>

                    {/* Contacts row */}
                    <div className="h-full pt-3">
                        <img src="./assets/general/divider.png" alt="" className="mb-[-5px] pointer-events-none mix-blend-multiply" />

                        {/* Searchbar and icons */}
                        <div className="flex items-center mt-3 px-4">
                            <SearchBar initialValue={t('search')} onSearch={setContactSearch} />

                            <div className="flex gap-1 items-center aerobutton p-1 h-6">
                                <div className="w-5">
                                    <img src="./assets/contacts/change_contact_list_layout.png" alt="" />
                                </div>
                            </div>
                            <div className="flex gap-1 items-center aerobutton p-1 h-6">
                                <div className="w-5">
                                    <img src="./assets/contacts/1489.png" alt="" />
                                </div>
                                <div>
                                    <img src="./assets/general/arrow.png" alt="" />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-y-auto has-scrollbar min-h-64 h-full max-h-64">
                            <Contacts search={contactSearch} />
                        </div>
                    </div>

                </div>
            </div>
        </Background >
    );
};