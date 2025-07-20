import React from "react";
import { Dialog } from "@headlessui/react";

// Confirmation modal with title and message
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    // Modal with cancel/confirm buttons
    <div className="fixed inset-0 flex items-center justify-center bg-black/25 z-50">
      <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg p-6 shadow-lg">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2">{message}</p>
        <div className="mt-4 flex justify-end space-x-2">
          <button
            className="bg-gray-300 hover:bg-gray-400 text-black font-semibold py-2 px-4 rounded"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;