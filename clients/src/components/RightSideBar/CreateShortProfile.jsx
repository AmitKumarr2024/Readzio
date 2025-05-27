import React from "react";
import { useSelector } from "react-redux";
import { MapPin, CalendarDays } from "lucide-react";
import SubscribeButton from "./SubscribeButton";

const CreateShortProfile = () => {
  const user = useSelector((state) => state.auth.user);

  if (!user) {
    return null; // or spinner/loading UI
  }

  const {
    name,
    avatar,
    location,
    profession,
    bio,
    joinedDate,
  } = user;

  const joinedDateFormatted = joinedDate
    ? new Date(joinedDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 w-86 max-w-md mx-auto flex flex-col items-center gap-6 border border-gray-200">
      {/* Avatar */}
      <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-gray-300 shadow-md transition-transform hover:scale-105">
        <img src={avatar} alt={name} className="h-full w-full object-cover" />
      </div>

      {/* Name & Profession */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
        <p className="text-gray-600 text-sm sm:text-base mt-1">💼 {profession}</p>
      </div>

      {/* Divider */}
      <div className="w-full border-t border-gray-200" />

      {/* Bio Section */}
      <div className="w-full bg-gray-50 px-4 py-3 rounded-lg shadow-inner text-sm sm:text-base text-gray-700 italic">
        {bio}
      </div>

      {/* Location & Date */}
      <div className="w-full flex flex-col gap-2 text-sm sm:text-base text-gray-500">
        <div className="flex items-center gap-2">
          <MapPin size={16} /> <span>{location}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays size={16} /> <span>Joined: {joinedDateFormatted}</span>
        </div>
      </div>

      {/* Subscribe Button */}
      <div className="w-full pt-4 flex justify-center">
        <SubscribeButton />
      </div>
    </div>
  );
};

export default CreateShortProfile;
