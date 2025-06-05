import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Skeleton from "../components/UI/Skeleton";
import { getUser } from "../store/userSlice";
import UserProfileView from "../components/UserProfile/UserProfileView";
import UserProfileEdit from "../components/UserProfile/UserProfileEdit";
import toast from "react-hot-toast";

const UserProfilePage = () => {
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state) => state.user);

  const currentUser = user?.data;

  const [isEditing, setIsEditing] = useState(false);
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    if (!currentUser) {
      dispatch(getUser());
    }
  }, [dispatch, currentUser]);

  useEffect(() => {
    const successFlag = localStorage.getItem("profileUpdateSuccess");
    if (successFlag === "true") {
      setTimeout(() => {
        toast.success("Profile updated successfully!");
        localStorage.removeItem("profileUpdateSuccess");
      }, 1000);
    }
  }, []);

  const handleUpdateSuccess = () => {
    localStorage.setItem("profileUpdateSuccess", "true");
    window.location.reload();
  };

  if (loading && !currentUser) {
    return (
      <div className="p-4 sm:p-6 space-y-6 w-full sm:max-w-md mx-auto bg-white rounded-2xl shadow-md transition-all duration-300">
        <Skeleton height="h-48" rounded="rounded-lg" />
        <Skeleton width="w-28" height="h-28" rounded="rounded-full mx-auto" />
        <Skeleton
          width="w-36"
          height="h-8"
          rounded="rounded"
          className="mx-auto"
        />
        <Skeleton
          width="w-1/2"
          height="h-6"
          rounded="rounded"
          className="mx-auto"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 w-full sm:max-w-md mx-auto bg-red-100 text-red-700 rounded-2xl shadow-md text-center transition-all duration-300">
        <p className="mb-4">Error loading user: {error}</p>
        <button
          className="btn btn-sm btn-outline btn-error"
          onClick={() => dispatch(getUser())}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative p-4 sm:p-6 w-full sm:max-w-full mx-auto transition-all duration-300">
      <button
        className="fixed z-50 right-12 text-xl p-3 btn btn-sm btn-secondary mb-6"
        onClick={() => setIsEditing((prev) => !prev)}
        disabled={!currentUser}
      >
        {isEditing ? "View Profile" : "Edit Profile"}
      </button>

      {currentUser ? (
        <div className="transition-all duration-300 ease-in-out">
          {isEditing ? (
            <UserProfileEdit
              user={currentUser}
              loading={loading}
              isAdmin={isAdmin}
              onClose={() => setIsEditing(false)}
              onUpdateSuccess={handleUpdateSuccess}
            />
          ) : (
            <UserProfileView user={currentUser} loading={loading} />
          )}
        </div>
      ) : (
        <p>Loading user data...</p>
      )}
    </div>
  );
};

export default UserProfilePage;
