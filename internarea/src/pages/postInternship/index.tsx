import React, { useState } from "react";
import {
  Building2,
  MapPin,
  Briefcase,
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
    title: "Post New Internship",
    subtitle: "Create a new internship opportunity for students",
    basic: "Basic Information",
    basicDesc: "Enter the basic details of the internship",
    internshipTitle: "Internship Title*",
    companyName: "Company Name*",
    location: "Location*",
    category: "Category*",
    companyDetails: "Company & Internship Details",
    companyDetailsDesc: "Provide information about the company and role",
    aboutCompany: "About Company*",
    aboutInternship: "About Internship*",
    additionalDetails: "Additional Details",
    additionalDetailsDesc: "Add eligibility and benefits information",
    whoCanApply: "Who Can Apply*",
    perks: "Perks*",
    finalDetails: "Final Details",
    finalDetailsDesc: "Complete the remaining internship information",
    openings: "Number of Openings*",
    stipend: "Stipend*",
    startDate: "Start Date*",
    additionalInfo: "Additional Information*",

    internshipTitlePlaceholder: "e.g. Frontend Developer Intern",
    companyPlaceholder: "e.g. Tech Solutions Inc",
    locationPlaceholder: "e.g. Mumbai, India",
    categoryPlaceholder: "e.g. Software Development",
    companyPlaceholderText: "Describe your company...",
    internshipPlaceholder: "Describe the internship role...",
    eligibilityPlaceholder: "Eligibility criteria...",
    perksPlaceholder: "List the perks...",
    openingsPlaceholder: "e.g. 5",
    stipendPlaceholder: "e.g. ₹15,000/month",
    additionalPlaceholder: "Any additional details...",

    fillAll: "Please fill in all details",
    posted: "Internship posted successfully",
    postError: "Error posting internship",
    posting: "Posting Internship...",
    postInternship: "Post Internship",
  },

  es: {
    title: "Publicar Nueva Pasantía",
    subtitle: "Crear una nueva oportunidad de pasantía para estudiantes",
    basic: "Información Básica",
    basicDesc: "Ingresa los datos básicos de la pasantía",
    internshipTitle: "Título de la Pasantía*",
    companyName: "Nombre de la Empresa*",
    location: "Ubicación*",
    category: "Categoría*",
    companyDetails: "Detalles de la Empresa y la Pasantía",
    companyDetailsDesc: "Proporciona información sobre la empresa y el puesto",
    aboutCompany: "Acerca de la Empresa*",
    aboutInternship: "Acerca de la Pasantía*",
    additionalDetails: "Detalles Adicionales",
    additionalDetailsDesc: "Agrega información sobre elegibilidad y beneficios",
    whoCanApply: "Quién Puede Postularse*",
    perks: "Beneficios*",
    finalDetails: "Detalles Finales",
    finalDetailsDesc: "Completa la información restante de la pasantía",
    openings: "Número de Vacantes*",
    stipend: "Estipendio*",
    startDate: "Fecha de Inicio*",
    additionalInfo: "Información Adicional*",

    internshipTitlePlaceholder: "ej. Desarrollador Frontend en Prácticas",
    companyPlaceholder: "ej. Tech Solutions Inc",
    locationPlaceholder: "ej. Mumbai, India",
    categoryPlaceholder: "ej. Desarrollo de Software",
    companyPlaceholderText: "Describe tu empresa...",
    internshipPlaceholder: "Describe el puesto de pasantía...",
    eligibilityPlaceholder: "Criterios de elegibilidad...",
    perksPlaceholder: "Indica los beneficios...",
    openingsPlaceholder: "ej. 5",
    stipendPlaceholder: "ej. ₹15,000/mes",
    additionalPlaceholder: "Cualquier detalle adicional...",

    fillAll: "Por favor completa todos los detalles",
    posted: "Pasantía publicada correctamente",
    postError: "Error al publicar la pasantía",
    posting: "Publicando Pasantía...",
    postInternship: "Publicar Pasantía",
  },

  hi: {
    title: "नई इंटर्नशिप पोस्ट करें",
    subtitle: "छात्रों के लिए इंटर्नशिप का नया अवसर बनाएं",
    basic: "मूल जानकारी",
    basicDesc: "इंटर्नशिप की मूल जानकारी दर्ज करें",
    internshipTitle: "इंटर्नशिप का शीर्षक*",
    companyName: "कंपनी का नाम*",
    location: "स्थान*",
    category: "श्रेणी*",
    companyDetails: "कंपनी और इंटर्नशिप का विवरण",
    companyDetailsDesc: "कंपनी और भूमिका के बारे में जानकारी दें",
    aboutCompany: "कंपनी के बारे में*",
    aboutInternship: "इंटर्नशिप के बारे में*",
    additionalDetails: "अतिरिक्त विवरण",
    additionalDetailsDesc: "योग्यता और लाभ की जानकारी जोड़ें",
    whoCanApply: "कौन आवेदन कर सकता है*",
    perks: "लाभ*",
    finalDetails: "अंतिम विवरण",
    finalDetailsDesc: "इंटर्नशिप की बाकी जानकारी पूरी करें",
    openings: "रिक्तियों की संख्या*",
    stipend: "स्टाइपेंड*",
    startDate: "प्रारंभ तिथि*",
    additionalInfo: "अतिरिक्त जानकारी*",

    internshipTitlePlaceholder: "जैसे फ्रंटएंड डेवलपर इंटर्न",
    companyPlaceholder: "जैसे Tech Solutions Inc",
    locationPlaceholder: "जैसे मुंबई, भारत",
    categoryPlaceholder: "जैसे सॉफ्टवेयर डेवलपमेंट",
    companyPlaceholderText: "अपनी कंपनी के बारे में बताएं...",
    internshipPlaceholder: "इंटर्नशिप की भूमिका का वर्णन करें...",
    eligibilityPlaceholder: "योग्यता मानदंड...",
    perksPlaceholder: "लाभों की सूची दें...",
    openingsPlaceholder: "जैसे 5",
    stipendPlaceholder: "जैसे ₹15,000/माह",
    additionalPlaceholder: "कोई अतिरिक्त जानकारी...",

    fillAll: "कृपया सभी विवरण भरें",
    posted: "इंटर्नशिप सफलतापूर्वक पोस्ट की गई",
    postError: "इंटर्नशिप पोस्ट करने में त्रुटि",
    posting: "इंटर्नशिप पोस्ट हो रही है...",
    postInternship: "इंटर्नशिप पोस्ट करें",
  },

  pt: {
    title: "Publicar Novo Estágio",
    subtitle: "Criar uma nova oportunidade de estágio para estudantes",
    basic: "Informações Básicas",
    basicDesc: "Insira os detalhes básicos do estágio",
    internshipTitle: "Título do Estágio*",
    companyName: "Nome da Empresa*",
    location: "Localização*",
    category: "Categoria*",
    companyDetails: "Detalhes da Empresa e do Estágio",
    companyDetailsDesc: "Forneça informações sobre a empresa e a função",
    aboutCompany: "Sobre a Empresa*",
    aboutInternship: "Sobre o Estágio*",
    additionalDetails: "Detalhes Adicionais",
    additionalDetailsDesc: "Adicione informações sobre elegibilidade e benefícios",
    whoCanApply: "Quem Pode se Candidatar*",
    perks: "Benefícios*",
    finalDetails: "Detalhes Finais",
    finalDetailsDesc: "Complete as informações restantes do estágio",
    openings: "Número de Vagas*",
    stipend: "Bolsa*",
    startDate: "Data de Início*",
    additionalInfo: "Informações Adicionais*",

    internshipTitlePlaceholder: "ex. Estagiário de Desenvolvimento Frontend",
    companyPlaceholder: "ex. Tech Solutions Inc",
    locationPlaceholder: "ex. Mumbai, Índia",
    categoryPlaceholder: "ex. Desenvolvimento de Software",
    companyPlaceholderText: "Descreva sua empresa...",
    internshipPlaceholder: "Descreva a função do estágio...",
    eligibilityPlaceholder: "Critérios de elegibilidade...",
    perksPlaceholder: "Liste os benefícios...",
    openingsPlaceholder: "ex. 5",
    stipendPlaceholder: "ex. ₹15.000/mês",
    additionalPlaceholder: "Quaisquer detalhes adicionais...",

    fillAll: "Preencha todos os detalhes",
    posted: "Estágio publicado com sucesso",
    postError: "Erro ao publicar o estágio",
    posting: "Publicando Estágio...",
    postInternship: "Publicar Estágio",
  },

  zh: {
    title: "发布新实习",
    subtitle: "为学生创建新的实习机会",
    basic: "基本信息",
    basicDesc: "输入实习的基本信息",
    internshipTitle: "实习名称*",
    companyName: "公司名称*",
    location: "地点*",
    category: "类别*",
    companyDetails: "公司和实习详情",
    companyDetailsDesc: "提供有关公司和职位的信息",
    aboutCompany: "关于公司*",
    aboutInternship: "关于实习*",
    additionalDetails: "其他详情",
    additionalDetailsDesc: "添加申请资格和福利信息",
    whoCanApply: "谁可以申请*",
    perks: "福利*",
    finalDetails: "最终详情",
    finalDetailsDesc: "完成剩余的实习信息",
    openings: "招聘人数*",
    stipend: "津贴*",
    startDate: "开始日期*",
    additionalInfo: "其他信息*",

    internshipTitlePlaceholder: "例如：前端开发实习生",
    companyPlaceholder: "例如：Tech Solutions Inc",
    locationPlaceholder: "例如：孟买，印度",
    categoryPlaceholder: "例如：软件开发",
    companyPlaceholderText: "描述您的公司...",
    internshipPlaceholder: "描述实习职位...",
    eligibilityPlaceholder: "申请资格标准...",
    perksPlaceholder: "列出福利...",
    openingsPlaceholder: "例如：5",
    stipendPlaceholder: "例如：₹15,000/月",
    additionalPlaceholder: "任何其他信息...",

    fillAll: "请填写所有信息",
    posted: "实习发布成功",
    postError: "发布实习时出错",
    posting: "正在发布实习...",
    postInternship: "发布实习",
  },

  fr: {
    title: "Publier un Nouveau Stage",
    subtitle: "Créer une nouvelle opportunité de stage pour les étudiants",
    basic: "Informations de Base",
    basicDesc: "Saisissez les informations de base du stage",
    internshipTitle: "Titre du Stage*",
    companyName: "Nom de l'Entreprise*",
    location: "Lieu*",
    category: "Catégorie*",
    companyDetails: "Détails de l'Entreprise et du Stage",
    companyDetailsDesc: "Fournissez des informations sur l'entreprise et le poste",
    aboutCompany: "À Propos de l'Entreprise*",
    aboutInternship: "À Propos du Stage*",
    additionalDetails: "Détails Supplémentaires",
    additionalDetailsDesc: "Ajoutez les informations d'éligibilité et les avantages",
    whoCanApply: "Qui Peut Postuler*",
    perks: "Avantages*",
    finalDetails: "Détails Finaux",
    finalDetailsDesc: "Complétez les informations restantes du stage",
    openings: "Nombre de Postes*",
    stipend: "Indemnité*",
    startDate: "Date de Début*",
    additionalInfo: "Informations Supplémentaires*",

    internshipTitlePlaceholder: "ex. Stagiaire Développeur Frontend",
    companyPlaceholder: "ex. Tech Solutions Inc",
    locationPlaceholder: "ex. Mumbai, Inde",
    categoryPlaceholder: "ex. Développement Logiciel",
    companyPlaceholderText: "Décrivez votre entreprise...",
    internshipPlaceholder: "Décrivez le rôle du stage...",
    eligibilityPlaceholder: "Critères d'éligibilité...",
    perksPlaceholder: "Listez les avantages...",
    openingsPlaceholder: "ex. 5",
    stipendPlaceholder: "ex. ₹15 000/mois",
    additionalPlaceholder: "Informations supplémentaires...",

    fillAll: "Veuillez remplir tous les détails",
    posted: "Stage publié avec succès",
    postError: "Erreur lors de la publication du stage",
    posting: "Publication du stage...",
    postInternship: "Publier le Stage",
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
    aboutInternship: "",
    whoCanApply: "",
    perks: "",
    numberOfOpening: "",
    stipend: "",
    startDate: "",
    additionalInfo: "",
  });

  const handlechange = (e: any) => {
    const { name, value } = e.target;

    setformdata((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const router = useRouter();
  const [isloading, setisloading] = useState(false);

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

      await axios.post(
        "https://internshala-clone-a0st.onrender.com/api/internship",
        formdata
      );

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

          {/* HEADER */}
          <div className="px-6 sm:px-8 py-6 border-b border-gray-200">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {t.title}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {t.subtitle}
            </p>
          </div>

          <form
            className="p-6 sm:p-8 space-y-8"
            onSubmit={handlesubmit}
          >

            {/* BASIC INFORMATION */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Briefcase size={17} className="text-blue-600" />
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
                    {t.internshipTitle}
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
                      placeholder={t.internshipTitlePlaceholder}
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
            </div>

            {/* COMPANY & INTERNSHIP DETAILS */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Building2 size={17} className="text-indigo-600" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {t.companyDetails}
                  </h3>

                  <p className="text-xs text-gray-500">
                    {t.companyDetailsDesc}
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
                    placeholder={t.companyPlaceholderText}
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="aboutInternship"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t.aboutInternship}
                  </label>

                  <textarea
                    id="aboutInternship"
                    required
                    name="aboutInternship"
                    value={formdata.aboutInternship}
                    onChange={handlechange}
                    rows={5}
                    placeholder={t.internshipPlaceholder}
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

              </div>
            </div>

            {/* ADDITIONAL DETAILS */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Users size={17} className="text-purple-600" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {t.additionalDetails}
                  </h3>

                  <p className="text-xs text-gray-500">
                    {t.additionalDetailsDesc}
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
            </div>

            {/* FINAL DETAILS */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Info size={17} className="text-green-600" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {t.finalDetails}
                  </h3>

                  <p className="text-xs text-gray-500">
                    {t.finalDetailsDesc}
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
                      required
                      min="1"
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
                    htmlFor="stipend"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t.stipend}
                  </label>

                  <div className="relative">
                    <IndianRupee
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="stipend"
                      type="text"
                      required
                      name="stipend"
                      value={formdata.stipend}
                      onChange={handlechange}
                      placeholder={t.stipendPlaceholder}
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
            </div>

            {/* SUBMIT */}
            <div className="pt-6 border-t border-gray-200 flex justify-end">
              <button
                type="submit"
                disabled={isloading}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isloading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    {t.posting}
                  </div>
                ) : (
                  t.postInternship
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