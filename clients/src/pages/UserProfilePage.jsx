import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getUser, resetUpdateStatus } from "../store/userSlice";
import { initializeSocket } from "../store/socketSlice";
import UserProfileView from "../components/UserProfile/UserProfileView";
import UserProfileEdit from "../components/UserProfile/UserProfileEdit";
import toast from "react-hot-toast";
import Skeleton from "@/components/Ui/Skeleton";

const UserProfilePage = () => {
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state) => state.user);
  const { socket, isConnected } = useSelector((state) => state.socket);
  const currentUser = user;
  const [isEditing, setIsEditing] = useState(false);
  const isAdmin = currentUser?.role === "admin";

  // Initialize socket and fetch user
  useEffect(() => {
    dispatch(initializeSocket());
    if (!currentUser) {
      dispatch(getUser());
    }
  }, [dispatch, currentUser]);

  // Setup socket listener for profile updates
  useEffect(() => {
    if (socket && isConnected && currentUser?._id) {
      socket.on("userProfileUpdate", (updatedUser) => {
        if (updatedUser._id === currentUser._id) {
          dispatch(getUser());
          toast.success("Profile updated in real-time!");
        }
      });
      return () => socket.off("userProfileUpdate");
    }
  }, [socket, isConnected, currentUser, dispatch]);

  // Cleanup update status on unmount
  useEffect(() => {
    return () => dispatch(resetUpdateStatus());
  }, [dispatch]);

  // Render loading skeleton
  if (loading && !currentUser) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto bg-background-light dark:bg-background-dark rounded-2xl shadow-md space-y-6">
        <Skeleton height="h-48" rounded="rounded-lg" />
        <Skeleton width="w-28" height="h-28" rounded="rounded-full mx-auto" />
        <Skeleton width="w-36" height="h-8" rounded="rounded mx-auto" />
        <Skeleton width="w-1/2" height="h-6" rounded="rounded mx-auto" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-md mx-auto bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-2xl shadow-md text-center">
        <p className="mb-4">Error: {error}</p>
        <button
          className="btn btn-sm btn-outline btn-error"
          onClick={() => dispatch(getUser())}
        >
          Retry
        </button>
      </div>
    );
  }

  // Render null if no user
  if (!currentUser) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-2xl shadow-md">
      {/* Toggle edit/view button */}
      <button
        className="sticky top-4 z-50 right-4 sm:right-6 md:right-8 p-3 sm:p-4 text-base sm:text-lg font-Urbanist btn bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg shadow-md transition transform hover:scale-105"
        onClick={() => setIsEditing((prev) => !prev)}
        disabled={!currentUser || loading}
        aria-label={isEditing ? "View Profile" : "Edit Profile"}
      >
        {isEditing ? "View Profile" : "Edit Profile"}
      </button>

      {/* Render view or edit mode */}
      <div className="transition-all duration-300 ease-in-out">
        {isEditing ? (
          <UserProfileEdit
            user={currentUser}
            isAdmin={isAdmin}
            onClose={() => setIsEditing(false)}
          />
        ) : (
          <UserProfileView user={currentUser} loading={loading} />
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;
