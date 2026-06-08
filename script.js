const ROWS = 7;
const COLS = 7;

let maze = [];
let visited = [];
let prev = [];
let table = null;
let messageBox = null;
let stepCount = 1;
let exploring = false;

function initArrays() {
    maze = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    prev = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    stepCount = 1;
}

function createMaze() {
    // Resolve elements here to avoid null when script loads before DOM is ready
    table = document.getElementById("maze");
    messageBox = document.getElementById("message");

    // Clear
    table.innerHTML = "";
    initArrays();

    for (let i = 0; i < ROWS; i++) {
        const tr = document.createElement("tr");
        for (let j = 0; j < COLS; j++) {
            const td = document.createElement("td");
            td.dataset.row = i;
            td.dataset.col = j;
            td.onclick = () => toggleWall(i, j);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    setStartGoal();
    messageBox.textContent = "";
}

function toggleWall(i, j) {
    // Guard start (0,0) and goal (ROWS-1,COLS-1)
    if ((i === 0 && j === 0) || (i === ROWS - 1 && j === COLS - 1)) return;
    const cell = table.rows[i].cells[j];
    if (cell.classList.contains("wall")) {
        cell.classList.remove("wall");
        maze[i][j] = 0;
    } else {
        cell.classList.add("wall");
        maze[i][j] = 1;
    }
}

function setStartGoal() {
    table.rows[0].cells[0].classList.add("start");
    table.rows[ROWS - 1].cells[COLS - 1].classList.add("goal");
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function dfs(x, y) {
    if (x < 0 || x >= ROWS || y < 0 || y >= COLS) return false;
    if (maze[x][y] === 1 || visited[x][y]) return false;

    visited[x][y] = true;
    const cell = table.rows[x].cells[y];
    if (!cell.classList.contains("start") && !cell.classList.contains("goal")) {
        cell.classList.add("visited");
        cell.textContent = stepCount++;
        await sleep(300);  // slower animation
    }

    if (x === ROWS - 1 && y === COLS - 1) return true;

    const directions = [[1,0], [-1,0], [0,1], [0,-1]];
    for (const [dx, dy] of directions) {
        if (await dfs(x + dx, y + dy)) {
            if (!cell.classList.contains("start") && !cell.classList.contains("goal")) {
                cell.classList.remove("visited");
                cell.classList.add("path");
                cell.style.color = "white";
            }
            return true;
        }
    }
    return false;
}

async function bfs(sx, sy) {
    const q = [];
    q.push([sx, sy]);
    visited[sx][sy] = true;

    while (q.length > 0) {
        const [x, y] = q.shift();
        const cell = table.rows[x].cells[y];

        if (!cell.classList.contains("start") && !cell.classList.contains("goal")) {
            cell.classList.add("visited");
            cell.textContent = stepCount++;
            await sleep(300);
        }

        if (x === ROWS - 1 && y === COLS - 1) {
            return true;
        }

        const directions = [[1,0], [-1,0], [0,1], [0,-1]];
        for (const [dx, dy] of directions) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < ROWS && ny >= 0 && ny < COLS && !visited[nx][ny] && maze[nx][ny] === 0) {
                visited[nx][ny] = true;
                prev[nx][ny] = [x, y];
                q.push([nx, ny]);
            }
        }
    }
    return false;
}

function highlightPathFromPrev() {
    let x = ROWS - 1, y = COLS - 1;
    while (prev[x][y] !== null) {
        const [px, py] = prev[x][y];
        const cell = table.rows[px].cells[py];
        if (!cell.classList.contains("start")) {
            cell.classList.remove("visited");
            cell.classList.add("path");
            cell.style.color = "white";
        }
        x = px; y = py;
    }
}

function clearStateKeepWalls() {
    // Keep walls; clear visited/path/labels
    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            const cell = table.rows[i].cells[j];
            if (!cell.classList.contains("wall") &&
                !cell.classList.contains("start") &&
                !cell.classList.contains("goal")) {
                cell.classList.remove("visited", "path");
                cell.textContent = "";
                cell.style.color = "";
            } else if (cell.classList.contains("path")) {
                cell.classList.remove("path");
            } else if (cell.classList.contains("visited")) {
                cell.classList.remove("visited");
            }
        }
    }
    visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    prev = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    stepCount = 1;
    messageBox.textContent = "";
}

async function startSearch() {
    if (exploring) return; // prevent double-run
    exploring = true;
    clearStateKeepWalls();

    const algorithm = document.querySelector('input[name="algo"]:checked').value;
    let result = false;
    if (algorithm === "DFS") {
        result = await dfs(0, 0);
    } else {
        result = await bfs(0, 0);
        if (result) {
            highlightPathFromPrev();
        }
    }
    if (result) {
        messageBox.textContent = "🎉 ゴールに到達しました！";
    } else {
        messageBox.textContent = "😢 ゴールに到達できませんでした。";
    }
    exploring = false;
}

function resetMaze() {
    createMaze();
}

// Ensure DOM ready
window.addEventListener("DOMContentLoaded", createMaze);
