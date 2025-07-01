import React, { useState } from 'react';
import { FaSearch, FaSort, FaUsers, FaHistory, FaPaperPlane } from 'react-icons/fa';
import SendNotificationForm from './SendNotification';
import UserMessagePanel from './UserMessagePanel';
import MessageHistory from './MessageHistory';

export default function AdminMessageDashboard() {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 md:p-8">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
          <FaUsers className="inline-block mr-2 text-blue-600" />
          Admin Messaging Dashboard
        </h1>
      </header>

      {/* Search and Sort Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-64">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
          />
        </div>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300"
        >
          <FaSort />
          Sort {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        {/* User Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 h-[calc(100vh-250px)] sm:h-[500px] overflow-y-auto transition-all duration-300">
            <UserMessagePanel
              onUserSelect={setSelectedUserId}
              selectedUserId={selectedUserId}
              searchTerm={searchTerm}
              sortOrder={sortOrder}
            />
          </div>
        </div>

        {/* Message History */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 h-[calc(100vh-250px)] sm:h-[500px] overflow-y-auto">
            <MessageHistory userId={selectedUserId} />
          </div>
        </div>
      </div>

      {/* Notification Form */}
      <div className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <SendNotificationForm />
      </div>
    </div>
  );
}