import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchSubscriptionPlan,
  resetUpdateStatus,
  updateSubscriptionPlan,
} from "../../../store/subscriptionPlanSlice";
import { getAllUsers } from "../../../store/userSlice";
import TabNavigation from "./subscriptionPart/TabNavigation";
import PostsManager from "./subscriptionPart/PostsManager";
import AccountDetailsForm from "./subscriptionPart/AccountDetailsForm";
import SubscribersList from "./subscriptionPart/SubscribersList";

const SubscriptionPlanPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const subscriptionState = useSelector((state) => state.subscription || {});
  const {
    plan = null,
    loading = false,
    error = null,
    updateLoading = false,
    updateSuccess = false,
    updateError = null,
  } = subscriptionState;
  const { users, loading: usersLoading } = useSelector((state) => state.user);
  const [activeTab, setActiveTab] = useState("freePaidPosts");
  const [freePosts, setFreePosts] = useState([]);
  const [paidPosts, setPaidPosts] = useState([]);
  const [accountDetails, setAccountDetails] = useState({
    bankName: "",
    accountNumber: "",
    ifscCode: "",
  });

  useEffect(() => {
    if (user?._id) {
      dispatch(fetchSubscriptionPlan(user._id));
      dispatch(getAllUsers());
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (plan) {
      setFreePosts(plan.freePosts || []);
      setPaidPosts(plan.paidPosts || []);
      setAccountDetails(
        plan.accountDetails || { bankName: "", accountNumber: "", ifscCode: "" }
      );
    }
    if (updateSuccess) {
      setTimeout(() => dispatch(resetUpdateStatus()), 3000);
    }
  }, [plan, updateSuccess, dispatch]);

  const handleSavePlan = () => {
    dispatch(
      updateSubscriptionPlan({
        authorId: user?._id,
        freePosts,
        paidPosts,
        accountDetails,
      })
    );
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Customize Your Subscription Plan
      </h1>
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          {activeTab !== "subscribers" && (
            <button
              onClick={handleSavePlan}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
              disabled={updateLoading}
            >
              {updateLoading ? "Saving..." : "Save Changes"}
            </button>
          )}
          {updateSuccess && (
            <p className="text-green-500 mt-2">Plan updated successfully!</p>
          )}
          {updateError && <p className="text-red-500 mt-2">{updateError}</p>}
          <hr className="my-4 text-slate-300"/>
          {activeTab === "freePaidPosts" && (
            <PostsManager
              freePosts={freePosts}
              setFreePosts={setFreePosts}
              paidPosts={paidPosts}
              setPaidPosts={setPaidPosts}
            />
          )}
          {activeTab === "accountDetails" && (
            <AccountDetailsForm
              accountDetails={accountDetails}
              setAccountDetails={setAccountDetails}
            />
          )}
          {activeTab === "subscribers" && (
            <SubscribersList
              users={users}
              usersLoading={usersLoading}
              currentUserId={user._id}
            />
          )}
        </>
      )}
    </div>
  );
};

export default SubscriptionPlanPage;
