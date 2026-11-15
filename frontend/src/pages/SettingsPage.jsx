import React from 'react';
import { Shield, Lock, Server, Database, Key, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage = () => {
  const { admin } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          System Security & Configuration
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-mono">
          Review administrator credentials state, encryption parameters, and security policies.
        </p>
      </div>

      {/* Admin Profile Card */}
      <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Master Administrator Identity
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              Enforced constraint: Strictly ONE admin account in system
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1">Email Account</span>
            <span className="font-mono text-slate-900 font-bold">{admin?.email}</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1">Assigned Role</span>
            <span className="font-mono text-emerald-700 font-bold">{admin?.role}</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1">Account Initialized On</span>
            <span className="font-mono text-slate-700">
              {admin?.createdAt ? new Date(admin.createdAt).toLocaleString() : 'N/A'}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1">Last Login</span>
            <span className="font-mono text-slate-700">
              {admin?.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : 'Current Session'}
            </span>
          </div>
        </div>
      </div>

      {/* Security Policies Matrix */}
      <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-600" />
          <span>Active Security Mechanisms</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">Atomic One-Time Gate Scanning:</strong>
              <p className="text-slate-600 mt-0.5">
                Enforced by MongoDB atomic conditional <code className="text-indigo-600 font-semibold">findOneAndUpdate</code>.
                Simultaneous scan requests cannot create duplicate admissions.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">Private Storage Stream Protection:</strong>
              <p className="text-slate-600 mt-0.5">
                Payment screenshots are quarantined outside public directories. Accessible only to authenticated admin via streaming verification endpoint.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">Binary Magic Bytes Inspection:</strong>
              <p className="text-slate-600 mt-0.5">
                Every uploaded file is inspected at buffer header level. Scripts or executable binaries disguised with image extensions are automatically rejected and destroyed.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">Opaque QR Tokens & Hash Storage:</strong>
              <p className="text-slate-600 mt-0.5">
                QR codes contain 256-bit cryptographically unpredictable tokens. No personal, phone, or payment data is embedded in the barcode. Only the SHA-256 hash is retained in the database.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
