import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { FaAngleDoubleLeft, FaSpinner } from "react-icons/fa";
import {
  useParams,
  useSearchParams,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "../Utils/Button";
import {
  getAllUsers,
  getUser,
  getUserById,
  clearUserActivity,
} from "../store/userSlice";
import { getAllPosts } from "../store/postSlice";
import {
  fetchMySubscriptionPlans,
  checkEligibilityForSubscription,
} from "../store/subscriptionSlice";
import { checkUserEligibility } from "../store/adminSlice";
import { tabsConfig } from "../config/tabsConfig";
import { debounce } from "lodash";
import SubscriptionEligibilityProgress from "../components/Author/SubscriptionEligibilityProgress";
import LocationDashboard from "../components/location/LocationDashboard";

const AboutAuthor = lazy(() => import("../components/Author/AboutAuthor"));
const AllPosts = lazy(() => import("../components/Author/post/AllPosts"));
const PinnedPost = lazy(() => import("../components/Author/post/PinnedPost"));
const PlaylistList = lazy(() => import("../components/Playlist/PlaylistList"));
const AuthorPolls = lazy(() =>
  import("../components/Author/polls/AuthorPolls")
);
const AuthorActivityHistory = lazy(() =>
  import("../components/Author/History/AuthorActivityHistory")
);
const AuthorPostHistory = lazy(() =>
  import("../components/Author/History/AuthorPostHistory")
);
const FollowersFollowing = lazy(() =>
  import("../components/Author/followAndFollowing/FollowersFollowing")
);
const AuthorDashboard = lazy(() =>
  import("../components/Author/Subscribe/subscription/AuthorDashboard")
);
const CategoryManagement = lazy(() =>
  import("../components/Author/CategoryManagement/CategoryManagement")
);
const UserEarnings = lazy(() =>
  import("../components/Author/earning/UserEarnings")
);
const UserAnalyticsDashboard = lazy(() =>
  import("../components/Author/analytics/UserAnalyticsDashboard")
);
const BlockControl = lazy(() =>
  import("../components/Author/blocks/BlockControl")
);
const AchievementsComponent = lazy(() =>
  import("../components/Author/achivement/AchievementsComponent")
);
const CommentManager = lazy(() =>
  import("../components/Author/comment/CommentManager")
);

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    console.error("ErrorBoundary caught:", error);
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center text-red-600">
          <h2>Something went wrong!</h2>
          <p>{this.state.error?.message || "An unexpected error occurred."}</p>
          <Button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AuthorProfilePage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "pinned"
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [clearing, setClearing] = useState(false);

  const loggedInUser = useSelector((state) => state.auth.user);
  const userLoading = useSelector((state) => state.user.loading);
  const userError = useSelector((state) => state.user.error);
  const allUsers = useSelector((state) => state.user.users);
  const selectedUser = useSelector((state) => state.user.selectedUser);
  const selectedUserLoading = useSelector(
    (state) => state.user.selectedUserLoading
  );
  const selectedUserError = useSelector(
    (state) => state.user.selectedUserError
  );
  const posts = useSelector((state) => state.post.posts);
  const postLoading = useSelector((state) => state.post.loading);
  const postError = useSelector((state) => state.post.error);
  const {
    plans,
    loading: subscriptionLoading,
    error: subscriptionError,
  } = useSelector((state) => state.subscription);
  const { userEligibility } = useSelector((state) => state.admin);

  const isOwnProfile = loggedInUser?._id === id;

  const filteredTabs = useMemo(
    () =>
      tabsConfig.filter((tab) =>
        tab.roles.includes(
          isOwnProfile ? "author" : loggedInUser ? "logged-in" : "non-logged-in"
        )
      ),
    [isOwnProfile, loggedInUser]
  );

  useEffect(() => {
    const fragment = location.hash;
    if (fragment) {
      const element = document.getElementById(fragment.replace("#", ""));
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        element.classList.add("highlight");
        setTimeout(() => element.classList.remove("highlight"), 2000);
      }
    }
  }, [location]);

  useEffect(() => {
    dispatch(getUser());
    dispatch(getAllPosts());
    if (id) dispatch(getUserById(id));
    if (isOwnProfile) {
      dispatch(getAllUsers());
      dispatch(fetchMySubscriptionPlans());
      dispatch(checkEligibilityForSubscription());
      dispatch(checkUserEligibility(id));
    }
  }, [dispatch, id, isOwnProfile]);

  useEffect(() => {
    const handleResize = debounce(() => {
      setIsSidebarOpen(window.innerWidth >= 768);
    }, 100);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleTabChange = useCallback(
    (tabId) => {
      setActiveTab(tabId);
      navigate(`${location.pathname}?tab=${tabId}${location.hash || ""}`);
    },
    [navigate, location]
  );

  const handleClearHistory = useCallback(async () => {
    if (window.confirm("Clear all activity history? This cannot be undone.")) {
      setClearing(true);
      try {
        await dispatch(clearUserActivity()).unwrap();
        if (activeTab === "activity" && id) dispatch(getUserById(id));
      } catch (error) {
        console.error("Clear history failed:", error);
      } finally {
        setClearing(false);
      }
    }
  }, [dispatch, id, activeTab]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const renderContent = useMemo(() => {
    if (!selectedUser?._id) {
      return (
        <p className="text-center text-gray-600 dark:text-gray-400">
          {typeof userError?.message === "string"
            ? userError.message
            : JSON.stringify(userError || selectedUserError || "Unknown error")}
        </p>
      );
    }

    const readOnly = !isOwnProfile;

    switch (activeTab) {
      case "pinned":
        return (
          <PinnedPost
            posts={posts}
            userId={selectedUser._id}
            loggedInUserId={loggedInUser?._id}
            readOnly={readOnly}
            author={selectedUser}
          />
        );
      case "posts":
        return (
          <AllPosts
            posts={posts}
            loading={postLoading}
            error={postError}
            userId={selectedUser._id}
            userOnly={true}
            readOnly={readOnly}
          />
        );
      case "about":
        return <AboutAuthor author={selectedUser} readOnly={readOnly} />;
      case "playlists":
        return (
          <PlaylistList userId={selectedUser._id} isOwnProfile={isOwnProfile} />
        );
      case "achievements":
        return (
          <AchievementsComponent
            userId={selectedUser._id}
            readOnly={readOnly}
            author={selectedUser}
          />
        );
      case "polls":
        return (
          <AuthorPolls
            posts={posts}
            authorId={selectedUser._id}
            currentUserId={loggedInUser?._id}
            readOnly={readOnly}
          />
        );
      case "activity":
        return (
          <AuthorActivityHistory
            userId={selectedUser._id}
            readOnly={readOnly}
          />
        );
      case "postHistory":
        return (
          <AuthorPostHistory userId={selectedUser._id} readOnly={readOnly} />
        );
      case "subscription":
        return (
          <div id="bank-details">
            {isOwnProfile ? (
              userEligibility ? (
                <>
                  <SubscriptionEligibilityProgress userId={selectedUser._id} />
                  {userEligibility.isEligible && (
                    <AuthorDashboard
                      userId={selectedUser._id}
                      plans={plans}
                      subscriptionLoading={subscriptionLoading}
                      subscriptionError={
                        subscriptionError
                          ? JSON.stringify(subscriptionError)
                          : null
                      }
                    />
                  )}
                </>
              ) : (
                <p className="text-center text-gray-600 dark:text-gray-400">
                  Checking eligibility...
                </p>
              )
            ) : (
              <p className="text-center text-gray-600 dark:text-gray-400">
                This section is only for authors! 🔒
              </p>
            )}
          </div>
        );
      case "earnings":
        return (
          <>
            {isOwnProfile ? (
              userEligibility ? (
                <>
                  <SubscriptionEligibilityProgress userId={selectedUser._id} />
                  {userEligibility.isEligible && (
                    <UserEarnings userId={selectedUser._id} />
                  )}
                </>
              ) : (
                <p className="text-center text-gray-600 dark:text-gray-400">
                  Checking eligibility...
                </p>
              )
            ) : (
              <p className="text-center text-gray-600 dark:text-gray-400">
                This section is only for authors! 🔒
              </p>
            )}
          </>
        );
      case "followers":
        return (
          <FollowersFollowing readOnly={readOnly} userId={selectedUser._id} />
        );
      case "BlocksUser":
        return allUsers && Array.isArray(allUsers) ? (
          <BlockControl
            allUsers={allUsers}
            refetchUsers={() => dispatch(getAllUsers())}
          />
        ) : (
          <p className="text-center text-gray-600 dark:text-gray-400">
            {userError
              ? `Error: ${JSON.stringify(userError)}`
              : "Loading users..."}
          </p>
        );
      case "analytics":
        return isOwnProfile ? (
          <UserAnalyticsDashboard posts={posts} />
        ) : (
          <p className="text-center text-gray-600 dark:text-gray-400">
            This section is only for authors! 🔒
          </p>
        );
      case "categories":
        return isOwnProfile ? (
          <CategoryManagement />
        ) : (
          <p className="text-center text-gray-600 dark:text-gray-400">
            This section is only for authors! 🔒
          </p>
        );
      case "comments":
        return isOwnProfile ? (
          <CommentManager userId={selectedUser._id} />
        ) : (
          <p className="text-center text-gray-600 dark:text-gray-400">
            This section is only for authors! 🔒
          </p>
        );
      case "locations":
        return <LocationDashboard />;
      case "clearHistory":
        return (
          <div className="text-center p-6">
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              Clear all your activity history? This action cannot be undone.
            </p>
            <Button
              onClick={handleClearHistory}
              disabled={clearing}
              className={`px-6 py-2 rounded-lg ${
                clearing ? "bg-red-400" : "bg-red-600 hover:bg-red-700"
              } text-white`}
            >
              {clearing ? "Clearing..." : "Clear All History"}
            </Button>
          </div>
        );
      default:
        console.warn("Invalid tab:", activeTab);
        return (
          <p className="text-center text-gray-600 dark:text-gray-400">
            Invalid tab selected
          </p>
        );
    }
  }, [
    activeTab,
    selectedUser,
    loggedInUser,
    posts,
    postLoading,
    postError,
    plans,
    subscriptionLoading,
    subscriptionError,
    userEligibility,
    allUsers,
    userError,
    isOwnProfile,
    handleClearHistory,
    clearing,
  ]);

  if (userLoading || selectedUserLoading || !selectedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="text-lg font-semibold text-gray-600 dark:text-gray-400 ml-4">
          Loading...
        </p>
      </div>
    );
  }

  if (userError || selectedUserError) {
    return (
      <div className="text-center mt-20">
        <p className="text-red-600 mb-4">
          {userError
            ? userError.message || JSON.stringify(userError)
            : selectedUserError.message || JSON.stringify(selectedUserError)}
        </p>
        <Button
          onClick={() => {
            dispatch(getAllUsers());
            if (id) dispatch(getUserById(id));
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="hidden md:flex fixed top-16 left-4 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="text-2xl rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarOpen ? <FaAngleDoubleLeft /> : "☰"}
          </Button>
        </div>

        <aside
          className={`fixed top-28 left-0 z-30 bg-gray-100 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 shadow-md transition-all duration-300 overflow-y-auto md:flex ${
            isSidebarOpen ? "w-full md:w-60 p-4" : "w-16 p-2"
          }`}
          style={{ height: "calc(100vh - 7rem)" }}
        >
          <nav className="space-y-2 w-full flex-1 py-4" role="tablist">
            {filteredTabs.map((tab) => (
              <button
                key={tab.id}
                title={tab.label}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
                aria-selected={activeTab === tab.id}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className={isSidebarOpen ? "inline" : "hidden md:inline"}>
                  {tab.label}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <Button
          className="md:hidden fixed top-16 right-4 z-50 w-12 h-12 rounded-full shadow-lg bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
        >
          {isSidebarOpen ? "✖" : "☰"}
        </Button>

        {isSidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm"
            onClick={toggleSidebar}
          >
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-gray-100 dark:bg-gray-900 p-4 border-t border-gray-300 dark:border-gray-700 shadow-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="space-y-2">
                {filteredTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      handleTabChange(tab.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-2 rounded-lg text-left text-sm font-medium ${
                      activeTab === tab.id
                        ? "bg-blue-600 text-white shadow"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                    }`}
                    aria-selected={activeTab === tab.id}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        <main
          className={`flex-1 p-4 sm:p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-all duration-300 ${
            isSidebarOpen && window.innerWidth >= 768 ? "md:ml-64" : "md:ml-16"
          }`}
        >
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<div className="text-center">Loading...</div>}>
              {renderContent}
            </Suspense>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default AuthorProfilePage;
