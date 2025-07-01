import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserAchievements, calculateUserAchievements } from "../../../store/achievementSlice";

const AchievementsComponent = ({ userId, readOnly, author }) => {
  const dispatch = useDispatch();
  const [refresh, setRefresh] = useState(false);

  const { badges = [], metrics = null, loading = false, error = null } = useSelector(
    (state) => state.achievements || {}
  );

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserAchievements(userId));
    }
  }, [dispatch, userId, refresh]);

  const handleCalculateAchievements = () => {
    if (userId) {
      dispatch(calculateUserAchievements(userId)).then(() => setRefresh(!refresh));
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-8">
      <div className="w-full max-w-4xl mx-auto bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-2xl shadow-2xl p-8 transform transition-all duration-500 hover:shadow-3xl">
        {/* Author Details Section */}
        {author && (
          <div className="flex items-center space-x-6 mb-8 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg p-6">
            <img
              src={author.avatar}
              alt="Author Avatar"
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
            />
            <div>
              <h3 className="text-3xl font-extrabold text-text-main-light dark:text-text-main-dark">{author.name}</h3>
              <p className="text-text-main-light dark:text-text-main-dark text-lg italic">{author.bio || "No bio available"}</p>
              <p className="text-sm text-text-main-light dark:text-text-main-dark mt-1">
                <span className="font-semibold">{author.profession || "No profession"}</span> | {author.location || "No location"}
              </p>
              <p className="text-sm text-text-main-light dark:text-text-main-dark">
                Joined: {new Date(author.joiningDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        )}

        <h2 className="text-4xl font-extrabold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          {readOnly ? `${author?.name || "Author"}'s Achievements` : "Your Achievements"}
        </h2>

        {loading && (
          <div className="text-center py-6">
            <div className="animate-spin inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="text-gray-600 mt-3 font-medium">Loading achievements...</p>
          </div>
        )}

        {error && (
          <p className="text-red-600 bg-red-50 p-4 rounded-lg text-center mb-6 font-medium">
            Error: {error}
          </p>
        )}

        {!readOnly && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleCalculateAchievements}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold px-8 py-3 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg"
            >
              Calculate Achievements
            </button>
          </div>
        )}

        {badges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {badges.map((badge, index) => (
              <div
                key={index}
                className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-5 rounded-xl shadow-md flex items-center space-x-4 transform transition-all duration-300 hover:scale-105"
              >
                <span className="text-3xl animate-pulse">🏆</span>
                <span className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">{badge}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center italic text-lg">
            No badges earned yet.
          </p>
        )}

        {metrics && (
          <div className="mt-10">
            <h3 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark mb-6 text-center">Metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                <p className="text-text-main-light dark:text-text-main-dark font-medium">Total Views</p>
                <p className="text-3xl font-extrabold text-blue-600">{metrics.totalViews || 0}</p>
              </div>
              <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                <p className="text-text-main-light dark:text-text-main-dark font-medium">Total Likes</p>
                <p className="text-3xl font-extrabold text-blue-600">{metrics.totalLikes || 0}</p>
              </div>
              <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                <p className="text-text-main-light dark:text-text-main-dark font-medium">Total Comments</p>
                <p className="text-3xl font-extrabold text-blue-600">{metrics.totalComments || 0}</p>
              </div>
              <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                <p className="text-text-main-light dark:text-text-main-dark font-medium">Followers</p>
                <p className="text-3xl font-extrabold text-blue-600">{metrics.followerCount || 0}</p>
              </div>
              <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                <p className="text-text-main-light dark:text-text-main-dark font-medium">Subscriptions</p>
                <p className="text-3xl font-extrabold text-blue-600">{metrics.subscriptionCount || 0}</p>
              </div>
              <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                <p className="text-text-main-light dark:text-text-main-dark font-medium">Longest Post Time</p>
                <p className="text-3xl font-extrabold text-blue-600">{metrics.longestPostTime || 0} min</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementsComponent;