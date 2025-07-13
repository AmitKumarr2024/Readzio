import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Skeleton from "../components/Ui/Skeleton";
import { getUser, resetUpdateStatus } from "../store/userSlice";
import { initializeSocket } from "../store/socketSlice";
import UserProfileView from "../components/UserProfile/UserProfileView";
import UserProfileEdit from "../components/UserProfile/UserProfileEdit";
import toast from "react-hot-toast";

const UserProfilePage = () => {
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state) => state.user);
  const { socket, isConnected } = useSelector((state) => state.socket);
  const currentUser = user;
  const [isEditing, setIsEditing] = useState(false);
  const isAdmin = currentUser?.role === "admin";

  console.log("[UserProfilePage] Initial state:", {
    user,
    currentUser,
    loading,
    error,
    isConnected,
    isEditing,
    isAdmin,
  });

  useEffect(() => {
    console.log(
      "[UserProfilePage] useEffect: Initializing socket and fetching user"
    );
    dispatch(initializeSocket());
    if (!currentUser) {
      console.log("[UserProfilePage] No currentUser, dispatching getUser");
      dispatch(getUser());
    } else {
      console.log("[UserProfilePage] currentUser exists:", currentUser._id);
    }
  }, [dispatch, currentUser]);

  useEffect(() => {
    if (socket && isConnected && currentUser?._id) {
      console.log(
        "[UserProfilePage] Socket connected, setting up userProfileUpdate listener for user:",
        currentUser._id
      );
      socket.on("userProfileUpdate", (updatedUser) => {
        console.log(
          "[UserProfilePage] Received userProfileUpdate:",
          updatedUser
        );
        if (updatedUser._id === currentUser._id) {
          console.log(
            "[UserProfilePage] Updating user data for:",
            currentUser._id
          );
          dispatch(getUser());
          toast.success("Profile updated in real-time!");
        } else {
          console.log(
            "[UserProfilePage] Update ignored, user ID mismatch:",
            updatedUser._id
          );
        }
      });

      return () => {
        console.log("[UserProfilePage] Cleaning up socket listener");
        socket.off("userProfileUpdate");
      };
    } else {
      console.log("[UserProfilePage] Socket setup skipped:", {
        socket: !!socket,
        isConnected,
        userId: currentUser?._id,
      });
    }
  }, [socket, isConnected, currentUser, dispatch]);

  useEffect(() => {
    return () => {
      console.log("[UserProfilePage] Cleaning up: Resetting update status");
      dispatch(resetUpdateStatus());
    };
  }, [dispatch]);

  console.log("[UserProfilePage] Render conditions:", {
    loading,
    currentUser: !!currentUser,
    error,
  });

  if (loading && !currentUser) {
    console.log("[UserProfilePage] Rendering: Loading skeleton");
    return (
      <div className="p-4 sm:p-6 space-y-6 w-full sm:max-w-md mx-auto bg-background-light dark:bg-background-dark rounded-2xl shadow-md">
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
    console.log("[UserProfilePage] Rendering: Error state", { error });
    return (
      <div className="p-4 sm:p-6 w-full sm:max-w-md mx-auto bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-2xl shadow-md text-center">
        <p className="mb-4">Error: {error}</p>
        <button
          className="btn btn-sm btn-outline btn-error"
          onClick={() => {
            console.log(
              "[UserProfilePage] Retry button clicked, dispatching getUser"
            );
            dispatch(getUser());
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!currentUser) {
    console.log("[UserProfilePage] Rendering: Null (no currentUser)");
    return null;
  }

  console.log("[UserProfilePage] Rendering: Main content", {
    isEditing,
    isAdmin,
  });

  console.log(
    "[UserProfilePage] Attempting to render:",
    isEditing ? "UserProfileEdit" : "UserProfileView"
  );

  return (
    <div className="relative p-4 sm:p-6 w-full sm:max-w-full mx-auto bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <button
        className="sticky top-4 z-50 text-lg right-12 p-5 font-(family-name:--font-Urbanist) btn btn-sm bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg shadow-md transition transform hover:scale-105"
        onClick={() => {
          console.log(
            "[UserProfilePage] Edit/View button clicked, toggling isEditing:",
            !isEditing
          );
          setIsEditing((prev) => !prev);
        }}
        disabled={!currentUser || loading}
        aria-label={isEditing ? "View Profile" : "Edit Profile"}
      >
        {isEditing ? "View Profile" : "Edit Profile"}
      </button>

      <div className="transition-all duration-300 ease-in-out transform ">
        {isEditing ? (
          <UserProfileEdit
            user={currentUser}
            isAdmin={isAdmin}
            onClose={() => {
              console.log("[UserProfilePage] Closing edit mode");
              setIsEditing(false);
            }}
          />
        ) : (
          <UserProfileView user={currentUser} loading={loading} />
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;
