
import {
  ArrowUpRight,
  Briefcase,
  Clock,
  ExternalLink,
  IndianRupee,
  MapPin,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { useLanguage } from "../../../../context/LanguageContext";
import { auth } from "@/firebase/firebase";

const text = {
  en: {
    activelyHiring: "Actively Hiring",
    postedOn: "Posted on",
    about: "About",
    visitWebsite: "Visit company website",
    aboutJob: "About the Job",
    whoCanApply: "Who Can Apply",
    perks: "Perks",
    additionalInfo: "Additional Information",
    openings: "Number of Openings",
    applyNow: "Apply Now",
    applyTo: "Apply to",
    yourResume: "Your Resume",
    resumeText: "Select the resume to submit with your application",
    selectResume: "Select a resume",
    loadingResumes: "Loading your resumes...",
    noResumes: "No saved resumes with PDFs were found.",
    createResume: "Create or generate a resume",
    previewResume: "Preview selected resume",
    coverLetter: "Cover Letter",
    selectedQuestion: "Why should you be selected for this job?",
    coverPlaceholder: "Enter your cover letter here...",
    availability: "Your Availability",
    availableImmediately: "Yes, I am available to join immediately",
    noticePeriod: "No, I am currently on a notice period",
    serveNotice: "No, I will have to serve notice period",
    other: "Other",
    submit: "Submit Application",
    signup: "Sign up to apply",
    jobNotFound: "Job not found",
    backToJobs: "Back to Jobs",
    coverRequired: "Please write a cover letter",
    availabilityRequired: "Please select your availability",
    resumeRequired: "Please select a resume to submit",
    resumeLoadFailed: "Could not load your resumes.",
    submitted: "Application submitted successfully",
    failed: "Failed to submit application",
  },
  es: {
    activelyHiring: "Contratando activamente",
    postedOn: "Publicado el",
    about: "Acerca de",
    visitWebsite: "Visitar sitio web de la empresa",
    aboutJob: "Acerca del trabajo",
    whoCanApply: "Quién puede postularse",
    perks: "Beneficios",
    additionalInfo: "Información adicional",
    openings: "Número de vacantes",
    applyNow: "Postularse ahora",
    applyTo: "Postularse a",
    yourResume: "Tu currículum",
    resumeText: "Selecciona el currículum que enviarás",
    selectResume: "Selecciona un currículum",
    loadingResumes: "Cargando currículums...",
    noResumes: "No se encontraron currículums con PDF.",
    createResume: "Crear un currículum",
    previewResume: "Vista previa del currículum",
    coverLetter: "Carta de presentación",
    selectedQuestion: "¿Por qué deberías ser seleccionado para este trabajo?",
    coverPlaceholder: "Ingresa tu carta de presentación aquí...",
    availability: "Tu disponibilidad",
    availableImmediately: "Sí, estoy disponible para incorporarme inmediatamente",
    noticePeriod: "No, actualmente estoy en un período de preaviso",
    serveNotice: "No, tendré que cumplir un período de preaviso",
    other: "Otro",
    submit: "Enviar solicitud",
    signup: "Regístrate para postularte",
    jobNotFound: "Trabajo no encontrado",
    backToJobs: "Volver a trabajos",
    coverRequired: "Escribe una carta de presentación",
    availabilityRequired: "Selecciona tu disponibilidad",
    resumeRequired: "Selecciona un currículum",
    resumeLoadFailed: "No se pudieron cargar los currículums.",
    submitted: "Solicitud enviada correctamente",
    failed: "No se pudo enviar la solicitud",
  },
  hi: {
    activelyHiring: "सक्रिय रूप से भर्ती",
    postedOn: "पोस्ट किया गया",
    about: "के बारे में",
    visitWebsite: "कंपनी की वेबसाइट देखें",
    aboutJob: "नौकरी के बारे में",
    whoCanApply: "कौन आवेदन कर सकता है",
    perks: "लाभ",
    additionalInfo: "अतिरिक्त जानकारी",
    openings: "रिक्तियों की संख्या",
    applyNow: "अभी आवेदन करें",
    applyTo: "आवेदन करें",
    yourResume: "आपका रिज्यूमे",
    resumeText: "आवेदन के साथ जमा करने के लिए रिज्यूमे चुनें",
    selectResume: "रिज्यूमे चुनें",
    loadingResumes: "रिज्यूमे लोड हो रहे हैं...",
    noResumes: "PDF वाला कोई सेव किया हुआ रिज्यूमे नहीं मिला।",
    createResume: "रिज्यूमे बनाएँ",
    previewResume: "रिज्यूमे देखें",
    coverLetter: "कवर लेटर",
    selectedQuestion: "इस नौकरी के लिए आपको क्यों चुना जाना चाहिए?",
    coverPlaceholder: "अपना कवर लेटर यहाँ लिखें...",
    availability: "आपकी उपलब्धता",
    availableImmediately: "हाँ, मैं तुरंत जॉइन करने के लिए उपलब्ध हूँ",
    noticePeriod: "नहीं, मैं वर्तमान में नोटिस पीरियड पर हूँ",
    serveNotice: "नहीं, मुझे नोटिस पीरियड पूरा करना होगा",
    other: "अन्य",
    submit: "आवेदन जमा करें",
    signup: "आवेदन करने के लिए साइन अप करें",
    jobNotFound: "नौकरी नहीं मिली",
    backToJobs: "नौकरियों पर वापस जाएँ",
    coverRequired: "कृपया कवर लेटर लिखें",
    availabilityRequired: "कृपया अपनी उपलब्धता चुनें",
    resumeRequired: "कृपया रिज्यूमे चुनें",
    resumeLoadFailed: "रिज्यूमे लोड नहीं हो सके।",
    submitted: "आवेदन सफलतापूर्वक जमा हो गया",
    failed: "आवेदन जमा करने में विफल",
  },
  pt: {
    activelyHiring: "Contratando ativamente",
    postedOn: "Publicado em",
    about: "Sobre",
    visitWebsite: "Visitar site da empresa",
    aboutJob: "Sobre o trabalho",
    whoCanApply: "Quem pode se candidatar",
    perks: "Benefícios",
    additionalInfo: "Informações adicionais",
    openings: "Número de vagas",
    applyNow: "Candidatar-se agora",
    applyTo: "Candidatar-se a",
    yourResume: "Seu currículo",
    resumeText: "Selecione o currículo para enviar com sua candidatura",
    selectResume: "Selecione um currículo",
    loadingResumes: "Carregando currículos...",
    noResumes: "Nenhum currículo com PDF foi encontrado.",
    createResume: "Criar um currículo",
    previewResume: "Visualizar currículo",
    coverLetter: "Carta de apresentação",
    selectedQuestion: "Por que você deve ser selecionado para este trabalho?",
    coverPlaceholder: "Digite sua carta de apresentação aqui...",
    availability: "Sua disponibilidade",
    availableImmediately: "Sim, estou disponível para começar imediatamente",
    noticePeriod: "Não, estou atualmente em período de aviso prévio",
    serveNotice: "Não, terei que cumprir o período de aviso prévio",
    other: "Outro",
    submit: "Enviar candidatura",
    signup: "Cadastre-se para se candidatar",
    jobNotFound: "Trabalho não encontrado",
    backToJobs: "Voltar para trabalhos",
    coverRequired: "Escreva uma carta de apresentação",
    availabilityRequired: "Selecione sua disponibilidade",
    resumeRequired: "Selecione um currículo",
    resumeLoadFailed: "Não foi possível carregar os currículos.",
    submitted: "Candidatura enviada com sucesso",
    failed: "Falha ao enviar candidatura",
  },
  zh: {
    activelyHiring: "正在招聘",
    postedOn: "发布于",
    about: "关于",
    visitWebsite: "访问公司网站",
    aboutJob: "关于职位",
    whoCanApply: "申请条件",
    perks: "福利",
    additionalInfo: "其他信息",
    openings: "招聘人数",
    applyNow: "立即申请",
    applyTo: "申请",
    yourResume: "您的简历",
    resumeText: "请选择随申请提交的简历",
    selectResume: "选择简历",
    loadingResumes: "正在加载简历...",
    noResumes: "未找到带 PDF 的已保存简历。",
    createResume: "创建简历",
    previewResume: "预览简历",
    coverLetter: "求职信",
    selectedQuestion: "为什么应该选择您担任这份工作？",
    coverPlaceholder: "请在此输入您的求职信...",
    availability: "您的可用时间",
    availableImmediately: "是的，我可以立即入职",
    noticePeriod: "不，我目前处于通知期",
    serveNotice: "不，我需要完成通知期",
    other: "其他",
    submit: "提交申请",
    signup: "注册后申请",
    jobNotFound: "未找到职位",
    backToJobs: "返回职位",
    coverRequired: "请输入求职信",
    availabilityRequired: "请选择您的可用时间",
    resumeRequired: "请选择简历",
    resumeLoadFailed: "无法加载简历。",
    submitted: "申请提交成功",
    failed: "提交申请失败",
  },
  fr: {
    activelyHiring: "Recrutement en cours",
    postedOn: "Publié le",
    about: "À propos de",
    visitWebsite: "Visiter le site de l'entreprise",
    aboutJob: "À propos du poste",
    whoCanApply: "Qui peut postuler",
    perks: "Avantages",
    additionalInfo: "Informations supplémentaires",
    openings: "Nombre de postes",
    applyNow: "Postuler maintenant",
    applyTo: "Postuler chez",
    yourResume: "Votre CV",
    resumeText: "Sélectionnez le CV à envoyer avec votre candidature",
    selectResume: "Sélectionner un CV",
    loadingResumes: "Chargement des CV...",
    noResumes: "Aucun CV enregistré avec PDF trouvé.",
    createResume: "Créer un CV",
    previewResume: "Aperçu du CV",
    coverLetter: "Lettre de motivation",
    selectedQuestion: "Pourquoi devriez-vous être sélectionné pour ce poste ?",
    coverPlaceholder: "Entrez votre lettre de motivation ici...",
    availability: "Votre disponibilité",
    availableImmediately: "Oui, je suis disponible pour commencer immédiatement",
    noticePeriod: "Non, je suis actuellement en période de préavis",
    serveNotice: "Non, je devrai effectuer une période de préavis",
    other: "Autre",
    submit: "Envoyer la candidature",
    signup: "Inscrivez-vous pour postuler",
    jobNotFound: "Offre d'emploi introuvable",
    backToJobs: "Retour aux offres",
    coverRequired: "Veuillez rédiger une lettre de motivation",
    availabilityRequired: "Veuillez sélectionner votre disponibilité",
    resumeRequired: "Veuillez sélectionner un CV",
    resumeLoadFailed: "Impossible de charger les CV.",
    submitted: "Candidature envoyée avec succès",
    failed: "Échec de l'envoi de la candidature",
  },
};

type Language = keyof typeof text;

type ResumeRecord = {
  _id: string;
  title: string;
  status: string;
  paymentStatus?: string;
  pdfUrl?: string;
  isDefault?: boolean;
};

const RESUME_API = `${process.env.NEXT_PUBLIC_API_URL}/api/resume`;
const APPLICATION_API =
  "https://internshala-clone-a0st.onrender.com/api/application";

const index = () => {
  const user = useSelector(selectuser);
  const router = useRouter();
  const { id } = router.query;

  const { language } = useLanguage();
  const t = text[language as Language] || text.en;

  const [jobData, setJobData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");

  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [selectedResume, setSelectedResume] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);


  const previewSelectedResume = async () => {
    if (!selectedResume) {
      toast.error(t.resumeRequired);
      return;
    }

    const previewWindow = window.open("about:blank", "_blank");

    if (!previewWindow) {
      toast.error("Please allow pop-ups to preview your resume.");
      return;
    }

    try {
      setPreviewing(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        previewWindow.close();
        toast.error("Please sign in again.");
        return;
      }

      const token = await currentUser.getIdToken();

      const response = await axios.get(
        `${RESUME_API}/${selectedResume}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      const pdfBlob = new Blob([response.data], {
        type: "application/pdf",
      });

      const objectUrl = URL.createObjectURL(pdfBlob);
      previewWindow.location.href = objectUrl;

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 120000);
    } catch (error: any) {
      previewWindow.close();

      console.error("Resume preview failed:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: `${RESUME_API}/${selectedResume}/download`,
      });

      if (error.response?.status === 401) {
        toast.error("Please sign in again.");
      } else if (error.response?.status === 403) {
        toast.error("This resume is not available for preview.");
      } else if (error.response?.status === 404) {
        toast.error("Resume PDF was not found. Please generate it again.");
      } else {
        toast.error("Could not preview resume. Check the browser console.");
      }
    } finally {
      setPreviewing(false);
    }
  };

  // Load job details
  useEffect(() => {
    if (!router.isReady || !id) return;

    const fetchJob = async () => {
      try {
        setLoading(true);

        const response = await axios.get(
          `https://internshala-clone-a0st.onrender.com/api/job/${id}`
        );

        setJobData(response.data);
      } catch (error) {
        console.error("ERROR FETCHING JOB:", error);
        setJobData(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchJob();
  }, [router.isReady, id]);

  // Load resumes when the application modal opens.
  useEffect(() => {
    if (!isModalOpen || !user) return;

    let cancelled = false;

    const loadResumes = async () => {
      try {
        setResumeLoading(true);

        const currentUser = auth.currentUser;

        if (!currentUser) {
          if (!cancelled) {
            setResumes([]);
            setSelectedResume("");
          }
          return;
        }

        const token = await currentUser.getIdToken();

        const response = await axios.get(`${RESUME_API}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const savedResumes: ResumeRecord[] =
          response.data.resumes || [];

        // Only show resumes that have a PDF URL.
        const availableResumes = savedResumes.filter(
          (resume) => Boolean(resume.pdfUrl)
        );

        if (cancelled) return;

        setResumes(availableResumes);

        const defaultResume = availableResumes.find(
          (resume) => resume.isDefault
        );

        setSelectedResume(
          defaultResume?._id || availableResumes[0]?._id || ""
        );
      } catch (error) {
        console.error("Failed to load resumes:", error);

        if (!cancelled) {
          setResumes([]);
          setSelectedResume("");
          toast.error(t.resumeLoadFailed);
        }
      } finally {
        if (!cancelled) setResumeLoading(false);
      }
    };

    void loadResumes();

    return () => {
      cancelled = true;
    };
  }, [isModalOpen, user, t.resumeLoadFailed]);


  const handlesubmitapplication = async () => {
    if (!user) {
      toast.error(t.signup);
      return;
    }

    if (!coverLetter.trim()) {
      toast.error(t.coverRequired);
      return;
    }

    if (!availability) {
      toast.error(t.availabilityRequired);
      return;
    }

    if (
      !selectedResume ||
      !resumes.some((resume) => resume._id === selectedResume)
    ) {
      toast.error(t.resumeRequired);
      return;
    }

    if (!jobData || !id) return;

    try {
      setSubmitting(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        toast.error(t.signup);
        return;
      }

      // Obtain a Firebase ID token for backend verification.
      const token = await currentUser.getIdToken();

      const applicationdata = {
        category: jobData.category,
        company: jobData.company,
        coverLetter: coverLetter.trim(),
        Application: id,
        availability,
        resumeId: selectedResume,
      };

      await axios.post(APPLICATION_API, applicationdata, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success(t.submitted);
      setIsModalOpen(false);
      router.push("/job");
    } catch (error: any) {
      console.error(
        "Failed to submit application:",
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        toast.error("Please sign in again.");
      } else if (error.response?.status === 403) {
        toast.error("You are not allowed to submit this application.");
      } else {
        toast.error(t.failed);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const availabilityOptions = [
    {
      value: "Yes, I am available to join immediately",
      label: t.availableImmediately,
    },
    {
      value: "No, I am currently on a notice period",
      label: t.noticePeriod,
    },
    {
      value: "No, I will have to serve notice period",
      label: t.serveNotice,
    },
    {
      value: "Other",
      label: t.other,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!jobData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {t.jobNotFound}
        </h1>

        <Link
          href="/job"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg"
        >
          {t.backToJobs}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-2 text-blue-600 mb-4">
            <ArrowUpRight className="h-5 w-5" />
            <span className="font-medium">{t.activelyHiring}</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {jobData.title}
          </h1>

          <p className="text-lg text-gray-600 mb-4">
            {jobData.company}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="h-5 w-5" />
              <span>{jobData.location}</span>
            </div>

            <div className="flex items-center space-x-2 text-gray-600">
              <IndianRupee className="h-5 w-5" />
              <span>{jobData.CTC}</span>
            </div>

            <div className="flex items-center space-x-2 text-gray-600">
              <Briefcase className="h-5 w-5" />
              <span>{jobData.category}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center space-x-2">
            <Clock className="h-4 w-4 text-green-500" />
            <span className="text-green-500 text-sm">
              {t.postedOn} {jobData.createdAt}
            </span>
          </div>
        </div>

        {/* Company */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t.about} {jobData.company}
          </h2>

          <div className="flex items-center space-x-2 mb-4">
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <span>{t.visitWebsite}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <p className="text-gray-600">{jobData.aboutCompany}</p>
        </div>

        {/* Job Details */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t.aboutJob}
          </h2>

          <p className="text-gray-600 mb-6">{jobData.aboutJob}</p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t.whoCanApply}
          </h3>

          <p className="text-gray-600 mb-6">
            {jobData.whoCanApply}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t.perks}
          </h3>

          <p className="text-gray-600 mb-6">
            {Array.isArray(jobData.perks)
              ? jobData.perks.join(", ")
              : jobData.perks}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t.additionalInfo}
          </h3>

          <p className="text-gray-600 mb-6">
            {jobData.additionalInfo}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t.openings}
          </h3>

          <p className="text-gray-600">
            {jobData.numberOfOpening}
          </p>
        </div>

        {/* Apply */}
        <div className="p-6 flex justify-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            {t.applyNow}
          </button>
        </div>

        {/* Application Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center gap-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {t.applyTo} {jobData.company}
                  </h2>

                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Close application modal"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Resume selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t.yourResume}
                  </h3>

                  <p className="text-gray-600 mb-3">
                    {t.resumeText}
                  </p>

                  {!user ? (
                    <p className="text-amber-700">
                      Please sign in to load your saved resumes.
                    </p>
                  ) : resumeLoading ? (
                    <p className="text-gray-600">
                      {t.loadingResumes}
                    </p>
                  ) : resumes.length > 0 ? (
                    <>
                      <select
                        value={selectedResume}
                        onChange={(e) =>
                          setSelectedResume(e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
                      >
                        <option value="">{t.selectResume}</option>

                        {resumes.map((resume) => (
                          <option
                            key={resume._id}
                            value={resume._id}
                          >
                            {resume.title}
                            {resume.isDefault ? " (Default)" : ""}
                          </option>
                        ))}
                      </select>

                      {selectedResume &&
                        resumes.some(
                          (resume) => resume._id === selectedResume
                        ) && (
                          <button
                            type="button"
                            onClick={previewSelectedResume}
                            disabled={previewing || resumeLoading || !selectedResume}
                            className="mt-2 inline-block text-blue-600 hover:underline disabled:opacity-50"
                          >
                            {previewing ? "Opening preview..." : "Preview resume"}
                          </button>
                        )}
                      <p className="text-gray-600 mt-2">
                        Your current resume will be submitted with the application.
                      </p>
                    </>
                  ) : (
                    <div className="text-gray-600">
                      <p>{t.noResumes}</p>
                      <Link
                        href="/resumebuilder"
                        className="mt-2 inline-block text-blue-600 hover:underline"
                      >
                        {t.createResume}
                      </Link>
                    </div>
                  )}
                </div>

                {/* Cover letter */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t.coverLetter}
                  </h3>

                  <p className="text-gray-600 mb-2">
                    {t.selectedQuestion}
                  </p>

                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                    placeholder={t.coverPlaceholder}
                  />
                </div>

                {/* Availability */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t.availability}
                  </h3>

                  {availabilityOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center space-x-2 mb-2"
                    >
                      <input
                        type="radio"
                        name="availability"
                        value={option.value}
                        checked={availability === option.value}
                        onChange={(e) =>
                          setAvailability(e.target.value)
                        }
                        className="h-4 w-4 text-blue-600"
                      />

                      <span className="text-gray-700">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                  {user ? (
                    <button
                      onClick={handlesubmitapplication}
                      disabled={
                        submitting ||
                        resumeLoading ||
                        resumes.length === 0 ||
                        !selectedResume
                      }
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? "Submitting..." : t.submit}
                    </button>
                  ) : (
                    <Link
                      href="/"
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                      {t.signup}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default index;
