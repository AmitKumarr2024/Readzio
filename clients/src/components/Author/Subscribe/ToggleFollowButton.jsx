import React, { useState, useEffect, useCallback, memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  followUser,
  unfollowUser,
  fetchFollowers,
  fetchFollowing,
  getFollowStatus,
  selectIsFollowing,
} from "../../../store/followSlice";
import { UserPlus, UserMinus, Loader2, Check } from "lucide-react";

const ToggleFollowButton = memo(
  ({
    followUserId,
    onFollowSuccess,
    size = "default",
    variant = "default",
    showIcon = true,
    disabled = false,
    className = "",
  }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { user, isAuthenticated } = useSelector((state) => state.auth);
    const { loading } = useSelector((state) => state.follow);

    // Use the selector we created in the improved slice
    const isFollowingFromStore = useSelector(selectIsFollowing(followUserId));

    const [isFollowing, setIsFollowing] = useState(isFollowingFromStore);
    const [isLoading, setIsLoading] = useState(false);
    const [justToggled, setJustToggled] = useState(false);

    // Size variants
    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs",
      default: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    // Variant styles
    const getVariantClasses = useCallback(
      (following, loading, justToggled) => {
        if (loading || isLoading) {
          return "bg-gray-400 cursor-not-allowed";
        }

        if (justToggled && following) {
          return "bg-green-500 hover:bg-green-600";
        }

        if (following) {
          return variant === "outline"
            ? "border-2 border-red-500 text-red-500 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20"
            : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white";
        }

        return variant === "outline"
          ? "border-2 border-indigo-500 text-indigo-500 bg-transparent hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
          : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white";
      },
      [variant, isLoading]
    );

    useEffect(() => {
      if (!isAuthenticated || !user?._id || !followUserId) return;
      if (user._id === followUserId) return; // Don't allow following yourself

      // If we don't have the status in store, fetch it
      if (isFollowingFromStore === undefined) {
        const fetchStatus = async () => {
          try {
            setIsLoading(true);
            const res = await dispatch(getFollowStatus(followUserId));
            if (getFollowStatus.fulfilled.match(res) && res.payload) {
              setIsFollowing(res.payload.isFollowing);
            }
          } catch (error) {
            console.error("Failed to fetch follow status", error);
            toast.error("Failed to load follow status");
          } finally {
            setIsLoading(false);
          }
        };

        fetchStatus();
      } else {
        setIsFollowing(isFollowingFromStore);
      }
    }, [
      dispatch,
      followUserId,
      isAuthenticated,
      user?._id,
      isFollowingFromStore,
    ]);

    const handleToggleFollow = useCallback(async () => {
      if (!isAuthenticated) {
        toast.error("Please sign in to follow users.");
        navigate("/signin");
        return;
      }

      if (user._id === followUserId) {
        toast.error("You cannot follow yourself.");
        return;
      }

      if (isLoading || loading) return;

      try {
        setIsLoading(true);
        const action = isFollowing ? unfollowUser : followUser;
        const result = await dispatch(action(followUserId));

        if (action.fulfilled.match(result)) {
          const newFollowingState = !isFollowing;
          setIsFollowing(newFollowingState);
          setJustToggled(true);

          // Show success animation for a brief moment
          setTimeout(() => setJustToggled(false), 2000);

          const message = newFollowingState
            ? "Followed successfully!"
            : "Unfollowed successfully!";
          toast.success(message);

          // Refresh the lists if needed
          if (onFollowSuccess) {
            onFollowSuccess();
          } else {
            // Only refresh if no custom handler is provided
            dispatch(fetchFollowers({ page: 1, limit: 12 }));
            dispatch(fetchFollowing({ page: 1, limit: 12 }));
          }
        } else {
          throw new Error(result.payload || "Failed to update follow status");
        }
      } catch (error) {
        console.error("Follow toggle error:", error);
        toast.error(error.message || "Failed to update follow status.");
      } finally {
        setIsLoading(false);
      }
    }, [
      isAuthenticated,
      user,
      followUserId,
      isFollowing,
      isLoading,
      loading,
      dispatch,
      navigate,
      onFollowSuccess,
    ]);

    // Don't render if user is trying to follow themselves
    if (user?._id === followUserId) {
      return null;
    }

    // Loading skeleton for initial state
    if (isFollowingFromStore === undefined && isLoading) {
      return (
        <div
          className={`${sizeClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse ${className}`}
        >
          <div className="w-16 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      );
    }

    const isButtonLoading = isLoading || loading;
    const buttonClasses = getVariantClasses(
      isFollowing,
      isButtonLoading,
      justToggled
    );

    const getButtonContent = () => {
      if (isButtonLoading) {
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="ml-1 hidden sm:inline">
              {isFollowing ? "Unfollowing..." : "Following..."}
            </span>
            <span className="ml-1 sm:hidden">...</span>
          </>
        );
      }

      if (justToggled && isFollowing) {
        return (
          <>
            {showIcon && <Check className="w-4 h-4" />}
            <span className={showIcon ? "ml-1 hidden sm:inline" : ""}>
              Followed!
            </span>
            {showIcon && <span className="ml-1 sm:hidden">✓</span>}
          </>
        );
      }

      if (isFollowing) {
        return (
          <>
            {showIcon && <UserMinus className="w-4 h-4" />}
            <span className={showIcon ? "ml-1 hidden sm:inline" : ""}>
              Unfollow
            </span>
            {showIcon && <span className="ml-1 sm:hidden">−</span>}
          </>
        );
      }

      return (
        <>
          {showIcon && <UserPlus className="w-4 h-4" />}
          <span className={showIcon ? "ml-1 hidden sm:inline" : ""}>
            Follow
          </span>
          {showIcon && <span className="ml-1 sm:hidden">+</span>}
        </>
      );
    };

    return (
      <button
        onClick={handleToggleFollow}
        disabled={disabled || isButtonLoading}
        className={`
        ${sizeClasses[size]}
        ${buttonClasses}
        ${className}
        font-medium rounded-full shadow-sm
        transition-all duration-300 ease-in-out
        transform hover:scale-105 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
        disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100
        flex items-center justify-center
        min-w-0 relative overflow-hidden
        backdrop-blur-sm
        ${variant === "outline" ? "border-2" : "border-0"}
      `}
        aria-label={isFollowing ? `Unfollow user` : `Follow user`}
        title={isFollowing ? "Click to unfollow" : "Click to follow"}
      >
        {getButtonContent()}
      </button>
    );
  }
);

ToggleFollowButton.displayName = "ToggleFollowButton";

export default ToggleFollowButton;
