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

    init() {
        this.boardElem.style.gridTemplateRows = `repeat(${this.DIM}, 1fr)`;
        this.boardElem.style.gridTemplateColumns = `repeat(${this.DIM}, 1fr)`;

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
                if (!this.boardElem) return;
                if (board.length != this.DIM * this.DIM) throw new Error(`Got board of length ${board.length}, expected ${this.DIM * this.DIM}.`);

                this.boardElem.innerHTML = "";

                for (let i = 0; i < this.DIM * this.DIM; i++) {
                    const div = document.createElement("div");
                    div.classList.add("tile");
                    div.id = "tile-" + i;

                    const p = document.createElement("span");
                    p.innerText = board[i] || "";
                    // p.innerText = i;

                    div.appendChild(p);
                    this.boardElem.appendChild(div);
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