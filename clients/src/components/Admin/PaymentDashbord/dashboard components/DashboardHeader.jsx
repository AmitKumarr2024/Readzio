import React from "react";
import { motion } from "framer-motion";
import { FaDollarSign } from "react-icons/fa";

const DashboardHeader = () => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3 }}
    className="flex flex-col sm:flex-row justify-between items-center mb-8"
  >
    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 flex items-center gap-3">
      <FaDollarSign className="w-8 h-8 text-blue-600" /> Payment Dashboard
    </h1>
  </motion.div>
);

export default DashboardHeader;