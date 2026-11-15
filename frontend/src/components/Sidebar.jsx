import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  QrCode,
  ScanLine,
  ShieldCheck,
  Ticket as TicketIcon,
  Settings,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { logout, admin } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'All Registrations', path: '/admin/registrations', icon: Users },
    { label: 'Pending Payments', path: '/admin/registrations?paymentStatus=PENDING', icon: Clock },
    { label: 'Approved Registrations', path: '/admin/registrations?paymentStatus=APPROVED', icon: CheckCircle2 },
    { label: 'Rejected Registrations', path: '/admin/registrations?paymentStatus=REJECTED', icon: XCircle },
    { label: 'QR Ticket Management', path: '/admin/tickets', icon: QrCode },
    { label: 'QR Scanner', path: '/admin/scanner', icon: ScanLine },
    { label: 'Scanned Tickets', path: '/admin/tickets?status=SCANNED', icon: ShieldCheck },
    { label: 'Unscanned Tickets', path: '/admin/tickets?status=UNSCANNED', icon: TicketIcon },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: ShieldAlert },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const isItemActive = (itemPath) => {
    const [targetPath, targetQuery] = itemPath.split('?');
    if (location.pathname !== targetPath) return false;

    const currentParams = new URLSearchParams(location.search);

    if (!targetQuery) {
      if (targetPath === '/admin/registrations') {
        const pStatus = currentParams.get('paymentStatus');
        return !pStatus || pStatus === 'ALL';
      }
      if (targetPath === '/admin/tickets') {
        const tStatus = currentParams.get('status');
        return !tStatus || tStatus === 'ALL';
      }
      return true;
    }

    const targetParams = new URLSearchParams(targetQuery);
    for (const [key, value] of targetParams.entries()) {
      if (currentParams.get(key) !== value) {
        return false;
      }
    }
    return true;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between shadow-xs`}
      >
        <div>
          {/* Brand header with Uraan logo */}
          <div className="h-16 flex items-center px-5 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/uraan-logo.png"
                alt="Uraan Logo"
                className="w-9 h-9 rounded-full object-contain shadow-xs border border-amber-300 shrink-0"
              />
              <div className="min-w-0">
                <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight truncate">
                  Uraan Trip <span className="text-indigo-600">2026</span>
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block truncate">
                  Admin Verification Portal
                </span>
              </div>
            </div>
          </div>

          {/* Navigation links with exact single-active window detection */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.path);

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => onClose && onClose()}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Admin profile & logout button */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
              {admin?.email ? admin.email[0].toUpperCase() : 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {admin?.email || 'Administrator'}
              </p>
              <span className="inline-block text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-medium">
                MASTER ADMIN
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
