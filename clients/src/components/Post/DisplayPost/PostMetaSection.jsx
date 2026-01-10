import React from "react";
import { Link } from "react-router-dom";
import TimeAgo from "../../../Utils/TimeAgo";
import PostOptionsDropdown from "../PostOptionsDropdown";

const PostMetaSection = ({
  post,
  isUserSubscribed,
  isAuthor,
  isPostRestricted,
  categoryMap,
  formatTime,
  description,
  setIsDeleteModalOpen,
}) => {
  return (
    <>
      {/* Add CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out;
        }

        .animate-slide-in-left {
          animation: slideInLeft 0.6s ease-out;
        }

        .badge-shimmer {
          position: relative;
          overflow: hidden;
        }

        .badge-shimmer::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 3s infinite;
        }

        .icon-float {
          animation: float 3s ease-in-out infinite;
        }

        .meta-card-enhanced {
          background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.95) 100%);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .dark .meta-card-enhanced {
          background: linear-gradient(135deg, rgba(31,41,55,0.95) 0%, rgba(17,24,39,0.95) 100%);
        }

        .meta-card-enhanced:hover {
          transform: translateY(-5px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .icon-container-enhanced {
          transition: all 0.3s ease;
        }

        .icon-container-enhanced:hover {
          transform: scale(1.1) rotate(5deg);
        }

        .gradient-border-wrapper {
          position: relative;
          padding: 2px;
          background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
          border-radius: 1.5rem;
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <div className="mb-6 sm:mb-8 lg:mb-10">
        {/* Badges Section with Enhanced Visibility */}
        <div className="flex flex-wrap gap-3 sm:gap-4 mb-6 sm:mb-8 animate-fade-in-up">
          {isUserSubscribed && !isAuthor && (
            <span className="badge-shimmer inline-flex items-center px-5 sm:px-7 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-bold bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 animate-slide-in-left">
              <span className="relative flex items-center gap-2.5">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 icon-float"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                You're a Member
              </span>
            </span>
          )}

          {post.postType === "premium" && (
            <span
              className="badge-shimmer inline-flex items-center px-5 sm:px-7 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 animate-slide-in-left"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="relative flex items-center gap-2.5">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Premium Post
              </span>
            </span>
          )}

          {post.postType === "free" && (
            <span
              className="badge-shimmer inline-flex items-center px-5 sm:px-7 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-bold bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 animate-slide-in-left"
              style={{ animationDelay: "0.2s" }}
            >
              <span className="relative flex items-center gap-2.5">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Free to Read
              </span>
            </span>
          )}
        </div>

        {/* Meta Information Card */}
        <div
          className="gradient-border-wrapper animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="meta-card-enhanced rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
              {/* Left Side - Meta Info */}
              <div className="flex flex-col gap-5 sm:gap-6 flex-1">
                {/* Category */}
                <div className="flex items-center gap-4 group">
                  <div className="icon-container-enhanced flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  </div>
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent hover:from-purple-700 hover:to-pink-700 dark:hover:from-purple-300 dark:hover:to-pink-300 transition-all duration-300 cursor-pointer">
                    {categoryMap[post.category] ||
                      post.category ||
                      "Uncategorized"}
                  </span>
                </div>

                {/* Author Info */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-4 group">
                    <div className="icon-container-enhanced flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    {post.author?._id ? (
                      <Link
                        to={`/author/${post.author._id}`}
                        className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 hover:underline decoration-2 underline-offset-4"
                      >
                        {post.author?.name || "Unknown Author"}
                      </Link>
                    ) : (
                      <span className="text-lg sm:text-xl italic text-gray-500 dark:text-gray-400">
                        Unknown Author
                      </span>
                    )}
                  </div>

                  {/* Read Time */}
                  {post?.readTime && (
                    <div className="flex items-center gap-2.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-300 hover:shadow-lg transform hover:scale-105">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm sm:text-base font-bold text-purple-700 dark:text-purple-300">
                        {post.readTime}
                      </span>
                    </div>
                  )}

                  {/* Time Ago */}
                  <div className="flex items-center gap-2.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border-2 border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-lg transform hover:scale-105">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <time
                      dateTime={post.createdAt}
                      itemProp="datePublished"
                      className="text-sm sm:text-base font-bold text-blue-700 dark:text-blue-300"
                    >
                      <TimeAgo date={post.createdAt} />
                    </time>
                  </div>
                </div>
              </div>

              {/* Right Side - Options */}
              <div className="lg:ml-4">
                <PostOptionsDropdown
                  isAuthor={isAuthor}
                  post={post}
                  setIsDeleteModalOpen={setIsDeleteModalOpen}
                  className="p-3 sm:p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 hover:rotate-90"
                />
              </div>
            </div>
            {description && (
              <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t-2 border-gray-200 dark:border-gray-700">
                <p
                  className="text-base sm:text-lg text-gray-700 dark:text-gray-300 max-w-4xl leading-relaxed"
                  itemProp="description"
                >
                  {description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Divider with Gradient */}
        <div className="relative my-8 sm:my-10 lg:my-12 h-1 overflow-hidden rounded-full">
          <div
            className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500"
            style={{
              backgroundSize: "200% 100%",
              animation: "shimmer 2s linear infinite",
            }}
          ></div>
        </div>
      </div>
    </>
  );
};

export default PostMetaSection;


// oold code
// import React from "react";
// import { Link } from "react-router-dom";
// import TimeAgo from "../../../Utils/TimeAgo";
// import PostOptionsDropdown from "../PostOptionsDropdown";

// const PostMetaSection = ({
//   post,
//   isUserSubscribed,
//   isAuthor,
//   isPostRestricted,
//   categoryMap,
//   formatTime,
//   description,
//   setIsDeleteModalOpen,
// }) => {
//   return (
//     <>
//       <div className="mb-6 sm:mb-8 lg:mb-10">
//         {/* Badges Section with Enhanced Visibility */}
//         <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
//           {isUserSubscribed && !isAuthor && (
//             <span className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-full badge-text font-semibold bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white shadow-lg">
//               <span className="relative flex items-center gap-2">
//                 <svg
//                   className="w-4 h-4 sm:w-5 sm:h-5"
//                   fill="currentColor"
//                   viewBox="0 0 20 20"
//                 >
//                   <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
//                 </svg>
//                 You're a Member
//               </span>
//             </span>
//           )}

//           {post.postType === "premium" && (
//             <span className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-full badge-text font-semibold bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-lg">
//               <span className="relative flex items-center gap-2">
//                 <svg
//                   className="w-4 h-4 sm:w-5 sm:h-5"
//                   fill="currentColor"
//                   viewBox="0 0 20 20"
//                 >
//                   <path
//                     fillRule="evenodd"
//                     d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
//                     clipRule="evenodd"
//                   />
//                 </svg>
//                 Premium Post
//               </span>
//             </span>
//           )}

//           {post.postType === "free" && (
//             <span className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-full badge-text font-semibold bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white shadow-lg">
//               <span className="relative flex items-center gap-2">
//                 <svg
//                   className="w-4 h-4 sm:w-5 sm:h-5"
//                   fill="currentColor"
//                   viewBox="0 0 20 20"
//                 >
//                   <path
//                     fillRule="evenodd"
//                     d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
//                     clipRule="evenodd"
//                   />
//                 </svg>
//                 Free to Read
//               </span>
//             </span>
//           )}
//         </div>

//         {/* Meta Information Card */}
//         <div className="meta-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl border border-gray-200 dark:border-gray-700">
//           <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
//             {/* Left Side - Meta Info */}
//             <div className="flex flex-col gap-4 sm:gap-5 flex-1">
//               {/* Category */}
//               <div className="flex items-center gap-3">
//                 <div className="icon-container">
//                   <svg
//                     className="w-4 h-4 text-white"
//                     fill="currentColor"
//                     viewBox="0 0 20 20"
//                   >
//                     <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
//                   </svg>
//                 </div>
//                 <span className="meta-text text-base sm:text-lg lg:text-xl font-semibold text-gray-800 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 cursor-pointer">
//                   {categoryMap[post.category] ||
//                     post.category ||
//                     "Uncategorized"}
//                 </span>
//               </div>

//               {/* Author Info */}
//               <div className="flex flex-wrap items-center gap-3 sm:gap-5">
//                 <div className="flex items-center gap-3">
//                   <div className="icon-container bg-gradient-to-br from-green-400 to-emerald-600">
//                     <svg
//                       className="w-4 h-4 text-white"
//                       fill="currentColor"
//                       viewBox="0 0 20 20"
//                     >
//                       <path
//                         fillRule="evenodd"
//                         d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
//                         clipRule="evenodd"
//                       />
//                     </svg>
//                   </div>
//                   {post.author?._id ? (
//                     <Link
//                       to={`/author/${post.author._id}`}
//                       className="meta-text text-base sm:text-lg lg:text-xl font-bold text-gray-800 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 hover:underline decoration-2 underline-offset-4"
//                     >
//                       {post.author?.name || "Unknown Author"}
//                     </Link>
//                   ) : (
//                     <span className="meta-text text-base sm:text-lg italic text-gray-500 dark:text-gray-400">
//                       Unknown Author
//                     </span>
//                   )}
//                 </div>

//                 {/* Read Time */}
//                 {post?.readTime && (
//                   <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-700">
//                     <svg
//                       className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400"
//                       fill="currentColor"
//                       viewBox="0 0 20 20"
//                     >
//                       <path
//                         fillRule="evenodd"
//                         d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
//                         clipRule="evenodd"
//                       />
//                     </svg>
//                     <span className="text-sm sm:text-base font-semibold text-purple-700 dark:text-purple-300">
//                       {post.readTime}
//                     </span>
//                   </div>
//                 )}

//                 {/* Time Ago */}
//                 <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-700">
//                   <svg
//                     className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400"
//                     fill="currentColor"
//                     viewBox="0 0 20 20"
//                   >
//                     <path
//                       fillRule="evenodd"
//                       d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
//                       clipRule="evenodd"
//                     />
//                   </svg>
//                   <time
//                     dateTime={post.createdAt}
//                     itemProp="datePublished"
//                     className="text-sm sm:text-base font-semibold text-blue-700 dark:text-blue-300"
//                   >
//                     <TimeAgo date={post.createdAt} />
//                   </time>
//                 </div>
//               </div>
//             </div>

//             {/* Right Side - Options */}
//             <div className="lg:ml-4">
//               <PostOptionsDropdown
//                 isAuthor={isAuthor}
//                 post={post}
//                 setIsDeleteModalOpen={setIsDeleteModalOpen}
//                 className="p-2 sm:p-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
//               />
//             </div>
//           </div>
//           {description && (
//             <p
//               className="mt-4 text-base text-gray-600 dark:text-gray-400 max-w-3xl"
//               itemProp="description"
//             >
//               {description}
//             </p>
//           )}
//         </div>

//         {/* Divider with Gradient */}
//         <div className="my-6 sm:my-8 lg:my-10 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent"></div>
//       </div>
//     </>
//   );
// };

// export default PostMetaSection;
