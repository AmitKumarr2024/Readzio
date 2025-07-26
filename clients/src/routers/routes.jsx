import { createBrowserRouter } from "react-router-dom";
import React, { Suspense, lazy } from "react";
import App from "../App";
import SplashLoader from "../AppRootFile/components/SplashLoader";
import PublicOnlyRoute from "../connection/PublicOnlyRoute";

// Lazy imports
const LoginPage = lazy(() => import("../pages/LoginPage"));
const SignupPage = lazy(() => import("../pages/SignupPage"));
const MainPage = lazy(() => import("../pages/MainPage"));
const CategoryWisePage = lazy(() => import("../pages/CategoryWisePage"));
const DisplayPost = lazy(() => import("../components/Post/DisplayPost"));
const CreatePost = lazy(() => import("../pages/CreatePost"));
const EditPost = lazy(() => import("../components/Post/EditPost"));
const PageNotFound = lazy(() => import("../pages/PageNotFound"));
const SearchPage = lazy(() => import("../pages/SearchPage"));
const AboutPage = lazy(() => import("../pages/AboutPage"));
const Contact = lazy(() => import("../pages/Contact"));
const PrivacyPage = lazy(() => import("../pages/PrivacyPage"));
const TermsAndConditionPage = lazy(() =>
  import("../pages/TermsAndConditionPage")
);
const UserProfilePage = lazy(() => import("../pages/UserProfilePage"));
const UserSettingsPage = lazy(() => import("../pages/UserSettingPage"));
const FeatureComingSoon = lazy(() => import("../pages/FeatureComingSoon"));
const DeleteModal = lazy(() => import("../components/Post/DeleteModal"));
const AuthorProfilePage = lazy(() => import("../pages/AuthorProfilePage"));
const UserPlanPage = lazy(() =>
  import("../components/PorductToBuy/UserPlanPage")
);
const CategorySelectPage = lazy(() => import("../pages/CategorySelectPage"));
const BookmarkComponent = lazy(() =>
  import("../components/Post/BookmarkComponent")
);
const Dashboard = lazy(() => import("../pages/Admin/Dashboard"));
const AcknowledgeConfirmation = lazy(() =>
  import("../pages/Admin/AcknowledgeConfirmation")
);
const NotificationPage = lazy(() =>
  import("../components/Notification/NotificationPage")
);
const UsersPage = lazy(() => import("../pages/UsersPage"));
const ResetPassword = lazy(() => import("../pages/ResetPasswordPage"));
const VerifyEmail = lazy(() =>
  import("../components/resetPassword/VerifyEmail")
);
const TagWisePage = lazy(() => import("../pages/TagWisePage"));

// ✅ FIXED: withSuspense returns a component
const withSuspense = (Component) => {
  return function SuspendedComponent(props) {
    return (
      <Suspense fallback={<SplashLoader />}>
        <Component {...props} />
      </Suspense>
    );
  };
};

const routes = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: React.createElement(withSuspense(MainPage)) },
      { path: "createPost", element: React.createElement(withSuspense(CreatePost)) },
      { path: "edit-post/:slug", element: React.createElement(withSuspense(EditPost)) },
      { path: "delete-post/:id", element: React.createElement(withSuspense(DeleteModal)) },
      { path: "category/:category", element: React.createElement(withSuspense(CategoryWisePage)) },
      { path: "post/:slug", element: React.createElement(withSuspense(DisplayPost)) },
      { path: "search", element: React.createElement(withSuspense(SearchPage)) },
      { path: "admin", element: React.createElement(withSuspense(Dashboard)) },
      { path: "about", element: React.createElement(withSuspense(AboutPage)) },
      { path: "contact", element: React.createElement(withSuspense(Contact)) },
      { path: "privacy", element: React.createElement(withSuspense(PrivacyPage)) },
      { path: "user", element: React.createElement(withSuspense(UserProfilePage)) },
      { path: "user-setting", element: React.createElement(withSuspense(UserSettingsPage)) },
      { path: "author-profile/:id", element: React.createElement(withSuspense(AuthorProfilePage)) },
      { path: "plans/:id", element: React.createElement(withSuspense(UserPlanPage)) },
      { path: "bookmark", element: React.createElement(withSuspense(BookmarkComponent)) },
      { path: "acknowledge/:reportId", element: React.createElement(withSuspense(AcknowledgeConfirmation)) },
      { path: "message-box", element: React.createElement(withSuspense(NotificationPage)) },
      { path: "users", element: React.createElement(withSuspense(UsersPage)) },
      { path: "verify", element: React.createElement(withSuspense(VerifyEmail)) },
      { path: "tag/:tag", element: React.createElement(withSuspense(TagWisePage)) },
      { path: "Term&Condition", element: React.createElement(withSuspense(TermsAndConditionPage)) },
    ],
  },

  // ✅ Signup/Login wrapped with PublicOnlyRoute
  {
    path: "/signup",
    element: (
      <PublicOnlyRoute>
        {React.createElement(withSuspense(SignupPage))}
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <PublicOnlyRoute>
        {React.createElement(withSuspense(LoginPage))}
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/select-category",
    element: React.createElement(withSuspense(CategorySelectPage)),
  },
  {
    path: "/reset-password",
    element: React.createElement(withSuspense(ResetPassword)),
  },
  {
    path: "*",
    element: React.createElement(withSuspense(PageNotFound)),
  },
]);

export default routes;
