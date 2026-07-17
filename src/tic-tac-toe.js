const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],             // diagonals
];

function createBoard() {
  return ["", "", "", "", "", "", "", "", ""];
}

function isValidMove(board, index, symbol) {
  if (index < 0 || index > 8) return false;
  if (board[index] !== "") return false;

  const xCount = board.filter(c => c === "X").length;
  const oCount = board.filter(c => c === "O").length;

  if (symbol === "X" && xCount > oCount) return false;
  if (symbol === "O" && oCount >= xCount) return false;

  return true;
}

function checkWinner(board) {
  for (const [a, b, c] of WINNING_COMBOS) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }
  if (board.every(cell => cell === "X" || cell === "O")) {
    return "draw";
  }
  return null;
}

module.exports = {
  createBoard,
  isValidMove,
  checkWinner,
};
