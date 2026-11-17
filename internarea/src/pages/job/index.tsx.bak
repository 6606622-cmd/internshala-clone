import React, { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Clock,
  IndianRupee,
  Filter,
  X,
  Briefcase,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { useLanguage } from "../../../context/LanguageContext";
import { useRouter } from "next/router";

const index = () => {
  const { language } = useLanguage();
  const router = useRouter();

  const [jobs, setJobs] = useState<any[]>([]);
  const [filteredjob, setfilteredjobs] = useState<any[]>([]);
  const [isFiltervisible, setIsFiltervisible] = useState(false);

  const [filter, setFilters] = useState({
    category: "",
    location: "",
    workFromHome: false,
    partTime: false,
    salary: 50,
    experience: "",
  });

  const text: any = {
    en: {
      filters: "Filters",
      clearAll: "Clear all",
      category: "Category",
      location: "Location",
      experience: "Experience",
      workFromHome: "Work from home",
      partTime: "Part-time",
      annualSalary: "Annual Salary (₹ in lakhs)",
      hideFilters: "Hide Filters",
      showFilters: "Show Filters",
      jobsFound: "Jobs Found",
      activelyHiring: "Actively Hiring",
      ctc: "CTC",
      jobs: "Jobs",
      postedRecently: "Posted recently",
      viewDetails: "View Details",
      categoryPlaceholder: "e.g. Engineering",
      locationPlaceholder: "e.g. Mumbai",
      experiencePlaceholder: "e.g. 2+ years",
    },

    es: {
      filters: "Filtros",
      clearAll: "Borrar todo",
      category: "Categoría",
      location: "Ubicación",
      experience: "Experiencia",
      workFromHome: "Trabajo desde casa",
      partTime: "Medio tiempo",
      annualSalary: "Salario anual (₹ en lakhs)",
      hideFilters: "Ocultar filtros",
      showFilters: "Mostrar filtros",
      jobsFound: "Empleos encontrados",
      activelyHiring: "Contratando activamente",
      ctc: "CTC",
      jobs: "Empleos",
      postedRecently: "Publicado recientemente",
      viewDetails: "Ver detalles",
      categoryPlaceholder: "ej. Ingeniería",
      locationPlaceholder: "ej. Mumbai",
      experiencePlaceholder: "ej. 2+ años",
    },

    hi: {
      filters: "फ़िल्टर",
      clearAll: "सभी साफ़ करें",
      category: "श्रेणी",
      location: "स्थान",
      experience: "अनुभव",
      workFromHome: "घर से काम",
      partTime: "पार्ट-टाइम",
      annualSalary: "वार्षिक वेतन (₹ लाख में)",
      hideFilters: "फ़िल्टर छिपाएँ",
      showFilters: "फ़िल्टर दिखाएँ",
      jobsFound: "नौकरियाँ मिलीं",
      activelyHiring: "सक्रिय रूप से भर्ती",
      ctc: "CTC",
      jobs: "नौकरियाँ",
      postedRecently: "हाल ही में पोस्ट किया गया",
      viewDetails: "विवरण देखें",
      categoryPlaceholder: "जैसे इंजीनियरिंग",
      locationPlaceholder: "जैसे मुंबई",
      experiencePlaceholder: "जैसे 2+ वर्ष",
    },

    pt: {
      filters: "Filtros",
      clearAll: "Limpar tudo",
      category: "Categoria",
      location: "Localização",
      experience: "Experiência",
      workFromHome: "Trabalho remoto",
      partTime: "Meio período",
      annualSalary: "Salário anual (₹ em lakhs)",
      hideFilters: "Ocultar filtros",
      showFilters: "Mostrar filtros",
      jobsFound: "Vagas encontradas",
      activelyHiring: "Contratando ativamente",
      ctc: "CTC",
      jobs: "Vagas",
      postedRecently: "Publicado recentemente",
      viewDetails: "Ver detalhes",
      categoryPlaceholder: "ex. Engenharia",
      locationPlaceholder: "ex. Mumbai",
      experiencePlaceholder: "ex. 2+ anos",
    },

    zh: {
      filters: "筛选",
      clearAll: "清除全部",
      category: "类别",
      location: "地点",
      experience: "经验",
      workFromHome: "在家工作",
      partTime: "兼职",
      annualSalary: "年薪（₹，以十万为单位）",
      hideFilters: "隐藏筛选",
      showFilters: "显示筛选",
      jobsFound: "找到的职位",
      activelyHiring: "正在招聘",
      ctc: "CTC",
      jobs: "职位",
      postedRecently: "最近发布",
      viewDetails: "查看详情",
      categoryPlaceholder: "例如：工程",
      locationPlaceholder: "例如：孟买",
      experiencePlaceholder: "例如：2年以上",
    },

    fr: {
      filters: "Filtres",
      clearAll: "Tout effacer",
      category: "Catégorie",
      location: "Lieu",
      experience: "Expérience",
      workFromHome: "Travail à domicile",
      partTime: "Temps partiel",
      annualSalary: "Salaire annuel (₹ en lakhs)",
      hideFilters: "Masquer les filtres",
      showFilters: "Afficher les filtres",
      jobsFound: "Emplois trouvés",
      activelyHiring: "Recrutement actif",
      ctc: "CTC",
      jobs: "Emplois",
      postedRecently: "Publié récemment",
      viewDetails: "Voir les détails",
      categoryPlaceholder: "ex. Ingénierie",
      locationPlaceholder: "ex. Mumbai",
      experiencePlaceholder: "ex. 2+ ans",
    },
  };

  const t = text[language] || text.en;

  // Fetch jobs
  useEffect(() => {
    const fetchdata = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/job"
        );

        setJobs(res.data);
        setfilteredjobs(res.data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchdata();
  }, []);

  // Search + Filters
  useEffect(() => {
    const search =
      typeof router.query.search === "string"
        ? router.query.search.toLowerCase().trim()
        : "";

    const filtered = jobs.filter((job: any) => {
      // Navbar search
      const matchesSearch =
        !search ||
        job.title?.toLowerCase().includes(search) ||
        job.company?.toLowerCase().includes(search) ||
        job.category?.toLowerCase().includes(search) ||
        job.location?.toLowerCase().includes(search) ||
        job.Experience?.toLowerCase().includes(search);

      // Category filter
      const matchesCategory =
        !filter.category ||
        job.category
          ?.toLowerCase()
          .includes(filter.category.toLowerCase());

      // Location filter
      const matchesLocation =
        !filter.location ||
        job.location
          ?.toLowerCase()
          .includes(filter.location.toLowerCase());

      // Experience filter
      const matchesExperience =
        !filter.experience ||
        job.Experience
          ?.toLowerCase()
          .includes(filter.experience.toLowerCase());

      // Work from home
      const matchesWorkFromHome =
        !filter.workFromHome ||
        job.workFromHome === true;

      // Part time
      const matchesPartTime =
        !filter.partTime ||
        job.partTime === true;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesLocation &&
        matchesExperience &&
        matchesWorkFromHome &&
        matchesPartTime
      );
    });

    setfilteredjobs(filtered);
  }, [filter, jobs, router.query.search]);

  // Filter change
  const handleFilterChange = (e: any) => {
    const { name, value, type, checked } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Clear filters and search
  const clearFilters = () => {
    setFilters({
      category: "",
      location: "",
      workFromHome: false,
      partTime: false,
      salary: 50,
      experience: "",
    });

    router.push("/job", undefined, {
      shallow: true,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="flex flex-col md:flex-row gap-8">

          {/* Desktop Filter */}
          <div
            className={`${isFiltervisible ? "block" : "hidden"
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

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.category}
                </label>

                <input
                  type="text"
                  name="category"
                  value={filter.category}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t.categoryPlaceholder}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.location}
                </label>

                <input
                  type="text"
                  name="location"
                  value={filter.location}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t.locationPlaceholder}
                />
              </div>

              {/* Experience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.experience}
                </label>

                <input
                  type="text"
                  name="experience"
                  value={filter.experience}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t.experiencePlaceholder}
                />
              </div>

              {/* Checkboxes */}
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

              {/* Salary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.annualSalary}
                </label>

                <input
                  type="range"
                  name="salary"
                  min="0"
                  max="100"
                  value={filter.salary}
                  onChange={handleFilterChange}
                  className="w-full"
                />

                <div className="flex justify-between text-sm text-gray-600">
                  <span>₹0L</span>
                  <span>₹50L</span>
                  <span>₹100L</span>
                </div>
              </div>

            </div>
          </div>

          {/* Job Content */}
          <div className="flex-1">

            {/* Mobile Filter Button */}
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

            {/* Results Count */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
              <p className="text-center font-medium text-black">
                {filteredjob.length} {t.jobsFound}
              </p>
            </div>

            {/* Job Cards */}
            <div className="space-y-4">

              {filteredjob.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <p className="text-gray-500">
                    {t.noJobsFound}
                  </p>
                </div>
              ) : (
                filteredjob.map((job: any) => (
                  <div
                    key={job._id}
                    className="bg-white rounded-lg shadow-sm p-6"
                  >

                    {/* Hiring Status */}
                    <div className="flex items-center space-x-2 text-blue-600 mb-4">
                      <ArrowUpRight className="h-5 w-5" />

                      <span>
                        {t.activelyHiring}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {job.title}
                    </h2>

                    {/* Company */}
                    <p className="text-gray-600 mb-4">
                      {job.company}
                    </p>

                    {/* Job Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                      {/* Location */}
                      <div className="flex items-center space-x-2 text-gray-600">
                        <MapPin className="h-5 w-5" />

                        <div>
                          <p className="text-sm font-medium">
                            {t.location}
                          </p>

                          <p className="text-sm">
                            {job.location}
                          </p>
                        </div>
                      </div>

                      {/* Salary / CTC */}
                      <div className="flex items-center space-x-2 text-gray-600">
                        <IndianRupee className="h-5 w-5" />

                        <div>
                          <p className="text-sm font-medium">
                            {t.ctc}
                          </p>

                          <p className="text-sm">
                            {job.CTC}
                          </p>
                        </div>
                      </div>

                      {/* Category */}
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Briefcase className="h-5 w-5" />

                        <div>
                          <p className="text-sm font-medium">
                            {t.category}
                          </p>

                          <p className="text-sm">
                            {job.category}
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Bottom Section */}
                    <div className="flex items-center justify-between border-t pt-4">

                      <div className="flex items-center space-x-4">

                        <span className="text-sm text-gray-600">
                          {t.jobs}
                        </span>

                        <div className="flex items-center space-x-1 text-gray-500">
                          <Clock className="h-4 w-4" />

                          <span className="text-sm">
                            {t.postedRecently}
                          </span>
                        </div>

                      </div>

                      {/* Job Detail */}
                      <Link
                        href={`/detailjob/${job._id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {t.viewDetails}
                      </Link>

                    </div>

                  </div>
                ))
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filters */}
      {isFiltervisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">

          <div className="bg-white h-full w-full max-w-sm ml-auto p-6 overflow-y-auto">

            <div className="flex justify-between items-center mb-6">

              <h2 className="text-lg font-bold">
                {t.filters}
              </h2>

              <button
                onClick={() => setIsFiltervisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>

            </div>

            <div className="space-y-6">

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.category}
                </label>

                <input
                  type="text"
                  name="category"
                  value={filter.category}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t.categoryPlaceholder}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.location}
                </label>

                <input
                  type="text"
                  name="location"
                  value={filter.location}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t.locationPlaceholder}
                />
              </div>

              {/* Experience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.experience}
                </label>

                <input
                  type="text"
                  name="experience"
                  value={filter.experience}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder={t.experiencePlaceholder}
                />
              </div>

              {/* Checkboxes */}
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

              {/* Salary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.annualSalary}
                </label>

                <input
                  type="range"
                  name="salary"
                  min="0"
                  max="100"
                  value={filter.salary}
                  onChange={handleFilterChange}
                  className="w-full"
                />

                <div className="flex justify-between text-sm text-gray-600">
                  <span>₹0L</span>
                  <span>₹50L</span>
                  <span>₹100L</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default index;