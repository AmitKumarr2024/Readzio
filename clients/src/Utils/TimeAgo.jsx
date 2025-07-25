import React from "react";

// Displays time since date and actual timestamp
const TimeAgo = ({ date }) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;

  let timeAgo = "";
  try {
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (days > 4) {
      timeAgo = then.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } else if (seconds < 60) {
      timeAgo = `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
    } else if (minutes < 60) {
      timeAgo = `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    } else if (hours < 24) {
      timeAgo = `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else {
      timeAgo = `${days} day${days !== 1 ? "s" : ""} ago`;
    }
  } catch (e) {
    console.error("[TimeAgo] Date parsing error:", e);
    timeAgo = "Invalid date";
  }

  // Format actual full date and time
  const fullDateTime = then.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <span className="text-sm text-gray-500" title={fullDateTime}>
      🕒 <span className="hidden sm:inline">{fullDateTime}</span>
    </span>
  );
};

export default TimeAgo;
