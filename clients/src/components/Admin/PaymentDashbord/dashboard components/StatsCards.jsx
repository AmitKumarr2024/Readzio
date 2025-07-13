import React from "react";
import { motion } from "framer-motion";

const StatsCards = ({ stats }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
    {[
      { title: "Total Earnings", value: stats.totalEarnings, color: "blue" },
      { title: "Subscription Earnings", value: stats.subscription, color: "cyan" },
      { title: "Ads Earnings", value: stats.ads, color: "indigo" },
    ].map(({ title, value, color }) => (
      <motion.div
        key={title}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`p-4 sm:p-6 rounded-2xl shadow-lg bg-gradient-to-br from-${color}-50 dark:from-${color}-900/50 to-${color}-100 dark:to-${color}-800/50 hover:shadow-xl transition-all duration-300`}
      >
        <h3 className={`text-sm font-medium text-${color}-600 dark:text-${color}-400`}>{title}</h3>
        <p className={`text-2xl sm:text-3xl font-bold text-${color}-800 dark:text-${color}-200`}>
          ₹{typeof value === "number" ? value.toFixed(2) : "0.00"}
        </p>
      </motion.div>
    ))}
  </div>
);

export default StatsCards;