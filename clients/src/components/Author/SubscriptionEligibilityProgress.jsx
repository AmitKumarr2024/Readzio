import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { checkUserEligibility } from "../../store/adminSlice";
import Progress from "../../Utils/Progress";
import { FaSpinner, FaExclamationCircle, FaRocket } from "react-icons/fa";

const SubscriptionEligibilityProgress = ({ userId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    userEligibility,
    subscriptionCriteria,
    subscriptionLoading,
    subscriptionError,
  } = useSelector((state) => state.admin);

  React.useEffect(() => {
    if (userId) {
      dispatch(checkUserEligibility(userId));
    }
  }, [dispatch, userId]);

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-gray-100 dark:bg-gray-900">
        <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin" />
        <span className="ml-4 text-2xl font-medium text-gray-600 dark:text-gray-300">
          Checking eligibility...
        </span>
      </div>
    );
  }

  if (subscriptionError) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-gray-100 dark:bg-gray-900 text-red-600">
        <FaExclamationCircle className="w-10 h-10 mr-4" />
        <span className="text-2xl font-medium">{subscriptionError}</span>
      </div>
    );
  }

  if (userEligibility?.isEligible) return null; // Render nothing if eligible

  const { followerCount, postCount, engagementRate, accountAgeDays, criteria } =
    userEligibility || {};
  const {
    minFollowers = 10000,
    minPosts = 30,
    minEngagementRate = 5,
    minAccountAgeDays = 180,
  } = subscriptionCriteria || {};

  const followerProgress = Math.min((followerCount / minFollowers) * 100, 100);
  const postProgress = Math.min((postCount / minPosts) * 100, 100);
  const engagementProgress = Math.min(
    (engagementRate / minEngagementRate) * 100,
    100
  );
  const ageProgress = Math.min((accountAgeDays / minAccountAgeDays) * 100, 100);

  return (
    <div className="w-full max-w-6xl overflow-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 md:p-12">
      <div className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 md:p-12 transform transition-all duration-300 hover:shadow-3xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-gray-100">
            Unlock Subscriptions & Earnings
          </h2>
          <FaRocket className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
        </div>
        <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-1">
          Reach{" "}
          <span className="font-semibold">
            {minFollowers.toLocaleString()} followers
          </span>
          , <span className="font-semibold">{minPosts} published posts</span>,{" "}
          <span className="font-semibold">{minEngagementRate}% engagement</span>
          , and{" "}
          <span className="font-semibold">
            {minAccountAgeDays} days account age
          </span>{" "}
          to start monetizing your content!
        </p>
        <div className="space-y-8">
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-700 dark:text-gray-200">
                Followers: {followerCount?.toLocaleString() || 0}/
                {minFollowers.toLocaleString()}
              </p>
              <span className="text-base sm:text-lg md:text-xl text-gray-500 dark:text-gray-400">
                {followerProgress >= 100
                  ? "✅ Complete"
                  : `${Math.round(followerProgress)}%`}
              </span>
            </div>
            <Progress value={followerProgress} className="h-8 rounded-full" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-700 dark:text-gray-200">
                Published Posts: {postCount || 0}/{minPosts}
              </p>
              <span className="text-base sm:text-lg md:text-xl text-gray-500 dark:text-gray-400">
                {postProgress >= 100
                  ? "✅ Complete"
                  : `${Math.round(postProgress)}%`}
              </span>
            </div>
            <Progress value={postProgress} className="h-8 rounded-full" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-700 dark:text-gray-200">
                Engagement Rate: {(engagementRate || 0).toFixed(2)}%/
                {minEngagementRate}%
              </p>
              <span className="text-base sm:text-lg md:text-xl text-gray-500 dark:text-gray-400">
                {engagementProgress >= 100
                  ? "✅ Complete"
                  : `${Math.round(engagementProgress)}%`}
              </span>
            </div>
            <Progress value={engagementProgress} className="h-8 rounded-full" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-700 dark:text-gray-200">
                Account Age: {Math.floor(accountAgeDays || 0)}/
                {minAccountAgeDays} days
              </p>
              <span className="text-base sm:text-lg md:text-xl text-gray-500 dark:text-gray-400">
                {ageProgress >= 100
                  ? "✅ Complete"
                  : `${Math.round(ageProgress)}%`}
              </span>
            </div>
            <Progress value={ageProgress} className="h-8 rounded-full" />
          </div>
        </div>
        <div className="mt-10">
          <p className="text-base sm:text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-6">
            Grow your audience and share more content to unlock this feature!
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionEligibilityProgress;
