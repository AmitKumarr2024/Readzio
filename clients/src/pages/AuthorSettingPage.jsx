import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import AccountManagement from '../components/Setting/AccountManagement';
import ContentPreferences from '../components/Setting/ContentPreferences';
import NotificationSettings from '../components/Setting/Notification_System';
import ProfileVisibilitySettings from '../components/Setting/ProfileVisibilitySettings';
import { deleteUser } from '../store/userSlice';

const AuthorSettingPage = () => {
  const [settings, setSettings] = useState({
    profileVisibility: 'public',
    notifications: {
      notifyComments: true,
      notifyLikes: false,
      notifyFollowers: true,
    },
    defaultPostVisibility: 'public',
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userId = useSelector((state) => state.user.user?._id);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (e) => {
    const { name, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [name]: checked,
      },
    }));
  };

  const handleDeleteAccount = async () => {
    if (
      window.confirm(
        'Are you sure you want to delete your account? This action is irreversible.'
      )
    ) {
      try {
        await dispatch(deleteUser(userId)).unwrap();
        alert('Account deleted successfully');
        navigate('/'); // redirect to homepage or login page
      } catch (error) {
        alert(`Failed to delete account: ${error}`);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white rounded shadow mt-20">
      <h1 className="text-3xl font-bold mb-6">Author Settings</h1>

      <ProfileVisibilitySettings
        visibility={settings.profileVisibility}
        onChange={handleChange}
      />

      <NotificationSettings
        notifications={settings.notifications}
        onToggle={handleToggle}
      />

      <ContentPreferences
        postVisibility={settings.defaultPostVisibility}
        onChange={handleChange}
      />

      <AccountManagement onDelete={handleDeleteAccount} />
    </div>
  );
};

export default AuthorSettingPage;
