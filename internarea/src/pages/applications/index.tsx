
import React, { useCallback, useEffect, useState } from "react";
import {
  Tag,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  Search,
} from "lucide-react";
import axios from "axios";
import { useLanguage } from "../../../context/LanguageContext";
import { auth } from "../../firebase/firebase";

const API_URL = `${
  process.env.NEXT_PUBLIC_API_URL ||
  "https://internshala-clone-a0st.onrender.com"
}/api/application`;

const getStatusColor = (status?: string) => {
  switch ((status || "pending").toLowerCase()) {
    case "approved":
    case "accepted":
      return "bg-green-100 text-green-700 border border-green-200";
    case "rejected":
      return "bg-red-100 text-red-700 border border-red-200";
    default:
      return "bg-yellow-100 text-yellow-700 border border-yellow-200";
  }
};

const Index = () => {
  const { t } = useLanguage();

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    console.log("fetchApplications called");
    setLoading(true);
    setError("");

    try {
      const user = auth.currentUser;

      console.log(
        "Current Firebase user:",
        user?.uid || "NOT LOGGED IN"
      );

      if (!user) {
        setError("Please sign in to your admin account.");
        return;
      }

      const token = await user.getIdToken();

      console.log("Firebase token received:", Boolean(token));

      const res = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Applications API response:", res.status, res.data);

      const applications = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.applications)
        ? res.data.applications
        : [];

      setData(applications);
    } catch (err: any) {
      console.error(
        "Application fetch failed:",
        err.response?.status,
        err.response?.data || err.message
      );

      if (err.response?.status === 401) {
        setError("Authentication failed. Please sign in again.");
      } else if (err.response?.status === 403) {
        setError(
          "Admin access required. Your Firebase account needs admin permission."
        );
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to load applications. Check that your backend is running."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wait for Firebase to determine whether a user is signed in.
    const unsubscribe = auth.onAuthStateChanged(() => {
      fetchApplications();
    });

    return () => unsubscribe();
  }, [fetchApplications]);

  const changeStatus = async (
    id: string,
    action: "accepted" | "rejected"
  ) => {
    try {
      setUpdatingId(id);
      setError("");

      const user = auth.currentUser;

      if (!user) {
        setError("Please sign in again.");
        return;
      }

      const token = await user.getIdToken();

      const res = await axios.put(
        `${API_URL}/${id}`,
        { action },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedApplication = res.data?.data || res.data;

      setData((prev) =>
        prev.map((application) =>
          application._id === id
            ? {
                ...application,
                status:
                  updatedApplication?.status ||
                  action,
              }
            : application
        )
      );
    } catch (err: any) {
      console.error(
        "Update application failed:",
        err.response?.status,
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          "Unable to update application status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredApplications = data.filter((application: any) => {
    const search = searchTerm.toLowerCase();

    const searchMatch =
      application.company?.toLowerCase().includes(search) ||
      application.category?.toLowerCase().includes(search) ||
      application.user?.name?.toLowerCase().includes(search) ||
      application.user?.email?.toLowerCase().includes(search);

    if (filter === "all") return searchMatch;

    const status = (application.status || "pending").toLowerCase();

    if (filter === "approved") {
      return (
        searchMatch &&
        (status === "approved" || status === "accepted")
      );
    }

    return searchMatch && status === filter;
  });

  const statusText = (status?: string) => {
    switch ((status || "pending").toLowerCase()) {
      case "accepted":
      case "approved":
        return t.approved;
      case "rejected":
        return t.rejected;
      default:
        return t.pending;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* HEADER */}
          <div className="px-6 py-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              {t.applications}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t.manageApplications}
            </p>
          </div>

          {/* SEARCH + FILTER */}
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="w-full lg:max-w-md">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t.searchApplications}
                    className="w-full h-10 pl-10 pr-4 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { value: "all", label: t.all },
                  { value: "pending", label: t.pending },
                  { value: "approved", label: t.approved },
                  { value: "rejected", label: t.rejected },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setFilter(item.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      filter === item.value
                        ? item.value === "pending"
                          ? "bg-yellow-500 text-white shadow-sm"
                          : item.value === "approved"
                          ? "bg-green-600 text-white shadow-sm"
                          : item.value === "rejected"
                          ? "bg-red-600 text-white shadow-sm"
                          : "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mx-6 mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{error}</p>
              <button
                onClick={fetchApplications}
                className="mt-2 font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    t.company,
                    t.applicationCategory,
                    t.applicant,
                    t.appliedOn,
                    t.status,
                    t.actions,
                  ].map((heading, index) => (
                    <th
                      key={index}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Loading applications...
                    </td>
                  </tr>
                ) : filteredApplications.length > 0 ? (
                  filteredApplications.map((application: any) => (
                    <tr
                      key={application._id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-5">
                        <p className="text-sm font-semibold text-gray-900">
                          {application.company || "N/A"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {t.applicationId}: {application._id}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                          <Tag className="text-gray-400" size={16} />
                          <span>{application.category || "N/A"}</span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-50 flex items-center justify-center">
                            <User size={18} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {application.user?.name || "N/A"}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {application.user?.email || ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar size={16} className="text-gray-400" />
                          <span>
                            {application.createdAt
                              ? new Date(application.createdAt).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(
                            application.status
                          )}`}
                        >
                          {statusText(application.status)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <a
                            href={`/detailapplication/${application._id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition"
                          >
                            {t.viewDetails}
                          </a>

                          <button
                            type="button"
                            title={t.approve}
                            disabled={updatingId === application._id}
                            onClick={() =>
                              changeStatus(application._id, "accepted")
                            }
                            className="h-9 w-9 flex items-center justify-center rounded-lg text-green-600 bg-green-50 hover:bg-green-100 transition disabled:opacity-50"
                          >
                            <CheckCircle2 size={18} />
                          </button>

                          <button
                            type="button"
                            title={t.reject}
                            disabled={updatingId === application._id}
                            onClick={() =>
                              changeStatus(application._id, "rejected")
                            }
                            className="h-9 w-9 flex items-center justify-center rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition disabled:opacity-50"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Search
                        size={32}
                        className="mx-auto mb-3 text-gray-300"
                      />
                      <p className="text-sm font-medium text-gray-500">
                        {t.noApplicationsFound}
                      </p>
                      <p className="text-xs mt-1 text-gray-400">
                        {t.tryChangingSearch}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {t.showing}{" "}
              <span className="font-medium text-gray-700">
                {filteredApplications.length}
              </span>{" "}
              {filteredApplications.length === 1
                ? t.application
                : t.applicationsPlural}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
