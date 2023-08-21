import { useState, useEffect } from "react";

function getStorageValue(key, defaultValue) {
    try {
        // getting stored value
        const saved = localStorage.getItem(key);
        if (saved === null) {
            return defaultValue;
        }
        const initial = JSON.parse(saved);
        return initial || defaultValue;
    } catch (e) {
        console.error(e);
        return defaultValue;
    }
}

export const useLocalStorage = (key, defaultValue) => {
    const [value, setValue] = useState(() => {
        return getStorageValue(key, defaultValue);
    });

    useEffect(() => {
        console.log("Changing item");
        // storing input name
        localStorage.setItem(key, JSON.stringify(value));
    }, [key, value]);

    return [value, setValue];
};