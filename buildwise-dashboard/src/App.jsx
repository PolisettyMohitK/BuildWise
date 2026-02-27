import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ProjectOverview } from './components/ProjectOverview';
import { GanttTimeline } from './components/GanttTimeline';
import { FieldLogs } from './components/FieldLogs';
import { MaterialsLibrary } from './components/MaterialsLibrary';
import { ProjectManager } from './components/ProjectManager';
import { TeamManager } from './components/TeamManager';
import { WorkerTasks } from './components/WorkerTasks';
import { Loader2 } from 'lucide-react';

function DashboardShell() {
  const { profile, role, signOut, loading } = useAuth();
  const [activeModule, setActiveModule] = useState(() => {
    if (role === 'worker') return 'mytasks';
    if (role === 'client') return 'overview';
    return 'overview';
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:font-bold focus:outline-none focus:ring-4 focus:ring-accent"
      >
        Skip to main content
      </a>

      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} role={role} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopBar profile={profile} onSignOut={signOut} />

        <main
          id="main-content"
          tabIndex="-1"
          className="flex-1 overflow-auto focus:outline-none"
        >
          <div className="p-6 md:p-8 max-w-7xl mx-auto h-full">
            {activeModule === "overview" && <ProjectOverview role={role} />}
            {activeModule === "projects" && role === "admin" && <ProjectManager />}
            {activeModule === "timeline" && <GanttTimeline role={role} />}
            {activeModule === "mytasks" && role === "worker" && <WorkerTasks />}
            {activeModule === "logs" && <FieldLogs role={role} />}
            {activeModule === "materials" && role === "admin" && <MaterialsLibrary />}
            {activeModule === "team" && role === "admin" && <TeamManager />}
          </div>
        </main>

        <footer className="h-8 border-t border-border bg-accent text-accent-foreground text-xs font-data flex items-center px-4 justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true"></span>
            <span>System Operational</span>
          </div>
          <span className="flex items-center gap-2">
            <span className="capitalize">{role}</span>
            <span className="text-muted-foreground">•</span>
            <span>Sync: Up to date</span>
          </span>
        </footer>
      </div>
    </div>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!session) return <LoginPage />;
  return <DashboardShell />;
}

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

export default App;
