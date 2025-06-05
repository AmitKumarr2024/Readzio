import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import Dashboard from "../pages/Admin/Dashboard";
import MainPage from "../pages/MainPage";
import CategoryWisePage from "../pages/CategoryWisePage";
import DisplayPost from "../components/Post/DisplayPost";
import CreatePost from "../pages/CreatePost";
import EditPost from "../components/Post/EditPost";
import PageNotFound from "../pages/PageNotFound";
import SearchPage from "../pages/SearchPage";
import AboutPage from "../pages/AboutPage";
import Contact from "../pages/Contact";
import PrivacyPage from "../pages/PrivacyPage";
import TermsAndConditionPage from "../pages/TermsAndConditionPage";
import UserProfilePage from "../pages/UserProfilePage";
import UserSettingsPage from "../pages/UserSettingPage";
import FeatureComingSoon from "../pages/FeatureComingSoon";
import DeleteModal from "../components/Post/DeleteModal";
import AuthorProfilePage from "../pages/AuthorProfilePage";
// import SubscriptionPlanDisplay from "../components/Author/Subscribe/SubscriptionPlanDisplay";
// import PaymentPage from "../components/payment/PaymentPage";


const routes = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <MainPage /> },
      { path: "/createPost", element: <CreatePost /> },
      { path: "/edit-post/:id", element: <EditPost /> },
      { path: "/delete-post/:id", element: <DeleteModal /> },
      { path: "/category_page/:category", element: <CategoryWisePage /> },
      { path: "/post/:slug", element: <DisplayPost /> },
      { path: "/search", element: <SearchPage /> },
      { path: "/admin", element: <Dashboard /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/contact", element: <Contact /> },
      { path: "/privacy", element: <PrivacyPage /> },
      { path: "/user", element: <UserProfilePage /> },
      { path: "/user-setting", element: <UserSettingsPage /> },
      { path: "/author-profile/:id", element: <AuthorProfilePage /> },
      // { path: "/pricing/:authorId/:postId", element: <SubscriptionPlanDisplay /> },
      // { path: "/authors/:authorId/plans", element: <SubscriptionPlanDisplay /> },
      // { path: "/payment/:postId/:authorId/:planType/:amount/:currency", element: <PaymentPage /> },
    ],
  },
  { path: "/login", element: <LoginPage /> },
  { path: "/signin", element: <SignupPage /> },
  { path: "/Term&Condition", element: <TermsAndConditionPage /> },
  { path: "*", element: <PageNotFound /> },
]);

export default routes;