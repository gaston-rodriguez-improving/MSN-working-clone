export const SOUND_PREFERENCES_STORAGE_KEY = 'msn-sound-preferences';
export const soundPreferenceDefaults = {
  contactsOnline: true,
  friendInvitations: true,
  messages: true,
  nudges: true,
};

export const readSoundPreferences = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(SOUND_PREFERENCES_STORAGE_KEY) || 'null');
    return Object.fromEntries(Object.entries(soundPreferenceDefaults).map(([key, defaultValue]) => [
      key,
      typeof stored?.[key] === 'boolean' ? stored[key] : defaultValue,
    ]));
  } catch {
    return { ...soundPreferenceDefaults };
  }
};
