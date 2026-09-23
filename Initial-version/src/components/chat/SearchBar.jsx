import React, { useState, useRef, useEffect } from 'react';

export default function SearchBar({ initialValue, onSearch }) {
    const [value, setValue] = useState('');
    const [isReset, setIsReset] = useState(false);
    const inputRef = useRef(null);

    const handleInputClick = () => {
        if (!isReset) {
            setIsReset(true);
            setValue('');
        }
    };

    const handleClickOutside = (event) => {
        if (inputRef.current && !inputRef.current.contains(event.target)) {
            setIsReset(false);
            setValue('');
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <input
            className="p-1.5 border rounded-[4px] w-full searchbar bg-transparent text-[#6b8fa3]"
            ref={inputRef}
            type="text"
            value={value}
            placeholder={initialValue}
            onClick={handleInputClick}
            onChange={(e) => {
                const nextValue = e.target.value;
                setIsReset(true);
                setValue(nextValue);
                onSearch?.(nextValue);
            }}
        />
    );
};
