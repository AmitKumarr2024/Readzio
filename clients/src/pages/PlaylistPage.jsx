// clients/src/pages/PlaylistPage.jsx

import { useParams } from "react-router-dom";
import PlaylistDetail from "../components/Playlist/PlaylistDetail";

/**
 * Page component for viewing a single playlist
 * Route: /playlist/:id
 */
const PlaylistPage = () => {
  const { id } = useParams();

  return <PlaylistDetail playlistId={id} />;
};

export default PlaylistPage;
