import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import PlanCard from "./PlanCard";
import { getUserById } from "../../store/userSlice";
import { toast } from "react-hot-toast";
import {
  fetchSubscriptionPlansByAuthor,
  getSubscriptionStatusByAuthor,
} from "../../store/subscriptionSlice";
import SpaceBackground from "../../Utils/SpaceBackground";

const UserPlanPage = () => {
  const { id: authorId } = useParams();
  const dispatch = useDispatch();
  const [subscribedMap, setSubscribedMap] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { plans, loading, error } = useSelector((state) => state.subscription);
  const {
    selectedUser,
    loading: userLoading,
    error: userError,
  } = useSelector((state) => state.user);
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (authorId && isAuthenticated) {
      console.debug("[UserPlanPage] Fetching plans and user for authorId:", authorId);
      dispatch(fetchSubscriptionPlansByAuthor(authorId));
      dispatch(getUserById(authorId));
    }
  }, [dispatch, authorId, isAuthenticated]);

  useEffect(() => {
    const checkAllPlans = async () => {
      if (!plans.length || !user?._id) {
        console.debug("[UserPlanPage] No plans or user ID, skipping status check", {
          plansLength: plans.length,
          userId: user?._id,
        });
        return;
      }
      const statusMap = {};

      try {
        const res = await dispatch(
          getSubscriptionStatusByAuthor({ userId: user._id, authorId })
        ).unwrap();
        console.debug("[UserPlanPage] Subscription status response:", {
          response: res,
          subscriptionId: res?.subscriptionInfo?._id,
          isSubscribed: res?.isSubscribed,
        });

        plans.forEach((plan) => {
          statusMap[plan._id] = {
            isSubscribed: res.isSubscribed && res.subscriptionInfo?.planId === plan._id,
            subscriptionId: res.isSubscribed && res.subscriptionInfo?.planId === plan._id ? res.subscriptionInfo?._id : null,
          };
          console.debug(`[UserPlanPage] Status for plan ${plan._id}:`, statusMap[plan._id]);
        });
      } catch (err) {
        console.error("[UserPlanPage] Failed to check subscription status:", err);
        plans.forEach((plan) => {
          statusMap[plan._id] = { isSubscribed: false, subscriptionId: null };
        });
        toast.error("Failed to check subscription status");
      }

      console.debug("[UserPlanPage] Updated subscribedMap:", statusMap);
      setSubscribedMap(statusMap);
    };

    checkAllPlans();
  }, [plans, user?._id, dispatch, authorId, refreshTrigger]);

  const refreshPlanStatus = async (planId, subscriptionId = null) => {
    try {
      const res = await dispatch(
        getSubscriptionStatusByAuthor({ userId: user._id, authorId })
      ).unwrap();
      console.debug(`[UserPlanPage] Refreshed status for plan ${planId}:`, {
        response: res,
        subscriptionId: res?.subscriptionInfo?._id,
        isSubscribed: res?.isSubscribed,
        providedSubscriptionId: subscriptionId,
      });
      setSubscribedMap((prev) => {
        const updatedMap = {
          ...prev,
          [planId]: {
            isSubscribed: res.isSubscribed && res.subscriptionInfo?.planId === planId,
            subscriptionId: subscriptionId || (res.isSubscribed && res.subscriptionInfo?.planId === planId ? res.subscriptionInfo?._id : null),
          },
        };
        console.debug("[UserPlanPage] Updated subscribedMap after refresh:", updatedMap);
        return updatedMap;
      });
      setRefreshTrigger((prev) => prev + 1);
      console.debug("[UserPlanPage] Incremented refreshTrigger:", refreshTrigger + 1);
      return res.subscriptionInfo?._id || subscriptionId;
    } catch (err) {
      console.error("[UserPlanPage] Error refreshing subscription status:", err);
      toast.error("Failed to refresh subscription status");
      return subscriptionId;
    }
  };

  if (!authorId) return <div className="text-white text-center">No user specified.</div>;
  if (!isAuthenticated) return <div className="text-white text-center">Please log in to view plans.</div>;
  if (loading || userLoading) return <div className="text-white text-center">Loading...</div>;
  if (error || userError) return <div className="text-red-400 text-center">Error: {error || userError}</div>;

  return (
    <SpaceBackground>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-extrabold mb-2 text-center text-white">
          Plans by {selectedUser?.name || "User"}
        </h1>
        <p className="text-center text-gray-300 mb-6">
          {selectedUser?.bio || selectedUser?.email || `User ID: ${authorId}`}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {plans && plans.length > 0 ? (
            plans.map((plan) => (
              <PlanCard
                key={plan._id}
                plan={plan}
                isSubscribed={subscribedMap[plan._id]?.isSubscribed || false}
                subscriptionId={subscribedMap[plan._id]?.subscriptionId || null}
                onSubscribe={(subscriptionId) => refreshPlanStatus(plan._id, subscriptionId)}
              />
            ))
          ) : (
            <p className="text-gray-300">No plans available for this user.</p>
          )}
        </div>
      </div>
    </SpaceBackground>
  );
};

export default UserPlanPage;