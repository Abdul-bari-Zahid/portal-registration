import React, { useState } from 'react';
import { Modal } from './Modal';
import { AlertTriangle, XCircle } from 'lucide-react';

export const RejectModal = ({ isOpen, onClose, registration, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Please provide a specific rejection reason (minimum 3 characters).');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onConfirm(registration._id, reason.trim());
      setReason('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reject registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reject Registration Payment"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <p>
            Rejecting this payment will prevent a QR ticket from being generated.
            The attendee will be flagged as rejected with the reason specified below.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Attendee: <span className="text-slate-900 font-bold">{registration?.fullName}</span> (
            <span className="font-mono text-indigo-600">{registration?.registrationId}</span>)
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason for Rejection <span className="text-rose-600">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Transaction reference not found on bank statement, or invalid screenshot uploaded."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
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
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-sm shadow-rose-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
