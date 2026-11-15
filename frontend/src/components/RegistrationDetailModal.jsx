import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { PaymentStatusBadge, TicketStatusBadge } from './StatusBadge';
import api from '../services/api';
import {
  Calendar,
  Mail,
  Phone,
  Building2,
  FileCheck2,
  CheckCircle,
  XCircle,
  Eye,
  Maximize2,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const RegistrationDetailModal = ({
  isOpen,
  onClose,
  registration,
  onApprove,
  onOpenRejectModal,
  onViewTicket,
}) => {
  const [isFullscreenImage, setIsFullscreenImage] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!registration || !isOpen) return;

    setImageError(false);

    // 1. Direct Base64 check (instant, works offline and on all devices without CORS)
    if (registration.paymentScreenshotBase64) {
      setImageSrc(registration.paymentScreenshotBase64);
      setIsLoadingImage(false);
      return;
    }

    let isMounted = true;
    let objectUrl = null;
    setIsLoadingImage(true);

    const targetId = registration._id || registration.registrationId;

    // 2. Fetch full registration document to get stored base64 proof
    api
      .get(`/registrations/${targetId}`)
      .then((res) => {
        if (!isMounted) return;
        const reg = res.data?.data?.registration;
        if (reg?.paymentScreenshotBase64) {
          setImageSrc(reg.paymentScreenshotBase64);
          setIsLoadingImage(false);
          return;
        }

        // 3. Fallback: stream binary image blob with Bearer authorization
        return api
          .get(`/registrations/${targetId}/payment-proof`, {
            responseType: 'blob',
          })
          .then((blobRes) => {
            if (isMounted && blobRes?.data) {
              objectUrl = URL.createObjectURL(blobRes.data);
              setImageSrc(objectUrl);
              setIsLoadingImage(false);
            }
          });
      })
      .catch((err) => {
        console.warn('Image fetch fallback to direct token URL:', err.message);
        if (isMounted) {
          // 4. Ultimate fallback: Direct URL with token query param
          const backendBase = import.meta.env.VITE_API_URL || 'https://portal-registration-bk.vercel.app/api';
          const token = localStorage.getItem('adminToken');
          const fallbackUrl = `${backendBase}/registrations/${targetId}/payment-proof${token ? `?token=${encodeURIComponent(token)}` : ''}`;
          setImageSrc(fallbackUrl);
          setIsLoadingImage(false);
        }
      });

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [registration, isOpen]);

  if (!registration) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Registration Details — ${registration.registrationId}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          {/* Top Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-mono text-indigo-600 font-semibold tracking-wider block">
                REGISTRATION ID
              </span>
              <span className="text-lg font-extrabold text-slate-900 font-mono">
                {registration.registrationId}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">
                  Payment Status
                </span>
                <PaymentStatusBadge status={registration.paymentStatus} />
              </div>
              {registration.ticket && (
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">
                    Ticket Status
                  </span>
                  <TicketStatusBadge
                    status={registration.ticket.ticketStatus}
                    isScanned={registration.ticket.isScanned}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Grid Layout: Left Info, Right Screenshot Proof */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Attendee Details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
                Attendee Information
              </h4>

              <div className="space-y-3">
                <div>
                  <span className="text-xs text-slate-500">Full Name</span>
                  <p className="text-sm font-semibold text-slate-900">
                    {registration.fullName}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" /> Email Address
                  </span>
                  <p className="text-sm font-mono text-slate-800">
                    {registration.email}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Department
                  </span>
                  <p className="text-sm text-slate-800">
                    {registration.department}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" /> Phone Number
                  </span>
                  <p className="text-sm font-mono text-slate-800">
                    {registration.phoneNumber}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Submission Date
                  </span>
                  <p className="text-xs text-slate-700">
                    {new Date(registration.createdAt).toLocaleString()}
                  </p>
                </div>

                {registration.paymentApprovedAt && (
                  <div>
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Approved On
                    </span>
                    <p className="text-xs text-slate-700">
                      {new Date(registration.paymentApprovedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {registration.paymentRejectedAt && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                    <span className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Rejection Reason
                    </span>
                    <p className="text-xs text-slate-700 mt-1">
                      {registration.rejectionReason || 'No reason specified'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Payment Screenshot Verification */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Payment Screenshot Proof
                </h4>
                <button
                  type="button"
                  onClick={() => setIsFullscreenImage(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Expand
                </button>
              </div>

              <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-[4/3] flex items-center justify-center">
                {isLoadingImage ? (
                  <div className="flex flex-col items-center justify-center p-6 text-slate-400 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className="text-xs font-medium text-slate-500">Loading proof screenshot...</span>
                  </div>
                ) : imageError || !imageSrc ? (
                  <div className="text-center p-4">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">
                      Unable to load private payment proof file.
                    </p>
                  </div>
                ) : (
                  <>
                    <img
                      src={imageSrc}
                      alt="Payment Verification Proof"
                      className="w-full h-full object-contain cursor-pointer transition-transform group-hover:scale-105"
                      onClick={() => setIsFullscreenImage(true)}
                      onError={() => setImageError(true)}
                    />
                    <div
                      onClick={() => setIsFullscreenImage(true)}
                      className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                      <span className="px-3 py-1.5 rounded-lg bg-white/95 text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-lg border border-slate-200">
                        <Eye className="w-4 h-4 text-indigo-600" /> Click to View Full Size
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Protected server storage. Unauthenticated direct URLs are denied.</span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200">
            {registration.paymentStatus === 'PENDING' && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenRejectModal(registration)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-2 shadow-xs"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Payment
                </button>
                <button
                  type="button"
                  onClick={() => onApprove(registration._id)}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Payment & Generate Ticket
                </button>
              </>
            )}

            {registration.paymentStatus === 'APPROVED' && registration.ticket && (
              <button
                type="button"
                onClick={() => onViewTicket && onViewTicket(registration.ticket._id)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
              >
                <FileCheck2 className="w-4 h-4" />
                View & Distribute QR Ticket
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Fullscreen Image Lightbox */}
      {isFullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setIsFullscreenImage(false)}
        >
          <div className="max-w-5xl max-h-[90vh] relative">
            <img
              src={imageSrc}
              alt="Full Size Payment Proof"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl border border-slate-700 bg-white"
            />
            <p className="text-center text-xs text-slate-300 mt-2 font-mono">
              Press anywhere or ESC to close
            </p>
          </div>
        </div>
      )}
    </>
  );
};
