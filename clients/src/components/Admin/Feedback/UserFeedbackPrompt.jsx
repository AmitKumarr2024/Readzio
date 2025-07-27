import React from "react";
import { useDispatch } from "react-redux";
import { sendManualFeedbackPrompt } from "../../../store/userSlice";
import { toast } from "react-hot-toast";

const UserFeedbackPrompt = ({ users, loading, error }) => {
  const dispatch = useDispatch();
  const [sending, setSending] = React.useState({});

  const handleSendFeedbackPrompt = async (userId) => {
    try {
      setSending((prev) => ({ ...prev, [userId]: true }));
      await dispatch(
        sendManualFeedbackPrompt({
          userId,
          message: "We'd love your feedback!",
        })
      ).unwrap();
      toast.success("📨 Feedback request sent");
    } catch (err) {
      toast.error("Failed to send feedback prompt");
    } finally {
      setSending((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <h2 className="text-2xl font-semibold mb-4">Send Feedback Prompts</h2>
      {loading && <p>Loading users...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && users.length === 0 && <p>No users found.</p>}
      {!loading && users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <thead>
              <tr className="bg-blue-500 text-white">
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user._id}
                  className="border-b hover:bg-blue-50 dark:hover:bg-gray-600"
                >
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleSendFeedbackPrompt(user._id)}
                      disabled={sending[user._id]}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sending[user._id] ? "Sending..." : "Send Prompt"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserFeedbackPrompt;
