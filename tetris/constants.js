const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const COLORS = [
    null,
    '#00f0f0', // I - Cyan
    '#0000f0', // J - Blue
    '#f0a000', // L - Orange
    '#f0f000', // O - Yellow
    '#00f000', // S - Green
    '#a000f0', // T - Purple
    '#f00000'  // Z - Red
];

// Dark mode colors might need adjustment or we can use CSS variables if we draw with them.
// For canvas, we usually need hex strings. Let's define a palette that looks good in both or adjust dynamically.
// Actually, standard Tetris colors are quite bright.

const SHAPES = [
    [],
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]], // J
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]], // S
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]], // T
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]  // Z
];

// SRS Wall Kick Data
// https://harddrop.com/wiki/SRS
// 0: spawn, 1: R, 2: 2, 3: L
// offsets are [x, y] where +y is UP in standard math, but in canvas +y is DOWN.
// SRS usually defines +y as Up. We need to be careful.
// Standard SRS: +y is Up.
// Canvas: +y is Down.
// So if SRS says (0, 1) [Up 1], we need (0, -1).

const JLSTZ_KICKS = {
    '0-1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], // 0->R
    '1-0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],   // R->0
    '1-2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],   // R->2
    '2-1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], // 2->R
    '2-3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],    // 2->L
    '3-2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],// L->2
    '3-0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],// L->0
    '0-3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]     // 0->L
};

const I_KICKS = {
    '0-1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '1-0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '1-2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    '2-1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '2-3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '3-2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '3-0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '0-3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]]
};

// Note: In our grid, +y is DOWN.
// SRS Kicks above are (x, y) where +y is UP.
// So we must negate the y component when applying to our board coordinates.
