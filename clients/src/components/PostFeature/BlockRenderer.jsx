import VideoBlock from "./VideoBlock";
import QuoteBlock from "./QuoteBlock";
import ListBlock from "./ListBlock";
import HeadingBlock from "./HeadingBlock";
import TableBlock from "./TableBlock";
import LinkBlock from "./LinkBlock";
import HrBlock from "./HrBlock";
import EmojiBlock from "./EmojiBlock";
import FileBlock from "./FileBlock";
import PollBlock from "./PollBlock";
import TextBlock from "../actualPostDisplay/TextBlock";
import CodeBlockOutput from "../actualPostDisplay/CodeBlockOutput";
import ImageBlockOutput from "../actualPostDisplay/ImageBlockOutput";

const BlockRenderer = ({ blocks }) => {
  if (!Array.isArray(blocks)) return null;

  return blocks.map((block, i) => {
    switch (block.type) {
      case "text":
        return <TextBlock key={i} value={block.value} />;
      case "image":
        return <ImageBlockOutput key={i} src={block.src} caption={block.caption} />;
      case "code":
        return <CodeBlockOutput key={i} code={block.code} language={block.language || "javascript"} caption={block.caption}/>
      case "video":
        return <VideoBlock key={i} src={block.src} caption={block.caption} />;
      case "quote":
        return <QuoteBlock key={i} text={block.text} author={block.author} />;
      case "list":
        return (
          <ListBlock key={i} items={block.items} ordered={block.ordered} />
        );
      case "heading":
        return <HeadingBlock key={i} level={block.level} text={block.text} />;
      case "table":
        return <TableBlock key={i} data={block.data} />;
      case "link":
        return <LinkBlock key={i} href={block.href} text={block.text} />;
      case "hr":
        return <HrBlock key={i} />;
      case "emoji":
        return <EmojiBlock key={i} emoji={block.emoji} />;
      case "file":
        return <FileBlock key={i} url={block.url} name={block.name} />;
      case "poll":
        return (
          <PollBlock
            key={i}
            question={block.question}
            options={block.options}
          />
        );
        s;
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
