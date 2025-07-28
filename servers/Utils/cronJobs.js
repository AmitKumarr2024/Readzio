// cron/notificationCleaner.js

import cron from 'node-cron';
import Notification from '../../servers/Models/Notification.js';

// Run on 2nd day of every month at 00:00 IST
cron.schedule(
  '0 0 2 * *',
  async () => {
    try {
      // console.log('[Cron:NotificationDeletion] Starting job...');
      const result = await Notification.deleteMany({});
      // console.log(`[Cron:NotificationDeletion] Deleted ${result.deletedCount} notifications`);
    } catch (error) {
      console.error('[Cron:NotificationDeletion] Error:', error.message);
    }
  },
  {
    timezone: 'Asia/Kolkata',
  }
);

// console.log('[Cron:Startup] Notification deletion job scheduled');
