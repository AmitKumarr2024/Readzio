import React from "react";
import moment from "moment";

const FeedbackItem = ({ feedback }) => {
  return (
    <div className="border rounded-xl p-4 shadow-sm bg-white dark:bg-gray-900">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">
          Rating: <span className="text-yellow-500">{feedback.rating}★</span>
        </h3>
        <span className="text-sm text-gray-500">
          {moment(feedback.createdAt).fromNow()}
        </span>
      </div>
      <p className="mt-2 text-gray-700 dark:text-gray-300">{feedback.message}</p>
      {feedback.user && (
        <p className="mt-1 text-sm text-gray-500">
          From: {feedback.user.name} ({feedback.user.email})
        </p>
      )}
    </div>
  );
};

export default FeedbackItem;
