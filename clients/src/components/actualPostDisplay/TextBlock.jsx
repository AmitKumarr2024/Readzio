const TextBlock = ({ value }) => (
  <div
    className=" text-text-main-light dark:text-text-main-dark leading-relaxed text-lg"
    dangerouslySetInnerHTML={{ __html: value || "<p>&nbsp;</p>" }}
  />
);

export default TextBlock;