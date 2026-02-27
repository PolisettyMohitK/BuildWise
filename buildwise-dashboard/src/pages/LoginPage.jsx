import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
    const { signIn, signUp } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('worker');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (isSignUp) {
                await signUp(email, password, { full_name: fullName, role });
                setSuccess('Account created! Check your email for verification, or sign in if email confirmation is disabled.');
                setIsSignUp(false);
            } else {
                await signIn(email, password);
            }
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md">
                {/* Logo Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
                        <Building2 className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">BuildWise</h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        AI-powered construction project management
                    </p>
                </div>

                {/* Auth Card */}
                <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-foreground mb-6">
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </h2>

                    {/* Error */}
                    {error && (
                        <div
                            className="flex items-center gap-2 bg-danger/10 text-danger text-sm p-3 rounded-md mb-4 border border-danger/20"
                            role="alert"
                            aria-live="assertive"
                        >
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div
                            className="flex items-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 text-sm p-3 rounded-md mb-4 border border-green-500/20"
                            role="status"
                            aria-live="polite"
                        >
                            <p>{success}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name (signup only) */}
                        {isSignUp && (
                            <div>
                                <label htmlFor="full-name" className="block text-sm font-medium text-foreground mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    id="full-name"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required={isSignUp}
                                    placeholder="e.g., Rajesh Kumar"
                                    className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring placeholder:text-muted-foreground"
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="you@company.com"
                                autoComplete="email"
                                className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring placeholder:text-muted-foreground"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    placeholder="Min. 6 characters"
                                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                    className="w-full bg-background border border-border text-foreground rounded-md p-2.5 pr-10 text-sm focus-ring placeholder:text-muted-foreground"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-ring rounded-sm p-1"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Role (signup only) */}
                        {isSignUp && (
                            <div>
                                <label htmlFor="role-select" className="block text-sm font-medium text-foreground mb-1.5">
                                    Role
                                </label>
                                <select
                                    id="role-select"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus-ring"
                                >
                                    <option value="admin">Admin (Supervisor / Architect)</option>
                                    <option value="worker">Worker (Site Engineer / Crew)</option>
                                    <option value="client">Client (Project Owner)</option>
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">
                                    This determines what you can see and do in BuildWise.
                                </p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 px-4 rounded-md font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 focus-ring transition-transform active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                                </>
                            ) : (
                                isSignUp ? 'Create Account' : 'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Toggle */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError('');
                                setSuccess('');
                            }}
                            className="text-sm text-primary hover:underline focus-ring rounded-sm"
                        >
                            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground mt-6">
                    BuildWise — AI-assisted construction planning
                </p>
            </div>
        </div>
    );
}
