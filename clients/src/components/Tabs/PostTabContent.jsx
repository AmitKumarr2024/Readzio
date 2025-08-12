import React from "react";
import Postbox from "../Post/Postbox";

const PostTabContent = ({ activeTab, posts, user, loading }) => {
  return (
    <div className="post-tab-content w-full px-4 sm:px-6 md:px-8">
      <Postbox
        filterType={activeTab}
        customPosts={posts}
        user={user}
        loading={loading}
      />
    </div>
  );
};

export default PostTabContent;
