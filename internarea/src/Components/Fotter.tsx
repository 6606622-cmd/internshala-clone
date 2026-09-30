export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-12">
      <div className="container mx-auto px-6">

        {/* First Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">

          <FooterSection
            title="Internship by places"
            items={[
              "Internship in Delhi",
              "Internship in Mumbai",
              "Internship in Bangalore",
              "Internship in Chennai",
              "Internship in Hyderabad",
              "Internship in Pune",
            ]}
          />

          <FooterSection
            title="Internship by stream"
            items={[
              "Computer Science",
              "Marketing",
              "Finance",
              "Human Resources",
              "Graphic Design",
              "Content Writing",
            ]}
          />

          <FooterSection
            title="Jobs by places"
            items={[
              "Jobs in Delhi",
              "Jobs in Mumbai",
              "Jobs in Bangalore",
              "Jobs in Chennai",
              "Jobs in Hyderabad",
              "Jobs in Pune",
            ]}
          />

          <FooterSection
            title="Jobs by stream"
            items={[
              "IT Jobs",
              "Marketing Jobs",
              "Finance Jobs",
              "HR Jobs",
              "Sales Jobs",
              "Design Jobs",
            ]}
          />

        </div>

        {/* Divider */}
        <hr className="my-10 border-gray-600" />

        {/* Second Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">

          <FooterSection
            title="About us"
            items={[
              "About Internshala",
              "Careers",
            ]}
          />

          <FooterSection
            title="Team diary"
            items={[
              "Life at Internshala",
              "Our Team",
            ]}
          />

          <FooterSection
            title="Terms and conditions"
            items={[
              "Terms & Conditions",
              "Privacy Policy",
            ]}
          />

          <FooterSection
            title="Sitemap"
            items={[
              "Sitemap",
            ]}
          />

        </div>

        {/* Bottom Area */}
        <div className="mt-10 pt-6 border-t border-gray-600">

          <div className="flex flex-col md:flex-row justify-between items-center gap-6">

            {/* Android App */}
            <button
              type="button"
              className="flex items-center gap-3 border border-white rounded-lg px-4 py-2 hover:bg-gray-700 transition"
            >
              <span className="text-xl">▶</span>

              <span className="text-sm">
                Get Android App
              </span>
            </button>

            {/* Social Media */}
            <div className="flex items-center gap-5">

              {/* Facebook */}
              <a
                href="#"
                aria-label="Facebook"
                className="text-gray-300 hover:text-white text-xl"
              >
                f
              </a>

              {/* Twitter / X */}
              <a
                href="#"
                aria-label="Twitter"
                className="text-gray-300 hover:text-white text-xl"
              >
                𝕏
              </a>

              {/* Instagram */}
              <a
                href="#"
                aria-label="Instagram"
                className="text-gray-300 hover:text-white text-xl"
              >
                ◎
              </a>

            </div>

            {/* Copyright */}
            <p className="text-sm text-gray-400">
              © Copyright 2023. All Rights Reserved.
            </p>

          </div>

        </div>

      </div>
    </footer>
  );
}


/* Footer Section */
function FooterSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>

      <h3 className="text-sm font-semibold text-gray-200">
        {title}
      </h3>

      <div className="flex flex-col items-start mt-4 space-y-2">

        {items.map((item, index) => (
          <a
            key={index}
            href="#"
            className="text-sm text-gray-400 hover:text-white hover:underline transition"
          >
            {item}
          </a>
        ))}

      </div>

    </div>
  );
}