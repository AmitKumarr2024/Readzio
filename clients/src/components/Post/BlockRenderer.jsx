import TextBlock from "./TextBlock";
import ImageBlock from "./ImageBlock";
import CodeBlock from "./CodeBlock";

const BlockRenderer = ({ blocks }) => {
  if (!Array.isArray(blocks)) return null;

  return blocks.map((block, i) => {
    switch (block.type) {
      case "text":
        return <TextBlock key={i} value={block.value} />;
      case "image":
        return <ImageBlock key={i} src={block.src} caption={block.caption} />;
      case "code":
        return <CodeBlock key={i} code={block.code} caption={block.caption} />;
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
