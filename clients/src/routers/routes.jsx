import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import Dashboard from "../pages/Admin/Dashboard";
import MainPage from "../pages/MainPage";
import CategoryWisePage from "../pages/CategoryWisePage";
import DisplayPost from "../components/Post/DisplayPost";
import AuthorProfilePage from "../pages/AuthorProfilePage";
import AuthorSettingPage from "../pages/AuthorSettingPage";
import CreatePost from "../pages/CreatePost";
import EditPost from "../components/Post/EditPost";
import PageNotFound from "../pages/PageNotFound";
import SearchPage from "../pages/SearchPage";
import AboutPage from "../pages/AboutPage";
import Contact from "../pages/Contact";
import PrivacyPage from "../pages/PrivacyPage";
import TermsAndConditionPage from "../pages/TermsAndConditionPage";

const routes = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <MainPage /> },
      {
        path: "/profile",
        element: <AuthorProfilePage />,
      },
      {
        path: "/setting",
        element: <AuthorSettingPage />,
      },
      {
        path: "/createPost",
        element: <CreatePost />,
      },
      { path: "edit-post/:id", element: <EditPost /> },
      { path: "/category_page/:category", element: <CategoryWisePage /> },
      { path: "/post/:id", element: <DisplayPost /> },
      { path: "/search", element: <SearchPage /> },
      { path: "/admin", element: <Dashboard /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/contact", element: <Contact /> },
      { path: "/privacy", element: <PrivacyPage /> },
    ],
  },

  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/Term&Condition", element: <TermsAndConditionPage /> },

  { path: "*", element: <PageNotFound /> },
]);

export default routes;
