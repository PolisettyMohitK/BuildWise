import React, { useState, useEffect } from "react";
import {
    Building,
    Clock,
    AlertTriangle,
    TrendingDown,
    FileText,
    AlertCircle,
    CheckCircle2,
    CalendarClock,
    Loader2,
    Sparkles
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export function ProjectOverview({ role }) {
    const { organizationId } = useAuth();
    const [kpis, setKpis] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!organizationId && role !== 'client') return;
        loadDashboardData();
    }, [organizationId]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch projects
            const { data: projects } = await supabase
                .from('projects')
                .select('id, name, status, budget');

            const activeProjects = projects?.filter(p => p.status === 'active') || [];

            // Fetch tasks
            const { data: tasks } = await supabase
                .from('tasks')
                .select('id, name, status, progress, start_date, end_date, estimated_cost, project_id, dependencies');

            const allTasks = tasks || [];
            const today = new Date().toISOString().split('T')[0];
            const dueTodayTasks = allTasks.filter(t => t.end_date === today);
            const blockedTasks = allTasks.filter(t => t.status === 'blocked');

            // Budget variance
            const totalEstimated = allTasks.reduce((sum, t) => sum + (parseFloat(t.estimated_cost) || 0), 0);
            const totalBudget = (projects || []).reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0);
            const variance = totalBudget - totalEstimated;

            // Fetch recent site logs
            const { data: recentLogs } = await supabase
                .from('site_logs')
                .select('id, created_at, project_id, ai_summary, submitted_by, profiles(full_name)')
                .order('created_at', { ascending: false })
                .limit(5);

            const latestLogTime = recentLogs?.[0]
                ? getTimeAgo(new Date(recentLogs[0].created_at))
                : 'No logs yet';

            setKpis([
                { label: "Active Projects", value: String(activeProjects.length), icon: Building, trend: `${projects?.length || 0} total` },
                { label: "Tasks Due Today", value: String(dueTodayTasks.length), icon: Clock, trend: `${allTasks.filter(t => t.status === 'in_progress').length} in progress` },
                { label: "Blocked Tasks", value: String(blockedTasks.length), icon: AlertTriangle, trend: blockedTasks.length > 0 ? "Requires attention" : "All clear", isDanger: blockedTasks.length > 0 },
                { label: "Budget Status", value: totalBudget > 0 ? `₹${(variance / 1000).toFixed(0)}K` : "—", icon: TrendingDown, trend: totalBudget > 0 ? `${((variance / totalBudget) * 100).toFixed(1)}% ${variance >= 0 ? 'under' : 'over'} budget` : 'No budget set' },
                { label: "Latest Site Log", value: latestLogTime, icon: FileText, trend: recentLogs?.length ? `${recentLogs.length} recent logs` : 'None submitted' },
            ]);

            // Build alerts from blocked tasks + tasks with no estimates
            const alertsList = [];
            blockedTasks.forEach(t => {
                alertsList.push({
                    id: t.id,
                    type: 'danger',
                    title: 'Task Blocked',
                    desc: `"${t.name}" is blocked by dependencies.`,
                    project: projects?.find(p => p.id === t.project_id)?.name || 'Unknown',
                });
            });

            const tasksWithoutEstimate = allTasks.filter(t => !t.estimated_cost && t.status !== 'done');
            if (tasksWithoutEstimate.length > 3) {
                alertsList.push({
                    id: 'no-estimate',
                    type: 'warning',
                    title: 'Missing Estimates',
                    desc: `${tasksWithoutEstimate.length} tasks have no cost estimate.`,
                    project: 'Multiple',
                });
            }
            setAlerts(alertsList.slice(0, 5));

            // Activity from recent logs
            setActivity((recentLogs || []).map(log => ({
                id: log.id,
                user: log.profiles?.full_name || 'Unknown',
                action: 'submitted site log',
                target: log.ai_summary?.progress?.substring(0, 80) || 'Raw log submitted',
                time: getTimeAgo(new Date(log.created_at)),
                icon: FileText,
            })));

        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
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
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Project Overview</h2>
                    <p className="text-muted-foreground mt-1">
                        {role === 'client' ? 'Your project progress at a glance.' : 'High-level metrics across all active construction sites.'}
                    </p>
                </div>
            </div>

            {/* KPI Row */}
            {kpis && (
                <section aria-label="Key Performance Indicators" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {kpis.map((kpi, idx) => {
                        const Icon = kpi.icon;
                        return (
                            <div key={idx} className="bg-card border border-border rounded-xl p-4 shadow-sm relative overflow-hidden group">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                                    <Icon className={`w-4 h-4 ${kpi.isDanger ? 'text-danger' : 'text-primary'}`} aria-hidden="true" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <h3 className="text-3xl font-bold text-foreground font-data">{kpi.value}</h3>
                                </div>
                                <p className={`text-xs mt-1 ${kpi.isDanger ? 'text-danger font-medium' : 'text-muted-foreground'}`}>
                                    {kpi.trend}
                                </p>
                                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-primary opacity-5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                            </div>
                        );
                    })}
                </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Alerts Panel */}
                <section aria-label="System Alerts" className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm flex flex-col">
                    <div className="p-4 border-b border-border flex justify-between items-center">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                            <AlertCircle className="w-5 h-5 text-danger" />
                            Requires Attention
                        </h3>
                        <span className="bg-danger text-white text-xs font-bold px-2 py-1 rounded-full">{alerts.length} Alerts</span>
                    </div>
                    <div className="flex-1 p-0 overflow-y-auto">
                        {alerts.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground text-sm">
                                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                                All clear — no alerts at this time.
                            </div>
                        ) : (
                            <ul className="divide-y divide-border">
                                {alerts.map(alert => (
                                    <li key={alert.id} className="p-4 hover:bg-accent focus-within:bg-accent transition-colors">
                                        <div className="flex justify-between">
                                            <p className={`text-sm font-bold ${alert.type === 'danger' ? 'text-danger' : 'text-amber-500 dark:text-amber-400'}`}>
                                                {alert.title}
                                            </p>
                                            <p className="text-xs font-medium text-muted-foreground">{alert.project}</p>
                                        </div>
                                        <p className="text-sm text-foreground mt-1">{alert.desc}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                {/* Recent Activity */}
                <section aria-label="Recent Activity" className="bg-card border border-border rounded-xl shadow-sm flex flex-col">
                    <div className="p-4 border-b border-border">
                        <h3 className="text-lg font-bold text-foreground">Recent Activity</h3>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto">
                        {activity.length === 0 ? (
                            <div className="text-center text-muted-foreground text-sm py-8">
                                <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                No recent activity yet.
                            </div>
                        ) : (
                            <ul className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:to-transparent">
                                {activity.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <li key={item.id} className="relative flex items-start gap-4">
                                            <div className="relative z-10 w-10 h-10 rounded-full bg-accent flex items-center justify-center border-2 border-background flex-shrink-0">
                                                <Icon className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1 pt-1">
                                                <p className="text-sm text-foreground">
                                                    <span className="font-semibold">{item.user}</span> {item.action}
                                                </p>
                                                <p className="text-sm text-muted-foreground mt-0.5">{item.target}</p>
                                                <p className="text-xs text-muted-foreground mt-1 font-data">{item.time}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

function getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hrs ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}
