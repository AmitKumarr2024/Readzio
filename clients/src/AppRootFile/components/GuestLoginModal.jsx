import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { trackGuestVisit } from "../../store/guestSlice";

const GuestLoginModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let delayTimer;
    if (isOpen) {
      dispatch(trackGuestVisit())
        .unwrap()
        .catch((err) => {
          // If backend sends 429 Too Many Requests → show modal after 30s
          if (err === "Failed to track guest visit" || err.includes("429")) {
            delayTimer = setTimeout(() => {
              setShowModal(true);
            }, 30000);
          }
        });
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
    };
  }, [isOpen, dispatch]);

  if (!isOpen || !showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full relative">
        <button
          className="absolute top-2 right-2 text-2xl font-bold text-gray-600 hover:text-gray-800"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Login Required
        </h2>
        <p className="text-gray-600 mb-6 text-center">
          Too many guest visits. Please log in to see more content.
        </p>
        <button
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          onClick={() => navigate("/login")}
        >
          Go to Login
        </button>
      </div>
    </div>
  );
};

export default GuestLoginModal;
