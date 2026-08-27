import React from 'react';
import {
  ShieldCheck,
  UserCheck,
  User,
  RotateCcw,
  Building2,
  LogOut,
  Shield,
  ClipboardCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { KomatsuLogo } from './KomatsuLogo';

export const Header: React.FC = () => {
  const { currentUser, logout, resetAllData } = useApp();

  const getRoleBadge = () => {
    if (!currentUser) return null;
    switch (currentUser.role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Shield className="w-3 h-3 text-amber-400" />
            ADMINISTRATOR
          </span>
        );
      case 'SUPERVISOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
            <UserCheck className="w-3 h-3 text-sky-400" />
            QUALITY SUPERVISOR
          </span>
        );
      case 'QC_TESTER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <ClipboardCheck className="w-3 h-3 text-emerald-400" />
            QC TESTER
          </span>
        );
    }
  };

  return (
    <header className="bg-blue-950 text-white border-b border-blue-900 sticky top-0 z-40 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          {/* Komatsu Reman Official Logo */}
          <div className="h-11 w-32 bg-white rounded-lg px-2.5 py-1 shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
            <KomatsuLogo variant="full" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-wide uppercase leading-tight text-white">
                PT KOMATSU REMANUFACTURING ASIA
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-bold bg-blue-900 text-amber-300 rounded border border-blue-800">
                QC DYNO TEST SYSTEM
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Product Quality Test Certificate & Dyno Bench Verification
            </p>
          </div>
        </div>

        {/* Authenticated User Info & Actions */}
        {currentUser && (
          <div className="flex items-center gap-3">
            {/* Quick Reset Sample Data (Admin Only or subtle utility) */}
            {currentUser.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset system data to initial KRA sample test records and configuration?')) {
                    resetAllData();
                  }
                }}
                className="hidden md:flex items-center gap-1 text-[11px] text-slate-300 hover:text-amber-400 px-2 py-1 rounded hover:bg-blue-900/60 transition-colors"
                title="Reset demo data (Admin)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo</span>
              </button>
            )}

            {/* Current User Info Card */}
            <div className="flex items-center gap-2.5 bg-blue-900/60 border border-blue-800/80 rounded-lg px-3 py-1.5">
              <div className="w-8 h-8 rounded-full bg-blue-800 border border-amber-400/80 flex items-center justify-center text-xs font-bold text-amber-300 shrink-0 shadow-inner">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({currentUser.employeeId})
                  </span>
                </div>
                <div className="mt-0.5">{getRoleBadge()}</div>
              </div>
              {/* Role badge on mobile */}
              <div className="sm:hidden">{getRoleBadge()}</div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              id="btn-user-logout"
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 bg-red-950/50 hover:bg-red-900/80 border border-red-800/60 hover:text-white transition-all shadow-xs cursor-pointer"
              title="Sign out of current account"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
