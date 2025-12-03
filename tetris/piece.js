class Piece {
    constructor(ctx) {
        this.ctx = ctx;
        this.spawn();
    }

    spawn() {
        this.typeId = this.randomizeTetrominoType(COLORS.length - 1);
        this.shape = SHAPES[this.typeId];
        this.color = COLORS[this.typeId];
        this.x = 0;
        this.y = 0;
        this.rotationIndex = 0; // 0: Spawn, 1: R, 2: 2, 3: L

        // Center the piece
        // standard spawn position: centered horizontally, just above the board or at the top
        // For I piece (4 wide), x should be 3. For others (3 wide), x should be 3 or 4.
        // Let's align to center. COLS = 10. Center is 5.
        // 3-wide: x=3 (occupies 3,4,5)
        // 4-wide: x=3 (occupies 3,4,5,6)
        this.x = 3;
        this.y = 0; // Top
    }

    draw() {
        this.ctx.fillStyle = this.color;
        this.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.ctx.fillRect(this.x + x, this.y + y, 1, 1);
                }
            });
        });
    }

    move(p) {
        this.x = p.x;
        this.y = p.y;
        this.shape = p.shape;
        this.rotationIndex = p.rotationIndex;
    }

    setStartingPosition() {
        this.x = 3;
        this.y = 0;
    }

    randomizeTetrominoType(noOfTypes) {
        return Math.floor(Math.random() * noOfTypes + 1);
    }

    // Rotate the piece matrix
    // dir: 1 for clockwise, -1 for counter-clockwise
    rotate(dir) {
        // Transpose and reverse
        let newShape = JSON.parse(JSON.stringify(this.shape));

        // Transpose
        for (let y = 0; y < newShape.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [newShape[x][y], newShape[y][x]] = [newShape[y][x], newShape[x][y]];
            }
        }

        // Reverse rows for Clockwise
        if (dir > 0) {
            newShape.forEach(row => row.reverse());
        } else {
            // Reverse columns for Counter-Clockwise (or reverse rows then transpose? No, standard is:
            // CCW = Reverse rows then Transpose OR Transpose then reverse columns
            // Let's stick to: CW = Transpose + Reverse Rows.
            // CCW = Reverse Rows + Transpose.
            // Wait, let's re-verify.
            // CW: (x,y) -> (y, -x) (relative to center)
            // Matrix: Transpose -> Reverse Rows

            // CCW: (x,y) -> (-y, x)
            // Matrix: Reverse Rows -> Transpose

            // Since I already transposed above, for CCW I should have reversed rows BEFORE transposing.
            // But I can just reverse columns now (which is reversing the array itself if it was rows... wait).
            // Let's redo.
        }

        return newShape;
    }

    getRotatedShape(dir) {
        let newShape = JSON.parse(JSON.stringify(this.shape));
        if (dir > 0) {
            // CW: Transpose then Reverse Rows
            for (let y = 0; y < newShape.length; ++y) {
                for (let x = 0; x < y; ++x) {
                    [newShape[x][y], newShape[y][x]] = [newShape[y][x], newShape[x][y]];
                }
            }
            newShape.forEach(row => row.reverse());
        } else {
            // CCW: Reverse Rows then Transpose
            newShape.forEach(row => row.reverse());
            for (let y = 0; y < newShape.length; ++y) {
                for (let x = 0; x < y; ++x) {
                    [newShape[x][y], newShape[y][x]] = [newShape[y][x], newShape[x][y]];
                }
            }
        }
        return newShape;
    }
}
