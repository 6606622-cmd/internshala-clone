import axios from "axios";
import { Lock, User } from "lucide-react";
import { useRouter } from "next/router";
import React, { useState } from "react";
import toast from "react-hot-toast";

const index = () => {
  const [formdata, setformdata] = useState({
    username: "",
    password: "",
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

    if (!formdata.username || !formdata.password) {
      toast.error("Please fill in all details");
      return;
    }

    try {
      setisloading(true);

      const res = await axios.post(
        "http://localhost:5000/api/admin/adminlogin",
        formdata
      );

      console.log("Login response:", res.data);

      toast.success("Logged in successfully");

      router.push("/adminpanel");
    } catch (error: any) {
      console.log("Login error:", error);
      console.log("Status:", error.response?.status);
      console.log("Response:", error.response?.data);

      if (error.response?.status === 401) {
        toast.error("Invalid username or password");
      } else {
        toast.error("Unable to connect to server");
      }
    } finally {
      setisloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 sm:px-8 pt-8 pb-6 text-center border-b border-gray-200">
            <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Admin Login
            </h2>

            <p className="mt-2 text-sm text-gray-500 leading-6">
              Access the admin dashboard to manage internships and applications
            </p>
          </div>

          <form
            className="p-6 sm:p-8 space-y-5"
            onSubmit={handlesubmit}
          >
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Username
              </label>

              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

                <input
                  type="text"
                  required
                  name="username"
                  id="username"
                  value={formdata.username}
                  onChange={handlechange}
                  placeholder="Enter your username"
                  className="w-full h-11 text-sm text-gray-900 pl-10 pr-3 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

                <input
                  type="password"
                  required
                  id="password"
                  name="password"
                  value={formdata.password}
                  onChange={handlechange}
                  placeholder="Enter your password"
                  className="block w-full h-11 text-sm text-gray-900 pl-10 pr-3 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isloading}
                className="w-full h-11 border border-transparent flex items-center justify-center px-4 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
              >
                {isloading ?(
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                  Signing in...
                   </div>):(
                    "sign in" )}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-gray-400">
          Admin access only
        </p>
      </div>
    </div>
  );
};

export default index;