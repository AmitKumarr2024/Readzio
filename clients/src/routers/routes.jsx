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

// Wrapper with Suspense
const withSuspense = (Component) => (
  <Suspense fallback={<SplashLoader />}>
    <Component />
  </Suspense>
);

const routes = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: withSuspense(MainPage) },
      { path: "createPost", element: withSuspense(CreatePost) },
      { path: "edit-post/:slug", element: withSuspense(EditPost) },
      { path: "delete-post/:id", element: withSuspense(DeleteModal) },
      { path: "category/:category", element: withSuspense(CategoryWisePage) },
      { path: "post/:slug", element: withSuspense(DisplayPost) },
      { path: "search", element: withSuspense(SearchPage) },
      { path: "admin", element: withSuspense(Dashboard) },
      { path: "about", element: withSuspense(AboutPage) },
      { path: "contact", element: withSuspense(Contact) },
      { path: "privacy", element: withSuspense(PrivacyPage) },
      { path: "user", element: withSuspense(UserProfilePage) },
      { path: "user-setting", element: withSuspense(UserSettingsPage) },
      { path: "author-profile/:id", element: withSuspense(AuthorProfilePage) },
      { path: "plans/:id", element: withSuspense(UserPlanPage) },
      { path: "bookmark", element: withSuspense(BookmarkComponent) },
      {
        path: "acknowledge/:reportId",
        element: withSuspense(AcknowledgeConfirmation),
      },
      { path: "message-box", element: withSuspense(NotificationPage) },
      { path: "users", element: withSuspense(UsersPage) },
      { path: "verify", element: withSuspense(VerifyEmail) },
      { path: "tag/:tag", element: withSuspense(TagWisePage) },
      { path: "Term&Condition", element: withSuspense(TermsAndConditionPage) },
    ],
  },
  { path: "/select-category", element: withSuspense(CategorySelectPage) },
  {
    path: "/login",
    element: <PublicOnlyRoute>{withSuspense(LoginPage)}</PublicOnlyRoute>,
  },
  {
    path: "/signup",
    element: <PublicOnlyRoute>{withSuspense(SignupPage)}</PublicOnlyRoute>,
  },

  { path: "/reset-password", element: withSuspense(ResetPassword) },

  { path: "*", element: withSuspense(PageNotFound) },
]);

export default routes;
