import React from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import UserCardWrapper from "../../Cards/usercard/UserCardWrapper";


const UserModal = ({ isOpen, onClose, authorId }) => (
  <Transition show={isOpen}>
    <Dialog onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:hidden">
      <Transition.Child
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      </Transition.Child>
      <Transition.Child
        enter="ease-out duration-300"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-auto relative">
          <button
            className="absolute top-0 -right-2 text-gray-600 dark:text-gray-300 hover:text-red-600 transition-colors p-2"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>
          {authorId && <UserCardWrapper userId={authorId} />}
        </div>
      </Transition.Child>
    </Dialog>
  </Transition>
);

export default UserModal;