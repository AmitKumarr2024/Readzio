import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createBannerNotification } from "../../../store/adminSlice";
import {toast} from "react-hot-toast";
import { Send, Globe, MapPin } from "lucide-react";

const CreateBannerForm = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [region, setRegion] = useState("global");
  const [expiresAt, setExpiresAt] = useState("");
  const [link, setLink] = useState("");

  if (!user || user.role !== "admin") return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error("Title and message are required");
      return;
    }
    try {
      await dispatch(createBannerNotification({ title, message, region, expiresAt, link })).unwrap();
      toast.success("Notification sent!");
      setTitle("");
      setMessage("");
      setRegion("global");
      setExpiresAt("");
      setLink("");
    } catch (err) {
      toast.error(err || "Failed to send notification");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Create Broadcast Notification
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Notification Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <MapPin className="w-5 h-5" />
          </span>
        </div>
        <div className="relative">
          <textarea
            placeholder="Notification Message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
          />
        </div>
        <div className="relative">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none"
          >
            <option value="global">Global</option>
            <option value="India">India</option>
            <option value="US">US</option>
            <option value="Europe">Europe</option>
          </select>
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
            <Globe className="w-5 h-5" />
          </span>
        </div>
        <div className="relative">
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          />
        </div>
        <div className="relative">
          <input
            type="url"
            placeholder="Notification Link (optional)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Send className="w-5 h-5" />
          Send Notification
        </button>
      </form>
    </div>
  );
};

export default CreateBannerForm;