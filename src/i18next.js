import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    returnEmptyString: false,
    debug: false,
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false,
    },
    ns: [
      '404',
      'auth',
      'chat',
      'footer',
      'toast'
    ],
    defaultNS: '404',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;