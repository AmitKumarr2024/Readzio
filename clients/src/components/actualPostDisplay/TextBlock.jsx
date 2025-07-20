const TextBlock = ({ value }) => (
  <div
    className="
      prose prose-sm sm:prose-base dark:prose-invert max-w-none
      text-text-main-light dark:text-text-main-dark
      [&>ul]:list-disc [&>ul]:pl-5
      [&>ol]:list-decimal [&>ol]:pl-5
      [&>li]:my-1
    "
    dangerouslySetInnerHTML={{ __html: value || "<p>&nbsp;</p>" }}
  />
);

export default TextBlock;
