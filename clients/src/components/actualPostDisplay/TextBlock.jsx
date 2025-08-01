const TextBlock = ({ value }) => (
  <div
    className="rich-content my-4"
    dangerouslySetInnerHTML={{
      __html: value || "<p>&nbsp;</p>",
    }}
  />
);

export default TextBlock;
