import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
const STORAGE_KEY = "zkclinic-ui-theme";
function readStoredTheme() {
    if (typeof window === "undefined")
        return "light";
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw === "dark" ? "dark" : "light";
    }
    catch {
        return "light";
    }
}
const ThemeContext = createContext(null);
export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => readStoredTheme());
    useLayoutEffect(() => {
        document.documentElement.dataset.theme = theme;
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        }
        catch {
            /* ignore */
        }
    }, [theme]);
    const setThemeStable = useCallback((t) => setTheme(t), []);
    const toggleTheme = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);
    const value = useMemo(() => ({ theme, setTheme: setThemeStable, toggleTheme }), [theme, setThemeStable, toggleTheme]);
    return _jsx(ThemeContext.Provider, { value: value, children: children });
}
export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx)
        throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}
