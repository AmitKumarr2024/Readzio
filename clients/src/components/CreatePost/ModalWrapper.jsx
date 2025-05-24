import React from "react";

const ModalWrapper = ({ children, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-8 shadow-xl relative">
        
        {children}
      </div>
    </div>
  );
};

export default ModalWrapper;
