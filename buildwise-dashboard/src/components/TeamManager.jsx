import React, { useState, useEffect } from "react";
import { Users, Plus, Loader2, AlertCircle, Shield, X, UserCheck, UserX } from "lucide-react";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";

export function TeamManager() {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'worker' });

    useEffect(() => { loadTeam(); }, []);

    const loadTeam = async () => {
        setLoading(true);
        const { data, error: fnError } = await supabase.functions.invoke('manage-users', {
            body: { action: 'list_users' },
        });
        if (data?.users) setTeam(data.users);
        setLoading(false);
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setInviting(true);

        const { data, error: fnError } = await supabase.functions.invoke('manage-users', {
            body: { action: 'create_user', ...form },
        });

        if (fnError || data?.error) {
            setError(data?.error || fnError?.message || 'Failed to create user');
        } else {
            setSuccess(`${form.full_name} added as ${form.role}`);
            setForm({ email: '', password: '', full_name: '', role: 'worker' });
            setShowInviteModal(false);
            loadTeam();
        }
        setInviting(false);
    };

    const handleRoleChange = async (userId, newRole) => {
        const { data } = await supabase.functions.invoke('manage-users', {
            body: { action: 'update_role', user_id: userId, new_role: newRole },
        });
        if (data?.success) loadTeam();
    };

    const handleDisable = async (userId, name) => {
        if (!confirm(`Disable access for ${name}? They won't be able to sign in.`)) return;
        const { data } = await supabase.functions.invoke('manage-users', {
            body: { action: 'disable_user', user_id: userId },
        });
        if (data?.success) loadTeam();
    };

    const roleBadgeColor = (role) => {
        if (role === 'admin') return 'bg-primary/10 text-primary';
        if (role === 'worker') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            <div className="flex justify-between items-end flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Team Management</h2>
                    <p className="text-muted-foreground mt-1">{team.length} member{team.length !== 1 ? 's' : ''} in your organization</p>
                </div>
                <button
                    onClick={() => { setShowInviteModal(true); setError(''); setSuccess(''); }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus-ring transition-transform hover:-translate-y-px"
                >
                    <Plus className="w-4 h-4" />
                    Add Team Member
                </button>
            </div>

            {success && (
                <div className="flex items-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 text-sm p-3 rounded-md border border-green-500/20" role="status">
                    <UserCheck className="w-4 h-4" /> {success}
                </div>
            )}

            {/* Team Table */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-accent/50 border-b border-border">
                                <th className="text-left p-3 font-bold text-foreground text-xs uppercase tracking-wide">Name</th>
                                <th className="text-left p-3 font-bold text-foreground text-xs uppercase tracking-wide">Email</th>
                                <th className="text-left p-3 font-bold text-foreground text-xs uppercase tracking-wide">Role</th>
                                <th className="text-left p-3 font-bold text-foreground text-xs uppercase tracking-wide">Status</th>
                                <th className="text-right p-3 font-bold text-foreground text-xs uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {team.map(member => (
                                <tr key={member.id} className={cn("hover:bg-accent/30 transition-colors", member.banned && "opacity-50")}>
                                    <td className="p-3 font-medium text-foreground">{member.full_name}</td>
                                    <td className="p-3 text-muted-foreground font-data">{member.email}</td>
                                    <td className="p-3">
                                        <select
                                            value={member.role}
                                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                            disabled={member.banned}
                                            className={cn("text-xs font-bold px-2 py-1 rounded border-0 focus-ring cursor-pointer", roleBadgeColor(member.role))}
                                            aria-label={`Change role for ${member.full_name}`}
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="worker">Worker</option>
                                            <option value="client">Client</option>
                                        </select>
                                    </td>
                                    <td className="p-3">
                                        {member.banned ? (
                                            <span className="text-xs text-danger font-bold">Disabled</span>
                                        ) : (
                                            <span className="text-xs text-green-600 dark:text-green-400 font-bold">Active</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        {!member.banned && (
                                            <button
                                                onClick={() => handleDisable(member.id, member.full_name)}
                                                className="text-xs text-muted-foreground hover:text-danger focus-ring rounded p-1"
                                                title="Disable user"
                                                aria-label={`Disable ${member.full_name}`}
                                            >
                                                <UserX className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <>
                    <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50" onClick={() => !inviting && setShowInviteModal(false)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-xl shadow-2xl z-50 p-6" role="dialog" aria-label="Add Team Member">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                Add Team Member
                            </h3>
                            <button onClick={() => setShowInviteModal(false)} className="p-1 text-muted-foreground hover:text-foreground rounded focus-ring" aria-label="Close">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-danger text-sm bg-danger/10 p-2 rounded-md mb-4 border border-danger/20" role="alert">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </div>
                        )}

                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label htmlFor="invite-name" className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
                                <input id="invite-name" type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required placeholder="e.g., Rajesh Kumar" className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring placeholder:text-muted-foreground" disabled={inviting} />
                            </div>
                            <div>
                                <label htmlFor="invite-email" className="block text-sm font-medium text-foreground mb-1">Email *</label>
                                <input id="invite-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="user@company.com" className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring placeholder:text-muted-foreground" disabled={inviting} />
                            </div>
                            <div>
                                <label htmlFor="invite-password" className="block text-sm font-medium text-foreground mb-1">Temporary Password *</label>
                                <input id="invite-password" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} placeholder="Min. 6 characters" className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring placeholder:text-muted-foreground" disabled={inviting} />
                            </div>
                            <div>
                                <label htmlFor="invite-role" className="block text-sm font-medium text-foreground mb-1">Role *</label>
                                <select id="invite-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring" disabled={inviting}>
                                    <option value="admin">Admin (Supervisor / Architect)</option>
                                    <option value="worker">Worker (Site Engineer / Crew)</option>
                                    <option value="client">Client (Project Owner)</option>
                                </select>
                            </div>
                            <button type="submit" disabled={inviting} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 px-4 rounded-md font-bold text-sm disabled:opacity-50 hover:bg-primary/90 focus-ring transition-transform active:scale-[0.98]">
                                {inviting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Add Member</>}
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
}
