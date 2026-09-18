import { useEffect, useState } from 'react';

import BoardSelector from './components/BoardSelector';
import MemberGroup from './components/MemberGroup';
import SyncButton from './components/SyncButton';

function App() {
  const [boards, setBoards] = useState([]);
  const [boardId, setBoardId] = useState('');
  const [cards, setCards] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBoards = async () => {
    const response = await fetch('/api/boards');
    const data = await response.json();

    setBoards(data);

    if (data.length > 0 && !boardId) {
      setBoardId(data[0].id);
    }
  };

  const fetchCards = async () => {
    if (!boardId) return;

    const response = await fetch(`/api/boards/${boardId}/cards`);
    const data = await response.json();

    setCards(data);
  };

  const fetchMembers = async () => {
    if (!boardId) return;

    const response = await fetch(`/api/boards/${boardId}/members`);
    const data = await response.json();

    setMembers(data);
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    if (boardId) {
      fetchCards();
      fetchMembers();
    }
  }, [boardId]);

  const handleSync = async () => {
    if (!boardId) return;

    setLoading(true);

    try {
      await fetch(`/api/boards/${boardId}/sync`, {
        method: 'POST'
      });

      await fetchCards();
      await fetchMembers();
    } finally {
      setLoading(false);
    }
  };

  // Group cards by member and find each member's
  // most recent activity (edit OR comment)
  const groupedCards = members
    .map((member) => {
      const memberCards = cards.filter(
        (card) =>
          card.assignedMemberId === member.assignedMemberId
      );

      const mostRecentEdit = memberCards.reduce(
        (latest, card) => {
          // Get both possible activity times
          const cardActivityTimes = [
            card.lastEditedTime,
            card.lastCommentTime
          ].filter(Boolean);

          // No activity for this card
          if (cardActivityTimes.length === 0) {
            return latest;
          }

          // Find the most recent activity for this card
          const cardMostRecentActivity =
            cardActivityTimes.reduce(
              (latestTime, time) => {
                if (!latestTime || time > latestTime) {
                  return time;
                }

                return latestTime;
              },
              null
            );

          // Compare this card's activity against
          // the member's current most recent activity
          if (
            !latest ||
            cardMostRecentActivity > latest
          ) {
            return cardMostRecentActivity;
          }

          return latest;
        },
        null
      );

      return {
        ...member,
        cards: memberCards,
        mostRecentEdit
      };
    })
    .sort((a, b) => {
      // Members with no activity go to the bottom
      if (!a.mostRecentEdit) return 1;
      if (!b.mostRecentEdit) return -1;

      // Most recently active member comes first
      return b.mostRecentEdit.localeCompare(
        a.mostRecentEdit
      );
    });

  // Keep unassigned cards separate
  const unassignedCards = cards.filter(
    (card) => card.assignedMemberId === null
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <BoardSelector
            boards={boards}
            boardId={boardId}
            setBoardId={setBoardId}
          />

          <SyncButton
            onSync={handleSync}
            loading={loading}
          />
        </div>

        <div className="space-y-4">
          {groupedCards.map((member) => (
            <MemberGroup
              key={member.assignedMemberId}
              name={member.assignedMemberName}
              cards={member.cards}
            />
          ))}

          {unassignedCards.length > 0 && (
            <MemberGroup
              name="Unassigned"
              cards={unassignedCards}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;