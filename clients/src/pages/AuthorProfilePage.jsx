import React, { useState } from "react";
import AuthorHeader from "../components/Author/AuthorHeader";
import AuthorStatus from "../components/Author/AuthorStatus";
import AuthorPostsList from "../components/Author/AuthorPostsList";
import EditProfile from "../components/Author/EditProfile";
import Banner from "../components/Author/Banner";
import AuthorBookmarks from "../components/Author/AuthorBookmarks"; // Added component
import { Link } from "react-router-dom";

// Get saved banner from localStorage (if any)
const getInitialBanner = () => {
  return localStorage.getItem("authorBanner") || "https://source.unsplash.com/1200x300/?technology,code";
};

const AuthorProfilePage = () => {
  const [activeTab, setActiveTab] = useState("status");
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [authorData, setAuthorData] = useState({
    name: "John Doe",
    username: "johndoe",
    bio: "Software developer and writer.",
    email: "john@example.com",
    website: "https://johndoe.dev",
    avatar: "",
    banner: getInitialBanner(),
    gender: "Male",
    location: "New York",
    profession: "Developer",
    joinedDate: "March 2023",
    postsCount: 25,
    followers: 500,
    social: {
      website: "https://johndoe.dev",
      twitter: "john_doe",
      github: "johndoe",
      linkedin: "john-doe",
    },
  });

  const openEditModal = () => setIsEditOpen(true);
  const closeEditModal = () => setIsEditOpen(false);

  // Central update method that also updates localStorage for banner
  const updateAuthorData = (updatedFields) => {
    if (updatedFields.banner) {
      localStorage.setItem("authorBanner", updatedFields.banner);
    }
    setAuthorData((prev) => ({ ...prev, ...updatedFields }));
  };

  const handleSave = (updatedData) => {
    updateAuthorData(updatedData);
    closeEditModal();
  };

  const handleBannerChange = (newBannerUrl) => {
    updateAuthorData({ banner: newBannerUrl });
  };

  const tabs = [
    { id: "status", label: "Status" },
    { id: "posts", label: "Posts" },
    { id: "bookmarks", label: "Bookmarks" },
  ];

  const mockBookmarks = [
    {
      id: "1",
      title: "Understanding React Performance",
      slug: "understanding-react-performance",
      thumbnail: "https://source.unsplash.com/400x200/?react",
      date: "May 22, 2025",
      author: "John Doe",
    },
    {
      id: "2",
      title: "Mastering Node.js Streams",
      slug: "mastering-nodejs-streams",
      thumbnail: "https://source.unsplash.com/400x200/?nodejs",
      date: "May 10, 2025",
      author: "John Doe",
    },
  ];

  return (
    <div className="container mx-auto my-16 px-4 max-w-5xl relative">
      <Banner bannerUrl={authorData.banner} onBannerChange={handleBannerChange} />
      <hr />
      <AuthorHeader author={authorData} onEditClick={openEditModal} />

      <nav className="mt-10 border-b border-gray-300">
        <ul className="flex space-x-8 justify-center sm:justify-start">
          {tabs.map((tab) => (
            <li
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative cursor-pointer pb-3 font-semibold text-lg transition-colors duration-300 ${
                activeTab === tab.id
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-blue-500"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute left-0 bottom-0 w-full h-1 bg-blue-600 rounded-full transition-all"></span>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <section className="mt-8 min-h-[300px] bg-gradient-to-br from-slate-100 to-slate-300 rounded-2xl shadow-xl p-6">
        {activeTab === "status" && (
          <AuthorStatus
            stats={{
              posts: authorData.postsCount,
              followers: authorData.followers,
              following: 50,
              likes: 100,
            }}
          />
        )}
        {activeTab === "posts" && <AuthorPostsList />}
        {activeTab === "bookmarks" && (
          <div className="space-y-4 overflow-y-auto h-[450px]">
            {mockBookmarks.map((post) => (
              <div
                key={post.id}
                className="flex flex-wrap py-8 items-center gap-4 p-2 bg-white rounded-lg shadow hover:shadow-md transition"
              >
                <img
                  src={post.thumbnail}
                  alt={post.title}
                  className="w-20 h-16 object-cover rounded-md"
                />
                <div>
                  <Link to={`/post/${post.slug}`}>
                    <h3 className="text-lg font-semibold text-blue-600 hover:underline">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">{post.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isEditOpen && (
        <div className="fixed inset-0 bg-slate-700/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="relative rounded-xl shadow-2xl bg-white w-full max-w-4xl h-[650px] overflow-hidden">
            <EditProfile initialData={authorData} onSave={handleSave} />
            <button
              onClick={closeEditModal}
              className="absolute top-2 right-4 text-red-600 hover:text-red-700 text-4xl font-bold"
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorProfilePage;