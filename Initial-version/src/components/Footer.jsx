import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";

export default function Footer() {
    const { t } = useTranslation("footer");
    return (
        <div className="flex justify-between bg-gradient-to-b from-blue-50 to-blue-100 rounded-b-lg px-4 py-2 border-t border-blue-200 ">
            <div className="flex justify-center items-center gap-2 text-xs text-gray-600">
                <a href="#" className="hover:underline">
                    {t('privacy')}
                </a>
                |
                <a href="#" className="hover:underline">
                    {t('usage')}
                </a>
                |
                <a href="#" className="hover:underline">
                    {t('status')}
                </a>
            </div>

            <div className="flex">
                <LanguageSelector />
            </div>
        </div>
    )
}