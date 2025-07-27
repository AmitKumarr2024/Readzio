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
  const [rating, setRating] = useState(5);
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
        setRating(5);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [submitted, onClose]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="flex items-center justify-center min-h-screen p-4">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Dialog.Panel className="bg-background-light dark:bg-background-dark p-8 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-700">
                {!submitted ? (
                  <div className="relative">
                    <div className={`${!submitting && message ? "blur-sm" : ""} transition-all duration-300`}>
                      <Dialog.Title className="text-2xl font-bold mb-6 text-text-main-light dark:text-text-main-dark text-center">
                        {promptMessage}
                      </Dialog.Title>

                      <div className="mb-6">
                        <label className="block text-sm font-medium mb-2 text-text-main-light dark:text-text-main-dark">
                          Rating
                        </label>
                        <div className="flex justify-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setRating(star)}
                              className={`text-2xl transition-colors ${
                                star <= rating
                                  ? "text-yellow-400"
                                  : "text-gray-300 dark:text-gray-500"
                              } hover:scale-110`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mb-6">
                        <label className="block text-sm font-medium mb-2 text-text-main-light dark:text-text-main-dark">
                          Message
                        </label>
                        <textarea
                          rows={4}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          placeholder="Tell us what you loved or how we can improve..."
                        />
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          onClick={onClose}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-text-main-light dark:text-text-main-dark rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>

                    <div className="absolute bottom-0 right-0">
                      <button
                        disabled={submitting || !message}
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                      >
                        {submitting ? "Sending..." : "Submit"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center py-8"
                  >
                    <h2 className="text-2xl font-semibold text-green-500 dark:text-green-400">
                      ✅ Thank you for your feedback!
                    </h2>
                    <p className="mt-2 text-text-main-light dark:text-text-main-dark">
                      We'll use it to make things even better!
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