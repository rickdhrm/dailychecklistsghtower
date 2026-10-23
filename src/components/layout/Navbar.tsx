'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/types';
import { 
  ClipboardList, 
  CheckSquare, 
  Users, 
  Archive, 
  LogOut, 
  UserCheck, 
  Sliders, 
  ShieldAlert,
  FileSpreadsheet
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (!user) return null;

  const isAdminOrSpv = user.role === 'ADMIN' || user.role === 'SPV';

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-white block leading-tight">
                  SGH Checklist
                </span>
                <span className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">
                  Facility Engine
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Technician / Field Navigation */}
            <Link
              href="/"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === '/' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Checklists
            </Link>

            <Link
              href="/history"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname.startsWith('/history') ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              My Submissions
            </Link>

            {/* Admin / SPV Nav Links */}
            {isAdminOrSpv && (
              <>
                <div className="h-5 w-px bg-slate-800 mx-2" />
                <Link
                  href="/admin/submissions"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname.startsWith('/admin/submissions') ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Monitor Data
                </Link>

                <Link
                  href="/admin/forms"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname.startsWith('/admin/forms') ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Sliders className="h-4 w-4" />
                  Form Builder
                </Link>

                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin/users"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      pathname.startsWith('/admin/users') ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    Technicians
                  </Link>
                )}

                <Link
                  href="/admin/housekeeping"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname.startsWith('/admin/housekeeping') ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Archive className="h-4 w-4" />
                  Housekeeping
                </Link>
              </>
            )}
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-slate-200 flex items-center gap-1.5 justify-end">
                <span>{user.full_name}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    user.role === 'ADMIN'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : user.role === 'SPV'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {user.employee_code || user.username}
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-900/95 py-2 px-1 text-xs">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-md ${
            pathname === '/' ? 'text-blue-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Forms
        </Link>
        <Link
          href="/history"
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-md ${
            pathname.startsWith('/history') ? 'text-blue-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          History
        </Link>
        {isAdminOrSpv && (
          <Link
            href="/admin/submissions"
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-md ${
              pathname.startsWith('/admin') ? 'text-indigo-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Sliders className="h-4 w-4" />
            Admin Hub
          </Link>
        )}
      </div>
    </header>
  );
}
