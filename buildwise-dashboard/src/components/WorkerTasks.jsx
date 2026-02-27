import React, { useState, useEffect } from "react";
import { CheckCircle2, Clock, AlertTriangle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";

export function WorkerTasks() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [expandedTask, setExpandedTask] = useState(null);

    useEffect(() => { loadTasks(); }, []);

    const loadTasks = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('tasks')
            .select('*, phases(name), projects(name)')
            .eq('assigned_to', user.id)
            .order('end_date', { ascending: true });
        setTasks(data || []);
        setLoading(false);
    };

    const updateStatus = async (taskId, newStatus) => {
        setUpdating(taskId);
        const progress = newStatus === 'done' ? 100 : newStatus === 'in_progress' ? undefined : 0;
        const update = { status: newStatus };
        if (progress !== undefined) update.progress = progress;

        await supabase.from('tasks').update(update).eq('id', taskId);
        loadTasks();
        setUpdating(null);
    };

    const updateProgress = async (taskId, progress) => {
        await supabase.from('tasks').update({ progress }).eq('id', taskId);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress } : t));
    };

    const statusIcon = (status) => {
        if (status === 'done') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
        if (status === 'in_progress') return <Clock className="w-5 h-5 text-blue-500" />;
        if (status === 'blocked') return <AlertTriangle className="w-5 h-5 text-danger" />;
        return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />;
    };

    const statusBg = (status) => {
        if (status === 'done') return 'border-green-500/30 bg-green-500/5';
        if (status === 'in_progress') return 'border-blue-500/30 bg-blue-500/5';
        if (status === 'blocked') return 'border-danger/30 bg-danger/5';
        return 'border-border';
    };

    const daysUntilDue = (endDate) => {
        if (!endDate) return null;
        const diff = Math.ceil((new Date(endDate) - new Date()) / 86400000);
        if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, urgent: true };
        if (diff === 0) return { text: 'Due today', urgent: true };
        if (diff <= 3) return { text: `${diff}d left`, urgent: true };
        return { text: `${diff}d left`, urgent: false };
    };

    const activeTasks = tasks.filter(t => t.status !== 'done');
    const completedTasks = tasks.filter(t => t.status === 'done');

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 fade-in">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">My Tasks</h2>
                <p className="text-muted-foreground mt-1">
                    {activeTasks.length} active, {completedTasks.length} completed
                </p>
            </div>

            {tasks.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                    <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="text-lg font-bold text-foreground">No tasks assigned</h3>
                    <p className="text-sm text-muted-foreground mt-1">Ask your project manager to assign tasks to you.</p>
                </div>
            ) : (
                <>
                    {/* Active Tasks */}
                    {activeTasks.length > 0 && (
                        <section aria-label="Active Tasks">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Active ({activeTasks.length})</h3>
                            <div className="space-y-3">
                                {activeTasks.map(task => {
                                    const due = daysUntilDue(task.end_date);
                                    const isExpanded = expandedTask === task.id;
                                    return (
                                        <div key={task.id} className={cn("border rounded-xl p-4 transition-colors", statusBg(task.status))}>
                                            <div className="flex items-start gap-3">
                                                <div className="pt-0.5">{statusIcon(task.status)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <button
                                                        onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                                                        className="text-left w-full focus-ring rounded-sm"
                                                    >
                                                        <h4 className="font-bold text-foreground">{task.name}</h4>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {task.projects?.name} → {task.phases?.name}
                                                        </p>
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="mt-3 space-y-3 fade-in">
                                                            {task.description && (
                                                                <p className="text-sm text-foreground bg-background/50 p-2 rounded">{task.description}</p>
                                                            )}

                                                            {/* Progress Slider */}
                                                            {task.status === 'in_progress' && (
                                                                <div>
                                                                    <label htmlFor={`progress-${task.id}`} className="text-xs font-medium text-muted-foreground">
                                                                        Progress: {task.progress}%
                                                                    </label>
                                                                    <input
                                                                        id={`progress-${task.id}`}
                                                                        type="range"
                                                                        min="0" max="100" step="5"
                                                                        value={task.progress}
                                                                        onChange={(e) => updateProgress(task.id, Number(e.target.value))}
                                                                        className="w-full mt-1 accent-primary"
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Status Actions */}
                                                            <div className="flex flex-wrap gap-2">
                                                                {task.status === 'todo' && (
                                                                    <button
                                                                        onClick={() => updateStatus(task.id, 'in_progress')}
                                                                        disabled={updating === task.id}
                                                                        className="text-xs font-bold px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-500/20 focus-ring disabled:opacity-50"
                                                                    >
                                                                        {updating === task.id ? 'Updating...' : 'Start Work'}
                                                                    </button>
                                                                )}
                                                                {task.status === 'in_progress' && (
                                                                    <button
                                                                        onClick={() => updateStatus(task.id, 'done')}
                                                                        disabled={updating === task.id}
                                                                        className="text-xs font-bold px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-md hover:bg-green-500/20 focus-ring disabled:opacity-50"
                                                                    >
                                                                        {updating === task.id ? 'Updating...' : 'Mark Complete'}
                                                                    </button>
                                                                )}
                                                                {task.status === 'blocked' && (
                                                                    <span className="text-xs font-bold px-3 py-1.5 bg-danger/10 text-danger rounded-md">
                                                                        Blocked — contact your supervisor
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {due && (
                                                        <span className={cn("text-xs font-data font-bold", due.urgent ? "text-danger" : "text-muted-foreground")}>
                                                            {due.text}
                                                        </span>
                                                    )}
                                                    <button onClick={() => setExpandedTask(isExpanded ? null : task.id)} className="p-1 text-muted-foreground hover:text-foreground rounded focus-ring" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Completed Tasks */}
                    {completedTasks.length > 0 && (
                        <section aria-label="Completed Tasks">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Completed ({completedTasks.length})</h3>
                            <div className="space-y-2 opacity-60">
                                {completedTasks.map(task => (
                                    <div key={task.id} className="border border-border rounded-lg p-3 flex items-center gap-3">
                                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground line-through">{task.name}</p>
                                            <p className="text-xs text-muted-foreground">{task.projects?.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
