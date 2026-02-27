import React, { useState, useRef, useEffect } from "react";
import { Mic, Send, AlertTriangle, FileText, Share2, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export function FieldLogs({ role }) {
    const { user } = useAuth();
    const [logText, setLogText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [summary, setSummary] = useState(null);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [todayTasks, setTodayTasks] = useState([]);
    const [recentLogs, setRecentLogs] = useState([]);
    const [error, setError] = useState('');
    const textareaRef = useRef(null);

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        if (selectedProjectId) {
            loadTodayTasks(selectedProjectId);
            loadRecentLogs(selectedProjectId);
        }
    }, [selectedProjectId]);

    const loadProjects = async () => {
        const { data } = await supabase
            .from('projects')
            .select('id, name')
            .order('created_at', { ascending: false });
        setProjects(data || []);
        if (data?.length > 0) setSelectedProjectId(data[0].id);
    };

    const loadTodayTasks = async (projectId) => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('tasks')
            .select('id, name, status, progress')
            .eq('project_id', projectId)
            .in('status', ['in_progress', 'todo'])
            .order('priority', { ascending: false })
            .limit(5);
        setTodayTasks(data || []);
    };

    const loadRecentLogs = async (projectId) => {
        const query = supabase
            .from('site_logs')
            .select('id, raw_text, ai_summary, log_date, created_at, flagged, profiles(full_name)')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(5);

        // Worker sees only own logs
        if (role === 'worker') {
            query.eq('submitted_by', user.id);
        }

        const { data } = await query;
        setRecentLogs(data || []);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!logText.trim() || !selectedProjectId) return;

        setIsSubmitting(true);
        setSummary(null);
        setError('');

        try {
            const { data, error: fnError } = await supabase.functions.invoke('summarize-log', {
                body: {
                    project_id: selectedProjectId,
                    raw_text: logText.trim(),
                },
            });

            if (fnError) throw fnError;

            if (data?.ai_summary) {
                setSummary(data.ai_summary);
                setLogText("");
                loadRecentLogs(selectedProjectId);
            } else if (data?.error) {
                setError(data.error);
            }
        } catch (err) {
            console.error('Log submit error:', err);
            setError(err.message || 'Failed to submit log');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFlag = async (logId) => {
        await supabase
            .from('site_logs')
            .update({ flagged: true })
            .eq('id', logId);
        loadRecentLogs(selectedProjectId);
    };

    return (
        <div className="flex flex-col lg:flex-row h-full gap-6 fade-in w-full">
            {/* Left Column: Capture Panel */}
            <section aria-label="Submit New Site Log" className="w-full lg:w-1/2 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden h-fit lg:h-full">
                <div className="p-4 border-b border-border bg-accent/30 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">New Site Log</h2>
                        <p className="text-xs text-muted-foreground mt-0.5 font-data">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    {projects.length > 1 && (
                        <select
                            value={selectedProjectId || ''}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="bg-background border border-border text-foreground text-xs rounded-md p-1.5 focus-ring"
                            aria-label="Select project for log"
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="p-4 bg-background">
                    <p className="text-sm font-bold text-foreground mb-2">Active Tasks:</p>
                    <ul className="space-y-2 mb-4">
                        {todayTasks.length === 0 ? (
                            <li className="text-sm text-muted-foreground">No active tasks found.</li>
                        ) : (
                            todayTasks.map(task => (
                                <li key={task.id} className="flex items-center gap-2 text-sm">
                                    {task.status === 'done' ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0"></div>
                                    )}
                                    <span className={task.status === 'done' ? 'text-muted-foreground' : 'text-foreground font-medium'}>
                                        {task.name}
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4 border-t border-border">
                    <label htmlFor="log-input" className="text-sm font-bold text-foreground mb-2 block">
                        Field Notes / Voice Transcription
                    </label>
                    <div className="relative flex-1 min-h-[150px] lg:min-h-[auto] mb-4">
                        <textarea
                            id="log-input"
                            ref={textareaRef}
                            value={logText}
                            onChange={(e) => setLogText(e.target.value)}
                            placeholder="e.g., We finished the survey but the excavator broke down..."
                            className="w-full h-full p-3 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground resize-none focus-ring text-sm"
                            disabled={isSubmitting}
                        />
                        <button
                            type="button"
                            className="absolute bottom-3 right-3 p-2 bg-accent text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full focus-ring transition-colors"
                            aria-label="Start Voice Recording"
                        >
                            <Mic className="w-5 h-5" />
                        </button>
                    </div>

                    {error && (
                        <div className="text-sm text-danger bg-danger/10 p-2 rounded-md mb-3" role="alert">{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting || !logText.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 px-4 rounded-md font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 focus-ring transition-transform active:scale-[0.98]"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing via AI...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Submit Log
                            </>
                        )}
                    </button>
                </form>
            </section>

            {/* Right Column: AI Summary Output + Recent Logs */}
            <section
                aria-label="AI Log Summary"
                className="w-full lg:w-1/2 flex flex-col gap-6"
            >
                {/* AI Summary */}
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-border bg-accent/30 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            AI Summary
                        </h2>
                    </div>

                    <div aria-live="polite" aria-atomic="true" className="p-6 flex flex-col justify-center items-center">
                        {isSubmitting ? (
                            <div className="text-center space-y-4 fade-in">
                                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                </div>
                                <p className="text-foreground font-medium">Extracting intelligence...</p>
                                <p className="text-xs text-muted-foreground">Classifying blockers, progress, and next steps.</p>
                            </div>
                        ) : summary ? (
                            <div className="w-full space-y-6 fade-in">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-green-600 dark:text-green-500 flex items-center gap-2 uppercase tracking-wide">
                                        <CheckCircle2 className="w-4 h-4" /> Progress
                                    </h3>
                                    <p className="text-sm text-foreground bg-accent/50 p-3 rounded-md border-l-2 border-green-500">
                                        {summary.progress}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-danger flex items-center gap-2 uppercase tracking-wide">
                                        <AlertTriangle className="w-4 h-4" /> Blockers & Delays
                                    </h3>
                                    <p className="text-sm text-foreground bg-accent/50 p-3 rounded-md border-l-2 border-danger">
                                        {summary.blockers}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-500 flex items-center gap-2 uppercase tracking-wide">
                                        <ChevronRight className="w-4 h-4" /> Next Steps
                                    </h3>
                                    <p className="text-sm text-foreground bg-accent/50 p-3 rounded-md border-l-2 border-blue-500">
                                        {summary.next_steps}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center space-y-2 opacity-50">
                                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                                <p className="text-foreground font-medium">No log submitted yet.</p>
                                <p className="text-xs text-muted-foreground">Submit notes via the panel to generate a structured AI summary.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Logs */}
                {recentLogs.length > 0 && (
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h3 className="text-sm font-bold text-foreground">Recent Logs</h3>
                        </div>
                        <ul className="divide-y divide-border max-h-[300px] overflow-auto">
                            {recentLogs.map(log => (
                                <li key={log.id} className="p-4 hover:bg-accent/50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-data text-muted-foreground">{log.log_date}</p>
                                            <p className="text-sm text-foreground mt-1 line-clamp-2">{log.ai_summary?.progress || log.raw_text.substring(0, 100)}</p>
                                        </div>
                                        {log.flagged && (
                                            <span className="text-xs text-danger font-bold">Flagged</span>
                                        )}
                                    </div>
                                    {role === 'admin' && (
                                        <p className="text-xs text-muted-foreground mt-1">By: {log.profiles?.full_name || 'Unknown'}</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>
        </div>
    );
}
