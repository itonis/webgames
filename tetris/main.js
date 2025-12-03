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
    let p = moves[KEY.DOWN](board.piece);
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
        // T piece center is at (1,1) in its 3x3 shape.
        // We check (0,0), (2,0), (0,2), (2,2) relative to piece x,y
        // But we need to check board cells.
        // piece.x, piece.y is top-left of the 3x3 box.
        let x = board.piece.x;
        let y = board.piece.y;

        // Corners of the 3x3 bounding box
        const checkCorner = (cx, cy) => {
            if (cx < 0 || cx >= COLS || cy >= ROWS) return true; // Wall/Floor counts as filled for T-spin
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

    // Scoring
    // Standard Nintendo Scoring System
    // Level * ...
    // 1 line: 40
    // 2 lines: 100
    // 3 lines: 300
    // 4 lines: 1200
    // T-Spin: 400 * level
    // T-Spin Double: 1200 * level

    let points = 0;
    if (tSpin) {
        if (lines === 0) points = 400 * account.level; // T-Spin Mini/No lines? Standard usually 400
        else if (lines === 1) points = 800 * account.level; // T-Spin Single
        else if (lines === 2) points = 1200 * account.level; // T-Spin Double
        else if (lines === 3) points = 1600 * account.level; // T-Spin Triple
    } else {
        if (lines === 1) points = 40 * account.level;
        else if (lines === 2) points = 100 * account.level;
        else if (lines === 3) points = 300 * account.level;
        else if (lines === 4) points = 1200 * account.level;
    }

    account.score += points;
    account.lines += lines;

    // Level up every 10 lines
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
    [37]: p => ({ ...p, x: p.x - 1 }), // Left
    [39]: p => ({ ...p, x: p.x + 1 }), // Right
    [40]: p => ({ ...p, y: p.y + 1 }), // Down
    [38]: p => board.rotate(p, 1),     // Up (Rotate CW)
    [32]: p => ({ ...p, y: p.y + 1 })  // Space (Hard Drop - handled separately)
};

const KEY = {
    SPACE: 32,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    SHIFT: 16,
    P: 80
};

document.addEventListener('keydown', event => {
    if (event.keyCode === KEY.P) {
        // Pause
        if (document.getElementById('overlay').classList.contains('hidden')) {
            cancelAnimationFrame(requestId);
            document.getElementById('overlay-title').innerText = "PAUSED";
            document.getElementById('overlay-message').innerText = "Press P to Resume";
            document.getElementById('start-btn').innerText = "Resume";
            document.getElementById('overlay').classList.remove('hidden');
        } else {
            // Resume
            document.getElementById('overlay').classList.add('hidden');
            animate();
        }
        return;
    }

    if (document.getElementById('overlay').classList.contains('hidden')) {
        if (event.keyCode === KEY.SPACE) {
            // Hard Drop
            let p = board.piece;
            while (board.valid(moves[KEY.DOWN](p))) {
                p = moves[KEY.DOWN](p);
                account.score += 2; // Hard drop points
            }
            board.piece.move(p);
            freeze(); // Lock immediately
            updateAccount('score', account.score);
            lastMoveWasRotation = false;
        } else if (event.keyCode === KEY.SHIFT) {
            board.hold();
            lastMoveWasRotation = false;
        } else if (moves[event.keyCode]) {
            event.preventDefault();
            let p = moves[event.keyCode](board.piece);

            if (event.keyCode === KEY.UP) {
                // Rotation
                if (p) { // Rotate returns null if invalid
                    board.piece.move(p);
                    lastMoveWasRotation = true;
                }
            } else {
                if (board.valid(p)) {
                    board.piece.move(p);
                    if (event.keyCode === KEY.DOWN) {
                        account.score += 1; // Soft drop points
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

// Theme Toggle
const themeToggleBtn = document.getElementById('theme-toggle');
themeToggleBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
});

// Scale Slider
const scaleSlider = document.getElementById('scale-slider');
const app = document.getElementById('app');
scaleSlider.addEventListener('input', (e) => {
    const scale = e.target.value;
    app.style.transform = `scale(${scale})`;
});
