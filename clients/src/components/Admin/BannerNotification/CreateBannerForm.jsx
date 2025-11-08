import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { Send, Globe, MapPin } from "lucide-react";
import { createBannerNotification } from "../../../store/bannerNotificationSlice";

const CreateBannerForm = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [region, setRegion] = useState("global");
  const [expiresAt, setExpiresAt] = useState("");
  const [link, setLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user || user.role !== "admin") return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error("Title and message are required");
      return;
    }
    setIsSubmitting(true);
    try {
      await dispatch(
        createBannerNotification({ title, message, region, expiresAt, link })
      ).unwrap();
      toast.success("Notification sent!");
      setTitle("");
      setMessage("");
      setRegion("global");
      setExpiresAt("");
      setLink("");
    } catch (err) {
      toast.error(err || "Failed to send notification");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 mb-8 animate-fadeIn border border-gray-100 dark:border-gray-700">
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl animate-pulse-slow">
          <Globe className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
          Create Broadcast Notification
        </h2>
      </div>

      <div className="space-y-5">
        <div className="relative group">
          <input
            type="text"
            placeholder="Notification Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-4 pl-12 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-500"
          />
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors duration-300">
            <MapPin className="w-5 h-5" />
          </span>
        </div>

        <div className="relative group">
          <textarea
            placeholder="Notification Message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none hover:border-blue-300 dark:hover:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="relative group">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full p-4 pr-10 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 appearance-none hover:border-blue-300 dark:hover:border-blue-500 cursor-pointer"
            >
              <option value="global">🌍 Global</option>
              <option value="India">🇮🇳 India</option>
              <option value="US">🇺🇸 US</option>
              <option value="Europe">🇪🇺 Europe</option>
            </select>
            <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-blue-500 transition-colors duration-300">
              <Globe className="w-5 h-5" />
            </span>
          </div>

          <div className="relative group">
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-500"
            />
          </div>
        </div>

        <div className="relative group">
          <input
            type="url"
            placeholder="Notification Link (optional)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-500"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send Notification
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateBannerForm;
