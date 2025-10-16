import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Loader2,
  Mail,
  User,
  MessageSquare,
  FileText,
} from "lucide-react";
import SpaceBackground from "../Utils/SpaceBackground";
import { createContactMessage } from "../store/adminSlice";
import { toast } from "react-hot-toast";

const Contact = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.admin || {});
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.info("Please login to send a message.");
      return navigate("/login");
    }

    try {
      await dispatch(createContactMessage(formData)).unwrap();
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      console.error("[Contact] Send message failed:", err);
      toast.error(err || "Failed to send message. Please try again.");
    }
  };

  return (
    <SpaceBackground>
      <section className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
              Get in Touch
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Have a question? We'd love to hear from you. Send us a message and
              we'll respond as soon as possible.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <User className="w-4 h-4 text-blue-500" />
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <Mail className="w-4 h-4 text-blue-500" />
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
                />
              </div>

              {/* Subject Field */}
              <div className="space-y-2">
                <label
                  htmlFor="subject"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <FileText className="w-4 h-4 text-blue-500" />
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="What's this about?"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
                />
              </div>

              {/* Message Field */}
              <div className="space-y-2">
                <label
                  htmlFor="message"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder="Tell us what's on your mind..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none resize-none"
                ></textarea>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Or reach us directly at{" "}
              <a
                href="mailto:readzio.official@gmail.com"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold hover:underline transition-colors"
              >
                readzio.official@gmail.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </SpaceBackground>
  );
};

export default Contact;
