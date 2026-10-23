'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { FormTemplate, User, FormType, FormHeading, FormSubheading, FormChild, FormField } from '@/types';
import { 
  Sliders, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  ListTree, 
  FileText,
  Loader2,
  X
} from 'lucide-react';

export default function AdminFormsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Builder Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Mechanical');
  const [formType, setFormType] = useState<FormType>('CUSTOM');

  // Standard Form Fields State
  const [standardFields, setStandardFields] = useState<FormField[]>([]);

  // Custom Form Headings Hierarchy State
  const [customHeadings, setCustomHeadings] = useState<FormHeading[]>([]);

  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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

        await fetchTemplates();
      } catch (err) {
        console.error('Error loading forms:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const fetchTemplates = async () => {
    const res = await fetch('/api/forms');
    if (res.ok) {
      setTemplates(await res.json());
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setCode(`CHK-${Date.now().toString().slice(-4)}`);
    setTitle('');
    setDescription('');
    setCategory('Mechanical');
    setFormType('CUSTOM');
    setStandardFields([]);
    setCustomHeadings([
      {
        id: `h_${Date.now()}`,
        title: 'Section 1: Operational Check',
        is_collapsible: true,
        subheadings: [
          {
            id: `sub_${Date.now()}`,
            title: 'Technical Parameters',
            fixed_benchmark: 'Standard Operating Range: Normal',
            children: [
              {
                id: `c_${Date.now()}`,
                label: 'Main Equipment Unit',
                fields: [
                  {
                    id: `f_${Date.now()}_1`,
                    label: 'Operational Status',
                    field_type: 'STATUS_TOGGLE',
                    options: ['NORMAL', 'ABNORMAL'],
                    required: true,
                  },
                  {
                    id: `f_${Date.now()}_2`,
                    label: 'Operating Gauge Reading',
                    field_type: 'NUMBER',
                    unit: 'Bar',
                    min_val: 1,
                    max_val: 10,
                    required: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tmpl: FormTemplate) => {
    setEditingId(tmpl.id);
    setCode(tmpl.code);
    setTitle(tmpl.title);
    setDescription(tmpl.description || '');
    setCategory(tmpl.category);
    setFormType(tmpl.form_type);

    if (tmpl.form_type === 'STANDARD') {
      setStandardFields(tmpl.schema_definition?.fields || []);
      setCustomHeadings([]);
    } else {
      setCustomHeadings(tmpl.schema_definition?.headings || []);
      setStandardFields([]);
    }

    setModalError(null);
    setIsModalOpen(true);
  };

  // Hierarchy Helpers: Adding nodes
  const addHeading = () => {
    setCustomHeadings([
      ...customHeadings,
      {
        id: `h_${Date.now()}`,
        title: `Section ${customHeadings.length + 1}`,
        is_collapsible: true,
        children: [
          {
            id: `c_${Date.now()}`,
            label: 'Inspection Group',
            fields: [
              {
                id: `f_${Date.now()}`,
                label: 'Status Check',
                field_type: 'STATUS_TOGGLE',
                options: ['NORMAL', 'ABNORMAL'],
                required: true,
              },
            ],
          },
        ],
      },
    ]);
  };

  const addSubheading = (hIndex: number) => {
    const updated = [...customHeadings];
    if (!updated[hIndex].subheadings) updated[hIndex].subheadings = [];
    updated[hIndex].subheadings!.push({
      id: `sub_${Date.now()}`,
      title: 'Subheading Specification',
      fixed_benchmark: 'Benchmark: Standard Value',
      children: [
        {
          id: `c_${Date.now()}`,
          label: 'Child Equipment Node',
          fields: [
            {
              id: `f_${Date.now()}`,
              label: 'Parameter Reading',
              field_type: 'NUMBER',
              unit: 'V',
              required: true,
            },
          ],
        },
      ],
    });
    setCustomHeadings(updated);
  };

  const addFieldToChild = (child: FormChild) => {
    child.fields.push({
      id: `f_${Date.now()}`,
      label: 'New Inspection Field',
      field_type: 'NUMBER',
      required: true,
    });
    setCustomHeadings([...customHeadings]);
  };

  const addStandardField = () => {
    setStandardFields([
      ...standardFields,
      {
        id: `sf_${Date.now()}`,
        label: 'New Standard Field',
        field_type: 'TEXT',
        required: true,
      },
    ]);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    const schema_definition =
      formType === 'STANDARD'
        ? { type: 'STANDARD', fields: standardFields }
        : { type: 'CUSTOM', headings: customHeadings };

    try {
      const payload = {
        code,
        title,
        description,
        category,
        form_type: formType,
        schema_definition,
      };

      const url = editingId ? `/api/forms/${editingId}` : '/api/forms';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to save form template');

      setFeedback(editingId ? 'Form updated successfully' : 'New form template created successfully');
      setIsModalOpen(false);
      await fetchTemplates();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sliders className="h-6 w-6 text-indigo-400" />
              Dynamic Form Creation Engine
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure Standard Google-style forms or Custom multi-tier hierarchical checklists (Heading $\rightarrow$ Subheading $\rightarrow$ Children $\rightarrow$ Fields).
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-blue-600/30 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Create New Form
          </button>
        </div>

        {feedback && (
          <div className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{feedback}</span>
            </div>
            <button onClick={() => setFeedback(null)}>
              <X className="h-4 w-4 text-emerald-400" />
            </button>
          </div>
        )}

        {/* Existing Templates Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span>Loading form templates...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tmpl) => (
              <div key={tmpl.id} className="facility-card p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {tmpl.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {tmpl.form_type}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base mb-1">{tmpl.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                    {tmpl.description || 'No description provided.'}
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono text-[11px]">{tmpl.code}</span>
                  <button
                    onClick={() => openEditModal(tmpl)}
                    className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Edit className="h-3 w-3 text-blue-400" />
                    Configure Fields
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Builder Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="facility-card w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingId ? `Edit Form: ${title}` : 'Create Dynamic Form Template'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Define metadata and hierarchical field structure for field inspections.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {modalError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleSaveForm} className="space-y-5">
                {/* Basic Meta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Template Code *
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      disabled={!!editingId}
                      required
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-white text-xs font-mono disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Form Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      placeholder="e.g. Checklist Pompa"
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Category *
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      placeholder="e.g. Mechanical"
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Form Type *
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as FormType)}
                      disabled={!!editingId}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-white text-xs disabled:opacity-50"
                    >
                      <option value="CUSTOM">Custom Form (Hierarchical)</option>
                      <option value="STANDARD">Standard Form (Flat/Google Style)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief inspection scope..."
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-white text-xs"
                  />
                </div>

                {/* FORM BUILDER CANVAS */}
                <div className="border-t border-slate-800 pt-4">
                  {formType === 'STANDARD' ? (
                    /* Standard Form Builder */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Standard Form Fields (Flat)
                        </h4>
                        <button
                          type="button"
                          onClick={addStandardField}
                          className="px-2.5 py-1 rounded bg-blue-600/20 text-blue-400 text-xs font-semibold border border-blue-500/30 flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Add Field
                        </button>
                      </div>

                      {standardFields.map((f, i) => (
                        <div key={f.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
                          <input
                            type="text"
                            value={f.label}
                            onChange={(e) => {
                              const updated = [...standardFields];
                              updated[i].label = e.target.value;
                              setStandardFields(updated);
                            }}
                            placeholder="Field Label"
                            className="flex-1 px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                          />
                          <select
                            value={f.field_type}
                            onChange={(e) => {
                              const updated = [...standardFields];
                              updated[i].field_type = e.target.value as any;
                              setStandardFields(updated);
                            }}
                            className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                          >
                            <option value="TEXT">Text</option>
                            <option value="NUMBER">Number</option>
                            <option value="STATUS_TOGGLE">Status Toggle</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setStandardFields(standardFields.filter((_, idx) => idx !== i));
                            }}
                            className="p-1.5 rounded text-rose-400 hover:bg-slate-800"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Custom Hierarchical Form Builder */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Custom Hierarchical Tree (Heading $\rightarrow$ Subheading $\rightarrow$ Children $\rightarrow$ Fields)
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            According to SGH Checklist specifications.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addHeading}
                          className="px-3 py-1.5 rounded bg-indigo-600/20 text-indigo-400 text-xs font-semibold border border-indigo-500/30 flex items-center gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Heading Section
                        </button>
                      </div>

                      {customHeadings.map((h, hIdx) => (
                        <div key={h.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-3">
                          {/* Heading Header */}
                          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 uppercase">
                                Heading Section
                              </span>
                              <input
                                type="text"
                                value={h.title}
                                onChange={(e) => {
                                  const updated = [...customHeadings];
                                  updated[hIdx].title = e.target.value;
                                  setCustomHeadings(updated);
                                }}
                                className="flex-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-semibold text-white"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => addSubheading(hIdx)}
                                className="px-2 py-1 rounded text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              >
                                + Subheading
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomHeadings(customHeadings.filter((_, idx) => idx !== hIdx));
                                }}
                                className="p-1 rounded text-rose-400 hover:bg-slate-900"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Subheadings in Heading */}
                          {h.subheadings?.map((sub, sIdx) => (
                            <div key={sub.id} className="ml-3 p-3 rounded-lg border border-slate-800/80 bg-slate-900/60 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase">
                                  Subheading
                                </span>
                                <input
                                  type="text"
                                  value={sub.title}
                                  onChange={(e) => {
                                    const updated = [...customHeadings];
                                    updated[hIdx].subheadings![sIdx].title = e.target.value;
                                    setCustomHeadings(updated);
                                  }}
                                  className="flex-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-blue-300 font-medium"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...customHeadings];
                                    updated[hIdx].subheadings = updated[hIdx].subheadings!.filter((_, idx) => idx !== sIdx);
                                    setCustomHeadings(updated);
                                  }}
                                  className="p-1 rounded text-rose-400 hover:bg-slate-800"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-amber-400 shrink-0">Fixed Benchmark:</span>
                                <input
                                  type="text"
                                  value={sub.fixed_benchmark || ''}
                                  onChange={(e) => {
                                    const updated = [...customHeadings];
                                    updated[hIdx].subheadings![sIdx].fixed_benchmark = e.target.value;
                                    setCustomHeadings(updated);
                                  }}
                                  placeholder="e.g. Max Tolerance: 4.5 mm/s | 380V"
                                  className="flex-1 px-2 py-1 rounded bg-slate-950 border border-amber-500/30 text-xs text-amber-200"
                                />
                              </div>

                              {/* Children under Subheading */}
                              <div className="space-y-2 pl-2 border-l border-slate-800 pt-1">
                                {sub.children?.map((child, cIdx) => (
                                  <div key={child.id} className="p-2.5 rounded bg-slate-950 border border-slate-800/60 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                                        Child Node:
                                      </span>
                                      <input
                                        type="text"
                                        value={child.label}
                                        onChange={(e) => {
                                          const updated = [...customHeadings];
                                          updated[hIdx].subheadings![sIdx].children[cIdx].label = e.target.value;
                                          setCustomHeadings(updated);
                                        }}
                                        className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 font-medium"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => addFieldToChild(child)}
                                        className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      >
                                        + Field
                                      </button>
                                    </div>

                                    {/* Fields */}
                                    <div className="space-y-1.5 pl-2">
                                      {child.fields?.map((field, fIdx) => (
                                        <div key={field.id} className="flex items-center gap-2 text-xs">
                                          <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => {
                                              const updated = [...customHeadings];
                                              updated[hIdx].subheadings![sIdx].children[cIdx].fields[fIdx].label = e.target.value;
                                              setCustomHeadings(updated);
                                            }}
                                            placeholder="Field name"
                                            className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white"
                                          />
                                          <select
                                            value={field.field_type}
                                            onChange={(e) => {
                                              const updated = [...customHeadings];
                                              updated[hIdx].subheadings![sIdx].children[cIdx].fields[fIdx].field_type = e.target.value as any;
                                              setCustomHeadings(updated);
                                            }}
                                            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white"
                                          >
                                            <option value="NUMBER">Number</option>
                                            <option value="STATUS_TOGGLE">Status Toggle</option>
                                            <option value="TEXT">Text</option>
                                          </select>
                                          <input
                                            type="text"
                                            value={field.unit || ''}
                                            onChange={(e) => {
                                              const updated = [...customHeadings];
                                              updated[hIdx].subheadings![sIdx].children[cIdx].fields[fIdx].unit = e.target.value;
                                              setCustomHeadings(updated);
                                            }}
                                            placeholder="Unit (V, Bar)"
                                            className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [...customHeadings];
                                              updated[hIdx].subheadings![sIdx].children[cIdx].fields = updated[hIdx].subheadings![sIdx].children[cIdx].fields.filter((_, idx) => idx !== fIdx);
                                              setCustomHeadings(updated);
                                            }}
                                            className="p-1 rounded text-rose-400 hover:bg-slate-800"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-blue-600/30"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Saving Template...
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        Save Form Template
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
