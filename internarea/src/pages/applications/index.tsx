import React, { useEffect, useState } from "react";
import {
  Tag,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  Search,
  Link,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

{/*const Applications = [
  {
    _id: "1",
    company: "Tech Corp",
    category: "Software",
    user: {
      name: "John Doe",
      email: "john@example.com",
    },
    createAt: "2024-03-10T12:00:00Z",
    status: "approved",
  },
  {
    _id: "2",
    company: "Health Solutions",
    category: "Healthcare",
    user: {
      name: "Jane Smith",
      email: "jane@example.com",
    },
    createAt: "2024-03-08T10:30:00Z",
    status: "pending",
  },
  {
    _id: "3",
    company: "EduLearn",
    category: "Education",
    user: {
      name: "Alice Johnson",
      email: "alice@example.com",
    },
    createAt: "2024-03-05T09:15:00Z",
    status: "rejected",
  },
];*/}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
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
  const [data, setdata] = useState<any>([])
  useEffect(() => {
    const fetchdata = async () => {
      try {
        const res = await axios.get("https://internshala-clone-a0st.onrender.com/api/application")
        setdata(res.data)
      } catch (error) {
        console.log(error)
      }
    }
    fetchdata()
  }, [])
  const filteredApplications = data.filter((application: any) => {
    const searchMatch =
      application.company
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      application.category
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      application.user.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    if (filter === "all") return searchMatch;
    return searchMatch && application.status.toLowerCase() === filter;
  });
  const handleacceptandreject = async (id: any, action: any) => {
    try {
      const res = await axios.put(`https://internshala-clone-a0st.onrender.com/api/application/${id}`, { action })
      const updateapplication = data.map((app: any) =>
        app._id === id ? res.data.data : app);
      setdata(updateapplication)
      toast.success("updated successfully")
    } catch (error) {
      console.log(error)
      toast.error("error updating")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {/* ================= HEADER ================= */}
          <div className="px-6 py-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Applications
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage and review all applications
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
                    placeholder="Search by company, category, or applicant..."
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
                  All
                </button>

                <button
                  onClick={() => setFilter("pending")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "pending"
                    ? "bg-yellow-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  Pending
                </button>

                <button
                  onClick={() => setFilter("approved")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "approved"
                    ? "bg-green-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  Approved
                </button>

                <button
                  onClick={() => setFilter("rejected")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "rejected"
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  Rejected
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
                    Company
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Category
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Applicant
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Applied On
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>

                </tr>
              </thead>


              {/* TABLE BODY */}
              <tbody className="divide-y divide-gray-100 bg-white">

                {filteredApplications.length > 0 ? (
                  filteredApplications.map((application: any) => (
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
                            Application ID: {application._id}
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
                              {application.user.name}
                            </p>

                            <p className="text-xs text-gray-500 mt-0.5">
                              {application.user.email}
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
                            {new Date(application.createAt)
                              .toISOString()
                              .split("T")[0]}
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
                          {application.status}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">

                          <a
                            href={`/detailapplication/${application._id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition"
                          >
                            View Details
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              handleacceptandreject(application._id, "accepted")
                              /* Handle approve */
                            }}
                            title="Approve"
                            className="h-9 w-9 flex items-center justify-center rounded-lg text-green-600 bg-green-50 hover:bg-green-100 transition"
                          >
                            <CheckCircle2 size={18} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {          handleacceptandreject(application._id, "rejected")
                              /* Handle reject */
                            }}
                            title="Reject"
                            className="h-9 w-9 flex items-center justify-center rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition"
                          >
                            <XCircle size={18} />
                          </button>

                        </div>
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
                          No applications found
                        </p>

                        <p className="text-xs mt-1 text-gray-400">
                          Try changing your search or filter.
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
              Showing{" "}
              <span className="font-medium text-gray-700">
                {filteredApplications.length}
              </span>{" "}
              application
              {filteredApplications.length !== 1 ? "s" : ""}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default index;