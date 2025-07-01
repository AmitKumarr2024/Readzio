import React from "react";
import Postbox from "../Post/Postbox";

const PostTabContent = ({ activeTab }) => {
  return (
    <div className="w-full px-4 sm:px-6 md:px-8">
      <Postbox filterType={activeTab} />
    </div>
  );
};

export default PostTabContent;
