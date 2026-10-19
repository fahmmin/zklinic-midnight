import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useZKClinic } from "../contexts/ZKClinicContext";
/** Dispatch on `window` to open the palette from any button (e.g. the app header). */
export const OPEN_COMMAND_PALETTE_EVENT = "zkclinic:open-command-palette";
export function CommandPalette() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { contractAddress } = useZKClinic();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const [toast, setToast] = useState(null);
    const inputRef = useRef(null);
    const close = useCallback(() => {
        setOpen(false);
        setQuery("");
        setActive(0);
    }, []);
    useEffect(() => {
        function onKeyDown(event) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setOpen((v) => !v);
                setQuery("");
                setActive(0);
            }
            else if (event.key === "Escape") {
                setOpen(false);
            }
        }
        function onOpenRequest() {
            setOpen(true);
            setQuery("");
            setActive(0);
        }
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenRequest);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenRequest);
        };
    }, []);
    useEffect(() => {
        if (open)
            inputRef.current?.focus();
    }, [open]);
    useEffect(() => {
        if (!toast)
            return;
        const t = window.setTimeout(() => setToast(null), 2200);
        return () => window.clearTimeout(t);
    }, [toast]);
    const commands = useMemo(() => {
        const go = (path) => () => navigate(path);
        const list = [
            { id: "patient", label: "Go to Patient", hint: "Health card & trial matching", run: go("/app/patient") },
            { id: "doctor", label: "Go to Doctor", hint: "Issue & revoke credentials", run: go("/app/doctor") },
            { id: "trials", label: "Go to Trial programs", hint: "Create & manage trials", run: go("/app/trials") },
            { id: "contract", label: "Go to Contract", hint: "On-chain registry state", run: go("/app/contract") },
            { id: "home", label: "Go to Home", run: go("/") },
            { id: "docs", label: "Open Docs", hint: "Technical reference", run: go("/docs") },
            { id: "about", label: "Open About", run: go("/about") },
            {
                id: "theme",
                label: theme === "light" ? "Switch to dark mode" : "Switch to light mode",
                run: toggleTheme
            }
        ];
        if (contractAddress) {
            list.push({
                id: "copy-address",
                label: "Copy contract address",
                hint: `${contractAddress.slice(0, 8)}…${contractAddress.slice(-6)}`,
                run: async () => {
                    try {
                        await navigator.clipboard.writeText(contractAddress);
                        setToast("Contract address copied");
                    }
                    catch {
                        setToast("Couldn’t access the clipboard");
                    }
                }
            });
        }
        return list;
    }, [contractAddress, navigate, theme, toggleTheme]);
    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q)
            return commands;
        // Label matches rank above hint-only matches so Enter picks the obvious command.
        const byLabel = commands.filter((c) => c.label.toLowerCase().includes(q));
        const byHint = commands.filter((c) => !byLabel.includes(c) && (c.hint ?? "").toLowerCase().includes(q));
        return [...byLabel, ...byHint];
    }, [commands, query]);
    const activeIndex = Math.min(active, Math.max(results.length - 1, 0));
    function runCommand(command) {
        if (!command)
            return;
        close();
        void command.run();
    }
    function onInputKeyDown(event) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((activeIndex + 1) % Math.max(results.length, 1));
        }
        else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((activeIndex - 1 + results.length) % Math.max(results.length, 1));
        }
        else if (event.key === "Enter") {
            event.preventDefault();
            runCommand(results[activeIndex]);
        }
    }
    return (_jsxs(_Fragment, { children: [toast ? (_jsx("div", { className: "zk-toast", role: "status", "data-testid": "palette-toast", children: toast })) : null, open ? (_jsx("div", { className: "zk-palette-backdrop", onMouseDown: (e) => {
                    if (e.target === e.currentTarget)
                        close();
                }, "data-testid": "command-palette", children: _jsxs("div", { className: "zk-palette", role: "dialog", "aria-modal": "true", "aria-label": "Command palette", children: [_jsx("input", { ref: inputRef, className: "zk-palette-input", placeholder: "Type a command or page\u2026", value: query, onChange: (e) => {
                                setQuery(e.target.value);
                                setActive(0);
                            }, onKeyDown: onInputKeyDown, role: "combobox", "aria-expanded": "true", "aria-controls": "zk-palette-list", "aria-activedescendant": results[activeIndex] ? `zk-palette-${results[activeIndex].id}` : undefined, "data-testid": "command-palette-input" }), _jsx("ul", { id: "zk-palette-list", className: "zk-palette-list", role: "listbox", children: results.length === 0 ? (_jsx("li", { className: "zk-palette-empty", children: "No matching commands" })) : (results.map((command, index) => (_jsxs("li", { id: `zk-palette-${command.id}`, role: "option", "aria-selected": index === activeIndex, className: `zk-palette-item${index === activeIndex ? " is-active" : ""}`, onMouseMove: () => setActive(index), onClick: () => runCommand(command), "data-testid": `palette-item-${command.id}`, children: [_jsx("span", { children: command.label }), command.hint ? _jsx("span", { className: "zk-palette-hint", children: command.hint }) : null] }, command.id)))) }), _jsx("p", { className: "zk-palette-foot", children: "\u2191\u2193 navigate \u00B7 Enter select \u00B7 Esc close" })] }) })) : null] }));
}
