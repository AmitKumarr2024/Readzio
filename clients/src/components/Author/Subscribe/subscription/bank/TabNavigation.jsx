import React from "react";
import { FaPlus, FaEdit, FaEye, FaTrash } from "react-icons/fa";
import { motion } from "framer-motion";

const TabNavigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { tab: "create", icon: <FaPlus /> },
    { tab: "update", icon: <FaEdit /> },
    { tab: "view", icon: <FaEye /> },
    { tab: "delete", icon: <FaTrash /> },
  ];

  return (
    <div className="w-full overflow-x-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row justify-center items-center gap-5 sm:gap-4">
        {tabs.map(({ tab, icon }) => (
          <motion.button
            key={tab}
            className={`flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 ${
              activeTab === tab
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                : "bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark hover:bg-gray-500"
            } shadow whitespace-nowrap`}
            onClick={() => setActiveTab(tab)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {icon}
            <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(TabNavigation);
