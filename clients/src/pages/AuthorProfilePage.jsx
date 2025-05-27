import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import AuthorHeader from "../components/Author/AuthorHeader";
import AuthorStatus from "../components/Author/AuthorStatus";
import AuthorPostsList from "../components/Author/AuthorPostsList";
import EditProfile from "../components/Author/EditProfile";
import Banner from "../components/Author/Banner";
import { updateUser } from "../store/userSlice";

const getInitialBanner = () => {
  return (
    localStorage.getItem("authorBanner") ||
    "https://source.unsplash.com/1200x300/?technology,code"
  );
};

const AuthorProfilePage = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);

  console.log("banner",user?.data?._id);
  

  const [banner, setBanner] = useState(getInitialBanner());
  const [activeTab, setActiveTab] = useState("status");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    if (user) {
      setInitialData({
        ...user,
        banner,
        social: {
          website: user?.website || "",
          twitter: user?.twitter || "",
          github: user?.github || "",
          linkedin: user?.linkedin || "",
        },
      });
    }
  }, [user, banner]);

  const openEditModal = () => setIsEditOpen(true);
  const closeEditModal = () => setIsEditOpen(false);

  const handleSave = async (updatedData) => {
    if (updatedData.banner) {
      localStorage.setItem("authorBanner", updatedData.banner);
      setBanner(updatedData.banner);
    }

    try {
      await dispatch(updateUser(updatedData)).unwrap();

      setInitialData({
        ...updatedData,
        banner: updatedData.banner || banner,
        social: {
          website: updatedData.website || "",
          twitter: updatedData.twitter || "",
          github: updatedData.github || "",
          linkedin: updatedData.linkedin || "",
        },
      });

      closeEditModal();

      // Force full page reload after update
      window.location.reload();
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  const handleBannerChange = (newBannerUrl) => {
    setBanner(newBannerUrl);
    localStorage.setItem("authorBanner", newBannerUrl);
  };

  if (!user || !initialData) return <div>Loading user data...</div>;

  return (
    <div className="container mx-auto my-16 px-4 max-w-5xl relative">
      <Banner
        userId={user?.data?._id}
        bannerUrl={banner}
        onBannerChange={handleBannerChange}
      />
      <hr />
      <AuthorHeader authors={{ ...user, banner }} onEditClick={openEditModal} />

      <nav className="mt-10 border-b border-gray-300">
        <ul className="flex space-x-8 justify-center sm:justify-start">
          {["status", "posts"].map((tab) => (
            <li
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative cursor-pointer pb-3 font-semibold text-lg ${
                activeTab === tab
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-blue-500"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <span className="absolute left-0 bottom-0 w-full h-1 bg-blue-600 rounded-full"></span>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <section className="mt-8 min-h-[300px] bg-gradient-to-br from-slate-100 to-slate-300 rounded-2xl shadow-xl p-6">
        {activeTab === "status" && (
          <AuthorStatus
            stats={{
              posts: user?.postsCount || 0,
              followers: user?.followers || 0,
              following: user?.following || 0,
              likes: user?.likes || 0,
            }}
          />
        )}
        {activeTab === "posts" && <AuthorPostsList />}
      </section>

      {isEditOpen && (
        <div className="fixed inset-0 bg-slate-700/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="relative rounded-xl shadow-2xl bg-white w-full max-w-4xl h-[650px] overflow-hidden">
            <EditProfile initialData={initialData} onSave={handleSave} />
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
