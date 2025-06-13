let puzzle = [
  [5,3,0,0,7,0,0,0,0],
  [6,0,0,1,9,5,0,0,0],
  [0,9,8,0,0,0,0,6,0],
  [8,0,0,0,6,0,0,0,3],
  [4,0,0,8,0,3,0,0,1],
  [7,0,0,0,2,0,0,0,6],
  [0,6,0,0,0,0,2,8,0],
  [0,0,0,4,1,9,0,0,5],
  [0,0,0,0,8,0,0,7,9]
];

function deepCopy(board) {
  return board.map(row => row.slice());
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function isSafe(board, row, col, num) {
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num || board[x][col] === num) return false;
  }
  const startRow = row - row % 3, startCol = col - col % 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i + startRow][j + startCol] === num) return false;
    }
  }
  return true;
}

function solveSudoku(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isSafe(board, row, col, num)) {
            board[row][col] = num;
            if (solveSudoku(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions(board) {
  let count = 0;
  function helper(bd) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (bd[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isSafe(bd, row, col, num)) {
              bd[row][col] = num;
              helper(bd);
              bd[row][col] = 0;
            }
          }
          return;
        }
      }
    }
    count++;
  }
  helper(deepCopy(board));
  return count;
}

function createBoard() {
  const board = document.getElementById('sudoku-board');
  board.innerHTML = '';
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = row;
      input.dataset.col = col;
      if (puzzle[row][col] !== 0) {
        input.value = puzzle[row][col];
        input.readOnly = true;
        input.classList.add('fixed');
      } else {
        input.addEventListener('input', onInput);
      }
      board.appendChild(input);
    }
  }
}

function onInput(e) {
  const val = e.target.value;
  if (!/^[1-9]$/.test(val)) {
    e.target.value = '';
  }
}

function getBoardState() {
  const cells = document.querySelectorAll('.sudoku-cell');
  const state = Array.from({length: 9}, () => Array(9).fill(0));
  cells.forEach(cell => {
    const row = +cell.dataset.row;
    const col = +cell.dataset.col;
    state[row][col] = cell.value ? +cell.value : 0;
  });
  return state;
}

function isValid(board) {
  // Check rows, columns, and 3x3 boxes
  for (let i = 0; i < 9; i++) {
    const row = new Set();
    const col = new Set();
    for (let j = 0; j < 9; j++) {
      // Row
      if (board[i][j]) {
        if (row.has(board[i][j])) return false;
        row.add(board[i][j]);
      }
      // Column
      if (board[j][i]) {
        if (col.has(board[j][i])) return false;
        col.add(board[j][i]);
      }
    }
  }
  // 3x3 boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const box = new Set();
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const val = board[boxRow*3 + i][boxCol*3 + j];
          if (val) {
            if (box.has(val)) return false;
            box.add(val);
          }
        }
      }
    }
  }
  return true;
}

function isComplete(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) return false;
    }
  }
  return true;
}

function fillSolution(solution) {
  const cells = document.querySelectorAll('.sudoku-cell');
  cells.forEach(cell => {
    const row = +cell.dataset.row;
    const col = +cell.dataset.col;
    cell.value = solution[row][col];
  });
}

function highlightWrongCells() {
  const cells = document.querySelectorAll('.sudoku-cell');
  let board = getBoardState();
  // Solve the puzzle to get the solution
  let solution = puzzle.map(row => row.slice());
  if (!solveSudoku(solution)) return;
  cells.forEach(cell => {
    if (!cell.classList.contains('fixed')) {
      const row = +cell.dataset.row;
      const col = +cell.dataset.col;
      if (cell.value && +cell.value !== solution[row][col]) {
        cell.classList.add('wrong');
      } else {
        cell.classList.remove('wrong');
      }
    }
  });
}

function clearWrongHighlights() {
  document.querySelectorAll('.sudoku-cell.wrong').forEach(cell => {
    cell.classList.remove('wrong');
  });
}

function highlightSameNumbers(num) {
  const cells = document.querySelectorAll('.sudoku-cell');
  let count = 0;
  cells.forEach(cell => {
    if (cell.value === num && num !== '') {
      cell.classList.add('selected-number');
      count++;
    } else {
      cell.classList.remove('selected-number');
    }
  });
  // If all 9 numbers are present, blink them 3 times
  if (count === 9) {
    blinkCells(num);
  }
}

function blinkCells(num) {
  const cells = Array.from(document.querySelectorAll('.sudoku-cell')).filter(cell => cell.value === num);
  let blinks = 0;
  function doBlink() {
    cells.forEach(cell => cell.classList.add('blink'));
    setTimeout(() => {
      cells.forEach(cell => cell.classList.remove('blink'));
      blinks++;
      if (blinks < 3) {
        setTimeout(doBlink, 100);
      }
    }, 150);
  }
  doBlink();
}

function highlightCurrentWrongCells() {
  const cells = document.querySelectorAll('.sudoku-cell');
  let board = getBoardState();
  cells.forEach(cell => {
    if (!cell.classList.contains('fixed')) {
      const row = +cell.dataset.row;
      const col = +cell.dataset.col;
      const val = cell.value;
      if (!val) {
        cell.classList.remove('wrong');
        cell.removeAttribute('title');
        return;
      }
      let conflict = false;
      let reason = '';
      // Check row
      for (let i = 0; i < 9; i++) {
        if (i !== col && board[row][i] == val) {
          conflict = true;
          reason = 'Conflicts with another cell in the same row.';
        }
      }
      // Check column
      for (let i = 0; i < 9; i++) {
        if (i !== row && board[i][col] == val) {
          conflict = true;
          reason = 'Conflicts with another cell in the same column.';
        }
      }
      // Check 3x3 block
      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const r = boxRow + i;
          const c = boxCol + j;
          if ((r !== row || c !== col) && board[r][c] == val) {
            conflict = true;
            reason = 'Conflicts with another cell in the same 3x3 box.';
          }
        }
      }
      if (conflict) {
        cell.classList.add('wrong');
        cell.title = reason;
      } else {
        cell.classList.remove('wrong');
        cell.removeAttribute('title');
      }
    }
  });
}

let lastSelectedCell = null;
document.getElementById('sudoku-board').addEventListener('click', function(e) {
  if (e.target.classList.contains('fixed')) {
    const num = e.target.value;
    if (lastSelectedCell === e.target) {
      // Unselect if clicking the same cell again
      highlightSameNumbers('');
      lastSelectedCell = null;
    } else {
      highlightSameNumbers(num);
      lastSelectedCell = e.target;
    }
  } else {
    highlightSameNumbers('');
    lastSelectedCell = null;
  }
});

document.getElementById('highlight-wrong').addEventListener('change', function() {
  if (this.checked) {
    highlightWrongCells();
  } else {
    clearWrongHighlights();
  }
});

document.getElementById('highlight-current-wrong').addEventListener('change', function() {
  if (this.checked) {
    highlightCurrentWrongCells();
  } else {
    clearWrongHighlights();
  }
});

document.getElementById('sudoku-board').addEventListener('input', function() {
  if (document.getElementById('highlight-current-wrong').checked) {
    highlightCurrentWrongCells();
  } else if (document.getElementById('highlight-wrong').checked) {
    highlightWrongCells();
  } else {
    clearWrongHighlights();
  }
});

document.getElementById('check-btn').addEventListener('click', () => {
  const board = getBoardState();
  const message = document.getElementById('message');
  if (!isComplete(board)) {
    message.textContent = 'The puzzle is not complete.';
    message.style.color = 'orange';
    return;
  }
  if (isValid(board)) {
    message.textContent = 'Congratulations! You solved the puzzle!';
    message.style.color = 'green';
  } else {
    message.textContent = 'There are mistakes in your solution.';
    message.style.color = 'red';
  }
});

document.getElementById('solve-btn').addEventListener('click', () => {
  // Deep copy the current puzzle
  let board = puzzle.map(row => row.slice());
  if (solveSudoku(board)) {
    fillSolution(board);
    document.getElementById('message').textContent = 'Puzzle solved!';
    document.getElementById('message').style.color = 'blue';
  } else {
    document.getElementById('message').textContent = 'No solution found.';
    document.getElementById('message').style.color = 'red';
  }
});

document.getElementById('clear-btn').addEventListener('click', () => {
  const cells = document.querySelectorAll('.sudoku-cell');
  cells.forEach(cell => {
    if (!cell.classList.contains('fixed')) {
      cell.value = '';
    }
  });
  document.getElementById('message').textContent = '';
});

window.onload = createBoard;
