// jobs/cleanupDrafts.js

import cron from 'node-cron';
import Post from '../models/Post.js'; // adjust path as needed
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to DB if not already done (in case running this standalone)
if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

/**
 * 🧹 CRON JOB: Deletes blog post drafts older than 7 days
 * Runs every day at midnight (00:00)
 */
cron.schedule('0 0 * * *', async () => {
  try {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await Post.deleteMany({
      isDraft: true,
      createdAt: { $lt: cutoffDate },
    });

    console.log(`🧹 Draft cleanup complete: ${result.deletedCount} drafts removed`);
  } catch (error) {
    console.error('❌ Error cleaning drafts:', error);
  }
});
