import React, { useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import {
  overrideUserMilestones,
  resetUserMilestones,
} from "../../../store/adminSlice";
import { toast } from "react-hot-toast";
import Pagination from "../../../Utils/Pagination";

const UserMilestoneManager = ({ users }) => {
  const dispatch = useDispatch();
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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

  const handleUpdate = async () => {
    if (!selectedUser) return;

    const res = await dispatch(
      overrideUserMilestones({
        userId: selectedUser._id,
        overrideData: formData,
      })
    );

    if (res?.payload?.success) {
      toast.success("User milestone updated");

      const updated = res.payload;
      const updatedUser = {
        ...selectedUser,
        milestoneOverride: updated.milestoneOverride,
        isEligibleForSubscription: updated.isEligibleForSubscription,
      };

      setSelectedUser(updatedUser);
      setFormData({
        followerCount: updated.milestoneOverride.followerCount ?? "",
        postCount: updated.milestoneOverride.postCount ?? "",
        engagementRate: updated.milestoneOverride.engagementRate ?? "",
        accountAgeDays: updated.milestoneOverride.accountAgeDays ?? "",
        isEligibleForSubscription: updated.isEligibleForSubscription ?? false,
      });
    } else {
      toast.error("Failed to update milestones");
    }
  };

  const handleReset = async () => {
    if (!selectedUser) return;

    const res = await dispatch(resetUserMilestones(selectedUser._id));
    if (res?.payload?.success) {
      toast.success("Milestones reset to default");

      const updatedUser = {
        ...selectedUser,
        milestoneOverride: {
          followerCount: null,
          postCount: null,
          engagementRate: null,
          accountAgeDays: null,
        },
      };

      setSelectedUser(updatedUser);
      setFormData({
        followerCount: "",
        postCount: "",
        engagementRate: "",
        accountAgeDays: "",
        isEligibleForSubscription:
          selectedUser.isEligibleForSubscription ?? false,
      });
    } else {
      toast.error("Failed to reset milestones");
    }
  };

  const isUserForcedEligible = (user) => {
    const o = user.milestoneOverride;
    return (
      o?.followerCount !== null ||
      o?.postCount !== null ||
      o?.engagementRate !== null ||
      o?.accountAgeDays !== null
    );
  };

  const filteredUsers = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search)
    );
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="bg-background-light dark:bg-background-dark shadow rounded-lg p-6 space-y-6 text-text-main-light dark:text-text-main-dark">
      <h2 className="text-xl font-bold">User Milestone Overrides</h2>

      <input
        type="text"
        placeholder="Search by name or email"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1);
        }}
        className="border px-3 py-2 rounded w-full dark:bg-gray-700 dark:text-white"
      />

      {selectedUser && (
        <div className="border p-4 rounded bg-gray-50 dark:bg-gray-700">
          <h3 className="text-lg font-semibold text-indigo-600">
            Editing: {selectedUser.name} ({selectedUser.email})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {[
              "followerCount",
              "postCount",
              "engagementRate",
              "accountAgeDays",
            ].map((name) => {
              const label = name
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase());
              const actual =
                name === "followerCount"
                  ? selectedUser.followers?.length || 0
                  : selectedUser[name] || 0;

              return (
                <div key={name} className="space-y-1">
                  <label className="block text-sm font-medium">
                    {label}{" "}
                    <span className="text-xs text-gray-500">
                      (Actual: {actual})
                    </span>
                  </label>
                  <input
                    type="number"
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    placeholder={`Override ${label}`}
                    className="border px-3 py-2 rounded w-full dark:bg-gray-600 dark:text-white"
                  />
                </div>
              );
            })}

            <label className="flex items-center gap-2 col-span-2">
              <input
                type="checkbox"
                name="isEligibleForSubscription"
                checked={formData.isEligibleForSubscription}
                onChange={handleChange}
              />
              <span className="text-sm font-medium">Force Eligible</span>
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
            <th className="px-4 py-2 text-left text-sm font-medium">#</th>
            <th className="px-4 py-2 text-left text-sm font-medium">Name</th>
            <th className="px-4 py-2 text-left text-sm font-medium">Email</th>
            <th className="px-4 py-2 text-left text-sm font-medium">
              Eligible?
            </th>
            <th className="px-4 py-2 text-left text-sm font-medium">
              Force Eligible
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {paginatedUsers.map((user, index) => (
            <tr
              key={user._id}
              onClick={() => handleSelectUser(user)}
              className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              <td className="px-4 py-2">
                {(currentPage - 1) * pageSize + index + 1}
              </td>
              <td className="px-4 py-2">{user.name}</td>
              <td className="px-4 py-2">{user.email}</td>
              <td className="px-4 py-2">
                {user.isEligibleForSubscription ? "Yes" : "No"}
              </td>
              <td className="px-4 py-2">
                {isUserForcedEligible(user) ? "Yes" : "No"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default UserMilestoneManager;
