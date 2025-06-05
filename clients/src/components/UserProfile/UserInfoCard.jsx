import UserAvatar from "./UserAvatar";
import Skeleton from "../UI/Skeleton";

export default function UserInfoCard({ user, loading }) {
  if (loading) {
    return (
      <div className="card w-full max-w-sm bg-white shadow-lg rounded-lg p-6 mx-auto">
        <div className="flex flex-col items-center space-y-4 animate-pulse">
          <Skeleton width="w-24" height="h-24" rounded="rounded-full" />
          <Skeleton width="w-32" height="h-6" rounded="rounded" />
          <Skeleton width="w-48" height="h-4" rounded="rounded" />
          <Skeleton width="w-40" height="h-4" rounded="rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-sm bg-white shadow-lg rounded-lg p-6 mx-auto hover:shadow-xl transition-shadow duration-300">
      <div className="card-body flex flex-col items-center text-center space-y-3">
        <UserAvatar
          src={user.avatar}
          alt={user.name}
          className="w-24 h-24 rounded-full border-4 border-indigo-500 shadow-md"
        />
        <h2 className="card-title text-2xl font-semibold text-indigo-700">{user.name}</h2>
        <p className="text-indigo-600 font-medium">{user.profession}</p>
        <p className="text-sm text-gray-500 italic">{user.location}</p>
      </div>
    </div>
  );
}
