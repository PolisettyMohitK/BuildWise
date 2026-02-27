import React, { useEffect, useState } from "react";
import { Palette } from "lucide-react";

export const THEMES = [
    { id: "field-daylight", label: "Preset A - Field Daylight" },
    { id: "night-shift", label: "Preset B - Night Shift" },
    { id: "high-contrast", label: "Preset C - High Contrast" },
    { id: "calm-concrete", label: "Preset D - Calm Concrete" },
];

export function ThemeToggle() {
    const [theme, setTheme] = useState("field-daylight");
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check for saved theme or system preference on load
        const savedTheme = localStorage.getItem("buildwise-theme");
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute("data-theme", savedTheme);
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setTheme("night-shift");
            document.documentElement.setAttribute("data-theme", "night-shift");
        } else {
            setTheme("field-daylight");
            document.documentElement.removeAttribute("data-theme");
        }
    }, []);

    const handleThemeChange = (newThemeId) => {
        setTheme(newThemeId);
        localStorage.setItem("buildwise-theme", newThemeId);

        if (newThemeId === "field-daylight") {
            document.documentElement.removeAttribute("data-theme");
        } else {
            document.documentElement.setAttribute("data-theme", newThemeId);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground focus-ring transition-transform hover:-translate-y-px"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label="Select Dashboard Theme"
            >
                <Palette className="w-4 h-4" aria-hidden="true" />
                <span className="hidden md:inline">Theme</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 p-1 bg-card border border-border rounded-md shadow-lg z-50">
                    <ul role="listbox" tabIndex={-1} className="py-1">
                        {THEMES.map((t) => (
                            <li key={t.id} role="option" aria-selected={theme === t.id}>
                                <button
                                    onClick={() => handleThemeChange(t.id)}
                                    className={`w-full text-left px-4 py-2 text-sm rounded-sm focus-ring ${theme === t.id
                                            ? "bg-primary text-primary-foreground font-semibold"
                                            : "text-foreground hover:bg-accent"
                                        }`}
                                >
                                    {t.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
