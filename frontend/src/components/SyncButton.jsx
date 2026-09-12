function SyncButton({ onSync, loading }) {
  return (
    <button
      onClick={onSync}
      disabled={loading}
      className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
    >
      {loading ? 'Syncing...' : 'Sync'}
    </button>
  );
}

export default SyncButton;