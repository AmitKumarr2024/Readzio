import React from "react";

function AboutAuthor({ author }) {
  if (!author || !author.name) {
    return (
      <div className="p-4 bg-background rounded-lg shadow-sm border border-border animate-in fade-in duration-500">
        <p className="text-muted-foreground text-center">Author details nahi mile! 😕</p>
      </div>
    );
  }

  const formattedJoiningDate = new Date(author.joiningDate).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-4 bg-background rounded-lg shadow-sm border border-border animate-in fade-in duration-500">
      {author.banner && (
        <img
          src={author.banner}
          alt={`${author.name} banner`}
          className="w-full h-36 object-cover rounded-md mb-4"
        />
      )}

      <div className="flex items-center gap-4 mb-4">
        {author.avatar && (
          <img
            src={author.avatar}
            alt={author.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-primary"
          />
        )}
        <div>
          <h2 className="text-3xl font-bold text-foreground">{author.name}</h2>
          <p className="text-sm text-muted-foreground">{author.profession || "No profession info"}</p>
        </div>
      </div>

      <p className="text-muted-foreground mb-4">{author.bio || "No bio available."}</p>

      <p className="text-muted-foreground mb-1">
        <strong>Location:</strong> {author.location || "Unknown"}
      </p>
      <p className="text-muted-foreground mb-4">
        <strong>Gender:</strong> {author.gender || "Not specified"}
      </p>

      <p className="text-muted-foreground mb-4">
        <strong>Email:</strong>{" "}
        <a href={`mailto:${author.email}`} className="text-primary hover:underline">
          {author.email}
        </a>
      </p>

      <p className="text-muted-foreground mb-4">
        <strong>Joined on:</strong> {formattedJoiningDate}
      </p>

      <p className="text-muted-foreground mb-4">
        <strong>Followers:</strong> {author.followers?.length || 0} &nbsp;|&nbsp;{" "}
        <strong>Following:</strong> {author.following?.length || 0}
      </p>
    </div>
  );
}

export default AboutAuthor;
