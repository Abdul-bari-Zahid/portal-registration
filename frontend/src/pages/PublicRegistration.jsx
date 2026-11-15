import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Building2,
  Phone,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  CreditCard,
  X,
} from 'lucide-react';
import api from '../services/api';
import { PublicNavbar } from '../components/Navbar';
import { useToast } from '../context/ToastContext';

export const PublicRegistration = () => {
  const { toastSuccess, toastError } = useToast();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Metadata from backend config
  const [departments, setDepartments] = useState([
    'BS',
    'CS',
    'BBA',
    'A&C',
  ]);
  const [maxSizeMb, setMaxSizeMb] = useState(5);

  // UI status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submissionSuccess, setSubmissionSuccess] = useState(null);

  const fileInputRef = useRef(null);

  // Fetch public config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/config/public');
        if (res.data?.data) {
          if (res.data.data.departments) setDepartments(res.data.data.departments);
          if (res.data.data.uploadMaxSizeMb) setMaxSizeMb(res.data.data.uploadMaxSizeMb);
        }
      } catch (err) {
        console.warn('Could not load dynamic public config, using default departments.');
      }
    };
    fetchConfig();
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type.toLowerCase())) {
      setFieldErrors((prev) => ({
        ...prev,
        file: 'Allowed formats: JPG, JPEG, PNG, or WEBP only.',
      }));
      return;
    }

    // Check size limit
    if (selectedFile.size > maxSizeMb * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        file: `File size exceeds ${maxSizeMb}MB limit.`,
      }));
      return;
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.file;
      return next;
    });

    setFile(selectedFile);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend validation
    const errors = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }
    if (!department) {
      errors.department = 'Please select your department.';
    }
    const phoneRegex = /^[0-9+()\-\s]{7,20}$/;
    if (!phoneNumber.trim() || !phoneRegex.test(phoneNumber.trim())) {
      errors.phoneNumber = 'Please enter a valid phone number (7-20 digits).';
    }
    if (!file) {
      errors.file = 'Payment screenshot proof is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toastError('Please correct the highlighted form errors.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFieldErrors({});
      setUploadProgress(10);

      const formData = new FormData();
      formData.append('fullName', fullName.trim());
      formData.append('email', email.trim());
      formData.append('department', department);
      formData.append('phoneNumber', phoneNumber.trim());
      formData.append('paymentProof', file);

      const response = await api.post('/registrations', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        },
      });

      if (response.data.success) {
        setSubmissionSuccess(response.data.data);
        toastSuccess('Registration submitted successfully!');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed.';
      toastError(msg);
      if (err.response?.data?.errors) {
        const serverErrors = {};
        err.response.data.errors.forEach((e) => {
          serverErrors[e.field] = e.message;
        });
        setFieldErrors(serverErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      <PublicNavbar />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10">
        {submissionSuccess ? (
          /* SUCCESS CONFIRMATION STATE */
          <div className="max-w-2xl mx-auto my-12 p-8 sm:p-10 rounded-3xl bg-white border border-emerald-300 shadow-xl text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase font-mono tracking-widest text-emerald-700 font-bold">
                REGISTRATION SUBMISSION CONFIRMED
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Submission Received!
              </h2>
            </div>

            {/* MANDATORY TEXT DISPLAYED EXACTLY AS SPECIFIED */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm sm:text-base text-emerald-950 font-medium">
              "Your registration has been submitted successfully. Your payment is pending verification by the administrator."
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-sans">Registration ID:</span>
                <span className="text-indigo-600 font-bold">{submissionSuccess.registrationId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-sans">Attendee Name:</span>
                <span className="text-slate-900 font-sans font-semibold">{submissionSuccess.fullName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-sans">Registered Email:</span>
                <span className="text-slate-700">{submissionSuccess.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Department:</span>
                <span className="text-slate-700 font-sans">{submissionSuccess.department}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3 text-left">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>What happens next?</strong> The event committee will manually verify your payment screenshot.
                Once verified, an official digital QR ticket will be issued and manually delivered to your registered email address.
              </p>
            </div>

            <button
              onClick={() => {
                setSubmissionSuccess(null);
                setFullName('');
                setEmail('');
                setDepartment('');
                setPhoneNumber('');
                removeFile();
              }}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200 shadow-xs"
            >
              Submit Another Registration
            </button>
          </div>
        ) : (
          /* REGISTRATION FORM STATE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Column: Event Details & Guidance */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <img
                    src="/uraan-logo.png"
                    alt="Uraan Logo"
                    className="w-20 h-20 rounded-full object-contain shadow-md border-2 border-amber-300 p-1 bg-white shrink-0"
                  />
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-1">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      Trip 2026 Registration
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                      Uraan Trip 2026
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      Official Student Seat Reservation
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs text-slate-700">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Enter your full name, email, and active phone number.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Select your academic department: <strong>BS, CS, BBA, A&C</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Upload a clear screenshot of your payment transfer or deposit receipt.</span>
                  </div>
                </div>

                {/* Important notice */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Manual Verification:</strong> All submitted registrations and payment slips are reviewed manually by trip organizers. Your digital QR ticket will be issued upon approval.
                  </p>
                </div>

                {/* Security Guarantee Box */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-3">
                  <Shield className="w-5 h-5 text-indigo-600 shrink-0" />
                  <p className="text-xs text-slate-600">
                    Your personal information and payment proofs are securely stored and verified privately by organizers.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Registration Form */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl">
                <div className="border-b border-slate-200 pb-4 mb-6">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Attendee Registration Form
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Fill out all required details accurately.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Field 1: Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (fieldErrors.fullName) {
                            setFieldErrors((prev) => ({ ...prev, fullName: null }));
                          }
                        }}
                        placeholder="e.g. Dr. Jane Smith"
                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all ${
                          fieldErrors.fullName
                            ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                            : 'border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                        }`}
                        required
                      />
                    </div>
                    {fieldErrors.fullName && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Field 2: Email Address */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (fieldErrors.email) {
                            setFieldErrors((prev) => ({ ...prev, email: null }));
                          }
                        }}
                        placeholder="name@university.edu or name@company.com"
                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all ${
                          fieldErrors.email
                            ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                            : 'border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                        }`}
                        required
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Field 3: Department (configurable dropdown) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Department / Organization <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={department}
                        onChange={(e) => {
                          setDepartment(e.target.value);
                          if (fieldErrors.department) {
                            setFieldErrors((prev) => ({ ...prev, department: null }));
                          }
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all appearance-none cursor-pointer ${
                          fieldErrors.department
                            ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                            : 'border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                        }`}
                        required
                      >
                        <option value="" disabled>
                          Select your department...
                        </option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept} className="bg-white text-slate-900">
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                    {fieldErrors.department && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.department}
                      </p>
                    )}
                  </div>

                  {/* Field 4: Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Phone Number <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          if (fieldErrors.phoneNumber) {
                            setFieldErrors((prev) => ({ ...prev, phoneNumber: null }));
                          }
                        }}
                        placeholder="+1 (555) 000-0000 or +91 9876543210"
                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all ${
                          fieldErrors.phoneNumber
                            ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                            : 'border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                        }`}
                        required
                      />
                    </div>
                    {fieldErrors.phoneNumber && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.phoneNumber}
                      </p>
                    )}
                  </div>

                  {/* Field 5: Payment Screenshot Upload */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Payment Screenshot Proof <span className="text-rose-600">*</span>
                    </label>

                    {!file ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const droppedFile = e.dataTransfer.files?.[0];
                          validateAndSetFile(droppedFile);
                        }}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-slate-50 ${
                          fieldErrors.file
                            ? 'border-rose-300 bg-rose-50/50'
                            : 'border-slate-300 bg-slate-50/60 hover:border-indigo-500'
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <UploadCloud className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-700">
                          Click to upload or drag & drop payment screenshot
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 font-mono">
                          PNG, JPG, JPEG, WEBP up to {maxSizeMb}MB
                        </p>
                      </div>
                    ) : (
                      /* Preview Box */
                      <div className="relative rounded-2xl border border-slate-300 bg-slate-50 p-3 flex items-center gap-4">
                        {previewUrl && (
                          <img
                            src={previewUrl}
                            alt="Screenshot Preview"
                            className="w-16 h-16 object-cover rounded-xl border border-slate-200 bg-white"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type}
                          </p>
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold mt-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ready for upload
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={removeFile}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200 transition-colors"
                          aria-label="Remove uploaded image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {fieldErrors.file && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.file}
                      </p>
                    )}
                  </div>

                  {/* Upload Progress Bar */}
                  {isSubmitting && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono text-slate-500">
                        <span>Uploading verification proof...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-600 to-sky-500 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Submitting Registration...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Registration</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-500 text-center">
                    By submitting, you agree to our event conduct guidelines and verification policies.
                  </p>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
