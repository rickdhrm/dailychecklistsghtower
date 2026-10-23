'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { HousekeepingLog, User } from '@/types';
import { 
  Archive, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Loader2, 
  Clock, 
  FileCheck,
  ShieldAlert,
  Database
} from 'lucide-react';

export default function HousekeepingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<HousekeepingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() === 0 ? 12 : new Date().getMonth());

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        if (meData.user.role !== 'ADMIN' && meData.user.role !== 'SPV') {
          router.push('/');
          return;
        }
        setCurrentUser(meData.user);

        await fetchLogs();
      } catch (err) {
        console.error('Error loading housekeeping:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const fetchLogs = async () => {
    const res = await fetch('/api/housekeeping');
    if (res.ok) {
      setLogs(await res.json());
    }
  };

  const handleRunHousekeeping = async () => {
    if (!confirm(`Are you sure you want to execute Month-End Data Housekeeping for ${selectedMonth}/${selectedYear}? This will archive active records for this period.`)) {
      return;
    }

    setExecuting(true);
    setFeedback(null);
    setError(null);

    try {
      const res = await fetch('/api/housekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          month: selectedMonth,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Housekeeping execution failed');

      setFeedback(resData.message || 'Month-end housekeeping successfully executed.');
      await fetchLogs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExecuting(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <Navbar user={currentUser} />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Archive className="h-6 w-6 text-indigo-400" />
            End-of-Month Data Housekeeping Routine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated and manual month-end data archival for high-volume checklist entries to keep active queries lean.
          </p>
        </div>

        {feedback && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Housekeeping Action Panel */}
        <div className="facility-card p-6 mb-8 border border-indigo-500/30 bg-gradient-to-r from-slate-900 to-indigo-950/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-400" />
                Trigger Archival Routine
              </h2>
              <p className="text-xs text-slate-400 max-w-2xl">
                Free up the primary active submission partition in NeonDB by bundling completed inspection forms into the cold storage archive and marking active records as archived.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Target Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Target Year
                </label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="w-24 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleRunHousekeeping}
                  disabled={executing || currentUser?.role !== 'ADMIN'}
                  className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {executing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running Archival...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-white" />
                      Execute Housekeeping
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Archival History Log */}
        <div className="facility-card overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Monthly Housekeeping Archive Registry</h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span>Loading housekeeping records...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No historical housekeeping executions recorded yet. Run a routine above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Records Archived</th>
                    <th className="py-3 px-4">Export Bundle</th>
                    <th className="py-3 px-4">Executed By</th>
                    <th className="py-3 px-4">Execution Timestamp</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        {monthNames[log.period_month - 1]} {log.period_year}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                        {log.total_records} records
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {log.export_format}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {(log as any).executed_by_name || 'System'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(log.executed_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
