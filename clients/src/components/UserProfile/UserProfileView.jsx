import { motion } from "framer-motion";
import UserAvatar from "./UserAvatar";
import UserCoverImage from "./UserCoverImage";
import {
  FiMail,
  FiMapPin,
  FiUser,
  FiBriefcase,
  FiCalendar,
  FiLock,
  FiUsers,
  FiUserCheck,
} from "react-icons/fi";
import Skeleton from "@/components/ui/Skeleton"; 

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function UserProfileView({ user, loading }) {
  const formatDate = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString() : "N/A";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 max-w-4xl w-full rounded-xl shadow-lg overflow-hidden">
        <motion.div
      className="flex justify-center px-4 max-h-[650px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="bg-white max-w-4xl w-full rounded-xl shadow-lg overflow-hidden">
        {/* Cover Image Skeleton */}
        <Skeleton height="h-48 md:h-56" className="w-full" />

        {/* Avatar + Info */}
        <div className=" flex items-center gap-10 justify-start  h-52 px-10">
          {/* Avatar Skeleton */}
          <Skeleton width="w-48" height="h-48" rounded="rounded-full" className="border-4 border-gray-400 shadow-2xl" />

          {/* Text Info */}
          <div className="flex flex-col items-center px-6 md:px-12 pb-8 pt-1 text-center w-full">
            <Skeleton width="w-40" height="h-6" className="mb-2" />
            <Skeleton width="w-52" height="h-4" className="mb-4" />
            <Skeleton width="w-64" height="h-4" />
          </div>
        </div>

        {/* Divider */}
        <hr className="my-1 border-gray-300" />

        {/* User Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 md:px-12 pb-8 pt-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton width="w-6" height="h-6" rounded="rounded-full" />
              <Skeleton width="w-48" height="h-4" />
            </div>
          ))}
        </div>

        <hr className="my-2 border-gray-300" />

        {/* Followers and Following */}
        <div className="flex bg-gray-50 rounded-lg overflow-hidden shadow-inner">
          {["Followers", "Following"].map((label, i) => (
            <div
              key={label}
              className={`w-1/2 p-6 text-center ${
                i === 1 ? "border-l border-gray-300" : ""
              }`}
            >
              <Skeleton width="w-20" height="h-6" className="mx-auto mb-2" />
              <Skeleton width="w-24" height="h-4" className="mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="flex justify-center px-4 h-full md:max-h-[650px]"
      initial="hidden"
      animate="visible"
      variants={fadeUp}
    >
      <motion.div
        className="bg-white max-w-4xl w-full rounded-xl shadow-lg overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Cover Image */}
        <motion.div className="relative h-48 md:h-56 overflow-hidden">
          <UserCoverImage
            src={
              user.banner ||
              "https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=2000&q=80"
            }
            alt={`${user?.name} cover`}
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Avatar */}
        <div className=" flex font-(family-name:--font-Urbanist) items-center flex-col mt-10 md:mt-1 md:flex-row mb-10 md:mb-1 gap-1 md:gap-10 justify-start  h-52 px-10">
          <motion.div variants={fadeUp}>
            <UserAvatar
              src={
                user.avatar ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=2000&q=80"
              }
              alt={user?.name}
              className="w-48 h-48 rounded-full border-4 border-gray-400 object-cover shadow-2xl"
            />
          </motion.div>

          {/* Profile Info */}
          <div className=" flex flex-col font-(family-name:--font-Urbanist) items-center px-6 md:px-12 pb-8 pt-1  text-center">
            <motion.h2
              className="text-5xl font-extrabold text-gray-900"
              variants={fadeUp}
            >
              {user?.name || "Anonymous"}
            </motion.h2>

            {user.email && (
              <motion.p
                className="flex items-center justify-center mt-1 text-gray-400 font-bold text-lg space-x-1"
                variants={fadeUp}
              >
                <FiMail />
                <span>{user.email}</span>
              </motion.p>
            )}

            <motion.p
              className="mt-4 text-fuchsia-500 font-semibold text-lg italic"
              variants={fadeUp}
            >
              {user.bio || "No bio available."}
            </motion.p>
          </div>
        </div>

        <div className="px-6 md:px-12 pb-8 pt-1 text-center font-(family-name:--font-Urbanist)">
          <motion.hr className="my-1 border-gray-300" variants={fadeUp} />
          {/* User Details */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700 text-sm"
            variants={fadeUp}
          >
            {[
              { icon: <FiUser />, label: "Gender", value: user.gender },
              {
                icon: <FiBriefcase />,
                label: "Profession",
                value: user.profession,
              },
              { icon: <FiMapPin />, label: "Location", value: user.location },
              { icon: <FiUserCheck />, label: "Role", value: user.role },
              {
                icon: <FiLock />,
                label: "Blocked",
                value: user.blocked ? "Yes" : "No",
              },
              {
                icon: <FiCalendar />,
                label: "Joined",
                value: formatDate(user.joiningDate),
              },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="flex items-center space-x-3"
                custom={i}
                variants={fadeUp}
              >
                <div className="text-xl text-gray-600">{item.icon}</div>
                <span>
                  <strong>{item.label}:</strong> {item.value || "N/A"}
                </span>
              </motion.div>
            ))}
          </motion.div>

          <motion.hr className="my-2 border-gray-300" variants={fadeUp} />

          {/* Followers & Following */}
          <motion.div 
            className="flex bg-gray-50 rounded-lg overflow-hidden shadow-inner font-(family-name:--font-Urbanist)"
            variants={fadeUp}
          >
            {[
              {
                count: user.followers?.length || 0,
                label: "Followers",
                icon: <FiUsers />,
              },
              {
                count: user.following?.length || 0,
                label: "Following",
                icon: <FiUserCheck />,
              },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className={`w-1/2 p-6 text-center cursor-pointer hover:bg-gray-100 transition ${
                  i === 1 ? "border-l border-gray-300" : ""
                }`}
                custom={i + 5}
                variants={fadeUp}
              >
                <p className="text-2xl font-bold text-gray-900">
                  {item.count.toLocaleString()}
                </p>
                <p className="flex justify-center items-center space-x-2 text-gray-600">
                  {item.icon}
                  <span>{item.label}</span>
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
