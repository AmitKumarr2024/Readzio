// ImageBlock.js
const ImageBlock = ({ src, caption }) => (
  <figure className="my-6">
    <img
      src={src}
      alt={caption || "Image"}
      className="rounded-lg shadow-md max-h-[600px] object-contain w-full"
    />
    {caption && (
      <figcaption className="text-sm text-center text-gray-500 mt-2">
        {caption}
      </figcaption>
    )}
  </figure>
);

export default ImageBlock;
