import React from "react";
import {
  Briefcase,
  Mail,
  Send,
  Users,
  BarChart,
  Settings,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "../../../context/LanguageContext";

const text = {
  en: {
    dashboard: "Admin Dashboard",
    dashboardDesc:
      "Manage your jobs, internships, and applications",
    totalApplications: "Total Applications",
    activeJobs: "Active Jobs",
    activeInternships: "Active Internships",
    conversionRate: "Conversion Rate",
    quickActions: "Quick Actions",
    quickActionsDesc:
      "Manage your platform from the options below",

    viewApplications: "View Applications",
    viewApplicationsDesc:
      "View and manage all applications from candidates",

    postJob: "Post Job",
    postJobDesc:
      "Create and publish new job opportunities",

    postInternship: "Post Internship",
    postInternshipDesc:
      "Create and manage internship positions",

    manageUsers: "Manage Users",
    manageUsersDesc:
      "View and manage user accounts",

    analytics: "Analytics",
    analyticsDesc:
      "View detailed reports and statistics",

    settings: "Settings",
    settingsDesc:
      "Configure system preferences",
  },

  es: {
    dashboard: "Panel de Administración",
    dashboardDesc:
      "Administra tus trabajos, pasantías y solicitudes",
    totalApplications: "Solicitudes Totales",
    activeJobs: "Trabajos Activos",
    activeInternships: "Pasantías Activas",
    conversionRate: "Tasa de Conversión",
    quickActions: "Acciones Rápidas",
    quickActionsDesc:
      "Administra tu plataforma desde las siguientes opciones",

    viewApplications: "Ver Solicitudes",
    viewApplicationsDesc:
      "Ver y administrar todas las solicitudes de los candidatos",

    postJob: "Publicar Trabajo",
    postJobDesc:
      "Crear y publicar nuevas oportunidades laborales",

    postInternship: "Publicar Pasantía",
    postInternshipDesc:
      "Crear y administrar puestos de pasantía",

    manageUsers: "Administrar Usuarios",
    manageUsersDesc:
      "Ver y administrar cuentas de usuarios",

    analytics: "Analítica",
    analyticsDesc:
      "Ver informes y estadísticas detalladas",

    settings: "Configuración",
    settingsDesc:
      "Configurar las preferencias del sistema",
  },

  hi: {
    dashboard: "एडमिन डैशबोर्ड",
    dashboardDesc:
      "नौकरियों, इंटर्नशिप और आवेदनों को प्रबंधित करें",
    totalApplications: "कुल आवेदन",
    activeJobs: "सक्रिय नौकरियां",
    activeInternships: "सक्रिय इंटर्नशिप",
    conversionRate: "कन्वर्ज़न दर",
    quickActions: "त्वरित कार्य",
    quickActionsDesc:
      "नीचे दिए गए विकल्पों से अपने प्लेटफ़ॉर्म को प्रबंधित करें",

    viewApplications: "आवेदन देखें",
    viewApplicationsDesc:
      "उम्मीदवारों के सभी आवेदनों को देखें और प्रबंधित करें",

    postJob: "नौकरी पोस्ट करें",
    postJobDesc:
      "नौकरी के नए अवसर बनाएं और प्रकाशित करें",

    postInternship: "इंटर्नशिप पोस्ट करें",
    postInternshipDesc:
      "इंटर्नशिप पद बनाएं और प्रबंधित करें",

    manageUsers: "यूज़र्स प्रबंधित करें",
    manageUsersDesc:
      "यूज़र अकाउंट देखें और प्रबंधित करें",

    analytics: "एनालिटिक्स",
    analyticsDesc:
      "विस्तृत रिपोर्ट और आंकड़े देखें",

    settings: "सेटिंग्स",
    settingsDesc:
      "सिस्टम प्राथमिकताओं को कॉन्फ़िगर करें",
  },

  pt: {
    dashboard: "Painel do Administrador",
    dashboardDesc:
      "Gerencie seus empregos, estágios e candidaturas",
    totalApplications: "Total de Candidaturas",
    activeJobs: "Empregos Ativos",
    activeInternships: "Estágios Ativos",
    conversionRate: "Taxa de Conversão",
    quickActions: "Ações Rápidas",
    quickActionsDesc:
      "Gerencie sua plataforma pelas opções abaixo",

    viewApplications: "Ver Candidaturas",
    viewApplicationsDesc:
      "Veja e gerencie todas as candidaturas dos candidatos",

    postJob: "Publicar Emprego",
    postJobDesc:
      "Crie e publique novas oportunidades de emprego",

    postInternship: "Publicar Estágio",
    postInternshipDesc:
      "Crie e gerencie vagas de estágio",

    manageUsers: "Gerenciar Usuários",
    manageUsersDesc:
      "Veja e gerencie contas de usuários",

    analytics: "Análises",
    analyticsDesc:
      "Veja relatórios e estatísticas detalhadas",

    settings: "Configurações",
    settingsDesc:
      "Configure as preferências do sistema",
  },

  zh: {
    dashboard: "管理员仪表板",
    dashboardDesc:
      "管理您的职位、实习和申请",
    totalApplications: "申请总数",
    activeJobs: "活跃职位",
    activeInternships: "活跃实习",
    conversionRate: "转化率",
    quickActions: "快速操作",
    quickActionsDesc:
      "通过以下选项管理您的平台",

    viewApplications: "查看申请",
    viewApplicationsDesc:
      "查看和管理所有候选人申请",

    postJob: "发布职位",
    postJobDesc:
      "创建并发布新的工作机会",

    postInternship: "发布实习",
    postInternshipDesc:
      "创建和管理实习职位",

    manageUsers: "管理用户",
    manageUsersDesc:
      "查看和管理用户账户",

    analytics: "数据分析",
    analyticsDesc:
      "查看详细报告和统计数据",

    settings: "设置",
    settingsDesc:
      "配置系统偏好设置",
  },

  fr: {
    dashboard: "Tableau de Bord Administrateur",
    dashboardDesc:
      "Gérez vos emplois, stages et candidatures",
    totalApplications: "Total des Candidatures",
    activeJobs: "Emplois Actifs",
    activeInternships: "Stages Actifs",
    conversionRate: "Taux de Conversion",
    quickActions: "Actions Rapides",
    quickActionsDesc:
      "Gérez votre plateforme avec les options ci-dessous",

    viewApplications: "Voir les Candidatures",
    viewApplicationsDesc:
      "Voir et gérer toutes les candidatures des candidats",

    postJob: "Publier un Emploi",
    postJobDesc:
      "Créer et publier de nouvelles opportunités d'emploi",

    postInternship: "Publier un Stage",
    postInternshipDesc:
      "Créer et gérer des postes de stage",

    manageUsers: "Gérer les Utilisateurs",
    manageUsersDesc:
      "Voir et gérer les comptes utilisateurs",

    analytics: "Analyses",
    analyticsDesc:
      "Voir les rapports et statistiques détaillés",

    settings: "Paramètres",
    settingsDesc:
      "Configurer les préférences du système",
  },
};

const index = () => {
  const { language } = useLanguage();

  const t = text[language] || text.en;

  const stats = [
    {
      label: t.totalApplications,
      value: "2,345",
      change: "+12%",
      changeType: "positive",
    },
    {
      label: t.activeJobs,
      value: "45",
      change: "+3%",
      changeType: "positive",
    },
    {
      label: t.activeInternships,
      value: "89",
      change: "+24%",
      changeType: "positive",
    },
    {
      label: t.conversionRate,
      value: "5.25%",
      change: "-1.3%",
      changeType: "negative",
    },
  ];

  const menuItems = [
    {
      title: t.viewApplications,
      description: t.viewApplicationsDesc,
      icon: Mail,
      link: "/applications",
      color: "bg-blue-600",
      lightColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: t.postJob,
      description: t.postJobDesc,
      icon: Briefcase,
      link: "/postjob",
      color: "bg-green-600",
      lightColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: t.postInternship,
      description: t.postInternshipDesc,
      icon: Send,
      link: "/postInternship",
      color: "bg-purple-600",
      lightColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      title: t.manageUsers,
      description: t.manageUsersDesc,
      icon: Users,
      link: "/users",
      color: "bg-orange-600",
      lightColor: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      title: t.analytics,
      description: t.analyticsDesc,
      icon: BarChart,
      link: "/analytics",
      color: "bg-red-600",
      lightColor: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      title: t.settings,
      description: t.settingsDesc,
      icon: Settings,
      link: "/settings",
      color: "bg-gray-600",
      lightColor: "bg-gray-100",
      iconColor: "text-gray-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t.dashboard}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {t.dashboardDesc}
          </p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500 truncate">
                      {stat.label}
                    </p>

                    <p className="mt-2 text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>

                  <div
                    className={`flex items-center gap-1 text-sm font-semibold whitespace-nowrap ${
                      stat.changeType === "positive"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {stat.changeType === "positive" ? (
                      <TrendingUp size={16} />
                    ) : (
                      <TrendingDown size={16} />
                    )}

                    {stat.change}
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>

        {/* QUICK ACTIONS */}
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {t.quickActions}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {t.quickActionsDesc}
          </p>
        </div>

        {/* MENU GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {menuItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <Link
                key={index}
                href={item.link}
                className="group block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200"
              >
                <div className="p-6">

                  <div className="flex items-start justify-between">
                    <div
                      className={`${item.lightColor} h-12 w-12 rounded-xl flex items-center justify-center`}
                    >
                      <Icon
                        className={`h-6 w-6 ${item.iconColor}`}
                      />
                    </div>

                    <ArrowRight
                      className="h-5 w-5 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200"
                    />
                  </div>

                  <div className="mt-5">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      {item.description}
                    </p>
                  </div>

                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default index;