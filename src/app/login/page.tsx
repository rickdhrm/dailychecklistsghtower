'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, ShieldCheck, UserCheck, Wrench, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/20 text-white mb-4">
            <CheckSquare className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Antigravity SGH</h1>
          <p className="text-sm text-slate-400 mt-1">Daily Facility Inspection & Checklist Platform</p>
        </div>

        {/* Login Card */}
        <div className="facility-card p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or tech_budi"
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In to System
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              One-Click Role Selection:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickLogin('admin', 'SGHAdmin2026!')}
                className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-left border border-slate-700/50 hover:border-slate-600 transition-all text-xs"
              >
                <div className="flex items-center gap-1.5 font-semibold text-rose-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Admin
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Full access & users</div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('spv_andi', 'SGHAdmin2026!')}
                className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-left border border-slate-700/50 hover:border-slate-600 transition-all text-xs"
              >
                <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <UserCheck className="h-3.5 w-3.5" />
                  Supervisor
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Filter & monitoring</div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('tech_budi', 'SGHTech2026!')}
                className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-left border border-slate-700/50 hover:border-slate-600 transition-all text-xs"
              >
                <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                  <Wrench className="h-3.5 w-3.5" />
                  Tech: Budi
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Field mechanical</div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('tech_siti', 'SGHTech2026!')}
                className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-left border border-slate-700/50 hover:border-slate-600 transition-all text-xs"
              >
                <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                  <Wrench className="h-3.5 w-3.5" />
                  Tech: Siti
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Field electrical</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
