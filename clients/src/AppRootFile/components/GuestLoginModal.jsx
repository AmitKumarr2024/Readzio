// components/GuestLoginModal.jsx
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { trackGuestVisit } from "../../store/guestSlice";

const GuestLoginModal = () => {
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkGuestVisit = async () => {
      try {
        const action = await dispatch(trackGuestVisit());

        if (trackGuestVisit.rejected.match(action)) {
          // Limit exceeded (backend returned 429)
          console.warn("[GuestLoginModal] Guest limit exceeded");
          setTimeout(() => setShowModal(true), 30000); // show modal after 30s
        } else {
          // console.log("[GuestLoginModal] Guest visit OK:", action.payload);
        }
      } catch (err) {
        console.error("[GuestLoginModal] Unexpected error:", err);
      }
    };

    checkGuestVisit();
  }, [dispatch]);

  if (!showModal) return null;

  return (
    <div className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50">
      <h2 className="font-bold text-lg">Login Required</h2>
      <p className="text-sm text-gray-600">
        You’ve reached the guest viewing limit. Please log in to continue.
      </p>
      <button
        onClick={() => (window.location.href = "/login")}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Go to Login Page
      </button>
    </div>
  );
};

export default GuestLoginModal;
