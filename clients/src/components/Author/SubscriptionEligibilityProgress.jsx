import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { checkUserEligibility } from "../../store/adminSlice";
import Progress from "../../Utils/Progress";
import { FaSpinner, FaExclamationCircle, FaRocket } from "react-icons/fa";
import { motion } from "framer-motion";

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
    if (userId) dispatch(checkUserEligibility(userId));
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

  if (userEligibility?.isEligible) return null;

  const {
    followerCount = 0,
    postCount = 0,
    engagementRate = 0,
    accountAgeDays = 0,
  } = userEligibility || {};

  const {
    minFollowers = 1,
    minPosts = 1,
    minEngagementRate = 1,
    minAccountAgeDays = 1,
  } = subscriptionCriteria || {};

  const followerProgress = Math.min((followerCount / minFollowers) * 100, 100);
  const postProgress = Math.min((postCount / minPosts) * 100, 100);
  const engagementProgress = Math.min(
    (engagementRate / minEngagementRate) * 100,
    100
  );
  const ageProgress = Math.min((accountAgeDays / minAccountAgeDays) * 100, 100);

  const progressVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, type: "spring", stiffness: 60 },
    }),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.7 }}
      className="w-full max-w-6xl mx-auto overflow-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 md:p-12"
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 md:p-12"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-gray-100">
            Unlock Subscriptions & Earnings
          </h2>
          <FaRocket className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
        </div>
        <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10">
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
          {[
            // animated progress blocks
            {
              label: "Followers",
              value: `${followerCount.toLocaleString()}/${minFollowers.toLocaleString()}`,
              percent: followerProgress,
            },
            {
              label: "Published Posts",
              value: `${postCount}/${minPosts}`,
              percent: postProgress,
            },
            {
              label: "Engagement Rate",
              value: `${engagementRate.toFixed(2)}%/${minEngagementRate}%`,
              percent: engagementProgress,
            },
            {
              label: "Account Age",
              value: `${Math.floor(accountAgeDays)}/${minAccountAgeDays} days`,
              percent: ageProgress,
            },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={progressVariants}
            >
              <div className="flex justify-between items-center mb-3">
                <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-700 dark:text-gray-200">
                  {item.label}: {item.value}
                </p>
                <span className="text-base sm:text-lg md:text-xl text-gray-500 dark:text-gray-400">
                  {item.percent >= 100
                    ? "✅ Complete"
                    : `${Math.round(item.percent)}%`}
                </span>
              </div>
              <Progress value={item.percent} className="h-8 rounded-full" />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-10"
        >
          <p className="text-base sm:text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-6">
            Grow your audience and share more content to unlock this feature!
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default SubscriptionEligibilityProgress;
