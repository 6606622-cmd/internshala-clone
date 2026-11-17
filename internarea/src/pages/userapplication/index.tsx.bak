import axios from 'axios';
import { Calendar, Search, Tag, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebase';


const getStatusColor = (status: string = "") => {
    switch (status.toLowerCase()) {
        case "accepted":
        case "approved":
            return "bg-green-100 text-green-700 border border-green-200";

        case "rejected":
            return "bg-red-100 text-red-700 border border-red-200";

        default:
            return "bg-yellow-100 text-yellow-700 border border-yellow-200";
    }
};


const index = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("all");

    const { language } = useLanguage();

    const text: any = {
        en: {
            title: "My Applications",
            subtitle: "Track and manage your job and internship applications",
            search: "Search by company, category, or applicant...",
            all: "All",
            pending: "Pending",
            approved: "Approved",
            rejected: "Rejected",
            company: "Company",
            category: "Category",
            applicant: "Applicant",
            appliedOn: "Applied On",
            status: "Status",
            applicationId: "Application ID",
            noApplications: "No applications found",
            tryChanging: "Try changing your search or filter.",
            showing: "Showing",
            application: "application",
            applications: "applications",
        },
        es: {
            title: "Mis solicitudes",
            subtitle: "Realiza un seguimiento y gestiona tus solicitudes de empleo y prácticas",
            search: "Buscar por empresa, categoría o solicitante...",
            all: "Todas",
            pending: "Pendientes",
            approved: "Aprobadas",
            rejected: "Rechazadas",
            company: "Empresa",
            category: "Categoría",
            applicant: "Solicitante",
            appliedOn: "Solicitado el",
            status: "Estado",
            applicationId: "ID de solicitud",
            noApplications: "No se encontraron solicitudes",
            tryChanging: "Intenta cambiar tu búsqueda o filtro.",
            showing: "Mostrando",
            application: "solicitud",
            applications: "solicitudes",
        },
        hi: {
            title: "मेरे आवेदन",
            subtitle: "अपने नौकरी और इंटर्नशिप आवेदनों को ट्रैक और प्रबंधित करें",
            search: "कंपनी, श्रेणी या आवेदक द्वारा खोजें...",
            all: "सभी",
            pending: "लंबित",
            approved: "स्वीकृत",
            rejected: "अस्वीकृत",
            company: "कंपनी",
            category: "श्रेणी",
            applicant: "आवेदक",
            appliedOn: "आवेदन की तारीख",
            status: "स्थिति",
            applicationId: "आवेदन आईडी",
            noApplications: "कोई आवेदन नहीं मिला",
            tryChanging: "अपनी खोज या फ़िल्टर बदलने का प्रयास करें।",
            showing: "दिखाए जा रहे हैं",
            application: "आवेदन",
            applications: "आवेदन",
        },
        pt: {
            title: "Minhas candidaturas",
            subtitle: "Acompanhe e gerencie suas candidaturas a empregos e estágios",
            search: "Pesquisar por empresa, categoria ou candidato...",
            all: "Todas",
            pending: "Pendentes",
            approved: "Aprovadas",
            rejected: "Rejeitadas",
            company: "Empresa",
            category: "Categoria",
            applicant: "Candidato",
            appliedOn: "Candidatou-se em",
            status: "Estado",
            applicationId: "ID da candidatura",
            noApplications: "Nenhuma candidatura encontrada",
            tryChanging: "Tente alterar a sua pesquisa ou filtro.",
            showing: "A mostrar",
            application: "candidatura",
            applications: "candidaturas",
        },
        zh: {
            title: "我的申请",
            subtitle: "跟踪和管理您的工作和实习申请",
            search: "按公司、类别或申请人搜索...",
            all: "全部",
            pending: "待处理",
            approved: "已批准",
            rejected: "已拒绝",
            company: "公司",
            category: "类别",
            applicant: "申请人",
            appliedOn: "申请日期",
            status: "状态",
            applicationId: "申请编号",
            noApplications: "未找到申请",
            tryChanging: "请尝试更改搜索或筛选条件。",
            showing: "显示",
            application: "个申请",
            applications: "个申请",
        },
        fr: {
            title: "Mes candidatures",
            subtitle: "Suivez et gérez vos candidatures à des emplois et des stages",
            search: "Rechercher par entreprise, catégorie ou candidat...",
            all: "Toutes",
            pending: "En attente",
            approved: "Approuvées",
            rejected: "Rejetées",
            company: "Entreprise",
            category: "Catégorie",
            applicant: "Candidat",
            appliedOn: "Date de candidature",
            status: "Statut",
            applicationId: "ID de candidature",
            noApplications: "Aucune candidature trouvée",
            tryChanging: "Essayez de modifier votre recherche ou votre filtre.",
            showing: "Affichage de",
            application: "candidature",
            applications: "candidatures",
        },
    };

    const t = text[language] || text.en;



    const [data, setdata] = useState<any[]>([]);

    useEffect(() => {
        let active = true;
        let requestId = 0;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            const thisRequest = ++requestId;

            // Clear data immediately whenever the auth state changes.
            setdata([]);

            if (!currentUser) {
                return;
            }

            try {
                const token = await currentUser.getIdToken();

                const res = await axios.get(
                    "https://internshala-clone-a0st.onrender.com/api/application",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (
                    !active ||
                    thisRequest !== requestId ||
                    auth.currentUser?.uid !== currentUser.uid
                ) {
                    return;
                }

                // Supports both backend response formats:
                // 1. [application, ...]
                // 2. { success: true, applications: [...] }
                const applications = Array.isArray(res.data)
                    ? res.data
                    : Array.isArray(res.data?.applications)
                        ? res.data.applications
                        : [];
                console.table(
                    applications.map((app: any) => ({
                        id: app._id || app.id,
                        company: app.company,
                        status: JSON.stringify(app.status),
                    }))
                );
                setdata(applications);
            } catch (error) {
                if (
                    active &&
                    thisRequest === requestId &&
                    auth.currentUser?.uid === currentUser.uid
                ) {
                    console.error("Error fetching applications:", error);
                    setdata([]);
                }
            }
        });

        return () => {
            active = false;
            unsubscribe();
        };
    }, []);

    const userapplication = data;



    const filteredapplications = userapplication.filter((application: any) => {
        const company = (application.company || "").toLowerCase();
        const category = (application.category || "").toLowerCase();

        const searchMatch =
            company.includes(searchTerm.toLowerCase()) ||
            category.includes(searchTerm.toLowerCase());

        if (filter === "all") return searchMatch;

        const status = String(application.status || "pending")
            .trim()
            .toLowerCase();

        if (filter === "approved") {
            return searchMatch &&
                (status === "accepted" || status === "approved");
        }

        return searchMatch && status === filter;
    });


    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">

                {/* Main Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                    {/* ================= HEADER ================= */}
                    <div className="px-6 py-6 border-b border-gray-200">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {t.title}
                        </h1>

                        <p className="mt-1 text-sm text-gray-500">
                            {t.subtitle}
                        </p>
                    </div>

                    {/* ================= SEARCH & FILTER ================= */}
                    <div className="px-6 py-5 border-b border-gray-200">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                            {/* Search Box */}
                            <div className="w-full lg:max-w-md">
                                <div className="relative">

                                    <Search
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />

                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) =>
                                            setSearchTerm(e.target.value)
                                        }
                                        placeholder={t.search}
                                        className="w-full h-10 pl-10 pr-4 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />

                                </div>
                            </div>

                            {/* Filter Buttons */}
                            <div className="flex flex-wrap items-center gap-2">

                                <button
                                    onClick={() => setFilter("all")}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "all"
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                >
                                    {t.all}
                                </button>

                                <button
                                    onClick={() => setFilter("pending")}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "pending"
                                        ? "bg-yellow-500 text-white shadow-sm"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                >
                                    {t.pending}
                                </button>

                                <button
                                    onClick={() => setFilter("approved")}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "approved"
                                        ? "bg-green-600 text-white shadow-sm"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                >
                                    {t.approved}
                                </button>

                                <button
                                    onClick={() => setFilter("rejected")}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "rejected"
                                        ? "bg-red-600 text-white shadow-sm"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                >
                                    {t.rejected}
                                </button>

                            </div>
                        </div>
                    </div>

                    {/* ================= TABLE ================= */}
                    <div className="overflow-x-auto">

                        <table className="w-full min-w-[900px]">

                            {/* TABLE HEADER */}
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>

                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {t.company}
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {t.category}
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {t.applicant}
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {t.appliedOn}
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {t.status}
                                    </th>

                                </tr>
                            </thead>

                            {/* TABLE BODY */}
                            <tbody className="divide-y divide-gray-100 bg-white">

                                {filteredapplications.length > 0 ? (
                                    filteredapplications.map((application: any) => (
                                        <tr
                                            key={application._id}
                                            className="hover:bg-gray-50 transition"
                                        >

                                            {/* COMPANY */}
                                            <td className="px-6 py-5">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {application.company}
                                                    </p>

                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {t.applicationId}: {application._id}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* CATEGORY */}
                                            <td className="px-6 py-5">
                                                <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                                                    <Tag
                                                        className="text-gray-400"
                                                        size={16}
                                                    />

                                                    <span>
                                                        {application.category}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* APPLICANT */}
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">

                                                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-50 flex items-center justify-center">
                                                        <User
                                                            size={18}
                                                            className="text-blue-600"
                                                        />
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {application.user?.name || "Unknown User"}
                                                        </p>

                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                            {application.user?.email || "No email available"}
                                                        </p>
                                                    </div>

                                                </div>
                                            </td>

                                            {/* DATE */}
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">

                                                    <Calendar
                                                        size={16}
                                                        className="text-gray-400"
                                                    />

                                                    <span>
                                                        {application.createdAt || application.createAt
                                                            ? new Date(
                                                                application.createdAt || application.createAt
                                                            ).toLocaleDateString()
                                                            : "N/A"}

                                                    </span>

                                                </div>
                                            </td>

                                            {/* STATUS */}
                                            <td className="px-6 py-5">
                                                <span
                                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(
                                                        application.status
                                                    )}`}
                                                >
                                                    {application.status === "accepted" || application.status === "approved"
                                                        ? t.approved
                                                        : application.status === "rejected"
                                                            ? t.rejected
                                                            : t.pending}
                                                </span>
                                            </td>

                                        </tr>
                                    ))
                                ) : (

                                    /* NO RESULTS */
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-12 text-center"
                                        >
                                            <div className="text-gray-500">

                                                <Search
                                                    size={32}
                                                    className="mx-auto mb-3 text-gray-300"
                                                />

                                                <p className="text-sm font-medium">
                                                    {t.noApplications}
                                                </p>

                                                <p className="text-xs mt-1 text-gray-400">
                                                    {t.tryChanging}
                                                </p>

                                            </div>
                                        </td>
                                    </tr>

                                )}

                            </tbody>
                        </table>

                    </div>

                    {/* ================= FOOTER ================= */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                            {t.showing}{" "}
                            <span className="font-medium text-gray-700">
                                {filteredapplications.length}
                            </span>{" "}
                            {filteredapplications.length !== 1
                                ? t.applications
                                : t.application}
                        </p>
                    </div>

                </div>
            </div>
        </div>
    )
}

export default index