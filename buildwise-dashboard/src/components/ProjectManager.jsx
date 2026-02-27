import React, { useState, useEffect } from "react";
import { Plus, Edit3, Trash2, MapPin, DollarSign, Calendar, Loader2, X, Users, Link2, Unlink } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";

export function ProjectManager() {
    const { organizationId } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [clients, setClients] = useState([]);
    const [linkedClients, setLinkedClients] = useState([]);
    const [form, setForm] = useState({
        name: '', description: '', location: '', budget: '', start_date: '', status: 'planning'
    });

    useEffect(() => { loadProjects(); loadClients(); }, []);

    const loadProjects = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('projects')
            .select('*, phases(count), tasks(count)')
            .order('created_at', { ascending: false });
        setProjects(data || []);
        setLoading(false);
    };

    const loadClients = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('role', 'client');
        setClients(data || []);
    };

    const loadLinkedClients = async (projectId) => {
        const { data } = await supabase
            .from('client_projects')
            .select('client_id, profiles(id, full_name)')
            .eq('project_id', projectId);
        setLinkedClients(data || []);
    };

    const openCreate = () => {
        setForm({ name: '', description: '', location: '', budget: '', start_date: '', status: 'planning' });
        setEditing(null);
        setError('');
        setShowForm(true);
    };

    const openEdit = (project) => {
        setForm({
            name: project.name,
            description: project.description || '',
            location: project.location || '',
            budget: project.budget || '',
            start_date: project.start_date || '',
            status: project.status,
        });
        setEditing(project.id);
        setError('');
        setShowForm(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        const payload = {
            name: form.name,
            description: form.description || null,
            location: form.location || null,
            budget: form.budget ? parseFloat(form.budget) : null,
            start_date: form.start_date || null,
            status: form.status,
            organization_id: organizationId,
        };

        let result;
        if (editing) {
            result = await supabase.from('projects').update(payload).eq('id', editing);
        } else {
            result = await supabase.from('projects').insert(payload);
        }

        if (result.error) {
            setError(result.error.message);
        } else {
            setShowForm(false);
            loadProjects();
        }
        setSaving(false);
    };

    const handleDelete = async (project) => {
        if (!confirm(`Delete "${project.name}"? This will also delete all phases, tasks, and logs.`)) return;

        // Delete in order: tasks → phases → site_logs → client_projects → project
        await supabase.from('tasks').delete().eq('project_id', project.id);
        await supabase.from('phases').delete().eq('project_id', project.id);
        await supabase.from('site_logs').delete().eq('project_id', project.id);
        await supabase.from('client_projects').delete().eq('project_id', project.id);
        await supabase.from('projects').delete().eq('id', project.id);
        loadProjects();
    };

    const handleLinkClient = async (clientId) => {
        if (!selectedProject) return;
        await supabase.from('client_projects').insert({
            client_id: clientId,
            project_id: selectedProject.id,
        });
        loadLinkedClients(selectedProject.id);
    };

    const handleUnlinkClient = async (clientId) => {
        if (!selectedProject) return;
        await supabase.from('client_projects')
            .delete()
            .eq('client_id', clientId)
            .eq('project_id', selectedProject.id);
        loadLinkedClients(selectedProject.id);
    };

    const statusColor = (status) => {
        const map = {
            planning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            active: 'bg-green-500/10 text-green-600 dark:text-green-400',
            on_hold: 'bg-red-500/10 text-red-600 dark:text-red-400',
            completed: 'bg-primary/10 text-primary',
        };
        return map[status] || '';
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 fade-in">
            <div className="flex justify-between items-end flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Projects</h2>
                    <p className="text-muted-foreground mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus-ring transition-transform hover:-translate-y-px">
                    <Plus className="w-4 h-4" /> New Project
                </button>
            </div>

            {/* Project Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {projects.map(project => (
                    <div key={project.id} className="bg-card border border-border rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow group relative">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="text-lg font-bold text-foreground leading-tight pr-16">{project.name}</h3>
                            <span className={cn("text-xs font-bold px-2 py-1 rounded capitalize whitespace-nowrap", statusColor(project.status))}>
                                {project.status?.replace('_', ' ')}
                            </span>
                        </div>

                        {project.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                        )}

                        <div className="space-y-1.5 text-xs text-muted-foreground">
                            {project.location && (
                                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {project.location}</div>
                            )}
                            {project.budget && (
                                <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> ₹{Number(project.budget).toLocaleString('en-IN')}</div>
                            )}
                            {project.start_date && (
                                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {project.start_date}</div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                            <span>{project.phases?.[0]?.count || 0} phases</span>
                            <span>•</span>
                            <span>{project.tasks?.[0]?.count || 0} tasks</span>
                        </div>

                        {/* Actions */}
                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setSelectedProject(project); loadLinkedClients(project.id); }} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded focus-ring" title="Link clients" aria-label={`Link clients to ${project.name}`}>
                                <Link2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEdit(project)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded focus-ring" title="Edit" aria-label={`Edit ${project.name}`}>
                                <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(project)} className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded focus-ring" title="Delete" aria-label={`Delete ${project.name}`}>
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {projects.length === 0 && (
                    <div className="col-span-full bg-card border border-border rounded-xl p-12 text-center">
                        <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <h3 className="text-lg font-bold text-foreground">No projects yet</h3>
                        <p className="text-sm text-muted-foreground mt-1">Create your first construction project to get started.</p>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showForm && (
                <>
                    <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50" onClick={() => !saving && setShowForm(false)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl z-50 p-6" role="dialog" aria-label={editing ? 'Edit Project' : 'New Project'}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-foreground">{editing ? 'Edit Project' : 'New Project'}</h3>
                            <button onClick={() => setShowForm(false)} className="p-1 text-muted-foreground hover:text-foreground rounded focus-ring"><X className="w-5 h-5" /></button>
                        </div>

                        {error && <div className="text-sm text-danger bg-danger/10 p-2 rounded-md mb-4 border border-danger/20">{error}</div>}

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label htmlFor="proj-name" className="block text-sm font-medium text-foreground mb-1">Project Name *</label>
                                <input id="proj-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g., Skyline Tower Phase II" className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring placeholder:text-muted-foreground" disabled={saving} />
                            </div>
                            <div>
                                <label htmlFor="proj-desc" className="block text-sm font-medium text-foreground mb-1">Description</label>
                                <textarea id="proj-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Project scope and details..." rows={3} className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring resize-none placeholder:text-muted-foreground" disabled={saving} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="proj-loc" className="block text-sm font-medium text-foreground mb-1">Location</label>
                                    <input id="proj-loc" type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., Sector 42, Gurugram" className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring placeholder:text-muted-foreground" disabled={saving} />
                                </div>
                                <div>
                                    <label htmlFor="proj-budget" className="block text-sm font-medium text-foreground mb-1">Budget (₹)</label>
                                    <input id="proj-budget" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="25000000" className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring placeholder:text-muted-foreground" disabled={saving} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="proj-start" className="block text-sm font-medium text-foreground mb-1">Start Date</label>
                                    <input id="proj-start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring" disabled={saving} />
                                </div>
                                <div>
                                    <label htmlFor="proj-status" className="block text-sm font-medium text-foreground mb-1">Status</label>
                                    <select id="proj-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring" disabled={saving}>
                                        <option value="planning">Planning</option>
                                        <option value="active">Active</option>
                                        <option value="on_hold">On Hold</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 px-4 rounded-md font-bold text-sm disabled:opacity-50 hover:bg-primary/90 focus-ring">
                                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : editing ? 'Update Project' : 'Create Project'}
                            </button>
                        </form>
                    </div>
                </>
            )}

            {/* Client Linking Panel */}
            {selectedProject && (
                <>
                    <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50" onClick={() => setSelectedProject(null)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-xl shadow-2xl z-50 p-6" role="dialog" aria-label="Link Clients">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Clients — {selectedProject.name}
                            </h3>
                            <button onClick={() => setSelectedProject(null)} className="p-1 text-muted-foreground hover:text-foreground rounded focus-ring"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Linked */}
                        <div className="mb-4">
                            <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Linked ({linkedClients.length})</p>
                            {linkedClients.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No clients linked to this project.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {linkedClients.map(lc => (
                                        <li key={lc.client_id} className="flex items-center justify-between bg-accent/50 px-3 py-2 rounded-md">
                                            <span className="text-sm text-foreground font-medium">{lc.profiles?.full_name}</span>
                                            <button onClick={() => handleUnlinkClient(lc.client_id)} className="text-xs text-danger hover:bg-danger/10 px-2 py-1 rounded focus-ring flex items-center gap-1">
                                                <Unlink className="w-3 h-3" /> Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Available clients */}
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Available Clients</p>
                            {clients.filter(c => !linkedClients.some(lc => lc.client_id === c.id)).length === 0 ? (
                                <p className="text-sm text-muted-foreground">No unlinked clients. Add client users via Team Management first.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {clients.filter(c => !linkedClients.some(lc => lc.client_id === c.id)).map(client => (
                                        <li key={client.id} className="flex items-center justify-between bg-background px-3 py-2 rounded-md border border-border">
                                            <span className="text-sm text-foreground">{client.full_name}</span>
                                            <button onClick={() => handleLinkClient(client.id)} className="text-xs text-primary hover:bg-primary/10 px-2 py-1 rounded focus-ring flex items-center gap-1">
                                                <Link2 className="w-3 h-3" /> Link
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
