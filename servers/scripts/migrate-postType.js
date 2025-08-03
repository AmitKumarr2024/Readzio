import mongoose from "mongoose";
import PostModel from "../../servers/Models/Post.js"; 

async function migratePostType() {
  try {
    await mongoose.connect("mongodb://localhost:27017/your_database", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const posts = await PostModel.find({ postType: { $exists: false } });
    console.log(`Found ${posts.length} posts without postType`);

    for (const post of posts) {
      post.postType = "Blog"; // Set default as per schema
      await post.save();
      console.log(`Updated post ${post._id} with postType: ${post.postType}`);
    }

    console.log("Migration completed");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

migratePostType();