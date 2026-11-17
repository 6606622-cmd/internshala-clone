import {
  ArrowUpRight,
  Calendar,
  Clock,
  ExternalLink,
  IndianRupee,
  MapPin,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { useLanguage } from "../../../../context/LanguageContext";
import { auth } from "@/firebase/firebase";

const text = {
  en: {
    activelyHiring: "Actively Hiring",
    about: "About",
    visitWebsite: "Visit company website",
    aboutInternship: "About the Internship",
    whoCanApply: "Who can apply",
    perks: "Perks",
    additionalInfo: "Additional Information",
    openings: "Number of Openings",
    applyNow: "Apply Now",
    applyTo: "Apply to",
    yourResume: "Your Resume",
    resumeText:
      "Your current resume will be submitted with the application",
    coverLetter: "Cover Letter",
    coverLetterQuestion:
      "Why should you be selected for this internship?",
    coverLetterPlaceholder: "Enter your cover letter here...",
    availability: "Your Availability",
    submitApplication: "Submit Application",
    signUpToApply: "Sign up to apply",
    postedOn: "Posted on",
    requiredCoverLetter: "Please write a cover letter",
    requiredAvailability: "Please select your availability",
    applicationSuccess: "Application submitted successfully",
    applicationFailed: "Failed to submit application",
    immediately: "Yes, I am available to join immediately",
    noticePeriod: "No, I am currently on a notice period",
    serveNotice: "No, I will have to serve notice period",
    other: "Other",
    internshipNotFound: "Internship not found",
  },

  es: {
    activelyHiring: "Contratando activamente",
    about: "Acerca de",
    visitWebsite: "Visitar sitio web de la empresa",
    aboutInternship: "Acerca de la pasantía",
    whoCanApply: "Quién puede postularse",
    perks: "Beneficios",
    additionalInfo: "Información adicional",
    openings: "Número de vacantes",
    applyNow: "Postularse ahora",
    applyTo: "Postularse a",
    yourResume: "Tu currículum",
    resumeText:
      "Tu currículum actual se enviará con la solicitud",
    coverLetter: "Carta de presentación",
    coverLetterQuestion:
      "¿Por qué deberías ser seleccionado para esta pasantía?",
    coverLetterPlaceholder:
      "Escribe tu carta de presentación aquí...",
    availability: "Tu disponibilidad",
    submitApplication: "Enviar solicitud",
    signUpToApply: "Regístrate para postularte",
    postedOn: "Publicado el",
    requiredCoverLetter: "Escribe una carta de presentación",
    requiredAvailability: "Selecciona tu disponibilidad",
    applicationSuccess: "Solicitud enviada correctamente",
    applicationFailed: "No se pudo enviar la solicitud",
    immediately:
      "Sí, estoy disponible para incorporarme inmediatamente",
    noticePeriod:
      "No, actualmente estoy en período de preaviso",
    serveNotice:
      "No, tendré que cumplir un período de preaviso",
    other: "Otro",
    internshipNotFound: "No se encontró la pasantía",
  },

  hi: {
    activelyHiring: "सक्रिय रूप से भर्ती",
    about: "के बारे में",
    visitWebsite: "कंपनी की वेबसाइट देखें",
    aboutInternship: "इंटर्नशिप के बारे में",
    whoCanApply: "कौन आवेदन कर सकता है",
    perks: "लाभ",
    additionalInfo: "अतिरिक्त जानकारी",
    openings: "रिक्तियों की संख्या",
    applyNow: "अभी आवेदन करें",
    applyTo: "आवेदन करें",
    yourResume: "आपका रिज़्यूमे",
    resumeText:
      "आपका वर्तमान रिज़्यूमे आवेदन के साथ जमा किया जाएगा",
    coverLetter: "कवर लेटर",
    coverLetterQuestion:
      "इस इंटर्नशिप के लिए आपको क्यों चुना जाना चाहिए?",
    coverLetterPlaceholder:
      "अपना कवर लेटर यहाँ लिखें...",
    availability: "आपकी उपलब्धता",
    submitApplication: "आवेदन जमा करें",
    signUpToApply: "आवेदन करने के लिए साइन अप करें",
    postedOn: "पोस्ट किया गया",
    requiredCoverLetter: "कृपया कवर लेटर लिखें",
    requiredAvailability: "कृपया अपनी उपलब्धता चुनें",
    applicationSuccess: "आवेदन सफलतापूर्वक जमा किया गया",
    applicationFailed: "आवेदन जमा करने में विफल",
    immediately:
      "हाँ, मैं तुरंत जॉइन करने के लिए उपलब्ध हूँ",
    noticePeriod:
      "नहीं, मैं वर्तमान में नोटिस पीरियड पर हूँ",
    serveNotice:
      "नहीं, मुझे नोटिस पीरियड पूरा करना होगा",
    other: "अन्य",
    internshipNotFound: "इंटर्नशिप नहीं मिली",
  },

  pt: {
    activelyHiring: "Contratando ativamente",
    about: "Sobre",
    visitWebsite: "Visitar site da empresa",
    aboutInternship: "Sobre o estágio",
    whoCanApply: "Quem pode se candidatar",
    perks: "Benefícios",
    additionalInfo: "Informações adicionais",
    openings: "Número de vagas",
    applyNow: "Candidate-se agora",
    applyTo: "Candidatar-se a",
    yourResume: "Seu currículo",
    resumeText:
      "Seu currículo atual será enviado com a candidatura",
    coverLetter: "Carta de apresentação",
    coverLetterQuestion:
      "Por que você deve ser selecionado para este estágio?",
    coverLetterPlaceholder:
      "Digite sua carta de apresentação aqui...",
    availability: "Sua disponibilidade",
    submitApplication: "Enviar candidatura",
    signUpToApply: "Cadastre-se para se candidatar",
    postedOn: "Publicado em",
    requiredCoverLetter:
      "Escreva uma carta de apresentação",
    requiredAvailability:
      "Selecione sua disponibilidade",
    applicationSuccess:
      "Candidatura enviada com sucesso",
    applicationFailed:
      "Falha ao enviar candidatura",
    immediately:
      "Sim, estou disponível para começar imediatamente",
    noticePeriod:
      "Não, estou atualmente em período de aviso prévio",
    serveNotice:
      "Não, terei que cumprir o período de aviso prévio",
    other: "Outro",
    internshipNotFound: "Estágio não encontrado",
  },

  zh: {
    activelyHiring: "正在招聘",
    about: "关于",
    visitWebsite: "访问公司网站",
    aboutInternship: "关于实习",
    whoCanApply: "申请资格",
    perks: "福利",
    additionalInfo: "其他信息",
    openings: "职位数量",
    applyNow: "立即申请",
    applyTo: "申请",
    yourResume: "您的简历",
    resumeText:
      "您的当前简历将随申请一起提交",
    coverLetter: "求职信",
    coverLetterQuestion:
      "为什么应该选择您参加这份实习？",
    coverLetterPlaceholder:
      "请在此输入您的求职信...",
    availability: "您的可用时间",
    submitApplication: "提交申请",
    signUpToApply: "注册后申请",
    postedOn: "发布于",
    requiredCoverLetter: "请输入求职信",
    requiredAvailability: "请选择您的可用时间",
    applicationSuccess: "申请提交成功",
    applicationFailed: "申请提交失败",
    immediately: "是的，我可以立即加入",
    noticePeriod: "不，我目前处于通知期",
    serveNotice: "不，我需要完成通知期",
    other: "其他",
    internshipNotFound: "未找到实习",
  },

  fr: {
    activelyHiring: "Recrutement actif",
    about: "À propos de",
    visitWebsite: "Visiter le site de l'entreprise",
    aboutInternship: "À propos du stage",
    whoCanApply: "Qui peut postuler",
    perks: "Avantages",
    additionalInfo:
      "Informations supplémentaires",
    openings: "Nombre de postes",
    applyNow: "Postuler maintenant",
    applyTo: "Postuler à",
    yourResume: "Votre CV",
    resumeText:
      "Votre CV actuel sera envoyé avec la candidature",
    coverLetter: "Lettre de motivation",
    coverLetterQuestion:
      "Pourquoi devriez-vous être sélectionné pour ce stage ?",
    coverLetterPlaceholder:
      "Saisissez votre lettre de motivation ici...",
    availability: "Votre disponibilité",
    submitApplication: "Envoyer la candidature",
    signUpToApply: "Inscrivez-vous pour postuler",
    postedOn: "Publié le",
    requiredCoverLetter:
      "Veuillez rédiger une lettre de motivation",
    requiredAvailability:
      "Veuillez sélectionner votre disponibilité",
    applicationSuccess:
      "Candidature envoyée avec succès",
    applicationFailed:
      "Échec de l'envoi de la candidature",
    immediately:
      "Oui, je suis disponible pour commencer immédiatement",
    noticePeriod:
      "Non, je suis actuellement en période de préavis",
    serveNotice:
      "Non, je devrai effectuer une période de préavis",
    other: "Autre",
    internshipNotFound: "Stage introuvable",
  },
};

const index = () => {
  const router = useRouter();
  const { id } = router.query;

  const { language } = useLanguage();
  const t = text[language] || text.en;

  const [internshipData, setinternship] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);

  const [availability, setAvailability] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const RESUME_API = `${process.env.NEXT_PUBLIC_API_URL}/api/resume`;
  const user = useSelector(selectuser);

  useEffect(() => {
    const fetchdata = async () => {
      try {
        setLoading(true);

        const res = await axios.get(
          `https://internshala-clone-a0st.onrender.com/api/internship/${id}`
        );

        setinternship(res.data);
      } catch (error) {
        console.log("Internship fetch error:", error);
        setinternship(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchdata();
    }
  }, [id]);

  useEffect(() => {
    if (!isModalOpen) return;

    let cancelled = false;

    const loadResumes = async () => {
      try {
        setResumeLoading(true);

        const currentUser = auth.currentUser;
        if (!currentUser) {
          toast.error("Please sign in to select your resume.");
          return;
        }

        const token = await currentUser.getIdToken();

      const response = await axios.get(RESUME_API, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

        const result = response.data;
        const list = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : Array.isArray(result?.resumes)
              ? result.resumes
              : [];

        const availableResumes = list.filter(
          (resume: any) =>
            resume.status === "generated" && Boolean(resume.pdfUrl)
        );

        if (cancelled) return;

        setResumes(availableResumes);

        const defaultResume = availableResumes.find(
          (resume: any) => resume.isDefault
        );

        setSelectedResumeId(
          defaultResume?._id || availableResumes[0]?._id || ""
        );
      } catch (error: any) {
        if (!cancelled) {
          console.error(
            "Failed to load resumes:",
            error.response?.data || error.message
          );

          toast.error("Unable to load your saved resumes.");
        }
      } finally {
        if (!cancelled) setResumeLoading(false);
      }
    };

    loadResumes();

    return () => {
      cancelled = true;
    };
  }, [isModalOpen]);

  if (loading || !id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!internshipData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">
          {t.internshipNotFound}
        </p>
      </div>
    );
  }
  const handlesubmitapplication = async () => {
    if (!coverLetter.trim()) {
      toast.error(t.requiredCoverLetter);
      return;
    }

    if (!availability) {
      toast.error(t.requiredAvailability);
      return;
    }

    if (!selectedResumeId) {
      toast.error("Please select a generated resume.");
      return;
    }

    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        toast.error("Please sign in again.");
        return;
      }

      const token = await currentUser.getIdToken();

      const applicationdata = {
        category: internshipData.category,
        company: internshipData.company,
        coverLetter: coverLetter.trim(),
        Application: id,
        availability,
        resumeId: selectedResumeId,
      };

      await axios.post(
        "http://localhost:5000/api/application",
        applicationdata,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(t.applicationSuccess);
      setIsModalOpen(false);
      router.push("/internship");
    } catch (error: any) {
      console.error(
        "Application submission failed:",
        error.response?.data || error.message
      );

      toast.error(
        error.response?.data?.message || t.applicationFailed
      );
    }
  };

  const availabilityOptions = [
    {
      value: "Yes, I am available to join immediately",
      label: t.immediately,
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">

        {/* Header Section */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-2 text-blue-600 mb-4">
            <ArrowUpRight className="h-5 w-5" />

            <span className="font-medium">
              {t.activelyHiring}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {internshipData.title}
          </h1>

          <p className="text-lg text-gray-600 mb-4">
            {internshipData.company}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="h-5 w-5" />
              <span>{internshipData.location}</span>
            </div>

            <div className="flex items-center space-x-2 text-gray-600">
              <IndianRupee className="h-5 w-5" />
              <span>{internshipData.stipend}</span>
            </div>

            <div className="flex items-center space-x-2 text-gray-600">
              <Calendar className="h-5 w-5" />
              <span>{internshipData.startDate}</span>
            </div>

          </div>

          <div className="mt-4 flex items-center space-x-2">
            <Clock className="h-4 w-4 text-green-500" />
            <span className="text-green-500 text-sm">
              {t.postedOn} {internshipData.createdAt || ""}
            </span>
          </div>
        </div>

        {/* Company Section */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t.about} {internshipData.company}
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

          <p className="text-gray-600">
            {internshipData.aboutCompany}
          </p>
        </div>

        {/* Internship Details Section */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t.aboutInternship}
          </h2>

          <p className="text-gray-600 mb-6">
            {internshipData.aboutInternship}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t.whoCanApply}
          </h3>

          <p className="text-gray-600 mb-6">
            {internshipData.whoCanApply}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t.perks}
          </h3>

          <p className="text-gray-600 mb-6">
            {Array.isArray(internshipData.perks)
              ? internshipData.perks.join(", ")
              : internshipData.perks}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t.additionalInfo}
          </h3>

          <p className="text-gray-600 mb-6">
            {internshipData.additionalInfo}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t.openings}
          </h3>

          <p className="text-gray-600">
            {internshipData.numberOfOpening}
          </p>
        </div>

        {/* Apply Button */}
        <div className="p-6 flex justify-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition duration-150"
          >
            {t.applyNow}
          </button>
        </div>

        {/* Apply Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">

              {/* Modal Header */}
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">

                  <h2 className="text-2xl font-bold text-gray-900">
                    {t.applyTo} {internshipData.company}
                  </h2>

                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>

                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Resume Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t.yourResume}
                  </h3>

                  {resumeLoading ? (
                    <p className="text-gray-600">Loading your saved resumes...</p>
                  ) : resumes.length > 0 ? (
                    <>
                      <select
                        value={selectedResumeId}
                        onChange={(e) => setSelectedResumeId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      >
                        {resumes.map((resume: any) => (
                          <option key={resume._id} value={resume._id}>
                            {resume.title || "My Resume"}
                            {resume.isDefault ? " (Default)" : ""}
                          </option>
                        ))}
                      </select>

                      <div className="mt-2 flex flex-col items-start gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedResumeId) return;

                            try {
                              const currentUser = auth.currentUser;
                              if (!currentUser) {
                                toast.error("Please sign in again.");
                                return;
                              }

                              const token = await currentUser.getIdToken();
                              const response = await axios.get(
                               `${RESUME_API}/${selectedResumeId}/download`,
                                {
                                  headers: {
                                    Authorization: `Bearer ${token}`,
                                  },
                                  responseType: "blob",
                                }
                              );

                              const url = URL.createObjectURL(
                                new Blob([response.data], { type: "application/pdf" })
                              );

                              window.open(url, "_blank");
                              setTimeout(() => URL.revokeObjectURL(url), 120000);
                            } catch (error) {
                              toast.error("Could not preview resume. Please try again.");
                            }
                          }}
                          disabled={!selectedResumeId}
                          className="text-blue-600 hover:underline disabled:opacity-50"
                        >
                          Preview resume
                        </button>

                        <p className="text-gray-600">
                          Your current resume will be submitted with the application.
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-red-600">
                      No generated resumes found. Please create a resume in Resume Builder first.
                    </p>
                  )}
                </div>

                {/* Cover Letter Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t.coverLetter}
                  </h3>

                  <p className="text-gray-600 mb-2">
                    {t.coverLetterQuestion}
                  </p>

                  <textarea
                    value={coverLetter}
                    onChange={(e) =>
                      setCoverLetter(e.target.value)
                    }
                    className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                    placeholder={t.coverLetterPlaceholder}
                  ></textarea>
                </div>

                {/* Availability Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t.availability}
                  </h3>

                  <div>
                    {availabilityOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center space-x-2 mb-2"
                      >
                        <input
                          type="radio"
                          name="availability"
                          value={option.value}
                          checked={
                            availability === option.value
                          }
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
                </div>

                {/* Submit Section */}
                <div className="flex justify-end">
                  {user ? (
                    <button
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handlesubmitapplication}
                      disabled={
                        resumeLoading ||
                        resumes.length === 0 ||
                        !selectedResumeId
                      }
                    >
                      {t.submitApplication}
                    </button>
                  ) : (
                    <Link
                      href="/"
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                      {t.signUpToApply}
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