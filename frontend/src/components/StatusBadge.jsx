import React from 'react';
import { CheckCircle2, Clock, XCircle, Send, AlertTriangle, ShieldCheck } from 'lucide-react';

export const PaymentStatusBadge = ({ status }) => {
  switch (status) {
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          APPROVED
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          REJECTED
        </span>
      );
    case 'PENDING':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          PENDING
        </span>
      );
  }
};

export const TicketStatusBadge = ({ status, isScanned }) => {
  if (isScanned || status === 'SCANNED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs">
        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
        SCANNED
      </span>
    );
  }

  switch (status) {
    case 'ISSUED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
          ISSUED
        </span>
      );
    case 'REVOKED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          REVOKED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
          NO TICKET
        </span>
      );
  }
};

export const DeliveryStatusBadge = ({ status }) => {
  switch (status) {
    case 'SENT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 shadow-xs">
          <Send className="w-3.5 h-3.5 text-teal-600" />
          SENT
        </span>
      );
    case 'NOT_SENT':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
          NOT SENT
        </span>
      );
  }
};
