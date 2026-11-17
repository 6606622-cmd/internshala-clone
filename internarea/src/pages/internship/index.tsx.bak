import {
  ArrowUpRight,
  Clock,
  Filter,
  IndianRupee,
  Pin,
  PlayCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useLanguage } from "../../../context/LanguageContext";
import { useRouter } from "next/router";

const text = {
  en: {
    filters: "Filters",
    clearAll: "Clear all",
    category: "Category",
    location: "Location",
    categoryPlaceholder: "e.g. Marketing Intern",
    locationPlaceholder: "e.g. Mumbai",
    workFromHome: "Work from home",
    partTime: "Part-time",
    monthlyStipend: "Monthly Stipend (₹)",
    internshipsFound: "Internships Found",
    hideFilters: "Hide Filters",
    showFilters: "Show Filters",
    activelyHiring: "Actively Hiring",
    startDate: "Start Date",
    stipend: "Stipend",
    internship: "Internship",
    postedRecently: "Posted recently",
    viewDetails: "View Details",
    noInternshipsFound: "No internships found",
  },

  es: {
    filters: "Filtros",
    clearAll: "Borrar todo",
    category: "Categoría",
    location: "Ubicación",
    categoryPlaceholder: "ej. Pasantía de Marketing",
    locationPlaceholder: "ej. Mumbai",
    workFromHome: "Trabajo desde casa",
    partTime: "Medio tiempo",
    monthlyStipend: "Estipendio mensual (₹)",
    internshipsFound: "Pasantías encontradas",
    hideFilters: "Ocultar filtros",
    showFilters: "Mostrar filtros",
    activelyHiring: "Contratando activamente",
    startDate: "Fecha de inicio",
    stipend: "Estipendio",
    internship: "Pasantía",
    postedRecently: "Publicado recientemente",
    viewDetails: "Ver detalles",
    noInternshipsFound: "No se encontraron pasantías",
  },

  hi: {
    filters: "फ़िल्टर",
    clearAll: "सभी साफ़ करें",
    category: "श्रेणी",
    location: "स्थान",
    categoryPlaceholder: "जैसे मार्केटिंग इंटर्न",
    locationPlaceholder: "जैसे मुंबई",
    workFromHome: "घर से काम",
    partTime: "पार्ट-टाइम",
    monthlyStipend: "मासिक स्टाइपेंड (₹)",
    internshipsFound: "इंटर्नशिप मिलीं",
    hideFilters: "फ़िल्टर छिपाएँ",
    showFilters: "फ़िल्टर दिखाएँ",
    activelyHiring: "सक्रिय रूप से भर्ती",
    startDate: "शुरुआत की तारीख",
    stipend: "स्टाइपेंड",
    internship: "इंटर्नशिप",
    postedRecently: "हाल ही में पोस्ट किया गया",
    viewDetails: "विवरण देखें",
    noInternshipsFound: "कोई इंटर्नशिप नहीं मिली",
  },

  pt: {
    filters: "Filtros",
    clearAll: "Limpar tudo",
    category: "Categoria",
    location: "Localização",
    categoryPlaceholder: "ex. Estágio de Marketing",
    locationPlaceholder: "ex. Mumbai",
    workFromHome: "Trabalho remoto",
    partTime: "Meio período",
    monthlyStipend: "Bolsa mensal (₹)",
    internshipsFound: "Estágios encontrados",
    hideFilters: "Ocultar filtros",
    showFilters: "Mostrar filtros",
    activelyHiring: "Contratando ativamente",
    startDate: "Data de início",
    stipend: "Bolsa",
    internship: "Estágio",
    postedRecently: "Publicado recentemente",
    viewDetails: "Ver detalhes",
    noInternshipsFound: "Nenhum estágio encontrado",
  },

  zh: {
    filters: "筛选",
    clearAll: "清除全部",
    category: "类别",
    location: "地点",
    categoryPlaceholder: "例如：市场营销实习",
    locationPlaceholder: "例如：孟买",
    workFromHome: "在家工作",
    partTime: "兼职",
    monthlyStipend: "月津贴（₹）",
    internshipsFound: "找到的实习职位",
    hideFilters: "隐藏筛选",
    showFilters: "显示筛选",
    activelyHiring: "正在招聘",
    startDate: "开始日期",
    stipend: "津贴",
    internship: "实习",
    postedRecently: "最近发布",
    viewDetails: "查看详情",
    noInternshipsFound: "未找到实习",
  },

  fr: {
    filters: "Filtres",
    clearAll: "Tout effacer",
    category: "Catégorie",
    location: "Lieu",
    categoryPlaceholder: "ex. Stage en marketing",
    locationPlaceholder: "ex. Mumbai",
    workFromHome: "Travail à domicile",
    partTime: "Temps partiel",
    monthlyStipend: "Indemnité mensuelle (₹)",
    internshipsFound: "Stages trouvés",
    hideFilters: "Masquer les filtres",
    showFilters: "Afficher les filtres",
    activelyHiring: "Recrutement actif",
    startDate: "Date de début",
    stipend: "Indemnité",
    internship: "Stage",
    postedRecently: "Publié récemment",
    viewDetails: "Voir les détails",
    noInternshipsFound: "Aucun stage trouvé",
  },
};

const Index = () => {
  const { language } = useLanguage();
  const router = useRouter();

  const t = text[language] || text.en;

  const [filteredInternships, setFilteredInternships] = useState<any[]>([]);
  const [internshipsData, setinternship] = useState<any[]>([]);
  const [isFiltervisible, setIsFiltervisible] = useState(false);

  const [filter, setFilters] = useState({
    category: "",
    location: "",
    workFromHome: false,
    partTime: false,
    stipend: 20000,
  });

  useEffect(() => {
    const fetchdata = async () => {
      try {
        const res = await axios.get(
          "https://internshala-clone-a0st.onrender.com/api/internship"
        );

        setinternship(res.data);
        setFilteredInternships(res.data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchdata();
  }, []);

  useEffect(() => {
    const search =
      typeof router.query.search === "string"
        ? router.query.search.toLowerCase().trim()
        : "";

    const filtered = internshipsData.filter((internship: any) => {
      const matchesSearch =
        !search ||
        internship.title?.toLowerCase().includes(search) ||
        internship.company?.toLowerCase().includes(search) ||
        internship.category?.toLowerCase().includes(search) ||
        internship.location?.toLowerCase().includes(search);

      const matchesCategory =
        !filter.category ||
        internship.category
          ?.toLowerCase()
          .includes(filter.category.toLowerCase());

      const matchesLocation =
        !filter.location ||
        internship.location
          ?.toLowerCase()
          .includes(filter.location.toLowerCase());

      const stipendNumber =
        parseInt(
          String(internship.stipend || "").replace(/[^0-9]/g, ""),
          10
        ) || 0;

      const matchesStipend =
        stipendNumber <= filter.stipend || !internship.stipend;

      const textData = `${internship.title || ""} ${
        internship.aboutInternship || ""
      } ${internship.additionalInfo || ""}`.toLowerCase();

      const matchesWorkFromHome =
        !filter.workFromHome ||
        textData.includes("work from home") ||
        textData.includes("remote") ||
        textData.includes("घर से काम") ||
        textData.includes("remoto");

      const matchesPartTime =
        !filter.partTime ||
        textData.includes("part-time") ||
        textData.includes("part time") ||
        textData.includes("parttime") ||
        textData.includes("medio tiempo") ||
        textData.includes("兼职");

      return (
        matchesSearch &&
        matchesCategory &&
        matchesLocation &&
        matchesStipend &&
        matchesWorkFromHome &&
        matchesPartTime
      );
    });

    setFilteredInternships(filtered);
  }, [filter, internshipsData, router.query.search]);

  const handleFilterChange = (e: any) => {
    const { name, value, type, checked } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : Number(value),
    }));
  };

  const handleTextFilterChange = (e: any) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      location: "",
      workFromHome: false,
      partTime: false,
      stipend: 20000,
    });

    router.push("/internship", undefined, {
      shallow: true,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">

          {/* FILTERS */}
          <div
            className={`${
              isFiltervisible ? "block" : "hidden"
            } md:block w-full md:w-64 bg-white rounded-lg shadow-sm p-6 h-fit`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-blue-600" />

                <span className="font-medium text-black">
                  {t.filters}
                </span>
              </div>

              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {t.clearAll}
              </button>
            </div>

            <div className="space-y-6">

              {/* CATEGORY */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.category}
                </label>

                <input
                  type="text"
                  name="category"
                  value={filter.category}
                  onChange={handleTextFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t.categoryPlaceholder}
                />
              </div>

              {/* LOCATION */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.location}
                </label>

                <input
                  type="text"
                  name="location"
                  value={filter.location}
                  onChange={handleTextFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t.locationPlaceholder}
                />
              </div>

              {/* WORK FROM HOME / PART TIME */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="workFromHome"
                    checked={filter.workFromHome}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 rounded"
                  />

                  <span className="text-gray-700">
                    {t.workFromHome}
                  </span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="partTime"
                    checked={filter.partTime}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 rounded"
                  />

                  <span className="text-gray-700">
                    {t.partTime}
                  </span>
                </label>
              </div>

              {/* STIPEND */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.monthlyStipend}
                </label>

                <input
                  type="range"
                  name="stipend"
                  min="0"
                  max="20000"
                  step="1000"
                  value={filter.stipend}
                  onChange={handleFilterChange}
                  className="w-full"
                />

                <div className="flex justify-between text-sm text-gray-600">
                  <span>₹0</span>
                  <span>₹10K</span>
                  <span>₹20K</span>
                </div>
              </div>
            </div>
          </div>

          {/* RESULTS */}
          <div className="flex-1">

            {/* MOBILE FILTER */}
            <div className="md:hidden mb-4">
              <button
                onClick={() =>
                  setIsFiltervisible(!isFiltervisible)
                }
                className="flex items-center space-x-2 text-blue-600 w-full justify-center bg-white p-3 rounded-lg shadow-sm"
              >
                <Filter className="h-5 w-5" />

                <span>
                  {isFiltervisible
                    ? t.hideFilters
                    : t.showFilters}
                </span>
              </button>
            </div>

            {/* COUNT */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
              <p className="text-center font-medium text-black">
                {filteredInternships.length}{" "}
                {t.internshipsFound}
              </p>
            </div>

            {/* INTERNSHIPS */}
            <div className="space-y-4">
              {filteredInternships.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <p className="text-gray-500">
                    {t.noInternshipsFound}
                  </p>
                </div>
              ) : (
                filteredInternships.map(
                  (internship: any) => (
                    <div
                      key={internship._id}
                      className="bg-white rounded-lg shadow-sm p-6"
                    >
                      <div className="flex items-center space-x-2 text-blue-600 mb-4">
                        <ArrowUpRight className="h-5 w-5" />

                        <span>
                          {t.activelyHiring}
                        </span>
                      </div>

                      <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {internship.title}
                      </h2>

                      <p className="text-gray-600 mb-4">
                        {internship.company}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                        {/* START DATE */}
                        <div className="flex items-center space-x-2 text-gray-600">
                          <PlayCircle className="h-5 w-5" />

                          <div>
                            <p className="text-sm font-medium">
                              {t.startDate}
                            </p>

                            <p className="text-sm">
                              {internship.startDate
                                ? new Date(
                                    internship.startDate
                                  ).toLocaleDateString()
                                : "-"}
                            </p>
                          </div>
                        </div>

                        {/* LOCATION */}
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Pin className="h-5 w-5" />

                          <div>
                            <p className="text-sm font-medium">
                              {t.location}
                            </p>

                            <p className="text-sm">
                              {internship.location}
                            </p>
                          </div>
                        </div>

                        {/* STIPEND */}
                        <div className="flex items-center space-x-2 text-gray-600">
                          <IndianRupee className="h-5 w-5" />

                          <div>
                            <p className="text-sm font-medium">
                              {t.stipend}
                            </p>

                            <p className="text-sm">
                              {internship.stipend}
                            </p>
                          </div>
                        </div>

                      </div>

                      <div className="flex items-center justify-between border-t pt-4">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">
                            {t.internship}
                          </span>

                          <div className="flex items-center space-x-1 text-gray-500">
                            <Clock className="h-4 w-4" />

                            <span className="text-sm">
                              {t.postedRecently}
                            </span>
                          </div>
                        </div>

                        <Link
                          href={`/detailinternship/${internship._id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {t.viewDetails}
                        </Link>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;