import React from "react";

const Sidebar = () => {
  return (
    <aside className="w-64 h-full bg-white p-6 mt-2 rounded-md shadow-md">
      {/* Profile Image */}
      <div className="flex flex-col items-center mb-6">
        <img
          src="https://randomuser.me/api/portraits/men/32.jpg" // replace with dynamic URL
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover mb-4"
        />
        <h2 className="text-xl font-semibold">Amit Kumar</h2>
        <p className="text-gray-600 text-center mt-2">
          Full Stack MERN Developer. Passionate about building awesome apps and blogging about tech.
        </p>
      </div>

      {/* Social Links */}
      <div className="flex justify-center gap-4 mb-6">
        <a href="https://github.com/AmitKumarr2024" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black">
          GitHub
        </a>
        <a href="https://linkedin.com/in/amitkumar" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-700">
          LinkedIn
        </a>
        {/* Add more social links as needed */}
      </div>

      {/* Contact Info */}
      <div className="text-center text-gray-700">
        <p>Email: amit@example.com</p>
        <p>Website: <a href="https://yourblog.com" className="text-yellow-500 hover:underline" target="_blank" rel="noopener noreferrer">yourblog.com</a></p>
      </div>
    </aside>
  );
};

export default Sidebar;
