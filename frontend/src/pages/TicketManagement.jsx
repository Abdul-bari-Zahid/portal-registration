import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  Send,
  AlertOctagon,
  Search,
  Filter,
  Eye,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import { TicketStatusBadge, DeliveryStatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { TicketCard } from '../components/TicketCard';
import { RevokeModal } from '../components/RevokeModal';
import { TableSkeleton } from '../components/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export const TicketManagement = () => {
  const [searchParams] = useSearchParams();
  const { toastSuccess, toastError } = useToast();

  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || 'ALL');
  const [deliveryStatus, setDeliveryStatus] = useState(searchParams.get('deliveryStatus') || 'ALL');

  // Modals
  const [activeTicketData, setActiveTicketData] = useState(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [ticketToRevoke, setTicketToRevoke] = useState(null);

  useEffect(() => {
    const s = searchParams.get('status');
    if (s) setStatus(s);
  }, [searchParams]);

  const fetchTickets = useCallback(
    async (pageToLoad = 1) => {
      try {
        setIsLoading(true);
        const params = {
          page: pageToLoad,
          limit: 10,
          status,
          deliveryStatus,
          search: search.trim(),
          sortBy: 'createdAt',
          sortOrder: 'desc',
        };

        const response = await api.get('/tickets', { params });
        if (response.data.success) {
          setTickets(response.data.data || []);
          setPagination(response.data.pagination);
        }
      } catch (err) {
        toastError('Failed to load tickets.');
      } finally {
        setIsLoading(false);
      }
    },
    [status, deliveryStatus, search, toastError]
  );

  useEffect(() => {
    fetchTickets(1);
  }, [fetchTickets]);

  const handleOpenTicketPreview = async (ticket) => {
    try {
      const res = await api.get(`/tickets/${ticket._id}/print-data`);
      if (res.data.success) {
        setActiveTicketData(res.data.data);
        setTicketModalOpen(true);
      }
    } catch (err) {
      toastError('Could not load complete ticket data.');
    }
  };

  const handleMarkAsSent = async (ticketId) => {
    try {
      const res = await api.patch(`/tickets/${ticketId}/mark-sent`);
      if (res.data.success) {
        toastSuccess('Ticket marked as SENT to attendee.');
        if (activeTicketData) {
          setActiveTicketData((prev) => ({
            ...prev,
            ticket: { ...prev.ticket, deliveryStatus: 'SENT' },
          }));
        }
        fetchTickets(pagination.page);
      }
    } catch (err) {
      toastError('Failed to update delivery status.');
    }
  };

  const handleOpenRevoke = (ticket) => {
    setTicketToRevoke(ticket);
    setRevokeModalOpen(true);
  };

  const handleConfirmRevoke = async (ticketId, reason) => {
    const res = await api.patch(`/tickets/${ticketId}/revoke`, { reason });
    if (res.data.success) {
      toastSuccess('Ticket has been successfully revoked.');
      if (ticketModalOpen) setTicketModalOpen(false);
      fetchTickets(pagination.page);
    }
  };

  const handleCopyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      toastSuccess(`Email copied: ${email}`);
    } catch (_) {
      toastError('Failed to copy email.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            QR Ticket Management
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Track admission tokens, monitor gate scan timestamps & manage manual distribution.
          </p>
        </div>

        <button
          onClick={() => fetchTickets(pagination.page)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket ID or attendee..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600"
          />
        </div>

        {/* Ticket Status Filter */}
        <div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600"
          >
            <option value="ALL">All Ticket Statuses</option>
            <option value="ISSUED">ISSUED</option>
            <option value="SCANNED">SCANNED (Checked In)</option>
            <option value="UNSCANNED">UNSCANNED (Pending Entry)</option>
            <option value="REVOKED">REVOKED</option>
          </select>
        </div>

        {/* Delivery Status Filter */}
        <div>
          <select
            value={deliveryStatus}
            onChange={(e) => setDeliveryStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600"
          >
            <option value="ALL">All Delivery Statuses</option>
            <option value="SENT">SENT (Manually Delivered)</option>
            <option value="NOT_SENT">NOT SENT (Pending Dispatch)</option>
          </select>
        </div>
      </div>

      {/* TICKETS TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={7} />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 px-4">
            <QrCode className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Tickets Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No tickets matched the current filter criteria. Tickets are generated automatically upon approving pending registrations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-mono uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Ticket ID</th>
                  <th className="py-3.5 px-4 font-semibold">Attendee Name</th>
                  <th className="py-3.5 px-4 font-semibold">Registration ID</th>
                  <th className="py-3.5 px-4 font-semibold">Issue Date</th>
                  <th className="py-3.5 px-4 font-semibold">Delivery Status</th>
                  <th className="py-3.5 px-4 font-semibold">Entry Status</th>
                  <th className="py-3.5 px-4 font-semibold">Scan Date & Time</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tickets.map((t) => {
                  const reg = t.registrationId || {};
                  return (
                    <tr
                      key={t._id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                        {t.ticketId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {reg.fullName || 'N/A'}
                        {reg.email && (
                          <span
                            onClick={() => handleCopyEmail(reg.email)}
                            className="block font-mono text-[11px] text-slate-500 hover:text-indigo-600 cursor-pointer"
                            title="Click to copy email"
                          >
                            {reg.email}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-sky-700 whitespace-nowrap">
                        {reg.registrationId || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {t.issuedAt ? new Date(t.issuedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <DeliveryStatusBadge status={t.deliveryStatus} />
                        {t.sentAt && (
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                            {new Date(t.sentAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <TicketStatusBadge
                          status={t.ticketStatus}
                          isScanned={t.isScanned}
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        {t.scannedAt ? (
                          <span className="text-teal-700 font-semibold">
                            {new Date(t.scannedAt).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenTicketPreview(t)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1 shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Pass</span>
                          </button>

                          {t.deliveryStatus !== 'SENT' && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsSent(t._id)}
                              className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors border border-transparent hover:border-teal-200"
                              title="Mark as Sent to Attendee"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {t.ticketStatus !== 'REVOKED' && !t.isScanned && (
                            <button
                              type="button"
                              onClick={() => handleOpenRevoke(t)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-200"
                              title="Revoke Ticket"
                            >
                              <AlertOctagon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} tickets)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchTickets(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchTickets(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed bg-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TICKET VIEW MODAL */}
      <Modal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        title={`Issued Admission Pass — ${activeTicketData?.ticket?.ticketId || ''}`}
        maxWidth="max-w-4xl"
      >
        {activeTicketData && (
          <TicketCard
            ticket={activeTicketData.ticket}
            registration={activeTicketData.registration}
            qrDataUrl={activeTicketData.qrDataUrl}
            onMarkAsSent={handleMarkAsSent}
          />
        )}
      </Modal>

      {/* REVOKE MODAL */}
      <RevokeModal
        isOpen={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        ticket={ticketToRevoke}
        onConfirm={handleConfirmRevoke}
      />
    </div>
  );
};
