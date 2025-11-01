// clients/src/pages/postlistCreatePage.jsx
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import postlistCreate from "../components/postlist/postlistCreate";

/**
 * Page component for creating a postlist
 * Route: /postlists/create
 */
const postlistCreatePage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) {
    return null; // Redirect handling
  }

  return <postlistCreate />;
};

export default postlistCreatePage;
