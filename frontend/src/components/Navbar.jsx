import React from 'react';
import { Menu, QrCode, ExternalLink, Calendar, MapPin, Shield } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AdminNavbar = ({ onToggleSidebar }) => {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Dashboard Overview';
    if (path.includes('/registrations')) return 'Registration Management';
    if (path.includes('/tickets')) return 'QR Ticket Management';
    if (path.includes('/scanner')) return 'QR Code Scanner';
    if (path.includes('/audit-logs')) return 'Security Audit Trail';
    if (path.includes('/settings')) return 'System Settings';
    return 'Admin Portal';
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">
            {getPageTitle()}
          </h1>
          <p className="text-[11px] text-slate-500 font-mono hidden sm:block">
            Strict Multi-Factor State • Atomic QR Verification
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          to="/admin/scanner"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all shadow-xs"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Launch Scanner</span>
        </Link>
        <Link
          to="/"
          target="_blank"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all"
        >
          <span>Public Portal</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </Link>
      </div>
    </header>
  );
};

export const PublicNavbar = () => {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/uraan-logo.png"
            alt="Uraan Logo"
            className="w-10 h-10 rounded-full object-contain shadow-sm border border-amber-300 group-hover:scale-105 transition-transform"
          />
          <div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900 block leading-none">
              Uraan Trip <span className="text-indigo-600">2026</span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium tracking-wide">
              Official Registration Portal
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
};
