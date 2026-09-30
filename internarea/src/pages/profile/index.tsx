import { selectuser } from "@/Feature/Userslice";
import { ExternalLink, Mail, User } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useSelector } from "react-redux";

interface UserData {
    name: string;
    email: string;
    photo: string;
}

const index = () => {
//    const [isUser, setIsUser] = useState<UserData | null>({
//      name: "Rahul",
//    email: "xyz@gmail.com",
//  photo:
//    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=faces",
// });

    const user=useSelector(selectuser)

  return (
    <div>
      {/* Profile */}
      <div className="flex items-center mt-9 mb-4 justify-center">
        <div className="max-w-xl w-full shadow-lg rounded-lg overflow-hidden bg-white">

          <div className="relative h-32 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
              {user?.photo ? (
                <img
                  src={user.photo}
                  alt={user?.name}
                  className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
                  <User className="h-10 w-10 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Profile Content */}
          <div className="pt-14 pb-6 px-6">

            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.name}
              </h1>

              <div className="mt-2 flex items-center justify-center text-gray-500">
                <Mail className="h-4 w-4 mr-2" />
                <span>{user?.email}</span>
              </div>
            </div>

            {/* Profile Details */}
            <div className="space-y-5">

              <div className="flex items-center justify-center">
                <div className="bg-white shadow-sm rounded-lg p-2 w-full flex gap-3">

                  <div className="bg-blue-50 rounded-lg p-3 text-center flex-1">
                    <span className="text-blue-600 font-semibold text-2xl">
                      0
                    </span>
                    <p className="text-blue-600 text-sm mt-1">
                      Active Applications
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3 text-center flex-1">
                    <span className="text-green-600 font-semibold text-2xl">
                      0
                    </span>
                    <p className="text-green-600 text-sm mt-1">
                      Accepted Applications
                    </p>
                  </div>

                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center pt-2">
                <Link
                  href="/userapplication"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  View Applications
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default index