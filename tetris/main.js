const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const canvasNext = document.getElementById('next-canvas');
const ctxNext = canvasNext.getContext('2d');
const canvasHold = document.getElementById('hold-canvas');
const ctxHold = canvasHold.getContext('2d');

// Scale canvas context to match block size
ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
ctxNext.scale(BLOCK_SIZE, BLOCK_SIZE);
ctxHold.scale(BLOCK_SIZE, BLOCK_SIZE);

let board = new Board(ctx, ctxNext, ctxHold);
let requestId;
let time = { start: 0, elapsed: 0, level: 1000 };
let account = {
    score: 0,
    level: 1,
    lines: 0
};

let lastMoveWasRotation = false;

function play() {
    board.reset();
    resetGame();
    animate();
    document.getElementById('overlay').classList.add('hidden');

    // Fix focus issue: Blur button and focus app container
    document.getElementById('start-btn').blur();
    document.getElementById('app').focus();
}

function resetGame() {
    account.score = 0;
    account.lines = 0;
    account.level = 1;
    board.reset();
    time = { start: 0, elapsed: 0, level: 1000 };
    updateAccount('score', 0);
    updateAccount('lines', 0);
    updateAccount('level', 1);
}

function animate(now = 0) {
    time.elapsed = now - time.start;
    if (time.elapsed > time.level) {
        time.start = now;
        if (!drop()) {
            gameOver();
            return;
        }
    }
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    board.draw();
    requestId = requestAnimationFrame(animate);
}

function drop() {
    let p = moves['ArrowDown'](board.piece);
    if (board.valid(p)) {
        board.piece.move(p);
        lastMoveWasRotation = false;
        return true;
    } else {
        freeze();
        return false;
    }
}

function freeze() {
    board.freeze();

    // T-Spin Detection
    let tSpin = false;
    if (board.piece.typeId === 6 && lastMoveWasRotation) { // 6 is T
        // Check corners
        let corners = 0;
        let x = board.piece.x;
        let y = board.piece.y;

        const checkCorner = (cx, cy) => {
            if (cx < 0 || cx >= COLS || cy >= ROWS) return true;
            return board.grid[cy] && board.grid[cy][cx] !== 0;
        };

        if (checkCorner(x, y)) corners++;
        if (checkCorner(x + 2, y)) corners++;
        if (checkCorner(x, y + 2)) corners++;
        if (checkCorner(x + 2, y + 2)) corners++;

        if (corners >= 3) {
            tSpin = true;
            console.log("T-Spin!");
        }
    }

    const lines = board.clearLines();

    let points = 0;
    if (tSpin) {
        if (lines === 0) points = 400 * account.level;
        else if (lines === 1) points = 800 * account.level;
        else if (lines === 2) points = 1200 * account.level;
        else if (lines === 3) points = 1600 * account.level;
    } else {
        if (lines === 1) points = 40 * account.level;
        else if (lines === 2) points = 100 * account.level;
        else if (lines === 3) points = 300 * account.level;
        else if (lines === 4) points = 1200 * account.level;
    }

    account.score += points;
    account.lines += lines;

    const newLevel = Math.floor(account.lines / 10) + 1;
    if (newLevel > account.level) {
        account.level = newLevel;
        time.level = Math.max(100, 1000 - (account.level - 1) * 100);
    }

    updateAccount('score', account.score);
    updateAccount('lines', account.lines);
    updateAccount('level', account.level);

    if (board.spawnPiece()) {
        // Continue
    } else {
        gameOver();
    }

    lastMoveWasRotation = false;
}

function gameOver() {
    cancelAnimationFrame(requestId);
    ctx.fillStyle = 'black';
    ctx.fillRect(1, 3, 8, 1.2);
    ctx.font = '1px Arial';
    ctx.fillStyle = 'red';
    ctx.fillText('GAME OVER', 1.8, 4);

    document.getElementById('overlay-title').innerText = "GAME OVER";
    document.getElementById('overlay-message').innerText = `Score: ${account.score}`;
    document.getElementById('start-btn').innerText = "Play Again";
    document.getElementById('overlay').classList.remove('hidden');
}

function updateAccount(key, value) {
    let element = document.getElementById(key);
    if (element) {
        element.textContent = value;
    }
}

const moves = {
    'ArrowLeft': p => ({ ...p, x: p.x - 1 }),
    'ArrowRight': p => ({ ...p, x: p.x + 1 }),
    'ArrowDown': p => ({ ...p, y: p.y + 1 }),
    'ArrowUp': p => board.rotate(p, 1),
    'Space': p => ({ ...p, y: p.y + 1 })
};

const KEY_MAP = {
    'Space': 'Space',
    'ArrowLeft': 'ArrowLeft',
    'ArrowUp': 'ArrowUp',
    'ArrowRight': 'ArrowRight',
    'ArrowDown': 'ArrowDown',
    'ShiftLeft': 'Shift',
    'ShiftRight': 'Shift',
    'KeyP': 'P'
};

document.addEventListener('keydown', event => {
    // Prevent default scrolling for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
    }

    if (event.code === 'KeyP') {
        if (document.getElementById('overlay').classList.contains('hidden')) {
            cancelAnimationFrame(requestId);
            document.getElementById('overlay-title').innerText = "PAUSED";
            document.getElementById('overlay-message').innerText = "Press P to Resume";
            document.getElementById('start-btn').innerText = "Resume";
            document.getElementById('overlay').classList.remove('hidden');
        } else {
            document.getElementById('overlay').classList.add('hidden');
            animate();
        }
        return;
    }

    if (document.getElementById('overlay').classList.contains('hidden')) {
        if (event.code === 'Space') {
            // Hard Drop
            let p = board.piece;
            while (board.valid(moves['ArrowDown'](p))) {
                p = moves['ArrowDown'](p);
                account.score += 2;
            }
            board.piece.move(p);
            freeze();
            updateAccount('score', account.score);
            lastMoveWasRotation = false;
        } else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
            board.hold();
            lastMoveWasRotation = false;
        } else if (moves[event.code]) {
            let p = moves[event.code](board.piece);

            if (event.code === 'ArrowUp') {
                if (p) {
                    board.piece.move(p);
                    lastMoveWasRotation = true;
                }
            } else {
                if (board.valid(p)) {
                    board.piece.move(p);
                    if (event.code === 'ArrowDown') {
                        account.score += 1;
                        updateAccount('score', account.score);
                    }
                    lastMoveWasRotation = false;
                }
            }
        }
    }
});

document.getElementById('start-btn').addEventListener('click', () => {
    play();
});

const themeToggleBtn = document.getElementById('theme-toggle');
themeToggleBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    // Remove focus from toggle button
    themeToggleBtn.blur();
});

const scaleSlider = document.getElementById('scale-slider');
const app = document.getElementById('app');
scaleSlider.addEventListener('input', (e) => {
    const scale = e.target.value;
    app.style.transform = `scale(${scale})`;
});
