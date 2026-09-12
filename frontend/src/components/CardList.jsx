import Card from './card';

function CardList({ cards }) {
  return (
    <div className="border-t">
      {cards.map((card) => (
        <Card
          key={card.id}
          card={card}
        />
      ))}
    </div>
  );
}

export default CardList;