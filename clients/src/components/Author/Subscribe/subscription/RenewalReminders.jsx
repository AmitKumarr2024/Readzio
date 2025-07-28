import { useState } from "react";
import { useDispatch } from "react-redux";
import { sendRenewalReminders } from "../../../../store/subscriptionSlice";
import {toast} from "react-hot-toast";

const RenewalReminders = () => {
  const dispatch = useDispatch();
  const [reminderDays, setReminderDays] = useState(7);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSendReminders = async () => {
    // console.log("RenewalReminders: Sending renewal reminders", { reminderDays });
    setLoading(true);
    setErrorMessage(null);

    try {
      await dispatch(sendRenewalReminders({ daysBeforeExpiry: reminderDays })).unwrap();
      // console.log("RenewalReminders: Renewal reminders sent successfully");
      toast.success("Renewal reminders sent successfully");
    } catch (error) {
      console.error("RenewalReminders: Failed to send reminders", { error: error.message });
      setErrorMessage(error.message || "Failed to send reminders. Please try again.");
      toast.error(error.message || "Failed to send reminders.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark  shadow-2xl rounded-3xl p-8 mb-8 max-w-6xl mx-auto border border-gray-100">
      <h2 className="text-3xl font-extrabold text-text-main-light dark:text-text-main-dark mb-6 text-center bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
        Send Renewal Reminders
      </h2>

      {errorMessage && (
        <div className="bg-background-light dark:bg-background-dark  text-red-600 px-6 py-4 rounded-lg mb-6 font-medium shadow-sm text-center">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="number"
          placeholder="Days before expiry"
          value={reminderDays}
          onChange={(e) => setReminderDays(Number(e.target.value))}
          className="w-full p-4 rounded-lg border border-gray-300 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 hover:shadow-sm"
          required
          min="1"
        />
        <button
          onClick={handleSendReminders}
          disabled={loading}
          className={`w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600  text-text-main-light dark:text-text-main-dark font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 ${
            loading ? "opacity-50 cursor-not-allowed" : "hover:from-blue-700 hover:to-purple-700"
          }`}
        >
          {loading ? "Sending..." : "Send Reminders"}
        </button>
      </div>
    </div>
  );
};

export default RenewalReminders;