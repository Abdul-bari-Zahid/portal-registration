import React, { useState } from 'react';
import { Modal } from './Modal';
import { AlertOctagon } from 'lucide-react';

export const RevokeModal = ({ isOpen, onClose, ticket, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Please provide a specific revocation reason (minimum 3 characters).');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onConfirm(ticket._id, reason.trim());
      setReason('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to revoke ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Revoke Issued QR Ticket"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <p>
            Revoking will permanently invalidate this ticket. If scanned at the gate,
            the scanner will immediately flag it as <strong>TICKET NOT VALID (REVOKED)</strong>.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ticket ID: <span className="font-mono text-indigo-600">{ticket?.ticketId}</span>
          </label>
          <p className="text-xs text-slate-500">
            Attendee: {ticket?.registrationId?.fullName || 'N/A'}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Revocation Reason <span className="text-rose-600">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Order disputed, refund issued, duplicate registration detected."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            required
          />
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200 shadow-xs"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 shadow-sm shadow-amber-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <AlertOctagon className="w-4 h-4" />
            {isSubmitting ? 'Revoking...' : 'Confirm Revocation'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
