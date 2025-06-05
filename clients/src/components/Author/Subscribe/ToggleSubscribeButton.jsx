import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  enableSubscriptionPlan,
  fetchSubscribeStatus,
  subscribeToAuthor,
  unsubscribeFromAuthor,
} from "../../../store/subscribeSlice";

function ToggleSubscribeButton({
  authorId,
  onSubscribeSuccess,
  onEnableSubscriptionSuccess,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const currentUserId = user?._id;

  const { isSubscribed, isSubscriptionPlanEnabled } = useSelector(
    (state) =>
      state.subscribe.subscribeStatus[authorId] || {
        isSubscribed: false,
        isSubscriptionPlanEnabled: false,
      }
  );

  const loading = useSelector((state) => state.subscribe.loading);

  useEffect(() => {
    if (authorId && currentUserId) {
      dispatch(fetchSubscribeStatus(authorId));
    }
  }, [dispatch, authorId, currentUserId]);

  const handleToggleSubscribe = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to subscribe.");
      navigate("/signin");
      return;
    }

    if (loading) return;

    const action = isSubscribed ? unsubscribeFromAuthor : subscribeToAuthor;
    const result = await dispatch(action(authorId));

    if (result.type.includes("fulfilled")) {
      await dispatch(fetchSubscribeStatus(authorId));
      toast.success(isSubscribed ? "Unsubscribed" : "Subscribed");
      onSubscribeSuccess?.();
      navigate(`/authors/${authorId}/plans`);
    } else {
      toast.error(result.payload || "Something went wrong.");
    }
  };

  const handleEnableSubscriptionPlan = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to enable subscription plan.");
      navigate("/signin");
      return;
    }

    if (loading) return;

    const result = await dispatch(enableSubscriptionPlan(authorId));

    if (enableSubscriptionPlan.fulfilled.match(result)) {
      toast.success("Subscription plan enabled");
      onEnableSubscriptionSuccess?.();
      dispatch(fetchSubscribeStatus(authorId));
      navigate(`/authors/${authorId}/plans`);
    } else {
      toast.error(result.payload || "Enable plan failed");
    }
  };

  const handleViewSubscriptionPlan = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to view subscription plans.");
      navigate("/signin");
      return;
    }
    navigate(`/authors/${authorId}/plans`);
  };

  const isAuthor = currentUserId === authorId;

  return (
    <div className="flex space-x-2">
      <button
        onClick={handleToggleSubscribe}
        disabled={loading}
        className={`px-3 py-1 rounded-md text-sm font-semibold text-white transition ${
          isSubscribed ? "bg-yellow-500" : "bg-green-600"
        } ${loading ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
      >
        {isSubscribed ? "Unsubscribe" : "Subscribe"}
      </button>

      {isAuthor && (
        <button
          onClick={
            isSubscriptionPlanEnabled
              ? handleViewSubscriptionPlan
              : handleEnableSubscriptionPlan
          }
          disabled={loading}
          className={`px-3 py-1 rounded-md text-sm font-semibold bg-blue-600 text-white transition ${
            loading ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"
          }`}
        >
          {isSubscriptionPlanEnabled
            ? "Manage Subscription Plan"
            : "Enable Subscription Plan"}
        </button>
      )}
    </div>
  );
}

export default ToggleSubscribeButton;
