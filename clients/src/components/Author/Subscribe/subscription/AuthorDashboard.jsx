import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllPosts } from "../../../../store/postSlice";
import {
  fetchSubscriptionPlansByAuthor,
  getSubscriptionAnalytics,
} from "../../../../store/subscriptionSlice";
import CreatePlanForm from "./CreatePlanForm";
import UpdatePlanForm from "./UpdatePlanForm";
import RenewalReminders from "./RenewalReminders";
import PlansAnalytics from "./PlansAnalytics";
import PlanHistoryTable from "./PlanHistoryTable";
import RefundSubscriptions from "./RefundSubscriptions";
import ModalBox from "../../../../Utils/ModalBox";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaChartLine,
  FaHistory,
  FaMoneyBillWave,
  FaPlus,
  FaUniversity,
  FaSpinner,
} from "react-icons/fa";
import BankDashboard from "./bank/BankDashboard";
import { createSelector } from "@reduxjs/toolkit";
import SubscribedPlansTable from "./SubscribedPlansTable";

const selectPlans = createSelector(
  [(state) => state.subscription.plans],
  (plans) => plans
);

const AuthorDashboard = ({ userId }) => {
  const dispatch = useDispatch();
  const plans = useSelector(selectPlans, (prev, curr) => {
    if (prev.length !== curr.length) return false;
    return prev.every(
      (p, i) => p._id === curr[i]._id && p.updatedAt === curr[i].updatedAt
    );
  });

  const {
    analytics,
    loading: subLoading,
    error: subError,
  } = useSelector((state) => state.subscription);
  const {
    posts,
    loading: postLoading,
    error: postError,
  } = useSelector((state) => state.post);

  const [activeTab, setActiveTab] = useState("analytics");
  const [updatePlan, setUpdatePlan] = useState(null);
  const fetchedPlanIds = useRef(new Set());

  useEffect(() => {
    dispatch(getAllPosts());
    if (userId) {
      dispatch(fetchSubscriptionPlansByAuthor(userId));
    }
  }, [dispatch, userId]);

  useEffect(() => {
    if (!plans || plans.length === 0) return;

    const newPlanIds = plans
      .map((p) => p._id)
      .filter((id) => id && !fetchedPlanIds.current.has(id));

    if (newPlanIds.length === 0) return;

    newPlanIds.forEach((planId) => {
      dispatch(getSubscriptionAnalytics(planId));
      fetchedPlanIds.current.add(planId);
    });
  }, [dispatch, plans.length]);

  useEffect(() => {
    // console.log("🔄 plans updated:", plans);
  }, [plans]);

  const userPosts = posts.filter((post) => post.author._id === userId);
  const hasActivePlan = plans.some((plan) => !plan.deletedAt);

  const getErrorMessage = (err) => {
    if (!err) return "";
    if (typeof err === "string") return err;
    return err.message || JSON.stringify(err);
  };

  if (subLoading || postLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (subError || postError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <motion.div
          className="p-8 bg-background-light dark:bg-background-dark rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xl font-semibold text-red-600">
            Error: {getErrorMessage(subError) || getErrorMessage(postError) || "An error occurred"}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark py-6 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="max-w-7xl mx-auto space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="sticky top-0 z-10 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-2xl shadow-lg p-4 mb-6 border border-gray-100">
          <div className="flex flex-wrap justify-center gap-2">
            {[
              {
                tab: "analytics",
                label: "Analytics",
                icon: <FaChartLine className="w-5 h-5" />,
              },
              {
                tab: "history",
                label: "Plan History",
                icon: <FaHistory className="w-5 h-5" />,
              },
              {
                tab: "purchase",
                label: "User purchase ",
                icon: <FaMoneyBillWave className="w-5 h-5" />,
              },
              {
                tab: "subscribed",
                label: "Purchased Plans",
                icon: <FaMoneyBillWave className="w-5 h-5" />,
              },
              {
                tab: "create",
                label: "Create Plan",
                icon: <FaPlus className="w-5 h-5" />,
              },
              {
                tab: "bank",
                label: "Bank",
                icon: <FaUniversity className="w-5 h-5" />,
              },
              {
                tab: "reminders",
                label: "Reminders",
                icon: <FaHistory className="w-5 h-5" />,
              },
            ].map(({ tab, label, icon }) => (
              <motion.button
                key={tab}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 ${
                  activeTab === tab
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                    : "text-text-main-light dark:text-text-main-dark hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                onClick={() => setActiveTab(tab)}
                whileHover={{
                  scale: 1.05,
                  backgroundColor:
                    activeTab === tab ? "transparent" : "#e5e7eb",
                }}
                whileTap={{ scale: 0.95 }}
              >
                {icon}
                <span>{label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-2xl shadow-lg p-6 border border-gray-100"
          >
            {activeTab === "analytics" && (
              <PlansAnalytics
                userId={userId}
                plans={plans}
                analytics={analytics}
                setUpdatePlan={setUpdatePlan}
              />
            )}
            {activeTab === "history" && (
              <PlanHistoryTable
                plans={plans}
                loading={subLoading}
                error={subError}
                onlySelf={true}
              />
            )}
            {activeTab === "purchase" && (
              <RefundSubscriptions userId={userId} />
            )}
            {activeTab === "subscribed" && <SubscribedPlansTable />}
            {activeTab === "create" && (
              <CreatePlanForm
                userId={userId}
                posts={userPosts}
                activePlan={hasActivePlan}
              />
            )}
            {activeTab === "bank" && <BankDashboard />}
            {activeTab === "reminders" && <RenewalReminders />}
          </motion.div>
        </AnimatePresence>

        <ModalBox isOpen={!!updatePlan} onClose={() => setUpdatePlan(null)}>
          <motion.div
            className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-2xl p-6 border border-gray-100"
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <UpdatePlanForm
              userId={userId}
              posts={userPosts}
              updatePlan={updatePlan}
              setUpdatePlan={setUpdatePlan}
            />
          </motion.div>
        </ModalBox>
      </motion.div>
    </div>
  );
};

export default AuthorDashboard;