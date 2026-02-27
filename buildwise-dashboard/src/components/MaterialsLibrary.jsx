import React, { useState, useEffect } from "react";
import { Package, Search, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

export function MaterialsLibrary() {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        loadMaterials();
    }, []);

    const loadMaterials = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('materials')
            .select('*')
            .order('category')
            .order('item_code');

        setMaterials(data || []);
        const cats = [...new Set((data || []).map(m => m.category))];
        setCategories(cats);
        setLoading(false);
    };

    const filtered = materials.filter(m => {
        const matchesSearch = search.trim() === '' ||
            m.description.toLowerCase().includes(search.toLowerCase()) ||
            m.item_code.toLowerCase().includes(search.toLowerCase());
        const matchesCat = categoryFilter === 'all' || m.category === categoryFilter;
        return matchesSearch && matchesCat;
    });

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
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Materials Library (DSR)</h2>
                    <p className="text-muted-foreground mt-1">Delhi Schedule of Rates — {materials.length} items</p>
                </div>
            </div>

            {/* Search + Filter */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    <label htmlFor="material-search" className="sr-only">Search materials</label>
                    <input
                        id="material-search"
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by code or description..."
                        className="w-full bg-background border border-border text-foreground pl-10 pr-4 py-2 rounded-md text-sm focus-ring placeholder:text-muted-foreground"
                    />
                </div>
                <label htmlFor="cat-filter" className="sr-only">Filter by category</label>
                <select
                    id="cat-filter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-background border border-border text-foreground text-sm rounded-md p-2 focus-ring"
                >
                    <option value="all">All Categories ({materials.length})</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>
                            {cat} ({materials.filter(m => m.category === cat).length})
                        </option>
                    ))}
                </select>
            </div>

            {/* Materials Table */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-accent/50 border-b border-border">
                                <th className="text-left p-3 font-bold text-foreground text-xs uppercase tracking-wide">Code</th>
                                <th className="text-left p-3 font-bold text-foreground text-xs uppercase tracking-wide">Description</th>
                                <th className="text-left p-3 font-bold text-foreground text-xs uppercase tracking-wide">Category</th>
                                <th className="text-left p-3 font-bold text-foreground text-xs uppercase tracking-wide">Unit</th>
                                <th className="text-right p-3 font-bold text-foreground text-xs uppercase tracking-wide">Base Rate (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                                        <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        No materials match your search.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(m => (
                                    <tr key={m.id} className="hover:bg-accent/30 transition-colors">
                                        <td className="p-3 font-data font-medium text-primary">{m.item_code}</td>
                                        <td className="p-3 text-foreground">{m.description}</td>
                                        <td className="p-3">
                                            <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded font-medium">
                                                {m.category}
                                            </span>
                                        </td>
                                        <td className="p-3 text-muted-foreground font-data">{m.unit}</td>
                                        <td className="p-3 text-right font-data font-bold text-foreground">
                                            ₹{Number(m.base_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 border-t border-border text-xs text-muted-foreground text-right">
                    Showing {filtered.length} of {materials.length} materials
                </div>
            </div>
        </div>
    );
}
