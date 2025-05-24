import React from "react";
import AllPosts from "./AllPosts";
import FollowingPosts from "./FollowingPosts";
import MyPosts from "./MyPosts";

const PostTabContents = ({ activeTab }) => {
  switch (activeTab) {
    case "All Posts":
      return <AllPosts />;
    case "Following":
      return <FollowingPosts />;
    case "My Posts":
      return <MyPosts />;
    default:
      return <AllPosts />;
  }
};

export default PostTabContents;
