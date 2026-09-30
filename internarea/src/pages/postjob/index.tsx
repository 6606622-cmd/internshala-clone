import React, { useState } from "react";
import {
  Briefcase,
  Building2,
  MapPin,
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

const index = () => {
  const [formdata, setformdata] = useState({
    title: "",
    company: "",
    location: "",
    category: "",
    aboutCompany: "",
    aboutJob: "",
    whoCanApply: "",
    perks: "",
    numberOfOpening: "",
    CTC: "",
    startDate: "",
    additionalInfo: "",
  });

  const router = useRouter();
  const [isloading, setisloading] = useState(false);

  const handlechange = (e: any) => {
    const { name, value } = e.target;

    setformdata((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlesubmit = async (e: any) => {
    e.preventDefault();

    const hasemptyfields = Object.values(formdata).some(
      (val) => !val.trim()
    );

    if (hasemptyfields) {
      toast.error("Please fill in all details");
      return;
    }

    try {
      setisloading(true);

      const res = await axios.post(
        "https://internshala-clone-a0st.onrender.com/api/job",
        formdata
      );

      console.log("JOB DATA:", res.data);

      toast.success("Job posted successfully");
      router.push("/adminpanel");
    } catch (error) {
      console.log(error);
      toast.error("error posting job");
    } finally {
      setisloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          <div className="px-6 sm:px-8 py-6 border-b border-gray-200">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Post New Job
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Create a new job opportunity
            </p>
          </div>

          <form
            className="p-6 sm:p-8 space-y-6"
            onSubmit={handlesubmit}
          >

            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Briefcase size={18} className="text-blue-600" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Basic Information
                  </h3>

                  <p className="text-xs text-gray-500">
                    Enter the basic details of the job
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Job Title*
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
                      placeholder="e.g. Frontend Developer"
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="company"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Company Name*
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
                      placeholder="e.g. Tech Solutions Inc"
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Location*
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
                      placeholder="e.g. Mumbai, India"
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Category*
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
                      placeholder="e.g. Software Development"
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

              </div>
            </section>

            <section className="pt-2">
              <div className="flex items-center gap-3 mb-5">

                <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Building2 size={18} className="text-indigo-600" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Company & Job Details
                  </h3>

                  <p className="text-xs text-gray-500">
                    Tell candidates about the company and job
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>
                  <label
                    htmlFor="aboutCompany"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    About Company*
                  </label>

                  <textarea
                    id="aboutCompany"
                    required
                    name="aboutCompany"
                    value={formdata.aboutCompany}
                    onChange={handlechange}
                    rows={5}
                    placeholder="Describe your company..."
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="aboutJob"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    About Job*
                  </label>

                  <textarea
                    id="aboutJob"
                    required
                    name="aboutJob"
                    value={formdata.aboutJob}
                    onChange={handlechange}
                    rows={5}
                    placeholder="Describe the job role..."
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

              </div>
            </section>

            <section className="pt-2">
              <div className="flex items-center gap-3 mb-5">

                <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Users size={18} className="text-purple-600" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Eligibility & Perks
                  </h3>

                  <p className="text-xs text-gray-500">
                    Define who can apply and what you offer
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>
                  <label
                    htmlFor="whoCanApply"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Who Can Apply*
                  </label>

                  <textarea
                    id="whoCanApply"
                    required
                    name="whoCanApply"
                    value={formdata.whoCanApply}
                    onChange={handlechange}
                    rows={4}
                    placeholder="Eligibility criteria..."
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="perks"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Perks*
                  </label>

                  <textarea
                    id="perks"
                    required
                    name="perks"
                    value={formdata.perks}
                    onChange={handlechange}
                    rows={4}
                    placeholder="List the perks..."
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

              </div>
            </section>

            <section className="pt-2">
              <div className="flex items-center gap-3 mb-5">

                <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                  <Info size={18} className="text-green-600" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Job Details
                  </h3>

                  <p className="text-xs text-gray-500">
                    Complete the remaining job information
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>
                  <label
                    htmlFor="numberOfOpening"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Number of Openings*
                  </label>

                  <div className="relative">
                    <Hash
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="numberOfOpening"
                      type="number"
                      min="1"
                      required
                      name="numberOfOpening"
                      value={formdata.numberOfOpening}
                      onChange={handlechange}
                      placeholder="e.g. 5"
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="CTC"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    CTC*
                  </label>

                  <div className="relative">
                    <IndianRupee
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="CTC"
                      type="text"
                      required
                      name="CTC"
                      value={formdata.CTC}
                      onChange={handlechange}
                      placeholder="e.g. 10 LPA"
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Start Date*
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
                    Additional Information*
                  </label>

                  <textarea
                    id="additionalInfo"
                    required
                    name="additionalInfo"
                    value={formdata.additionalInfo}
                    onChange={handlechange}
                    rows={4}
                    placeholder="Any additional details..."
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

              </div>
            </section>

            <div className="pt-6 border-t border-gray-200 flex justify-end">

              <button
                type="submit"
                disabled={isloading}
                className="border border-transparent border-gray-300 w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isloading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    Posting Job...
                  </div>
                ) : (
                  "Post Job"
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