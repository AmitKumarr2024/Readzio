import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipLoader } from 'react-spinners';
import { acknowledgeReport, clearError, fetchReportedPosts } from '../../store/adminSlice';
import { CheckCircle, XCircle } from 'lucide-react';

const AcknowledgeConfirmation = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { reportId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const { currentReport, loading, error } = useSelector((state) => state.admin);
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    if (!user) {
      navigate(`/login?returnTo=/acknowledge/${reportId}`);
      return;
    }

    dispatch(fetchReportedPosts({ reportId }));

    dispatch(acknowledgeReport({ reportId }))
      .unwrap()
      .then(() => {
        setStatus('success');
      })
      .catch((err) => {
        setStatus('error');
      });

    if (error) {
      const timer = setTimeout(() => dispatch(clearError()), 5000);
      return () => clearTimeout(timer);
    }
  }, [dispatch, reportId, user, navigate, error]);

  const handleNavigate = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-background-light dark:bg-background-dark rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-md border border-gray-100 dark:border-gray-700"
      >
        {status === 'pending' || loading ? (
          <div className="text-center">
            <ClipLoader color="#3B82F6" size={40} />
            <p className="mt-4 text-text-main-light dark:text-text-main-dark">Processing acknowledgment...</p>
          </div>
        ) : status === 'success' ? (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
            >
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 dark:text-green-400" />
            </motion.div>
            <h2 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark mt-4">Report Acknowledged</h2>
            <p className="mt-2 text-text-main-light dark:text-text-main-dark text-sm">
              You have successfully acknowledged the report, confirming that the reported issue has been addressed.
            </p>
            {currentReport && (
              <div className="mt-6 text-left bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">Report Details</h3>
                <p className="mt-1 text-text-main-light dark:text-text-main-dark text-sm">
                  <span className="font-medium">Report ID:</span> {reportId}
                </p>
                <p className="mt-1 text-text-main-light dark:text-text-main-dark text-sm">
                  <span className="font-medium">Post Title:</span>{' '}
                  {currentReport.post?.title || 'N/A'}
                </p>
                <p className="mt-1 text-text-main-light dark:text-text-main-dark text-sm">
                  <span className="font-medium">Post Author:</span>{' '}
                  {currentReport.post?.author?.name || 'N/A'}
                </p>
                <p className="mt-1 text-text-main-light dark:text-text-main-dark text-sm">
                  <span className="font-medium">Reason for Report:</span>{' '}
                  {currentReport.reason || 'N/A'}
                </p>
              </div>
            )}
            <button
              onClick={handleNavigate}
              className="mt-6 bg-blue-600 text-text-main-light dark:text-text-main-dark px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition w-full text-sm"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
            >
              <XCircle className="w-16 h-16 mx-auto text-red-500 dark:text-red-400" />
            </motion.div>
            <h2 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark mt-4">Error</h2>
            <p className="mt-2 text-text-main-light dark:text-text-main-dark text-sm">
              {error || 'Failed to acknowledge the report. Please try again or contact support.'}
            </p>
            <button
              onClick={handleNavigate}
              className="mt-6 bg-blue-600 text-text-main-light dark:text-text-main-dark px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition w-full text-sm"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AcknowledgeConfirmation;