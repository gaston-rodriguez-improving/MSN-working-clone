import React from 'react';
import { useTranslation } from 'react-i18next';

const locales = {
    "pt-BR": { title: "PT-BR", iconPath: "./assets/flags/br.svg" },
    "en-US": { title: "EN-US", iconPath: "./assets/flags/us.svg" },
    "es-ES": { title: "ES-ES", iconPath: "./assets/flags/es.svg" }
};

export default function LanguageSelector() {
    const { i18n } = useTranslation();
    const actualLanguage = i18n.language;

    const handleChange = (event) => {
        i18n.changeLanguage(event.target.value);
    };

    return (
        <div className="flex items-center gap-2">
            <select
                className="select"
                value={actualLanguage}
                onChange={handleChange}
            >
                {Object.entries(locales).map(([key, { title }]) => (
                    <option key={key} value={key}>
                        {title}
                    </option>
                ))}
            </select>
        </div>
    );
}
