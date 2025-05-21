import React from "react";
import CardOfPost from "./Cards/CardOfPost";

const Postbox = () => {
  // Demo post data
  const demoPosts = [
    {
      id: "1",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "Exploring the Latest in React 19 Features",
      createdAt: "2024-12-10",
      commentsCount: 12,
      viewsCount: 150,
    },
    {
      id: "2",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "Top 10 Health Tips for 2025",
      createdAt: "2025-01-05",
      commentsCount: 8,
      viewsCount: 230,
    },
    {
      id: "3",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "A Budget Travel Guide to Europe",
      createdAt: "2025-03-20",
      commentsCount: 5,
      viewsCount: 320,
    },
    {
      id: "4",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "A Budget Travel Guide to Europe",
      createdAt: "2025-03-20",
      commentsCount: 5,
      viewsCount: 320,
    },
    {
      id: "5",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "A Budget Travel Guide to Europe",
      createdAt: "2025-03-20",
      commentsCount: 5,
      viewsCount: 320,
    },
    {
      id: "6",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "A Budget Travel Guide to Europe",
      createdAt: "2025-03-20",
      commentsCount: 5,
      viewsCount: 320,
    },
    {
      id: "7",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "A Budget Travel Guide to Europe",
      createdAt: "2025-03-20",
      commentsCount: 5,
      viewsCount: 320,
    },
    {
      id: "8",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "A Budget Travel Guide to Europe",
      createdAt: "2025-03-20",
      commentsCount: 5,
      viewsCount: 320,
    },
    {
      id: "9",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "A Budget Travel Guide to Europe",
      createdAt: "2025-03-20",
      commentsCount: 5,
      viewsCount: 320,
    },
    {
      id: "10",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "A Budget Travel Guide to Europe",
      createdAt: "2025-03-20",
      commentsCount: 5,
      viewsCount: 320,
    },
    {
      id: "11",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "A Budget Travel Guide to Europe",
      createdAt: "2025-03-20",
      commentsCount: 5,
      viewsCount: 320,
    },
    {
      id: "12",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "A Budget Travel Guide to Europe",
      createdAt: "2025-03-20",
      commentsCount: 5,
      viewsCount: 320,
    },
    {
      id: "13",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "A Budget Travel Guide to Europe",
      createdAt: "2025-03-20",
      commentsCount: 5,
      viewsCount: 320,
    },
    {
      id: "14",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "A Budget Travel Guide to Europe",
      createdAt: "2025-03-20",
      commentsCount: 5,
      viewsCount: 320,
    },
    {
      id: "15",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "A Budget Travel Guide to Europe",
      createdAt: "2025-03-20",
      commentsCount: 5,
      viewsCount: 320,
    },
    {
      id: "16",
      imageUrl: "https://www.techsmith.com/blog/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
      title: "A Budget Travel Guide to Europe",
      createdAt: "2025-03-20",
      commentsCount: 5,
      viewsCount: 320,
    },
    {
      id: "17",
      imageUrl: "https://via.placeholder.com/300x200?text=Travel",
      title: "A Budget Travel Guide to Europe",
      createdAt: "2025-03-20",
      commentsCount: 5,
      viewsCount: 320,
    },
  ];

  return (
    <div className=" w-4/4">
      {/* Right side - New Posts list */}
      
      <div
        className="  overflow-y-scroll no-scrollbar flex items-center flex-col justify-center"
       
      >
        <section className="min-w-6/7 flex flex-col items-center justify-center  gap-2 p-4">
          {demoPosts.length > 0 ? (
            demoPosts.map((post) => (
              <CardOfPost
                key={post.id}
                id={post.id}
                imageUrl={post.imageUrl}
                title={post.title}
                createdAt={post.createdAt}
                commentsCount={post.commentsCount}
                viewsCount={post.viewsCount}
              />
            ))
          ) : (
            <p>No posts found.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default Postbox;
