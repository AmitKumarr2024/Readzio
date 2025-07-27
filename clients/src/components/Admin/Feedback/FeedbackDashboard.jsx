import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllUserFeedback } from "../../../store/userSlice";
import FeedbackItem from "./FeedbackItem";

const FeedbackDashboard = () => {
  const dispatch = useDispatch();
  const { list, loadingList, errorList } = useSelector(
    (state) => state.user.feedback
  );

  useEffect(() => {
    dispatch(fetchAllUserFeedback());
  }, [dispatch]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📋 User Feedback</h2>
      {loadingList && <p>Loading feedbacks...</p>}
      {errorList && <p className="text-red-500">{errorList}</p>}
      {!loadingList && list.length === 0 && <p>No feedback yet.</p>}
      <div className="grid gap-4">
        {list.map((feedback) => (
          <FeedbackItem key={feedback._id} feedback={feedback} />
        ))}
      </div>
    </div>
  );
};

export default FeedbackDashboard;
