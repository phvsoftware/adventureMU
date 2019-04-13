let score = 0;
let coinRestant = 0;
let vie = 3;
let globalLevel = 1;
let godMod = false;
let godModKey = 0;
let reaperPos;

var Level = class Level {
    constructor(plan) {
        let rows = plan.trim().split("\n").map(l => [...l]);
        this.height = rows.length;
        this.width = rows[0].length;
        this.startActors = [];

        this.rows = rows.map((row, y) => {
            return row.map((ch, x) => {
                let type = levelChars[ch];
                if (typeof type == "string") return type;
                this.startActors.push(type.create(new Vec(x, y), ch));
                return "empty";
            });
        });
    }
}

var State = class State {
    constructor(level, actors, status) {
        this.level = level;
        this.actors = actors;
        this.status = status;
    }

    static start(level) {
        return new State(level, level.startActors, "playing");
    }

    get player() {
        return this.actors.find(a => a.type == "player");
    }
}

var Vec = class Vec {
    constructor(x, y) {
        this.x = x; 
        this.y = y;
    }
    plus(other) {
        return new Vec(this.x + other.x, this.y + other.y);
    }
    times(factor) {
        return new Vec(this.x * factor, this.y * factor);
    }
}

var Player = class Player {
    constructor(pos, speed) {
        this.pos = pos;
        this.speed = speed;
    }

    get type() { return "player"; }

    static create(pos) {
        reaperPos = pos.plus(new Vec(0, -0.5));
        return new Player(reaperPos, new Vec(0, 0));
    }
}

Player.prototype.size = new Vec(0.8, 1.5);

var Lava = class Lava {
    constructor(pos, speed, reset) {
        this.pos = pos;
        this.speed = speed;
        this.reset = reset;
    }

    get type() { return "lava"; }

    static create(pos, ch) {
        if (ch == "=") {
            return new Lava(pos, new Vec(2, 0));
        } else if (ch == "|") {
            return new Lava(pos, new Vec(0, 2));
        } else if (ch == "v") {
            return new Lava(pos, new Vec(0, 3), pos);
        }
    }
}

Lava.prototype.size = new Vec(1, 1);

Lava.prototype.collide = function (state) {
    return new State(state.level, state.actors, "lost");
};

Lava.prototype.update = function (time, state) {
    let newPos = this.pos.plus(this.speed.times(time));
    if (!state.level.touches(newPos, this.size, "wall") && !state.level.touches(newPos, this.size, "earth")) {
        return new Lava(newPos, this.speed, this.reset);
    } else if (this.reset) {
        return new Lava(this.reset, this.speed, this.reset);
    } else {
        return new Lava(this.pos, this.speed.times(-1));
    }
};

var Monster = class Monster {
    constructor(pos, speed, reset) {
        this.pos = pos;
        this.speed = speed;
        this.reset = reset;
    }

    get type() { return "monster"; }

    static create(pos, ch) {
        if (ch == "=") {
            return new Monster(pos, new Vec(2, 0));
        } else if (ch == "|") {
            return new Monster(pos, new Vec(0, 2));
        } else if (ch == "v") {
            return new Monster(pos, new Vec(0, 3), pos);
        }
    }
}

Monster.prototype.size = new Vec(0.8, 0.9);

Monster.prototype.collide = function (state) {
    return new State(state.level, state.actors, "lost");
};

Monster.prototype.update = function (time, state) {
    let newPos = this.pos.plus(this.speed.times(time));
    if (!state.level.touches(newPos, this.size, "wall") && !state.level.touches(newPos, this.size, "earth")) {
        return new Monster(newPos, this.speed, this.reset);
    } else if (this.reset) {
        return new Monster(this.reset, this.speed, this.reset);
    } else {
        return new Monster(this.pos, this.speed.times(-1));
    }
};

var Coin = class Coin {
    constructor(pos, basePos, wobble) {
        this.pos = pos;
        this.basePos = basePos;
        this.wobble = wobble;
    }

    get type() { return "coin"; }

    static create(pos) {
        let basePos = pos.plus(new Vec(0.2, 0.1));
        return new Coin(basePos, basePos, Math.random() * Math.PI * 2);
    }
}

Coin.prototype.size = new Vec(0.6, 0.6);

var levelChars = {
    ".": "empty",
    "#": "wall",
    "+": "lava",
    "*": "earth",
    "@": Player,
    "$": "savepos",
    "o": Coin,
    "=": Monster,
    "|": Monster,
    "v": Lava
};

function getTile(spriteType) {
    switch (spriteType) {
        case "coin":
            return 80;
        case "monster":
            return 60;
        case "lava":
            return 40;
        case "earth":
            return 20;
        case "wall":
            return 0;
    }
}

var scale = 20;

function drawGrid(level) {
    return elt("table", {
        class: "background",
        style: `width: ${level.width * scale}px`
    }, ...level.rows.map(row =>
        elt("tr", { style: `height: ${scale}px` },
            ...row.map(type => elt("td", { class: type })))
    ));
}

function drawActors(actors) {
    return elt("div", {}, ...actors.map(actor => {
        let rect = elt("div", { class: `actor ${actor.type}` });
        rect.style.width = `${actor.size.x * scale}px`;
        rect.style.height = `${actor.size.y * scale}px`;
        rect.style.left = `${actor.pos.x * scale}px`;
        rect.style.top = `${actor.pos.y * scale}px`;
        return rect;
    }));
}

Level.prototype.touches = function (pos, size, type) {
    var xStart = Math.floor(pos.x);
    var xEnd = Math.ceil(pos.x + size.x);
    var yStart = Math.floor(pos.y);
    var yEnd = Math.ceil(pos.y + size.y);

    for (var y = yStart; y < yEnd; y++) {
        for (var x = xStart; x < xEnd; x++) {
            let isOutside = x < 0 || x >= this.width ||
                y < 0 || y >= this.height;
            let here = isOutside ? "wall" : this.rows[y][x];
            // sauvegarde de position
            if (here == "savepos") {
                let pos2 = new Vec(x, y);
                reaperPos = pos2.plus(new Vec(0, -0.5));
            }
            if (here == type) return true;
        }
    }
    return false;
};

State.prototype.update = function (time, keys) {
    let actors = this.actors.map(actor => actor.update(time, this, keys));
    let newState = new State(this.level, actors, this.status);

    if (newState.status != "playing") return newState;

    let player = newState.player;
    if (this.level.touches(player.pos, player.size, "lava") && !godMod) {
        return new State(this.level, actors, "lost");
    }

    for (let actor of actors) {
        if (actor != player && overlap(actor, player) && !godMod) {
            newState = actor.collide(newState);
        }
    }
    return newState;
};

function overlap(actor1, actor2) {
    return actor1.pos.x + actor1.size.x > actor2.pos.x &&
        actor1.pos.x < actor2.pos.x + actor2.size.x &&
        actor1.pos.y + actor1.size.y > actor2.pos.y &&
        actor1.pos.y < actor2.pos.y + actor2.size.y;
}

function augmenteScore() {
    score++;
    // une vie en plus au bout de 50 
    if (score % 50 == 0) vie++;
}

Coin.prototype.collide = function (state) {
    let filtered = state.actors.filter(a => a != this);
    let status = state.status;
    if (!filtered.some(a => a.type == "coin")) status = "won";
    // calcul du score
    augmenteScore();
    return new State(state.level, filtered, status);
};

var wobbleSpeed = 8, wobbleDist = 0.07;

Coin.prototype.update = function (time) {
    let wobble = this.wobble + time * wobbleSpeed;
    let wobblePos = Math.sin(wobble) * wobbleDist;
    return new Coin(this.basePos.plus(new Vec(0, wobblePos)),
        this.basePos, wobble);
};

var playerXSpeed = 7;
var gravity = 30;
var jumpSpeed = 17;

Player.prototype.update = function (time, state, keys) {
    let xSpeed = 0;
    if (keys.ArrowLeft) xSpeed -= playerXSpeed;
    if (keys.ArrowRight) xSpeed += playerXSpeed;
    let pos = this.pos;
    let movedX = pos.plus(new Vec(xSpeed * time, 0));
    if (!state.level.touches(movedX, this.size, "wall") && !state.level.touches(movedX, this.size, "earth")) {
        pos = movedX;
    }

    let ySpeed = this.speed.y + time * gravity;
    let movedY = pos.plus(new Vec(0, ySpeed * time));
    if (!state.level.touches(movedY, this.size, "wall") && !state.level.touches(movedY, this.size, "earth")) {
        pos = movedY;
    } else if (keys.ArrowUp && ySpeed > 0) {
        ySpeed = -jumpSpeed;
    } else {
        ySpeed = 0;
    }
    // sauvegarde la position
    if (state.level.touches(movedY, this.size, "savepos")) {
        console.log("position sauvegardee");
    }

    return new Player(pos, new Vec(xSpeed, ySpeed));
};

class CanvasDisplay {
    constructor(parent, level) {
        this.canvas = document.createElement("canvas");
        this.canvas.width = Math.min(600, level.width * scale);
        this.canvas.height = Math.min(450, level.height * scale);
        parent.appendChild(this.canvas);
        this.cx = this.canvas.getContext("2d");
        this.flipPlayer = false;
        this.viewport = {
            left: 0,
            top: 0,
            width: this.canvas.width / scale,
            height: this.canvas.height / scale
        };
    }

    clear() {
        this.canvas.remove();
    }
}

function flipHorizontally(context, around) {
    context.translate(around, 0);
    context.scale(-1, 1);
    context.translate(-around, 0);
}

CanvasDisplay.prototype.syncState = function (state) {
    if (vie > 0) {
        this.updateViewport(state);
        this.clearDisplay(state.status);
        this.drawBackground(state.level);
        this.drawActors(state.actors);
    }
};

let playerSprites = document.createElement("img");
playerSprites.src = "player.png";
const playerXOverlap = 4;

CanvasDisplay.prototype.drawPlayer = function (player, x, y,
    width, height) {
    width += playerXOverlap * 2;
    x -= playerXOverlap;
    if (player.speed.x != 0) {
        this.flipPlayer = player.speed.x < 0;
    }

    let tile = 8;
    if (player.speed.y != 0) {
        tile = 9;
    } else if (player.speed.x != 0) {
        tile = Math.floor(Date.now() / 60) % 8;
    }

    this.cx.save();
    if (this.flipPlayer) {
        flipHorizontally(this.cx, x + width / 2);
    }
    let tileX = tile * width;
    this.cx.drawImage(playerSprites, tileX, 0, width, height, x, y, width, height);
    this.cx.restore();
};

CanvasDisplay.prototype.drawActors = function (actors) {
    coinRestant = 0;
    for (let actor of actors) {
        let width = actor.size.x * scale;
        let height = actor.size.y * scale;
        let x = (actor.pos.x - this.viewport.left) * scale;
        let y = (actor.pos.y - this.viewport.top) * scale;
        if (actor.type == "player") {
            this.drawPlayer(actor, x, y, width, height);
        } else {
            if (actor.type == "coin") coinRestant++;
            let tileX = getTile(actor.type);
            this.cx.drawImage(otherSprites, tileX, 0, width, height, x, y, width, height);
        }
    }

    // affichage du score
    this.cx.font = "15px Consolas";
    this.cx.fillStyle = "white";
    var formattedNumber = ("00" + coinRestant).slice(-3);
    var formattedSocre = ("0000" + score).slice(-5);
    var formattedLevel = ("0" + globalLevel).slice(-2);
    this.score = `Score : ${formattedSocre}     Pièces restantes : ${formattedNumber}     Niveau : ${formattedLevel}     Vies : ${vie}`;
    this.cx.fillText(this.score, 20, 18);
};

CanvasDisplay.prototype.updateViewport = function (state) {
    let view = this.viewport, margin = view.width / 3;
    let player = state.player;
    let center = player.pos.plus(player.size.times(0.5));

    if (center.x < view.left + margin) {
        view.left = Math.max(center.x - margin, 0);
    } else if (center.x > view.left + view.width - margin) {
        view.left = Math.min(center.x + margin - view.width,
            state.level.width - view.width);
    }
    if (center.y < view.top + margin) {
        view.top = Math.max(center.y - margin, 0);
    } else if (center.y > view.top + view.height - margin) {
        view.top = Math.min(center.y + margin - view.height,
            state.level.height - view.height);
    }
};

CanvasDisplay.prototype.clearDisplay = function (status) {
    if (status == "won") {
        this.cx.fillStyle = "rgb(68, 191, 255)";
    } else if (status == "lost") {
        this.cx.fillStyle = "rgb(240, 30, 10)";
    } else {
        this.cx.fillStyle = "rgb(52, 166, 251)";
    }
    this.cx.fillRect(0, 0,
        this.canvas.width, this.canvas.height);
};

let otherSprites = document.createElement("img");
otherSprites.src = "sprites4.png";

CanvasDisplay.prototype.drawBackground = function (level) {
    let { left, top, width, height } = this.viewport;
    let xStart = Math.floor(left);
    let xEnd = Math.ceil(left + width);
    let yStart = Math.floor(top);
    let yEnd = Math.ceil(top + height);

    for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
            let tile = level.rows[y][x];
            if (tile == "empty") continue;
            let screenX = (x - left) * scale;
            let screenY = (y - top) * scale;
            let tileX = getTile(tile);
            this.cx.drawImage(otherSprites, tileX, 0, scale, scale, screenX, screenY, scale, scale);
        }
    }
};

function trackKeys(keys) {
    let down = Object.create(null);
    function track(event) {
        if (keys.includes(event.key)) {
            down[event.key] = event.type == "keydown";
            event.preventDefault();
        }
        if (event.keyCode == 32) {
            down["ArrowUp"] = event.type == "keydown";            
        }
        // cheat mode
        if (event.type == "keyup") {
            if (event.keyCode == 71 && godModKey == 0) {
                godModKey = 1;
            } else if (event.keyCode == 79 && godModKey == 1) {
                godModKey = 2;
            } else if (event.keyCode == 68 && godModKey == 2) {
                godModKey = 3;
            } else {
                godModKey = 0;
            }
        }
        if (godModKey == 3) {
            godModKey = 0;   
            godMod = !godMod;
            if (godMod) {
                console.log("God Mod activé");
            } else {
                console.log("God Mod désactivé");
            }
        }
    }
    window.addEventListener("keydown", track);
    window.addEventListener("keyup", track);
    return down;
}

var arrowKeys = trackKeys(["ArrowLeft", "ArrowRight", "ArrowUp"]);

function runAnimation(frameFunc) {
    let lastTime = null;
    function frame(time) {
        if (lastTime != null) {
            let timeStep = Math.min(time - lastTime, 100) / 1000;
            if (frameFunc(timeStep) === false) return;
        }
        lastTime = time;
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

var display;

function runLevel(level, Display) {
    display = new Display(document.getElementById("zoneJeu"), level);
    let state = State.start(level);
    let ending = 1;
    return new Promise(resolve => {
        runAnimation(time => {
            state = state.update(time, arrowKeys);
            display.syncState(state);
            if (state.status == "playing") {
                return true;
            } else if (ending > 0) {
                ending -= time;
                return true;
            } else {
                    // display.clear();

                // donne 50 points quand on gagne
                if (state.status == "won") {
                    let i = 0;
                    var interval = setInterval(function(){ 
                        if (i >= 50) clearInterval(interval);
                        augmenteScore();
                        i++;
                    }, 15);
                }

                // resolve(state.status);
                // return false;
                
                // test

                vie--;
                console.log("vie=" + vie);
                if (vie == 0) {
                    state.status = "lost";
                    resolve(state.status);
                    return false;
                } else {
                    state.status = "playing";
                }

                display.syncState(state);
                console.log("perdu");
                let i2 = 0;
                var interval2 = setInterval(function(){ 
                    if (i2 >= 1) {
                        clearInterval(interval2);
                        state.player.pos = reaperPos;
                        state.player.speed = new Vec(0, 0);
                        state.status = "playing";
                    }
                    display.syncState(state);
                    i2++;
                }, 500);
                return true;
            }
        });
    });
}

async function runGame(plans, Display) {
    vie = 3;
    score = 0;
    coinRestant = 0;
    globalLevel = 1;
    godMod = false;
    let levelrunning;
    let newLevel = true;
    for (let level = 5; level < plans.length;) {
        if (newLevel) {
            levelrunning = new Level(plans[level]);
        }
        let status = await runLevel(levelrunning, Display);
        if (status == "lost") {
            //vie--;
            console.log("lost");
            if (vie == 0) {
                display.gameOver();
                break;
            } else {
                display.clear();
            }
            newLevel = false;
        }
        if (status == "won") {
            display.clear();
            level++;
            globalLevel++;
            newLevel = true;
        }
    }
    console.log("Fin");
}

CanvasDisplay.prototype.gameOver = function () {
    document.getElementById('game-over').style.display = "block";    
    this.cx.fillStyle = "rgba(64, 64, 64, 0.5)";
    this.cx.fillRect(0, 0, this.canvas.width, this.canvas.height);
}

function restartGame() {
    display.clear();
    display = {};
    document.getElementById('game-over').style.display = "none";
    runGame(GAME_LEVELS, CanvasDisplay)
}
