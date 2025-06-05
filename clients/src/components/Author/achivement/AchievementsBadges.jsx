function AchievementsBadges({ badges }) {
  return (
    <div className="p-4 bg-background rounded-lg shadow-sm border border-border animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-4 text-foreground">Achievements & Badges</h2>
      {badges.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {badges.map((badge) => (
            <div key={badge.id} className="p-4 border rounded-lg bg-card text-card-foreground hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{badge.icon || '🏆'}</span>
                <div>
                  <h3 className="text-lg font-semibold">{badge.title}</h3>
                  <p className="text-muted-foreground text-sm">{badge.description}</p>
                  <p className="text-muted-foreground text-sm">Earned: {badge.earnedDate}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center">Koi badges nahi mile! 🏅</p>
      )}
    </div>
  );
}

export default AchievementsBadges;