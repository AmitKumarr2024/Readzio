import React, { useEffect, useRef, useState } from "react";
import AuthorSidebar from "./DisplayPost/AuthorSidebar";
import DisplayAd from "../../Ads/DisplayAd";

const SidebarWithAd = ({ authorId, activeLoading, subscriptionLoading, fetchAttempted, activePost }) => {
  const sidebarRef = useRef(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setSidebarVisible(entry.isIntersecting);
      },
      { root: null, threshold: 0.1 }
    );

    if (sidebarRef.current) {
      observer.observe(sidebarRef.current);
    }

    return () => {
      if (sidebarRef.current) {
        observer.unobserve(sidebarRef.current);
      }
    };
  }, []);

  return (
    <div className="hidden lg:block lg:col-span-1 space-y-6">
      <div className="sticky top-6 space-y-6">
        
        {/* Author Sidebar */}
        {sidebarVisible && (
          <div ref={sidebarRef} className="author-wrapper transition-all duration-300">
            <AuthorSidebar
              authorId={authorId}
              isLoading={activeLoading || subscriptionLoading || !fetchAttempted}
              className="h-full rounded-md bg-white dark:bg-gray-800 shadow-md p-6"
            />
          </div>
        )}

        {/* Ad stays always visible */}
        <div className="ad-wrapper sticky top-6">
          <DisplayAd postId={activePost?._id} testMode={false} />
        </div>
      </div>
    </div>
  );
};

export default SidebarWithAd;
