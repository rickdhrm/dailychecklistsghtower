'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { FormSubmission, User } from '@/types';
import { 
  FileCheck, 
  Calendar, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Edit3, 
  Clock, 
  Search, 
  Loader2,
  X,
  Save,
  FileSpreadsheet
} from 'lucide-react';

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit Modal State
  const [editingSub, setEditingSub] = useState<FormSubmission | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [editNotes, setEditNotes] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);

        const subRes = await fetch('/api/submissions');
        if (subRes.ok) {
          const subs = await subRes.json();
          setSubmissions(subs);
        }
      } catch (err) {
        console.error('Error loading history:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const openEditModal = (sub: FormSubmission) => {
    setEditingSub(sub);
    setEditFormData({ ...sub.submission_data });
    setEditNotes(sub.technician_notes || '');
    setChangeReason('');
    setEditError(null);
  };

  const closeEditModal = () => {
    setEditingSub(null);
  };

  const handleSaveEdit = async () => {
    if (!editingSub) return;
    if (!changeReason.trim()) {
      setEditError('Please provide a reason for revising this record.');
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/submissions/${editingSub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_data: editFormData,
          technician_notes: editNotes,
          change_reason: changeReason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update submission');
      }

      // Refresh list
      const subRes = await fetch('/api/submissions');
      if (subRes.ok) {
        const subs = await subRes.json();
        setSubmissions(subs);
      }

      closeEditModal();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const filtered = submissions.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      s.template_title?.toLowerCase().includes(q) ||
      s.location_name?.toLowerCase().includes(q) ||
      s.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <Navbar user={user} />

      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-blue-500" />
              Submission Records
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Review and update recorded inspections. Revisions are tracked in the audit trail.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search checklist or location..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span>Loading submissions...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="facility-card p-12 text-center text-slate-500">
            No inspection records found. Complete a checklist to see it here.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((sub) => (
              <div
                key={sub.id}
                className="facility-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-base">
                      {sub.template_title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sub.has_abnormal_reading
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {sub.has_abnormal_reading ? 'ABNORMAL' : 'NORMAL'}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {sub.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      {sub.location_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      {new Date(sub.submitted_at).toLocaleString('id-ID')}
                    </span>
                    {sub.technician_name && (
                      <span className="text-slate-500 font-mono text-[11px]">
                        By: {sub.technician_name}
                      </span>
                    )}
                  </div>

                  {sub.technician_notes && (
                    <p className="text-xs text-slate-400 italic pt-1">
                      "{sub.technician_notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEditModal(sub)}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-blue-400" />
                    View / Edit Data
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View & Edit Modal */}
        {editingSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="facility-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingSub.template_title} — Edit Submission
                  </h3>
                  <p className="text-xs text-slate-400">
                    ID: {editingSub.id} • {editingSub.location_name}
                  </p>
                </div>
                <button
                  onClick={closeEditModal}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {editError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {editError}
                </div>
              )}

              {/* Dynamic Field Values Editor */}
              <div className="space-y-4 mb-6">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Recorded Parameters & Values:
                </h4>
                <div className="space-y-2">
                  {Object.entries(editFormData).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded bg-slate-900 border border-slate-800 text-xs"
                    >
                      <span className="font-mono text-slate-300 font-semibold">{key}</span>
                      <input
                        type="text"
                        value={String(value)}
                        onChange={(e) =>
                          setEditFormData((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Technician Notes
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
                    Reason for Change (Audit Requirement) *
                  </label>
                  <input
                    type="text"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="e.g. Corrected discharge pressure reading after meter recalibration"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-amber-500/40 text-white text-xs focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving Audit...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save Revisions
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
