class Board {
    constructor(ctx, ctxNext, ctxHold) {
        this.ctx = ctx;
        this.ctxNext = ctxNext;
        this.ctxHold = ctxHold;
        this.grid = this.getEmptyGrid();
        this.piece = null;
        this.nextPiece = null;
        this.holdPiece = null;
        this.canHold = true;
    }

    getEmptyGrid() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    reset() {
        this.grid = this.getEmptyGrid();
        this.piece = new Piece(this.ctx);
        this.piece.setStartingPosition();
        this.getNewPiece();
    }

    getNewPiece() {
        this.nextPiece = new Piece(this.ctxNext);
        this.ctxNext.clearRect(0, 0, this.ctxNext.canvas.width, this.ctxNext.canvas.height);
        // Draw next piece centered in next canvas
        // Next canvas is 120x120 (4x4 blocks of 30px)
        // We need to offset the drawing
        this.drawPreview(this.nextPiece, this.ctxNext);
    }

    spawnPiece() {
        this.piece = this.nextPiece;
        this.piece.ctx = this.ctx; // Switch context to main board
        this.piece.setStartingPosition();
        this.getNewPiece();
        this.canHold = true;

        // Game Over check
        if (!this.valid(this.piece)) {
            return false;
        }
        return true;
    }

    drawPreview(piece, ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = piece.color;

        // Center the piece
        const offsetX = (4 - piece.shape[0].length) / 2;
        const offsetY = (4 - piece.shape.length) / 2;

        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    ctx.fillRect((x + offsetX) * BLOCK_SIZE, (y + offsetY) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }

    valid(p) {
        return p.shape.every((row, dy) => {
            return row.every((value, dx) => {
                let x = p.x + dx;
                let y = p.y + dy;
                return (
                    value === 0 ||
                    (this.isInsideWalls(x) && this.isAboveFloor(y) && this.notOccupied(x, y))
                );
            });
        });
    }

    isInsideWalls(x) {
        return x >= 0 && x < COLS;
    }

    isAboveFloor(y) {
        return y <= ROWS; // Allow y=ROWS for floor check (it's below floor)
    }

    notOccupied(x, y) {
        return this.grid[y] && this.grid[y][x] === 0;
    }

    rotate(piece, dir) {
        // Clone piece
        let p = JSON.parse(JSON.stringify(piece));

        // Rotate shape
        if (!p.shape) return p; // Safety

        // We need the Piece class logic here, but we are in Board.
        // Ideally Piece handles its own rotation shape generation.
        // Let's assume we call piece.getRotatedShape(dir)

        p.shape = piece.getRotatedShape(dir);

        // SRS Wall Kicks
        // Determine current rotation state (0-3) and next state
        // 0: 0, 1: R, 2: 2, 3: L
        let current = piece.rotationIndex;
        let next = (current + dir + 4) % 4; // +4 handles negative

        let kickKey = `${current}-${next}`;
        let kicks;

        if (piece.typeId === 1) { // I piece
            kicks = I_KICKS[kickKey];
        } else if (piece.typeId === 4) { // O piece
            // O piece doesn't kick or rotate really, but let's just return rotated
            return p;
        } else {
            kicks = JLSTZ_KICKS[kickKey];
        }

        // Try kicks
        // If no kicks defined (shouldn't happen if complete), fallback to 0,0
        if (!kicks) kicks = [[0, 0]];

        for (let i = 0; i < kicks.length; i++) {
            let [dx, dy] = kicks[i];
            // Apply kick (remember dy is inverted for canvas if data is standard SRS)
            // My constants.js says: "Note: In our grid, +y is DOWN. SRS Kicks above are (x, y) where +y is UP. So we must negate the y component"

            p.x = piece.x + dx;
            p.y = piece.y - dy; // Negate y

            if (this.valid(p)) {
                p.rotationIndex = next;
                return p;
            }
        }

        return null; // Rotation failed
    }

    draw() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.ctx.fillStyle = COLORS[value];
                    this.ctx.fillRect(x, y, 1, 1);
                }
            });
        });

        if (this.piece) {
            this.drawGhost();
            this.piece.draw();
        }
    }

    drawGhost() {
        // Clone piece
        let ghost = new Piece(this.ctx);
        ghost.x = this.piece.x;
        ghost.y = this.piece.y;
        ghost.shape = this.piece.shape;
        ghost.color = this.piece.color;

        // Hard drop ghost
        while (this.valid(ghost)) {
            ghost.y++;
        }
        ghost.y--; // Step back up

        // Draw ghost
        this.ctx.globalAlpha = 0.2;
        ghost.draw();
        this.ctx.globalAlpha = 1.0;
    }

    freeze() {
        this.piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.grid[this.piece.y + y][this.piece.x + x] = value;
                }
            });
        });
    }

    clearLines() {
        let lines = 0;
        this.grid.forEach((row, y) => {
            if (row.every(value => value > 0)) {
                lines++;
                this.grid.splice(y, 1);
                this.grid.unshift(Array(COLS).fill(0));
            }
        });
        return lines;
    }

    hold() {
        if (!this.canHold) return false;

        if (!this.holdPiece) {
            this.holdPiece = this.piece;
            this.holdPiece.ctx = this.ctxHold;
            this.drawPreview(this.holdPiece, this.ctxHold);
            this.spawnPiece(); // This will get next piece
        } else {
            let temp = this.piece;
            this.piece = this.holdPiece;
            this.holdPiece = temp;

            this.holdPiece.ctx = this.ctxHold;
            this.drawPreview(this.holdPiece, this.ctxHold);

            this.piece.ctx = this.ctx;
            this.piece.setStartingPosition();
            this.piece.rotationIndex = 0;
            // Reset shape to default rotation?
            // Yes, usually hold resets rotation.
            this.piece.shape = SHAPES[this.piece.typeId];
        }

        this.canHold = false;
        return true;
    }
}
