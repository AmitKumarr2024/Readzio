import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Send, Loader2 } from "lucide-react";
import SpaceBackground from "../Utils/SpaceBackground";
import { createContactMessage } from "../store/adminSlice";
import toast from "react-hot-toast";

// Handles contact form submission
const Contact = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.admin || {});
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [success, setSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.info("Please login to comment.");
      return navigate("/login");
    }
    setSuccess(null);
    setErrorMessage("");
    try {
      await dispatch(createContactMessage(formData)).unwrap();
      setSuccess(true);
      toast.success("Message sent successfully!");
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      console.error("[Contact] Send message failed:", err);
      setSuccess(false);
      setErrorMessage(err || "Failed to send message.");
      toast.error(err || "Failed to send message.");
    }
  };

  return (
    <SpaceBackground>
      <section className="min-h-screen pt-6 pb-20 px-4 flex items-center justify-center">
        <div className="w-full max-w-lg backdrop-blur-md border border-gray-300 rounded-xl p-8 shadow-md bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
          <h1 className="text-2xl font-bold mb-2">Contact Us</h1>
          <p className="text-sm mb-6">
            Please fill out the form and we’ll get back to you as soon as we
            can.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Name input */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name <span className="text-xs">e.g. John Doe</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Email input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email <span className="text-xs">we’ll reply here</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Subject input */}
            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium mb-1"
              >
                Subject <span className="text-xs">short and clear</span>
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Account issue, bug report, etc."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Message input */}
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium mb-1"
              >
                Message{" "}
                <span className="text-xs">describe your issue or question</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows="4"
                value={formData.message}
                onChange={handleChange}
                required
                placeholder="Write your message here..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
          <p className="mt-8 text-center text-xs">
            Or email us at{" "}
            <a
              href="mailto:amit@example.com"
              className="text-blue-600 hover:underline"
            >
              inksha.official@gmail.com
            </a>
          </p>
        </div>
      </section>
    </SpaceBackground>
  );
};

export default Contact;
