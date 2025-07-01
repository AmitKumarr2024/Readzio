import React from "react";
import { motion } from "framer-motion";
import { FaArrowsSplitUpAndLeft } from "react-icons/fa6";

const BankForm = ({
  activeTab,
  formData,
  errors,
  loading,
  handleInputChange,
  handleSubmit,
}) => {
  const commonFields = [
    { name: "name", label: "Name", type: "text", tooltip: "Enter full name" },
    { name: "email", label: "Email", type: "email", tooltip: "Enter valid email" },
    {
      name: "contact",
      label: "Contact",
      type: "text",
      tooltip: "Enter 10-digit phone number",
    },
    {
      name: "payoutMethod",
      label: "Payout Method",
      type: "select",
      options: [
        { value: "bank", label: "Bank" },
        { value: "card", label: "Card" },
      ],
      tooltip: "Choose payout method",
    },
  ];

  const bankFields = [
    {
      name: "bankAccount.name",
      label: "Account Name",
      type: "text",
      tooltip: "Enter account holder name",
    },
    {
      name: "bankAccount.account_number",
      label: "Account Number",
      type: "text",
      tooltip: "Enter 8-18 digit account number",
    },
    {
      name: "bankAccount.ifsc_code",
      label: "IFSC Code",
      type: "text",
      tooltip: "Enter 11-character IFSC (e.g., HDFC0001234)",
    },
  ];

  const cardFields = [
    {
      name: "cardDetails.cardName",
      label: "Card Name",
      type: "text",
      tooltip: "Enter name on card",
    },
    {
      name: "cardDetails.card_number",
      label: "Card Number",
      type: "text",
      tooltip: "Enter 13-19 digit card number",
    },
    {
      name: "cardDetails.expiry",
      label: "Expiry (MM/YYYY)",
      type: "text",
      tooltip: "Enter expiry date (MM/YYYY)",
    },
    {
      name: "cardDetails.cardType",
      label: "Card Type",
      type: "select",
      options: [
        { value: "Visa", label: "Visa" },
        { value: "MasterCard", label: "MasterCard" },
        { value: "Amex", label: "Amex" },
        { value: "Discover", label: "Discover" },
      ],
      tooltip: "Select card type",
    },
  ];

  const renderInput = ({ name, label, type, options, tooltip }) => (
    <motion.div
      key={name}
      className="relative group"
      whileHover={{ scale: 1.02 }}
      animate={
        errors[name]
          ? { x: [-5, 5, -5, 5, 0], transition: { duration: 0.3 } }
          : {}
      }
    >
      <label className="absolute -top-5 left-1 px-2 text-xs sm:text-sm font-medium  text-text-main-light dark:text-text-main-dark bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text  transition-all duration-300 group-focus-within:-top-6 group-focus-within:text-xs">
        {label}
      </label>
      {type === "select" ? (
        <select
          name={name}
          value={
            name.includes("cardDetails.")
              ? formData.cardDetails[name.split(".")[1]]
              : formData[name]
          }
          onChange={handleInputChange}
          className={`w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark border border-gray-300 ${
            errors[name] ? "border-red-500" : "focus:border-indigo-500"
          } focus:ring-2 focus:ring-indigo-500/50 shadow-inner transition-all duration-300 text-sm sm:text-base`}
          required
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={
            name.includes("bankAccount.")
              ? formData.bankAccount[name.split(".")[1]]
              : name.includes("cardDetails.")
              ? formData.cardDetails[name.split(".")[1]]
              : formData[name]
          }
          onChange={handleInputChange}
          className={`w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark border border-gray-300 ${
            errors[name] ? "border-red-500" : "focus:border-indigo-500"
          } focus:ring-2 focus:ring-indigo-500/50 shadow-inner transition-all duration-300 text-sm sm:text-base`}
          required
        />
      )}
      {errors[name] && (
        <motion.p
          className="mt-1 text-xs sm:text-sm text-red-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {errors[name]}
        </motion.p>
      )}
      <div className="absolute invisible group-hover:visible bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden sm:block">
        {tooltip}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
      </div>
    </motion.div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      <motion.h2
        className="text-2xl sm:text-4xl font-extrabold  text-text-main-light dark:text-text-main-dark bg-clip-text  bg-gradient-to-r from-indigo-600 to-purple-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {activeTab === "create" ? "Create Bank Details" : "Update Bank Details"}
      </motion.h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {commonFields.map(renderInput)}
      </div>

      {formData.payoutMethod === "bank" && (
        <motion.div
          className="space-y-4 sm:space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-xl sm:text-2xl font-semibold  text-text-main-light dark:text-text-main-dark">
            Bank Account Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {bankFields.map(renderInput)}
          </div>
        </motion.div>
      )}

      {formData.payoutMethod === "card" && (
        <motion.div
          className="space-y-4 sm:space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-xl sm:text-2xl font-semibold  text-text-main-light dark:text-text-main-dark">
            Card Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:grid">
            {cardFields.map(renderInput)}
          </div>
        </motion.div>
      )}

      <motion.button
        type="submit"
        disabled={loading || Object.keys(errors).length > 0}
        className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl bg-background-light dark:bg-background-dark  font-semibold text-sm sm:text-lg shadow-lg transition-all duration-300 ${
          loading || Object.keys(errors).length > 0
            ? "bg-background-light dark:bg-background-dark  cursor-not-allowed"
            : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        } relative overflow-hidden`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="relative z-10 flex items-center justify-center">
          {loading ? (
            <FaArrowsSplitUpAndLeft className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
          ) : activeTab === "create" ? (
            "Create"
          ) : (
            "Update"
          )}
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-ripple"></div>
      </motion.button>
    </form>
  );
};

export default React.memo(BankForm);