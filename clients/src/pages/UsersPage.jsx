import React, { useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Users } from "lucide-react";
import { initializeSocket } from "../store/socketSlice";
import { getAllUsers } from "../store/adminSlice";

const UserCard = ({ user, isYou }) => {
  const navigate = useNavigate();

  if (!user || !user._id) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-all border-l-4 border-green-500"
      onClick={() => navigate(`/author-profile/${user._id}`)}
    >
      <div className="flex items-center gap-4">
        <img
          src={user.avatar || "/default-avatar.png"}
          alt={user.name || "User"}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div>
          <h3 className="font-semibold text-text-main-light dark:text-text-main-dark">
            {user.name || "Unknown"}{" "}
            {isYou && <span className="text-xs text-blue-500">(You)</span>}
          </h3>
          <p className="text-sm text-text-main-light dark:text-text-main-dark">
            {user.email || "No email"}
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm text-text-main-light dark:text-text-main-dark truncate">
        {user.bio || "No bio"}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-text-main-light dark:text-text-main-dark">
        <p>
          <strong>Gender:</strong> {user.gender || "N/A"}
        </p>
      </div>
    </motion.div>
  );
};

const AllUsers = ({
  users = [],
  loadMore,
  hasMore = false,
  loading = false,
  currentUserId,
}) => {
  const observer = useRef();
  const lastUserRef = useRef();

  useEffect(() => {
    if (loading || !hasMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    if (lastUserRef.current) observer.current.observe(lastUserRef.current);
    return () => observer.current?.disconnect();
  }, [loadMore, loading, hasMore]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-md"
    >
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Users className="w-6 h-6 text-blue-600" /> Online Users
      </h2>
      {users.length === 0 ? (
        <p className="text-text-main-light dark:text-text-main-dark">
          No online users available
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user, index) => (
            <div
              key={user._id}
              ref={index === users.length - 1 ? lastUserRef : null}
            >
              <UserCard user={user} isYou={user._id === currentUserId} />
            </div>
          ))}
        </div>
      )}
      {loading && (
        <div className="text-center py-4">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
        </div>
      )}
      {!hasMore && users.length > 0 && (
        <p className="text-center text-gray-500 mt-4">No more online users</p>
      )}
    </motion.div>
  );
};

const UsersPage = () => {
  const dispatch = useDispatch();
  const {
    users = [],
    currentPageUsers = 1,
    totalPagesUsers = 1,
    loading = false,
    error = null,
  } = useSelector((state) => state.admin || {});
  const { user: currentUser } = useSelector((state) => state.auth || {});
  const { userStatus, status: socketStatus } = useSelector(
    (state) => state.socket || {}
  );

  // ✅ FIX 1: Initialize socket first, then fetch users
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Wait for socket to connect first
        await dispatch(initializeSocket()).unwrap();
        // Then fetch users
        dispatch(getAllUsers({ page: 1, limit: 50 }));
      } catch (error) {
        console.error("Failed to initialize:", error);
        // Still try to fetch users even if socket fails
        dispatch(getAllUsers({ page: 1, limit: 50 }));
      }
    };

    initializeData();
  }, [dispatch]);

  const loadMore = () => {
    if (currentPageUsers < totalPagesUsers && !loading) {
      dispatch(getAllUsers({ page: currentPageUsers + 1, limit: 10 }));
    }
  };

  // ✅ FIX 2: Use useMemo to prevent unnecessary recalculations
  const enrichedUsers = useMemo(() => {
    // If socket not connected yet, show all users instead of empty list
    const onlineUserIds = Object.keys(userStatus).filter(
      (userId) => userStatus[userId]?.isOnline
    );

    // If no socket status yet, show all users (better UX than empty page)
    let filteredUsers =
      socketStatus === "connected" && onlineUserIds.length > 0
        ? users.filter(
            (user) =>
              user && user._id && onlineUserIds.includes(user._id.toString())
          )
        : users; // Show all users if socket not ready

    // Add current user if they're online and not already in the list
    if (
      currentUser &&
      currentUser._id &&
      userStatus[currentUser._id]?.isOnline &&
      !filteredUsers.find((u) => u._id === currentUser._id)
    ) {
      filteredUsers = [currentUser, ...filteredUsers];
    }

    return filteredUsers;
  }, [users, userStatus, currentUser, socketStatus]);

  // ✅ FIX 3: Show loading only on initial load
  const isInitialLoading = loading && !users.length;

  // ✅ FIX 4: Better empty state handling
  const showEmptyState =
    !isInitialLoading &&
    enrichedUsers.length === 0 &&
    socketStatus === "connected";

  return (
    <div className="w-full min-h-screen mx-auto py-6 px-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <h1 className="text-3xl font-bold text-text-main-light dark:text-text-main-dark mb-6 flex items-center gap-2">
        <Users className="w-8 h-8 text-blue-600" /> Online Community
      </h1>

      {/* Socket Status Indicator (for debugging) */}
      {socketStatus !== "connected" && (
        <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Connecting to server...</span>
        </div>
      )}

      {error ? (
        <p className="text-red-500 text-center">Error: {error}</p>
      ) : isInitialLoading ? (
        <div className="text-center py-4">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
          <p>Loading users...</p>
        </div>
      ) : showEmptyState ? (
        <p className="text-gray-500 text-center">No online users found</p>
      ) : (
        <AllUsers
          users={enrichedUsers}
          loadMore={loadMore}
          hasMore={currentPageUsers < totalPagesUsers}
          loading={loading}
          currentUserId={currentUser?._id}
        />
      )}
    </div>
  );
};

export default UsersPage;
