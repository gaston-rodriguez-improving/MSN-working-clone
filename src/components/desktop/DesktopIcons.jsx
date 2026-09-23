import Icon from "./Icon";

export default function DesktopIcons({ onChatClick }) {
    return (
        <div className="grid grid-cols-1 gap-2">
            <div className="w-20 h-20">
                <Icon image="./wlm-logo.png" label="MLN" onClick={onChatClick} />
            </div>
        </div>
    );
}
