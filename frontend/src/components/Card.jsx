function Card({ card }) {
  const statusColors = {
    'To be contacted': 'bg-yellow-100 text-yellow-800',
    'Follow up': 'bg-blue-100 text-blue-800',
    'Contact Later': 'bg-purple-100 text-purple-800',
    'Meeting Scheduled': 'bg-green-100 text-green-800',
    'Next Academic Session': 'bg-orange-100 text-orange-800',
  };

  const tagColors = {
    Hot: 'bg-red-100 text-red-800',
    Mild: 'bg-yellow-100 text-yellow-800',
    Cold: 'bg-blue-100 text-blue-800',
  };

  const statusClass =
    statusColors[card.status] || 'bg-gray-100 text-gray-700';

  const tagClass =
    tagColors[card.tag] || 'bg-gray-100 text-gray-700';

  const commentTime = card.lastCommentTime
    ? new Date(card.lastCommentTime).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div className="border-b px-5 py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <p className="font-medium text-gray-700">
          {card.schoolName}
        </p>

        <div className="flex items-center gap-2">
          {card.status && (
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${statusClass}`}
            >
              {card.status}
            </span>
          )}

          {card.label && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
              {card.label}
            </span>
          )}

          {card.tag && (
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${tagClass}`}
            >
              {card.tag}
            </span>
          )}
        </div>
      </div>

      {card.latestCommentText && (
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            {card.latestCommentText}
          </p>

          {commentTime && (
            <p className="mt-1 text-xs text-gray-400">
              Commented {commentTime}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default Card;