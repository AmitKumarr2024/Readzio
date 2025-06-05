import React from "react";

const TimeAgo = ({ date }) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
  const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));

  let timeAgo = "";

  if (seconds < 60) {
    timeAgo = `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
  } else if (minutes < 60) {
    timeAgo = `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  } else if (hours < 24) {
    timeAgo = `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  } else if (days < 30) {
    timeAgo = `${days} day${days !== 1 ? "s" : ""} ago`;
  } else if (months < 12) {
    timeAgo = `${months} month${months !== 1 ? "s" : ""} ago`;
  } else {
    timeAgo = `${years} year${years !== 1 ? "s" : ""} ago`;
  }

  return (
    <span title={then.toLocaleString()}>
      🕒 {timeAgo}
    </span>
  );
};

export default TimeAgo;
