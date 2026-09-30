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

const index = () => {
  const stats = [
    {
      label: "Total Applications",
      value: "2,345",
      change: "+12%",
      changeType: "positive",
    },
    {
      label: "Active Jobs",
      value: "45",
      change: "+3%",
      changeType: "positive",
    },
    {
      label: "Active Internships",
      value: "89",
      change: "+24%",
      changeType: "positive",
    },
    {
      label: "Conversion Rate",
      value: "5.25%",
      change: "-1.3%",
      changeType: "negative",
    },
  ];

  const menuItems = [
    {
      title: "View Applications",
      description:
        "View and manage all applications from candidates",
      icon: Mail,
      link: "/applications",
      color: "bg-blue-600",
      lightColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Post Job",
      description:
        "Create and publish new job opportunities",
      icon: Briefcase,
      link: "/postjob",
      color: "bg-green-600",
      lightColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Post Internship",
      description:
        "Create and manage internship positions",
      icon: Send,
      link: "/postInternship",
      color: "bg-purple-600",
      lightColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      title: "Manage Users",
      description:
        "View and manage user accounts",
      icon: Users,
      link: "/users",
      color: "bg-orange-600",
      lightColor: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      title: "Analytics",
      description:
        "View detailed reports and statistics",
      icon: BarChart,
      link: "/analytics",
      color: "bg-red-600",
      lightColor: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      title: "Settings",
      description:
        "Configure system preferences",
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

        {/* ================= HEADER ================= */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage your jobs, internships, and applications
          </p>
        </div>

        {/* ================= STATS ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-5">

                <div className="flex items-start justify-between gap-4">

                  {/* STAT INFORMATION */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500 truncate">
                      {stat.label}
                    </p>

                    <p className="mt-2 text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>

                  {/* CHANGE */}
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

        {/* ================= QUICK ACTIONS HEADER ================= */}
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Manage your platform from the options below
          </p>
        </div>

        {/* ================= MENU GRID ================= */}
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

                  {/* ICON + ARROW */}
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

                  {/* CONTENT */}
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