import { useState } from 'react';
import CardList from './CardList';

function MemberGroup({ name, cards }) {
  const [expanded, setExpanded] = useState(true);

  const initial = name === 'Unassigned'
    ? '?'
    : name.charAt(0).toUpperCase();

  return (
    <div className="rounded-lg bg-white shadow">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 font-semibold">
          {initial}
        </div>

        <span className="font-semibold">
          {name}
        </span>

        <span className="text-sm text-gray-500">
          {cards.length} cards
        </span>

        <span className="ml-auto">
          {expanded ? '▼' : '▶'}
        </span>
      </button>

      {expanded && <CardList cards={cards} />}
    </div>
  );
}

export default MemberGroup;