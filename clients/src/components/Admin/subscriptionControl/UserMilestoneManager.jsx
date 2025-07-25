// Component: UserMilestoneManager.jsx
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  overrideUserMilestones,
  resetUserMilestones,
} from "../../../store/adminSlice";

const UserMilestoneManager = ({ users }) => {
  const dispatch = useDispatch();
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    followerCount: "",
    postCount: "",
    engagementRate: "",
    accountAgeDays: "",
    isEligibleForSubscription: false,
  });

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setFormData({
      followerCount: user.milestoneOverride?.followerCount ?? "",
      postCount: user.milestoneOverride?.postCount ?? "",
      engagementRate: user.milestoneOverride?.engagementRate ?? "",
      accountAgeDays: user.milestoneOverride?.accountAgeDays ?? "",
      isEligibleForSubscription: user.isEligibleForSubscription || false,
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleUpdate = () => {
    if (selectedUser) {
      dispatch(
        overrideUserMilestones({
          userId: selectedUser._id,
          overrideData: formData,
        })
      );
    }
  };

  const handleReset = () => {
    if (selectedUser) {
      dispatch(resetUserMilestones(selectedUser._id));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        User Milestone Overrides
      </h2>

      {selectedUser && (
        <div className="border p-4 rounded bg-gray-50 dark:bg-gray-700">
          <h3 className="text-lg font-semibold text-indigo-600">
            Editing: {selectedUser.name} ({selectedUser.email})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {[
              { name: "followerCount", label: "Follower Count" },
              { name: "postCount", label: "Post Count" },
              { name: "engagementRate", label: "Engagement Rate" },
              { name: "accountAgeDays", label: "Account Age (days)" },
            ].map(({ name, label }) => (
              <input
                key={name}
                type="number"
                name={name}
                value={formData[name]}
                onChange={handleChange}
                placeholder={label}
                className="border px-3 py-2 rounded w-full dark:bg-gray-600 dark:text-white"
              />
            ))}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isEligibleForSubscription"
                checked={formData.isEligibleForSubscription}
                onChange={handleChange}
              />
              <span className="text-gray-800 dark:text-gray-200">Force Eligible</span>
            </label>
          </div>

          <div className="flex gap-4 mt-4">
            <button
              onClick={handleUpdate}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Update
            </button>
            <button
              onClick={handleReset}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <table className="min-w-full mt-6 divide-y divide-gray-200 dark:divide-gray-600">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">#</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">Name</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">Email</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">Eligible?</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((user, index) => (
            <tr
              key={user._id}
              onClick={() => handleSelectUser(user)}
              className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              <td className="px-4 py-2">{index + 1}</td>
              <td className="px-4 py-2">{user.name}</td>
              <td className="px-4 py-2">{user.email}</td>
              <td className="px-4 py-2">{user.isEligibleForSubscription ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserMilestoneManager;
