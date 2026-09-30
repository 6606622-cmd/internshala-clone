import {
  ArrowUpRight,
  Book,
  Calendar,
  Clock,
  ExternalLink,
  IndianRupee,
  MapPin,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";

const index = () => {
  const user = useSelector(selectuser);
  const router = useRouter();
  const { id } = router.query;
  const [jobData, setJobData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  useEffect(() => {
    if (!router.isReady || !id) return;

    const fetchJob = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `https://internshala-clone-a0st.onrender.com/api/job/${id}`
        );
        console.log("JOB DETAILS:", res.data);
        setJobData(res.data);
      } catch (error) {
        console.log("ERROR FETCHING JOB:", error);
        setJobData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [router.isReady, id]);

  const handlesubmitapplication = async () => {
    if (!coverLetter.trim()) {
      toast.error("please write a cover letter");
      return;
    }
    if (!availability) {
      toast.error("please select your availability");
      return;
    }
    try {
      const applicationdata = {
        category: jobData.category,
        company: jobData.company,
        user: user,
        coverLetter: coverLetter,
        Application: id,
        availability,
      };
      await axios.post(
        "https://internshala-clone-a0st.onrender.com/api/application",
        applicationdata
      );
      toast.success("Application submitted successfully");
      router.push('/job')
    } catch (error) {
      console.error(error);
      toast.error("failed to submit application");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!jobData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Job not found
        </h1>

        <Link
          href="/jobs"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg"
        >
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-2 text-blue-600 mb-4">
            <ArrowUpRight className="h-5 w-5" />
            <span className="font-medium">
              Actively Hiring
            </span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {jobData.title}
          </h1>

          <p className="text-lg text-gray-600 mb-4">
            {jobData.company}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="h-5 w-5" />
              <span>{jobData.location}</span>
            </div>

            <div className="flex items-center space-x-2 text-gray-600">
              <IndianRupee className="h-5 w-5" />
              <span>{jobData.CTC}</span>
            </div>

            <div className="flex items-center space-x-2 text-gray-600 gap-2">
              <Book className="h-5 w-5" />
              <span>{jobData.category}</span>
            </div>

          </div>

          <div className="mt-4 flex items-center space-x-2">
            <Clock className="h-4 w-4 text-green-500" />

            <span className="text-green-500 text-sm">
              Posted on {jobData.createdAt}
            </span>
          </div>
        </div>

        {/* Company */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            About {jobData.company}
          </h2>

          <div className="flex items-center space-x-2 mb-4">
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <span>Visit company website</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <p className="text-gray-600">
            {jobData.aboutCompany}
          </p>
        </div>

        {/* Job Details */}
        <div className="p-6 border-b">

          <h2 className="text-xl font-bold text-gray-900 mb-4">
            About the Job
          </h2>

          <p className="text-gray-600 mb-6">
            {jobData.aboutJob}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Who Can Apply
          </h3>

          <p className="text-gray-600 mb-6">
            {jobData.whoCanApply}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Perks
          </h3>

          <p className="text-gray-600 mb-6">
            {Array.isArray(jobData.perks)
              ? jobData.perks.join(", ")
              : jobData.perks}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Additional Information
          </h3>

          <p className="text-gray-600 mb-6">
            {jobData.additionalInfo}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Number of Openings
          </h3>

          <p className="text-gray-600">
            {jobData.numberOfOpening}
          </p>

        </div>

        {/* Apply */}
        <div className="p-6 flex justify-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Apply Now
          </button>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">

              <div className="p-6 border-b">
                <div className="flex justify-between items-center">

                  <h2 className="text-2xl font-bold text-gray-900">
                    Apply to {jobData.company}
                  </h2>

                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>

                </div>
              </div>

              <div className="p-6 space-y-6">

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Your Resume
                  </h3>

                  <p className="text-gray-600">
                    Your current resume will be submitted with the application
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Cover Letter
                  </h3>

                  <p className="text-gray-600 mb-2">
                    Why should you be selected for this job?
                  </p>

                  <textarea
                    value={coverLetter}
                    onChange={(e) =>
                      setCoverLetter(e.target.value)
                    }
                    className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                    placeholder="Enter your cover letter here..."
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Your Availability
                  </h3>

                  {[
                    "Yes, I am available to join immediately",
                    "No, I am currently on a notice period",
                    "No, I will have to serve notice period",
                    "Other",
                  ].map((option) => (
                    <label
                      key={option}
                      className="flex items-center space-x-2 mb-2"
                    >
                      <input
                        type="radio"
                        name="availability"
                        value={option}
                        checked={availability === option}
                        onChange={(e) =>
                          setAvailability(e.target.value)
                        }
                        className="h-4 w-4 text-blue-600"
                      />

                      <span className="text-gray-700">
                        {option}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end">

                  {user ? (
                    <button
                      onClick={handlesubmitapplication}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Submit Application
                    </button>
                  ) : (
                    <Link
                      href="/"
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Sign up to apply
                    </Link>
                  )}

                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default index;