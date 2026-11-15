import React, { useRef, useState } from 'react';
import {
  Download,
  Printer,
  Copy,
  Send,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  AlertCircle,
  QrCode as QrIcon,
  Loader2,
} from 'lucide-react';
import { DeliveryStatusBadge, TicketStatusBadge } from './StatusBadge';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const TicketCard = ({
  ticket,
  registration,
  qrDataUrl,
  onMarkAsSent,
  showActions = true,
}) => {
  const { toastSuccess, toastError } = useToast();
  const ticketRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!ticket || !registration) return null;

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(registration.email);
      toastSuccess(`Email copied to clipboard: ${registration.email}`);
    } catch (_) {
      toastError('Failed to copy email to clipboard.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdfClient = async () => {
    setIsDownloading(true);
    try {
      // 1. Download official vector A4 PDF from backend (fits all mobile screens & printers)
      const targetId = ticket._id || ticket.ticketId;
      const res = await api.get(`/tickets/${targetId}/download-pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Ticket-${ticket.ticketId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toastSuccess('Official PDF Ticket downloaded successfully!');
      return;
    } catch (apiErr) {
      console.warn('Backend PDF endpoint error, falling back to client jsPDF:', apiErr.message);
    }

    // 2. Client-side fallback using standard A4 format (never shrinks or distorts on mobile)
    if (!ticketRef.current) {
      setIsDownloading(false);
      return;
    }

    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4'); // Standard A4: 210mm x 297mm
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 12;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', margin, 20, imgWidth, imgHeight);
      pdf.save(`Ticket-${ticket.ticketId}.pdf`);
      toastSuccess('Ticket PDF downloaded successfully!');
    } catch (err) {
      console.error(err);
      toastError('Failed to generate PDF ticket.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* TICKET CARD WRAPPER */}
      <div
        id="printable-ticket"
        ref={ticketRef}
        className="w-full max-w-3xl mx-auto rounded-3xl overflow-hidden border-2 border-slate-200 bg-white text-slate-900 shadow-xl relative font-sans"
      >
        {/* TOP EVENT HEADER */}
        <div className="px-8 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/uraan-logo.png"
              alt="Uraan Logo"
              className="w-10 h-10 rounded-full object-contain shadow-xs border border-amber-300"
            />
            <div>
              <span className="text-[11px] font-mono tracking-widest text-indigo-600 uppercase font-bold">
                OFFICIAL ENTRY PASS
              </span>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                Uraan Trip 2026
              </h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Calendar className="w-3 h-3 text-amber-600" /> Event Date: 11/22/2026
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TicketStatusBadge
              status={ticket.ticketStatus}
              isScanned={ticket.isScanned}
            />
            <DeliveryStatusBadge status={ticket.deliveryStatus} />
          </div>
        </div>

        {/* MAIN BODY: 2-COLUMN TICKET (LEFT INFO, RIGHT QR) */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white">
          {/* LEFT SECTION (Attendee & IDs) */}
          <div className="md:col-span-8 space-y-5">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold block mb-0.5">
                ATTENDEE NAME
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {registration.fullName}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">
                  REGISTRATION ID
                </span>
                <span className="text-sm font-bold text-sky-700 font-mono">
                  {registration.registrationId}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">
                  TICKET ID
                </span>
                <span className="text-sm font-bold text-indigo-700 font-mono">
                  {ticket.ticketId}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-indigo-600" /> Department
                </span>
                <p className="font-semibold text-slate-800 truncate mt-0.5">
                  {registration.department}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                  <Phone className="w-3 h-3 text-indigo-600" /> Phone
                </span>
                <p className="font-mono text-slate-800 font-medium mt-0.5">
                  {registration.phoneNumber}
                </p>
              </div>

              <div className="col-span-2">
                <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                  <Mail className="w-3 h-3 text-indigo-600" /> Email
                </span>
                <p className="font-mono text-slate-800 font-medium truncate mt-0.5">
                  {registration.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Payment Status:</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                VERIFIED & APPROVED
              </span>
            </div>

            {/* ADMISSION GUIDELINES (3 LINES REQUIRED BY ORGANIZER) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-slate-500 block">
                Admission Guidelines:
              </span>
              <div className="space-y-1 text-xs text-slate-700">
                <div className="flex items-start gap-1.5 leading-snug">
                  <span className="font-bold text-indigo-600 shrink-0">1.</span>
                  <span>This ticket is strictly valid for ONE-TIME entry scan only.</span>
                </div>
                <div className="flex items-start gap-1.5 leading-snug">
                  <span className="font-bold text-indigo-600 shrink-0">2.</span>
                  <span>Do not share or forward your ticket or QR code to anyone.</span>
                </div>
                <div className="flex items-start gap-1.5 leading-snug">
                  <span className="font-bold text-indigo-600 shrink-0">3.</span>
                  <span>Please present your valid student ID card along with this pass at the gate.</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION (QR Code Box) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-200 relative">
            <div className="bg-white p-3 rounded-xl shadow-md border border-slate-200 flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Secure Ticket QR Code"
                  className="w-40 h-40 object-contain"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center bg-slate-100 text-slate-400 font-mono text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            <span className="mt-3 text-xs font-black tracking-wider text-indigo-600 uppercase">
              SCAN FOR ENTRY
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Opaque Secure Token
            </span>
          </div>
        </div>

        {/* BOTTOM SECTION */}
        <div className="px-8 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-800">
              One ticket / One entry
            </span>
            <span>• Non-transferable admission</span>
          </div>

          <div className="font-mono text-slate-500 text-[10px]">
            Issued: {ticket.issuedAt ? new Date(ticket.issuedAt).toUTCString() : 'N/A'}
          </div>
        </div>
      </div>

      {/* ADMIN ACTION TOOLBAR */}
      {showActions && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownloadPdfClient}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-600/20 transition-all"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isDownloading ? 'Generating PDF...' : 'Download PDF Ticket'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-all shadow-xs"
          >
            <Printer className="w-4 h-4" />
            Print Ticket
          </button>

          <button
            type="button"
            onClick={handleCopyEmail}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-all shadow-xs"
          >
            <Copy className="w-4 h-4" />
            Copy User Email
          </button>

          {ticket.deliveryStatus !== 'SENT' && (
            <button
              type="button"
              onClick={() => onMarkAsSent && onMarkAsSent(ticket._id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all shadow-xs"
            >
              <Send className="w-4 h-4" />
              Mark as Sent
            </button>
          )}
        </div>
      )}
    </div>
  );
};
