export const calculateReadTime = (blocks = []) => {
  const wordsPerMinute = 200;
  const imageViewTime = 12; // seconds per image
  const codeViewTime = 15;  // seconds per code block
  const videoViewTime = 60; // estimated 1 minute per video
  const fileViewTime = 10;  // seconds per file
  const pollViewTime = 10;  // seconds to read/vote a poll
  const tableViewTime = 10; // seconds per table
  const headingViewTime = 5; // seconds per heading
  const defaultBlockTime = 5; // fallback time in seconds

  let totalWords = 0;
  let totalSeconds = 0;

  for (const block of blocks) {
    if (!block || block.blocked) continue;

    const { type } = block;

    switch (type) {
      case "text":
      case "quote":
      case "code": {
        const content = block.text || block.value || block.code || "";
        totalWords += content.trim().split(/\s+/).length;
        if (type === "code") totalSeconds += codeViewTime;
        break;
      }

      case "list": {
        const words = Array.isArray(block.items)
          ? block.items.join(" ").split(/\s+/).length
          : 0;
        totalWords += words;
        break;
      }

      case "caption": {
        totalWords += (block.caption || "").split(/\s+/).length;
        break;
      }

      case "heading": {
        totalSeconds += headingViewTime;
        totalWords += (block.text || "").split(/\s+/).length;
        break;
      }

      case "table": {
        totalSeconds += tableViewTime;
        break;
      }

      case "poll": {
        totalSeconds += pollViewTime;
        totalWords += (block.question || "").split(/\s+/).length;
        if (Array.isArray(block.options)) {
          totalWords += block.options.length * 2; // small bonus for each option
        }
        break;
      }

      case "image": {
        totalSeconds += imageViewTime;
        break;
      }

      case "video": {
        totalSeconds += videoViewTime;
        break;
      }

      case "file": {
        totalSeconds += fileViewTime;
        break;
      }

      case "link": {
        totalWords += (block.href || "").split(/\s+/).length;
        break;
      }

      case "hr": {
        totalSeconds += defaultBlockTime;
        break;
      }

      default: {
        totalSeconds += defaultBlockTime;
      }
    }
  }

  // Add reading time from words
  totalSeconds += (totalWords / wordsPerMinute) * 60;

  const readingTime = Math.ceil(totalSeconds / 60);

  return {
    readTime: readingTime <= 1 ? "1 min read" : `${readingTime} min read`,
    readingTime,
  };
};
