import React from "react";
import { Search, Bell, LogOut, User } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar({ profile, onSignOut }) {
    return (
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <label htmlFor="global-search" className="sr-only">Search projects, tasks, materials</label>
                <input
                    id="global-search"
                    type="search"
                    placeholder="Search projects, tasks, materials..."
                    className="w-full bg-background border border-border text-foreground pl-10 pr-4 py-2 rounded-md text-sm focus-ring placeholder:text-muted-foreground"
                />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 ml-4">
                <ThemeToggle />

                <button
                    className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md focus-ring transition-colors"
                    aria-label="Notifications"
                >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" aria-hidden="true"></span>
                </button>

                {/* User Info */}
                <div className="flex items-center gap-2 pl-3 border-l border-border">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="hidden md:block">
                        <p className="text-sm font-medium text-foreground leading-tight">
                            {profile?.full_name || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                            {profile?.role || 'loading'}
                        </p>
                    </div>
                    <button
                        onClick={onSignOut}
                        className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-md focus-ring transition-colors ml-1"
                        aria-label="Sign out"
                        title="Sign out"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </header>
    );
}
