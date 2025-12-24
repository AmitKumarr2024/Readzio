import React from "react";
import UserCardWrapper from "../../Cards/usercard/UserCardWrapper";

const AuthorSidebar = ({ authorId }) => {

  return (
    <div className="hidden lg:block lg:w-96">
      {authorId && <UserCardWrapper userId={authorId} />}
    </div>
  );
};

export default AuthorSidebar;
