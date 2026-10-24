import React, { useState } from "react";
import {
  Briefcase,
  Building2,
  MapPin,
  FileText,
  Users,
  Hash,
  Calendar,
  Info,
  IndianRupee,
} from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../../context/LanguageContext";

const text = {
  en: {
    title: "Post New Job",
    subtitle: "Create a new job opportunity",
    basic: "Basic Information",
    basicDesc: "Enter the basic details of the job",
    jobTitle: "Job Title*",
    companyName: "Company Name*",
    location: "Location*",
    category: "Category*",
    companyJob: "Company & Job Details",
    companyJobDesc: "Tell candidates about the company and job",
    aboutCompany: "About Company*",
    aboutJob: "About Job*",
    eligibility: "Eligibility & Perks",
    eligibilityDesc: "Define who can apply and what you offer",
    whoCanApply: "Who Can Apply*",
    perks: "Perks*",
    jobDetails: "Job Details",
    jobDetailsDesc: "Complete the remaining job information",
    openings: "Number of Openings*",
    ctc: "CTC*",
    startDate: "Start Date*",
    additionalInfo: "Additional Information*",

    jobTitlePlaceholder: "e.g. Frontend Developer",
    companyPlaceholder: "e.g. Tech Solutions Inc",
    locationPlaceholder: "e.g. Mumbai, India",
    categoryPlaceholder: "e.g. Software Development",
    companyDescPlaceholder: "Describe your company...",
    jobDescPlaceholder: "Describe the job role...",
    eligibilityPlaceholder: "Eligibility criteria...",
    perksPlaceholder: "List the perks...",
    openingsPlaceholder: "e.g. 5",
    ctcPlaceholder: "e.g. 10 LPA",
    additionalPlaceholder: "Any additional details...",

    fillAll: "Please fill in all details",
    posted: "Job posted successfully",
    postError: "Error posting job",
    posting: "Posting Job...",
    postJob: "Post Job",
  },

  es: {
    title: "Publicar Nuevo Trabajo",
    subtitle: "Crear una nueva oportunidad laboral",
    basic: "Información Básica",
    basicDesc: "Ingresa los datos básicos del trabajo",
    jobTitle: "Título del Trabajo*",
    companyName: "Nombre de la Empresa*",
    location: "Ubicación*",
    category: "Categoría*",
    companyJob: "Detalles de la Empresa y del Trabajo",
    companyJobDesc: "Informa a los candidatos sobre la empresa y el trabajo",
    aboutCompany: "Acerca de la Empresa*",
    aboutJob: "Acerca del Trabajo*",
    eligibility: "Elegibilidad y Beneficios",
    eligibilityDesc: "Define quién puede postularse y qué ofreces",
    whoCanApply: "Quién Puede Postularse*",
    perks: "Beneficios*",
    jobDetails: "Detalles del Trabajo",
    jobDetailsDesc: "Completa la información restante del trabajo",
    openings: "Número de Vacantes*",
    ctc: "CTC*",
    startDate: "Fecha de Inicio*",
    additionalInfo: "Información Adicional*",

    jobTitlePlaceholder: "ej. Desarrollador Frontend",
    companyPlaceholder: "ej. Tech Solutions Inc",
    locationPlaceholder: "ej. Mumbai, India",
    categoryPlaceholder: "ej. Desarrollo de Software",
    companyDescPlaceholder: "Describe tu empresa...",
    jobDescPlaceholder: "Describe el puesto...",
    eligibilityPlaceholder: "Criterios de elegibilidad...",
    perksPlaceholder: "Indica los beneficios...",
    openingsPlaceholder: "ej. 5",
    ctcPlaceholder: "ej. 10 LPA",
    additionalPlaceholder: "Cualquier detalle adicional...",

    fillAll: "Por favor completa todos los detalles",
    posted: "Trabajo publicado correctamente",
    postError: "Error al publicar el trabajo",
    posting: "Publicando Trabajo...",
    postJob: "Publicar Trabajo",
  },

  hi: {
    title: "नई नौकरी पोस्ट करें",
    subtitle: "नौकरी का नया अवसर बनाएं",
    basic: "मूल जानकारी",
    basicDesc: "नौकरी की मूल जानकारी दर्ज करें",
    jobTitle: "नौकरी का शीर्षक*",
    companyName: "कंपनी का नाम*",
    location: "स्थान*",
    category: "श्रेणी*",
    companyJob: "कंपनी और नौकरी का विवरण",
    companyJobDesc: "उम्मीदवारों को कंपनी और नौकरी के बारे में बताएं",
    aboutCompany: "कंपनी के बारे में*",
    aboutJob: "नौकरी के बारे में*",
    eligibility: "योग्यता और लाभ",
    eligibilityDesc: "बताएं कि कौन आवेदन कर सकता है और आप क्या प्रदान करते हैं",
    whoCanApply: "कौन आवेदन कर सकता है*",
    perks: "लाभ*",
    jobDetails: "नौकरी का विवरण",
    jobDetailsDesc: "नौकरी की बाकी जानकारी पूरी करें",
    openings: "रिक्तियों की संख्या*",
    ctc: "CTC*",
    startDate: "प्रारंभ तिथि*",
    additionalInfo: "अतिरिक्त जानकारी*",

    jobTitlePlaceholder: "जैसे फ्रंटएंड डेवलपर",
    companyPlaceholder: "जैसे Tech Solutions Inc",
    locationPlaceholder: "जैसे मुंबई, भारत",
    categoryPlaceholder: "जैसे सॉफ्टवेयर डेवलपमेंट",
    companyDescPlaceholder: "अपनी कंपनी के बारे में बताएं...",
    jobDescPlaceholder: "नौकरी की भूमिका का वर्णन करें...",
    eligibilityPlaceholder: "योग्यता मानदंड...",
    perksPlaceholder: "लाभों की सूची दें...",
    openingsPlaceholder: "जैसे 5",
    ctcPlaceholder: "जैसे 10 LPA",
    additionalPlaceholder: "कोई अतिरिक्त जानकारी...",

    fillAll: "कृपया सभी विवरण भरें",
    posted: "नौकरी सफलतापूर्वक पोस्ट की गई",
    postError: "नौकरी पोस्ट करने में त्रुटि",
    posting: "नौकरी पोस्ट हो रही है...",
    postJob: "नौकरी पोस्ट करें",
  },

  pt: {
    title: "Publicar Novo Emprego",
    subtitle: "Criar uma nova oportunidade de emprego",
    basic: "Informações Básicas",
    basicDesc: "Insira os detalhes básicos do emprego",
    jobTitle: "Título do Emprego*",
    companyName: "Nome da Empresa*",
    location: "Localização*",
    category: "Categoria*",
    companyJob: "Detalhes da Empresa e do Emprego",
    companyJobDesc: "Conte aos candidatos sobre a empresa e o emprego",
    aboutCompany: "Sobre a Empresa*",
    aboutJob: "Sobre o Emprego*",
    eligibility: "Elegibilidade e Benefícios",
    eligibilityDesc: "Defina quem pode se candidatar e o que você oferece",
    whoCanApply: "Quem Pode se Candidatar*",
    perks: "Benefícios*",
    jobDetails: "Detalhes do Emprego",
    jobDetailsDesc: "Complete as informações restantes do emprego",
    openings: "Número de Vagas*",
    ctc: "CTC*",
    startDate: "Data de Início*",
    additionalInfo: "Informações Adicionais*",

    jobTitlePlaceholder: "ex. Desenvolvedor Frontend",
    companyPlaceholder: "ex. Tech Solutions Inc",
    locationPlaceholder: "ex. Mumbai, Índia",
    categoryPlaceholder: "ex. Desenvolvimento de Software",
    companyDescPlaceholder: "Descreva sua empresa...",
    jobDescPlaceholder: "Descreva a função...",
    eligibilityPlaceholder: "Critérios de elegibilidade...",
    perksPlaceholder: "Liste os benefícios...",
    openingsPlaceholder: "ex. 5",
    ctcPlaceholder: "ex. 10 LPA",
    additionalPlaceholder: "Quaisquer detalhes adicionais...",

    fillAll: "Preencha todos os detalhes",
    posted: "Emprego publicado com sucesso",
    postError: "Erro ao publicar o emprego",
    posting: "Publicando Emprego...",
    postJob: "Publicar Emprego",
  },

  zh: {
    title: "发布新职位",
    subtitle: "创建新的工作机会",
    basic: "基本信息",
    basicDesc: "输入职位的基本信息",
    jobTitle: "职位名称*",
    companyName: "公司名称*",
    location: "地点*",
    category: "类别*",
    companyJob: "公司和职位详情",
    companyJobDesc: "向候选人介绍公司和职位",
    aboutCompany: "关于公司*",
    aboutJob: "关于职位*",
    eligibility: "申请资格和福利",
    eligibilityDesc: "定义申请条件以及您提供的福利",
    whoCanApply: "谁可以申请*",
    perks: "福利*",
    jobDetails: "职位详情",
    jobDetailsDesc: "完成剩余的职位信息",
    openings: "招聘人数*",
    ctc: "CTC*",
    startDate: "开始日期*",
    additionalInfo: "其他信息*",

    jobTitlePlaceholder: "例如：前端开发工程师",
    companyPlaceholder: "例如：Tech Solutions Inc",
    locationPlaceholder: "例如：孟买，印度",
    categoryPlaceholder: "例如：软件开发",
    companyDescPlaceholder: "描述您的公司...",
    jobDescPlaceholder: "描述职位职责...",
    eligibilityPlaceholder: "申请资格标准...",
    perksPlaceholder: "列出福利...",
    openingsPlaceholder: "例如：5",
    ctcPlaceholder: "例如：10 LPA",
    additionalPlaceholder: "任何其他信息...",

    fillAll: "请填写所有信息",
    posted: "职位发布成功",
    postError: "发布职位时出错",
    posting: "正在发布职位...",
    postJob: "发布职位",
  },

  fr: {
    title: "Publier un Nouvel Emploi",
    subtitle: "Créer une nouvelle opportunité d'emploi",
    basic: "Informations de Base",
    basicDesc: "Saisissez les informations de base de l'emploi",
    jobTitle: "Titre du Poste*",
    companyName: "Nom de l'Entreprise*",
    location: "Lieu*",
    category: "Catégorie*",
    companyJob: "Détails de l'Entreprise et du Poste",
    companyJobDesc: "Présentez l'entreprise et le poste aux candidats",
    aboutCompany: "À Propos de l'Entreprise*",
    aboutJob: "À Propos du Poste*",
    eligibility: "Éligibilité et Avantages",
    eligibilityDesc: "Définissez qui peut postuler et ce que vous proposez",
    whoCanApply: "Qui Peut Postuler*",
    perks: "Avantages*",
    jobDetails: "Détails du Poste",
    jobDetailsDesc: "Complétez les informations restantes du poste",
    openings: "Nombre de Postes*",
    ctc: "CTC*",
    startDate: "Date de Début*",
    additionalInfo: "Informations Supplémentaires*",

    jobTitlePlaceholder: "ex. Développeur Frontend",
    companyPlaceholder: "ex. Tech Solutions Inc",
    locationPlaceholder: "ex. Mumbai, Inde",
    categoryPlaceholder: "ex. Développement Logiciel",
    companyDescPlaceholder: "Décrivez votre entreprise...",
    jobDescPlaceholder: "Décrivez le poste...",
    eligibilityPlaceholder: "Critères d'éligibilité...",
    perksPlaceholder: "Listez les avantages...",
    openingsPlaceholder: "ex. 5",
    ctcPlaceholder: "ex. 10 LPA",
    additionalPlaceholder: "Informations supplémentaires...",

    fillAll: "Veuillez remplir tous les détails",
    posted: "Emploi publié avec succès",
    postError: "Erreur lors de la publication de l'emploi",
    posting: "Publication de l'emploi...",
    postJob: "Publier l'Emploi",
  },
};

const index = () => {
  const { language } = useLanguage();
  const t = text[language] || text.en;

  const [formdata, setformdata] = useState({
    title: "",
    company: "",
    location: "",
    category: "",
    aboutCompany: "",
    aboutJob: "",
    whoCanApply: "",
    perks: "",
    numberOfOpening: "",
    CTC: "",
    startDate: "",
    additionalInfo: "",
  });

  const router = useRouter();
  const [isloading, setisloading] = useState(false);

  const handlechange = (e: any) => {
    const { name, value } = e.target;

    setformdata((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlesubmit = async (e: any) => {
    e.preventDefault();

    const hasemptyfields = Object.values(formdata).some(
      (val) => !val.trim()
    );

    if (hasemptyfields) {
      toast.error(t.fillAll);
      return;
    }

    try {
      setisloading(true);

      const res = await axios.post(
        "https://internshala-clone-a0st.onrender.com/api/job",
        formdata
      );

      console.log("JOB DATA:", res.data);

      toast.success(t.posted);
      router.push("/adminpanel");
    } catch (error) {
      console.log(error);
      toast.error(t.postError);
    } finally {
      setisloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          <div className="px-6 sm:px-8 py-6 border-b border-gray-200">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {t.title}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {t.subtitle}
            </p>
          </div>

          <form
            className="p-6 sm:p-8 space-y-6"
            onSubmit={handlesubmit}
          >

            {/* BASIC INFORMATION */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Briefcase size={18} className="text-blue-600" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {t.basic}
                  </h3>

                  <p className="text-xs text-gray-500">
                    {t.basicDesc}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t.jobTitle}
                  </label>

                  <div className="relative">
                    <Briefcase
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="title"
                      type="text"
                      required
                      name="title"
                      value={formdata.title}
                      onChange={handlechange}
                      placeholder={t.jobTitlePlaceholder}
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="company"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t.companyName}
                  </label>

                  <div className="relative">
                    <Building2
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="company"
                      type="text"
                      required
                      name="company"
                      value={formdata.company}
                      onChange={handlechange}
                      placeholder={t.companyPlaceholder}
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t.location}
                  </label>

                  <div className="relative">
                    <MapPin
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="location"
                      type="text"
                      required
                      name="location"
                      value={formdata.location}
                      onChange={handlechange}
                      placeholder={t.locationPlaceholder}
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t.category}
                  </label>

                  <div className="relative">
                    <FileText
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="category"
                      type="text"
                      required
                      name="category"
                      value={formdata.category}
                      onChange={handlechange}
                      placeholder={t.categoryPlaceholder}
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

              </div>
            </section>

            {/* COMPANY & JOB DETAILS */}
            <section className="pt-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Building2 size={18} className="text-indigo-600" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {t.companyJob}
                  </h3>

                  <p className="text-xs text-gray-500">
                    {t.companyJobDesc}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>
                  <label
                    htmlFor="aboutCompany"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t.aboutCompany}
                  </label>

                  <textarea
                    id="aboutCompany"
                    required
                    name="aboutCompany"
                    value={formdata.aboutCompany}
                    onChange={handlechange}
                    rows={5}
                    placeholder={t.companyDescPlaceholder}
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="aboutJob"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t.aboutJob}
                  </label>

                  <textarea
                    id="aboutJob"
                    required
                    name="aboutJob"
                    value={formdata.aboutJob}
                    onChange={handlechange}
                    rows={5}
                    placeholder={t.jobDescPlaceholder}
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

              </div>
            </section>

            {/* ELIGIBILITY */}
            <section className="pt-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Users size={18} className="text-purple-600" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {t.eligibility}
                  </h3>

                  <p className="text-xs text-gray-500">
                    {t.eligibilityDesc}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>
                  <label
                    htmlFor="whoCanApply"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t.whoCanApply}
                  </label>

                  <textarea
                    id="whoCanApply"
                    required
                    name="whoCanApply"
                    value={formdata.whoCanApply}
                    onChange={handlechange}
                    rows={4}
                    placeholder={t.eligibilityPlaceholder}
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="perks"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t.perks}
                  </label>

                  <textarea
                    id="perks"
                    required
                    name="perks"
                    value={formdata.perks}
                    onChange={handlechange}
                    rows={4}
                    placeholder={t.perksPlaceholder}
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

              </div>
            </section>

            {/* JOB DETAILS */}
            <section className="pt-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                  <Info size={18} className="text-green-600" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {t.jobDetails}
                  </h3>

                  <p className="text-xs text-gray-500">
                    {t.jobDetailsDesc}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>
                  <label
                    htmlFor="numberOfOpening"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t.openings}
                  </label>

                  <div className="relative">
                    <Hash
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="numberOfOpening"
                      type="number"
                      min="1"
                      required
                      name="numberOfOpening"
                      value={formdata.numberOfOpening}
                      onChange={handlechange}
                      placeholder={t.openingsPlaceholder}
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="CTC"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t.ctc}
                  </label>

                  <div className="relative">
                    <IndianRupee
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="CTC"
                      type="text"
                      required
                      name="CTC"
                      value={formdata.CTC}
                      onChange={handlechange}
                      placeholder={t.ctcPlaceholder}
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t.startDate}
                  </label>

                  <div className="relative">
                    <Calendar
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />

                    <input
                      id="startDate"
                      type="date"
                      required
                      name="startDate"
                      value={formdata.startDate}
                      onChange={handlechange}
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="additionalInfo"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t.additionalInfo}
                  </label>

                  <textarea
                    id="additionalInfo"
                    required
                    name="additionalInfo"
                    value={formdata.additionalInfo}
                    onChange={handlechange}
                    rows={4}
                    placeholder={t.additionalPlaceholder}
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

              </div>
            </section>

            {/* SUBMIT */}
            <div className="pt-6 border-t border-gray-200 flex justify-end">
              <button
                type="submit"
                disabled={isloading}
                className="border border-transparent border-gray-300 w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isloading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    {t.posting}
                  </div>
                ) : (
                  t.postJob
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default index;