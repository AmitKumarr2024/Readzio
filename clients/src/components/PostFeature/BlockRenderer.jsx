import React from "react";
import TextBlock from "../actualPostDisplay/TextBlock";
import CodeBlockOutput from "../actualPostDisplay/CodeBlockOutput";
import ImageBlockOutput from "../actualPostDisplay/ImageBlockOutput";
import FileDownloadOutput from "../actualPostDisplay/FileDownloadOutput";
import HrOutput from "../actualPostDisplay/HrOutput";
import HeadingOutput from "../actualPostDisplay/HeadingOutput";
import LinkBlockOutput from "../actualPostDisplay/LinkBlockOutput";
import ListBlockOutput from "../actualPostDisplay/ListBlockOutput";
import PollBlockOutput from "../actualPostDisplay/PollBlockOutput";
import QuoteBlockOutput from "../actualPostDisplay/QuoteBlockOutput";
import TableBlocksOutput from "../actualPostDisplay/TableBlocksOutput";
import VideoBlockOutput from "../actualPostDisplay/VideoBlockOutput";

const BlockRenderer = ({ blocks, postId, loginUser, getUserById }) => {
  console.log("BlockRenderer called with blocks:", blocks);

  if (!Array.isArray(blocks)) {
    console.warn("BlockRenderer: 'blocks' prop is not an array", blocks);
    return null;
  }

  return blocks.map((block, i) => {
    console.log(`Rendering block #${i}`, block);

    switch (block.type) {
      case "text":
        console.log("Render TextBlock");
        return <TextBlock key={i} value={block.value} />;

      case "image":
        console.log("Render ImageBlockOutput");
        return (
          <ImageBlockOutput key={i} src={block.src} caption={block.caption} />
        );

      case "code":
        console.log("Render CodeBlockOutput");
        return (
          <CodeBlockOutput
            key={i}
            code={block.code}
            language={block.language || "javascript"}
            caption={block.caption}
          />
        );

      case "video":
        console.log("Render VideoBlockOutput");
        return (
          <VideoBlockOutput key={i} src={block.src} caption={block.caption} />
        );

      case "quote":
        console.log("Render QuoteBlockOutput");
        return (
          <QuoteBlockOutput key={i} text={block.text} author={block.author} />
        );

      case "list":
        console.log("Render ListBlockOutput");
        return (
          <ListBlockOutput
            key={i}
            items={block.items}
            ordered={block.ordered}
          />
        );

      case "heading":
        console.log("Render HeadingOutput");
        return (
          <HeadingOutput key={i} level={block.level || 2} text={block.text} />
        );

      case "table":
        console.log("Render TableBlocksOutput");
        return (
          <TableBlocksOutput
            key={i}
            data={block.data}
            caption={block.caption}
          />
        );

      case "link":
        console.log("Render LinkBlockOutput");
        return (
          <LinkBlockOutput
            key={i}
            href={block.href}
            text={block.text}
            caption={block.caption}
          />
        );

      case "hr":
        console.log("Render HrOutput");
        return <HrOutput key={i} caption={block.caption} />;

      case "file":
        console.log("Render FileDownloadOutput");
        return <FileDownloadOutput key={i} url={block.url} name={block.name} />;

      case "poll":
        console.log("Render PollBlockOutput");
        return (
          <PollBlockOutput
            key={i}
            postId={postId} // pass it here
            question={block.question}
            options={block.options}
            caption={block.caption}
          />
        );

      default:
        console.warn("Unsupported block type:", block.type);
        return (
          <div key={i} className="text-red-500 italic">
            Unsupported content block.
          </div>
        );
    }
  });
};

export default BlockRenderer;
