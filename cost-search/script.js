const ROWS = 7;
const COLS = 7;

const NORMAL = 1;   // 通常マス：移動コスト1
const WALL = -1;    // 壁：通行不可
const HIGH = 5;     // 高コストマス：移動コスト5

const START_R = 0;
const START_C = 0;
const GOAL_R = ROWS - 1;
const GOAL_C = COLS - 1;

const DIRECTIONS = [
    [-1, 0],  // 上
    [1, 0],   // 下
    [0, -1],  // 左
    [0, 1]    // 右
];

let maze = [];
let table = null;
let messageBox = null;
let resultBox = null;
let historyBox = null;
let exploring = false;
let resultHistory = [];

function initMazeArray() {
    maze = Array.from({ length: ROWS }, () => Array(COLS).fill(NORMAL));
}

function createMaze() {
    table = document.getElementById("maze");
    messageBox = document.getElementById("message");
    resultBox = document.getElementById("result");
    historyBox = document.getElementById("history");

    table.innerHTML = "";
    initMazeArray();

    for (let r = 0; r < ROWS; r++) {
        const tr = document.createElement("tr");
        for (let c = 0; c < COLS; c++) {
            const td = document.createElement("td");
            td.dataset.row = r;
            td.dataset.col = c;
            td.onclick = () => editCell(r, c);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }

    clearSearchResult();
    drawMaze();
    messageBox.textContent = "";
}

function getEditMode() {
    return document.querySelector('input[name="editMode"]:checked').value;
}

function getAlgorithm() {
    return document.querySelector('input[name="algo"]:checked').value;
}

function editCell(r, c) {
    if (exploring) return;
    if (isStart(r, c) || isGoal(r, c)) return;

    const mode = getEditMode();

    if (mode === "normal") {
        maze[r][c] = NORMAL;
    } else if (mode === "wall") {
        maze[r][c] = WALL;
    } else if (mode === "high") {
        maze[r][c] = HIGH;
    }

    clearSearchResult();
    drawMaze();
}

function isStart(r, c) {
    return r === START_R && c === START_C;
}

function isGoal(r, c) {
    return r === GOAL_R && c === GOAL_C;
}

function inBounds(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getCellCost(r, c) {
    return maze[r][c];
}

function heuristic(r, c) {
    return Math.abs(r - GOAL_R) + Math.abs(c - GOAL_C);
}

function create2DArray(initialValue) {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(initialValue));
}

function drawMaze() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = table.rows[r].cells[c];
            cell.className = "";
            cell.textContent = "";

            if (maze[r][c] === WALL) {
                cell.classList.add("wall");
            } else if (maze[r][c] === HIGH) {
                cell.classList.add("high");
                cell.textContent = "5";
            }

            if (isStart(r, c)) {
                cell.className = "";
                cell.classList.add("start");
                cell.textContent = "S";
            }

            if (isGoal(r, c)) {
                cell.className = "";
                cell.classList.add("goal");
                cell.textContent = "G";
            }
        }
    }
}

function clearSearchResult() {
    if (!table) return;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = table.rows[r].cells[c];
            cell.classList.remove("visited", "path");

            if (!isStart(r, c) && !isGoal(r, c)) {
                if (maze[r][c] === NORMAL) {
                    cell.textContent = "";
                } else if (maze[r][c] === HIGH) {
                    cell.textContent = "5";
                } else if (maze[r][c] === WALL) {
                    cell.textContent = "";
                }
            }
        }
    }

    if (messageBox) messageBox.textContent = "";
    if (resultBox) resultBox.innerHTML = "";
}

function resetMaze() {
    if (exploring) return;
    resultHistory = [];
    renderHistory();
    createMaze();
}

function clearHistory() {
    resultHistory = [];
    renderHistory();
}

function markVisited(r, c, stepNumber) {
    if (isStart(r, c) || isGoal(r, c)) return;

    const cell = table.rows[r].cells[c];
    cell.classList.remove("path");

    if (maze[r][c] !== WALL) {
        cell.classList.add("visited");
        cell.textContent = stepNumber;
    }
}

function drawPath(path) {
    for (const [r, c] of path) {
        if (isStart(r, c) || isGoal(r, c)) continue;

        const cell = table.rows[r].cells[c];
        cell.classList.remove("visited");
        cell.classList.add("path");

        if (maze[r][c] === HIGH) {
            cell.textContent = "5";
        }
    }
}

function reconstructPath(parent) {
    const path = [];
    let r = GOAL_R;
    let c = GOAL_C;

    if (parent[r][c] === null && !(isStart(r, c))) {
        return [];
    }

    while (!isStart(r, c)) {
        path.push([r, c]);
        const p = parent[r][c];
        if (p === null) return [];
        r = p[0];
        c = p[1];
    }

    path.push([START_R, START_C]);
    path.reverse();
    return path;
}

function calculatePathCost(path) {
    let total = 0;

    // スタート地点のコストは0として扱う
    for (let i = 1; i < path.length; i++) {
        const [r, c] = path[i];
        total += getCellCost(r, c);
    }

    return total;
}

function uniformCostSearch() {
    const openList = [];
    const closed = create2DArray(false);
    const dist = create2DArray(Infinity);
    const parent = create2DArray(null);
    const searchOrder = [];

    dist[START_R][START_C] = 0;
    openList.push({ r: START_R, c: START_C, cost: 0 });

    while (openList.length > 0) {
        openList.sort((a, b) => a.cost - b.cost);
        const current = openList.shift();
        const r = current.r;
        const c = current.c;

        if (closed[r][c]) continue;

        closed[r][c] = true;
        searchOrder.push([r, c]);

        if (isGoal(r, c)) break;

        for (const [dr, dc] of DIRECTIONS) {
            const nr = r + dr;
            const nc = c + dc;

            if (!inBounds(nr, nc)) continue;
            if (maze[nr][nc] === WALL) continue;
            if (closed[nr][nc]) continue;

            const newCost = dist[r][c] + getCellCost(nr, nc);

            if (newCost < dist[nr][nc]) {
                dist[nr][nc] = newCost;
                parent[nr][nc] = [r, c];
                openList.push({ r: nr, c: nc, cost: newCost });
            }
        }
    }

    return buildResult("最適探索", searchOrder, parent);
}

function aStarSearch() {
    const openList = [];
    const closed = create2DArray(false);
    const dist = create2DArray(Infinity);
    const parent = create2DArray(null);
    const searchOrder = [];

    dist[START_R][START_C] = 0;
    openList.push({
        r: START_R,
        c: START_C,
        cost: 0,
        priority: heuristic(START_R, START_C)
    });

    while (openList.length > 0) {
        openList.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.cost - b.cost;
        });

        const current = openList.shift();
        const r = current.r;
        const c = current.c;

        if (closed[r][c]) continue;

        closed[r][c] = true;
        searchOrder.push([r, c]);

        if (isGoal(r, c)) break;

        for (const [dr, dc] of DIRECTIONS) {
            const nr = r + dr;
            const nc = c + dc;

            if (!inBounds(nr, nc)) continue;
            if (maze[nr][nc] === WALL) continue;
            if (closed[nr][nc]) continue;

            const newCost = dist[r][c] + getCellCost(nr, nc);

            if (newCost < dist[nr][nc]) {
                dist[nr][nc] = newCost;
                parent[nr][nc] = [r, c];

                const priority = newCost + heuristic(nr, nc);

                openList.push({
                    r: nr,
                    c: nc,
                    cost: newCost,
                    priority: priority
                });
            }
        }
    }

    return buildResult("A*", searchOrder, parent);
}

function buildResult(algorithmName, searchOrder, parent) {
    const path = reconstructPath(parent);
    const found = path.length > 0;
    const totalCost = found ? calculatePathCost(path) : null;

    return {
        algorithmName,
        found,
        searchOrder,
        path,
        totalCost,
        pathLength: found ? path.length - 1 : 0,
        exploredCount: searchOrder.length
    };
}

async function startSearch() {
    if (exploring) return;

    exploring = true;
    clearSearchResult();
    drawMaze();

    const algo = getAlgorithm();
    const result = algo === "ucs" ? uniformCostSearch() : aStarSearch();

    await animateResult(result);
    showResult(result);
    addResultHistory(result);

    exploring = false;
}

async function animateResult(result) {
    for (let i = 0; i < result.searchOrder.length; i++) {
        const [r, c] = result.searchOrder[i];
        markVisited(r, c, i + 1);
        await sleep(250);
    }

    if (result.found) {
        drawPath(result.path);
    }

    drawStartGoal();
}

function drawStartGoal() {
    const startCell = table.rows[START_R].cells[START_C];
    startCell.className = "";
    startCell.classList.add("start");
    startCell.textContent = "S";

    const goalCell = table.rows[GOAL_R].cells[GOAL_C];
    goalCell.className = "";
    goalCell.classList.add("goal");
    goalCell.textContent = "G";
}

function showResult(result) {
    if (result.found) {
        messageBox.textContent = "ゴールに到達しました。";
        resultBox.innerHTML = `
            <p class="result-success">ゴールに到達しました。</p>
            <p>アルゴリズム：${result.algorithmName}</p>
            <p>探索したマス数：${result.exploredCount}</p>
            <p>経路の長さ：${result.pathLength}ステップ</p>
            <p>経路の総コスト：${result.totalCost}</p>
        `;
    } else {
        messageBox.textContent = "ゴールに到達できませんでした。";
        resultBox.innerHTML = `
            <p class="result-fail">ゴールに到達できませんでした。</p>
            <p>アルゴリズム：${result.algorithmName}</p>
            <p>探索したマス数：${result.exploredCount}</p>
        `;
    }
}

function addResultHistory(result) {
    resultHistory.unshift({
        algorithmName: result.algorithmName,
        found: result.found,
        exploredCount: result.exploredCount,
        pathLength: result.pathLength,
        totalCost: result.totalCost
    });

    renderHistory();
}

function renderHistory() {
    if (!historyBox) return;

    historyBox.innerHTML = "";

    if (resultHistory.length === 0) {
        historyBox.innerHTML = "<p>まだ実行履歴はありません。</p>";
        return;
    }

    for (const item of resultHistory) {
        const div = document.createElement("div");
        div.className = "history-item";

        if (item.found) {
            div.innerHTML = `
                <strong>${item.algorithmName}</strong><br>
                探索したマス数：${item.exploredCount}<br>
                経路の長さ：${item.pathLength}ステップ<br>
                経路の総コスト：${item.totalCost}
            `;
        } else {
            div.innerHTML = `
                <strong>${item.algorithmName}</strong><br>
                ゴール未到達<br>
                探索したマス数：${item.exploredCount}
            `;
        }

        historyBox.appendChild(div);
    }
}

window.addEventListener("DOMContentLoaded", createMaze);
