import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X } from "lucide-react";
import { createReport } from "../../store/adminSlice";
import { toast } from "react-hot-toast";

const ReportModal = ({ postId, slug, onClose }) => {
  const dispatch = useDispatch();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const { loading } = useSelector((state) => state.admin || {});

  const submitReport = async () => {
    if (!reason) {
      setErrorMsg("Please select a reason for reporting.");
      return;
    }

    try {
      setSuccessMsg(null);
      setErrorMsg(null);
      await dispatch(createReport({ slug, reason, details })).unwrap();
      setSuccessMsg("Report submitted successfully!");
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to submit report.");
      toast.error(err.message || "Report submission failed.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-2xl p-6 max-w-md w-full shadow-2xl relative transition-all duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold mb-4">Report Post</h2>

        {/* Reason */}
        <div className="mb-4">
          <label className="block mb-2 text-sm font-semibold">Select Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Select a Reason</option>
            <option value="spam">Spam</option>
            <option value="harassment">Harassment</option>
            <option value="hate">Hate Speech</option>
            <option value="false">False Information</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Details */}
        <div className="mb-4">
          <label className="block mb-2 text-sm font-semibold">Additional Details (optional)</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Provide more context..."
            className="w-full px-4 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Messages */}
        {errorMsg && <p className="text-red-600 text-sm mb-3">{errorMsg}</p>}
        {successMsg && <p className="text-green-600 text-sm mb-3">{successMsg}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-gray-400 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={submitReport}
            disabled={loading}
            className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-75 transition"
          >
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
