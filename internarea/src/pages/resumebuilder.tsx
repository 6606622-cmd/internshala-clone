
import React, { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "@/firebase/firebase";
import "@fontsource/inter/400.css";
import "@fontsource/roboto/400.css";
import "@fontsource/lato/400.css";
import "@fontsource/open-sans/400.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/poppins/400.css";
import "@fontsource/merriweather/400.css";
import "@fontsource/source-sans-3/400.css";
import { useLanguage } from "../../context/LanguageContext";
import { onAuthStateChanged } from "firebase/auth";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || "https://internshala-clone-a0st.onrender.com"}/api/resume`;

type ResumeForm = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  objective: string;
  education: string;
  skills: string;
  experience: string;
  internships: string;
  projects: string;
  certifications: string;
  achievements: string;
  languages: string;
  socialLinks: string;
  references: string;
  profilePhoto: string;
};

type ResumeRecord = {
  _id: string;
  title: string;
  resumeData: ResumeForm;
  templateId: string;
  themeColor: string;
  fontFamily: string;
  status: string;
  versionNumber: number;
  resumeGroupId?: string;
  updatedAt?: string;
  isDefault?: boolean;
  paymentStatus?: string;
  pdfUrl?: string;
  pdfFileName?: string;
  invoiceNumber?: string;
};

type PaymentRecord = {
  id?: string;
  _id?: string;
  resumeId?: string;
  resumeName?: string;
  amount: number;
  currency?: string;
  status: string;
  invoiceNumber?: string;
  razorpayPaymentId?: string;
  paidAt?: string;
  createdAt?: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: any) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
    };
  }
}

const initialForm: ResumeForm = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  objective: "",
  education: "",
  skills: "",
  experience: "",
  internships: "",
  projects: "",
  certifications: "",
  achievements: "",
  languages: "",
  socialLinks: "",
  references: "",
  profilePhoto: "",
};

const validateResume = (form: ResumeForm, t: any): string[] => {
  const errors: string[] = [];

  const requiredFields: {
    key: keyof ResumeForm;
    label: string;
    translationKey: string;
  }[] = [
      { key: "fullName", label: t.fullName, translationKey: "fullNameRequired" },
      { key: "email", label: t.emailAddress, translationKey: "emailRequired" },
      { key: "phone", label: t.phoneNumber, translationKey: "phoneRequired" },
      { key: "education", label: t.education, translationKey: "educationRequired" },
      { key: "skills", label: t.skills, translationKey: "skillsRequired" },
    ];

  for (const field of requiredFields) {
    if (!String(form[field.key] || "").trim()) {
      errors.push(t[field.translationKey] || `${field.label} ${t.isRequired || "is required"}.`);
    }
  }

  const email = form.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(t.enterValidEmailAddress || "Enter a valid email address.");
  }

  const phone = form.phone.trim();
  if (phone && !/^[+()\d\s-]{7,20}$/.test(phone)) {
    errors.push(t.enterValidContactNumber || "Enter a valid contact number.");
  }

  return errors;
};

const fields: {
  key: keyof ResumeForm;
  labelKey: string;
  placeholderKey: string;
}[] = [
    { key: "fullName", labelKey: "fullName", placeholderKey: "yourFullName" },
    { key: "email", labelKey: "emailAddress", placeholderKey: "emailPlaceholder" },
    { key: "phone", labelKey: "phoneNumber", placeholderKey: "yourContactNumber" },
    { key: "location", labelKey: "location", placeholderKey: "cityState" },
    { key: "objective", labelKey: "careerObjective", placeholderKey: "yourCareerGoal" },
    { key: "education", labelKey: "education", placeholderKey: "degreeCollegeYearGrades" },
    { key: "skills", labelKey: "skills", placeholderKey: "skillsPlaceholder" },
    { key: "experience", labelKey: "workExperience", placeholderKey: "workExperiencePlaceholder" },
    { key: "internships", labelKey: "internships", placeholderKey: "internshipsPlaceholder" },
    { key: "projects", labelKey: "projects", placeholderKey: "projectsPlaceholder" },
    { key: "certifications", labelKey: "certifications", placeholderKey: "certificationsPlaceholder" },
    { key: "achievements", labelKey: "achievements", placeholderKey: "achievementsPlaceholder" },
    { key: "languages", labelKey: "languages", placeholderKey: "languagesPlaceholder" },
    { key: "socialLinks", labelKey: "socialLinks", placeholderKey: "socialLinksPlaceholder" },
    { key: "references", labelKey: "references", placeholderKey: "referencesPlaceholder" },
  ];

const longFields: (keyof ResumeForm)[] = [
  "objective",
  "education",
  "skills",
  "experience",
  "internships",
  "projects",
  "certifications",
  "achievements",
  "languages",
  "socialLinks",
  "references",
];

export default function ResumeBuilder() {
  const [form, setForm] = useState<ResumeForm>(initialForm);
  const [title, setTitle] = useState("My Resume");
  const [templateId, setTemplateId] = useState("classic");
  const [themeColor, setThemeColor] = useState("#2563eb");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessageState] = useState("");
  const [openedResumeTitle, setOpenedResumeTitle] = useState<string | null>(null);

  const setMessage = (value: string) => {
    setOpenedResumeTitle(null);
    setMessageState(value);
  };
  const [photoError, setPhotoError] = useState("");
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerifiedResumeId, setOtpVerifiedResumeId] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showResumePreview, setShowResumePreview] = useState(false);

  const { t, language } = useLanguage();

  // Use the existing language files. English is the fallback if a key is missing.
  const tr = (key: string, fallback = key): string => {
    const value = (t as Record<string, unknown>)[key];
    return typeof value === "string" && value.trim() ? value : fallback;
  };

  const dateLocale: Record<string, string> = {
    en: "en-US",
    es: "es-ES",
    hi: "hi-IN",
    pt: "pt-BR",
    zh: "zh-CN",
    fr: "fr-FR",
  };

  const formatDate = (date?: string) => {
    if (!date) return tr("notAvailable", "Not available");

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return tr("notAvailable", "Not available");
    }

    return new Intl.DateTimeFormat(dateLocale[language] || "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
  };

  const statusLabel = (status?: string) => {
    const normalized = (status || "").toLowerCase();

    const statusKeys: Record<string, string> = {
      draft: "statusDraft",
      generated: "statusGenerated",
      paid: "statusPaid",
      pending: "statusPending",
      failed: "statusFailed",
      cancelled: "statusCancelled",
      completed: "statusCompleted",
      unpaid: "statusUnpaid",
    };

    return statusKeys[normalized]
      ? tr(statusKeys[normalized], status || "")
      : status || tr("notAvailable", "Not available");
  };

  const templateLabel = (id: string) => {
    const keys: Record<string, string> = {
      classic: "classicTemplate",
      professional: "professionalTemplate",
      modern: "modernTemplate",
      minimal: "minimalTemplate",
      corporate: "corporateTemplate",
      elegant: "elegantTemplate",
      creative: "creativeTemplate",
      compact: "compactTemplate",
      executive: "executiveTemplate",
      student: "studentTemplate",
      technical: "technicalTemplate",
    };

    return tr(keys[id] || id, id);
  };

  const updateField = (key: keyof ResumeForm, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const getToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error(tr("pleaseSignInFirst", "Please sign in first."));
    return user.getIdToken();
  };

  const apiRequest = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = await getToken();
      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("API error:", response.status, result);
        throw new Error(
          result.message ||
          result.error ||
          `Request failed with status ${response.status}`
        );
      }
      return result;
    },
    []
  );

  const loadResumes = useCallback(async () => {
    if (!auth.currentUser) {
      setResumes([]);
      return;
    }

    setLoading(true);
    try {
      const result = await apiRequest("/");
      setResumes(Array.isArray(result.resumes) ? result.resumes : []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : tr("couldNotLoadSavedResumes", "Could not load saved resumes.")
      );
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  const loadPaymentHistory = useCallback(async () => {
    if (!auth.currentUser) {
      setPayments([]);
      return;
    }

    try {
      const result = await apiRequest("/payments/history");
      setPayments(Array.isArray(result.payments) ? result.payments : []);
    } catch (error) {
      console.error("Payment history load error:", error);
      setPayments([]);
    }
  }, [apiRequest]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Firebase authentication is ready.
        // Load both sections automatically.
        void loadResumes();
        void loadPaymentHistory();
      } else {
        // Clear previous user's data when signed out.
        setResumes([]);
        setPayments([]);
        setSelectedResumeId("");
      }
    });

    return () => unsubscribe();
  }, [loadResumes, loadPaymentHistory]);

  useEffect(() => {
    if (openedResumeTitle !== null) {
      setMessageState(
        `${tr("openedResumeForEditing", "Opened resume for editing.")} ${openedResumeTitle}`
      );
    }
  }, [language, openedResumeTitle]);

  const resetOtpState = () => {
    setOtp("");
    setOtpSent(false);
    setOtpVerifiedResumeId("");
  };

  const openResume = (resume: ResumeRecord) => {
    if (resume.status !== "draft") {
      setMessage(tr("onlyDraftsEditable", "Only draft resumes can currently be edited."));
      return;
    }

    setSelectedResumeId(resume._id);
    setTitle(resume.title || "My Resume");
    setForm({ ...initialForm, ...(resume.resumeData || {}) });
    setTemplateId(resume.templateId || "classic");
    setThemeColor(resume.themeColor || "#2563eb");
    setFontFamily(resume.fontFamily || "Arial");
    setPhotoError("");
    resetOtpState();
    setOpenedResumeTitle(resume.title || "");
    setMessageState(
      `${tr("openedResumeForEditing", "Opened resume for editing.")} ${resume.title || ""}`
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startNewResume = () => {
    setSelectedResumeId("");
    setForm({ ...initialForm });
    setTitle("My Resume");
    setTemplateId("classic");
    setThemeColor("#2563eb");
    setFontFamily("Arial");
    setPhotoError("");
    resetOtpState();
    setMessage(tr("newResumeDraftStarted", "New resume draft started."));
  };

  const uploadPhoto = (file?: File) => {
    setPhotoError("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError(tr("chooseImageFile", "Please choose an image file."));
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }

    if (file.size > 1024 * 1024) {
      setPhotoError(
        tr("imageSmallerThanOneMb", "Please choose an image smaller than 1 MB.")
      );
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateField("profilePhoto", reader.result);
      }
    };

    reader.onerror = () => {
      setPhotoError(tr("couldNotReadImage", "Could not read this image."));
      if (photoInputRef.current) photoInputRef.current.value = "";
    };

    reader.readAsDataURL(file);
  };

  const saveDraft = async () => {
    setMessage("");

    const validationErrors = validateResume(form, t);

    if (validationErrors.length > 0) {
      setMessage(validationErrors.join(" "));
      return;
    }

    if (!auth.currentUser) {
      setMessage(tr("signInBeforeSaving", "Please sign in before saving your resume."));
      return;
    }

    setSaving(true);
    const editingExisting = Boolean(selectedResumeId);

    try {
      const payload = {
        title,
        resumeData: form,
        templateId,
        themeColor,
        fontFamily,
      };

      const result = await apiRequest(
        selectedResumeId ? `/${selectedResumeId}` : "/",
        {
          method: selectedResumeId ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      const savedId = result.resume?._id || selectedResumeId;
      if (savedId) setSelectedResumeId(savedId);

      resetOtpState();
      await loadResumes();

      setMessage(
        editingExisting
          ? tr(
            "resumeChangesSaved",
            "Resume changes saved successfully! Verify your email again before payment."
          )
          : tr("resumeDraftSaved", "Resume draft saved successfully!")
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : tr("couldNotSaveResume", "Could not save resume.")
      );
    } finally {
      setSaving(false);
    }
  };

  const createVersion = async () => {
    if (!selectedResumeId) {
      setMessage(
        tr("saveResumeBeforeVersion", "Save your resume first before creating a version.")
      );
      return;
    }

    setCreatingVersion(true);
    setMessage("");

    try {
      const result = await apiRequest(`/${selectedResumeId}/version`, {
        method: "POST",
      });

      if (!result.resume?._id) {
        throw new Error(
          tr("newVersionNotReturned", "The new version was not returned by the server.")
        );
      }

      const version: ResumeRecord = result.resume;
      setSelectedResumeId(version._id);
      setTitle(version.title || "My Resume");
      setForm({ ...initialForm, ...(version.resumeData || {}) });
      setTemplateId(version.templateId || "classic");
      setThemeColor(version.themeColor || "#2563eb");
      setFontFamily(version.fontFamily || "Arial");
      resetOtpState();

      await loadResumes();
      setMessage(
        `${tr("newDraftVersionCreated", "New draft version created.")} ${version.versionNumber}`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : tr("couldNotCreateVersion", "Could not create a new version.")
      );
    } finally {
      setCreatingVersion(false);
    }
  };

  const setDefaultResume = async (resumeId: string) => {
    setMessage("");
    try {
      await apiRequest(`/${resumeId}/default`, { method: "PATCH" });
      await loadResumes();
      setMessage(tr("defaultResumeUpdated", "Default resume updated successfully."));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : tr("couldNotUpdateDefaultResume", "Could not update the default resume.")
      );
    }
  };

  const requestResumeOtp = async () => {
    const validationErrors = validateResume(form, t);

    if (validationErrors.length > 0) {
      setMessage(
        `${tr(
          "completeRequiredFieldsBeforeVerification",
          "Complete the required resume fields before email verification."
        )} ${validationErrors.join(" ")}`
      );
      return;
    }

    if (!selectedResumeId) {
      setMessage(tr("saveDraftFirst", "Save your resume draft first."));
      return;
    }

    setMessage("");
    try {
      await apiRequest("/request-otp", {
        method: "POST",
        body: JSON.stringify({ resumeId: selectedResumeId }),
      });

      setOtp("");
      setOtpSent(true);
      setOtpVerifiedResumeId("");
      setMessage(
        tr("verificationCodeSent", "Verification code sent to your registered email.")
      );
    } catch (error) {
      console.error("Resume OTP request error:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : tr("couldNotSendOtp", "Could not send the OTP. Please try again.")
      );
    }
  };

  const verifyResumeOtp = async () => {
    if (!selectedResumeId || !/^\d{6}$/.test(otp)) {
      setMessage(tr("enterSixDigitOtp", "Enter the six-digit OTP."));
      return;
    }

    try {
      await apiRequest("/verify-otp", {
        method: "POST",
        body: JSON.stringify({ resumeId: selectedResumeId, otp }),
      });

      setOtpVerifiedResumeId(selectedResumeId);
      setMessage(
        tr(
          "emailVerifiedCanPay",
          "Email verified. You can now pay ₹50 to generate this version."
        )
      );
    } catch (error) {
      setOtpVerifiedResumeId("");
      setMessage(
        error instanceof Error
          ? error.message
          : tr("otpVerificationFailed", "OTP verification failed.")
      );
    }
  };

  const downloadResumePdf = async (resumeId: string) => {
    try {
      if (!resumeId) {
        setMessage(
          tr("resumeIdMissing", "Resume ID is missing. Please select a resume.")
        );
        return;
      }

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setMessage(tr("pleaseLoginAgain", "Please log in again."));
        return;
      }

      const response = await fetch(`${API_URL}/${resumeId}/download`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `${tr("downloadFailed", "Download failed.")} (${response.status})`);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error(tr("generatedPdfEmpty", "The generated PDF is empty."));
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "resume.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Resume PDF download error:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : tr("unableToDownloadPdf", "Unable to download resume PDF.")
      );
    }
  };

  const downloadPaymentReceipt = async (paymentId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_URL}/payments/${paymentId}/invoice/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result.message || tr("couldNotDownloadReceipt", "Could not download receipt.")
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payment-receipt-${paymentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Receipt download error:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : tr("couldNotDownloadPaymentReceipt", "Could not download payment receipt.")
      );
    }
  };

  const payAndGenerateResume = async () => {
    const validationErrors = validateResume(form, t);

    if (validationErrors.length > 0) {
      setMessage(
        `${tr(
          "completeFieldsBeforePayment",
          "Complete the required resume fields before payment."
        )} ${validationErrors.join(" ")}`
      );
      return;
    }

    if (!selectedResumeId) {
      setMessage(tr("saveDraftFirst", "Save your draft first."));
      return;
    }

    if (otpVerifiedResumeId !== selectedResumeId) {
      setMessage(
        tr("verifyEmailWithOtp", "Verify your email with OTP before payment.")
      );
      return;
    }

    setPaymentBusy(true);
    setMessage("");

    try {
      const resumeId = selectedResumeId;
      const order = await apiRequest(`/${resumeId}/create-order`, {
        method: "POST",
      });

      if (order.alreadyPaid) {
        await downloadResumePdf(resumeId);
        await loadResumes();
        setMessage(
          tr(
            "alreadyPaidDownloaded",
            "This version is already paid. Downloaded without another charge."
          )
        );
        setPaymentBusy(false);
        return;
      }

      const scriptLoaded = await new Promise<boolean>((resolve) => {
        if (window.Razorpay) {
          resolve(true);
          return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error(
          tr("couldNotLoadRazorpay", "Could not load Razorpay Checkout. Please try again.")
        );
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "Internarea",
        description: "Resume version generation — ₹50",
        prefill: {
          name: form.fullName,
          email: auth.currentUser?.email || form.email,
        },
        handler: async (paymentResponse: any) => {
          try {
            await apiRequest(`/${resumeId}/verify-payment`, {
              method: "POST",
              body: JSON.stringify(paymentResponse),
            });

            await loadResumes();
            await loadPaymentHistory();
            await downloadResumePdf(resumeId);
            setMessage(
              tr(
                "paymentVerifiedPdfReady",
                "Payment verified successfully! Your resume PDF is ready to download."
              )
            );
          } catch (error) {
            setMessage(
              error instanceof Error
                ? `${error.message} ${tr(
                  "paymentDeductedWarning",
                  "If your payment was deducted, do not pay again until the transaction is checked."
                )}`
                : tr(
                  "paymentConfirmationFailed",
                  "Could not confirm payment. Keep your payment ID and contact support if charged."
                )
            );
          } finally {
            setPaymentBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentBusy(false);
            setMessage(tr("paymentCancelled", "Payment was cancelled. No PDF was generated."));
          },
        },
        theme: { color: themeColor },
      });

      checkout.on("payment.failed", (response: any) => {
        setPaymentBusy(false);
        setMessage(
          response?.error?.description ||
          tr("paymentFailedTryAgain", "Payment failed. You can try again.")
        );
      });

      checkout.open();
    } catch (error) {
      setPaymentBusy(false);
      setMessage(
        error instanceof Error
          ? error.message
          : tr("couldNotStartPayment", "Could not start payment.")
      );
    }
  };

  const selectedResume = resumes.find((r) => r._id === selectedResumeId);
  const paidCount = resumes.filter(
    (r) => r.status === "generated" && r.paymentStatus === "paid"
  ).length;
  const draftCount = resumes.filter((r) => r.status === "draft").length;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #dbe3ef",
    borderRadius: 10,
    fontSize: 14,
    background: "#fff",
    color: "#172033",
    outlineColor: "#3b82f6",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontWeight: 650,
    marginBottom: 7,
    fontSize: 13,
    color: "#334155",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "11px 15px",
    border: "1px solid transparent",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    transition: "all .2s ease",
  };

  const primaryButton: React.CSSProperties = {
    ...buttonStyle,
    background: "#2563eb",
    color: "#fff",
    boxShadow: "0 4px 10px #2563eb20",
  };

  const secondaryButton: React.CSSProperties = {
    ...buttonStyle,
    background: "#eff6ff",
    color: "#1d4ed8",
    borderColor: "#dbeafe",
  };

  const templateStyles: Record<string, React.CSSProperties> = {
    classic: { borderTop: `6px solid ${themeColor}` },
    professional: {
      borderTop: `6px solid ${themeColor}`,
      borderLeft: `4px solid ${themeColor}`,
    },
    modern: { borderTop: `8px solid ${themeColor}` },
    minimal: { borderTop: "none", borderLeft: "none" },
    corporate: {
      borderTop: `6px solid ${themeColor}`,
      borderLeft: `12px solid ${themeColor}`,
    },
    elegant: {
      borderTop: `2px solid ${themeColor}`,
      borderBottom: `2px solid ${themeColor}`,
    },
    creative: { borderTop: `10px solid ${themeColor}`, borderRadius: 14 },
    compact: { borderTop: `3px solid ${themeColor}`, padding: 20 },
    executive: { borderTop: `5px double ${themeColor}` },
    student: { borderTop: `6px solid ${themeColor}` },
    technical: { borderTop: `6px solid ${themeColor}`, borderRadius: 4 },
  };

  return (
    <main className="resume-page">
      <style jsx>{`
        .resume-page {
          --blue: #2563eb;
          --navy: #172554;
          --muted: #64748b;
          --border: #e2e8f0;
          max-width: 1440px;
          margin: 0 auto;
          padding: 32px 24px 56px;
          color: #172033;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .hero {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 30px;
          margin-bottom: 24px;
          border-radius: 22px;
          background: linear-gradient(
            120deg,
            #172554 0%,
            #1d4ed8 65%,
            #0f766e 125%
          );
          color: white;
          box-shadow: 0 14px 36px #1e3a8a20;
        }
        .hero:after {
          content: "";
          position: absolute;
          width: 240px;
          height: 240px;
          border: 1px solid #ffffff24;
          border-radius: 50%;
          right: -65px;
          top: -110px;
          box-shadow: 0 0 0 35px #ffffff08, 0 0 0 70px #ffffff06;
          pointer-events: none;
        }
        .eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.7px;
          text-transform: uppercase;
          color: #bfdbfe;
          margin: 0 0 9px;
        }
        .hero h1 {
          position: relative;
          z-index: 2;
          color: #ffffff !important;
          opacity: 1;
          filter: none;
          text-shadow: none;
          font-size: clamp(27px, 4vw, 36px);
          line-height: 1.15;
          letter-spacing: -1px;
          margin: 0;
          font-weight: 800;
        }
        .hero > div:first-child {
          position: relative;
          z-index: 2;
        }
        .hero p {
          color: #ffffff !important;
          opacity: 1;
          filter: none;
        }
        .hero-badge {
          position: relative;
          z-index: 1;
          flex-shrink: 0;
          padding: 12px 16px;
          border: 1px solid #ffffff40;
          background: #ffffff12;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 750;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }
        .stat {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 19px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 3px 12px #0f172a05;
        }
        .stat-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 21px;
        }
        .stat:nth-child(2) .stat-icon {
          background: #ecfdf5;
          color: #047857;
        }
        .stat:nth-child(3) .stat-icon {
          background: #f5f3ff;
          color: #7c3aed;
        }
        .stat strong {
          display: block;
          font-size: 24px;
          line-height: 1.2;
          letter-spacing: -.5px;
        }
        .stat span {
          color: var(--muted);
          font-size: 12px;
          display: block;
          margin-top: 4px;
        }
        .panel {
          min-width: 0;
          border: 1px solid var(--border);
          border-radius: 17px;
          padding: 23px;
          margin-bottom: 24px;
          background: #fff;
          box-shadow: 0 5px 20px #0f172a06;
        }
        .panel-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 17px;
        }
        .panel-heading h2,
        .section-title {
          color: #172554;
          font-size: 19px;
          letter-spacing: -.35px;
          font-weight: 800;
          margin: 0;
        }
        .panel-subtitle {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
          margin: 7px 0 0;
        }
        .resume-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 245px), 1fr));
          gap: 15px;
        }
        .resume-card {
          position: relative;
          min-width: 0;
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: #fff;
          transition: transform .2s, box-shadow .2s, border-color .2s;
        }
        .resume-card:hover {
          transform: translateY(-2px);
          border-color: #bfdbfe;
          box-shadow: 0 9px 25px #1e40af0d;
        }
        .resume-card.selected {
          background: linear-gradient(145deg, #eff6ff, #fff 80%);
          border-color: #93c5fd;
          box-shadow: inset 0 0 0 1px #dbeafe;
        }
        .resume-card h3 {
          font-size: 15px;
          margin: 0;
          color: #172554;
          overflow-wrap: anywhere;
        }
        .meta {
          color: var(--muted);
          font-size: 12px;
          line-height: 1.65;
          margin: 9px 0;
        }
        .status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 750;
          padding: 5px 9px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          text-transform: capitalize;
        }
        .status.paid,
        .status.generated {
          background: #dcfce7;
          color: #166534;
        }
        .status.draft,
        .status.pending {
          background: #fef3c7;
          color: #92400e;
        }
        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          padding: 17px;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: #fff;
        }
        .history-item + .history-item {
          margin-top: 11px;
        }
        .history-item strong {
          color: #172554;
          font-size: 14px;
        }
        .history-details {
          font-size: 12px;
          line-height: 1.8;
          color: var(--muted);
          overflow-wrap: anywhere;
        }
        .workspace {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }
        .editor-panel {
          padding: 24px;
        }
        .field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .field {
          min-width: 0;
          margin-bottom: 17px;
        }
        .field.full {
          grid-column: 1 / -1;
        }
        .field input:focus,
        .field textarea:focus,
        .field select:focus {
          border-color: #60a5fa !important;
          box-shadow: 0 0 0 3px #dbeafe;
          outline: none;
        }
        .field textarea {
          min-height: 90px;
          resize: vertical;
          line-height: 1.6;
        }
        .photo-box {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 15px;
          margin: 16px 0 22px;
          border: 1px dashed #bfdbfe;
          border-radius: 13px;
          background: #f8fbff;
        }
        .photo-avatar {
          display: grid;
          place-items: center;
          overflow: hidden;
          width: 54px;
          height: 54px;
          flex-shrink: 0;
          border-radius: 15px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 22px;
        }
        .photo-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .photo-box p {
          margin: 0 0 5px;
          font-size: 13px;
          font-weight: 750;
          color: #1e3a8a;
        }
        .photo-box small {
          color: var(--muted);
          font-size: 11px;
          line-height: 1.5;
        }
        .design-box {
          padding: 18px;
          margin-top: 23px;
          border: 1px solid #dbeafe;
          border-radius: 14px;
          background: #f8fbff;
        }
        .design-box h3 {
          font-size: 15px;
          color: #172554;
          margin: 0 0 17px;
        }
        .design-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .color-control {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 45px;
        }
        .color-control input {
          width: 46px;
          height: 40px;
          padding: 3px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: #fff;
          cursor: pointer;
        }
        .actions {
          display: grid;
          gap: 10px;
          margin-top: 22px;
        }
        .verify-box {
          padding: 18px;
          margin-top: 22px;
          border: 1px solid #c7d2fe;
          border-radius: 15px;
          background: linear-gradient(145deg, #eef2ff, #f8fbff);
        }
        .verify-box h3 {
          margin: 0;
          font-size: 16px;
          color: #1e3a8a;
        }
        .verify-box p {
          font-size: 12px;
          line-height: 1.7;
          color: #475569;
        }
        .price-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 13px 0;
          border-top: 1px solid #dbeafe;
          border-bottom: 1px solid #dbeafe;
          margin: 14px 0;
        }
        .price-line strong {
          font-size: 23px;
          color: #172554;
        }
        .price-line span {
          font-size: 11px;
          color: var(--muted);
        }
        .notice {
          padding: 13px 15px;
          margin: 18px 0 0;
          border: 1px solid #bfdbfe;
          border-radius: 11px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 13px;
          line-height: 1.65;
          overflow-wrap: anywhere;
        }
        .notice.error {
          border-color: #fecaca;
          background: #fef2f2;
          color: #b91c1c;
        }
        .notice.success {
          border-color: #bbf7d0;
          background: #f0fdf4;
          color: #166534;
        }
        .preview-panel {
          position: sticky;
          top: 20px;
          background: #f1f5f9;
          border-color: #dbe3ef;
        }
        .preview-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 17px;
        }
        .preview-toolbar h2 {
          margin: 0;
          font-size: 19px;
          color: #172554;
        }
        .preview-paper {
          min-height: 620px;
          padding: 35px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-top: 6px solid var(--resume-color, #2563eb);
          border-radius: 4px;
          box-shadow: 0 12px 30px #0f172a12;
          overflow-wrap: anywhere;
        }
        .preview-paper:after {
          content: "";
          display: block;
          clear: both;
        }
        .preview-paper h1 {
          font-size: 28px;
          line-height: 1.2;
          letter-spacing: -.7px;
          margin: 0 0 10px;
        }
        .preview-contact {
          font-size: 11px;
          line-height: 1.8;
          color: #475569;
          margin: 0 0 25px;
        }
        .preview-section {
          margin-top: 22px;
          clear: both;
        }
        .preview-section h3 {
          font-size: 12px;
          text-transform: none;
          letter-spacing: .7px;
          margin: 0 0 9px;
          padding-bottom: 7px;
          border-bottom: 1px solid #e2e8f0;
        }
        .preview-section p {
          white-space: pre-wrap;
          font-size: 12px;
          line-height: 1.8;
          margin: 0;
          color: #334155;
        }
        .preview-photo {
          width: 78px;
          height: 78px;
          object-fit: cover;
          float: right;
          margin: 0 0 12px 15px;
          border: 3px solid #f1f5f9;
        }
        .preview-footnote {
          margin: 14px 0 0;
          font-size: 11px;
          color: var(--muted);
          line-height: 1.6;
        }
        .empty-state {
          padding: 27px 18px;
          border: 1px dashed #cbd5e1;
          border-radius: 13px;
          background: #f8fafc;
          color: var(--muted);
          text-align: center;
          font-size: 13px;
          line-height: 1.7;
        }
        .empty-icon {
          font-size: 27px;
          margin-bottom: 8px;
        }
        .btn {
          transition: transform .15s, box-shadow .15s, background .15s;
        }
        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 5px 12px #0f172a12;
        }
        .btn:disabled {
          opacity: .55;
          cursor: not-allowed !important;
        }
        @media (max-width: 900px) {
          .workspace {
            grid-template-columns: minmax(0, 1fr);
          }
          .preview-panel {
            position: static;
          }
          .preview-paper {
            min-height: 480px;
          }
        }
        @media (max-width: 600px) {
          .resume-page {
            padding: 17px 12px 35px;
          }
          .hero {
            padding: 23px 19px;
            border-radius: 17px;
          }
          .hero-badge {
            display: none;
          }
          .stats {
            gap: 8px;
          }
          .stat {
            padding: 12px 9px;
            display: block;
          }
          .stat-icon {
            width: 35px;
            height: 35px;
            font-size: 17px;
            margin-bottom: 9px;
          }
          .stat strong {
            font-size: 21px;
          }
          .stat span {
            font-size: 11px;
          }
          .panel,
          .editor-panel {
            padding: 17px;
            border-radius: 14px;
          }
          .field-grid,
          .design-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 0;
          }
          .field.full {
            grid-column: auto;
          }
          .photo-box {
            align-items: flex-start;
          }
          .preview-paper {
            padding: 23px 18px;
            min-height: 400px;
          }
          .preview-paper h1 {
            font-size: 23px;
          }
          .history-item {
            align-items: flex-start;
          }
        }
        .resume-page {
          color: #172033;
        }
        .resume-page input,
        .resume-page textarea,
        .resume-page select {
          color: #172033 !important;
          background-color: #ffffff !important;
        }
        .resume-page input::placeholder,
        .resume-page textarea::placeholder {
          color: #64748b !important;
          opacity: 1;
        }
        .resume-page label,
        .resume-page h1,
        .resume-page h2,
        .resume-page h3,
        .resume-page strong {
          color: #172554;
        }
        .resume-page button {
          opacity: 1;
        }
        .resume-page button:disabled {
          opacity: 0.65;
        }
      `}</style>

      <header className="hero">
        <div>
          <p className="eyebrow">{tr("resumeHeroEyebrow", "INTERNAREA · CAREER TOOLS")}</p>
          <h1>{tr("resumeHeroTitle", "Build a resume that opens new doors.")}</h1>
          <p>{tr("resumeHeroDescription", "Create your professional resume, customize the design, preview every detail, and generate a downloadable PDF when you're ready.")}</p>
        </div>
        <div className="hero-badge">✦ {tr("resumeHeroBadge", "Your next opportunity starts here")}</div>
      </header>

      <div className="stats">
        <div className="stat">
          <div className="stat-icon">▤</div>
          <div>
            <strong>{resumes.length}</strong>
            <span>{tr("totalResumes", "Total resumes")}</span>
          </div>
        </div>
        <div className="stat">
          <div className="stat-icon">✎</div>
          <div>
            <strong>{draftCount}</strong>
            <span>{tr("draftsInProgress", "Drafts in progress")}</span>
          </div>
        </div>
        <div className="stat">
          <div className="stat-icon">✓</div>
          <div>
            <strong>{paidCount}</strong>
            <span>{tr("readyToDownload", "Ready to download")}</span>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{tr("mySavedResumes", "My saved resumes")}</h2>
            <p className="panel-subtitle">
              {tr("manageResumesDescription", "Manage drafts, versions, and completed resumes.")}
            </p>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => void loadResumes()}
            disabled={loading}
            style={secondaryButton}
          >
            {loading ? tr("loading", "Loading...") : `↻ ${tr("refresh", "Refresh")}`}
          </button>
        </div>

        {loading && (
          <p className="panel-subtitle">
            {tr("loadingYourResumes", "Loading your resumes...")}
          </p>
        )}

        {!loading && resumes.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">▤</div>
            <strong>{tr("noResumesYet", "No resumes yet")}</strong>
            <br />
            {tr("createFirstResume", "Create your first draft using the editor below. Your saved resumes will appear here.")}
          </div>
        )}

        {resumes.length > 0 && (
          <div className="resume-grid">
            {resumes.map((resume) => (
              <article
                key={resume._id}
                className={`resume-card ${selectedResumeId === resume._id ? "selected" : ""}`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                  <h3>{resume.title || "My Resume"}</h3>
                  <span className={`status ${resume.status.toLowerCase()}`}>
                    {statusLabel(resume.status)}
                  </span>
                </div>

                <p className="meta">
                  {tr("version", "Version")} {resume.versionNumber || 1}
                  {resume.updatedAt && (
                    <>
                      <br />
                      {tr("updated", "Updated")}: {formatDate(resume.updatedAt)}
                    </>
                  )}
                </p>

                {resume.paymentStatus && (
                  <p className="meta">
                    {tr("paymentLabel", "Payment")}:{" "}
                    <span className={`status ${resume.paymentStatus.toLowerCase()}`}>
                      {statusLabel(resume.paymentStatus)}
                    </span>
                  </p>
                )}

                <button
                  type="button"
                  className="btn"
                  onClick={() => openResume(resume)}
                  disabled={resume.status !== "draft"}
                  style={{
                    ...buttonStyle,
                    width: "100%",
                    background: resume.status === "draft" ? "#2563eb" : "#e2e8f0",
                    color: resume.status === "draft" ? "#fff" : "#64748b",
                  }}
                >
                  {resume.status === "draft"
                    ? `✎ ${tr("openEditDraft", "Open / Edit Draft")}`
                    : tr("notEditableYet", "Not editable yet")}
                </button>

                {resume.status === "generated" && resume.paymentStatus === "paid" && (
                  <>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => void downloadResumePdf(resume._id)}
                      style={{ ...buttonStyle, width: "100%", marginTop: 9, background: "#0f766e", color: "#fff" }}
                    >
                      ↓ {tr("downloadPdfFree", "Download PDF — Free")}
                    </button>

                    <button
                      type="button"
                      className="btn"
                      disabled={Boolean(resume.isDefault)}
                      onClick={() => void setDefaultResume(resume._id)}
                      style={{
                        ...buttonStyle,
                        width: "100%",
                        marginTop: 9,
                        background: resume.isDefault ? "#dcfce7" : "#eff6ff",
                        color: resume.isDefault ? "#166534" : "#1d4ed8",
                        borderColor: resume.isDefault ? "#bbf7d0" : "#dbeafe",
                      }}
                    >
                      {resume.isDefault
                        ? `✓ ${tr("defaultResume", "Default Resume")}`
                        : `☆ ${tr("setAsDefault", "Set as Default")}`}
                    </button>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{tr("paymentHistoryReceipts", "Payment history & receipts")}</h2>
            <p className="panel-subtitle">
              {tr("reviewTransactions", "Review transactions and download your payment receipts.")}
            </p>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => void loadPaymentHistory()}
            style={secondaryButton}
          >
            ↻ {tr("refreshPayments", "Refresh payments")}
          </button>
        </div>

        {payments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">₹</div>
            {tr("noPaymentRecords", "No payment records found. Completed resume payments will appear here.")}
          </div>
        ) : (
          payments.map((payment) => (
            <div
              key={payment.id || payment._id || payment.razorpayPaymentId}
              className="history-item"
            >
              <div>
                <strong>{payment.resumeName || tr("resumePaymentLabel", "Resume payment")}</strong>
                <div className="history-details">
                  {tr("amount", "Amount")}: ₹{(payment.amount / 100).toFixed(2)}
                  <br />
                  {tr("receipt", "Receipt")}: {payment.invoiceNumber || tr("notAssigned", "Not assigned")}
                  <br />
                  {tr("date", "Date")}: {formatDate(payment.paidAt || payment.createdAt)}
                </div>
                <span className={`status ${payment.status.toLowerCase()}`}>
                  {payment.status.toLowerCase() === "paid" ? "✓ " : ""}
                  {statusLabel(payment.status)}
                </span>
              </div>

              {payment.status.toLowerCase() === "paid" && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const id = payment.id || payment._id;
                    if (id) void downloadPaymentReceipt(id);
                    else setMessage(tr("paymentRecordIdMissing", "Payment record ID is missing. Refresh payment history."));
                  }}
                  style={{ ...buttonStyle, background: "#0f766e", color: "#fff" }}
                >
                  ↓ {tr("downloadInvoice", "Download receipt")}
                </button>
              )}
            </div>
          ))
        )}
      </section>

      <div className="workspace">
        <section className="panel editor-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow" style={{ color: "#2563eb", marginBottom: 6 }}>
                {tr("stepOneYourDetails", "STEP 1 · YOUR DETAILS")}
              </p>
              <h2 className="section-title">
                {selectedResumeId
                  ? tr("editYourDraft", "Edit your draft")
                  : tr("createYourResume", "Create your resume")}
              </h2>
              <p className="panel-subtitle">
                {tr("fillDetailsPreview", "Fill in your details. Your preview updates automatically.")}
              </p>
            </div>

            {selectedResumeId && (
              <button
                type="button"
                className="btn"
                onClick={startNewResume}
                style={secondaryButton}
              >
                + {tr("newResume", "New resume")}
              </button>
            )}
          </div>

          <div className="field">
            <label style={labelStyle}>{tr("resumeTitle", "Resume Title")}</label>
            <input
              style={inputStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tr("resumeTitlePlaceholder", "My Resume")}
            />
          </div>

          <div className="photo-box">
            <div className="photo-avatar">
              {form.profilePhoto ? (
                <img src={form.profilePhoto} alt={tr("profilePhoto", "Profile Photo")} />
              ) : (
                "♙"
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p>
                {tr("profilePhotoOptional", "Profile photo (optional)")}
              </p>
              <small>
                {tr("chooseImageOneMb", "Choose an image up to 1 MB. Your photo appears in the live preview.")}
              </small>
              <div style={{ marginTop: 9 }}>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadPhoto(file);
                  }}
                  style={{ maxWidth: "100%", fontSize: 12 }}
                />
              </div>

              {photoError && (
                <p style={{ color: "#dc2626", marginTop: 7 }}>{photoError}</p>
              )}

              {form.profilePhoto && (
                <button
                  type="button"
                  onClick={() => {
                    updateField("profilePhoto", "");
                    setPhotoError("");
                    if (photoInputRef.current) {
                      photoInputRef.current.value = "";
                    }
                  }}
                  style={{
                    marginTop: 7,
                    background: "none",
                    border: 0,
                    color: "#dc2626",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {tr("removePhoto", "Remove photo")}
                </button>
              )}
            </div>
          </div>

          <div className="field-grid">
            {fields.map(({ key, labelKey, placeholderKey }) => (
              <div
                key={key}
                className={`field ${longFields.includes(key) ? "full" : ""}`}
              >
                <label style={labelStyle}>
                  {tr(labelKey, labelKey)}
                  {["fullName", "email"].includes(key) && (
                    <span style={{ color: "#dc2626" }}> *</span>
                  )}
                </label>

                {longFields.includes(key) ? (
                  <textarea
                    style={{
                      ...inputStyle,
                      minHeight: key === "objective" ? 95 : 82,
                    }}
                    value={form[key]}
                    onChange={(e) => updateField(key, e.target.value)}
                    placeholder={tr(placeholderKey, placeholderKey)}
                  />
                ) : (
                  <input
                    style={inputStyle}
                    value={form[key]}
                    onChange={(e) => updateField(key, e.target.value)}
                    placeholder={tr(placeholderKey, placeholderKey)}
                    type={key === "email" ? "email" : "text"}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="design-box">
            <p className="eyebrow" style={{ color: "#2563eb", marginBottom: 6 }}>
              {tr("stepTwoPersonalize", "STEP 2 · PERSONALIZE")}
            </p>
            <h3>{tr("makeItYours", "Make it yours")}</h3>

            <div className="design-grid">
              <div className="field">
                <label style={labelStyle}>{tr("resumeTemplate", "Resume template")}</label>
                <select
                  style={inputStyle}
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  {Object.keys(templateStyles).map((id) => (
                    <option key={id} value={id}>{templateLabel(id)}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label style={labelStyle}>{tr("fontFamily", "Font family")}</label>
                <select
                  style={inputStyle}
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  <option value="Arial">Arial</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Inter">{tr("modernFont", "Inter — Modern")}</option>
                  <option value="Roboto">{tr("professionalFont", "Roboto — Professional")}</option>
                  <option value="Lato">{tr("polishedFont", "Lato — Polished")}</option>
                  <option value="Open Sans">{tr("simpleFont", "Open Sans — Simple")}</option>
                  <option value="Montserrat">{tr("boldFont", "Montserrat — Bold")}</option>
                  <option value="Poppins">{tr("contemporaryFont", "Poppins — Contemporary")}</option>
                  <option value="Merriweather">{tr("formalFont", "Merriweather — Formal")}</option>
                  <option value="Source Sans 3">{tr("compactFont", "Source Sans 3 — Compact")}</option>
                </select>
              </div>

              <div className="field full" style={{ marginBottom: 0 }}>
                <label style={labelStyle}>{tr("accentColor", "Accent color")}</label>
                <div className="color-control">
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                  />
                  <div>
                    <strong style={{ fontSize: 13 }}>{themeColor.toUpperCase()}</strong>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {tr("usedForHeadings", "Used for headings and page accents")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="actions">
            <button
              type="button"
              className="btn"
              onClick={() => void saveDraft()}
              disabled={saving}
              style={{ ...primaryButton, padding: 14 }}
            >
              {saving
                ? tr("savingResume", "Saving your resume...")
                : selectedResumeId
                  ? `✓ ${tr("saveChangesButton", "Save changes")}`
                  : `▣ ${tr("saveResumeDraft", "Save resume draft")}`}
            </button>

            {selectedResumeId && (
              <button
                type="button"
                className="btn"
                onClick={() => void createVersion()}
                disabled={creatingVersion}
                style={{ ...secondaryButton, padding: 13 }}
              >
                {creatingVersion
                  ? tr("creatingVersion", "Creating version...")
                  : `＋ ${tr("createNewVersion", "Create a new version")}`}
              </button>
            )}
          </div>

          {selectedResumeId && (
            <div className="verify-box">
              <p className="eyebrow" style={{ color: "#4f46e5", marginBottom: 7 }}>
                {tr("stepThreeGeneratePdf", "STEP 3 · GENERATE YOUR PDF")}
              </p>
              <h3>{tr("emailVerificationPdf", "Email verification & PDF generation")}</h3>
              <p>
                {tr("verifyEmailBeforePayment", "Verify your email before paying. Each version costs ₹50 once; subsequent downloads of a paid version are free.")}
              </p>

              <div className="price-line">
                <div>
                  <strong>₹50</strong>
                  <br />
                  <span>{tr("perResumeVersion", "Per resume version")}</span>
                </div>
                <span>🔒 {tr("secureCheckout", "Secure checkout")}</span>
              </div>

              <button
                type="button"
                className="btn"
                onClick={() => void requestResumeOtp()}
                disabled={paymentBusy}
                style={{ ...secondaryButton, width: "100%" }}
              >
                {otpSent
                  ? `↻ ${tr("resendEmailOtp", "Resend email OTP")}`
                  : `✉ ${tr("sendEmailVerification", "Send email verification code")}`}
              </button>

              {otpSent && (
                <div style={{ marginTop: 15 }}>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>
                      {tr("sixDigitVerificationCode", "Six-digit verification code")}
                    </label>
                    <input
                      style={inputStyle}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder={tr("enterEmailOtp", "Enter the code sent to your email")}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void verifyResumeOtp()}
                    style={{ ...secondaryButton, width: "100%" }}
                  >
                    ✓ {tr("verifyEmail", "Verify email")}
                  </button>
                </div>
              )}

              {selectedResume?.paymentStatus === "paid" ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => void downloadResumePdf(selectedResumeId)}
                  style={{
                    ...buttonStyle,
                    width: "100%",
                    marginTop: 13,
                    padding: 14,
                    background: "#0f766e",
                    color: "#fff",
                  }}
                >
                  ↓ {tr("downloadPaidPdfFree", "Download paid PDF — Free")}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  onClick={() => void payAndGenerateResume()}
                  disabled={paymentBusy || otpVerifiedResumeId !== selectedResumeId}
                  style={{
                    ...buttonStyle,
                    width: "100%",
                    marginTop: 13,
                    padding: 14,
                    background:
                      paymentBusy || otpVerifiedResumeId !== selectedResumeId
                        ? "#94a3b8"
                        : "#0f766e",
                    color: "#fff",
                  }}
                >
                  {paymentBusy
                    ? tr("processingPayment", "Processing payment...")
                    : otpVerifiedResumeId !== selectedResumeId
                      ? tr("verifyEmailToContinue", "Verify email to continue")
                      : `₹ ${tr("payAndGeneratePdf", "Pay ₹50 & generate PDF")}`}
                </button>
              )}

              <p style={{ fontSize: 11, marginBottom: 0 }}>
                {tr("paymentVerificationInfo", "Your payment is being verified securely by the server. Your PDF will be available after verification succeeds.")}
              </p>
            </div>
          )}

          {message && (
            <p
              role="status"
              aria-live="polite"
              className={`notice ${/successfully|created|opened|verified|ready|downloaded|sent to your registered email/i.test(message)
                  ? "success"
                  : /error|failed|could not|unable|missing|please|cancelled|not editable|enter the/i.test(message)
                    ? "error"
                    : ""
                }`}
            >
              {message}
            </p>
          )}
        </section>

        <section className="panel preview-panel">
          <div className="preview-toolbar">
            <div>
              <p className="eyebrow" style={{ color: "#2563eb", marginBottom: 6 }}>
                {tr("liveDesign", "LIVE DESIGN")}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!form.fullName.trim() || !form.email.trim()) {
                    setMessage(
                      tr("enterNameEmailBeforePreview", "Enter your full name and email before previewing.")
                    );
                    return;
                  }
                  setShowResumePreview(true);
                }}
                style={{
                  ...buttonStyle,
                  width: "100%",
                  padding: 13,
                  marginTop: 12,
                  marginBottom: 12,
                  background: "#7c3aed",
                  color: "#fff",
                }}
              >
                {tr("fullResumePreview", "Preview Resume")}
              </button>
              <h2>{tr("resumePreview", "Resume Preview")}</h2>
            </div>
            <span className="status generated">● {tr("live", "Live")}</span>
          </div>

          <article
            className="preview-paper"
            style={{
              fontFamily: `"${fontFamily}", sans-serif`,
              "--resume-color": themeColor,
              ...templateStyles[templateId],
            } as React.CSSProperties}
          >
            {form.profilePhoto && (
              <img
                src={form.profilePhoto}
                alt={tr("profilePhoto", "Profile")}
                className="preview-photo"
                style={{
                  width: 85,
                  height: 85,
                  objectFit: "cover",
                  borderRadius: templateId === "modern" ? "50%" : 8,
                  float: "right",
                  marginLeft: 16,
                }}
              />
            )}

            <h1 style={{ color: themeColor }}>
              {form.fullName || tr("yourFullNamePreview", "Your Full Name")}
            </h1>
            <p className="preview-contact">
              {[form.email, form.phone, form.location].filter(Boolean).join("  •  ") ||
                tr("contactDetailsPlaceholder", "Email • Phone • Location")}
            </p>

            {fields
              .filter(({ key }) => !["fullName", "email", "phone", "location"].includes(key))
              .map(({ key, labelKey }) => (
                <div key={key} className="preview-section">
                  <h3
                    style={{
                      color: themeColor,
                      textTransform:
                        templateId === "modern" ||
                          templateId === "corporate" ||
                          templateId === "technical"
                          ? "uppercase"
                          : "none",
                    }}
                  >
                    {tr(labelKey, labelKey)}
                  </h3>
                  <p>{form[key]?.trim() || tr("notProvided", "Not provided")}</p>
                </div>
              ))}
          </article>

          <p className="preview-footnote">
            {tr("livePreviewDescription", "This is a live on-screen preview. The final PDF is generated by your existing backend after payment verification.")}
          </p>
        </section>
      </div>

      {showResumePreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="full-resume-preview-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#eef2f7",
            overflowY: "auto",
            padding: 20,
          }}
        >
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 20,
              }}
            >
              <h2 id="full-resume-preview-title">
                {tr("fullResumePreview", "Preview Resume")}
              </h2>
            </div>

            <article
              style={{
                background: "#fff",
                color: "#111827",
                padding: "48px 42px",
                minHeight: 1000,
                ...templateStyles[templateId],
                fontFamily: `"${fontFamily}", sans-serif`,
                boxShadow: "0 4px 20px #00000015",
                overflowWrap: "anywhere",
                boxSizing: "border-box",
              }}
            >
              {form.profilePhoto && (
                <img
                  src={form.profilePhoto}
                  alt={tr("profilePhoto", "Profile")}
                  style={{
                    width: 100,
                    height: 100,
                    objectFit: "cover",
                    borderRadius: templateId === "modern" ? "50%" : 8,
                    float: "right",
                    marginLeft: 20,
                    marginBottom: 12,
                  }}
                />
              )}

              <h1
                style={{
                  color: themeColor,
                  fontSize: 30,
                  marginTop: 0,
                  overflowWrap: "anywhere",
                }}
              >
                {form.fullName || tr("yourFullNamePreview", "Your Full Name")}
              </h1>

              <p style={{ color: "#4b5563", lineHeight: 1.7 }}>
                {[form.email, form.phone, form.location].filter(Boolean).join(" | ")}
              </p>

              {fields
                .filter(({ key }) => !["fullName", "email", "phone", "location"].includes(key))
                .map(({ key, labelKey }) => (
                  <section
                    key={key}
                    style={{
                      marginTop: 24,
                      clear: key === "objective" ? "both" : undefined,
                      breakInside: "avoid",
                    }}
                  >
                    <h3
                      style={{
                        color: themeColor,
                        borderBottom: `1px solid ${themeColor}`,
                        paddingBottom: 7,
                        fontSize: 16,
                        textTransform: templateId === "modern" ? "uppercase" : "none",
                      }}
                    >
                      {tr(labelKey, labelKey)}
                    </h3>

                    <p
                      style={{
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        lineHeight: 1.8,
                        fontSize: 14,
                        margin: 0,
                      }}
                    >
                      {form[key] ||
                        `${tr("addYour", "Add your")} ${tr(labelKey, labelKey).toLowerCase()} ${tr("here", "here.")}`}
                    </p>
                  </section>
                ))}

              <div style={{ clear: "both" }} />
            </article>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                margin: "20px 0",
              }}
            >
              <button
                type="button"
                onClick={() => setShowResumePreview(false)}
                style={{
                  ...buttonStyle,
                  background: "#374151",
                  color: "#fff",
                }}
              >
                {tr("backToEditor", "Back to Editor")}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowResumePreview(false);

                  if (!selectedResumeId) {
                    setMessage(
                      tr("saveDraftBeforePayment", "Save your resume draft first, then verify your email and pay ₹50.")
                    );
                    document.querySelector(".editor-panel")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                    return;
                  }

                  document.querySelector(".verify-box")?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }}
                style={{
                  ...buttonStyle,
                  background: "#0f766e",
                  color: "#fff",
                }}
              >
                {tr("continueToPayment", "Continue to Payment")}
              </button>
            </div>

            <p style={{ color: "#4b5563", fontSize: 13 }}>
              {tr("reviewBeforePayment", "Review all sections before paying. This preview does not generate or download a PDF. The final PDF layout may differ slightly.")}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
