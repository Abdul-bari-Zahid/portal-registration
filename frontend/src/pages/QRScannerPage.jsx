import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  ScanLine,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Volume2,
  VolumeX,
  Keyboard,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export const QRScannerPage = () => {
  const { toastError } = useToast();

  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Scan Result State
  const [lastScanResult, setLastScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Manual input fallback state
  const [manualToken, setManualToken] = useState('');

  const scannerRef = useRef(null);
  const scanInProgressRef = useRef(false);

  // Sound generator helper (Web Audio API)
  const playBeep = (type = 'success') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1174, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.setValueAtTime(160, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch (_) {}
  };

  // Discover available cameras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn('Camera discovery error or permissions not granted yet:', err);
      });

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async (cameraIdToUse = selectedCameraId) => {
    if (!cameraIdToUse) {
      toastError('No camera device selected. Please select a camera or enter token manually.');
      return;
    }

    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        cameraIdToUse,
        config,
        (decodedText) => {
          handleScannedPayload(decodedText);
        },
        (errorMessage) => {
          // ignore non-detection frames
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Failed to start QR scanner:', err);
      toastError('Camera access failed or blocked. Ensure camera permissions are granted.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  // Process decoded QR text with backend atomic endpoint
  const handleScannedPayload = async (payloadText) => {
    if (scanInProgressRef.current) return;
    scanInProgressRef.current = true;
    setIsProcessing(true);

    try {
      const response = await api.post('/scanner/verify', { token: payloadText });

      if (response.data.status === 'SUCCESS') {
        playBeep('success');
        setLastScanResult({
          type: 'SUCCESS',
          message: 'ENTRY SUCCESSFUL',
          data: response.data.data,
        });
      }
    } catch (err) {
      playBeep('error');
      const errRes = err.response?.data;
      if (errRes?.status === 'ALREADY_SCANNED') {
        setLastScanResult({
          type: 'ALREADY_SCANNED',
          message: 'ALREADY SCANNED',
          description: errRes.description || 'This QR code has already been used.',
          data: errRes.data,
        });
      } else if (errRes?.status === 'REVOKED') {
        setLastScanResult({
          type: 'REVOKED',
          message: 'TICKET NOT VALID',
          description: errRes.description || 'Ticket has been revoked.',
          data: errRes.data,
        });
      } else {
        setLastScanResult({
          type: 'INVALID',
          message: errRes?.message || 'INVALID QR CODE',
          description: 'This QR code is not recognized as a valid issued ticket pass.',
        });
      }
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        scanInProgressRef.current = false;
      }, 2500);
    }
  };

  // Handle manual token submission
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleScannedPayload(manualToken.trim());
    setManualToken('');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-emerald-600" />
            Gate Entry QR Scanner
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            High-speed camera scanner with backend atomic duplicate prevention.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all ${
              soundEnabled
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-400'
            }`}
            title={soundEnabled ? 'Audio alerts enabled' : 'Audio muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Chime On' : 'Muted'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Camera Viewport & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden">
            {/* Camera Selection Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex-1 min-w-[180px]">
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  disabled={isScanning}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600 disabled:opacity-50"
                >
                  {cameras.length === 0 ? (
                    <option value="">No cameras detected</option>
                  ) : (
                    cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Camera ${c.id.substring(0, 8)}...`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {!isScanning ? (
                <button
                  type="button"
                  onClick={() => startScanner(selectedCameraId)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopScanner}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Stop Camera</span>
                </button>
              )}
            </div>

            {/* Viewport Box */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 aspect-square sm:aspect-[4/3] flex items-center justify-center">
              <div
                id="qr-reader"
                className="w-full h-full flex items-center justify-center"
              />

              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/90 backdrop-blur-xs text-white">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-lg">
                    <Camera className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Camera Standby</h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-xs">
                    Select a camera device above and click "Start Camera" to begin scanning attendee tickets.
                  </p>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center z-20 text-white">
                  <div className="w-8 h-8 border-2 border-indigo-400 border-t-white rounded-full animate-spin mb-2" />
                  <span className="text-xs font-mono text-indigo-200 font-semibold">
                    Verifying admission token atomically...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Manual Token Entry Fallback */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-700">
              <Keyboard className="w-4 h-4 text-indigo-600" />
              <span>Manual Token / Backup Barcode Entry</span>
            </div>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste or type raw ticket token or hash..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 font-mono"
              />
              <button
                type="submit"
                disabled={!manualToken.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-xs"
              >
                Verify
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Live Scan Telemetry Result (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Scan Verification Result
          </h3>

          {!lastScanResult ? (
            <div className="p-8 rounded-3xl border border-slate-200 bg-white text-center space-y-3 shadow-xs">
              <ScanLine className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
              <h4 className="text-sm font-bold text-slate-700">Ready to Scan</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Point the camera at an attendee's digital or printed QR ticket. Verification status will appear here instantly.
              </p>
            </div>
          ) : lastScanResult.type === 'SUCCESS' ? (
            /* GREEN SUCCESS INDICATOR (ENTRY SUCCESSFUL) */
            <div className="p-6 rounded-3xl border-2 border-emerald-400 bg-emerald-50/70 shadow-lg shadow-emerald-500/10 space-y-5 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-mono tracking-widest text-emerald-800 uppercase font-black">
                    GATE ENTRY GRANTED
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    ENTRY SUCCESSFUL
                  </h3>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-emerald-200 space-y-3 font-mono text-xs shadow-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-sans">User Name</span>
                  <span className="text-base font-bold text-slate-900 font-sans">
                    {lastScanResult.data?.userName}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Reg ID</span>
                    <span className="text-sky-700 font-bold">
                      {lastScanResult.data?.registrationId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Ticket ID</span>
                    <span className="text-indigo-700 font-bold">
                      {lastScanResult.data?.ticketId}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase block font-sans">Department</span>
                  <span className="text-slate-800 font-sans font-medium">
                    {lastScanResult.data?.department}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase">Entry Timestamp</span>
                  <span className="text-emerald-700 font-bold">
                    {new Date(lastScanResult.data?.entryTime).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-emerald-800 font-semibold text-center">
                ✅ Admitted. Status updated atomically to SCANNED.
              </div>
            </div>
          ) : lastScanResult.type === 'ALREADY_SCANNED' ? (
            /* WARNING INDICATOR: ALREADY SCANNED */
            <div className="p-6 rounded-3xl border-2 border-amber-400 bg-amber-50/70 shadow-lg shadow-amber-500/10 space-y-5 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shadow-xs">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-mono tracking-widest text-amber-800 uppercase font-black">
                    DUPLICATE SCAN DETECTED
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    ALREADY SCANNED
                  </h3>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-amber-200 space-y-3 font-mono text-xs shadow-xs">
                <p className="text-sm font-semibold text-amber-900 font-sans">
                  "{lastScanResult.description}"
                </p>

                {lastScanResult.data && (
                  <>
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-500 uppercase block font-sans">Attendee Name</span>
                      <span className="text-sm font-bold text-slate-900 font-sans">
                        {lastScanResult.data.userName}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">Ticket ID</span>
                        <span className="text-indigo-700 font-bold">
                          {lastScanResult.data.ticketId}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">Reg ID</span>
                        <span className="text-sky-700 font-bold">
                          {lastScanResult.data.registrationId}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 uppercase">Original Entry Time</span>
                      <span className="text-amber-800 font-bold">
                        {lastScanResult.data.originalEntryTime
                          ? new Date(lastScanResult.data.originalEntryTime).toLocaleString()
                          : 'Previous scan'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-[11px] text-amber-800 font-semibold text-center">
                ⛔ Entry Rejected. Ticket has already been used once.
              </div>
            </div>
          ) : (
            /* INVALID OR REVOKED TICKET */
            <div className="p-6 rounded-3xl border-2 border-rose-400 bg-rose-50/70 shadow-lg shadow-rose-500/10 space-y-5 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shadow-xs">
                  <XCircle className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-mono tracking-widest text-rose-800 uppercase font-black">
                    ACCESS DENIED
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {lastScanResult.message}
                  </h3>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-rose-200 space-y-2 text-xs shadow-xs">
                <p className="text-slate-700">
                  {lastScanResult.description}
                </p>
                {lastScanResult.data?.revokedAt && (
                  <p className="font-mono text-slate-500 text-[11px]">
                    Revocation logged at: {new Date(lastScanResult.data.revokedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="text-[11px] text-rose-700 font-semibold text-center">
                🚫 Do not admit attendee. Invalid or revoked pass.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
