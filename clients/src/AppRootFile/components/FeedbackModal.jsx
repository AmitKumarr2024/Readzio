import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { submitUserFeedback } from "../../store/userSlice";
import { Dialog } from "@headlessui/react";

const FeedbackModal = ({
  isOpen,
  onClose,
  message: promptMessage = "🌟 Share Your Feedback",
}) => {
  const dispatch = useDispatch();
  const { submitting } = useSelector((state) => state.user.feedback);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    dispatch(submitUserFeedback({ rating, message })).then(() => {
      setSubmitted(true);
    });
  };

  // Auto-close after 2 seconds
  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => {
        onClose();
        setSubmitted(false);
        setMessage("");
        setRating(5);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [submitted, onClose]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/25" />
      <div className="fixed inset-0 flex items-center justify-center">
        <Dialog.Panel className="bg-white dark:bg-gray-800 p-6 rounded-xl w-[90%] max-w-md shadow-xl">
          {!submitted ? (
            <>
              <Dialog.Title className="text-xl font-bold mb-4 text-center">
                {promptMessage}
              </Dialog.Title>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Rating</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full border px-3 py-2 rounded"
                >
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>
                      {r} Star{r !== 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Message
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                  placeholder="Tell us what you liked or what could be improved..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="bg-gray-300 dark:bg-gray-700 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting || !message}
                  onClick={handleSubmit}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Submit"}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">
                ✅ Thank you for your feedback!
              </h2>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default FeedbackModal;
