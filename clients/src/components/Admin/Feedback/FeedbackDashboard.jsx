import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllUserFeedback } from "../../../store/userSlice";
import FeedbackTable from "./FeedbackTable";

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
      <FeedbackTable
        feedbackList={list}
        loading={loadingList}
        error={errorList}
      />
    </div>
  );
};

export default FeedbackDashboard;
