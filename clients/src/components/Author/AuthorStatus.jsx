import React from "react";

const AuthorStatus = ({ stats }) => {
  return (
    <div className="bg-slate-50 shadow-lg rounded-xl p-6 flex flex-wrap justify-around items-center text-center max-w-md mx-auto sm:max-w-full sm:flex-nowrap sm:justify-around">
      {/* Posts */}
      <div className="flex-1 min-w-[80px] sm:min-w-[100px] px-4 py-2 hover:bg-indigo-50 rounded-lg cursor-default transition duration-300 ease-in-out">
        <p className="text-2xl font-extrabold text-indigo-600">{stats?.posts ?? 0}</p>
        <p className="text-sm text-gray-500 mt-1">Posts</p>
      </div>

      {/* Followers */}
      <div className="flex-1 min-w-[80px] sm:min-w-[100px] px-4 py-2 hover:bg-indigo-50 rounded-lg cursor-default transition duration-300 ease-in-out">
        <p className="text-2xl font-extrabold text-indigo-600">{stats?.followers ?? 0}</p>
        <p className="text-sm text-gray-500 mt-1">Followers</p>
      </div>

      {/* Following */}
      <div className="flex-1 min-w-[80px] sm:min-w-[100px] px-4 py-2 hover:bg-indigo-50 rounded-lg cursor-default transition duration-300 ease-in-out">
        <p className="text-2xl font-extrabold text-indigo-600">{stats?.following ?? 0}</p>
        <p className="text-sm text-gray-500 mt-1">Subscribers</p>
      </div>

      {/* Likes */}
      <div className="flex-1 min-w-[80px] sm:min-w-[100px] px-4 py-2 hover:bg-indigo-50 rounded-lg cursor-default transition duration-300 ease-in-out">
        <p className="text-2xl font-extrabold text-indigo-600">{stats?.likes ?? 0}</p>
        <p className="text-sm text-gray-500 mt-1">Likes</p>
      </div>
    </div>
  );
};

export default AuthorStatus;
