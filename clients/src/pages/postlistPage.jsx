// clients/src/pages/postlistPage.jsx

import { useParams } from "react-router-dom";
import postlistDetail from "../components/postlist/postlistDetail";


const postlistPage = () => {
  const { id } = useParams();

  return <postlistDetail postlistId={id} />;
};

export default postlistPage;
