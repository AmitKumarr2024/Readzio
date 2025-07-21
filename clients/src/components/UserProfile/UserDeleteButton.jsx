import { useDispatch } from "react-redux";
import { deleteUser } from "../slices/userSlice";
import Skeleton from "@/components/ui/Skeleton"; 

export default function UserDeleteButton({ userId, loading }) {
  const dispatch = useDispatch();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this user?")) {
      dispatch(deleteUser(userId));
    }
  };

  return loading ? (
    <Skeleton
      width="w-28"
      height="h-10"
      rounded="rounded-md"
      className="mx-auto animate-pulse"
    />
  ) : (
    <button
      className="btn btn-error btn-md w-28 mx-auto block shadow-md hover:shadow-lg transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
      onClick={handleDelete}
      aria-label="Delete User"
    >
      Delete User
    </button>
  );
}
