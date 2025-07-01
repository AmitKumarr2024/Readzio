import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Users } from 'lucide-react';
import { initializeSocket, socketInstance } from '../store/socketSlice';
import { getAllUsers } from '../store/adminSlice';

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
          src={user.avatar || '/default-avatar.png'}
          alt={user.name || 'User'}
          className="w-12 h-12 rounded-full"
        />
        <div>
          <h3 className="font-semibold text-text-main-light dark:text-text-main-dark">
            {user.name || 'Unknown'} {isYou && <span className="text-xs text-blue-500">(You)</span>}
          </h3>
          <p className="text-sm text-text-main-light dark:text-text-main-dark">{user.email || 'No email'}</p>
        </div>
      </div>
      <p className="mt-2 text-sm text-text-main-light dark:text-text-main-dark truncate">{user.bio || 'No bio'}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-text-main-light dark:text-text-main-dark">
        <p><strong>Gender:</strong> {user.gender || 'N/A'}</p>
        <p><strong>Posts:</strong> {user.totalPosts || 0}</p>
      </div>
    </motion.div>
  );
};

const AllUsers = ({ users = [], loadMore, hasMore = false, loading = false, currentUserId }) => {
  const observer = useRef();
  const lastUserRef = useRef();

  useEffect(() => {
    if (loading || !hasMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      entries => {
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Users className="w-6 h-6 text-blue-600" /> Online Users
      </h2>
      {users.length === 0 ? (
        <p className="text-text-main-light dark:text-text-main-dark">No online users available</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user, index) => (
            <div key={user._id} ref={index === users.length - 1 ? lastUserRef : null}>
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
    error = null
  } = useSelector(state => state.admin || {});
  const { user: currentUser } = useSelector(state => state.auth || {});
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());

  useEffect(() => {
    dispatch(initializeSocket());
    dispatch(getAllUsers({ page: 1, limit: 50 }));
  }, [dispatch]);

  useEffect(() => {
    let cleanup = () => {};
    const interval = setInterval(() => {
      if (socketInstance && socketInstance.connected) {
        // Emit once socket is ready
        socketInstance.emit('getOnlineUsers');

        const handleOnlineList = (ids = []) => {
          setOnlineUserIds(new Set(ids));
        };

        const handleStatus = ({ userId, isOnline }) => {
          setOnlineUserIds(prev => {
            const updated = new Set(prev);
            isOnline ? updated.add(userId) : updated.delete(userId);
            return updated;
          });
        };

        socketInstance.on('onlineUsersList', handleOnlineList);
        socketInstance.on('userStatus', handleStatus);

        // Stop polling
        clearInterval(interval);

        // Set cleanup
        cleanup = () => {
          socketInstance.off('onlineUsersList', handleOnlineList);
          socketInstance.off('userStatus', handleStatus);
        };
      }
    }, 100);

    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, []);

  const loadMore = () => {
    if (currentPageUsers < totalPagesUsers && !loading) {
      dispatch(getAllUsers({ page: currentPageUsers + 1, limit: 10 }));
    }
  };

  let enrichedUsers = users.filter(
    user => user && user._id && onlineUserIds.has(user._id.toString())
  );

  if (
    currentUser &&
    currentUser._id &&
    onlineUserIds.has(currentUser._id.toString()) &&
    !enrichedUsers.find(u => u._id === currentUser._id)
  ) {
    enrichedUsers.unshift(currentUser);
  }

  return (
    <div className="w-full h-screen mx-auto py-6 px-4 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
      <h1 className="text-3xl font-bold text-text-main-light dark:text-text-main-dark mb-6 flex items-center gap-2">
        <Users className="w-8 h-8 text-blue-600" /> Online Community
      </h1>

      {error ? (
        <p className="text-red-500 text-center">Error: {error}</p>
      ) : loading && !users.length ? (
        <div className="text-center py-4">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
          <p>Loading users...</p>
        </div>
      ) : enrichedUsers.length === 0 ? (
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
