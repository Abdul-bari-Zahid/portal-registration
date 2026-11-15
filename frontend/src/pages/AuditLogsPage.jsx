import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import { TableSkeleton } from '../components/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export const AuditLogsPage = () => {
  const { toastError } = useToast();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = useCallback(
    async (pageToLoad = 1) => {
      try {
        setIsLoading(true);
        const params = {
          page: pageToLoad,
          limit: 15,
          search: search.trim(),
          action: actionFilter,
        };

        const res = await api.get('/audit', { params });
        if (res.data.success) {
          setLogs(res.data.data || []);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        toastError('Failed to load audit logs.');
      } finally {
        setIsLoading(false);
      }
    },
    [search, actionFilter, toastError]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            Security & Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Cryptographic immutable logs of all admin actions, approvals, rejections, logins & scan events.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(pagination.page)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, Reg ID, Ticket ID, IP..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600"
          />
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600"
          >
            <option value="ALL">All Recorded Actions</option>
            <option value="ADMIN_LOGIN_SUCCESS">ADMIN_LOGIN_SUCCESS</option>
            <option value="FAILED_LOGIN_ATTEMPT">FAILED_LOGIN_ATTEMPT</option>
            <option value="PAYMENT_APPROVED">PAYMENT_APPROVED</option>
            <option value="PAYMENT_REJECTED">PAYMENT_REJECTED</option>
            <option value="QR_SCANNED_SUCCESS">QR_SCANNED_SUCCESS</option>
            <option value="QR_SCANNED_DUPLICATE">QR_SCANNED_DUPLICATE</option>
            <option value="QR_SCANNED_INVALID">QR_SCANNED_INVALID</option>
            <option value="TICKET_REVOKED">TICKET_REVOKED</option>
            <option value="TICKET_MARKED_SENT">TICKET_MARKED_SENT</option>
          </select>
        </div>
      </div>

      {/* AUDIT LOG TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={5} />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Audit Events Logged</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No audit logs matched your query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-mono uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold">Action</th>
                  <th className="py-3.5 px-4 font-semibold">Reg / Ticket ID</th>
                  <th className="py-3.5 px-4 font-semibold">Actor / IP</th>
                  <th className="py-3.5 px-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {logs.map((log) => {
                  let badge = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (log.action.includes('APPROVED')) badge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (log.action.includes('REJECTED')) badge = 'bg-rose-50 text-rose-700 border-rose-200';
                  if (log.action.includes('SUCCESS')) badge = 'bg-teal-50 text-teal-700 border-teal-200';
                  if (log.action.includes('DUPLICATE')) badge = 'bg-amber-50 text-amber-700 border-amber-200';

                  return (
                    <tr key={log._id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${badge}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.registrationId && (
                          <span className="text-indigo-600 font-bold block">
                            {log.registrationId}
                          </span>
                        )}
                        {log.ticketId && (
                          <span className="text-sky-700 font-bold block">
                            {log.ticketId}
                          </span>
                        )}
                        {!log.registrationId && !log.ticketId && (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-sans">
                        <span className="text-slate-900 font-semibold block">
                          {log.adminId?.email || 'System / Gate'}
                        </span>
                        {log.ipAddress && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            IP: {log.ipAddress}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600 font-sans">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-mono">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed bg-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
