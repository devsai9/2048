const moveDirections = Object.freeze({
    UP: 0,
    RIGHT: 1,
    DOWN: 2,
    LEFT: 3,
});

const renderOutputs = Object.freeze({
    VISUAL: 0,
    STDIO: 1,
})

const game = {
    DIM: 4,
    board: [],
    boardElem: document.querySelector(".game"),
    drawingConfig: {
        PADDING: 10,
        TILE_SIZE: 105,
        TILE_GAP: 10,
    },

    init() {
        // this.boardElem.style.gridTemplateRows = `repeat(${this.DIM}, 1fr)`;
        // this.boardElem.style.gridTemplateColumns = `repeat(${this.DIM}, 1fr)`;
        const dimPx = (2 * this.drawingConfig.PADDING) + (this.DIM * this.drawingConfig.TILE_SIZE) + ((this.DIM - 1) * this.drawingConfig.TILE_GAP);
        this.boardElem.width = dimPx;
        this.boardElem.height = dimPx;

        this.apply(Array(this.DIM * this.DIM).fill(null));
    },

    spawnTile(board) {
        const newBoard = [...board];

        const chanceOf2Tile = 0.9;

        const insVal = Math.random() < chanceOf2Tile ? 2 : 4;

        const ids = [];
        for (let i = 0; i < newBoard.length; i++) {
            if (newBoard[i] == null) ids.push(i);
        }

        if (ids.length == 0) return board;

        const randIdx = parseInt(Math.random() * ids.length);

        newBoard[ids[randIdx]] = insVal;
        
        return newBoard;
    },

    // rotate 90 degrees counterclockwise
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

                // cell `colFromLeft` from bottom and `rowFromBottom` from right
                workingBoard[(this.DIM - colFromLeft) * this.DIM + (this.DIM - rowFromBottom)] = finalBoard[i];
            }

            finalBoard = workingBoard;
            workingBoard = Array(this.DIM * this.DIM).fill(null);
        }

        return finalBoard;
    },

    shift(board, dir) {
        if (isNaN(dir)) throw new Error("Unexpected shift direction.");
        dir = dir % 4;

        const newBoard = this.rotate90([...board], dir);

        for (let i = this.DIM; i < newBoard.length; i++) {
            if (newBoard[i] == null) continue;

            let iters = 0;
            while (iters <= this.DIM) {
                const checkIdx = i - ((iters + 1) * this.DIM);
                if (checkIdx < 0) break;
                if (newBoard[checkIdx] == null) iters++;
                else break;
            }

            if (iters < 1) continue;

            newBoard[i - (iters * this.DIM)] = newBoard[i];
            newBoard[i] = null;
        }

        return this.rotate90(newBoard, (4 - dir) % 4);
    },

    merge(board, dir) {
        if (isNaN(dir)) throw new Error("Unexpected merge direction.");
        dir = dir % 4;
        
        const newBoard = this.rotate90([...board], dir);

        for (let i = 0; i < newBoard.length - this.DIM; i++) {
            if (newBoard[i] == null) continue;

            if (newBoard[i] == newBoard[i + this.DIM]) {
                newBoard[i] = parseInt(newBoard[i]) * 2;
                newBoard[i + this.DIM] = null;
            }
        }

        return this.rotate90(newBoard, (4 - dir) % 4);
    },

    apply(board) {
        if (board.length != this.DIM * this.DIM) throw new Error(`Got board of length ${board.length}, expected ${this.DIM * this.DIM}`);

        this.board = board;
        this.render(this.board, renderOutputs.VISUAL);
    },

    render(board, output) {
        output = (parseInt(output) % 2) || 0;

        switch (output) {
            case renderOutputs.VISUAL:
                if (!this.boardElem || !this.boardElem.getContext) return;
                if (board.length != this.DIM * this.DIM) throw new Error(`Got board of length ${board.length}, expected ${this.DIM * this.DIM}.`);

                const ctx = this.boardElem.getContext("2d");

                // Background
                ctx.beginPath()
                ctx.roundRect(0, 0, this.boardElem.width, this.boardElem.height, 20);
                ctx.fillStyle = "#4f4f4f";
                ctx.fill()

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
                }

                for (let i = 0; i < board.length; i++) {
                    const row = Math.floor(i / this.DIM); // 0-indexed
                    const col = i % this.DIM; // 0-indexed
                    
                    ctx.beginPath()
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
            case renderOutputs.STDIO:
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

game.init();
game.apply(game.spawnTile(game.spawnTile(game.board)))

document.addEventListener("keyup", (e) => {
    let dir = null;

    switch (e.key) {
        case "ArrowUp":
            dir = moveDirections.UP;
            break;
        case "ArrowRight":
            dir = moveDirections.RIGHT;
            break;
        case "ArrowDown":
            dir = moveDirections.DOWN;
            break;
        case "ArrowLeft":
            dir = moveDirections.LEFT;
            break;
        default:
            return true;
    }

    const prelimShift = game.shift(game.board, dir);
    const merge = game.merge(prelimShift, dir);
    const postShift = game.shift(merge, dir);
    const final = game.spawnTile(postShift);

    if (game.board.every((val, i) => val == postShift[i])) game.apply(postShift);
    else game.apply(final);
});