import {
  ArrowUpRight,
  Calendar,
  Clock,
  Filter,
  IndianRupee,
  Pin,
  PlayCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";

const internshipsData = [
  {
    _id: "1",
    title: "Frontend Developer Intern",
    company: "TechCorp",
    StartDate: "April 2025",
    location: "New York",
    stipend: "$50/month",
    duration: "3 months",
    category: "Engineering",
  },
  {
    _id: "2",
    title: "Data Science Intern",
    company: "DataTech",
    StartDate: "May 2025",
    location: "San Francisco",
    stipend: "$80/month",
    duration: "6 months",
    category: "Data Science",
  },
  {
    _id: "3",
    title: "Marketing Intern",
    company: "MarketPro",
    StartDate: "June 2025",
    location: "Los Angeles",
    stipend: "$40/month",
    duration: "4 months",
    category: "Marketing",
  },
];

const Index = () => {
  const [filteredInternships, setFilteredInternships] = useState<any>([]);
  const [isFiltervisible, setIsFiltervisible] = useState(false);
  const [filter, setFilters] = useState({
    category: "",
    location: "",
    workFromHome: false,
    partTime: false,
    stipend: 50,
  });
  const [internshipsData,setinternship]=useState<any>([])
  useEffect(() => {
  const fetchdata = async () => {
    try {
      const res = await axios.get("https://internshala-clone-a0st.onrender.com/api/internship")
      setFilteredInternships(res.data)
      setinternship(res.data)
    } catch (error) {
      console.log(error);
    }
  }
  fetchdata();
}, []);

  useEffect(() => {
    const filtered = internshipsData.filter((internship:any) => {
      const matchesCategory = internship.category
        .toLowerCase()
        .includes(filter.category.toLowerCase());

      const matchesLocation = internship.location
        .toLowerCase()
        .includes(filter.location.toLowerCase());

      return matchesCategory && matchesLocation;
    });

    setFilteredInternships(filtered);
  }, [filter]);

  const handleFilterChange = (e: any) => {
    const { name, value, type, checked } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      location: "",
      workFromHome: false,
      partTime: false,
      stipend: 50,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">

          {/* Filter */}
          <div
            className={`${
              isFiltervisible ? "block" : "hidden"
            } md:block w-full md:w-64 bg-white rounded-lg shadow-sm p-6 h-fit`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-black">Filters</span>
              </div>

              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-6">

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>

                <input
                  type="text"
                  name="category"
                  value={filter.category}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder="e.g. Marketing Intern"
                />
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>

                <input
                  type="text"
                  name="location"
                  value={filter.location}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  placeholder="e.g. Mumbai"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">

                {/* Work From Home */}
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="workFromHome"
                    checked={filter.workFromHome}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 rounded"
                  />

                  <span className="text-gray-700">
                    Work from home
                  </span>
                </label>

                {/* Part Time */}
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="partTime"
                    checked={filter.partTime}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 rounded"
                  />

                  <span className="text-gray-700">
                    Part-time
                  </span>
                </label>
              </div>

              {/* Stipend Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Stipend ($)
                </label>

                <input
                  type="range"
                  name="stipend"
                  min="0"
                  max="100"
                  value={filter.stipend}
                  onChange={handleFilterChange}
                  className="w-full"
                />

                <div className="flex justify-between text-sm text-gray-600">
                  <span>$0</span>
                  <span>$50</span>
                  <span>$100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Internship Content */}
          <div className="flex-1">

            {/* Mobile Filter Button */}
            <div className="md:hidden mb-4">
              <button
                onClick={() =>
                  setIsFiltervisible(!isFiltervisible)
                }
                className="flex items-center space-x-2 text-blue-600 w-full justify-center bg-white p-3 rounded-lg shadow-sm text-black"
              >
                <Filter className="h-5 w-5" />
                <span>
                  {isFiltervisible ? "Hide Filters" : "Show Filters"}
                </span>
              </button>
            </div>

            {/* Results Count */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
              <p className="text-center font-medium text-black">
                {filteredInternships.length} Internships Found
              </p>
            </div>

            {/* Internship Cards */}
            <div className="space-y-4">
              {filteredInternships.map((internship: any) => (
                <div
                  key={internship._id}
                  className="bg-white rounded-lg shadow-sm p-6"
                >

                  {/* Hiring Status */}
                  <div className="flex items-center space-x-2 text-blue-600 mb-4">
                    <ArrowUpRight className="h-5 w-5" />
                    <span>Actively Hiring</span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {internship.title}
                  </h2>

                  {/* Company */}
                  <p className="text-gray-600 mb-4">
                    {internship.company}
                  </p>

                  {/* Internship Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                    {/* Start Date */}
                    <div className="flex items-center space-x-2 text-gray-600">
                      <PlayCircle className="h-5 w-5" />

                      <div>
                        <p className="text-sm font-medium">
                          Start Date
                        </p>

                        <p className="text-sm">
                          {internship.StartDate}
                        </p>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Pin className="h-5 w-5" />

                      <div>
                        <p className="text-sm font-medium">
                         Location
                        </p>

                        <p className="text-sm">
                          {internship.loction}
                        </p>
                      </div>
                    </div>

                    {/* Stipend */}
                    <div className="flex items-center space-x-2 text-gray-600">
                      <IndianRupee className="h-5 w-5" />

                      <div>
                        <p className="text-sm font-medium">
                          Stipend
                        </p>

                        <p className="text-sm">
                          {internship.stipend}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section */}
                  <div className="flex items-center justify-between border-t pt-4">

                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">
                        Internship
                      </span>

                      <div className="flex items-center space-x-1 text-gray-500">
                        <Clock className="h-4 w-4" />

                        <span className="text-sm">
                          Posted recently
                        </span>
                      </div>
                    </div>

                    {/* View Details */}
                    <Link
                      href={`/detailinternship/${internship._id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View Details
                    </Link>

                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;