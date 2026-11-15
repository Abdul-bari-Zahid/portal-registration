import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  QrCode,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import { PaymentStatusBadge, TicketStatusBadge } from '../components/StatusBadge';
import { RegistrationDetailModal } from '../components/RegistrationDetailModal';
import { RejectModal } from '../components/RejectModal';
import { Modal } from '../components/Modal';
import { TicketCard } from '../components/TicketCard';
import { TableSkeleton } from '../components/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export const RegistrationsList = () => {
  const [searchParams] = useSearchParams();
  const { toastSuccess, toastError } = useToast();

  const [registrations, setRegistrations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters state from URL query params or defaults
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [department, setDepartment] = useState(searchParams.get('department') || 'ALL');
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get('paymentStatus') || 'ALL');
  const [ticketStatus, setTicketStatus] = useState(searchParams.get('ticketStatus') || 'ALL');

  // Modals state
  const [selectedReg, setSelectedReg] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [regToReject, setRegToReject] = useState(null);

  // Ticket modal state
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [activeTicketData, setActiveTicketData] = useState(null);

  // Config departments
  const [departmentOptions, setDepartmentOptions] = useState([
    'BS',
    'CS',
    'BBA',
    'A&C',
  ]);

  // Sync state with URL params
  useEffect(() => {
    const pStatus = searchParams.get('paymentStatus');
    if (pStatus) setPaymentStatus(pStatus);
  }, [searchParams]);

  // Load public config departments
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/config/public');
        if (res.data?.data?.departments) {
          setDepartmentOptions(res.data.data.departments);
        }
      } catch (_) {}
    };
    fetchConfig();
  }, []);

  // Fetch registrations
  const fetchRegistrations = useCallback(
    async (pageToLoad = 1) => {
      try {
        setIsLoading(true);
        const params = {
          page: pageToLoad,
          limit: 10,
          search: search.trim(),
          department,
          paymentStatus,
          ticketStatus,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        };

        const response = await api.get('/registrations', { params });
        if (response.data.success) {
          setRegistrations(response.data.data || []);
          setPagination(response.data.pagination);
        }
      } catch (err) {
        toastError('Failed to fetch registrations.');
      } finally {
        setIsLoading(false);
      }
    },
    [search, department, paymentStatus, ticketStatus, toastError]
  );

  useEffect(() => {
    fetchRegistrations(1);
  }, [fetchRegistrations]);

  // Open Details Modal
  const handleOpenDetail = (reg) => {
    setSelectedReg(reg);
    setDetailModalOpen(true);
  };

  // Open Reject Modal
  const handleOpenReject = (reg) => {
    setRegToReject(reg);
    setRejectModalOpen(true);
  };

  // Approve Payment Action
  const handleApprovePayment = async (id) => {
    try {
      const response = await api.post(`/payments/registrations/${id}/approve`);
      if (response.data.success) {
        toastSuccess('Payment approved and QR ticket generated!');
        setDetailModalOpen(false);

        // Open newly created ticket immediately
        if (response.data.data?.ticket) {
          setActiveTicketData({
            ticket: response.data.data.ticket,
            registration: response.data.data.registration,
            qrDataUrl: response.data.data.qrDataUrl,
          });
          setTicketModalOpen(true);
        }

        fetchRegistrations(pagination.page);
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Payment approval failed.');
    }
  };

  // Confirm Rejection Action
  const handleConfirmRejection = async (id, reason) => {
    const response = await api.post(`/payments/registrations/${id}/reject`, { reason });
    if (response.data.success) {
      toastSuccess('Registration payment has been rejected.');
      if (detailModalOpen) setDetailModalOpen(false);
      fetchRegistrations(pagination.page);
    }
  };

  // View Ticket from Registration row
  const handleViewTicket = async (ticketId) => {
    try {
      const res = await api.get(`/tickets/${ticketId}/print-data`);
      if (res.data.success) {
        setActiveTicketData(res.data.data);
        if (detailModalOpen) setDetailModalOpen(false);
        setTicketModalOpen(true);
      }
    } catch (err) {
      toastError('Could not retrieve ticket details.');
    }
  };

  const handleMarkTicketSent = async (ticketId) => {
    try {
      const res = await api.patch(`/tickets/${ticketId}/mark-sent`);
      if (res.data.success) {
        toastSuccess('Ticket delivery status marked as SENT.');
        if (activeTicketData) {
          setActiveTicketData((prev) => ({
            ...prev,
            ticket: { ...prev.ticket, deliveryStatus: 'SENT' },
          }));
        }
        fetchRegistrations(pagination.page);
      }
    } catch (err) {
      toastError('Failed to update ticket delivery status.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Registration Management
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Filter, inspect payment receipts, approve/reject & issue digital admission passes.
          </p>
        </div>

        <button
          onClick={() => fetchRegistrations(pagination.page)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, reg ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600"
          />
        </div>

        {/* Department Filter */}
        <div>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600"
          >
            <option value="ALL">All Departments</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Status Filter */}
        <div>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        {/* Ticket Status Filter */}
        <div>
          <select
            value={ticketStatus}
            onChange={(e) => setTicketStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600"
          >
            <option value="ALL">All Ticket Statuses</option>
            <option value="ISSUED">ISSUED</option>
            <option value="SCANNED">SCANNED</option>
            <option value="REVOKED">REVOKED</option>
            <option value="NO_TICKET">NO TICKET</option>
          </select>
        </div>
      </div>

      {/* REGISTRATIONS DATA TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={9} />
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Filter className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Registrations Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No attendee submissions matched your active search query or filter options.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-mono uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Reg ID</th>
                  <th className="py-3.5 px-4 font-semibold">Full Name</th>
                  <th className="py-3.5 px-4 font-semibold">Email</th>
                  <th className="py-3.5 px-4 font-semibold">Department</th>
                  <th className="py-3.5 px-4 font-semibold">Phone</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold">Payment</th>
                  <th className="py-3.5 px-4 font-semibold">Ticket</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {registrations.map((reg) => (
                  <tr
                    key={reg._id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                      {reg.registrationId}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {reg.fullName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {reg.email}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] text-slate-700 border border-slate-200">
                        {reg.department}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap text-slate-600">
                      {reg.phoneNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(reg.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PaymentStatusBadge status={reg.paymentStatus} />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <TicketStatusBadge
                        status={reg.ticket?.ticketStatus}
                        isScanned={reg.ticket?.isScanned}
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(reg)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1 shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>

                        {reg.paymentStatus === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprovePayment(reg._id)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-200"
                              title="Quick Approve Payment"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReject(reg)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200"
                              title="Reject Payment"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {reg.ticket && (
                          <button
                            type="button"
                            onClick={() => handleViewTicket(reg.ticket._id || reg.ticket.ticketId)}
                            className="p-1.5 rounded-lg text-sky-700 hover:bg-sky-50 transition-colors border border-transparent hover:border-sky-200"
                            title="View Generated QR Ticket"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-mono">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchRegistrations(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchRegistrations(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed bg-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      <RegistrationDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        registration={selectedReg}
        onApprove={handleApprovePayment}
        onOpenRejectModal={handleOpenReject}
        onViewTicket={(ticketId) => handleViewTicket(ticketId)}
      />

      {/* REJECT MODAL */}
      <RejectModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        registration={regToReject}
        onConfirm={handleConfirmRejection}
      />

      {/* TICKET CARD PREVIEW MODAL */}
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
            onMarkAsSent={handleMarkTicketSent}
          />
        )}
      </Modal>
    </div>
  );
};
