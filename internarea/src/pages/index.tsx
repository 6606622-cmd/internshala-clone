
import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import {
  ArrowUpRight,
  ChevronRight,
  MapPin,
  Banknote,
  Calendar,
  Briefcase,
  Search,
  FileText,
  Sparkles,
  GraduationCap,
} from "lucide-react";

import Link from "next/link";
import axios from "axios";
import { useLanguage } from "../../context/LanguageContext";

type Category = {
  value: string;
  label: string;
};

export default function SvgSlider() {
  const { t } = useLanguage();

  const [internships, setInternships] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);

  const categories: Category[] = [
    { value: "Big Brands", label: t.homeCategoryBigBrands },
    { value: "Work From Home", label: t.homeCategoryRemote },
    { value: "Part-time", label: t.homeCategoryPartTime },
    { value: "MBA", label: t.homeCategoryMBA },
    { value: "Engineering", label: t.homeCategoryEngineering },
    { value: "Media", label: t.homeCategoryMedia },
    { value: "Design", label: t.homeCategoryDesign },
    { value: "Data Science", label: t.homeCategoryDataScience },
  ];

  const slides = [
    {
      title: t.homeSlideOne,
      subtitle: t.homeSlideOneSubtitle,
      bg: "from-indigo-700 via-blue-700 to-indigo-900",
    },
    {
      title: t.homeSlideTwo,
      subtitle: t.homeSlideTwoSubtitle,
      bg: "from-blue-700 via-cyan-700 to-blue-900",
    },
    {
      title: t.homeSlideThree,
      subtitle: t.homeSlideThreeSubtitle,
      bg: "from-purple-700 via-violet-700 to-indigo-900",
    },
    {
      title: t.homeSlideFour,
      subtitle: t.homeSlideFourSubtitle,
      bg: "from-teal-700 via-emerald-700 to-teal-900",
    },
  ];

  const stats = [
    { number: "30K+", label: t.homeStatCompanies },
    { number: "10K+", label: t.homeStatOpenings },
    { number: "21M+", label: t.homeStatStudents },
    { number: "600K+", label: t.homeStatLearners },
  ];

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        const [internshipRes, jobsRes] = await Promise.all([
          axios.get(
            "https://internshala-clone-a0st.onrender.com/api/internship"
          ),
          axios.get(
            "https://internshala-clone-a0st.onrender.com/api/job"
          ),
        ]);

        if (active) {
          setInternships(
            Array.isArray(internshipRes.data)
              ? internshipRes.data
              : []
          );

          setJobs(
            Array.isArray(jobsRes.data) ? jobsRes.data : []
          );
        }
      } catch (error) {
        console.error("Home page data error:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, []);

  const filteredInternships = internships.filter(
    (item) =>
      !selectedCategory ||
      item.category === selectedCategory
  );

  const filteredJobs = jobs.filter(
    (item) =>
      !selectedCategory ||
      item.category === selectedCategory
  );

  return (
    <main className="min-h-screen w-full min-w-0 bg-slate-50">
      <div className="mx-auto w-full min-w-0 max-w-none px-3 py-5 sm:px-6 sm:py-8 lg:px-8 xl:px-10">

        {/* HERO */}
        <section className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-blue-700 to-violet-800 px-4 py-10 text-center text-white shadow-xl sm:mb-12 sm:rounded-3xl sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-cyan-300/10 blur-2xl" />

          <div className="relative mx-auto w-full max-w-3xl">
            <span className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium backdrop-blur sm:mb-6 sm:text-sm">
              <Sparkles size={16} className="shrink-0" />
              {t.homeHeroBadge}
            </span>

            <h1 className="mb-4 break-words text-3xl font-extrabold leading-tight tracking-tight sm:mb-5 sm:text-5xl lg:text-6xl">
              {t.homeHeroTitle}
            </h1>

            <p className="mx-auto mb-6 max-w-2xl break-words text-sm leading-6 text-blue-100 sm:mb-8 sm:text-xl sm:leading-7">
              {t.homeHeroDescription}
            </p>

            <div className="flex w-full flex-col justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/internship"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-indigo-700 shadow-lg transition hover:-translate-y-1 hover:bg-blue-50 sm:w-auto"
              >
                <Search size={19} className="shrink-0" />
                {t.homeExploreInternships}
              </Link>

              <Link
                href="/job"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur transition hover:-translate-y-1 hover:bg-white/20 sm:w-auto"
              >
                {t.homeExploreJobs}
                <ArrowUpRight size={19} className="shrink-0" />
              </Link>
            </div>
          </div>
        </section>

        {/* RESUME BUILDER */}
        <section className="mb-8 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm sm:mb-14 sm:rounded-3xl">
          <div className="grid min-w-0 items-center gap-5 p-5 sm:gap-8 sm:p-10 md:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <span className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 sm:text-sm">
                <FileText size={16} className="shrink-0" />
                {t.homeResumeBadge}
              </span>

              <h2 className="mb-3 break-words text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {t.homeResumeTitle}
              </h2>

              <p className="mb-6 break-words text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                {t.homeResumeDescription}
              </p>

              <Link
                href="/resumebuilder"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-1 hover:bg-blue-700 sm:w-auto sm:text-base"
              >
                {t.homeBuildResume}
                <ArrowUpRight size={19} className="shrink-0" />
              </Link>
            </div>

            <div className="hidden h-36 w-36 items-center justify-center rounded-3xl bg-white text-blue-600 shadow-lg md:flex">
              <FileText size={76} strokeWidth={1.3} />
            </div>
          </div>
        </section>

        {/* SLIDER */}
        <section className="mb-10 min-w-0 sm:mb-16">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={16}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            autoplay={{
              delay: 4500,
              disableOnInteraction: false,
            }}
            loop
            className="home-swiper overflow-hidden rounded-2xl shadow-lg sm:rounded-3xl"
          >
            {slides.map((slide, index) => (
              <SwiperSlide key={index}>
                <div
                  className={`relative flex min-h-[230px] items-center justify-center overflow-hidden bg-gradient-to-br ${slide.bg} px-4 py-9 text-center text-white sm:min-h-[360px] sm:px-6 sm:py-12`}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-10">
                    <div className="absolute -left-10 top-10 h-52 w-52 rounded-full border-[35px] border-white" />
                    <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full border-[45px] border-white" />
                  </div>

                  <div className="relative w-full max-w-3xl">
                    <GraduationCap
                      size={38}
                      className="mx-auto mb-4 text-white/90 sm:mb-5 sm:h-[42px] sm:w-[42px]"
                    />

                    <h2 className="mb-3 break-words text-2xl font-extrabold leading-tight sm:mb-4 sm:text-5xl">
                      {slide.title}
                    </h2>

                    <p className="break-words text-sm leading-6 text-white/85 sm:text-lg sm:leading-7">
                      {slide.subtitle}
                    </p>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        {/* CATEGORIES */}
        <section className="mb-10 min-w-0 sm:mb-14">
          <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:mb-6 sm:flex-row sm:items-end">
            <div className="min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 sm:text-sm">
                {t.homeCategoryEyebrow}
              </span>

              <h2 className="mt-2 break-words text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {t.homeLatestInternships}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCategory("")}
              className="shrink-0 rounded-lg py-1 text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              {t.homeClearFilter}
            </button>
          </div>

          <div className="flex min-w-0 gap-2 overflow-x-auto pb-3 sm:flex-wrap sm:gap-3">
            {categories.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === category.value
                      ? ""
                      : category.value
                  )
                }
                className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                  selectedCategory === category.value
                    ? "border-blue-600 bg-blue-600 text-white shadow-md"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </section>

        {/* INTERNSHIPS */}
        <section className="mb-10 min-w-0 sm:mb-16">
          <div className="mb-5 flex min-w-0 items-center justify-between gap-3 sm:mb-6">
            <h2 className="min-w-0 break-words text-xl font-extrabold text-slate-900 sm:text-3xl">
              {t.homeInternshipSection}
            </h2>

            <Link
              href="/internship"
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-bold text-blue-600 hover:text-blue-800 sm:text-sm"
            >
              {t.homeViewAll}
              <ChevronRight size={18} />
            </Link>
          </div>

          {loading ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm sm:p-8 sm:text-base">
              {t.homeLoading}
            </p>
          ) : filteredInternships.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm sm:p-8 sm:text-base">
              {t.homeNoInternships}
            </p>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredInternships.map((internship, index) => (
                <article
                  key={internship._id || index}
                  className="group min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-sm font-bold text-emerald-600 sm:mb-5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    {t.homeActivelyHiring}
                  </div>

                  <h3 className="mb-2 break-words text-lg font-bold text-slate-900">
                    {internship.title}
                  </h3>

                  <p className="mb-5 break-words text-sm font-medium text-slate-500 sm:text-base">
                    {internship.company}
                  </p>

                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex min-w-0 items-start gap-3">
                      <MapPin size={18} className="mt-0.5 shrink-0 text-blue-600" />
                      <span className="min-w-0 break-words">
                        {internship.location || t.homeNotSpecified}
                      </span>
                    </div>

                    <div className="flex min-w-0 items-start gap-3">
                      <Banknote size={18} className="mt-0.5 shrink-0 text-blue-600" />
                      <span className="min-w-0 break-words">
                        {internship.stipend || t.homeNotSpecified}
                      </span>
                    </div>

                    <div className="flex min-w-0 items-start gap-3">
                      <Calendar size={18} className="mt-0.5 shrink-0 text-blue-600" />
                      <span className="min-w-0 break-words">
                        {internship.startDate ||
                          internship.StartDate ||
                          t.homeNotSpecified}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:mt-6 sm:pt-5">
                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                      {t.homeInternshipTag}
                    </span>

                    <Link
                      href={`/detailinternship/${internship._id}`}
                      className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 transition group-hover:gap-2"
                    >
                      {t.homeViewDetails}
                      <ChevronRight size={17} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* JOBS */}
        <section className="mb-10 min-w-0 sm:mb-16">
          <div className="mb-5 flex min-w-0 items-center justify-between gap-3 sm:mb-6">
            <h2 className="min-w-0 break-words text-xl font-extrabold text-slate-900 sm:text-3xl">
              {t.homeLatestJobs}
            </h2>

            <Link
              href="/job"
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-bold text-blue-600 hover:text-blue-800 sm:text-sm"
            >
              {t.homeViewAll}
              <ChevronRight size={18} />
            </Link>
          </div>

          {loading ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm sm:p-8 sm:text-base">
              {t.homeLoading}
            </p>
          ) : filteredJobs.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm sm:p-8 sm:text-base">
              {t.homeNoJobs}
            </p>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map((job, index) => (
                <article
                  key={job._id || index}
                  className="group min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-sm font-bold text-emerald-600 sm:mb-5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    {t.homeActivelyHiring}
                  </div>

                  <h3 className="mb-2 break-words text-lg font-bold text-slate-900">
                    {job.title}
                  </h3>

                  <p className="mb-5 break-words text-sm font-medium text-slate-500 sm:text-base">
                    {job.company}
                  </p>

                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex min-w-0 items-start gap-3">
                      <MapPin size={18} className="mt-0.5 shrink-0 text-blue-600" />
                      <span className="min-w-0 break-words">
                        {job.location || t.homeNotSpecified}
                      </span>
                    </div>

                    <div className="flex min-w-0 items-start gap-3">
                      <Banknote size={18} className="mt-0.5 shrink-0 text-blue-600" />
                      <span className="min-w-0 break-words">
                        {job.CTC || t.homeNotSpecified}
                      </span>
                    </div>

                    <div className="flex min-w-0 items-start gap-3">
                      <Briefcase size={18} className="mt-0.5 shrink-0 text-blue-600" />
                      <span className="min-w-0 break-words">
                        {job.category || t.homeNotSpecified}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:mt-6 sm:pt-5">
                    <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
                      {t.homeJobTag}
                    </span>

                    <Link
                      href={`/detailjob/${job._id}`}
                      className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 transition group-hover:gap-2"
                    >
                      {t.homeViewDetails}
                      <ChevronRight size={17} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* STATS */}
        <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm sm:mb-10 sm:rounded-3xl sm:p-10">
          <div className="mb-6 text-center sm:mb-8">
            <h2 className="break-words text-2xl font-extrabold text-slate-900 sm:text-3xl">
              {t.homeStatsTitle}
            </h2>

            <p className="mt-2 break-words text-sm leading-6 text-slate-500 sm:text-base">
              {t.homeStatsDescription}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5 sm:gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="min-w-0 text-center">
                <div className="mb-2 break-words text-2xl font-extrabold text-blue-600 sm:text-4xl">
                  {stat.number}
                </div>

                <div className="break-words text-xs font-medium leading-5 text-slate-600 sm:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
