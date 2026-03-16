/**
 * Valid directions for shifting and merging tiles.
 * @readonly
 * @enum {number}
 */
const MoveDirection = Object.freeze({
    UP: 0,
    RIGHT: 1,
    DOWN: 2,
    LEFT: 3,
});

/**
 * Valid output mediums for `game.render()`.
 * @readonly
 * @enum {number}
 */
const RenderOutput = Object.freeze({
    VISUAL: 0, // canvas rendering
    STDIO: 1, // output to console
})

const game = {
    /** 
     * @typedef {(number|null)[]} Board 
     * A `game.DIM` x `game.DIM` array of numbers (ints) that should use `null` to represent empty spaces.
    */

    DIM: 4,

    /** @type {Board} */
    board: [],
    boardElem: document.querySelector(".game"),

    drawingConfig: {
        PADDING: 10,
        TILE_SIZE: 105,
        TILE_GAP: 10,
    },

    /**
     * Initalize game state and the canvas.
     */
    init() {
        // Calculate canvas dimensions based on `game.drawingConfig` (1:1 aspect ratio)
        const dimPx = (2 * this.drawingConfig.PADDING) + (this.DIM * this.drawingConfig.TILE_SIZE) + ((this.DIM - 1) * this.drawingConfig.TILE_GAP);
        this.boardElem.width = dimPx;
        this.boardElem.height = dimPx;

        this.apply(Array(this.DIM * this.DIM).fill(null));
    },

    /**
     * Randomly choose any available spot on the given board and spawn in either a 2 or a 4.
     * @param {Board} board - The {@link Board} to reference.
     * @returns {Board} A new {@link Board} with the newly created tile.
     */
    spawnTile(board) {
        // Copy board
        const newBoard = [...board];

        // 90% chance of getting a 2 tile
        // 10% chance of getting a 4 tile
        const chanceOf2Tile = 0.9;
        const insVal = Math.random() < chanceOf2Tile ? 2 : 4;

        // Find all available cells
        const ids = [];
        for (let i = 0; i < newBoard.length; i++) {
            if (newBoard[i] == null) ids.push(i);
        }

        // If no tiles are free, return the board unmodified
        if (ids.length == 0) return newBoard;

        // If at least one tile is free, insert the previously chosen value
        const randIdx = parseInt(Math.random() * ids.length);

        newBoard[ids[randIdx]] = insVal;
        
        return newBoard;
    },

    /**
     * Rotate the tiles on the given board 90 degrees counterclockwise `numRotations` times.
     * @param {Board} board - The {@link Board} to reference.
     * @param {number} numRotations - The number of 90 degree counterclockwise rotations to perform.
     * @returns {Board} A new, rotated {@link Board}.
     */
    rotate90(board, numRotations) {
        if (board.length != this.DIM * this.DIM) throw new Error(`Got board of length ${board.length}, expected ${this.DIM * this.DIM}`);

        numRotations = parseInt(numRotations) || 0;
        if (numRotations == 0) return board;

        let finalBoard = [...board];
        let workingBoard = Array(this.DIM * this.DIM).fill(null);

        for (let j = 0; j < numRotations; j++) {
            for (let i = 0; i < this.DIM * this.DIM; i++) {
                if (finalBoard[i] == null) continue;

                const rowFromBottom = this.DIM - Math.floor(i / this.DIM); // 1-indexed
                const colFromLeft = (i % this.DIM) + 1; // 1-indexed

                // Get the cell `colFromLeft` rows from the bottom and `rowFromBottom` columns from the right
                // Measurements include the row/col the cell is in
                // E.g., the cell on (row = 2, col = 2) is 3 rows "from" the bottom if game.DIM = 4
                workingBoard[(this.DIM - colFromLeft) * this.DIM + (this.DIM - rowFromBottom)] = finalBoard[i];
            }

            finalBoard = workingBoard;
            workingBoard = Array(this.DIM * this.DIM).fill(null);
        }

        return finalBoard;
    },

    /**
     * Move all tiles as far as possible in the specified `dir` on the provided `board`.
     * @param {Board} board - The {@link Board} to reference.
     * @param {MoveDirection} dir - The direction to move the board ({@link MoveDirection}).
     * @returns {Board} A new {@link Board} with all the tiles as far towards the `dir`-side edge.
     */
    shift(board, dir) {
        if (isNaN(dir)) throw new Error("Unexpected shift direction.");
        dir = dir % 4;

        // Rotate the given board until the edge of the desired direction is the top
        // E.g., if dir was MoveDirection.LEFT, rotate the board so that the left edge is now the top edge
        // Helps maintain D.R.Y. code so logic isn't duplicated for each edge
        const newBoard = this.rotate90([...board], dir);

        for (let i = this.DIM; i < newBoard.length; i++) {
            if (newBoard[i] == null) continue;

            // Find the farthest away cell in the specified direction that can be moved to
            let iters = 0;
            while (iters <= this.DIM) {
                const checkIdx = i - ((iters + 1) * this.DIM);
                if (checkIdx < 0) break;
                if (newBoard[checkIdx] == null) iters++;
                else break;
            }

            // If no such cell exists, do not attempt a move
            if (iters < 1) continue;

            newBoard[i - (iters * this.DIM)] = newBoard[i];
            newBoard[i] = null;
        }

        // Rotate the board back to the direction it was originally facing
        return this.rotate90(newBoard, (4 - dir) % 4);
    },

    /**
     * Perform all possible merges in the specified `dir` on the provided `board`.
     * @param {Board} board - The {@link Board} to reference.
     * @param {MoveDirection} dir - The direction to merge in ({@link MoveDirection}).
     * @returns A new {@link Board} with all possible tiles merged in the specified `dir`.
     */
    merge(board, dir) {
        if (isNaN(dir)) throw new Error("Unexpected merge direction.");
        dir = dir % 4;
        
        // Rotate the given board until the edge of the desired direction is the top
        // E.g., if dir was MoveDirection.LEFT, rotate the board so that the left edge is now the top edge
        // Helps maintain D.R.Y. code so logic isn't duplicated for each edge
        const newBoard = this.rotate90([...board], dir);

        for (let i = 0; i < newBoard.length - this.DIM; i++) {
            if (newBoard[i] == null) continue;

            // Merge upwards if the cell below the current cell has the same value
            if (newBoard[i] == newBoard[i + this.DIM]) {
                newBoard[i] = parseInt(newBoard[i]) * 2;
                newBoard[i + this.DIM] = null;
            }
        }

        // Rotate the board back to the direction it was originally facing
        return this.rotate90(newBoard, (4 - dir) % 4);
    },

    /**
     * Takes a {@link Board}, saves it to `game.board`, and renders it to the canvas ({@link RenderOutput.VISUAL}).
     * @param {Board} board - The {@link Board} to reference.
     */
    apply(board) {
        // Prevent saving a malformed board
        if (board.length != this.DIM * this.DIM) throw new Error(`Got board of length ${board.length}, expected ${this.DIM * this.DIM}`);

        this.board = board;
        this.render(this.board, RenderOutput.VISUAL);
    },

    /**
     * Render the given {@link Board} to the provided {@link RenderOutput | medium}.
     * @param {Board} board - The {@link Board} to reference.
     * @param {RenderOutput} outputMedium - Where to output the rendered board ({@link RenderOutput}).
     */
    render(board, outputMedium) {
        // Assume RenderOutput.VISUAL if the provided medium is invalid
        outputMedium = (parseInt(outputMedium) % 2) || 0;

        switch (outputMedium) {
            case RenderOutput.VISUAL:
                if (!this.boardElem || !this.boardElem.getContext) return;
                if (board.length != this.DIM * this.DIM) throw new Error(`Got board of length ${board.length}, expected ${this.DIM * this.DIM}.`);

                const ctx = this.boardElem.getContext("2d");

                // Background
                ctx.beginPath();
                ctx.roundRect(0, 0, this.boardElem.width, this.boardElem.height, 20);
                ctx.fillStyle = "#4f4f4f";
                ctx.fill();

                // Draw tiles
                const tileNumToColor = {
                    null: "hsl(0, 0%, 25%)",
                    2: "hsl(0, 50%, 40%)",
                    4: "hsl(20, 50%, 40%)",
                    8: "hsl(40, 50%, 40%)",
                    16: "hsl(60, 50%, 40%)",
                    32: "hsl(80, 50%, 40%)",
                    64: "hsl(100, 50%, 40%)",
                    128: "hsl(120, 50%, 40%)",
                    256: "hsl(140, 50%, 40%)",
                    512: "hsl(160, 50%, 40%)",
                    1024: "hsl(180, 50%, 40%)",
                    2048: "hsl(200, 50%, 40%)",
                };

                for (let i = 0; i < board.length; i++) {
                    const row = Math.floor(i / this.DIM); // 0-indexed
                    const col = i % this.DIM; // 0-indexed
                    
                    ctx.beginPath();
                    ctx.fillStyle = tileNumToColor[board[i]];
                    ctx.roundRect(
                        this.drawingConfig.PADDING + col * (this.drawingConfig.TILE_GAP + this.drawingConfig.TILE_SIZE), 
                        this.drawingConfig.PADDING + row * (this.drawingConfig.TILE_GAP + this.drawingConfig.TILE_SIZE), 
                        this.drawingConfig.TILE_SIZE, this.drawingConfig.TILE_SIZE,
                        15
                    );
                    ctx.fill();
                }

                // Draw text
                ctx.beginPath();
                ctx.font = "bold 30px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                for (let i = 0; i < board.length; i++) {
                    if (board[i] == null) continue;
                    
                    const row = Math.floor(i / this.DIM); // 0-indexed
                    const col = i % this.DIM; // 0-indexed

                    ctx.fillStyle = "#ffffff";
                    ctx.fillText(
                        board[i] || "",
                        this.drawingConfig.PADDING + col * (this.drawingConfig.TILE_GAP + this.drawingConfig.TILE_SIZE) + (this.drawingConfig.TILE_SIZE / 2),
                        this.drawingConfig.PADDING + row * (this.drawingConfig.TILE_GAP + this.drawingConfig.TILE_SIZE) + (this.drawingConfig.TILE_SIZE / 2)
                    );
                }

                break;
            case RenderOutput.STDIO:
                // Generate a string of the board and console.log() it
                let output = "";
                for (let i = 0; i < this.DIM * this.DIM; i++) {
                    output += board[i] || "☐";
                    output += ((i + 1) % this.DIM == 0) ? "\n" : " ";
                }
                
                console.log(output);
                break;
        }
    },
};

// ENTRY POINT
game.init();

// Spawn in two tiles to start off with
game.apply(game.spawnTile(game.spawnTile(game.board)))

// Handle arrow key presses
document.addEventListener("keyup", (e) => {
    let dir = null;

    switch (e.key) {
        case "ArrowUp":
            dir = MoveDirection.UP;
            break;
        case "ArrowRight":
            dir = MoveDirection.RIGHT;
            break;
        case "ArrowDown":
            dir = MoveDirection.DOWN;
            break;
        case "ArrowLeft":
            dir = MoveDirection.LEFT;
            break;
        default:
            return true;
    }

    const prelimShift = game.shift(game.board, dir);
    const merge = game.merge(prelimShift, dir);
    const postShift = game.shift(merge, dir);
    const final = game.spawnTile(postShift);

    // Do not spawn in a new tile if the board did not change
    if (game.board.every((val, i) => val == postShift[i])) game.apply(postShift);
    else game.apply(final);
});