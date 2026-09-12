function Card({ card }) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3 last:border-b-0">
      <div>
        <p className="font-medium">
          {card.schoolName}
        </p>

        <p className="text-sm text-gray-500">
          {card.status}
        </p>
      </div>
    </div>
  );
}

export default Card;