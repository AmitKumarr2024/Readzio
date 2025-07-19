// Component to manage security settings with a sidebar and password reset section
import React, { useState } from "react";
import ResetPassword from "../../pages/ResetPasswordPage";

const SecurityDashboard = () => {
  // State for managing active section and sidebar visibility
  const [activeSection, setActiveSection] = useState("reset-password");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Toggle sidebar visibility
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      {/* Sidebar */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-background-light dark:bg-background-dark shadow-md transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 ease-in-out md:w-1/4 p-6 md:p-8 border-r border-gray-200 dark:border-gray-700`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-4xl font-semibold">Settings</h2>
          <button
            className="md:hidden text-text-main-light dark:text-text-main-dark"
            onClick={toggleSidebar}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <nav className="space-y-2">
          <button
            className={`w-full text-left px-4 py-2 rounded-lg ${
              activeSection === "reset-password"
                ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onClick={() => setActiveSection("reset-password")}
          >
            Change Password
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <button
            className="md:hidden text-text-main-light dark:text-text-main-dark"
            onClick={toggleSidebar}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
        {activeSection === "reset-password" && <ResetPassword />}
      </div>
    </div>
  );
};

export default SecurityDashboard;