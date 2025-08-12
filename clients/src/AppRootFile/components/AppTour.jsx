import React, { useState, useEffect } from "react";
import Joyride from "react-joyride";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { updateUser } from "../../store/userSlice"; // adjust path if needed

const STORAGE_KEY = "app_tour_completed";

const mainPageSteps = [
  {
    target: ".nav-home",
    content: "This is your home button, click to browse posts.",
    placement: "bottom",
  },
  {
    target: ".btn-create-post",
    content: "Use this button to create a new post!",
    placement: "bottom",
  },
  {
    target: ".user-profile-link",
    content: "Access your profile from here.",
    placement: "left",
  },
  {
    target: ".search-input",
    content: "Search for articles or users here.",
    placement: "bottom",
  },
  {
    target: ".categories-section",
    content: "Browse posts by categories here.",
    placement: "top",
  },
  {
    target: ".tabbed-post-section",
    content: "Switch between All Posts, Following, and My Posts here.",
    placement: "bottom",
  },
  {
    target: ".sidebar-toggle-btn",
    content: "Click here to open or close the sidebar menu.",
    placement: "left",
  },
  {
    target: ".post-tab-content",
    content: "Here you can browse all posts in the selected tab.",
    placement: "top",
  },
];

const createPostSteps = [
  {
    target: "#post-type-modal",
    content: "Choose the type of post here.",
    placement: "center",
  },
  {
    target: "#category-modal",
    content: "Select the post category.",
    placement: "center",
  },
  {
    target: "#create-post-main",
    content: "Your main workspace for creating posts.",
    placement: "top",
  },
  {
    target: "#cancel-post-button",
    content: "Cancel creation and return home.",
    placement: "bottom",
  },
  {
    target: "#post-editor-wrapper",
    content: "Edit your post content here.",
    placement: "right",
  },
  {
    target: "#post-preview-list-wrapper",
    content: "Preview drafts and manage posts here.",
    placement: "left",
  },
];

export default function AppTour() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth); // use auth state
  const [run, setRun] = useState(false);

  // Pick steps based on page
  const steps =
    location.pathname === "/createPost" ? createPostSteps : mainPageSteps;

  // 🚫 Only run if user is logged in
  useEffect(() => {
    if (!isAuthenticated) return;

    const completedLocal = localStorage.getItem(STORAGE_KEY);
    if (!completedLocal && !user?.tourCompleted) {
      setRun(true);
    }
  }, [isAuthenticated, user, location.pathname]);

  const handleCallback = (data) => {
    const { status } = data;
    const finishedStatuses = ["finished", "skipped"];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem(STORAGE_KEY, "true");

      if (!user?.tourCompleted) {
        dispatch(updateUser({ tourCompleted: true }));
      }
    }
  };

  if (!isAuthenticated) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      scrollToFirstStep={true}
      showSkipButton={true}
      showProgress={true}
      callback={handleCallback}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: "#2563eb",
        },
        tooltipContainer: {
          borderRadius: "8px",
        },
      }}
    />
  );
}
