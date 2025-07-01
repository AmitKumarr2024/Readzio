// ViewBankDetails.js
import React from "react";
import { motion } from "framer-motion";
import { Tilt } from "react-tilt";
import { FaArrowsSplitUpAndLeft } from "react-icons/fa6";

const ViewBankDetails = ({ bankDetails, loading, copyToClipboard }) => {
  if (loading) {
    return (
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <FaArrowsSplitUpAndLeft className="w-12 h-12 sm:w-16 sm:h-16 animate-spin text-indigo-600" />
      </motion.div>
    );
  }

  if (!bankDetails || !bankDetails.fundAccount) {
    return (
      <motion.p
        className="text-center text-text-main-light dark:text-text-main-dark text-sm sm:text-base"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        No bank details found. Please check your account or try again later.
      </motion.p>
    );
  }

  const { contactData, fundAccount, bankMeta, payoutMethod } = bankDetails;

  const sections = [
    {
      title: "Contact Information",
      fields: [
        { label: "Name", value: contactData?.name, copyable: true },
        { label: "Email", value: contactData?.email, copyable: true },
        { label: "Contact", value: contactData?.contact, copyable: true },
        { label: "Type", value: contactData?.type },
        {
          label: "Created At",
          value: contactData?.created_at
            ? new Date(contactData.created_at * 1000).toLocaleString()
            : "N/A",
        },
      ],
    },
    {
      title: "Fund Account",
      fields: [
        { label: "Account ID", value: fundAccount?.id, copyable: true },
        { label: "Type", value: fundAccount?.account_type },
        ...(payoutMethod === "bank"
          ? [
              { label: "Account Name", value: fundAccount?.bank_account?.name, copyable: true },
              { label: "Account Number", value: fundAccount?.bank_account?.account_number, copyable: true },
              { label: "IFSC Code", value: fundAccount?.bank_account?.ifsc, copyable: true },
              { label: "Bank Name", value: bankMeta?.bank },
              { label: "Branch", value: bankMeta?.branch },
              { label: "Address", value: bankMeta?.address },
            ]
          : []),
        ...(payoutMethod === "card"
          ? [
              { label: "Card Holder", value: fundAccount?.card?.name, copyable: true },
              { label: "Card Number", value: fundAccount?.card?.card_number, copyable: true },
              { label: "Expiry Date", value: fundAccount?.card?.expiry },
              { label: "Card Type", value: bankMeta?.cardBrand },
              { label: "Last 4 Digits", value: bankMeta?.last4, copyable: true },
            ]
          : []),
        ...(payoutMethod === "upi"
          ? [
              { label: "UPI ID", value: fundAccount?.vpa?.address, copyable: true },
              { label: "Address", value: bankMeta?.address },
            ]
          : []),
        {
          label: "Created At",
          value: fundAccount?.created_at
            ? new Date(fundAccount.created_at * 1000).toLocaleString()
            : "N/A",
        },
      ],
    },
    ...(bankMeta && Object.keys(bankMeta).length > 0
      ? [
          {
            title: "Bank Meta",
            fields: Object.entries(bankMeta).map(([key, value]) => ({
              label: key.replace(/([A-Z])/g, " $1").trim(),
              value,
              copyable: ["bank", "branch", "address", "cardBrand", "last4", "vpa"].includes(key),
            })),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.h2
        className="text-2xl sm:text-4xl font-extrabold  text-text-main-light dark:text-text-main-dark bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        View Bank Details
      </motion.h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {sections.map((section) => (
          <Tilt key={section.title} options={{ max: 15, scale: 1.05 }}>
            <motion.div
              className="p-4 sm:p-6 rounded-2xl bg-background-light dark:bg-background-dark shadow-xl border border-gray-200"
              whileHover={{ y: -5 }}
            >
              <h3 className="text-lg sm:text-xl font-semibold mb-4  text-text-main-light dark:text-text-main-dark">
                {section.title}
              </h3>
              {section.fields.map(({ label, value, copyable }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-2 border-b border-gray-200/50 last:border-b-0 text-sm sm:text-base"
                >
                  <p className=" text-text-main-light dark:text-text-main-dark">
                    <strong>{label}:</strong> {value || "N/A"}
                  </p>
                  {copyable && value && (
                    <button
                      onClick={() => copyToClipboard(value)}
                      className="text-indigo-600 hover:text-indigo-700 transition text-xs sm:text-sm"
                    >
                      Copy
                    </button>
                  )}
                </div>
              ))}
            </motion.div>
          </Tilt>
        ))}
      </div>
    </div>
  );
};

export default React.memo(ViewBankDetails);