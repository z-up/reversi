"use strict";

const DEV_MODE = true;

class Position {
    constructor(row, col){
        this.row = row;
        this.col = col;
    }

    getCopy() {
        return new Position(this.row, this.col);
    }
}

class Score {
    constructor(black, white) {
        this.black = black;
        this.white = white;
    }
}

class MoveRating {
    constructor(cell, rating) {
        this.cell = cell;
        this.rating = rating;

        this.ruleNumber = -1;
    }
}

const ALL_POSSIBLE_DIRECTIONS = [
    new Position( 0,  1), // right
    new Position(-1,  1), // up and right
    new Position(-1,  0), // up
    new Position(-1, -1), // up and left
    new Position( 0, -1), // left
    new Position( 1, -1), // down and left
    new Position( 1,  0), // down
    new Position( 1,  1), // down and right
];

let MY_COLOR = "white";
let PLAYERS_COLOR = "black";
let PLAYERS_POSSIBLE_MOVES = [];

document.addEventListener("DOMContentLoaded", function(event) {
    initGameField();

    const dialog = document.getElementById("new_game_dlg");
    dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
    });

    showNewGameDlg();
});

function initGameField() {
    const tbl = document.getElementById("game_field");

    const letters = "abcdefgh";
    const digits = "12345678";
    for(let r = 0; r < 10; r++){
        const tr = document.createElement("tr");
        for(let c = 0; c < 10; c++){
            const td = document.createElement("td");
            if((r === 0 || r === 9) && (c !== 0 && c !== 9)) {
                td.textContent = letters[c - 1];
                td.className = "coordinate";
            }
            if((c === 0 || c === 9) && (r !== 0 && r !== 9)) {
                td.textContent = digits[r - 1];
                td.className = "coordinate";
            }
            if(r !== 0 && r !== 9 && c !== 0 && c !== 9) {
                td.className = "cell";
            }
            tr.appendChild(td);
        }
        tbl.appendChild(tr);
    }
    addOnClickEventToCells();
}

function showNewGameDlg(){
    const dlg = document.getElementById("new_game_dlg");
    dlg.showModal();
}

function setPlayerColor(color){
    const dlg = document.getElementById("new_game_dlg");
    dlg.close();
    PLAYERS_COLOR = color;
    MY_COLOR = color == "black" ? "white" : "black";
    startNewGame();
}

function startNewGame(){
    //clean the field
    var disks = document.getElementsByClassName('disk');

    while(disks[0]) {
        disks[0].parentNode.removeChild(disks[0]);
    }

    initialDiskSetup();
    getScore();
    document.getElementById("message").textContent = "";
    // blacks move first
    if(PLAYERS_COLOR == "black"){
        PLAYERS_POSSIBLE_MOVES = getPossibleMoves("black");
        PLAYERS_POSSIBLE_MOVES.forEach((c) => {c.classList.add("allowed")});
    }
    else{
        setTimeout(makeAMove, 500);
    }
}

function addOnClickEventToCells() {
    const cells = document.querySelectorAll("#game_field td.cell");
    for (let i = 0; i < cells.length; i++) {
        cells[i].addEventListener("click", onCellClick);
    }
}

function initialDiskSetup() {
    getCell(4, 4).appendChild(createDisk("white"));
    getCell(5, 5).appendChild(createDisk("white"));
    getCell(4, 5).appendChild(createDisk("black"));
    getCell(5, 4).appendChild(createDisk("black"));
}

function createDisk(colorCSSClass) {
    const disk = document.createElement("div");
    disk.className = "disk " + colorCSSClass;
    return disk;
}

function getCell(row, column) {
    const tbl = document.getElementById('game_field');
    return tbl.rows[row].cells[column];
}

function getPossibleMoves(color) {
    const availableCells = [];
    const disksOfGivenColor = document.getElementsByClassName(`disk ${color}`);
    for(let i = 0; i < disksOfGivenColor.length; i += 1) {
        const cell = disksOfGivenColor[i].parentNode;
        const cellPos = getCellPos(cell);
        for(let d = 0; d < ALL_POSSIBLE_DIRECTIONS.length; d += 1){
            const dir = ALL_POSSIBLE_DIRECTIONS[d];
            const hit = lookForAvailableCellInDir(cellPos, dir, color);
            if(hit !== null){
                availableCells.push(hit);
            }
        }
    }
    // Some cells can be reachable from different positions,
    // so we need to remove duplicates
    const uniq = [...new Set(availableCells)];
    return uniq;
}

function lookForAvailableCellInDir(start, dir, color){
    const opposingColor = color === 'white' ? 'black' : 'white';
    const curPos = new Position(start.row, start.col);

    let prevCellState = color;
    while(true) {
        curPos.row += dir.row;
        curPos.col += dir.col;
        if(curPos.row > 8 || curPos.row < 1 || curPos.col > 8 || curPos.col < 1){
            return null;
        }
        const curCell = getCell(curPos.row, curPos.col);
        const curCellState = getCellState(curCell);
        if(curCellState === color) {
            return null;
        }
        if(curCellState === "empty" && prevCellState === color){
            return null;
        }
        if(curCellState === "empty" && prevCellState === opposingColor){
            return curCell;
        }
        prevCellState = curCellState;
    }
}

async function turnDisksOver(pos, color) {
    ANIMATION_DISKS = [];
    for(let d = 0; d < ALL_POSSIBLE_DIRECTIONS.length; d += 1){
        const dir = ALL_POSSIBLE_DIRECTIONS[d];
        turnDisksOverInDir(pos, dir, color);
    }
    // remove duplicates
    ANIMATION_DISKS = [...new Set(ANIMATION_DISKS)];
    if(color === "white"){
        animateFromBlackToWhite();
    }
    else{
        animateFromWhiteToBlack();
    }
    await waitForAnimationToFinish();
}

function turnDisksOverInDir(start, dir, color){
    const opposingColor = color === 'white' ? 'black' : 'white';
    const curPos = new Position(start.row, start.col);

    let prevCellState = color;
    const positionsOfDiskToTurnOver = [];
    while(true) {
        curPos.row += dir.row;
        curPos.col += dir.col;
        if(curPos.row > 8 || curPos.row < 1 || curPos.col > 8 || curPos.col < 1){
            return null;
        }
        const curCell = getCell(curPos.row, curPos.col);
        const curCellState = getCellState(curCell);
        if(curCellState === color && prevCellState === color) {
            return null;
        }
        if(curCellState === color && prevCellState === opposingColor) {
            break;
        }
        if(curCellState === "empty"){
            return null;
        }
        if(curCellState === opposingColor){
            positionsOfDiskToTurnOver.push(new Position(curPos.row, curPos.col));
        }
        prevCellState = curCellState;
    }

    for(let i = 0; i < positionsOfDiskToTurnOver.length; i += 1) {
        const pos = positionsOfDiskToTurnOver[i];
        const cell = getCell(pos.row, pos.col);
        const disk = cell.firstChild;
        //disk.classList.remove(opposingColor);
        //disk.classList.add(color);
        ANIMATION_DISKS.push(disk);
    }

}

function getCellState(cell){
    if(!cell.hasChildNodes()){
        return "empty";
    }
    const disk = cell.firstChild;
    if(disk.classList.contains("black")) {
        return "black";
    }
    else {
        return "white";
    }
}

function getCellPos(cellToFind) {
    const tbl = document.getElementById('game_field');
    for(let r = 0; r < 10; r ++) {
        for(let c = 0; c < 10; c++) {
            const cell = tbl.rows[r].cells[c];
            if(cell === cellToFind){
                return new Position(r, c);
            }
        }
    }
}

let CLICKED_CELL;
let EVT;
async function onCellClick(event){
    EVT = event;
    // different browsers have different property names
    const originalTarget = event.srcElement || event.originalTarget
    if(originalTarget.tagName.toLowerCase() !== "td"){
        return;
    }
    const cell = originalTarget;
    if(!PLAYERS_POSSIBLE_MOVES.includes(cell)){
        return;
    }
    CLICKED_CELL = cell;
    if (cell.hasChildNodes()) {
        //console.log("a cell contains a disk");
        return;
    }
    const pos = getCellPos(cell);
    cell.appendChild(createDisk(PLAYERS_COLOR));
    PLAYERS_POSSIBLE_MOVES.forEach((c) => { c.classList.remove('allowed'); })
    PLAYERS_POSSIBLE_MOVES = [];
    await turnDisksOver(pos, PLAYERS_COLOR);
    const score = getScore();
    document.getElementById("message").textContent = "";
    if(score.black + score.white == 64){
        showFinalResults(score);
    }
    else {
        setTimeout(makeAMove, 500);
    }
}

function showFinalResults(score, stuck=false){
    if(score.black + score.white === 64 || stuck){
        let msg = "";
        if(stuck) {
            msg = "Neither of us has moves. ";
        }

        if(score[PLAYERS_COLOR] > score[MY_COLOR]) {
            msg += "You won. ";
        }
        else if (score[PLAYERS_COLOR] < score[MY_COLOR]) {
            msg += "You lost. ";
        }
        else {
            msg += "A draw. ";
        }

        msg += '<a onclick="showNewGameDlg()">Wanna play again?</a>'

        document.getElementById("message").innerHTML = msg;
    }
}

async function makeAMove() {
    let myPossibleMoves = getPossibleMoves(MY_COLOR);
    if(myPossibleMoves.length === 0) {
        const score = getScore();
        if(score.white + score.black === 64) {
            showFinalResults(score);
        }
        else {
            PLAYERS_POSSIBLE_MOVES = getPossibleMoves(PLAYERS_COLOR);
            if(PLAYERS_POSSIBLE_MOVES.length === 0){
                showFinalResults(score, true);
            }
            else {
                PLAYERS_POSSIBLE_MOVES.forEach((c) => {c.classList.add("allowed")});
                document.getElementById("message").textContent = "I have no moves. Move again.";
            }
        }
        return;
    }

    const cell = pickTheBestMove(myPossibleMoves);
    const pos = getCellPos(cell);
    cell.appendChild(createDisk(MY_COLOR));
    await turnDisksOver(pos, MY_COLOR);

    var score = getScore();
    document.getElementById("message").textContent = "";
    PLAYERS_POSSIBLE_MOVES = getPossibleMoves(PLAYERS_COLOR);
    if(PLAYERS_POSSIBLE_MOVES.length === 0) {
        if(score.white + score.black === 64) {
            showFinalResults(score);
        }
        else{
            myPossibleMoves = getPossibleMoves(MY_COLOR);
            if(myPossibleMoves.length === 0){
                showFinalResults(score, true);
            }
            else {
                document.getElementById("message").textContent =
                    "You have no moves. I move again.";
                setTimeout(makeAMove, 1500);
            }
        }
    }
    else {
        PLAYERS_POSSIBLE_MOVES.forEach((c) => {c.classList.add("allowed")});
    }
}


// assuming that possibleMoves isn't empty
function pickTheBestMove(possibleMoves) {
    const ratings = possibleMoves.map(rateAMove).sort(compareByRatingDesc);
    if(DEV_MODE){
        for(let r of ratings){
            const ratingInfo = document.createElement('div');
            ratingInfo.className = 'rating_info';
            if(r.ruleNumber !== -1){
                ratingInfo.innerText = `${r.rating} (${r.ruleNumber})`;
            }
            else{
                ratingInfo.innerText = r.rating;
            }

            r.cell.appendChild(ratingInfo);
        }
        debugger;
        for(let r of ratings){
            r.cell.innerHTML = '';
        }
    }
    return ratings[0].cell;
}

function rateAMove(cell){
    const rating = new MoveRating(cell, 0);
    const pos = getCellPos(cell);

    const borderIndices = [1, 8];
    const nextToBorderIndices = [2, 7];
    // taking corners is high priority
    if(borderIndices.includes(pos.row) && borderIndices.includes(pos.col)){
        rating.rating = 10;
    }
    else if(borderIndices.includes(pos.row)){ // top or bottom border
        const border = getLineStrRepr(new Position(pos.row, 1), new Position(0, 1), 8, pos);
        const [r, patternNumber] = rateBorderMove(border)
        rating.rating = r;
        rating.ruleNumber = patternNumber;
    }
    else if(borderIndices.includes(pos.col)){ // left or right border
        const border = getLineStrRepr(new Position(1, pos.col), new Position(1, 0), 8, pos);
        const [r, patternNumber] = rateBorderMove(border)
        rating.rating = r;
        rating.ruleNumber = patternNumber;
    }
    else if(nextToBorderIndices.includes(pos.row) && nextToBorderIndices.includes(pos.col)){
        if(pos.row === pos.col){ // top-left to bottom-right diagonal
            const diagonal = getLineStrRepr(new Position(1, 1), new Position(1, 1), 8, pos);
            rating.rating = rateDiagonalMove(diagonal);
        }
        else{ // top-right to bottom-left diagonal
            const diagonal = getLineStrRepr(new Position(1, 8), new Position(1, -1), 8, pos);
            rating.rating = rateDiagonalMove(diagonal);
        }
    }
    else if(pos.row === 2 && getLineStrRepr(new Position(1, pos.col - 1), new Position(0, 1), 3) === "___"){
        rating.rating = -3;
    }
    else if(pos.row === 7 && getLineStrRepr(new Position(8, pos.col - 1), new Position(0, 1), 3) === "___"){
        rating.rating = -3;
    }
    else if(pos.col === 2 && getLineStrRepr(new Position(pos.row - 1, 1), new Position(1, 0), 3) === "___"){
        rating.rating = -3;
    }
    else if(pos.col === 7 && getLineStrRepr(new Position(pos.row - 1, 8), new Position(1, 0), 3) === "___"){
        rating.rating = -3;
    }

    return rating;
}

function getLineStrRepr(startPos, direction, lineLength = 8, cellToRate = new Position(-1, -1)){
    let strRepr = "";

    const curPos = new Position(startPos.row, startPos.col);

    while(true) {
        const cell = getCell(curPos.row, curPos.col);
        const cellState = getCellState(cell);

        if(curPos.row === cellToRate.row && curPos.col === cellToRate.col){
            strRepr += "x";
        }
        else if(cellState === "empty"){
            strRepr += "_";
        }
        else if(cellState === MY_COLOR){
            strRepr += "m";
        }
        else {
            strRepr += "o";
        }


        curPos.row += direction.row;
        curPos.col += direction.col;

        if( strRepr.length >= lineLength
            || curPos.row > 8 || curPos.row < 1
            || curPos.col > 8 || curPos.col < 1
        ){
            break;
        }
    }
    //console.log(strRepr);
    return strRepr;
}

function compareByRatingDesc(a, b) {
    return b.rating - a.rating;
}

// _ - empty cell
// m - taken by me
// o - taken by opponent
// x - cell to rate
const BORDER_PATTERNS = [
    [/^m+x.*$/, 9],
    [/^o+xo+_$/, 9],
    [/^m+o+x.*$/, 9],
    [/^_+m+o+x_+$/, 9],
    [/^_+x_o+_+$/, 5],
    [/^o+xm+o+.*$/, 4],
    [/^o+m+xo+.*$/, 4],
    [/^.*ox_o.*$/, -5],
    [/^_+x_+$/, 8],
    [/^_+o+x_$/, -9],
    [/^_+o+x__+$/, -5],
    [/^_+xo+m+_o+_+$/, 5],
    [/^_+m+o+x_+$/, 6],
    [/^_xo+_.*$/, -10],
    [/^__+xo+_.*$/, -4],
    [/^_+x_o+_+$/, 5],
    [/^_o+xm+o+.*$/, 9],
    [/^_+x__m+_+$/, 4],
    [/^_+xo+m+_.*$/, 7],
    [/^m+xm+.*$/, 9],
    [/^_x_m+.*$/, -5],
    [/^_+m+o+xm+_+$/, 9],
    [/^_+m+_x_+$/, -5],
    [/^_+m+x_+$/, 7],
    [/^_+m+_o+_x_+$/, 7],
    [/^_+o+_m+x_+$/, 5],
    [/^_+m+xo+m+_+$/, 8],
    [/^_+m+x_m+_+$/, -5],
    [/^_xm+o.*$/, -8],
    [/^o+_*x_+$/, -8],
    [/^_+m+xo+_+$/, -6],
    [/^_+m+xo+_+$/, -7],
    [/^_+m+xo+_m+_+$/, -6],
    [/^_+o+x_m+_+$/, 6],
    [/^__mxo+m+[mo]+$/, 7],
    [/^_mxo.*$/, -10],
    [/^_+o+xm+_o+_+$/, -9],
    [/^o+xm+_+$/, -7],
    [/^o+xo+m+_+$/, -7],
    [/^_+x___o+_+$/, 4],
    [/^_+ox__m+_+$/, -4],
    [/^_+o+xo+_+$/, 6],
    [/^m+__x_+$/, 6],
    [/^m+_x_+$/, -3],
    [/^_xo+m+o+.*$/, -9],
    [/^o+m+o+x$/, 10],
    [/^o+m+o+x_+$/, -6],
    [/^_o+xo+.*$/, 8],
    // [/^$/, 0],
    // [/^$/, 0],
    // [/^$/, 0],
    // [/^$/, 0],
    // [/^$/, 0],
    // [/^$/, 0],
    // [/^$/, 0],
    // [/^$/, 0],
];

function rateBorderMove(border){
    //console.log(`border == ${border}`);
    for(let i = 0; i < BORDER_PATTERNS.length; i += 1){
        let [re, rating] = BORDER_PATTERNS[i];
        if(re.test(border) || re.test(reverseStr(border))){
            return [rating, i];
        }
    }

    return [0, -1];
}

const DIAGONAL_PATTERNS = [
    [/^_xo+.*$/, -9],
    [/^_xm+o+.*$/, -9],
    [/^_xm+_+$/, -2],
    [/^_xm+o+m+_+$/, -2],
    [/^_xm+$/, -2],
    [/^_xo+m+$/, -2],
    [/^ox.+$/, 1],
];


function rateDiagonalMove(diagonal){
    for(let [re, rating] of DIAGONAL_PATTERNS){
        if(re.test(diagonal) || re.test(reverseStr(diagonal))){
            return rating;
        }
    }
    return 0;
}

function reverseStr(s){
    return s.split("").reverse().join("");
}

function getScore() {
    const blackDisks = document.getElementsByClassName('disk black').length;
    const whiteDisks = document.getElementsByClassName('disk white').length;
    document.getElementById("score_value_black").textContent = blackDisks;
    document.getElementById("score_value_white").textContent = whiteDisks;
    return new Score(blackDisks, whiteDisks);
}


// disk color transition animation
const event = new Event("animationFinished");

let ANIMATION_CUR_COLOR_1;
let ANIMATION_CUR_COLOR_2;
let ANIMATION_COLOR_DELTA;
let ANIMATION_STEPS_LEFT;
let ANIMATION_DISKS = [];
function animateDiskColorChange(timeStamp){

    ANIMATION_CUR_COLOR_1 += ANIMATION_COLOR_DELTA;
    ANIMATION_CUR_COLOR_2 += ANIMATION_COLOR_DELTA;

    const colorStr_1 = formatHex(ANIMATION_CUR_COLOR_1, 6);
    const colorStr_2 = formatHex(ANIMATION_CUR_COLOR_2, 6);
    const grad = `linear-gradient(#${colorStr_1}, #${colorStr_2})`;
    for(let disk of ANIMATION_DISKS){
        disk.style.background = grad;
    }
    //console.log(grad);
    ANIMATION_STEPS_LEFT -= 1;
    if(ANIMATION_STEPS_LEFT > 0){
        //disk1.style.background = "#" + ANIMATION_CUR_COLOR.toString(16);
        window.requestAnimationFrame(animateDiskColorChange);
    }
    else{
        for(let disk of ANIMATION_DISKS){
            disk.style.background = "";
            if(disk.classList.contains("white")){
                disk.classList.remove("white");
                disk.classList.add("black");
            }
            else{
                disk.classList.remove("black");
                disk.classList.add("white");
            }
        }
        const event = new Event("animationFinished");
        document.dispatchEvent(event);
    }
}

function formatHex(num, length) {
  let str = num.toString(16);
  while (str.length < length) {
    str = '0' + str;
  }
  return str;
}

// The difference between the start and end colors for both components of the gradient
// is 0x909090
// The factors of 0x90 (144) are 0x01, 0x02, 0x03, 0x04, 0x06, 0x08, 0x09, 0x0c, 0x10,
// 0x12, 0x18, 0x24, 0x30, 0x48, 0x90
// Use these values for delta and steps number to change animation speed
// 0x90 === 0x03 * 48
// 0x90 === 0x04 * 36
// 0x90 === 0x06 * 24
// 0x90 === 0x08 * 18
// 0x90 === 0x09 * 16
// 0x90 === 0x0c * 12
function animateFromWhiteToBlack(){
    ANIMATION_CUR_COLOR_1 = 0xffffff;
    ANIMATION_CUR_COLOR_2 = 0x999999;
    ANIMATION_COLOR_DELTA = -0x060606;
    ANIMATION_STEPS_LEFT = 24;
    window.requestAnimationFrame(animateDiskColorChange);
}

function animateFromBlackToWhite(){
    ANIMATION_CUR_COLOR_1 = 0x6f6f6f;
    ANIMATION_CUR_COLOR_2 = 0x090909;
    ANIMATION_COLOR_DELTA = 0x060606;
    ANIMATION_STEPS_LEFT = 24;
    window.requestAnimationFrame(animateDiskColorChange);
}

function getPromiseFromEvent(item, event) {
    return new Promise((resolve) => {
        const listener = () => {
            item.removeEventListener(event, listener);
            resolve();
        }
        item.addEventListener(event, listener);
    });
}

async function waitForAnimationToFinish() {
    await getPromiseFromEvent(document, "animationFinished")
}

