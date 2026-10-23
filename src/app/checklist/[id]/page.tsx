'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { FormTemplate, Location, User, FormHeading, FormSubheading, FormChild, FormField } from '@/types';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  Save, 
  ArrowLeft, 
  Loader2, 
  Info,
  Clock,
  Download,
  FileText,
  ShieldCheck,
  Check
} from 'lucide-react';

export default function ChecklistEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [technicianNotes, setTechnicianNotes] = useState<string>('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  
  // Official Gas Checklist specific states (FR-LO-005)
  const [temuan, setTemuan] = useState<string>('');
  const [tindakanKoreksi, setTindakanKoreksi] = useState<string>('');
  const [statusInspeksi, setStatusInspeksi] = useState<string>('Normal');
  const [engineeringName, setEngineeringName] = useState<string>('Andi (SPV)');
  const [hseName, setHseName] = useState<string>('HSE Officer');
  const [bmName, setBmName] = useState<string>('Lead BM');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Auth check
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);

        // 2. Fetch Form Template
        const formRes = await fetch(`/api/forms/${id}`);
        if (!formRes.ok) throw new Error('Failed to load form template');
        const formDataObj = await formRes.json();
        setTemplate(formDataObj);

        // 3. Fetch Locations
        const locRes = await fetch('/api/locations');
        if (locRes.ok) {
          const locs = await locRes.json();
          setLocations(locs);
          if (locs.length > 0) setSelectedLocationId(locs[0].id);
        }

        // Initialize default form values
        const defaults: Record<string, any> = {};
        if (formDataObj.form_type === 'STANDARD' && formDataObj.schema_definition?.fields) {
          formDataObj.schema_definition.fields.forEach((f: FormField) => {
            if (f.field_type === 'STATUS_TOGGLE' && f.options && f.options.length > 0) {
              defaults[f.id] = f.options[0];
            }
          });
        } else if (formDataObj.form_type === 'CUSTOM' && formDataObj.schema_definition?.headings) {
          formDataObj.schema_definition.headings.forEach((h: FormHeading) => {
            const checkChildren = (children: FormChild[]) => {
              children?.forEach((c: FormChild) => {
                c.fields?.forEach((f: FormField) => {
                  if (f.field_type === 'STATUS_TOGGLE' && f.options && f.options.length > 0) {
                    defaults[f.id] = f.options[0];
                  }
                });
              });
            };

            if (h.children) checkChildren(h.children);
            if (h.subheadings) {
              h.subheadings.forEach((sub: FormSubheading) => {
                if (sub.children) checkChildren(sub.children);
              });
            }
          });
        }
        setFormData(defaults);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, router]);

  const isGasForm = template?.code === 'CHK-GAS' || (template?.schema_definition as any)?.form_code === 'FR-LO-005';

  const toggleSection = (headingId: string) => {
    setCollapsedSections(prev => ({ ...prev, [headingId]: !prev[headingId] }));
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const isFieldAbnormal = (field: FormField, val: any): boolean => {
    if (val === undefined || val === null || val === '') return false;
    if (field.field_type === 'STATUS_TOGGLE') {
      const s = String(val).toUpperCase();
      return s.includes('ABNORMAL') || s.includes('TROUBLE') || s.includes('FAULT') || s.includes('LEAK') || s.includes('DEAD') || s === 'BAD';
    }
    if (field.field_type === 'NUMBER') {
      const num = parseFloat(val);
      if (isNaN(num)) return false;
      if (field.min_val !== undefined && num < field.min_val) return true;
      if (field.max_val !== undefined && num > field.max_val) return true;
    }
    return false;
  };

  const handleDownloadOfficialPDF = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch('/api/export/gas-pdf');
      if (!res.ok) throw new Error('Failed to generate official PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FR-LO-005_Checklist_Gas_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Check for any abnormal readings
      let hasAbnormal = false;

      const checkField = (f: FormField) => {
        if (isFieldAbnormal(f, formData[f.id])) {
          hasAbnormal = true;
        }
      };

      if (template?.form_type === 'STANDARD') {
        template.schema_definition?.fields?.forEach(checkField);
      } else if (template?.schema_definition?.headings) {
        template.schema_definition.headings.forEach(h => {
          h.children?.forEach(c => c.fields?.forEach(checkField));
          h.subheadings?.forEach(sub => sub.children?.forEach(c => c.fields?.forEach(checkField)));
        });
      }

      if (statusInspeksi !== 'Normal') {
        hasAbnormal = true;
      }

      // Merge Gas specific fields into submission data if gas form
      const finalSubmissionData = {
        ...formData,
        ...(isGasForm ? {
          temuan,
          tindakan_koreksi: tindakanKoreksi,
          status_inspeksi: statusInspeksi,
          engineering_nama: engineeringName,
          hse_nama: hseName,
          building_manager_nama: bmName,
        } : {})
      };

      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template?.id,
          location_id: selectedLocationId,
          submission_data: finalSubmissionData,
          technician_notes: isGasForm ? temuan || technicianNotes : technicianNotes,
          has_abnormal_reading: hasAbnormal,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to submit checklist');

      setSuccessMessage('Checklist successfully recorded and submitted.');
      setTimeout(() => {
        router.push('/history');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-2" />
        <span>Loading checklist schema...</span>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-center text-slate-400">
        Checklist template not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <Navbar user={user} />

      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
        {/* Back Link & Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Checklists
          </button>

          {isGasForm && (
            <button
              type="button"
              onClick={handleDownloadOfficialPDF}
              disabled={downloadingPdf}
              className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              {downloadingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 text-rose-400" />
              )}
              Download Blank PDF (FR-LO-005)
            </button>
          )}
        </div>

        {/* Master Header Card */}
        <div className="facility-card p-5 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {isGasForm ? 'FORM FR-LO-005 • Rev. 00' : template.category}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {template.code} • v{template.version}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {template.title}
              </h1>
              {template.description && (
                <p className="text-xs text-slate-400 mt-1">{template.description}</p>
              )}
            </div>

            {/* Official PDF Document Registry Stamp */}
            {isGasForm ? (
              <div className="rounded-lg border border-slate-700 bg-slate-900/90 p-2.5 text-[11px] font-mono shrink-0 space-y-1">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">No. Form</span>
                  <span className="text-white font-bold">: FR-LO-005</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Revisi</span>
                  <span className="text-white font-bold">: 00</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Tanggal</span>
                  <span className="text-white">: 26 Agustus 2026</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Halaman</span>
                  <span className="text-white">: 1 dari 1</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 shrink-0">
                <Clock className="h-4 w-4 text-blue-400" />
                <span>Inspection: {new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
              </div>
            )}
          </div>

          {/* Location & Metadata Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                Inspection Location Site
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} — {loc.building} ({loc.floor || 'Level'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-400" />
                Inspector & Timestamp
              </label>
              <div className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-sm flex items-center justify-between">
                <span>{user?.full_name} ({user?.role})</span>
                <span className="text-xs text-slate-500 font-mono">
                  {new Date().toLocaleDateString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STANDARD FORM RENDERER */}
          {template.form_type === 'STANDARD' && (
            <div className="facility-card p-5 sm:p-6 space-y-5">
              <h2 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-3">
                Inspection Parameters
              </h2>
              {template.schema_definition?.fields?.map((field: FormField) => (
                <div key={field.id} className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="text-sm font-medium text-slate-200">
                      {field.label} {field.required && <span className="text-rose-400">*</span>}
                    </label>
                    {field.unit && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {field.unit}
                      </span>
                    )}
                  </div>

                  {field.field_type === 'STATUS_TOGGLE' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {field.options?.map((opt) => {
                        const isSelected = formData[field.id] === opt;
                        const isAbn = isFieldAbnormal(field, opt);
                        return (
                          <button
                            type="button"
                            key={opt}
                            onClick={() => handleFieldChange(field.id, opt)}
                            className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                              isSelected
                                ? isAbn
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : field.field_type === 'NUMBER' ? (
                    <input
                      type="number"
                      step="any"
                      value={formData[field.id] ?? ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder={field.unit ? `Input in ${field.unit}` : 'Enter numeric reading'}
                      required={field.required}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData[field.id] ?? ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder="Enter details..."
                      required={field.required}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* CUSTOM HIERARCHICAL FORM RENDERER */}
          {template.form_type === 'CUSTOM' && (
            <div className="space-y-4">
              {template.schema_definition?.headings?.map((heading: FormHeading) => {
                const isCollapsed = collapsedSections[heading.id] ?? false;

                return (
                  <div key={heading.id} className="facility-card overflow-hidden">
                    {/* Collapsible Section Header */}
                    <button
                      type="button"
                      onClick={() => toggleSection(heading.id)}
                      className="w-full px-5 py-4 bg-slate-900/90 hover:bg-slate-900 flex items-center justify-between text-left transition-colors border-b border-slate-800"
                    >
                      <span className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                        {heading.title}
                      </span>
                      <div className="p-1 rounded-md bg-slate-800 text-slate-400">
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    {/* Section Body */}
                    {!isCollapsed && (
                      <div className="p-4 sm:p-5 space-y-4">
                        {/* If Gas Form with tabular layout */}
                        {isGasForm ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                                <tr>
                                  <th className="py-2.5 px-3 w-12 text-center">NO</th>
                                  <th className="py-2.5 px-3 min-w-[220px]">ITEMS</th>
                                  <th className="py-2.5 px-3 w-24 text-center">TOTAL</th>
                                  <th className="py-2.5 px-3 w-36 text-center">CONDITION</th>
                                  <th className="py-2.5 px-3 min-w-[150px]">REMARKS</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60">
                                {heading.children?.[0]?.fields?.map((field: any, idx: number) => {
                                  const conditionVal = formData[field.id] || 'GOOD';
                                  const isBad = conditionVal === 'BAD';
                                  const totalVal = formData[`${field.id}_total`] || '';
                                  const remarksVal = formData[`${field.id}_remarks`] || '';

                                  return (
                                    <tr key={field.id} className="hover:bg-slate-900/40">
                                      <td className="py-2 px-3 text-center font-mono text-slate-500 font-bold">
                                        {idx + 1}
                                      </td>
                                      <td className="py-2 px-3 text-slate-200 font-medium">
                                        {field.label.replace(/^\d+\.\s*/, '')}
                                      </td>
                                      <td className="py-2 px-3">
                                        <input
                                          type="text"
                                          value={totalVal}
                                          onChange={(e) => handleFieldChange(`${field.id}_total`, e.target.value)}
                                          placeholder="-"
                                          className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-center text-xs text-white"
                                        />
                                      </td>
                                      <td className="py-2 px-3">
                                        <div className="grid grid-cols-2 gap-1 w-28 mx-auto">
                                          <button
                                            type="button"
                                            onClick={() => handleFieldChange(field.id, 'GOOD')}
                                            className={`py-1 px-1.5 rounded text-[11px] font-bold border transition-all ${
                                              conditionVal === 'GOOD'
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                                                : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'
                                            }`}
                                          >
                                            GOOD
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleFieldChange(field.id, 'BAD')}
                                            className={`py-1 px-1.5 rounded text-[11px] font-bold border transition-all ${
                                              conditionVal === 'BAD'
                                                ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                                                : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'
                                            }`}
                                          >
                                            BAD
                                          </button>
                                        </div>
                                      </td>
                                      <td className="py-2 px-3">
                                        <input
                                          type="text"
                                          value={remarksVal}
                                          onChange={(e) => handleFieldChange(`${field.id}_remarks`, e.target.value)}
                                          placeholder="Remarks..."
                                          className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          /* Standard custom rendering for other equipment */
                          <>
                            {heading.subheadings?.map((subheading: FormSubheading) => (
                              <div key={subheading.id} className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-4 space-y-4">
                                <div className="border-b border-slate-800/80 pb-2">
                                  <h3 className="text-sm font-semibold text-blue-400">
                                    {subheading.title}
                                  </h3>
                                  {subheading.fixed_benchmark && (
                                    <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-300/90 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                                      <Info className="h-3.5 w-3.5 shrink-0" />
                                      <span>Benchmark: {subheading.fixed_benchmark}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-4 pl-1">
                                  {subheading.children?.map((child: FormChild) => (
                                    <div key={child.id} className="space-y-3">
                                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        {child.label}
                                      </h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {child.fields?.map((field: FormField) => renderFieldInput(field))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}

                            {heading.children && heading.children.length > 0 && (
                              <div className="space-y-4">
                                {heading.children.map((child: FormChild) => (
                                  <div key={child.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                      {child.label}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {child.fields?.map((field: FormField) => renderFieldInput(field))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* OFFICIAL PDF BOTTOM SECTION: TEMUAN, STATUS & SIGN-OFF */}
          {isGasForm ? (
            <div className="facility-card p-5 sm:p-6 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-slate-800 pb-2">
                Temuan, Status & Verifikasi Sign-off (Sesuai Form FR-LO-005)
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Temuan & Tindakan Koreksi */}
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Temuan:
                    </label>
                    <textarea
                      rows={2}
                      value={temuan}
                      onChange={(e) => setTemuan(e.target.value)}
                      placeholder="Tuliskan temuan fisik atau deviasi operasional gas..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Tindakan Koreksi:
                    </label>
                    <textarea
                      rows={2}
                      value={tindakanKoreksi}
                      onChange={(e) => setTindakanKoreksi(e.target.value)}
                      placeholder="Tuliskan langkah perbaikan yang telah atau akan dilakukan..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 2. Status Radio Options */}
                <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                    Status Keseluruhan:
                  </label>
                  <div className="space-y-2">
                    {['Normal', 'Perlu Perbaikan', 'Critical – Gas Harus Diisolasi'].map((st) => (
                      <button
                        type="button"
                        key={st}
                        onClick={() => setStatusInspeksi(st)}
                        className={`w-full p-2.5 rounded-lg text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                          statusInspeksi === st
                            ? st === 'Normal'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                              : st === 'Perlu Perbaikan'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span>[ {statusInspeksi === st ? 'X' : ' '} ] {st}</span>
                        {statusInspeksi === st && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. 4-Party Sign-Off Matrix */}
              <div className="border-t border-slate-800 pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Matriks Verifikasi & Tanda Tangan (TTD):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                      Petugas (Field)
                    </span>
                    <input
                      type="text"
                      disabled
                      value={user?.full_name || 'Petugas'}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                      Engineering
                    </span>
                    <input
                      type="text"
                      value={engineeringName}
                      onChange={(e) => setEngineeringName(e.target.value)}
                      placeholder="Nama Engineering"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                      HSE Officer
                    </span>
                    <input
                      type="text"
                      value={hseName}
                      onChange={(e) => setHseName(e.target.value)}
                      placeholder="Nama HSE"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                      Building Manager
                    </span>
                    <input
                      type="text"
                      value={bmName}
                      onChange={(e) => setBmName(e.target.value)}
                      placeholder="Nama Building Manager"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Standard notes section for other checklists */
            <div className="facility-card p-5 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Technician Remarks / Observations
              </label>
              <textarea
                rows={3}
                value={technicianNotes}
                onChange={(e) => setTechnicianNotes(e.target.value)}
                placeholder="Add physical observations, unusual noises, leak remarks, or maintenance notes..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-base transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting Inspection...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Submit {isGasForm ? 'Form FR-LO-005 Checklist' : 'Daily Checklist'}
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );

  function renderFieldInput(field: FormField) {
    const val = formData[field.id];
    const isAbn = isFieldAbnormal(field, val);

    return (
      <div key={field.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800/80">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className="text-xs font-medium text-slate-200">
            {field.label} {field.required && <span className="text-rose-400">*</span>}
          </label>
          {field.unit && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              {field.unit}
            </span>
          )}
        </div>

        {field.field_type === 'STATUS_TOGGLE' ? (
          <div className="grid grid-cols-2 gap-1.5">
            {field.options?.map((opt) => {
              const selected = val === opt;
              const abnOpt = isFieldAbnormal(field, opt);
              return (
                <button
                  type="button"
                  key={opt}
                  onClick={() => handleFieldChange(field.id, opt)}
                  className={`py-1.5 px-2.5 rounded text-xs font-semibold border transition-all ${
                    selected
                      ? abnOpt
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : field.field_type === 'NUMBER' ? (
          <div>
            <input
              type="number"
              step="any"
              value={val ?? ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.unit ? `Input in ${field.unit}` : 'Enter value'}
              required={field.required}
              className={`w-full px-3 py-1.5 rounded bg-slate-950 border text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isAbn ? 'border-rose-500/80 bg-rose-950/20 text-rose-200' : 'border-slate-800'
              }`}
            />
            {isAbn && (
              <span className="text-[10px] text-rose-400 mt-1 block">
                Reading outside benchmark range!
              </span>
            )}
          </div>
        ) : (
          <input
            type="text"
            value={val ?? ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder="Notes or value"
            required={field.required}
            className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}
      </div>
    );
  }
}
