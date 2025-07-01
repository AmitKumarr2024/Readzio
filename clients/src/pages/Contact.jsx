import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Send, Loader2 } from "lucide-react";
import SpaceBackground from "../Utils/SpaceBackground";
import { createContactMessage } from "../store/adminSlice";

const Contact = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.admin || {});
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
    setSuccess(null);
    setErrorMessage("");

    try {
      const result = await dispatch(createContactMessage(formData)).unwrap();
      setSuccess(true);
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      setSuccess(false);
      setErrorMessage(err || "Failed to send message.");
    }
  };

  return (
    <SpaceBackground>
      <section className="min-h-screen pt-6 pb-20 px-4 flex items-center justify-center">
        <div className="w-full max-w-lg bg-white/90 backdrop-blur-md border border-gray-300 rounded-xl p-8 shadow-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Contact Us</h1>
          <p className="text-sm text-gray-600 mb-6">
            Please fill out the form and we’ll get back to you as soon as we can.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-xs text-gray-400">e.g. John Doe</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-xs text-gray-400">we’ll reply here</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-xs text-gray-400">short and clear</span>
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Account issue, bug report, etc."
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-xs text-gray-400">describe your issue or question</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows="4"
                value={formData.message}
                onChange={handleChange}
                required
                placeholder="Write your message here..."
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>

          {/* Feedback Messages */}
          {success === true && (
            <p className="mt-4 text-center text-sm text-green-600">✅ Message sent successfully!</p>
          )}
          {success === false && (
            <p className="mt-4 text-center text-sm text-red-600">❌ {errorMessage}</p>
          )}
          {error && !success && (
            <p className="mt-4 text-center text-sm text-red-600">❌ {error}</p>
          )}

          <p className="mt-8 text-center text-xs text-gray-500">
            Or email us at{" "}
            <a href="mailto:amit@example.com" className="text-blue-600 hover:underline">
              amit@example.com
            </a>
          </p>
        </div>
      </section>
    </SpaceBackground>
  );
};

export default Contact;