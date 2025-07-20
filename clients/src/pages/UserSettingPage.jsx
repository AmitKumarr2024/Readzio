import React from "react";
import SecurityDashboard from "../components/Setting/SecurityDashboard";

// Renders user settings page with security dashboard
const UserSettingsPage = () => {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark font-sans">
      <div className="max-w-7xl mx-auto">
        <SecurityDashboard />
      </div>
    </div>
  );
};

export default UserSettingsPage;