// ===== ロボットの移動用（既存） =====
let robot; // ← ここを即時取得しない（DOM準備前対策）
function moveRobotTo(x, y) {
    const cell = table.rows[x].cells[y];
    const rect = cell.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    robot.style.left = (rect.left - tableRect.left + 10) + "px";
    robot.style.top  = (rect.top  - tableRect.top  + 10) + "px";
    robot.style.display = "block";
}

// 成否で使う画像（既存）
const ROBOT_NORMAL = "robot.png";
const ROBOT_HAPPY  = "happy_robot.png";
const ROBOT_SAD    = "sad_robot.png";

// ===== 既存ロジック =====
const ROWS = 7;
const COLS = 7;
let maze = [];
let visited = [];
let table;
let stepCount = 0;
let messageBox;

// ===== 操作状態の管理（追加） =====
let startButton;
let stopButton;
let resetButton;

let isSearching = false;
let stopRequested = false;

function createMaze() {
    table = document.getElementById("maze");
    robot = document.getElementById("robot");
    messageBox = document.getElementById("message");

    startButton = document.getElementById("startButton");
    stopButton = document.getElementById("stopButton");
    resetButton = document.getElementById("resetButton");

    for (let i = 0; i < ROWS; i++) {
        let row = [];
        let rowVisited = [];
        let tr = document.createElement("tr");

        for (let j = 0; j < COLS; j++) {
            let td = document.createElement("td");
            td.dataset.row = i;
            td.dataset.col = j;
            td.onclick = () => toggleWall(i, j);
            tr.appendChild(td);

            row.push(0);
            rowVisited.push(false);
        }

        table.appendChild(tr);
        maze.push(row);
        visited.push(rowVisited);
    }

    setStartGoal();
    updateButtons();
}

function toggleWall(i, j) {
    // 探索中は迷路を変更できないようにする
    if (isSearching) return;

    if ((i === 0 && j === 0) || (i === ROWS - 1 && j === COLS - 1)) return;

    let cell = table.rows[i].cells[j];

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

// ===== DFS本体 =====
// 探索順・再帰処理・訪問判定は既存のまま。
// stopRequested の確認だけを追加している。
async function dfs(x, y) {
    if (stopRequested) return false;

    if (x < 0 || x >= ROWS || y < 0 || y >= COLS) return false;
    if (maze[x][y] === 1 || visited[x][y]) return false;

    visited[x][y] = true;
    moveRobotTo(x, y);

    let cell = table.rows[x].cells[y];

    if (!cell.classList.contains("start") && !cell.classList.contains("goal")) {
        cell.classList.add("visited");
        cell.textContent = stepCount++;
        await sleep(300);

        // 待機中に「探索ストップ」が押された場合にここで中断
        if (stopRequested) return false;
    }

    if (x === ROWS - 1 && y === COLS - 1) return true;

    const directions = [[1,0], [-1,0], [0,1], [0,-1]];

    for (let [dx, dy] of directions) {
        // 停止要求が出たら、それ以上次のマスを探索しない
        if (stopRequested) return false;

        if (await dfs(x + dx, y + dy)) {
            // 停止時に経路色を付けながら戻らないようにする
            if (stopRequested) return false;

            if (!cell.classList.contains("start") && !cell.classList.contains("goal")) {
                cell.classList.remove("visited");
                cell.classList.add("path");
            }

            return true;
        }
    }

    return false;
}

function resetVisited() {
    visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    stepCount = 1;

    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            let cell = table.rows[i].cells[j];

            if (
                !cell.classList.contains("start") &&
                !cell.classList.contains("goal") &&
                !cell.classList.contains("wall")
            ) {
                cell.classList.remove("visited", "path");
                cell.textContent = "";
            }
        }
    }

    messageBox.textContent = "";
}

function updateButtons() {
    if (startButton) startButton.disabled = isSearching;
    if (resetButton) resetButton.disabled = isSearching;
    if (stopButton) stopButton.disabled = !isSearching;
}

async function startDFS() {
    // 連打による二重実行を防止
    if (isSearching) return;

    isSearching = true;
    stopRequested = false;
    updateButtons();

    resetVisited();

    // 探索開始前にロボットを通常画像にして一旦非表示
    if (robot) {
        robot.src = ROBOT_NORMAL;
        robot.style.display = "none";
    }

    try {
        const result = await dfs(0, 0);

        // 「探索ストップ」が押された場合
        if (stopRequested) {
            // 作った迷路は残して、探索の色・番号だけ消す
            resetVisited();

            if (robot) {
                robot.src = ROBOT_NORMAL;
                robot.style.display = "none";
            }

            messageBox.textContent = "⏹ 探索をストップしました。迷路を直してもう一度試してみよう！";
            return;
        }

        if (result) {
            messageBox.textContent = "🎉 ゴールに到達しました！";

            if (robot) {
                robot.src = ROBOT_HAPPY;
                robot.style.display = "block";
            }
        } else {
            messageBox.textContent = "😢 ゴールに到達できませんでした。";

            if (robot) {
                robot.src = ROBOT_SAD;
                robot.style.display = "block";
            }
        }
    } finally {
        isSearching = false;
        stopRequested = false;
        updateButtons();
    }
}

function stopDFS() {
    if (!isSearching) return;

    stopRequested = true;

    // 何度も押されないように、押した直後に停止ボタンだけ無効化
    if (stopButton) stopButton.disabled = true;

    messageBox.textContent = "⏹ 探索をストップしています...";
}

function resetMaze() {
    // 探索中はリセットできない
    if (isSearching) return;

    // ロボットを消す
    const r = document.getElementById("robot");
    if (r) r.style.display = "none";

    maze = [];
    visited = [];
    table.innerHTML = "";

    createMaze();
    messageBox.textContent = "";
}

window.onload = createMaze;
