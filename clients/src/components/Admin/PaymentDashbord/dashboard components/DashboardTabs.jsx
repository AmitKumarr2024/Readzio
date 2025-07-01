import React from "react";

const DashboardTabs = ({ activeTab, setActiveTab }) => (
  <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
    {["payouts", "userEarnings", "received", "pending"].map((tab) => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={`px-4 py-2 text-sm font-medium transition-all duration-300 rounded-md ${
          activeTab === tab
            ? "border-b-2 border-blue-600 text-blue-600"
            : "text-gray-500 hover:text-blue-600"
        }`}
      >
        {tab === "userEarnings"
          ? "User Earnings & Bulk Payouts"
          : tab === "received"
          ? "Received Payments"
          : tab === "pending"
          ? "Pending Payments"
          : tab.charAt(0).toUpperCase() + tab.slice(1)}
      </button>
    ))}
  </div>
);

export default DashboardTabs;
