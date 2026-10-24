import axios from "axios";
import { auth } from "@/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  Building2,
  Calendar,
  FileText,
  Loader2,
  Mail,
  Phone,
  Tag,
  User,
  Hash,
} from "lucide-react";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const Index = () => {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setloading] = useState(false);
  const [data, setdata] = useState<any>(null);

  useEffect(() => {
    if (!router.isReady || !id || Array.isArray(id)) return;

    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setdata(null);
        setloading(false);
        console.error("Firebase session has no signed-in user.");
        return;
      }

      try {
        setloading(true);

        const token = await currentUser.getIdToken();

        const res = await axios.get(
          `http://localhost:5000/api/application/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!cancelled) {
          console.log("Application response:", res.data);
          setdata(res.data);
        }
      } catch (error: any) {
        if (!cancelled) {
          setdata(null);
          console.error(
            "Application fetch failed:",
            error.response?.status,
            error.response?.data || error.message
          );
        }
      } finally {
        if (!cancelled) setloading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router.isReady, id]);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">
          Loading application details...
        </span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Application not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* Header */}
          <div className="bg-blue-600 px-8 py-6 text-white">
            <h1 className="text-2xl font-bold">
              Application Details
            </h1>
            <p className="text-blue-100 mt-1">
              Review applicant information and application details
            </p>
          </div>

          <div className="p-8">

            {/* Applicant */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b">
              {data.user?.photo ? (
                <img
                  src={data.user.photo}
                  alt="Applicant"
                  className="w-28 h-28 rounded-full object-cover border-4 border-blue-100"
                />
              ) : (
                <div className="w-28 h-28 rounded-full border-4 border-blue-100 bg-blue-50 flex items-center justify-center">
                  <User className="w-12 h-12 text-blue-600" />
                </div>
              )}

              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold text-gray-900">
                  {data.user?.name || "N/A"}
                </h2>

                <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600 mt-2">
                  <Mail className="w-4 h-4" />
                  <span>{data.user?.email || "N/A"}</span>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600 mt-2">
                  <Phone className="w-4 h-4" />
                  <span>{data.user?.phoneNumber || "Not provided"}</span>
                </div>
              </div>

              {/* Status */}
              <div className="sm:ml-auto">
                <span
                  className={`inline-block px-5 py-2 rounded-full font-semibold capitalize ${data.status === "accepted"
                    ? "bg-green-100 text-green-700"
                    : data.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                    }`}
                >
                  {data.status || "pending"}
                </span>
              </div>
            </div>

            {/* Application Information */}
            <div className="py-8 border-b">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Application Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Company */}
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-blue-600 mt-1" />

                  <div>
                    <p className="text-sm text-gray-500">
                      Company
                    </p>
                    <p className="font-semibold text-gray-900">
                      {data.company || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Category */}
                <div className="flex items-start gap-3">
                  <Tag className="w-5 h-5 text-blue-600 mt-1" />

                  <div>
                    <p className="text-sm text-gray-500">
                      Category
                    </p>
                    <p className="font-semibold text-gray-900">
                      {data.category || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Application Date */}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-600 mt-1" />

                  <div>
                    <p className="text-sm text-gray-500">
                      Application Date
                    </p>

                    <p className="font-semibold text-gray-900">
                      {data.createdAt
                        ? new Date(data.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Application ID */}
                <div className="flex items-start gap-3">
                  <Hash className="w-5 h-5 text-blue-600 mt-1" />

                  <div>
                    <p className="text-sm text-gray-500">
                      Application ID
                    </p>

                    <p className="font-semibold text-gray-900 break-all">
                      {data._id || "N/A"}
                    </p>
                  </div>
                </div>

                {/* User ID */}
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-blue-600 mt-1" />

                  <div>
                    <p className="text-sm text-gray-500">
                      Applicant ID
                    </p>

                    <p className="font-semibold text-gray-900 break-all">
                      {data.user?.uid || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Application Reference */}
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-1" />

                  <div>
                    <p className="text-sm text-gray-500">
                      Application Reference
                    </p>

                    <p className="font-semibold text-gray-900 break-all">
                      {data.Application || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cover Letter */}
            <div className="pt-8">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-6 h-6 text-blue-600" />

                <h2 className="text-xl font-bold text-gray-900">
                  Cover Letter
                </h2>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <p className="text-gray-700 leading-7 whitespace-pre-line">
                  {data.coverLetter || "No cover letter provided."}
                </p>
              </div>
            </div>


            {/* Submitted Resume */}
            <div className="mt-6 border-t pt-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Submitted Resume
              </h2>

              <p className="mt-2 text-gray-600">
                {data.resumeTitle || "Submitted Resume"}
              </p>

              {data.resumePdfUrl ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const currentUser = auth.currentUser;

                      if (!currentUser || !data.resumePdfUrl) {
                        alert("Please log in and try again.");
                        return;
                      }

                      const token = await currentUser.getIdToken();

                      const downloadUrl =
                        `http://localhost:5000/api/resume/application/${id}/download`;
                      const response = await axios.get(downloadUrl, {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                        responseType: "blob",
                      });

                      const blobUrl = URL.createObjectURL(response.data);
                      const link = document.createElement("a");

                      link.href = blobUrl;
                      link.download = `${(data.resumeTitle || "submitted-resume")
                        .replace(/[<>:"/\\|?*]/g, "_")}.pdf`;

                      document.body.appendChild(link);
                      link.click();
                      link.remove();

                      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
                    } catch (error: any) {
                      console.error(
                        "Resume download failed:",
                        error.response?.status,
                        error.message
                      );

                      if (error.response?.status === 404) {
                        alert(
                          "Resume not found for this account. Check the application and resume ownership in the backend."
                        );
                      } else {
                        alert("Unable to download the resume. Please try again.");
                      }
                    }
                  }}
                  className="mt-3 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Download Resume PDF
                </button>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  Resume PDF is not available.
                </p>
              )}
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;