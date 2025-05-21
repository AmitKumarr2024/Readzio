import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import Dashboard from "../pages/Admin/Dashboard";
import MainPage from "../pages/MainPage";
import CreatePost from "../pages/Admin/CreatePost";
import CategoryWisePage from "../pages/CategoryWisePage";
import DisplayPost from "../components/Post/DisplayPost";

const routes = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <MainPage/> },
      {path:'/category_page/:category' , element:<CategoryWisePage/>},
      {path:'/post/:id',element:<DisplayPost/>},
      { path: "/admin", element: <Dashboard />},
      { path: "/admin/createPost", element: <CreatePost />},
    ],
  },

  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
]);

export default routes;
