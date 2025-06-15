// Global variables
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
let pencilMode = false;
let pencilMarks = Array.from({length:9},()=>Array.from({length:9},()=>[]));
let selectedHighlightNumber = null;
let selectedNumber = null;
let undoStack = [];
let redoStack = [];
let lastSelectedCell = null;
let messageTimeout = null;

// Utility functions
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
function getCluesForDifficulty(difficulty) {
  if (difficulty === 'easy') return 36;
  if (difficulty === 'medium') return 32;
  return 28; // hard
}
function removeCells(board, clues) {
  let attempts = 5;
  let puzzle = deepCopy(board);
  let cellsToRemove = 81 - clues;
  while (cellsToRemove > 0 && attempts > 0) {
    let row = Math.floor(Math.random()*9);
    let col = Math.floor(Math.random()*9);
    if (puzzle[row][col] !== 0) {
      let backup = puzzle[row][col];
      puzzle[row][col] = 0;
      let copy = deepCopy(puzzle);
      if (countSolutions(copy) !== 1) {
        puzzle[row][col] = backup;
        attempts--;
      } else {
        cellsToRemove--;
      }
    }
  }
  return puzzle;
}
function generateFullBoard() {
  const board = Array.from({length:9},()=>Array(9).fill(0));
  function fill(row, col) {
    if (row === 9) return true;
    const nextRow = col === 8 ? row + 1 : row;
    const nextCol = col === 8 ? 0 : col + 1;
    let nums = [1,2,3,4,5,6,7,8,9];
    shuffle(nums);
    for (let num of nums) {
      if (isSafe(board, row, col, num)) {
        board[row][col] = num;
        if (fill(nextRow, nextCol)) return true;
        board[row][col] = 0;
      }
    }
    return false;
  }
  fill(0,0);
  return board;
}
function generatePuzzle(difficulty) {
  let full = generateFullBoard();
  let clues = getCluesForDifficulty(difficulty);
  return removeCells(full, clues);
}
function renderNumberRow() {
  const numberRow = document.getElementById('number-row');
  numberRow.innerHTML = '';
  for (let i = 1; i <= 9; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = 'number-btn';
    if (selectedNumber == i) btn.classList.add('selected');
    btn.addEventListener('click', function() {
      if (selectedNumber == i) {
        selectedNumber = null;
      } else {
        selectedNumber = i;
      }
      renderNumberRow();
    });
    numberRow.appendChild(btn);
  }
  // Add an erase button
  const eraseBtn = document.createElement('button');
  eraseBtn.textContent = '␡';
  eraseBtn.title = 'Erase';
  eraseBtn.className = 'number-btn erase-btn';
  if (selectedNumber === 0) eraseBtn.classList.add('selected');
  eraseBtn.addEventListener('click', function() {
    if (selectedNumber === 0) {
      selectedNumber = null;
    } else {
      selectedNumber = 0;
    }
    renderNumberRow();
  });
  numberRow.appendChild(eraseBtn);
}
function renderUndoRedoRow() {
  const row = document.getElementById('undo-redo-row');
  row.innerHTML = '';
  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Undo';
  undoBtn.className = 'undo-redo-btn';
  undoBtn.disabled = undoStack.length === 0;
  undoBtn.addEventListener('click', undoAction);
  row.appendChild(undoBtn);
  const redoBtn = document.createElement('button');
  redoBtn.textContent = 'Redo';
  redoBtn.className = 'undo-redo-btn';
  redoBtn.disabled = redoStack.length === 0;
  redoBtn.addEventListener('click', redoAction);
  row.appendChild(redoBtn);
}
function pushUndoState() {
  const state = {
    board: getBoardState(),
    pencil: JSON.parse(JSON.stringify(pencilMarks))
  };
  undoStack.push(state);
  if (undoStack.length > 100) undoStack.shift();
  redoStack = [];
  renderUndoRedoRow();
}
function undoAction() {
  if (undoStack.length === 0) return;
  const state = undoStack.pop();
  const current = {
    board: getBoardState(),
    pencil: JSON.parse(JSON.stringify(pencilMarks))
  };
  redoStack.push(current);
  restoreState(state);
  renderUndoRedoRow();
}
function redoAction() {
  if (redoStack.length === 0) return;
  const state = redoStack.pop();
  const current = {
    board: getBoardState(),
    pencil: JSON.parse(JSON.stringify(pencilMarks))
  };
  undoStack.push(current);
  restoreState(state);
  renderUndoRedoRow();
}
function restoreState(state) {
  // Only update editable cells
  const cells = document.querySelectorAll('.sudoku-cell');
  cells.forEach(cell => {
    const row = +cell.dataset.row;
    const col = +cell.dataset.col;
    if (!cell.classList.contains('fixed')) {
      cell.value = state.board[row][col] ? state.board[row][col] : '';
    }
  });
  pencilMarks = JSON.parse(JSON.stringify(state.pencil));
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      updatePencilMarks(row, col);
    }
  }
  saveBoardState();
  // Trigger input event for highlights, etc.
  document.getElementById('sudoku-board').dispatchEvent(new Event('input', {bubbles:true}));
}
// Patch all user actions to pushUndoState
function patchUserActionUndo() {
  // For cell input via number row
  document.getElementById('sudoku-board').addEventListener('click', function(e) {
    if (e.target.classList.contains('sudoku-cell') && !e.target.classList.contains('fixed')) {
      pushUndoState();
    }
  }, true);
  // For clear, solve, new puzzle
  document.getElementById('clear-btn').addEventListener('click', pushUndoState, true);
  document.getElementById('solve-btn').addEventListener('click', pushUndoState, true);
  document.getElementById('new-puzzle-btn').addEventListener('click', function() {
    undoStack = [];
    redoStack = [];
    renderUndoRedoRow();
  }, true);
}
function createBoard() {
  const board = document.getElementById('sudoku-board');
  board.innerHTML = '';
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const container = document.createElement('div');
      container.className = 'sudoku-cell-container';
      container.style.gridColumn = (col + 1);
      container.style.gridRow = (row + 1);
      const input = document.createElement('input');
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = row;
      input.dataset.col = col;
      if (puzzle[row][col] !== 0) {
        input.type = 'button';
        input.value = puzzle[row][col];
        input.readOnly = true;
        input.classList.add('fixed');
      } else {
        input.type = 'button';
        input.value = '';
        input.tabIndex = 0;
      }
      const pencilDiv = document.createElement('div');
      pencilDiv.className = 'pencil-marks';
      pencilDiv.innerHTML = pencilMarks[row][col].map(n => `<span>${n}</span>`).join(' ');
      container.appendChild(input);
      container.appendChild(pencilDiv);
      board.appendChild(container);
    }
  }
}
function focusCell(row, col) {
  if (row < 0 || row > 8 || col < 0 || col > 8) return;
  const idx = row * 9 + col;
  const board = document.getElementById('sudoku-board');
  const container = board.children[idx];
  if (!container) return;
  const input = container.querySelector('.sudoku-cell');
  if (input && !input.classList.contains('fixed')) {
    input.focus();
  }
}
function onCellKeyDown(e) {
  if (!pencilMode) return;
  if (e.key >= '1' && e.key <= '9') {
    e.preventDefault();
    const row = +e.target.dataset.row;
    const col = +e.target.dataset.col;
    const num = e.key;
    let idx = pencilMarks[row][col].indexOf(num);
    if (idx === -1) {
      pencilMarks[row][col].push(num);
      pencilMarks[row][col].sort();
    } else {
      pencilMarks[row][col].splice(idx, 1);
    }
    updatePencilMarks(row, col);
    saveBoardState();
  } else if (e.key === 'Backspace' || e.key === 'Delete') {
    e.preventDefault();
    const row = +e.target.dataset.row;
    const col = +e.target.dataset.col;
    pencilMarks[row][col] = [];
    updatePencilMarks(row, col);
    saveBoardState();
  }
}
function updatePencilMarks(row, col) {
  const board = document.getElementById('sudoku-board');
  const idx = row * 9 + col;
  const container = board.children[idx];
  if (container) {
    let pencilDiv = container.querySelector('.pencil-marks');
    if (!pencilDiv) {
      pencilDiv = document.createElement('div');
      pencilDiv.className = 'pencil-marks';
      container.appendChild(pencilDiv);
    }
    pencilDiv.innerHTML = pencilMarks[row][col].map(n => `<span>${n}</span>`).join(' ');
  }
}
function onInput(e) {
  if (pencilMode) {
    e.target.value = '';
    return;
  }
  const val = e.target.value;
  if (!/^[1-9]$/.test(val)) {
    e.target.value = '';
  } else {
    // Clear pencil marks for this cell
    const row = +e.target.dataset.row;
    const col = +e.target.dataset.col;
    pencilMarks[row][col] = [];
    updatePencilMarks(row, col);
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
function saveBoardState() {
  const cells = document.querySelectorAll('.sudoku-cell');
  const state = Array.from({length: 9}, () => Array(9).fill(0));
  cells.forEach(cell => {
    const row = +cell.dataset.row;
    const col = +cell.dataset.col;
    state[row][col] = cell.value ? +cell.value : 0;
  });
  localStorage.setItem('sudoku-board-state', JSON.stringify(state));
  localStorage.setItem('sudoku-puzzle', JSON.stringify(puzzle));
  localStorage.setItem('sudoku-pencil-marks', JSON.stringify(pencilMarks));
}
function loadBoardState() {
  const savedPuzzle = localStorage.getItem('sudoku-puzzle');
  const savedState = localStorage.getItem('sudoku-board-state');
  const savedPencil = localStorage.getItem('sudoku-pencil-marks');
  if (savedPuzzle && savedState) {
    puzzle = JSON.parse(savedPuzzle);
    const state = JSON.parse(savedState);
    if (savedPencil) pencilMarks = JSON.parse(savedPencil);
    createBoard();
    // Fill user values
    const cells = document.querySelectorAll('.sudoku-cell');
    cells.forEach(cell => {
      const row = +cell.dataset.row;
      const col = +cell.dataset.col;
      if (!cell.classList.contains('fixed')) {
        cell.value = state[row][col] ? state[row][col] : '';
      }
    });
    // Update pencil marks
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        updatePencilMarks(row, col);
      }
    }
    return true;
  }
  return false;
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
function highlightSameNumbers() {
  const num = selectedHighlightNumber;
  const cells = document.querySelectorAll('.sudoku-cell');
  cells.forEach(cell => {
    if (cell.value === num && num !== '') {
      cell.classList.add('selected-number');
    } else {
      cell.classList.remove('selected-number');
    }
  });
  // Highlight only the matching number in pencil marks
  const containers = document.querySelectorAll('.sudoku-cell-container');
  containers.forEach(container => {
    const pencilDiv = container.querySelector('.pencil-marks');
    if (pencilDiv) {
      pencilDiv.querySelectorAll('span').forEach(span => {
        if (num && span.textContent === num) {
          span.classList.add('highlighted');
        } else {
          span.classList.remove('highlighted');
        }
      });
    }
  });
}
function blinkCells(num) {
  // Remove all highlighted numbers
  document.querySelectorAll('.sudoku-cell.selected-number').forEach(cell => {
    cell.classList.remove('selected-number');
  });
  document.querySelectorAll('.pencil-marks span.highlighted').forEach(span => {
    span.classList.remove('highlighted');
  });
  const cells = Array.from(document.querySelectorAll('.sudoku-cell')).filter(cell => cell.value === num);
  let blinks = 0;
  function doBlink() {
    cells.forEach(cell => cell.classList.add('blink'));
    setTimeout(() => {
      cells.forEach(cell => cell.classList.remove('blink'));
      blinks++;
      if (blinks < 3) {
        setTimeout(doBlink, 100);
      } else {
        // Re-highlight after blinking
        setTimeout(highlightSameNumbers, 350);
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
function setPuzzle(newPuzzle) {
  puzzle = newPuzzle;
  createBoard();
  document.getElementById('message').textContent = '';
  saveBoardState();
}
function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const puzzleStr = params.get('puzzle');
  const stateStr = params.get('state');
  if (puzzleStr && stateStr) {
    try {
      const puzzleDecompressed = LZString.decompressFromEncodedURIComponent(puzzleStr);
      const stateDecompressed = LZString.decompressFromEncodedURIComponent(stateStr);
      if (!puzzleDecompressed || !stateDecompressed) throw new Error('Invalid puzzle data');
      puzzle = JSON.parse(puzzleDecompressed);
      const state = JSON.parse(stateDecompressed);
      createBoard();
      // Fill user values
      const cells = document.querySelectorAll('.sudoku-cell');
      cells.forEach(cell => {
        const row = +cell.dataset.row;
        const col = +cell.dataset.col;
        if (!cell.classList.contains('fixed')) {
          cell.value = state[row][col] ? state[row][col] : '';
        }
      });
      // Remove puzzle and state params from URL
      const url = new URL(window.location);
      url.searchParams.delete('puzzle');
      url.searchParams.delete('state');
      window.history.replaceState({}, '', url.pathname + url.search);
      return true;
    } catch (e) {
      showMessage('Failed to load shared puzzle.', 'red');
    }
  }
  return false;
}
function resizeBoard() {
  const board = document.getElementById('sudoku-board');
  if (!board) return;
  const baseSize = 360;
  // Use 98vw for width, subtract a small margin (8px)
  const w = window.innerWidth * 0.90;
  const h = window.innerHeight - 180;
  const scale = Math.min(w, h) / baseSize;
  board.style.zoom = scale < 1 ? scale : 1;
}
function checkSolutionAndAnimate() {
  const board = getBoardState();
  const message = document.getElementById('message');

  if (!isComplete(board)) {
    showMessage('The puzzle is not complete.', 'orange');
    return false;
  }
  if (isValid(board)) {
    showMessage('Congratulations! You solved the puzzle!', 'green');
    // Rainbow effect
    selectedHighlightNumber = '';
    highlightSameNumbers();
    const cells = document.querySelectorAll('.sudoku-cell');
    cells.forEach(cell => cell.classList.add('rainbow'));
    setTimeout(() => {
      cells.forEach(cell => cell.classList.remove('rainbow'));
    }, 2500);
    return true;
  } else {
    showMessage('There are mistakes in your solution.', 'red');
    return false;
  }
}
function showMessage(text, color = '', duration = 8000) {
  const message = document.getElementById('message');
  message.textContent = text;
  if (color) {
    message.style.color = color;
  } else {
    message.style.color = '';
  }
  // Clear existing timeout
  if (messageTimeout) {
    clearTimeout(messageTimeout);
    messageTimeout = null;
  }
  // Hide message after 8 seconds
  if (duration > 0) {
    messageTimeout = setTimeout(() => {
      message.textContent = '';
    }, duration);
  }
}

// Event handlers and DOM event bindings
document.getElementById('sudoku-board').addEventListener('click', function(e) {
  if (e.target.classList.contains('fixed')) {
    const num = e.target.value;
    if (selectedHighlightNumber === num) {
      selectedHighlightNumber = null;
      highlightSameNumbers();
    } else {
      selectedHighlightNumber = num;
      highlightSameNumbers();
    }
    lastSelectedCell = e.target;
    // Flash if all 9 of this number are present
    const cells = document.querySelectorAll('.sudoku-cell');
    let count = 0;
    cells.forEach(cell => {
      if (cell.value === num) count++;
    });
    if (count === 9) {
      blinkCells(num);
    }
  } else if (e.target.classList.contains('sudoku-cell') && !e.target.classList.contains('fixed')) {
    // Handle cell input click logic (was cellInputClickHandler)
    const input = e.target;
    const row = +input.dataset.row;
    const col = +input.dataset.col;
    if (selectedNumber === null) return;
    if (selectedNumber === 0) {
      input.value = '';
      input.classList.remove('wrong');
      pencilMarks[row][col] = [];
      updatePencilMarks(row, col);
      saveBoardState();
      selectedNumber = null;
      renderNumberRow();
      highlightSameNumbers();
      return;
    }
    if (pencilMode) {
      let idx = pencilMarks[row][col].indexOf(String(selectedNumber));
      if (idx === -1) {
        pencilMarks[row][col].push(String(selectedNumber));
        pencilMarks[row][col].sort();
      } else {
        pencilMarks[row][col].splice(idx, 1);
      }
      updatePencilMarks(row, col);
      saveBoardState();
      selectedNumber = null;
      renderNumberRow();
      highlightSameNumbers();
    } else {
      input.value = selectedNumber;
      pencilMarks[row][col] = [];
      updatePencilMarks(row, col);
      saveBoardState();
      input.dispatchEvent(new Event('input', {bubbles:true}));
      selectedNumber = null;
      renderNumberRow();
    }
  }
});
document.getElementById('sudoku-board').addEventListener('keydown', function(e) {
  if (e.target.classList.contains('sudoku-cell') && !e.target.classList.contains('fixed')) {
    // Handle cell input keydown logic (was cellInputKeydownHandler)
    const input = e.target;
    const row = +input.dataset.row;
    const col = +input.dataset.col;
    if (e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      if (pencilMode) {
        let idx = pencilMarks[row][col].indexOf(e.key);
        if (idx === -1) {
          pencilMarks[row][col].push(e.key);
          pencilMarks[row][col].sort();
        } else {
          pencilMarks[row][col].splice(idx, 1);
        }
        updatePencilMarks(row, col);
        saveBoardState();
      } else {
        input.value = e.key;
        pencilMarks[row][col] = [];
        updatePencilMarks(row, col);
        saveBoardState();
        input.dispatchEvent(new Event('input', {bubbles:true}));
      }
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      input.value = '';
      pencilMarks[row][col] = [];
      updatePencilMarks(row, col);
      saveBoardState();
      input.dispatchEvent(new Event('input', {bubbles:true}));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusCell(row, col - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusCell(row, col + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusCell(row - 1, col);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusCell(row + 1, col);
    }
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
const sudokuBoard = document.getElementById('sudoku-board');
sudokuBoard.addEventListener('input', function(e) {
  if (document.getElementById('highlight-current-wrong').checked) {
    highlightCurrentWrongCells();
  } else if (document.getElementById('highlight-wrong').checked) {
    highlightWrongCells();
  } else {
    clearWrongHighlights();
  }

  highlightSameNumbers();

  // Blink if all 9 of the entered number are present
  if (e && e.target && /^[1-9]$/.test(e.target.value)) {
    const num = e.target.value;
    const cells = document.querySelectorAll('.sudoku-cell');
    let count = 0;
    cells.forEach(cell => {
      if (cell.value === num) count++;
    });
    if (count === 9) {
      blinkCells(num);
    }
  }
  saveBoardState();
  // Auto-check for completion and correct solution, show message
  const board = getBoardState();
  if (isComplete(board) && isValid(board)) {
    checkSolutionAndAnimate();
  }
  // If a selected cell is deleted, update selection
  if (lastSelectedCell && (!lastSelectedCell.value || lastSelectedCell.value === '')) {
    highlightSameNumbers('');
    lastSelectedCell = null;
  }
});
document.getElementById('check-btn').addEventListener('click', checkSolutionAndAnimate);
document.getElementById('solve-btn').addEventListener('click', () => {
  // Deep copy the current puzzle
  let board = puzzle.map(row => row.slice());
  if (solveSudoku(board)) {
    fillSolution(board);
    showMessage('Puzzle solved!', 'blue');
  } else {
    showMessage('No solution found.', 'red');
  }
});
document.getElementById('clear-btn').addEventListener('click', () => {
  const cells = document.querySelectorAll('.sudoku-cell');
  cells.forEach(cell => {
    if (!cell.classList.contains('fixed')) {
      cell.value = '';
      const row = +cell.dataset.row;
      const col = +cell.dataset.col;
      pencilMarks[row][col] = [];
      updatePencilMarks(row, col);
    }
  });
  showMessage('');
  saveBoardState();
});
document.getElementById('new-puzzle-btn').addEventListener('click', () => {
  const difficulty = document.getElementById('difficulty').value;
  setPuzzle(generatePuzzle(difficulty));
  pencilMarks = Array.from({length:9},()=>Array.from({length:9},()=>[]));
  saveBoardState();
});
document.getElementById('pencil-mode-btn').addEventListener('click', function() {
  pencilMode = !pencilMode;
  this.textContent = 'Pencil Mark Mode: ' + (pencilMode ? 'On' : 'Off');
});
document.getElementById('share-btn').addEventListener('click', function() {
  // Encode puzzle and current state using LZString
  const puzzleStr = LZString.compressToEncodedURIComponent(JSON.stringify(puzzle));
  const state = getBoardState();
  const stateStr = LZString.compressToEncodedURIComponent(JSON.stringify(state));
  const url = `${location.origin}${location.pathname}?puzzle=${puzzleStr}&state=${stateStr}`;
  // Copy to clipboard
  const shareMsg = document.getElementById('share-message');
  function showShareMsg(text, link) {
    if (link) {
      shareMsg.innerHTML = `${text} <a href="${link}" target="_blank" style="word-break:break-all;">${link}</a>`;
    } else {
      shareMsg.textContent = text;
    }
    shareMsg.style.display = 'inline';
    setTimeout(() => { shareMsg.style.display = 'none'; }, 8000);
  }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      showShareMsg('Link copied! Share it with a friend.');
    }, () => {
      showShareMsg('Share this link:', url);
    });
  } else {
    showShareMsg('Share this link:', url);
  }
});
window.onload = function() {
  renderNumberRow();
  renderUndoRedoRow();
  if (!loadFromUrl() && !loadBoardState()) {
    pencilMarks = Array.from({length:9},()=>Array.from({length:9},()=>[]));
    createBoard();
  }
  patchUserActionUndo();
  resizeBoard();
};
window.addEventListener('resize', resizeBoard);
