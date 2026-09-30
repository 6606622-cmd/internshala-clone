import Link from "next/link";
import { auth, provider } from "../firebase/firebase";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  Search,
  User,
  LogIn,
} from "lucide-react";
import React, { useEffect,useRef, useState } from "react";
import logo from"../Assets/logo.png";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
interface UserData {
  name: string;
  email: string;
  photo: string;
}

const Navbar = () => {
const user=useSelector(selectuser)
  // Login
  const handleLogin = async () => {
    try {
       await signInWithPopup(auth, provider);
      toast.success("logged in successfully")
    } catch (error) {
      console.error(error);
      toast.error("login failed");
    }
  };
  // setuser({
  //  name:"rahul",
  //  email:"xyz@gmail.com",
  // photo:"https://images.unsplash.com/photo-11472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=faces",
  // });

  // Logout
  const handleLogout = () => {
    signOut(auth);  
  };

  return (
    <div className="relative">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">

            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-16"
                />
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">

              {/* Internships */}
              <Link
                href="/internship"
                className="text-gray-700 hover:text-blue-600"
              >
                Internships
              </Link>

              {/* Jobs */}
              <Link
                href="/job"
                className="text-gray-700 hover:text-blue-600"
              >
                Jobs
              </Link>

              {/* Search */}
              <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
                <Search
                  size={16}
                  className="text-gray-400"
                />

                <input
                  type="text"
                  placeholder="Search opportunities..."
                  className="ml-2 bg-transparent focus:outline-none text-sm w-48"
                />
              </div>
            </div>

            {/* Authentication */}
            <div className="flex items-center space-x-4">

              {user ? (
                /* Logged In User */
                <div className="flex items-center space-x-4">

                  {/* Profile */}
                  <Link
                    href="/profile"
                    className="flex items-center space-x-2"
                  >
                    {user.photo ? (
                      <img
                        src={user.photo}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User
                          size={18}
                          className="text-gray-500"
                        />
                      </div>
                    )}

                    <span className="hidden lg:block text-gray-700">
                      {user.name}
                    </span>
                  </Link>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                /* Logged Out User */
                <div className="flex items-center space-x-3">

                  {/* Login */}
                  <button
                    onClick={handleLogin}
                    className="bg-white border border-gray-300 rounded-lg px-4 py-2 flex items-center justify-center space-x-2 hover:bg-gray-50"
                  >
                    <LogIn size={18} />
                    <span>Login</span>
                  </button>

                  {/* Continue with Google */}
                  <button
                    onClick={handleLogin}
                    className="border border-gray-300 rounded-lg px-4 py-2 flex items-center justify-center space-x-2 hover:bg-gray-50"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.09-1.92 3.28-4.74 3.28-8.07z"
                      />

                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84C3.96 20.53 7.69 23 12 23z"
                      />

                      <path
                        fill="#FBBC05"
                        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.15C1.41 8.55 1 10.22 1 12s.41 3.45 1.15 4.94l3.69-2.84z"
                      />

                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.07.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.69 1 3.96 3.47 2.15 7.06l3.69 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                      />
                    </svg>

                    <span className="text-gray-700">
                      Continue with Google
                    </span>
                  </button>

                  {/* Admin */}
                  <Link
                    href="/adminlogin"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Admin
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Icon */}
            <div className="md:hidden">
              <button className="text-gray-600">
                <User size={24} />
              </button>
            </div>

          </div>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;