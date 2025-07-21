// src/components/Post/DisplayPost/PostSkeleton.jsx
import React from "react";
import Skeleton from "../../Ui/Skeleton";

const PostSkeleton = ({ className }) => (
  <div
    className={`flex-1 animate-pulse bg-background-light dark:bg-background-dark rounded-2xl shadow-lg p-8 border border-gray-300 dark:border-gray-700 ${className}`}
  >
    <Skeleton className="w-3/4 h-12 mb-6 rounded-lg" />
    <div className="flex gap-3 mb-6">
      <Skeleton className="w-28 h-6 rounded-full" />
      <Skeleton className="w-28 h-6 rounded-full" />
    </div>
    <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
      <div className="flex flex-wrap gap-4">
        <Skeleton className="w-24 h-5 rounded" />
        <Skeleton className="w-24 h-5 rounded" />
        <Skeleton className="w-24 h-5 rounded" />
      </div>
      <Skeleton className="w-8 h-8 rounded-full" />
    </div>
    <Skeleton className="w-full h-64 md:h-80 rounded-2xl mb-6" />
    <Skeleton className="w-full h-6 mb-2 rounded" />
    <Skeleton className="w-5/6 h-6 mb-2 rounded" />
    <Skeleton className="w-3/4 h-6 mb-6 rounded" />
    <Skeleton className="w-full h-6 mb-2 rounded" />
    <Skeleton className="w-2/3 h-6 mb-6 rounded" />
    <div className="flex gap-4 my-10">
      <Skeleton className="w-10 h-10 rounded-full" />
      <Skeleton className="w-10 h-10 rounded-full" />
      <Skeleton className="w-10 h-10 rounded-full" />
    </div>
  </div>
);

export default PostSkeleton;