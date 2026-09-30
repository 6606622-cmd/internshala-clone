import React, { useState } from "react";
import {
  Building2,
  MapPin,
  User,
  Briefcase,
  FileText,
  Users,
  Gift,
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
    aboutInternship: "",
    whoCanApply: "",
    perks: "",
    numberOfOpening: "",
    stipend: "",
    startDate: "",
    additionalInfo: "",
  });

  const handlechange = (e: any) => {
    const { name, value } = e.target;

    setformdata((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const router = useRouter();
  const [isloading, setisloading] = useState(false);
  const handlesubmit = async (e: any) => {
    e.preventDefault();
    const hasemptyfields = Object.values(formdata).some(val => !val.trim())
    if (hasemptyfields) {
      toast.error("Please fill in all details");
      return;
    }

    try {
      setisloading(true);

      const res = await axios.post(
        "https://internshala-clone-a0st.onrender.com/api/internship",
        formdata
      );
      toast.success("Internship posted successfully");
      router.push("/adminpanel");
    } catch (error) {
      console.log(error);
      toast.error("error posting internship");
    } finally {
      setisloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* ================= MAIN CARD ================= */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {/* ================= HEADER ================= */}
          <div className="px-6 sm:px-8 py-6 border-b border-gray-200">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Post New Internship
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Create a new internship opportunity for students
            </p>
          </div>

          {/* ================= FORM ================= */}
          <form className="p-6 sm:p-8 space-y-8"
          onSubmit={handlesubmit}>

            {/* ================================================== */}
            {/* BASIC INFORMATION */}
            {/* ================================================== */}

            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Briefcase
                    size={17}
                    className="text-blue-600"
                  />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Basic Information
                  </h3>

                  <p className="text-xs text-gray-500">
                    Enter the basic details of the internship
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* TITLE */}
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Internship Title*
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
                      placeholder="e.g. Frontend Developer Intern"
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* COMPANY */}
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

                {/* LOCATION */}
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

                {/* CATEGORY */}
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
            </div>

            {/* ================================================== */}
            {/* COMPANY & INTERNSHIP DETAILS */}
            {/* ================================================== */}

            <div className="pt-2">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Building2
                    size={17}
                    className="text-indigo-600"
                  />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Company & Internship Details
                  </h3>

                  <p className="text-xs text-gray-500">
                    Provide information about the company and role
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* ABOUT COMPANY */}
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

                {/* ABOUT INTERNSHIP */}
                <div>
                  <label
                    htmlFor="aboutInternship"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    About Internship*
                  </label>

                  <textarea
                    id="aboutInternship"
                    required
                    name="aboutInternship"
                    value={formdata.aboutInternship}
                    onChange={handlechange}
                    rows={5}
                    placeholder="Describe the internship role..."
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

              </div>
            </div>

            {/* ================================================== */}
            {/* ADDITIONAL DETAILS */}
            {/* ================================================== */}

            <div className="pt-2">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Users
                    size={17}
                    className="text-purple-600"
                  />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Additional Details
                  </h3>

                  <p className="text-xs text-gray-500">
                    Add eligibility and benefits information
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* WHO CAN APPLY */}
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

                {/* PERKS */}
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
            </div>

            {/* ================================================== */}
            {/* FINAL DETAILS */}
            {/* ================================================== */}

            <div className="pt-2">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Info
                    size={17}
                    className="text-green-600"
                  />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Final Details
                  </h3>

                  <p className="text-xs text-gray-500">
                    Complete the remaining internship information
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* NUMBER OF OPENINGS */}
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
                      required
                      min="1"
                      name="numberOfOpening"
                      value={formdata.numberOfOpening}
                      onChange={handlechange}
                      placeholder="e.g. 5"
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* STIPEND */}
                <div>
                  <label
                    htmlFor="stipend"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Stipend*
                  </label>

                  <div className="relative">
                    <IndianRupee
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="stipend"
                      type="text"
                      required
                      name="stipend"
                      value={formdata.stipend}
                      onChange={handlechange}
                      placeholder="e.g. ₹15,000/month"
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* START DATE */}
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

                {/* ADDITIONAL INFORMATION */}
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
            </div>

            {/* ================================================== */}
            {/* SUBMIT BUTTON */}
            {/* ================================================== */}

            <div className="pt-6 border-t border-gray-200 flex justify-end">
              <button
                type="submit"
                disabled={isloading}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >{isloading ?(
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                  Posting Internship...
                   </div>):(
                    "Post Internship" )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default index;