import React from "react";
import Postbox from "../Post/Postbox";


const PostTabContent = ({ activeTab }) => {
  return <Postbox filterType={activeTab} />;
};

export default PostTabContent;
