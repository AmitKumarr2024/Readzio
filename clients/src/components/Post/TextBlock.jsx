// TextBlock.js
const TextBlock = ({ value }) => (
  <div
    className="text-gray-800 leading-relaxed text-lg"
    dangerouslySetInnerHTML={{ __html: value || "<p>&nbsp;</p>" }}
  />
);

export default TextBlock;
