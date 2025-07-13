import React, { useState } from "react";
import { ClipboardCopy } from "lucide-react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { sendAdminNotification } from "../../../store/notificationSlice";
import { FaPaperPlane } from "react-icons/fa";

const ViewBankDetailsStandalone = ({ bankDetails, loading, copyToClipboard, userId }) => {
  const dispatch = useDispatch();
  const { notificationLoading, notificationError } = useSelector((state) => state.notifications || {});
  const [content, setContent] = useState(
    "Please add your bank details to receive payments. Navigate to your author profile page and update your bank details."
  );
  const [navigateTo, setNavigateTo] = useState(`/author-profile/${userId}?tab=subscription#bank`);

  const handleSendNotification = async () => {
    try {
      if (!userId) return toast.error("User ID is required");
      if (!content.trim()) return toast.error("Notification content is required");

      const notificationPayload = {
        userId,
        content,
        navigateTo: navigateTo || `/author-profile/${userId}?tab=bank-details`,
      };
      await dispatch(sendAdminNotification(notificationPayload)).unwrap();
      toast.success("Notification sent successfully");
      setContent("");
      setNavigateTo(`/author-profile/${userId}?tab=bank-details`);
    } catch (err) {
      toast.error(err.message || "Failed to send notification");
    }
  };

  if (loading) {
    return (
      <div className="text-text-main-light dark:text-text-main-dark text-sm animate-pulse text-center">
        🔄 Loading bank details...
      </div>
    );
  }

  if (!bankDetails || !bankDetails.fundAccount) {
    return (
      <div className="space-y-4">
        <p className="text-gray-400 dark:text-gray-500 italic text-sm text-center">
          No bank details available.
        </p>
        <div className="bg-background-light dark:bg-background-dark border border-gray-100 dark:border-gray-700 rounded-2xl shadow-lg p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-text-main-light dark:text-text-main-dark">Message</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full mt-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark"
              placeholder="Enter notification message"
              rows="4"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-main-light dark:text-text-main-dark">Navigation URL (optional)</label>
            <input
              type="text"
              value={navigateTo}
              onChange={(e) => setNavigateTo(e.target.value)}
              className="w-full mt-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark"
              placeholder="Enter navigation URL (e.g., /author-profile)"
            />
          </div>
          <button
            onClick={handleSendNotification}
            disabled={notificationLoading}
            className="w-full bg-blue-600 text-text-main-light dark:text-text-main-dark py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <FaPaperPlane />
            {notificationLoading ? "Sending..." : "Send Notification"}
          </button>
          {notificationError && (
            <p className="text-sm text-red-500 dark:text-red-400 mt-1">{notificationError}</p>
          )}
        </div>
      </div>
    );
  }

  const { contactData, fundAccount, bankMeta, payoutMethod } = bankDetails;

  const InfoRow = ({ label, value, copyable }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm">
      <span className="w-36 font-medium text-text-main-light dark:text-text-main-dark">{label}:</span>
      <span className="text-text-main-light dark:text-text-main-dark break-all flex-1">{value || "N/A"}</span>
      {copyable && value && (
        <button
          onClick={() => copyToClipboard(value)}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-300 text-xs"
        >
          Copy
        </button>
      )}
    </div>
  );

  const SectionCard = ({ title, children }) => (
    <div className="bg-background-light dark:bg-background-dark border border-gray-100 dark:border-gray-700 rounded-xl p-4 sm:p-6 space-y-3 shadow-sm hover:shadow-md transition-all duration-300">
      <h3 className="text-base font-semibold text-text-main-light dark:text-text-main-dark">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="space-y-4">
      <SectionCard title="👤 Contact Information">
        <InfoRow label="Name" value={contactData?.name} copyable />
        <InfoRow label="Email" value={contactData?.email} copyable />
        <InfoRow label="Contact" value={contactData?.contact} copyable />
        <InfoRow label="Type" value={contactData?.type} />
        <InfoRow
          label="Created At"
          value={
            contactData?.created_at
              ? new Date(contactData.created_at * 1000).toLocaleString()
              : "N/A"
          }
        />
      </SectionCard>

      <SectionCard title="🏦 Fund Account">
        <InfoRow label="Account ID" value={fundAccount?.id} copyable />
        <InfoRow label="Type" value={fundAccount?.account_type} />
        {payoutMethod === "bank" && (
          <>
            <InfoRow label="Account Name" value={fundAccount?.bank_account?.name} copyable />
            <InfoRow label="Account Number" value={fundAccount?.bank_account?.account_number} copyable />
            <InfoRow label="IFSC Code" value={fundAccount?.bank_account?.ifsc} copyable />
            <InfoRow label="Bank Name" value={bankMeta?.bank} />
            <InfoRow label="Branch" value={bankMeta?.branch} />
            <InfoRow label="Address" value={bankMeta?.address} />
          </>
        )}
        {payoutMethod === "card" && (
          <>
            <InfoRow label="Card Holder" value={fundAccount?.card?.name} copyable />
            <InfoRow label="Card Number" value={fundAccount?.card?.card_number} copyable />
            <InfoRow label="Expiry Date" value={fundAccount?.card?.expiry} />
            <InfoRow label="Card Type" value={bankMeta?.cardBrand} />
            <InfoRow label="Last 4 Digits" value={bankMeta?.last4} copyable />
          </>
        )}
        {payoutMethod === "upi" && (
          <>
            <InfoRow label="UPI ID" value={fundAccount?.vpa?.address} copyable />
            <InfoRow label="Address" value={bankMeta?.address} />
          </>
        )}
        <InfoRow
          label="Created At"
          value={
            fundAccount?.created_at
              ? new Date(fundAccount.created_at * 1000).toLocaleString()
              : "N/A"
          }
        />
      </SectionCard>

      {bankMeta && Object.keys(bankMeta).length > 0 && (
        <SectionCard title="🧾 Bank Meta">
          {Object.entries(bankMeta).map(([key, value]) => (
            <InfoRow
              key={key}
              label={key.replace(/([A-Z])/g, " $1").trim()}
              value={value}
              copyable={["bank", "branch", "address", "cardBrand", "last4", "vpa"].includes(key)}
            />
          ))}
        </SectionCard>
      )}

      <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
        <button
          onClick={() => copyToClipboard(JSON.stringify(bankDetails, null, 2))}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-text-main-light dark:text-text-main-dark hover:bg-blue-700 dark:hover:bg-blue-800 transition-all duration-300 text-sm"
        >
          <ClipboardCopy className="w-4 h-4" />
          Copy Raw Details
        </button>
        <button
          onClick={() => setContent("Please update your bank details to ensure timely payments.")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-600 text-text-main-light dark:text-text-main-dark hover:bg-gray-700 dark:hover:bg-gray-800 transition-all duration-300 text-sm"
        >
          Default Message
        </button>
      </div>
    </div>
  );
};

export default React.memo(ViewBankDetailsStandalone);