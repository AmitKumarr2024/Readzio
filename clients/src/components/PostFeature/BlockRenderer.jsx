import TextBlock from "../actualPostDisplay/TextBlock";
import CodeBlockOutput from "../actualPostDisplay/CodeBlockOutput";
import ImageBlockOutput from "../actualPostDisplay/ImageBlockOutput";
import EmojiBlockOutput from "../actualPostDisplay/EmojiBlockOutput";
import FileDownloadOutput from "../actualPostDisplay/FileDownloadOutput";
import HrOutput from "../actualPostDisplay/HrOutput";
import HeadingOutput from "../actualPostDisplay/HeadingOutput";
import LinkBlockOutput from "../actualPostDisplay/LinkBlockOutput";
import ListBlockOutput from "../actualPostDisplay/ListBlockOutput";
import PollBlockOutput from "../actualPostDisplay/PollBlockOutput";
import QuoteBlockOutput from "../actualPostDisplay/QuoteBlockOutput";
import TableBlocksOutput from "../actualPostDisplay/TableBlocksOutput";
import VideoBlockOutput from "../actualPostDisplay/VideoBlockOutput";

const BlockRenderer = ({ blocks }) => {
  if (!Array.isArray(blocks)) return null;

  return blocks.map((block, i) => {
    switch (block.type) {
      case "text":
        return <TextBlock key={i} value={block.value} />;
      case "image":
        return (
          <ImageBlockOutput key={i} src={block.src} caption={block.caption} />
        );
      case "code":
        return (
          <CodeBlockOutput
            key={i}
            code={block.code}
            language={block.language || "javascript"}
            caption={block.caption}
          />
        );
      case "video":
        return (
          <VideoBlockOutput key={i} src={block.src} caption={block.caption} />
        );
      case "quote":
        return (
          <QuoteBlockOutput key={i} text={block.text} author={block.author} />
        );

      case "list":
        return (
          <ListBlockOutput
            key={i}
            items={block.items}
            ordered={block.ordered}
          />
        );
      case "heading":
        return (
          <HeadingOutput key={i} level={block.level || 2} text={block.text} />
        );
      case "table":
        return (
          <TableBlocksOutput
            key={i}
            data={block.data}
            caption={block.caption}
          />
        );
      case "link":
        return (
          <LinkBlockOutput
            key={i}
            href={block.href}
            text={block.text}
            caption={block.caption}
          />
        );
      case "hr":
        return <HrOutput key={i} caption={block.caption} />;
      case "emoji":
        return <EmojiBlockOutput key={i} emoji={block.emoji} />;
      case "file":
        return <FileDownloadOutput key={i} url={block.url} name={block.name} />;
      case "poll":
        return (
          <PollBlockOutput
            key={i}
            question={block.question}
            options={block.options}
            caption={block.caption}
          />
        );

      default:
        return (
          <div key={i} className="text-red-500 italic">
            Unsupported content block.
          </div>
        );
    }
  });
};

export default BlockRenderer;
