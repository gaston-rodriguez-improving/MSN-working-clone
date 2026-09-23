import { useState, useEffect } from "react"
import { FaChevronUp } from "react-icons/fa"
import { MdWifi } from "react-icons/md"
import { FiVolume2 } from "react-icons/fi"

export default function Taskbar({ isChatActive, showChat, openChat }) {
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    const formatTime = (date) => {
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        })
    }

    const formatDate = (date) => {
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }

    return (
        <div className="w-full h-10 bg-black/20 backdrop-blur-md border-t border-white/20 flex items-center shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/5 to-black/10 pointer-events-none" />

            <button className="h-full rounded-full backdrop-blur-sm border border-white/20 ml-1.5 mr-2 md:mr-5 flex items-center justify-center hover:bg-white/10 transition-all duration-150 shadow-inner relative overflow-hidden">
                <div className="absolute h-full inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-sm" />
                <div className="relative z-10 flex items-center justify-center">
                    <div className="w-10 h-10 p-1 rounded-full  flex items-center justify-center relative z-10 shadow-lg overflow-hidden">
                        <img
                            src="./win7-logo.png"
                            alt="Windows Logo"
                            className="object-cover rounded-full"
                            style={{
                                filter: "drop-shadow(0 0 4px rgba(0, 0, 0, 0.3))",
                            }}
                        />
                    </div>
                </div>
            </button>

            <div className="flex items-center space-x-1.5">
                {isChatActive && (
                    <button
                        className="h-full w-12 px-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-sm flex items-center justify-center hover:bg-white/20 transition-all duration-150 relative overflow-hidden"
                        onClick={() => openChat()}
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-sm" />
                        <img src="./wlm-logo.png" alt="wlm-logo" className="w-full h-full object-contain" />
                    </button>
                )}
            </div>

            <div className="flex-1" />

            <div className="flex items-center space-x-2 mr-1">
                <button className="h-6 w-4 flex items-center justify-center hover:bg-white/10 rounded-sm transition-colors duration-150">
                    <FaChevronUp className="w-3 h-3 text-white/90" />
                </button>

                <button className="h-6 w-6 flex items-center justify-center hover:bg-white/10 rounded-sm transition-colors duration-150">
                    <MdWifi className="w-4 h-4 text-white/90" />
                </button>

                <button className="h-6 w-6 flex items-center justify-center hover:bg-white/10 rounded-sm transition-colors duration-150">
                    <FiVolume2 className="w-4 h-4 text-white/90" />
                </button>
            </div>

            <div className="rounded-sm px-2 py-2 mr-1 hover:bg-white/15 transition-all duration-150 cursor-pointer relative overflow-hidden">
                <div className="absolute inset-0  rounded-sm" />
                <div className="text-white text-xs font-medium leading-tight relative z-10 drop-shadow-sm">
                    <div className="text-center">{formatTime(currentTime)}</div>
                    <div className="text-center text-white/90">{formatDate(currentTime)}</div>
                </div>
            </div>

            <button className="h-full w-2 bg-white/10 backdrop-blur-sm border-l border-white/20 hover:bg-white/20 transition-all duration-150 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
            </button>
        </div>
    )
}
