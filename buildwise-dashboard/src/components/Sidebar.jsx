import React from "react";
import {
    Building2,
    LayoutDashboard,
    CalendarDays,
    ClipboardCheck,
    Package,
    FolderKanban,
    Users,
    ListTodo,
    Settings,
    HelpCircle
} from "lucide-react";
import { cn } from "../lib/utils";

const ALL_NAV_ITEMS = [
    { id: "overview", label: "Project Overview", icon: LayoutDashboard, roles: ["admin", "client"] },
    { id: "projects", label: "Projects", icon: FolderKanban, roles: ["admin"] },
    { id: "timeline", label: "Timeline / Gantt", icon: CalendarDays, roles: ["admin"] },
    { id: "mytasks", label: "My Tasks", icon: ListTodo, roles: ["worker"] },
    { id: "logs", label: "Site Logs", icon: ClipboardCheck, roles: ["admin", "worker"] },
    { id: "materials", label: "Materials / DSR", icon: Package, roles: ["admin"] },
    { id: "team", label: "Team", icon: Users, roles: ["admin"] },
];

export function Sidebar({ activeModule, setActiveModule, role }) {
    const navItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(role));

    return (
        <aside className="w-64 flex-shrink-0 bg-card border-r border-border h-full flex flex-col">
            {/* Organization & Project Header */}
            <div className="p-4 border-b border-border">
                <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
                    <Building2 className="w-6 h-6 text-primary" />
                    BuildWise
                </h1>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{role} Dashboard</p>
            </div>

            {/* Primary Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Main Navigation">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveModule(item.id)}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md focus-ring transition-transform hover:-translate-y-px",
                                isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <Icon className="w-5 h-5" aria-hidden="true" />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            {/* Footer Navigation */}
            <div className="p-4 border-t border-border space-y-1">
                {role === "admin" && (
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground focus-ring transition-transform hover:-translate-y-px">
                        <Settings className="w-5 h-5" aria-hidden="true" />
                        Settings
                    </button>
                )}
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground focus-ring transition-transform hover:-translate-y-px">
                    <HelpCircle className="w-5 h-5" aria-hidden="true" />
                    Help & Support
                </button>
            </div>
        </aside>
    );
}
