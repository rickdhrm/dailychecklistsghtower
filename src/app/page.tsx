'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { FormTemplate, User } from '@/types';
import { 
  ClipboardCheck, 
  CheckSquare, 
  Search, 
  ArrowRight, 
  Wrench, 
  Activity, 
  Zap, 
  Flame, 
  ShieldCheck, 
  Radio, 
  Server, 
  Wind, 
  Sliders, 
  Users, 
  FileSpreadsheet, 
  Loader2 
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

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

        const formRes = await fetch('/api/forms');
        if (formRes.ok) {
          const forms = await formRes.json();
          setTemplates(forms);
        }
      } catch (err) {
        console.error('Error loading home data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-2" />
        <span>Loading checklist workspace...</span>
      </div>
    );
  }

  const getFormIcon = (code: string) => {
    switch (code) {
      case 'CHK-POMPA':
        return <Activity className="h-5 w-5 text-blue-400" />;
      case 'CHK-LIFT':
        return <Wrench className="h-5 w-5 text-indigo-400" />;
      case 'CHK-MCFA':
        return <ShieldCheck className="h-5 w-5 text-rose-400" />;
      case 'CHK-ACCESS':
        return <Server className="h-5 w-5 text-emerald-400" />;
      case 'CHK-PAGING':
        return <Radio className="h-5 w-5 text-purple-400" />;
      case 'CHK-ITM-DAIKIN':
        return <Wind className="h-5 w-5 text-cyan-400" />;
      case 'CHK-GAS':
        return <Flame className="h-5 w-5 text-amber-400" />;
      case 'CHK-PLN':
        return <Zap className="h-5 w-5 text-yellow-400" />;
      default:
        return <ClipboardCheck className="h-5 w-5 text-blue-400" />;
    }
  };

  const categories = ['ALL', ...Array.from(new Set(templates.map((t) => t.category)))];

  const filtered = templates.filter((t) => {
    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const isAdminOrSpv = user?.role === 'ADMIN' || user?.role === 'SPV';

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <div className="facility-card p-6 mb-6 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/30 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider font-bold text-blue-400">
                  Daily Operations
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Welcome, {user?.full_name}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Select an operational checklist to record facility readings and condition metrics.
              </p>
            </div>

            {isAdminOrSpv && (
              <div className="flex items-center gap-2">
                <Link
                  href="/admin/submissions"
                  className="px-3.5 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Monitor Submissions
                </Link>
                <Link
                  href="/admin/forms"
                  className="px-3.5 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Form Builder
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Search & Categories */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search checklist or equipment..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 8 Checklists Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => router.push(`/checklist/${tmpl.id}`)}
              className="facility-card p-5 cursor-pointer hover:border-blue-500/50 hover:bg-slate-900/60 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 group-hover:scale-105 transition-transform">
                    {getFormIcon(tmpl.code)}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                    {tmpl.code}
                  </span>
                </div>

                <h3 className="font-bold text-white text-base group-hover:text-blue-400 transition-colors mb-1.5">
                  {tmpl.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {tmpl.description || 'Routine daily equipment inspection checklist.'}
                </p>
              </div>

              <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-medium">
                  {tmpl.category}
                </span>
                <span className="inline-flex items-center gap-1 text-blue-400 font-semibold group-hover:translate-x-1 transition-transform text-xs">
                  Inspect
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
