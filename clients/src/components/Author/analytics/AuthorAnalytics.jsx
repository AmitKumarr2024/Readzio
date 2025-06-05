function AuthorAnalytics({ analytics }) {
  return (
    <div className="p-4 bg-background rounded-lg shadow-sm border border-border animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-4 text-foreground">Author Analytics</h2>
      {analytics.views || analytics.earnings || analytics.performance ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 border rounded-lg bg-card text-card-foreground">
            <h3 className="text-lg font-semibold">Total Views</h3>
            <p className="text-2xl font-bold text-primary">{analytics.views || 0}</p>
            <p className="text-muted-foreground text-sm">Across all posts</p>
          </div>
          <div className="p-4 border rounded-lg bg-card text-card-foreground">
            <h3 className="text-lg font-semibold">Earnings</h3>
            <p className="text-2xl font-bold text-primary">₹{analytics.earnings || 0}</p>
            <p className="text-muted-foreground text-sm">From subscriptions</p>
          </div>
          <div className="p-4 border rounded-lg bg-card text-card-foreground sm:col-span-2">
            <h3 className="text-lg font-semibold">Top Performing Post</h3>
            <p className="text-muted-foreground">
              {analytics.performance?.topPost ? (
                <>
                  <span className="font-semibold">{analytics.performance.topPost.title}</span> ({analytics.performance.topPost.views} views)
                </>
              ) : (
                'Koi data nahi hai'
              )}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-center">Koi analytics nahi mili! 📊</p>
      )}
    </div>
  );
}

export default AuthorAnalytics;