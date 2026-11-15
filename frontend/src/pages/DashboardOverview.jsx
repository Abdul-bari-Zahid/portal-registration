import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  QrCode,
  ShieldCheck,
  Ticket as TicketIcon,
  ArrowUpRight,
  ScanLine,
  RefreshCw,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import api from '../services/api';
import { StatsCard } from '../components/StatsCard';
import { CardSkeleton } from '../components/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export const DashboardOverview = () => {
  const { toastError } = useToast();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      else setIsRefreshing(true);

      const response = await api.get('/dashboard/stats');
      if (response.data.success && response.data.data) {
        setStats(response.data.data.stats);
      }
    } catch (err) {
      toastError('Failed to load dashboard metrics.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Executive Control Center
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Real-time registration pipeline, payment validation & gate entry telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDashboardData(false)}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh Telemetry
          </button>

          <Link
            to="/admin/scanner"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <ScanLine className="w-3.5 h-3.5" />
            Launch Gate Scanner
          </Link>
        </div>
      </div>

      {/* METRIC COUNTER TILES */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <CardSkeleton count={4} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatsCard
            title="Total Registrations"
            value={stats?.totalRegistrations}
            icon={Users}
            color="indigo"
            changeText="All submitted registration forms"
          />
          <StatsCard
            title="Pending Payments"
            value={stats?.pendingPayments}
            icon={Clock}
            color="amber"
            changeText="Awaiting admin manual verification"
          />
          <StatsCard
            title="Approved Payments"
            value={stats?.approvedPayments}
            icon={CheckCircle2}
            color="emerald"
            changeText="Verified payments with issued tickets"
          />
          <StatsCard
            title="Rejected Payments"
            value={stats?.rejectedPayments}
            icon={XCircle}
            color="rose"
            changeText="Declined submissions (no tickets issued)"
          />
          <StatsCard
            title="Total Tickets Generated"
            value={stats?.totalTicketsGenerated}
            icon={QrCode}
            color="sky"
            changeText="Issued cryptographic QR passes"
          />
          <StatsCard
            title="Total Scanned Tickets"
            value={stats?.totalScannedTickets}
            icon={ShieldCheck}
            color="teal"
            changeText="Admitted attendees through gate scanner"
          />
          <StatsCard
            title="Remaining Entries"
            value={stats?.remainingEntries}
            icon={TicketIcon}
            color="indigo"
            changeText="Valid tickets not yet admitted at gate"
          />
        </div>
      )}

      {/* QUICK ACTION WORKFLOWS (FULL WIDTH 3-COL GRID) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Quick Action Workflows</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Operations Hub</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/admin/registrations?paymentStatus=PENDING"
            className="group block p-6 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <Clock className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <div className="mt-4">
              <h4 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                Review Pending Payments
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {stats?.pendingPayments || 0} attendee submissions waiting for manual proof verification.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-700">
                <span>Open Verification Queue</span>
                <span>→</span>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/tickets"
            className="group block p-6 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div className="mt-4">
              <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                QR Ticket Distribution
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Download PDF admission passes, print tickets, and mark distribution as sent.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-700">
                <span>Manage & Download Tickets</span>
                <span>→</span>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/scanner"
            className="group block p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <ScanLine className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <div className="mt-4">
              <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Gate Entry Scanner
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Scan attendee tickets using device camera with atomic one-time validation.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
                <span>Open Gate Scanner</span>
                <span>→</span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};
