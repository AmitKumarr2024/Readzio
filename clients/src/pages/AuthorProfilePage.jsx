import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { FaAngleDoubleLeft, FaSpinner, FaTimes, FaBars } from "react-icons/fa";
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

// Enhanced loading component
const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
    <FaSpinner className="w-8 h-8 text-blue-600 animate-spin" />
    <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
      {message}
    </p>
  </div>
);

// Enhanced error component
const ErrorDisplay = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 p-6">
    <div className="text-red-500 text-6xl mb-4">⚠️</div>
    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
      Something went wrong
    </h3>
    <p className="text-center text-gray-600 dark:text-gray-400 max-w-md">
      {typeof error === "string"
        ? error
        : error?.message || "An unexpected error occurred"}
    </p>
    {onRetry && (
      <Button
        onClick={onRetry}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Try Again
      </Button>
    )}
  </div>
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
        <ErrorDisplay
          error={this.state.error}
          onRetry={() => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}
        />
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Start closed on mobile
  const [clearing, setClearing] = useState(false);

  // Selectors
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

  // Memoized filtered tabs
  const filteredTabs = useMemo(
    () =>
      tabsConfig.filter((tab) =>
        tab.roles.includes(
          isOwnProfile ? "author" : loggedInUser ? "logged-in" : "non-logged-in"
        )
      ),
    [isOwnProfile, loggedInUser]
  );

  // Handle URL hash navigation
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

  // Initial data fetching
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

  // Handle resize events
  useEffect(() => {
    const handleResize = debounce(() => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    }, 100);

    // Set initial state based on screen size
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle tab changes
  const handleTabChange = useCallback(
    (tabId) => {
      setActiveTab(tabId);
      navigate(`${location.pathname}?tab=${tabId}${location.hash || ""}`);

      // Close sidebar on mobile after tab selection
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    },
    [navigate, location]
  );

  // Handle history clearing
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

  // Render content based on active tab
  const renderContent = useMemo(() => {
    if (!selectedUser?._id) {
      return (
        <ErrorDisplay
          error={userError || selectedUserError || "User not found"}
          onRetry={() => {
            dispatch(getAllUsers());
            if (id) dispatch(getUserById(id));
          }}
        />
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
          <div id="bank-details" className="space-y-6">
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
                <LoadingSpinner message="Checking eligibility..." />
              )
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-xl font-semibold mb-2">Author Only</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This section is only accessible to the profile owner.
                </p>
              </div>
            )}
          </div>
        );
      case "earnings":
        return (
          <div className="space-y-6">
            {isOwnProfile ? (
              userEligibility ? (
                <>
                  <SubscriptionEligibilityProgress userId={selectedUser._id} />
                  {userEligibility.isEligible && (
                    <UserEarnings userId={selectedUser._id} />
                  )}
                </>
              ) : (
                <LoadingSpinner message="Checking eligibility..." />
              )
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-xl font-semibold mb-2">Author Only</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This section is only accessible to the profile owner.
                </p>
              </div>
            )}
          </div>
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
          <div className="space-y-4">
            {userError ? (
              <ErrorDisplay
                error={userError}
                onRetry={() => dispatch(getAllUsers())}
              />
            ) : (
              <LoadingSpinner message="Loading users..." />
            )}
          </div>
        );
      case "analytics":
        return isOwnProfile ? (
          <UserAnalyticsDashboard posts={posts} />
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">Author Only</h3>
            <p className="text-gray-600 dark:text-gray-400">
              This section is only accessible to the profile owner.
            </p>
          </div>
        );
      case "categories":
        return isOwnProfile ? (
          <CategoryManagement />
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">Author Only</h3>
            <p className="text-gray-600 dark:text-gray-400">
              This section is only accessible to the profile owner.
            </p>
          </div>
        );
      case "comments":
        return isOwnProfile ? (
          <CommentManager userId={selectedUser._id} />
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">Author Only</h3>
            <p className="text-gray-600 dark:text-gray-400">
              This section is only accessible to the profile owner.
            </p>
          </div>
        );
      case "locations":
        return <LocationDashboard />;
      case "clearHistory":
        return (
          <div className="text-center py-12 space-y-6">
            <div className="text-6xl mb-4">🗑️</div>
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-4">Clear History</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This will permanently delete all your activity history. This
                action cannot be undone.
              </p>
              <Button
                onClick={handleClearHistory}
                disabled={clearing}
                className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                  clearing
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                } text-white`}
              >
                {clearing ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Clearing...
                  </>
                ) : (
                  "Clear All History"
                )}
              </Button>
            </div>
          </div>
        );
      default:
        return (
          <ErrorDisplay
            error="Invalid tab selected"
            onRetry={() => handleTabChange("pinned")}
          />
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
    selectedUserError,
    isOwnProfile,
    handleClearHistory,
    clearing,
    handleTabChange,
    dispatch,
    id,
  ]);

  // Loading states
  if (userLoading || selectedUserLoading || !selectedUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner message="Loading profile..." />
      </div>
    );
  }

  // Error states
  if (userError || selectedUserError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <ErrorDisplay
          error={userError || selectedUserError}
          onRetry={() => {
            dispatch(getAllUsers());
            if (id) dispatch(getUserById(id));
          }}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Mobile Menu Button */}
        <Button
          className="lg:hidden fixed top-20 right-4 z-50 w-12 h-12 rounded-full shadow-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
        >
          {isSidebarOpen ? <FaTimes /> : <FaBars />}
        </Button>

        {/* Desktop Sidebar Toggle */}
        <Button
          className="hidden lg:flex fixed top-20 left-4 z-40 w-10 h-10 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 items-center justify-center shadow-sm"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <FaAngleDoubleLeft
            className={`transition-transform ${
              isSidebarOpen ? "" : "rotate-180"
            }`}
          />
        </Button>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-24 left-0 z-50 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg transition-all duration-300 overflow-y-auto ${
            isSidebarOpen ? "w-80 lg:w-64" : "w-0 lg:w-16"
          }`}
          style={{ height: "calc(100vh - 6rem)" }}
        >
          <nav
            className={`p-4 space-y-2 ${
              isSidebarOpen ? "block" : "hidden lg:block"
            }`}
          >
            {filteredTabs.map((tab) => (
              <button
                key={tab.id}
                title={tab.label}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-lg transform scale-[1.02]"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                } ${!isSidebarOpen ? "lg:justify-center lg:px-2" : ""}`}
                aria-selected={activeTab === tab.id}
              >
                <span className="text-lg flex-shrink-0">{tab.icon}</span>
                <span
                  className={`${
                    isSidebarOpen ? "block" : "hidden lg:hidden"
                  } truncate`}
                >
                  {tab.label}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main
          className={`transition-all duration-300 ${
            isSidebarOpen ? "lg:ml-64" : "lg:ml-16"
          } pt-6 px-4 sm:px-6 lg:px-8`}
        >
          <div className="max-w-6xl mx-auto">
            <Suspense fallback={<LoadingSpinner />}>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                {renderContent}
              </div>
            </Suspense>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default AuthorProfilePage;
