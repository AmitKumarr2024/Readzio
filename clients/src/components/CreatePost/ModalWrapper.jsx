import React from "react";

const ModalWrapper = ({ children, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-xl max-w-md w-full p-6 sm:p-8 shadow-xl relative border border-gray-200 dark:border-gray-800">
        {children}
      </div>
    </div>
  );
};

export default ModalWrapper;