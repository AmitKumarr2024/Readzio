import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileText,
  User,
  BarChart,
  ThumbsUp,
  History,
  DollarSign,
  Users,
  Award,
  PenLine,
  Activity,
} from "lucide-react";
import { Button } from "../Utils/Button";

import { useDispatch, useSelector } from "react-redux";
import { getUser, getUserById } from "../store/userSlice";
import AboutAuthor from "../components/Author/AboutAuthor";
import { getAllPosts } from "../store/postSlice";
import AllPosts from "../components/Author/post/AllPosts";
import PinnedPost from "../components/Author/post/PinnedPost";
import { useParams } from "react-router-dom";
import AuthorPolls from "../components/Author/polls/AuthorPolls";
import AuthorActivityHistory from "../components/Author/History/AuthorActivityHistory";
import AuthorPostHistory from "../components/Author/History/AuthorPostHistory";
import FollowersFollowing from "../components/Author/followAndFollowing/FollowersFollowing";

// Placeholder components
const AchievementsBadges = () => <div>Achievements & Badges Content</div>;
const AuthorDraftWorkspace = () => <div>Draft Workspace Content</div>;
const AuthorAnalytics = ({ analytics }) => <div>Analytics Content</div>;

function AuthorProfilePage() {
  const { id } = useParams();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("pinned");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Redux selectors
  const loggedInUser = useSelector((state) => state.auth.user);
  const userLoading = useSelector((state) => state.user.loading);
  const userError = useSelector((state) => state.user.error);
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
  const isAuthor = useSelector((state) => state.user.isAuthor);
  const analytics = useSelector((state) => state.analytics);

  console.log("author user", selectedUser);

  useEffect(() => {
    // Consider fetching logged-in user once at app init to avoid repetition
    dispatch(getUser());
  }, [dispatch]);

  useEffect(() => {
    dispatch(getAllPosts());
  }, [dispatch]);

  useEffect(() => {
    if (id) {
      dispatch(getUserById(id));
    }
  }, [dispatch, id]);

  // Responsive sidebar toggle for small screens
  useEffect(() => {
    if (window.innerWidth < 640) setIsSidebarOpen(false);
  }, []);

  const tabs = [
    { id: "pinned", label: "Pinned Post", icon: <LayoutDashboard /> },
    { id: "posts", label: "All Posts", icon: <FileText /> },
    { id: "about", label: "About Author", icon: <User /> },
    { id: "polls", label: "Polls", icon: <ThumbsUp /> },
    { id: "activity", label: "Activity", icon: <Activity /> },
    { id: "postHistory", label: "Post History", icon: <History /> },
    { id: "subscription", label: "Subscription", icon: <DollarSign /> },
    { id: "followers", label: "Followers & Following", icon: <Users /> },
    { id: "achievements", label: "Achievements", icon: <Award /> },
    ...(isAuthor
      ? [
          { id: "drafts", label: "Drafts", icon: <PenLine /> },
          { id: "analytics", label: "Analytics", icon: <BarChart /> },
        ]
      : []),
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "pinned":
        return (
          <PinnedPost
            posts={posts}
            userId={selectedUser?._id}
            loggedInUserId={loggedInUser?._id}
          />
        );
      case "posts":
        return (
          <AllPosts
            posts={posts}
            loading={postLoading}
            error={postError}
            userId={selectedUser?._id}
            userOnly={true}
          />
        );
      case "about":
        return <AboutAuthor author={selectedUser} />;
      case "polls":
        return (
          <AuthorPolls
            posts={posts}
            authorId={selectedUser?._id}
            currentUserId={loggedInUser?._id}
          />
        );
      case "activity":
        return <AuthorActivityHistory userId={selectedUser?._id} />;
      case "postHistory":
        return <AuthorPostHistory userId={selectedUser?._id} />;
      case "subscription":
        return ;
      case "followers":
        return <FollowersFollowing />;
      case "achievements":
        return <AchievementsBadges />;
      case "drafts":
        return isAuthor ? (
          <AuthorDraftWorkspace />
        ) : (
          <p className="text-center text-gray-500">
            Yeh section sirf author ke liye hai! 🔒
          </p>
        );
      case "analytics":
        return isAuthor ? (
          <AuthorAnalytics analytics={analytics} />
        ) : (
          <p className="text-center text-gray-500">
            Yeh section sirf author ke liye hai! 🔒
          </p>
        );
      default:
        return <PinnedPost />;
    }
  };

  if (userLoading || selectedUserLoading)
    return <p className="text-center mt-20">Loading user data...</p>;

  if (userError || selectedUserError)
    return (
      <p className="text-center mt-20 text-red-600">
        Error: {userError || selectedUserError}
      </p>
    );

  if (!selectedUser)
    return <p className="text-center mt-20">No user data available.</p>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`hidden sm:flex fixed top-29 left-0 z-30 h-full flex-col items-center bg-white border-r border-gray-300 shadow-md transition-all duration-300 ${
          isSidebarOpen ? "w-64 p-4" : "w-20 p-4"
        }`}
      >
        <div className="w-full flex justify-between items-center mb-6">
          {isSidebarOpen && (
            <h2 className="text-lg font-bold text-gray-900">Author</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-3xl text-gray-700"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarOpen ? "←" : "→"}
          </Button>
        </div>
        <nav
          className="space-y-2 w-full"
          role="tablist"
          aria-orientation="vertical"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              title={tab.label}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span
                className={`${
                  isSidebarOpen ? "inline" : "hidden"
                } transition-all duration-300`}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile Toggle */}
      <Button
        className="sm:hidden fixed bottom-6 right-4 z-50 w-12 h-12 rounded-full shadow-lg bg-white text-gray-700"
        onClick={() => setIsSidebarOpen((prev) => !prev)}
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isSidebarOpen ? "✖" : "☰"}
      </Button>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div
          className="sm:hidden fixed inset-0 z-40 bg-black/10 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-4 border-t border-gray-300 max-h-[75%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-2 rounded-lg text-left text-sm font-medium ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow"
                      : "text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                  role="tab"
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

      {/* Main Content */}
      <main
        className={`flex-1 text-gray-900 transition-all duration-300 p-6 sm:p-8 ${
          isSidebarOpen && window.innerWidth >= 640 ? "sm:ml-64" : "sm:ml-20"
        }`}
      >
        <div className="max-w-7xl mx-auto">{renderContent()}</div>
      </main>
    </div>
  );
}

export default AuthorProfilePage;
