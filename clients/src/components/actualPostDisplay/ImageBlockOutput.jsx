// ImageBlock.js
const ImageBlockOutput = ({ src, caption }) => (
  <figure className="my-6">
    <img
      src={src}
      alt={caption || "Image"}
      className="rounded-lg shadow-md max-h-[600px] aspect-7/4 object-contain w-full"
    />
    {caption && (
      <figcaption className="text-sm text-center  text-text-main-light dark:text-text-main-dark mt-2">
        {caption}
      </figcaption>
    )}
  </figure>
);

export default ImageBlockOutput;
