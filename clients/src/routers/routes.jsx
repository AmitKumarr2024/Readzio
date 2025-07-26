// src/routes/routes.jsx
import { createBrowserRouter } from "react-router-dom";
import React, { lazy } from "react";
import App from "../App";
import PublicOnlyRoute from "../connection/PublicOnlyRoute";
import withSuspense from "../Utils/withSuspense";

// Lazy imports wrapped with withSuspense
const LoginPage = withSuspense(lazy(() => import("../pages/LoginPage")));
const SignupPage = withSuspense(lazy(() => import("../pages/SignupPage")));
const MainPage = withSuspense(lazy(() => import("../pages/MainPage")));
const CategoryWisePage = withSuspense(
  lazy(() => import("../pages/CategoryWisePage"))
);
const DisplayPost = withSuspense(
  lazy(() => import("../components/Post/DisplayPost"))
);
const CreatePost = withSuspense(lazy(() => import("../pages/CreatePost")));
const EditPost = withSuspense(
  lazy(() => import("../components/Post/EditPost"))
);
const PageNotFound = withSuspense(lazy(() => import("../pages/PageNotFound")));
const SearchPage = withSuspense(lazy(() => import("../pages/SearchPage")));
const AboutPage = withSuspense(lazy(() => import("../pages/AboutPage")));
const Contact = withSuspense(lazy(() => import("../pages/Contact")));
const PrivacyPage = withSuspense(lazy(() => import("../pages/PrivacyPage")));
const TermsAndConditionPage = withSuspense(
  lazy(() => import("../pages/TermsAndConditionPage"))
);
const UserProfilePage = withSuspense(
  lazy(() => import("../pages/UserProfilePage"))
);
const UserSettingsPage = withSuspense(
  lazy(() => import("../pages/UserSettingPage"))
);
const FeatureComingSoon = withSuspense(
  lazy(() => import("../pages/FeatureComingSoon"))
);
const DeleteModal = withSuspense(
  lazy(() => import("../components/Post/DeleteModal"))
);
const AuthorProfilePage = withSuspense(
  lazy(() => import("../pages/AuthorProfilePage"))
);
const UserPlanPage = withSuspense(
  lazy(() => import("../components/PorductToBuy/UserPlanPage"))
);
const CategorySelectPage = withSuspense(
  lazy(() => import("../pages/CategorySelectPage"))
);
const BookmarkComponent = withSuspense(
  lazy(() => import("../components/Post/BookmarkComponent"))
);
const Dashboard = withSuspense(lazy(() => import("../pages/Admin/Dashboard")));
const AcknowledgeConfirmation = withSuspense(
  lazy(() => import("../pages/Admin/AcknowledgeConfirmation"))
);
const NotificationPage = withSuspense(
  lazy(() => import("../components/Notification/NotificationPage"))
);
const UsersPage = withSuspense(lazy(() => import("../pages/UsersPage")));
const ResetPassword = withSuspense(
  lazy(() => import("../pages/ResetPasswordPage"))
);
const VerifyEmail = withSuspense(
  lazy(() => import("../components/resetPassword/VerifyEmail"))
);
const TagWisePage = withSuspense(lazy(() => import("../pages/TagWisePage")));

const routes = createBrowserRouter([
  {
    path: "/",
    element: <App />,
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
      { path: "contact", element: <Contact /> },
      { path: "privacy", element: <PrivacyPage /> },
      { path: "user", element: <UserProfilePage /> },
      { path: "user-setting", element: <UserSettingsPage /> },
      { path: "author-profile/:id", element: <AuthorProfilePage /> },
      { path: "plans/:id", element: <UserPlanPage /> },
      { path: "bookmark", element: <BookmarkComponent /> },
      { path: "acknowledge/:reportId", element: <AcknowledgeConfirmation /> },
      { path: "message-box", element: <NotificationPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "verify", element: <VerifyEmail /> },
      { path: "tag/:tag", element: <TagWisePage /> },
      { path: "Term&Condition", element: <TermsAndConditionPage /> },
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
