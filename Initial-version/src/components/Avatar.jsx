import "./Avatar.css";

import React from "react";

export default function Avatar({
    size = 64,
    top = 2,
    left = 4,
    minus = 15,
}) {

    let calculatedSize;
    switch (String(size)) {
        case "32":
            calculatedSize = 70;
            break;
        case "64":
            calculatedSize = 100;
            break;
        case "96":
            calculatedSize = 120;
            break;
        default:
            calculatedSize = size;
    }

    const avatarDivStyle = {
        width: `${calculatedSize - minus}px`,
        height: `${calculatedSize - minus}px`
    };

    const avatarFrameStyle = {
        marginLeft: `${left}px`,
        marginTop: `${top}px`,
        width: `${calculatedSize + 1}px`
    };

    return (
        <div className="modal-border-container">
            <div id="modal-border-avatar-div" style={avatarDivStyle}>
                <img
                    id="modal-border-avatar-frame"
                    src="./assets/status/frame_64.png"
                    alt=""
                    style={avatarFrameStyle}
                />
                <div id="frame-div-avatar">
                    <img id="modal-border-avatar-picture" src="./assets/usertiles/default.png" alt="" />
                </div>
            </div>
        </div>
    );
}
