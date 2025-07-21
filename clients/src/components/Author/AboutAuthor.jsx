import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  getUserById,
  fetchUserActivity,
} from "../../store/userSlice";
import { fetchUserPosts } from "../../store/postSlice";
import {
  followUser,
  unfollowUser,
  getFollowStatus,
  fetchFollowers,
  fetchFollowing,
} from "../../store/followSlice";
import { fetchUserAchievements } from "../../store/achievementSlice";
import { logout } from "../../store/authSlice";
import Skeleton from "../Ui/Skeleton";

const AboutAuthor = ({ authorId }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    selectedUser,
    selectedUserLoading,
    selectedUserError,
  } = useSelector((state) => state.user);
  const { posts, totalPosts, loading: postsLoading } = useSelector((state) => state.post);
  const { userId, following, loading: followLoading } = useSelector((state) => state.follow);
  const { badges, loading: achievementsLoading } = useSelector((state) => state.achievements);

  const [activeTab, setActiveTab] = useState("Posts");
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!authorId) return;
    dispatch(getUserById(authorId));
    dispatch(fetchUserPosts({ userId: authorId, page: 1, limit: 10 }));
    dispatch(fetchUserActivity(authorId));
    dispatch(fetchUserAchievements());
    dispatch(fetchFollowers());
    dispatch(fetchFollowing());
    dispatch(getFollowStatus(authorId)).then((res) => {
      setIsFollowing(res.payload?.isFollowing);
    });
  }, [dispatch, authorId]);

  const handleFollowToggle = () => {
    const action = isFollowing ? unfollowUser : followUser;
    dispatch(action(authorId)).then(() => {
      setIsFollowing((prev) => !prev);
    });
  };

  const handleEditProfile = () => navigate("/edit-profile");
  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  if (selectedUserLoading) {
    return (
      <div className="text-center py-4">
        <Skeleton width="w-40" height="h-6" className="mx-auto mb-2" />
        <Skeleton width="w-24" height="h-6" className="mx-auto mb-1" />
        <Skeleton width="w-32" height="h-4" className="mx-auto" />
      </div>
    );
  }

  if (selectedUserError || !selectedUser) {
    return (
      <div className="text-center py-4">
        Author Details Not Found 😕
      </div>
    );
  }

  const followersCount = selectedUser.followers?.length || 0;
  const followingCount = selectedUser.following?.length || 0;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex flex-col items-center gap-3">
          {selectedUser.avatar ? (
            <img
              src={selectedUser.avatar}
              alt={selectedUser.name}
              className="w-24 h-24 rounded-full object-cover border shadow-sm"
            />
          ) : (
            <Skeleton width="w-24" height="h-24" rounded="rounded-full" />
          )}
          <h1 className="text-3xl font-extrabold">
            {selectedUser.name || "Unknown User"}
          </h1>
          <p className="text-lg font-medium">@{selectedUser.handle || "unknown"}</p>
          <p className="text-base">{selectedUser.profession || "Content Creator"}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 py-6">
          {["Posts", "Followers", "Following"].map((label, i) => (
            <div key={i} className="min-w-[120px] text-center border rounded-xl p-4">
              {selectedUserLoading || followLoading ? (
                <>
                  <Skeleton width="w-10" height="h-6" className="mx-auto" />
                  <Skeleton width="w-20" height="h-3" className="mx-auto mt-1" />
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    {label === "Posts"
                      ? totalPosts || posts.length || 0
                      : label === "Followers"
                      ? followersCount
                      : followingCount}
                  </p>
                  <p className="text-sm">{label}</p>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4">
          {userId === authorId ? (
            <>
              <button onClick={handleEditProfile} className="btn">Edit Profile</button>
              <button onClick={handleLogout} className="btn bg-red-500 hover:bg-red-600 text-white">Logout</button>
            </>
          ) : (
            <button
              onClick={handleFollowToggle}
              className={`btn text-white ${
                isFollowing ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </button>
          )}
        </div>

        <div className="flex justify-center border-b mt-6">
          {["Posts", "About"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-bold ${
                activeTab === tab ? "border-b-2 border-black dark:border-white" : "text-gray-400"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Posts" && (
          <div className="py-6">
            {postsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array(6).fill().map((_, i) => (
                  <div key={i} className="border rounded-xl p-4">
                    <Skeleton width="w-full" height="h-32" rounded="rounded-lg" className="mb-2" />
                    <Skeleton width="w-3/4" height="h-4" className="mb-1" />
                    <Skeleton width="w-1/2" height="h-3" />
                  </div>
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <div
                    key={post._id}
                    className="cursor-pointer border rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => navigate(`/post/${post.slug}`)}
                  >
                    {post.thumbnail ? (
                      <img
                        src={post.thumbnail}
                        alt={post.title}
                        className="w-full h-32 object-cover rounded-lg mb-2"
                      />
                    ) : (
                      <Skeleton width="w-full" height="h-32" rounded="rounded-lg" className="mb-2" />
                    )}
                    <h4 className="text-lg font-semibold">{post.title}</h4>
                    <p className="text-sm mt-1">{post.excerpt || "No excerpt available."}</p>
                    <p className="text-sm mt-1">Views: {post.views || 0}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center">No posts available.</p>
            )}
          </div>
        )}

        {activeTab === "About" && (
          <div className="py-6">
            <h3 className="text-xl font-semibold mb-2">About</h3>
            <div className="border rounded-xl p-4">
              <p>{selectedUser.bio || "No bio available."}</p>
            </div>
            {achievementsLoading ? (
              <div className="flex flex-wrap gap-3 mt-4">
                {Array(4).fill().map((_, i) => (
                  <Skeleton key={i} width="w-24" height="h-8" rounded="rounded-lg" />
                ))}
              </div>
            ) : badges.length > 0 ? (
              <div className="mt-4">
                <h4 className="text-lg font-semibold mb-2">Achievements</h4>
                <div className="flex flex-wrap gap-2">
                  {badges.map((badge, i) => (
                    <div key={i} className="bg-yellow-100 p-2 rounded-lg text-sm font-medium shadow-sm">
                      {badge.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center mt-4">No achievements yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AboutAuthor;