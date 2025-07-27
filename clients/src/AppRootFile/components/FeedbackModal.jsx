import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { submitUserFeedback } from "../../store/userSlice";
import { Dialog } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";

const FeedbackModal = ({
  isOpen,
  onClose,
  message: promptMessage = "🌟 Share Your Feedback",
}) => {
  const dispatch = useDispatch();
  const { submitting } = useSelector((state) => state.user.feedback);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    dispatch(submitUserFeedback({ rating, message })).then(() => {
      setSubmitted(true);
    });
  };

  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => {
        onClose();
        setSubmitted(false);
        setMessage("");
        setRating(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [submitted, onClose]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      {/* Centered Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-md"
            >
              <Dialog.Panel className="relative rounded-2xl bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-6 shadow-xl border border-gray-100 dark:border-gray-700">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-text-main-light dark:text-text-main-dark hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label="Close modal"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {!submitted ? (
                  <>
                    <Dialog.Title className="text-xl font-semibold text-center mb-6">
                      {promptMessage}
                    </Dialog.Title>

                    {/* Rating */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2">
                        Your Rating
                      </label>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
                            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                          >
                            <span
                              className={`text-2xl transition-colors duration-200 ${star <= rating
                                  ? "text-yellow-400"
                                  : "text-gray-300 dark:text-gray-500"
                                } hover:text-yellow-300`}
                            >
                              ★
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message Box */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2">
                        Your Feedback
                      </label>
                      <textarea
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                        placeholder="Tell us what you loved or how we can improve..."
                        aria-describedby="feedback-message"
                      />
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={onClose}
                        className="px-4 py-2 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Cancel feedback"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={submitting || !message || rating === 0}
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Submit feedback"
                      >
                        {submitting ? "Sending..." : "Submit"}
                      </button>
                    </div>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-center py-6"
                  >
                    <h2 className="text-xl font-semibold text-green-500 dark:text-green-400">
                      Thank you for your feedback!
                    </h2>
                    <p className="mt-2 text-gray-800 dark:text-gray-200">
                      We’ll use it to make things even better!
                    </p>
                  </motion.div>
                )}
              </Dialog.Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Dialog>
  );
};

export default FeedbackModal;