function AuthorDraftWorkspace({ drafts }) {
  return (
    <div className="p-4 bg-background rounded-lg shadow-sm border border-border animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-4 text-foreground">Draft Workspace</h2>
      {drafts.length > 0 ? (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div key={draft.id} className="p-4 border rounded-lg bg-card text-card-foreground hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold">{draft.title}</h3>
              <p className="text-muted-foreground">Last Edited: {draft.lastEdited}</p>
              <p className="text-muted-foreground">Status: Draft</p>
              <div className="mt-2 flex gap-2">
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  Resume Editing
                </button>
                <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center">Koi drafts nahi hai! ✍️</p>
      )}
    </div>
  );
}

export default AuthorDraftWorkspace;