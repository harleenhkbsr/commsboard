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

  const groupedCards = members.map((member) => ({
    ...member,
    cards: cards.filter(
      (card) => card.assignedMemberId === member.assignedMemberId
    )
  }));

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