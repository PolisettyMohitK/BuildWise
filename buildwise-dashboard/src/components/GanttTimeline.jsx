import React, { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { X, Calendar, DollarSign, Settings2, ArrowRight, Loader2, Plus, Sparkles, AlertTriangle, Edit3, Trash2, User, Save } from "lucide-react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export function GanttTimeline({ role }) {
    const { user } = useAuth();
    const [timelineData, setTimelineData] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [genDescription, setGenDescription] = useState('');
    const [genLocation, setGenLocation] = useState('');
    const [genWeeks, setGenWeeks] = useState(24);
    const [workers, setWorkers] = useState([]);
    const [showAddTask, setShowAddTask] = useState(null);
    const [addTaskForm, setAddTaskForm] = useState({ name: '', description: '', start_date: '', end_date: '', priority: 3 });
    const [savingTask, setSavingTask] = useState(false);

    // Manual Phase Add
    const [showAddPhase, setShowAddPhase] = useState(false);
    const [addPhaseForm, setAddPhaseForm] = useState({ name: '', description: '' });
    const [savingPhase, setSavingPhase] = useState(false);

    const [genError, setGenError] = useState('');
    const drawerRef = useRef(null);
    const overlayRef = useRef(null);

    useEffect(() => {
        loadProjects();
        if (role === 'admin') loadWorkers();
    }, []);

    useEffect(() => {
        if (selectedProjectId) loadTimeline(selectedProjectId);
    }, [selectedProjectId]);

    // GSAP Drawer Animation
    useEffect(() => {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let ctx = gsap.context(() => {
            if (selectedTask) {
                if (!prefersReducedMotion) {
                    gsap.from(overlayRef.current, { opacity: 0, duration: 0.2 });
                    gsap.from(drawerRef.current, { x: "100%", duration: 0.3, ease: "power2.out" });
                }
                drawerRef.current?.focus();
            }
        });
        return () => ctx.revert();
    }, [selectedTask]);

    const loadProjects = async () => {
        const { data } = await supabase
            .from('projects')
            .select('id, name, status')
            .order('created_at', { ascending: false });

        setProjects(data || []);
        if (data?.length > 0) setSelectedProjectId(data[0].id);
        else setLoading(false);
    };

    const loadTimeline = async (projectId) => {
        setLoading(true);
        const { data: phases } = await supabase
            .from('phases')
            .select('id, name, order_index, start_date, end_date')
            .eq('project_id', projectId)
            .order('order_index');

        if (!phases || phases.length === 0) {
            setTimelineData([]);
            setLoading(false);
            return;
        }

        const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', projectId)
            .order('start_date');

        const grouped = (phases || []).map(phase => ({
            phase: phase.name,
            phaseId: phase.id,
            tasks: (tasks || []).filter(t => t.phase_id === phase.id).map(t => ({
                ...t,
                cost: t.estimated_cost ? `₹${Number(t.estimated_cost).toLocaleString('en-IN')}` : '—',
                blockedBy: t.dependencies?.length > 0 ? t.dependencies : null,
                insight: t.ai_insight || null,
            })),
        }));

        setTimelineData(grouped);
        setLoading(false);
    };

    const loadWorkers = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .in('role', ['worker', 'admin']);
        setWorkers(data || []);
    };

    const handleAddPhase = async () => {
        if (!addPhaseForm.name.trim() || !selectedProjectId) return;
        setSavingPhase(true);

        // Find next order index
        const order_index = timelineData.length > 0
            ? Math.max(...timelineData.map(p => p.tasks[0]?.order_index || 0)) + 1
            : 1;

        const { error } = await supabase.from('phases').insert({
            project_id: selectedProjectId,
            name: addPhaseForm.name,
            description: addPhaseForm.description || null,
            order_index
        });

        if (!error) {
            setAddPhaseForm({ name: '', description: '' });
            setShowAddPhase(false);
            loadTimeline(selectedProjectId);
        }
        setSavingPhase(false);
    };

    const handleAddTask = async (phaseId) => {
        if (!addTaskForm.name.trim() || !selectedProjectId) return;
        setSavingTask(true);
        const { error } = await supabase.from('tasks').insert({
            phase_id: phaseId,
            project_id: selectedProjectId,
            name: addTaskForm.name,
            description: addTaskForm.description || null,
            start_date: addTaskForm.start_date || null,
            end_date: addTaskForm.end_date || null,
            priority: addTaskForm.priority,
            status: 'todo',
            progress: 0,
        });
        if (!error) {
            setAddTaskForm({ name: '', description: '', start_date: '', end_date: '', priority: 3 });
            setShowAddTask(null);
            loadTimeline(selectedProjectId);
        }
        setSavingTask(false);
    };

    const handleUpdateTask = async (taskId, updates) => {
        await supabase.from('tasks').update(updates).eq('id', taskId);
        loadTimeline(selectedProjectId);
        setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
    };

    const handleDeleteTask = async (taskId) => {
        if (!confirm('Delete this task? This cannot be undone.')) return;
        await supabase.from('tasks').delete().eq('id', taskId);
        setSelectedTask(null);
        loadTimeline(selectedProjectId);
    };

    const closeDrawer = () => {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let ctx = gsap.context(() => {
            if (!prefersReducedMotion) {
                gsap.to(overlayRef.current, { opacity: 0, duration: 0.2 });
                gsap.to(drawerRef.current, {
                    x: "100%", duration: 0.2, ease: "power2.in",
                    onComplete: () => setSelectedTask(null)
                });
            } else {
                setSelectedTask(null);
            }
        });
        return () => ctx.revert();
    };

    const handleEstimateCost = async (taskId) => {
        try {
            const { data, error } = await supabase.functions.invoke('estimate-cost', {
                body: { task_id: taskId },
            });
            if (error) throw error;
            // Refresh timeline to show updated cost
            if (selectedProjectId) loadTimeline(selectedProjectId);
            if (data?.cost_breakdown) {
                setSelectedTask(prev => prev ? { ...prev, estimated_cost: data.cost_breakdown.total_estimated_cost, cost: `₹${Number(data.cost_breakdown.total_estimated_cost).toLocaleString('en-IN')}`, cost_breakdown: data.cost_breakdown } : null);
            }
        } catch (err) {
            console.error('Cost estimation error:', err);
        }
    };

    const handleGenerateSchedule = async () => {
        if (!selectedProjectId || !genDescription.trim()) return;
        setGenerating(true);
        setGenError('');
        try {
            const { data, error } = await supabase.functions.invoke('generate-schedule', {
                body: {
                    project_id: selectedProjectId,
                    description: genDescription,
                    location: genLocation || undefined,
                    duration_weeks: genWeeks || undefined,
                },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
            setShowGenerateModal(false);
            setGenDescription('');
            loadTimeline(selectedProjectId);
        } catch (err) {
            console.error('Schedule generation error:', err);
            setGenError(err.message || 'Failed to generate schedule. Check console.');
        } finally {
            setGenerating(false);
        }
    };

    // Date helpers for Gantt bar positioning
    const allTasks = timelineData.flatMap(p => p.tasks);
    const minDate = allTasks.length > 0 ? new Date(Math.min(...allTasks.map(t => new Date(t.start_date || Date.now())))) : new Date();
    const maxDate = allTasks.length > 0 ? new Date(Math.max(...allTasks.map(t => new Date(t.end_date || Date.now())))) : new Date(Date.now() + 30 * 86400000);
    const totalDays = Math.max(1, (maxDate - minDate) / 86400000);

    const getBarStyle = (task) => {
        if (!task.start_date || !task.end_date) return { left: '0%', width: '10%' };
        const start = (new Date(task.start_date) - minDate) / 86400000;
        const duration = Math.max(1, (new Date(task.end_date) - new Date(task.start_date)) / 86400000);
        return {
            left: `${(start / totalDays) * 100}%`,
            width: `${Math.max(2, (duration / totalDays) * 100)}%`,
        };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col relative fade-in w-full">
            <div className="flex justify-between items-end mb-6 flex-shrink-0 gap-4 flex-wrap">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Timeline & Gantt</h2>
                    <p className="text-muted-foreground mt-1">Visualize dependencies and critical path.</p>
                </div>
                <div className="flex items-center gap-3">
                    {projects.length > 1 && (
                        <select
                            value={selectedProjectId || ''}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="bg-background border border-border text-foreground text-sm rounded-md p-2 focus-ring"
                            aria-label="Select project"
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    )}
                    {role === 'admin' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowAddPhase(true)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-bold bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 focus-ring transition-transform hover:-translate-y-px border border-border"
                            >
                                <Plus className="w-4 h-4" />
                                Add Phase
                            </button>
                            <button
                                onClick={() => setShowGenerateModal(true)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus-ring transition-transform hover:-translate-y-px"
                            >
                                <Sparkles className="w-4 h-4" />
                                AI Generate Schedule
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Empty State */}
            {timelineData.length === 0 ? (
                <div className="flex-1 bg-card border border-border rounded-xl shadow-sm flex flex-col items-center justify-center p-12 text-center">
                    <Calendar className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-foreground">No schedule yet</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                        {role === 'admin'
                            ? 'Click "Add Phase" or "AI Generate Schedule" to start creating the timeline.'
                            : 'The project schedule has not been created yet.'}
                    </p>
                </div>
            ) : (
                /* Gantt Area */
                <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                    {/* Time Header */}
                    <div className="flex border-b border-border bg-accent/50 h-10 items-center font-data text-xs text-muted-foreground px-4">
                        <div className="w-1/3">Task Hierarchy</div>
                        <div className="w-2/3 flex justify-between px-4 border-l border-border">
                            <span>{minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <span>{new Date((minDate.getTime() + maxDate.getTime()) / 2).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <span>{maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                    </div>

                    {/* Gantt Body */}
                    <div className="flex-1 overflow-auto p-4 space-y-6">
                        {timelineData.map((phase, pIdx) => (
                            <div key={pIdx} className="space-y-2">
                                <h3 className="font-bold text-foreground text-sm uppercase tracking-wide border-b border-border pb-1">
                                    {phase.phase}
                                </h3>
                                <div className="space-y-3 pt-2">
                                    {phase.tasks.map(task => (
                                        <div key={task.id} className="flex items-center gap-4 group">
                                            <div className="w-1/3 pr-4 flex items-center justify-between">
                                                <button
                                                    onClick={() => setSelectedTask(task)}
                                                    className="text-sm font-medium text-foreground hover:text-primary text-left truncate focus-ring rounded-sm"
                                                    aria-label={`View details for ${task.name}`}
                                                >
                                                    {task.name}
                                                </button>
                                                {task.blockedBy && (
                                                    <span className="text-xs bg-danger/10 text-danger px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Blocked
                                                    </span>
                                                )}
                                            </div>
                                            <div className="w-2/3 relative h-6 bg-accent rounded-sm border-l border-border">
                                                <button
                                                    onClick={() => setSelectedTask(task)}
                                                    className={cn(
                                                        "absolute top-0 h-full rounded-sm opacity-90 hover:opacity-100 focus-ring cursor-pointer transition-colors shadow-sm",
                                                        task.status === 'done' ? "bg-primary" :
                                                            task.status === 'in_progress' ? "bg-blue-500" :
                                                                task.status === 'blocked' ? "bg-danger" : "bg-muted-foreground"
                                                    )}
                                                    style={getBarStyle(task)}
                                                    aria-label={`${task.name} bar. Status: ${task.status}`}
                                                >
                                                    <div className="h-full bg-white/30 rounded-l-sm" style={{ width: `${task.progress}%` }} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Add Task Button (Admin) */}
                                    {role === 'admin' && (
                                        showAddTask === phase.phaseId ? (
                                            <div className="mt-2 p-3 border border-dashed border-primary/30 rounded-lg bg-primary/5 space-y-2">
                                                <input type="text" value={addTaskForm.name} onChange={(e) => setAddTaskForm({ ...addTaskForm, name: e.target.value })} placeholder="Task name *" className="w-full bg-background border border-border text-foreground rounded-md p-2 text-sm focus-ring placeholder:text-muted-foreground" autoFocus />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input type="date" value={addTaskForm.start_date} onChange={(e) => setAddTaskForm({ ...addTaskForm, start_date: e.target.value })} className="bg-background border border-border text-foreground rounded-md p-2 text-xs focus-ring" />
                                                    <input type="date" value={addTaskForm.end_date} onChange={(e) => setAddTaskForm({ ...addTaskForm, end_date: e.target.value })} className="bg-background border border-border text-foreground rounded-md p-2 text-xs focus-ring" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleAddTask(phase.phaseId)} disabled={savingTask || !addTaskForm.name.trim()} className="flex-1 text-xs font-bold bg-primary text-primary-foreground py-1.5 rounded-md hover:bg-primary/90 focus-ring disabled:opacity-50">{savingTask ? 'Adding...' : 'Add Task'}</button>
                                                    <button onClick={() => setShowAddTask(null)} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 border border-border rounded-md focus-ring">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={() => setShowAddTask(phase.phaseId)} className="mt-1 flex items-center gap-1 text-xs text-primary hover:text-primary/80 focus-ring rounded-sm py-1">
                                                <Plus className="w-3 h-3" /> Add task
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Task Detail Drawer */}
            {selectedTask && (
                <>
                    <div ref={overlayRef} className="absolute inset-0 bg-background/50 backdrop-blur-sm z-40" onClick={closeDrawer} aria-hidden="true" />
                    <aside ref={drawerRef} tabIndex="-1" className="absolute top-0 right-0 h-full w-full md:w-[400px] bg-card border-l border-border shadow-2xl z-50 flex flex-col outline-none" role="dialog" aria-label="Task Details">
                        <div className="flex items-center justify-between p-4 border-b border-border bg-accent/30">
                            <h3 className="font-bold text-lg text-foreground truncate pl-2">{selectedTask.name}</h3>
                            <button onClick={closeDrawer} className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground focus-ring transition-transform hover:-translate-y-px" aria-label="Close details panel">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase">Status</p>
                                    {role === 'admin' ? (
                                        <select value={selectedTask.status} onChange={(e) => handleUpdateTask(selectedTask.id, { status: e.target.value, progress: e.target.value === 'done' ? 100 : selectedTask.progress })} className="text-sm font-semibold text-foreground bg-background border border-border rounded p-1 focus-ring capitalize w-full">
                                            <option value="todo">To Do</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="done">Done</option>
                                            <option value="blocked">Blocked</option>
                                        </select>
                                    ) : (
                                        <p className="text-sm font-semibold text-foreground capitalize">{selectedTask.status?.replace("_", " ")}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase">Progress</p>
                                    {role === 'admin' ? (
                                        <input type="range" min="0" max="100" step="5" value={selectedTask.progress} onChange={(e) => handleUpdateTask(selectedTask.id, { progress: Number(e.target.value) })} className="w-full accent-primary" aria-label="Progress" />
                                    ) : (
                                        <p className="text-sm font-semibold text-foreground">{selectedTask.progress}%</p>
                                    )}
                                    <p className="text-xs text-muted-foreground font-data">{selectedTask.progress}%</p>
                                </div>
                                <div className="space-y-1 col-span-2 flex items-center gap-2 mt-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-foreground">
                                        {selectedTask.start_date} → {selectedTask.end_date} ({selectedTask.duration_days || '?'} days)
                                    </span>
                                </div>
                            </div>

                            {/* Assign Worker (Admin only) */}
                            {role === 'admin' && (
                                <div className="border-t border-border pt-4">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                                        <User className="w-4 h-4 text-primary" /> Assigned To
                                    </h4>
                                    <select
                                        value={selectedTask.assigned_to || ''}
                                        onChange={(e) => handleUpdateTask(selectedTask.id, { assigned_to: e.target.value || null })}
                                        className="w-full bg-background border border-border text-foreground text-sm rounded-md p-2 focus-ring"
                                        aria-label="Assign worker"
                                    >
                                        <option value="">Unassigned</option>
                                        {workers.map(w => (
                                            <option key={w.id} value={w.id}>{w.full_name} ({w.role})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="border-t border-border pt-6">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                                    <DollarSign className="w-4 h-4 text-primary" />
                                    Financial Data
                                </h4>
                                <div className="bg-accent p-3 rounded-lg flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Estimated Cost:</span>
                                    <span className="font-data font-bold text-foreground">{selectedTask.cost}</span>
                                </div>
                                {role === 'admin' && !selectedTask.estimated_cost && (
                                    <button
                                        onClick={() => handleEstimateCost(selectedTask.id)}
                                        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold bg-primary/10 text-primary rounded-md hover:bg-primary/20 focus-ring"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        AI Estimate Cost
                                    </button>
                                )}
                                {selectedTask.cost_breakdown && (
                                    <div className="mt-3 bg-accent/50 p-3 rounded-lg text-xs space-y-1 font-data">
                                        {selectedTask.cost_breakdown.line_items?.map((item, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span className="text-muted-foreground truncate mr-2">{item.material_description}</span>
                                                <span className="text-foreground font-medium">₹{Number(item.amount).toLocaleString('en-IN')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedTask.blockedBy && (
                                <div className="border-t border-border pt-6">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-danger mb-3">
                                        <ArrowRight className="w-4 h-4" />
                                        Dependencies (Blocked By)
                                    </h4>
                                    <p className="text-sm text-muted-foreground">{selectedTask.blockedBy.length} dependency task(s)</p>
                                </div>
                            )}

                            {selectedTask.insight && (
                                <div className="border-t border-border pt-6">
                                    <h4 className="text-sm font-bold text-primary mb-3">AI Intelligence</h4>
                                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                                        <p className="text-sm text-foreground italic">"{selectedTask.insight}"</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border bg-accent/30 flex justify-between">
                            {role === 'admin' && (
                                <button onClick={() => handleDeleteTask(selectedTask.id)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-danger bg-danger/10 border border-danger/20 rounded-md hover:bg-danger/20 focus-ring transition-transform hover:-translate-y-px">
                                    <Trash2 className="w-4 h-4" /> Delete
                                </button>
                            )}
                            <button onClick={closeDrawer} className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-accent focus-ring transition-transform hover:-translate-y-px ml-auto">
                                Close
                            </button>
                        </div>
                    </aside>
                </>
            )}

            {/* AI Generate Schedule Modal */}
            {showGenerateModal && (
                <>
                    <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50" onClick={() => !generating && setShowGenerateModal(false)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl z-50 p-6" role="dialog" aria-label="Generate AI Schedule">
                        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Generate AI Schedule
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="gen-desc" className="block text-sm font-medium text-foreground mb-1">Project Description *</label>
                                <textarea
                                    id="gen-desc"
                                    value={genDescription}
                                    onChange={(e) => setGenDescription(e.target.value)}
                                    placeholder="e.g., 5-storey residential building with 20 units, basement parking, fire safety systems..."
                                    className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring min-h-[100px] resize-none placeholder:text-muted-foreground"
                                    disabled={generating}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="gen-loc" className="block text-sm font-medium text-foreground mb-1">Location</label>
                                    <input
                                        id="gen-loc"
                                        value={genLocation}
                                        onChange={(e) => setGenLocation(e.target.value)}
                                        placeholder="e.g., Delhi NCR"
                                        className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring placeholder:text-muted-foreground"
                                        disabled={generating}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="gen-weeks" className="block text-sm font-medium text-foreground mb-1">Duration (weeks)</label>
                                    <input
                                        id="gen-weeks"
                                        type="number"
                                        value={genWeeks}
                                        onChange={(e) => setGenWeeks(Number(e.target.value))}
                                        min={4}
                                        max={260}
                                        className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring"
                                        disabled={generating}
                                    />
                                </div>
                            </div>

                            {genError && (
                                <div className="bg-danger/10 border border-danger/20 text-danger rounded-md p-3 text-sm">
                                    {genError}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowGenerateModal(false)}
                                    disabled={generating}
                                    className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-accent focus-ring disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerateSchedule}
                                    disabled={generating || !genDescription.trim()}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus-ring disabled:opacity-50"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            Generate
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Add Phase Modal */}
            {showAddPhase && (
                <>
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-opacity" />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-4 border-b border-border bg-accent/30">
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-primary" />
                                    Create New Phase
                                </h3>
                                <button onClick={() => setShowAddPhase(false)} className="text-muted-foreground hover:text-foreground focus-ring rounded-sm">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                <div>
                                    <label htmlFor="phase-name" className="block text-sm font-medium text-foreground mb-1">Phase Title <span className="text-danger">*</span></label>
                                    <input
                                        id="phase-name"
                                        value={addPhaseForm.name}
                                        onChange={(e) => setAddPhaseForm({ ...addPhaseForm, name: e.target.value })}
                                        placeholder="e.g., Foundation Details"
                                        className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring"
                                        disabled={savingPhase}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phase-desc" className="block text-sm font-medium text-foreground mb-1">Description (Optional)</label>
                                    <textarea
                                        id="phase-desc"
                                        value={addPhaseForm.description}
                                        onChange={(e) => setAddPhaseForm({ ...addPhaseForm, description: e.target.value })}
                                        placeholder="Add context"
                                        className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring min-h-[80px]"
                                        disabled={savingPhase}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 p-4 border-t border-border bg-accent/10">
                                <button
                                    onClick={() => setShowAddPhase(false)}
                                    disabled={savingPhase}
                                    className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-accent focus-ring disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddPhase}
                                    disabled={savingPhase || !addPhaseForm.name.trim()}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus-ring disabled:opacity-50"
                                >
                                    {savingPhase ? 'Saving...' : 'Create Phase'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
