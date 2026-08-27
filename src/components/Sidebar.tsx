import React from 'react';
import {
  FileSpreadsheet,
  PlusCircle,
  Box,
  Users,
  History,
  Clock,
  ShieldCheck,
  Building2,
  HardDrive,
  Database,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export type NavView =
  | 'records'
  | 'new_dyno_test'
  | 'approvals'
  | 'master_products'
  | 'users'
  | 'audit_trail'
  | 'google_drive';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { currentUser, stats } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';
  const isSupervisor = currentUser?.role === 'SUPERVISOR';
  const isQc = currentUser?.role === 'QC_TESTER';

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800 print:hidden">
      {/* Current Role Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/50">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
          Current Access
        </span>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs font-black text-white">
            {currentUser?.role === 'ADMIN'
              ? 'Administrator'
              : currentUser?.role === 'SUPERVISOR'
              ? 'Quality Supervisor'
              : 'QC Test Bench Operator'}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"></span>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* 1. Dyno Test Records (Main Landing Page for All Roles) */}
        <button
          id="nav-dyno-test-records"
          type="button"
          onClick={() => onNavigate('records')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
            currentView === 'records'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>Dyno Test Records</span>
          </div>
        </button>

        {/* 2. New Dyno Test (QC Tester Only) */}
        {isQc && (
          <button
            id="nav-new-dyno-test"
            type="button"
            onClick={() => onNavigate('new_dyno_test')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
              currentView === 'new_dyno_test'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>New Dyno Test</span>
            </div>
          </button>
        )}

        {/* 3. Waiting Approval Queue (Supervisor Only) */}
        {isSupervisor && (
          <button
            id="nav-waiting-approval"
            type="button"
            onClick={() => onNavigate('approvals')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
              currentView === 'approvals'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Waiting Approval</span>
            </div>
            {stats.waitingApproval > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  currentView === 'approvals'
                    ? 'bg-slate-950 text-amber-400'
                    : 'bg-amber-500 text-slate-950 animate-pulse'
                }`}
              >
                {stats.waitingApproval}
              </span>
            )}
          </button>
        )}

        {/* 4. Database Backup & Archive (All Roles) */}
        <button
           id="nav-google-drive"
           type="button"
           onClick={() => onNavigate('google_drive')}
           className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
             currentView === 'google_drive'
               ? 'bg-amber-500 text-slate-950 font-bold'
               : 'text-slate-300 hover:bg-slate-800 hover:text-white'
           }`}
         >
           <div className="flex items-center gap-2.5">
             <HardDrive className="w-4 h-4 text-blue-400" />
             <span>Database Backup</span>
           </div>
           <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-semibold border border-blue-700/50">
             Archive
           </span>
         </button>

        {/* 5. Master Data Section (Admin Only) */}
        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-3 mb-2 block">
              MASTER DATA
            </span>

            {/* Master Products */}
            <button
              id="nav-master-products"
              type="button"
              onClick={() => onNavigate('master_products')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'master_products'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Box className="w-4 h-4 text-sky-400" />
              <span>Master Products</span>
            </button>

            {/* User & Signature Setup */}
            <button
              id="nav-user-management"
              type="button"
              onClick={() => onNavigate('users')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'users'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-purple-400" />
              <span>User & Signature Setup</span>
            </button>

            {/* Audit Trail */}
            <button
              id="nav-audit-trail"
              type="button"
              onClick={() => onNavigate('audit_trail')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'audit_trail'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span>Audit Trail</span>
            </button>
          </div>
        )}
      </nav>

      {/* System Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between text-slate-300 font-semibold">
          <span>KRA Dyno System</span>
          <span className="text-[10px] text-amber-400 font-mono">v3.2</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          PT Komatsu Remanufacturing Asia
        </p>
      </div>
    </aside>
  );
};

