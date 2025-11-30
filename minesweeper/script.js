const ROWS = 16;
const COLS = 30;
const MINES = 99;

let board = [];
let gameOver = false;
let minesRemaining = MINES;
let timer = 0;
let timerInterval = null;
let firstClick = true;
let isMouseDown = false;
let activeCells = []; // Cells currently being pressed

const gameBoard = document.getElementById('game-board');
const mineCounter = document.getElementById('mine-counter');
const timerDisplay = document.getElementById('timer');
const resetBtn = document.getElementById('reset-btn');
const faceIcon = resetBtn.querySelector('.face-icon');
const scaleSlider = document.getElementById('scale-slider');
const gameContainer = document.querySelector('.game-container');
const themeToggle = document.getElementById('theme-toggle');

// Theme Logic
function toggleTheme() {
    const isDark = document.body.hasAttribute('data-theme');
    if (isDark) {
        document.body.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
}

// Load Theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
}

themeToggle.addEventListener('click', toggleTheme);

// Initialize Game
function initGame() {
    clearInterval(timerInterval);
    timer = 0;
    timerDisplay.textContent = '000';
    minesRemaining = MINES;
    updateMineCounter();
    gameOver = false;
    firstClick = true;
    faceIcon.textContent = '🙂';

    // Set default scale if not set manually by user interaction yet?
    // The HTML input has value="1.2", so we should respect that on load.
    gameContainer.style.transform = `scale(${scaleSlider.value})`;

    createBoard();
}

function createBoard() {
    gameBoard.innerHTML = '';
    board = [];

    for (let r = 0; r < ROWS; r++) {
        let row = [];
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell', 'covered');
            cell.dataset.row = r;
            cell.dataset.col = c;

            // Mouse Events
            cell.addEventListener('mousedown', (e) => handleMouseDown(e, r, c));
            cell.addEventListener('mouseup', (e) => handleMouseUp(e, r, c));
            cell.addEventListener('mouseenter', (e) => handleMouseEnter(e, r, c));
            cell.addEventListener('mouseleave', (e) => handleMouseLeave(e, r, c));

            gameBoard.appendChild(cell);
            row.push({
                element: cell,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0
            });
        }
        board.push(row);
    }
}

function generateMines(safeR, safeC) {
    let minesPlaced = 0;
    while (minesPlaced < MINES) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);

        if (!board[r][c].isMine && !(Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1)) {
            board[r][c].isMine = true;
            minesPlaced++;
        }
    }

    // Calculate numbers
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!board[r][c].isMine) {
                board[r][c].neighborMines = countNeighborMines(r, c);
            }
        }
    }
}

function countNeighborMines(r, c) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const nr = r + i;
            const nc = c + j;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].isMine) {
                count++;
            }
        }
    }
    return count;
}

// Timer
function startTimer() {
    timerInterval = setInterval(() => {
        timer++;
        if (timer > 999) timer = 999;
        timerDisplay.textContent = timer.toString().padStart(3, '0');
    }, 1000);
}

// Input Handling
function handleMouseDown(e, r, c) {
    if (gameOver) return;
    isMouseDown = true;
    faceIcon.textContent = '😮';

    // Check for chord (Left + Right)
    if (e.buttons === 3 || (e.button === 0 && e.buttons === 2) || (e.button === 2 && e.buttons === 1)) {
        highlightNeighbors(r, c);
        return;
    }

    if (e.button === 0) { // Left Click
        if (!board[r][c].isRevealed && !board[r][c].isFlagged) {
            highlightCell(r, c);
        }
    } else if (e.button === 2) { // Right Click
        toggleFlag(r, c);
    } else if (e.button === 1) { // Middle Click
        highlightNeighbors(r, c);
    }
}

function handleMouseUp(e, r, c) {
    if (gameOver) return;
    isMouseDown = false;
    faceIcon.textContent = '🙂';
    clearHighlights();

    if (e.button === 1) { // Middle Click Release
        chord(r, c);
        return;
    }

    // Left+Right Click Release Logic
    if ((e.button === 0 && (e.buttons & 2)) || (e.button === 2 && (e.buttons & 1))) {
        chord(r, c);
        return;
    }

    if (e.button === 0) { // Left Click Release
        if (firstClick) {
            firstClick = false;
            generateMines(r, c);
            startTimer();
        }
        revealCell(r, c);
    }

    checkWin();
}

// Prevent context menu
gameBoard.addEventListener('contextmenu', e => e.preventDefault());

// Mouse Enter/Leave for dragging/chording visual feedback
function handleMouseEnter(e, r, c) {
    if (isMouseDown && !gameOver) {
        if (e.buttons === 3) { // Left + Right
            highlightNeighbors(r, c);
        } else if (e.buttons === 1) { // Left drag
            if (!board[r][c].isRevealed && !board[r][c].isFlagged) {
                highlightCell(r, c);
            }
        } else if (e.buttons === 4) { // Middle drag
            highlightNeighbors(r, c);
        }
    }
}

function handleMouseLeave(e, r, c) {
    clearHighlights();
}

function highlightCell(r, c) {
    const cell = board[r][c].element;
    cell.classList.add('active');
    activeCells.push(cell);
}

function highlightNeighbors(r, c) {
    highlightCell(r, c); // Highlight center too usually
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const nr = r + i;
            const nc = c + j;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                if (!board[nr][nc].isRevealed && !board[nr][nc].isFlagged) {
                    highlightCell(nr, nc);
                }
            }
        }
    }
}

function clearHighlights() {
    activeCells.forEach(cell => cell.classList.remove('active'));
    activeCells = [];
}

// Game Actions
function toggleFlag(r, c) {
    if (board[r][c].isRevealed) return;

    const cell = board[r][c];
    cell.isFlagged = !cell.isFlagged;
    cell.element.classList.toggle('flagged');
    cell.element.textContent = cell.isFlagged ? '🚩' : '';

    minesRemaining += cell.isFlagged ? -1 : 1;
    updateMineCounter();
}

function updateMineCounter() {
    mineCounter.textContent = minesRemaining.toString().padStart(3, '0'); // Allow negative
    if (minesRemaining < 0) mineCounter.textContent = minesRemaining; // Simple fix for negative
}

function revealCell(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const cell = board[r][c];

    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;
    cell.element.classList.remove('covered');
    cell.element.classList.add('revealed');

    if (cell.isMine) {
        cell.element.classList.add('mine');
        cell.element.textContent = '💣';
        triggerGameOver(false, cell); // Pass the clicked mine
        return;
    }

    if (cell.neighborMines > 0) {
        cell.element.textContent = cell.neighborMines;
        cell.element.dataset.value = cell.neighborMines;
    } else {
        // Flood fill
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                revealCell(r + i, c + j);
            }
        }
    }
}

function chord(r, c) {
    const cell = board[r][c];
    if (!cell.isRevealed) return;

    let flagCount = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const nr = r + i;
            const nc = c + j;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].isFlagged) {
                flagCount++;
            }
        }
    }

    if (flagCount === cell.neighborMines) {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const nr = r + i;
                const nc = c + j;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !board[nr][nc].isFlagged) {
                    revealCell(nr, nc);
                }
            }
        }
    }
}

function triggerGameOver(win, clickedMine) {
    gameOver = true;
    clearInterval(timerInterval);
    faceIcon.textContent = win ? '😎' : '😵';

    if (!win) {
        // Highlight clicked mine immediately
        if (clickedMine) {
            clickedMine.element.classList.add('exploded');
            clickedMine.element.style.backgroundColor = 'red'; // Force red for the killer mine
        }

        // Reveal all other mines with staggered animation
        let mines = [];
        board.forEach(row => {
            row.forEach(cell => {
                if (cell.isMine && !cell.isFlagged && cell !== clickedMine) {
                    mines.push(cell);
                } else if (!cell.isMine && cell.isFlagged) {
                    // Wrong flag
                    cell.element.classList.add('wrong-flag');
                    cell.element.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                }
            });
        });

        // Shuffle mines for random explosion order
        mines.sort(() => Math.random() - 0.5);

        mines.forEach((cell, index) => {
            setTimeout(() => {
                cell.element.classList.remove('covered');
                cell.element.classList.add('revealed', 'mine', 'exploded');
                cell.element.textContent = '💣';
            }, 50 + index * 10); // Start after 50ms, stagger by 10ms
        });
    }
}

function checkWin() {
    if (gameOver) return;

    let coveredSafeCells = 0;
    board.forEach(row => {
        row.forEach(cell => {
            if (!cell.isMine && !cell.isRevealed) {
                coveredSafeCells++;
            }
        });
    });

    if (coveredSafeCells === 0) {
        triggerGameOver(true);
        minesRemaining = 0;
        updateMineCounter();
    }
}

// Reset
resetBtn.addEventListener('click', initGame);

// UI Scale
scaleSlider.addEventListener('input', (e) => {
    gameContainer.style.transform = `scale(${e.target.value})`;
});

// Start
initGame();
