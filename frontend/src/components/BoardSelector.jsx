function BoardSelector({ boards, boardId, setBoardId }) {
  return (
    <select
      value={boardId}
      onChange={(event) => setBoardId(event.target.value)}
      className="rounded border bg-white px-3 py-2"
    >
      {boards.map((board) => (
        <option key={board.id} value={board.id}>
          {board.name}
        </option>
      ))}
    </select>
  );
}

export default BoardSelector;