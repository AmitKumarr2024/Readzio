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
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md mx-auto shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-red-600 transition-colors p-2"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-800">Report Post</h2>

        <div className="mb-4">
          <label className="block mb-2 text-sm font-semibold text-gray-700">Select Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border rounded-md border-gray-300 bg-white dark:bg-gray-800"
          >
            <option value="">Select a Reason</option>
            <option value="spam">Spam</option>
            <option value="harassment">Harassment</option>
            <option value="hate">Hate Speech</option>
            <option value="false">False Information</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-2 text-sm font-semibold text-gray-700">Additional Details (optional)</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="w-full px-3 py-2 border rounded-md border-gray-300 resize-none h-24 dark:bg-gray-800"
            placeholder="Provide more context..."
          />
        </div>

        {errorMsg && <p className="text-red-600 text-sm mb-3">{errorMsg}</p>}
        {successMsg && <p className="text-green-600 text-sm mb-3">{successMsg}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submitReport}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-75 transition-colors"
          >
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;