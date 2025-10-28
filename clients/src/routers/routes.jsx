// Updated router file
import { createBrowserRouter } from "react-router-dom";
import React, { lazy } from "react";
import App from "../App";
import PublicOnlyRoute from "../connection/PublicOnlyRoute";
import withSuspense from "../Utils/withSuspense";
import ErrorFallback from "../components/ErrorFallback";

// 🧠 Utility for safe lazy imports with fallback error handler
const safeLazy = (importFn) =>
  withSuspense(
    lazy(() =>
      importFn().catch((err) => {
        console.error("[Lazy Load Error]", err);
        return { default: () => <div>Error loading component</div> };
      })
    )
  );

// ✅ Lazy-loaded pages/components with safe fallback
const LoginPage = safeLazy(() => import("../pages/LoginPage"));
const SignupPage = safeLazy(() => import("../pages/SignupPage"));
const MainPage = safeLazy(() => import("../pages/MainPage"));
const CategoryWisePage = safeLazy(() => import("../pages/CategoryWisePage"));
const DisplayPost = safeLazy(() => import("../components/Post/DisplayPost"));
const CreatePost = safeLazy(() => import("../pages/CreatePost"));
const EditPost = safeLazy(() => import("../components/Post/EditPost"));
const PageNotFound = safeLazy(() => import("../pages/PageNotFound"));
const SearchPage = safeLazy(() => import("../pages/SearchPage"));
const AboutPage = safeLazy(() => import("../pages/AboutPage"));
const Contact = safeLazy(() => import("../pages/Contact"));
const PrivacyPage = safeLazy(() => import("../pages/PrivacyPage"));
const TermsAndConditionPage = safeLazy(() =>
  import("../pages/TermsAndConditionPage")
);
const UserProfilePage = safeLazy(() => import("../pages/UserProfilePage"));
const UserSettingsPage = safeLazy(() => import("../pages/UserSettingPage"));
const FeatureComingSoon = safeLazy(() => import("../pages/FeatureComingSoon"));
const DeleteModal = safeLazy(() => import("../components/Post/DeleteModal"));
const AuthorProfilePage = safeLazy(() => import("../pages/AuthorProfilePage"));
const UserPlanPage = safeLazy(() =>
  import("../components/PorductToBuy/UserPlanPage")
);
const CategorySelectPage = safeLazy(() =>
  import("../pages/CategorySelectPage")
);
const BookmarkComponent = safeLazy(() =>
  import("../components/Post/BookmarkComponent")
);
const Dashboard = safeLazy(() => import("../pages/Admin/Dashboard"));
const AcknowledgeConfirmation = safeLazy(() =>
  import("../pages/Admin/AcknowledgeConfirmation")
);
const NotificationPage = safeLazy(() =>
  import("../components/Notification/NotificationPage")
);
const UsersPage = safeLazy(() => import("../pages/UsersPage"));
const ResetPassword = safeLazy(() => import("../pages/ResetPasswordPage"));
const VerifyEmail = safeLazy(() =>
  import("../components/resetPassword/VerifyEmail")
);
const TagWisePage = safeLazy(() => import("../pages/TagWisePage"));
const PlaylistCreatePage = safeLazy(() =>
  import("../pages/PlaylistCreatePage")
);
const PlaylistPage = safeLazy(() => import("../pages/PlaylistPage"));
const UserPlaylistsPage = safeLazy(() => import("../pages/UserPlaylistsPage"));

// ✅ Route definition
const routes = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorFallback />,
    children: [
      { index: true, element: <MainPage /> },
      { path: "createPost", element: <CreatePost /> },
      { path: "edit-post/:slug", element: <EditPost /> },
      { path: "delete-post/:id", element: <DeleteModal /> },
      { path: "category/:category", element: <CategoryWisePage /> },
      { path: "post/:slug", element: <DisplayPost /> },
      { path: "search", element: <SearchPage /> },
      { path: "admin", element: <Dashboard /> },
      { path: "about", element: <AboutPage /> },
      { path: "user", element: <UserProfilePage /> },
      { path: "profile/playlists", element: <UserPlaylistsPage /> },
      { path: "user-setting", element: <UserSettingsPage /> },
      { path: "author-profile/:id", element: <AuthorProfilePage /> },
      { path: "plans/:id", element: <UserPlanPage /> },
      { path: "bookmark", element: <BookmarkComponent /> },
      { path: "acknowledge/:reportId", element: <AcknowledgeConfirmation /> },
      { path: "message-box", element: <NotificationPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "verify", element: <VerifyEmail /> },
      { path: "tag/:tag", element: <TagWisePage /> },
      { path: "contact", element: <Contact /> },
      { path: "privacy", element: <PrivacyPage /> },
      { path: "terms-conditions", element: <TermsAndConditionPage /> },
      { path: "playlists/create", element: <PlaylistCreatePage /> },
      { path: "playlist/:id", element: <PlaylistPage /> },
    ],
  },
  {
    path: "/signup",
    element: (
      <PublicOnlyRoute>
        <SignupPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/select-category",
    element: <CategorySelectPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "*",
    element: <PageNotFound />,
  },
]);

export default routes;
