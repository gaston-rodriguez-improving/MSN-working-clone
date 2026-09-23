export default function Icon({ icon: Icon, image, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center p-2 w-20 h-20 hover:bg-white/10 rounded group transition-colors"
        >
            <div className="w-12 h-12 mb-1 text-white drop-shadow-lg">
                {image ? (
                    <img src={image} alt={label} className="w-full h-full object-contain" />
                ) : Icon ? (
                    <Icon className="w-1/2 h-1/2" />
                ) : null}
            </div>
            <span className="text-white text-xs text-center drop-shadow-lg  group-hover:px-1 group-hover:rounded transition-colors">
                {label}
            </span>
        </button>
    )
}
