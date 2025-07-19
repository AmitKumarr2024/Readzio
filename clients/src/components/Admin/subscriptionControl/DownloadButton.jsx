// Component: Button to download all data as CSV
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { downloadAllDataCsv } from '../../../store/adminSlice';
import { FaDownload } from 'react-icons/fa';
import toast from 'react-hot-toast';

// Component to trigger data download in Excel format
const DownloadButton = () => {
  // Initialize Redux dispatch
  const dispatch = useDispatch();
  // Select subscription loading state from Redux store
  const { subscriptionLoading } = useSelector((state) => state.admin);

  // Handle CSV download action
  const handleDownloadExcel = () => {
    dispatch(downloadAllDataCsv())
      .unwrap()
      .then(() => toast.success('Data downloaded successfully'))
      .catch((err) => toast.error(err.message));
  };

  // Render: Download button
  return (
    <div className="flex justify-end">
      <button
        onClick={handleDownloadExcel}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition flex items-center space-x-2"
        disabled={subscriptionLoading}
      >
        <FaDownload />
        <span>Download All Data (Excel)</span>
      </button>
    </div>
  );
};

export default DownloadButton;