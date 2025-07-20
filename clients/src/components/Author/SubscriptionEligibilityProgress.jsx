import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { checkUserEligibility } from '../../store/adminSlice';
import Progress from '../../Utils/Progress';
import { FaSpinner, FaExclamationCircle, FaRocket } from 'react-icons/fa';
import { motion } from 'framer-motion';

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
        <FaSpinner className="w-6 h-6 text-indigo-600 animate-spin" />
        <span className="ml-3 text-lg font-medium text-gray-600 dark:text-gray-300">
          Checking eligibility...
        </span>
      </div>
    );
  }

  if (subscriptionError) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-gray-100 dark:bg-gray-900 text-red-600">
        <FaExclamationCircle className="w-6 h-6 mr-3" />
        <span className="text-lg font-medium">{subscriptionError}</span>
      </div>
    );
  }

  if (userEligibility?.isEligible) return null;

  const { followerCount = 0, postCount = 0, engagementRate = 0, accountAgeDays = 0 } =
    userEligibility || {};
  const {
    minFollowers = 10000,
    minPosts = 30,
    minEngagementRate = 5,
    minAccountAgeDays = 180,
  } = subscriptionCriteria || {};

  const followerProgress = minFollowers > 0 ? Math.min((followerCount / minFollowers) * 100, 100) : 0;
  const postProgress = minPosts > 0 ? Math.min((postCount / minPosts) * 100, 100) : 0;
  const engagementProgress = minEngagementRate > 0
    ? Math.min((engagementRate / minEngagementRate) * 100, 100)
    : 0;
  const ageProgress = minAccountAgeDays > 0
    ? Math.min((accountAgeDays / minAccountAgeDays) * 100, 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full max-w-4xl overflow-auto bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 transform transition-all duration-300 hover:shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Unlock Subscriptions & Earnings
          </h2>
          <FaRocket className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-4">
          Reach{' '}
          <span className="font-medium">{minFollowers.toLocaleString()} followers</span>,{' '}
          <span className="font-medium">{minPosts} published posts</span>,{' '}
          <span className="font-medium">{minEngagementRate}% engagement</span>, and{' '}
          <span className="font-medium">{minAccountAgeDays} days account age</span>{' '}
          to start monetizing your content!
        </p>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-200">
                Followers: {followerCount.toLocaleString()} / {minFollowers.toLocaleString()}
              </p>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {followerProgress.toFixed(0)}%
              </span>
            </div>
            <Progress value={followerProgress} className="h-2 bg-indigo-600" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-200">
                Posts: {postCount} / {minPosts}
              </p>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {postProgress.toFixed(0)}%
              </span>
            </div>
            <Progress value={postProgress} className="h-2 bg-indigo-600" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-200">
                Engagement Rate: {engagementRate.toFixed(1)}% / {minEngagementRate}%
              </p>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {engagementProgress.toFixed(0)}%
              </span>
            </div>
            <Progress value={engagementProgress} className="h-2 bg-indigo-600" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-200">
                Account Age: {accountAgeDays} / {minAccountAgeDays} days
              </p>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {ageProgress.toFixed(0)}%
              </span>
            </div>
            <Progress value={ageProgress} className="h-2 bg-indigo-600" />
          </div>
        </div>
        <motion.button
          onClick={() => navigate('/profile')}
          className="mt-6 w-full py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          View Profile
        </motion.button>
      </div>
    </motion.div>
  );
};

export default SubscriptionEligibilityProgress;