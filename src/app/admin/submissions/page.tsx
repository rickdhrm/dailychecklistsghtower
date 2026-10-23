'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { FormSubmission, Location, FormTemplate, User } from '@/types';
import { 
  FileSpreadsheet, 
  Download, 
  Filter, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Loader2,
  FileText,
  Search,
  Eye,
  X
} from 'lucide-react';

export default function AdminSubmissionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);

  // Filter States
  const [selectedLocation, setSelectedLocation] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'EXCEL' | 'PDF' | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);

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
        setUser(meData.user);

        // Fetch auxiliary data
        const [locRes, tmplRes] = await Promise.all([
          fetch('/api/locations'),
          fetch('/api/forms'),
        ]);

        if (locRes.ok) setLocations(await locRes.json());
        if (tmplRes.ok) setTemplates(await tmplRes.json());

        await fetchSubmissions();
      } catch (err) {
        console.error('Error loading admin submissions:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLocation) params.set('location_id', selectedLocation);
      if (dateFrom) params.set('date_from', new Date(dateFrom).toISOString());
      if (dateTo) params.set('date_to', new Date(dateTo).toISOString());
      if (selectedTemplate) params.set('template_id', selectedTemplate);
      if (selectedStatus) params.set('status', selectedStatus);

      const res = await fetch(`/api/submissions?${params.toString()}`);
      if (res.ok) {
        setSubmissions(await res.json());
      }
    } catch (err) {
      console.error('Failed to query submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSubmissions();
  };

  const handleResetFilter = () => {
    setSelectedLocation('');
    setDateFrom('');
    setDateTo('');
    setSelectedTemplate('');
    setSelectedStatus('');
    setSearchTerm('');
    setTimeout(fetchSubmissions, 50);
  };

  const handleExport = async (format: 'EXCEL' | 'PDF') => {
    setExporting(format);
    try {
      const params = new URLSearchParams();
      if (selectedLocation) params.set('location_id', selectedLocation);
      if (dateFrom) params.set('date_from', new Date(dateFrom).toISOString());
      if (dateTo) params.set('date_to', new Date(dateTo).toISOString());

      const endpoint = format === 'EXCEL' ? '/api/export/excel' : '/api/export/pdf';
      const res = await fetch(`${endpoint}?${params.toString()}`);

      if (!res.ok) throw new Error('Export generation failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sgh_inspection_${Date.now()}.${format === 'EXCEL' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(null);
    }
  };

  const filtered = submissions.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      s.template_title?.toLowerCase().includes(q) ||
      s.technician_name?.toLowerCase().includes(q) ||
      s.location_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header & Export Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-indigo-400" />
              Facility Inspection Data Hub
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Admin & SPV monitoring console. Filter submitted logs by location, timestamp, and export compliance reports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('EXCEL')}
              disabled={exporting !== null}
              className="px-3.5 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              {exporting === 'EXCEL' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 text-emerald-400" />
              )}
              Export to Excel (.xlsx)
            </button>

            <button
              onClick={() => handleExport('PDF')}
              disabled={exporting !== null}
              className="px-3.5 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              {exporting === 'PDF' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-rose-400" />
              )}
              Download PDF Report
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="facility-card p-4 sm:p-5 mb-6">
          <form onSubmit={handleApplyFilter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Location Filter */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Filter by Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Checklist Form Filter */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Checklist Type
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Checklists</option>
                {templates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Date / Time (From)
              </label>
              <input
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Date / Time (To)
              </label>
              <input
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Filter className="h-3.5 w-3.5" />
                Apply Filter
              </button>
              <button
                type="button"
                onClick={handleResetFilter}
                title="Reset Filters"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Search & Results Table */}
        <div className="facility-card overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Showing <span className="font-semibold text-white">{filtered.length}</span> submissions
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search technician, checklist..."
                className="w-full pl-8 pr-3 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span>Fetching submissions from NeonDB...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No matching checklist records found for the selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Checklist & Code</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        <div>{sub.template_title}</div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {sub.template_code}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div>{sub.location_name}</div>
                        <span className="text-[10px] text-slate-500">{sub.location_building}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        <div>{sub.technician_name}</div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {sub.employee_code || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sub.has_abnormal_reading
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {sub.has_abnormal_reading ? 'ABNORMAL' : 'NORMAL'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(sub.submitted_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedSubmission(sub)}
                          className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="View Readings"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reading Inspection Modal */}
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="facility-card w-full max-w-xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedSubmission.template_title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Location: {selectedSubmission.location_name} • Technician: {selectedSubmission.technician_name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <div className="text-slate-400 mb-1">Inspection Notes:</div>
                  <div className="text-white italic">
                    {selectedSubmission.technician_notes || 'No remarks provided.'}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Dynamic Recorded Fields (JSON):
                  </h4>
                  <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                    {JSON.stringify(selectedSubmission.submission_data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
