function cloneBoard(chessboard) {
    let newBoard = new GameDisplay.Chessboard(chessboard.size);
    for (let i = 0; i < chessboard.size; i++) {
        for (let j = 0; j < chessboard.size; j++) {
            const src = chessboard.block(i, j);
            const dst = newBoard.block(i, j);
            dst.os = src.os;
            dst.partOfSOS = src.partOfSOS;
            dst.safeO = src.safeO;
            dst.safeS = src.safeS;
            dst.status = {
                fortified: src.status.fortified,
                frozen: src.status.frozen,
                destroyed: src.status.destroyed
            };
        }
    }
    newBoard.currentOS = chessboard.currentOS;
    return newBoard;
}

// Converted GameState to a class
class GameState {
    constructor(chessboard) {
        this.board = chessboard;
    }

    isFull() {
        return this.board.isFull();
    }

    evaluate() {
        return evaluateBoard(this.board);
    }

    clone() {
        return new GameState(cloneBoard(this.board));
    }
}


function simulateFire(board, x, y) {
    const directions = [
        [0, 1],   // down
        [0, -1],  // up
        [1, 0],   // right
        [-1, 0]   // left
    ];

    // Filter valid adjacent tiles
    const validTiles = directions
        .map(([dx, dy]) => [x + dx, y + dy])
        .filter(([nx, ny]) => {
            const tile = board.block(nx, ny);
            return tile && !tile.status.fortified;
        });

    // If there are valid tiles, randomly destroy one
    if (validTiles.length > 0) {
        const [nx, ny] = validTiles[Math.floor(Math.random() * validTiles.length)];
        const tile = board.block(nx, ny);
        tile.status.destroyed = true;
        tile.os = false; // Erase the letter
        tile.status.explosionFrame = 6; // Trigger red flash animation
        console.log(`Fire destroyed tile at (${nx}, ${ny})`);
    }

    return board;
}

function expectiminimaxFire(state, depth, isMaxPlayer) {
    if (depth === 0 || state.isFull()) {
        return state.evaluate();
    }

    const board = state.board;

    if (isMaxPlayer) {
        let maxEval = -Infinity;
        for (let i = 0; i < board.size; i++) {
            for (let j = 0; j < board.size; j++) {
                if (!board.block(i, j).isOccupied()) {
                    ['S', 'O'].forEach(os => {
                        let nextState = state.clone();
                        nextState.board.makeMove(i, j, os);  // <-- this works now
                        let eval = expectiminimaxFire(nextState, depth - 1, false);
                        maxEval = Math.max(maxEval, eval);
                    });
                }
            }
        }
        return maxEval;
    } else {
        let expectedValue = 0;
        const fireProb = 0.3;
        const noEffectProb = 0.7;

        for (let i = 0; i < board.size; i++) {
            for (let j = 0; j < board.size; j++) {
                let fireState = state.clone();
                simulateFire(fireState.board, i, j);
                expectedValue += fireProb * evaluateBoard(fireState.board);
            }
        }

        expectedValue += noEffectProb * evaluateBoard(state.board);
        return expectedValue / (board.size * board.size);
    }
}


function simulateIce(board, x, y) {
    const directions = [
        [0, 1], [0, -1], [1, 0], [-1, 0]
    ];

    for (const [dx, dy] of directions) {
        const tile = board.block(x + dx, y + dy);
        if (tile && tile.status.frozen === 0 && !tile.status.destroyed) {
            // Set frozen status for several cycles to visualize the blue overlay (drawn in Block.draw)
            tile.status.frozen = 1; // adjust duration as needed
            break; // Freeze only one tile
        }
    }

    return board;
}

function simulateEarth(board, x, y) {
    const tile = board.block(x, y);
    if (tile && !tile.status.destroyed) {
        // Set fortified status to indicate protection. The draw code already paints a brown border when fortified > 0.
        tile.status.fortified = 2; // shield remains for 2 turns
        // Optionally add an "earth shield" flag for an extra visual indicator:
        tile.status.earthShield = true;
        setTimeout(() => {
            tile.status.earthShield = false;
            GameDisplay.redraw();
        }, 500);
    }
    return board; 
}

function triggerRandomElemental() {
    const r = Math.random();
    if (r < 0.25) return 'Fire';
    if (r < 0.5) return 'Ice';
    if (r < 0.75) return 'Earth';
    return null;
}

function chooseElementalEffect(board, x, y) {
    let bestScore = -Infinity;
    const scores = {};
    const effects = ['Fire', 'Ice', 'Earth', null]; // include no effect option
    effects.forEach(effect => {
        let simulatedBoard = cloneBoard(board);
        if (effect === 'Fire') {
            simulatedBoard = simulateFire(simulatedBoard, x, y);
        } else if (effect === 'Ice') {
            simulatedBoard = simulateIce(simulatedBoard, x, y);
        } else if (effect === 'Earth') {
            simulatedBoard = simulateEarth(simulatedBoard, x, y);
        }
        // Add a small random factor to the evaluation.
        const evalScore = expectiminimaxFire(new GameState(simulatedBoard), 1, false) + Math.random() * 0.1;
        scores[effect] = evalScore;
        if (evalScore > bestScore) {
            bestScore = evalScore;
        }
    });
    // Collect effects that are within a threshold of the best score (to allow randomness)
    const threshold = 0.8;
    const candidateEffects = effects.filter(effect => Math.abs(scores[effect] - bestScore) <= threshold);

    // Randomly choose one from the candidates
    const chosenEffect = candidateEffects[Math.floor(Math.random() * candidateEffects.length)];
    return chosenEffect;
}

// function applyElementalEffect(element, x, y) {
//     switch (element) {
//         case 'Fire':
//             simulateFire(GameDisplay.chessboard, x, y);
//             animateFireEffect(x, y); // optional animation
//             break;
//         case 'Ice':
//             simulateIce(GameDisplay.chessboard, x, y);
//             break;
//         case 'Earth':
//             simulateEarth(GameDisplay.chessboard, x, y);
//             break;
//     }
// }

function applyElementalEffectWithAI(x, y) {
    // Determine the best elemental effect using expectiminimax
    const bestEffect = chooseElementalEffect(GameDisplay.chessboard, x, y);
    console.log(`Chosen Effect: ${bestEffect}`); // Debug log

    if (bestEffect === 'Fire') {
        console.log("Element: Fire 🔥 - Destroys adjacent tiles (up, down, left, right) turning them into blanks.");
        simulateFire(GameDisplay.chessboard, x, y);
        if (typeof animateFireEffect === 'function') {
            animateFireEffect(x, y);
        }
    } else if (bestEffect === 'Ice') {
        console.log("Element: Ice ❄️ - Freezes one adjacent tile for 1 turn, making the frozen tile unplayable or unchangeable.");
        simulateIce(GameDisplay.chessboard, x, y);
    } else if (bestEffect === 'Earth') {
        console.log("Element: Earth 🟤 - Fortifies a tile for 2 turns. Creates a shield and protects the tile from being destroyed or changed.");
        simulateEarth(GameDisplay.chessboard, x, y);
    } else {
        console.log("No Elemental Effect Applied");
    }
}

function evaluateBoard(board, isAI = true) {
    let score = 0;
    // const aiLetter = isAI ? 'AI' : 'Human'; // customize if needed

    for (let i = 0; i < board.size; i++) {
        for (let j = 0; j < board.size; j++) {
            const b = board.block(i, j);

            if (b.status.destroyed) score -= 1;
            if (b.status.frozen > 0) score -= 0.5;
            if (b.status.fortified > 0) score += 0.5;
            if (b.partOfSOS) score += 1;
        }
    }
    return score;
}

function createElementalLegend() {
    const legend = document.createElement('div');
    legend.innerHTML = `
        <h4>🧪 Elemental Effects</h4>
        <ul style="list-style: none; padding-left: 0;">
            <li>🔥 <b>Fire</b>: Destroys nearby tiles (red flash)</li>
            <li>❄️ <b>Ice</b>: Freezes adjacent tile (blue tint)</li>
            <li>🟤 <b>Earth</b>: Shields tile for 2 turns (brown border)</li>
        </ul>
    `;
    legend.style.padding = '10px';
    legend.style.fontFamily = 'Arial';
    legend.style.fontSize = '14px';
    document.getElementById("legend-container").appendChild(legend);
}

var GameLogger = {
    moves: [],
    winner: null,
    reset: function() {
        this.moves = [];
        this.winner = null;
    },
    logMove: function(player, x, y, letter, element) {
        this.moves.push({
            turn: this.moves.length + 1,
            player,
            x,
            y,
            letter,
            element: element || 'None'
        });
    },
    logResult: function(winner) {
        this.winner = winner;
    },
    export: function() {
        console.log("Match Log", JSON.stringify(this.moves, null, 2));
        console.log("Winner:", this.winner);
    }
};

function loadSOSGame(canvasName, EDGE_LENGTH) {
    'use strict';
    /* Global Variables */
    var canvas = document.getElementById(canvasName);
    
    canvas.style.position = 'relative';
    var ctx = canvas.getContext("2d");

    /* I divide the code into Logic, Display and Control sections according to methods' functionalities for readability */
    // namespace GameDisplay
    var GameDisplay = new function() {

        var GameDisplay = this;
        
        /* Global Variables */
        GameDisplay.OSHeight;
        GameDisplay.OSWidth;
        GameDisplay.blkWidth;
        GameDisplay.blkHeight;
        GameDisplay.OS_FONT_SIZE;
        GameDisplay.FPS = 30;
        GameDisplay.OS_HOVER_TRANS = 1;
        GameDisplay.OS_DEHOVER_TRANS = 0.25;
        GameDisplay.OS_ORI_TRANS = 0;
               
        GameDisplay.Animate = function(target) {
            target.__animateInterval__ = false;
            this.target = target;
        };
        var Animate = GameDisplay.Animate.prototype;
        
        Animate.during = function(condf, func) {
            return function(param) {
                var obj = this;
                if (this.__animateInterval__) {clearInterval(this.__animateInterval__);}
                this.__animateInterval__ = setInterval(function() {
                    if (! condf.call(obj, param)) {clearInterval(obj.__animateInterval__); return;}
                    func.call(obj);
                }, 1000 / GameDisplay.FPS);
            };
        };
        
        GameDisplay.OSClass = function(x, y, os) {
            GameDisplay.Animate(this);
            this.trans = GameDisplay.OS_ORI_TRANS;
            this.C_TRANS = 1 / (0.15 * GameDisplay.FPS);
            this.x = x;
            this.y = y;
            this.os = os;
            this.strans = function(n) { // helper
                if (typeof n === 'undefined') {return this.trans;}
                if (n > 1) {return (this.trans = 1);}
                if (n < 0.1) {return (this.trans = 0);}
                return (this.trans = n);
            };
            var OSClass = this;
            
            // these methods must be defined inside constructor as they use anomynous functions as parameters
            /* animated version */
            //*
            // this.fadein = animate.during(function(lim) {return OSClass.trans < lim}, 
            //                              function() {OSClass.strans(OSClass.trans+OSClass.C_TRANS); GameDisplay.redraw();});
            // this.fadeout = animate.during(function(lim) {return OSClass.trans > lim;},
            //                               function() {OSClass.strans(OSClass.trans-OSClass.C_TRANS); GameDisplay.redraw();});
            // this.fadeto = function(n) {(OSClass.trans < n) ? OSClass.fadein(n) : OSClass.fadeout(n);};
            //*/
            /* no animation version */
            /*
            this.fadein = function(n) {OSClass.strans(n); GameDisplay.redraw();};
            this.fadeout = function(n) {OSClass.strans(n); GameDisplay.redraw();};
            this.fadeto = function(n) {(OSClass.trans < n) ? OSClass.fadein(n) : OSClass.fadeout(n);};
            */

            window.GameDisplay = GameDisplay;
        };
        var OSClass = GameDisplay.OSClass.prototype;
        console.log(GameDisplay.OSClass.prototype);
        
        OSClass.fadein = Animate.during(function(lim) {return this.trans < lim}, 
                                        function() {this.strans(this.trans+this.C_TRANS); GameDisplay.redraw();});
        OSClass.fadeout = Animate.during(function(lim) {return this.trans > lim;},
                                         function() {this.strans(this.trans-this.C_TRANS); GameDisplay.redraw();});
        OSClass.fadeto = function(n) {(this.trans < n) ? this.fadein(n) : this.fadeout(n);};        

        OSClass.draw = function() {
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.font = GameDisplay.OS_FONT_SIZE+"px Arial";
            ctx.strokeStyle ="rgba(0,0,0,"+this.trans+")";
            var tx = this.x + GameDisplay.OSWidth / 2;
            var ty = this.y + GameDisplay.OSHeight / 2;
            ctx.strokeText(this.os, tx, ty);
            // ctx.strokeRect(this.x, this.y, this.width, this.height);
        };
        
        /* Extended Block Class */
        GameDisplay.Block = function(bx, by) {
            this.x = bx * GameDisplay.blkWidth;
            this.y = by * GameDisplay.blkHeight;
            this.bx = bx;
            this.by = by;
            this.os = false;
            this.O = new GameDisplay.OSClass(this.x, this.y, 'O');
            this.S = new GameDisplay.OSClass(this.x + GameDisplay.OSWidth, this.y, 'S');
            this.partOfSOS = false;
            this.safeS = this.safeO = true;

            // Elemental status tracking
            this.status = {
                fortified: 0,   // Earth: >0 means protected
                frozen: 0,      // Ice: >0 means unplayable
                destroyed: false, // Fire: true means empty tile
                recentlyBurned: false,
                explosionFrame: 0 // used for animation
            };
        };

        var Block = GameDisplay.Block.prototype;
        Block.isOccupied = function() {
            return this.os && !this.status.destroyed; // Updated to include destroyed status
        }

        Block.draw = function() {
            if (this.partOfSOS) {ctx.fillStyle = '#FF5648';}
            else {ctx.fillStyle = ((this.bx + this.by) % 2) ? '#7393B3' : '#fff';}
            ctx.fillRect(this.x, this.y, GameDisplay.blkHeight, GameDisplay.blkWidth);
            if (this.isOccupied()) {
                ctx.strokeStyle ="orange";
                ctx.font = GameDisplay.OS_FONT_SIZE+'px Arial';                    
                ctx.strokeText(this.os, this.x + GameDisplay.blkWidth / 2, this.y + GameDisplay.blkHeight / 2);
            } else {
                this.O.draw();
                this.S.draw();
            }
            // Explosion animation overlay
            if (this.status.explosionFrame > 0) {
                ctx.fillStyle = `rgba(255, 0, 0, ${0.6 - this.status.explosionFrame * 0.1})`;
                ctx.fillRect(this.x, this.y, GameDisplay.blkWidth, GameDisplay.blkHeight);
                this.status.explosionFrame--;
                setTimeout(GameDisplay.redraw, 30); // schedule next frame
            }
            // Frozen tiles – show blue overlay
            if (this.status.frozen > 0) {
                ctx.fillStyle = 'rgba(0, 180, 255, 0.3)';
                ctx.fillRect(this.x, this.y, GameDisplay.blkWidth, GameDisplay.blkHeight);
            }

            // Fortified tiles – show brown border
            if (this.status.fortified > 0) {
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 4;
                ctx.strokeRect(this.x + 2, this.y + 2, GameDisplay.blkWidth - 4, GameDisplay.blkHeight - 4);
            }
            if (this.status.earthShield) {
                ctx.strokeStyle = 'gold';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x + 4, this.y + 4, GameDisplay.blkWidth - 8, GameDisplay.blkHeight - 8);
            }
        };
        Block.dehover = function() {
            this.O.fadeout(0);
            this.S.fadeout(0);
        }
        Block.click = function(os) {
            this.os = os;
            delete this.O;
            delete this.S;
            GameDisplay.clear();
            GameDisplay.draw();
        }
        
        /* Chessboard Class */
        GameDisplay.Chessboard = function(size) {
            this.size = size;
            this.currentOS = 0;
            this.mcb = [];
            // create a size x size chessboard;
            for (var i = 0; i < this.size; ++i) {
                this.mcb.push([]);
                for (var j = 0; j < this.size; ++j) {
                    this.mcb[i].push(new GameDisplay.Block(i, j));
                }
            }
        }
        
        /* Player Class */
        GameDisplay.Player = function(name, type) {
            this.name = name;
            this.type = type;
            this.score = 0;
            
            this.div = document.createElement('DIV');
            canvas.parentNode.insertBefore(this.div, canvas.nextSibling);
            this.redrawScore();
        }
        var Player = GameDisplay.Player.prototype;
        Player.redrawScore = function() {
            this.div.innerHTML = this.name+" score: "+this.score;
        }
        
        GameDisplay.clear = function() {
            ctx.clearRect(0,0,canvas.width,canvas.height);
        };
        
        GameDisplay.draw = function() {
            for (var i = 0; i < this.chessboard.size; i++) {
                for (var j = 0; j < this.chessboard.size; j++) {
                    this.chessboard.block(i, j).draw();
                }
            }
        };
        
        GameDisplay.redraw = function() {this.clear(); this.draw();}
        
        GameDisplay.hoverAnimation = function(bx, by, os) {
            var bl = this.chessboard.block(bx, by);
            
            if (os === 'S' && ! bl.isOccupied()) {
                bl.S.fadein(GameDisplay.OS_HOVER_TRANS);
                bl.O.fadeto(GameDisplay.OS_DEHOVER_TRANS);
            } else if (os === 'O' && ! bl.isOccupied()) {
                bl.O.fadein(GameDisplay.OS_HOVER_TRANS);
                bl.S.fadeto(GameDisplay.OS_DEHOVER_TRANS);
            }
        };
        
        GameDisplay.dehoverAnimation = function(bx, by) {
            console.log('dehoverAnimation');
            var bl = this.chessboard.block(bx,by);
            if (bl.isOccupied()) {return;}
            bl.dehover();
        }
        
        GameDisplay.clickAnimation = function(bx, by, os) {
            this.chessboard.block(bx,by).click(os);
        }
        
        GameDisplay.blockX = function(x) {
            var bx = Math.floor(x / GameDisplay.blkWidth); 
            return (bx < this.chessboard.size) ? bx : false;
        };
        
        GameDisplay.blockY = function(y) {
            var by = Math.floor(y / GameDisplay.blkHeight);
            return (by < this.chessboard.size) ? by : false;
        };
        
        GameDisplay.blockM = function(x, y) {
            if (this.blockX(x) < this.chessboard.size && this.blockY(y) < this.chessboard.size) {
                return x / GameDisplay.blkWidth % 1 > 0.5 ? "S" : "O";
            } else {
                return false;
            }
        };


        GameDisplay.Chessboard.prototype.statusUpdate = function() {
            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    let block = this.block(i, j);
                    // Decrement Fortified
                    if (block.status.fortified > 0) {
                        block.status.fortified--;
                    }
                    // Decrement Frozen
                    if (block.status.frozen > 0) {
                        block.status.frozen--;
                    }
                }
            }
        };
         
        GameDisplay.drawGameOver = function(str) {
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#000';
            ctx.font = GameDisplay.OS_FONT_SIZE/3 + 'px Aprial';
            ctx.fillText(str, canvas.width/2, canvas.height/2);
            ctx.font = GameDisplay.OS_FONT_SIZE/4 + 'px Aprial';
            ctx.fillText('Retry', canvas.width/2, canvas.height/2 + GameDisplay.OS_FONT_SIZE/4);
        }  
        
        GameDisplay.start = function(size) {
            // var EDGE_LENGTH = Math.min(canvas.parentNode.offsetHeight, canvas.parentNode.offsetWidth, window.innerHeight, window.innerWidth);
            this.blkHeight = this.blkWidth = this.OSHeight = EDGE_LENGTH / size;
            this.OSWidth = this.OSHeight / 2;
            this.OS_FONT_SIZE = this.OSWidth - 5;
            canvas.width = canvas.height = size * GameDisplay.blkHeight;
            this.chessboard = new this.Chessboard(size);
        }
        
    };

    /* I divide the code into Logic, Display and Control sections according to method functionalities for readability */
    // namespace GameLogic
    var GameLogic = new function() {
        var GameLogic = this;
        
        /* Gloable Varible */
        GameLogic.chessboard;
        // shorthands. going to directly mutate the GameDisplay.Chessboard prototype
        var Chessboard = GameDisplay.Chessboard.prototype;

        Chessboard.isFull = function() {
            return this.currentOS === this.size * this.size;
        }
        
        Chessboard.block = function(bx, by) {
            if (bx >= 0 && bx < this.size && by >= 0 && by < this.size) {
                return this.mcb[bx][by];
            } else {
                return false;
            }
        }
        
        Chessboard.makeMove = function(bx, by, os) {
            this.currentOS++; 
            // change the surrounding's safeO/S fields
            this.block(bx, by).os = os;
            var Chessboard = this;
            function fO(bx, by) {var b = Chessboard.block(bx, by); if (b) {b.safeO = false;}}
            function fS(bx, by) {var b = Chessboard.block(bx, by); if (b) {b.safeS = false;}}
            if (os === 'O') {
                fS(bx+1,by); 
                fS(bx-1,by); 
                fS(bx,by+1); 
                fS(bx,by-1); 
                fS(bx+1,by+1); 
                fS(bx+1,by-1); 
                fS(bx-1,by+1); 
                fS(bx-1,by-1);
                
                fO(bx+2,by);
                fO(bx-2,by);
                fO(bx,by+2);
                fO(bx,by-2);
                fO(bx+2,by+2);
                fO(bx+2,by-2);
                fO(bx-2,by-2);
                fO(bx-2,by+2);
            } else {
                fO(bx+1,by); 
                fO(bx-1,by); 
                fO(bx,by+1); 
                fO(bx,by-1); 
                fO(bx+1,by+1); 
                fO(bx+1,by-1); 
                fO(bx-1,by+1); 
                fO(bx-1,by-1);
                                
                fS(bx+2,by);
                fS(bx-2,by);
                fS(bx,by+2);
                fS(bx,by-2);
                fS(bx+2,by+2);
                fS(bx+2,by-2);
                fS(bx-2,by-2);
                fS(bx-2,by+2);
            }
            // if made SOS, then turn the blocks to other color
            var ls = this.hasSOS(bx, by, os);
            for (var i = 0; i < ls.length; i++) {
                ls[i][0].partOfSOS = ls[i][1].partOfSOS = ls[i][2].partOfSOS = true;
            }
            GameDisplay.redraw();
        };
        
        Chessboard.isOccupied = function(bx, by) {return GameDisplay.chessboard.block(bx, by).os;}
        
        Chessboard.hasSOS = function(bx, by, os) {
            function neg(os) {return (os === 'S' ? 'O' : 'S');}
            var ls = [];
            if (os === 'S') {
                if (this.block(bx, by + 1).os === neg(os) && this.block(bx, by + 2).os === os) {ls.push([this.block(bx, by), this.block(bx, by + 1), this.block(bx, by + 2)]);}
                if (this.block(bx + 1, by + 1).os === neg(os) && this.block(bx + 2, by + 2).os === os) {ls.push([this.block(bx, by), this.block(bx + 1, by + 1), this.block(bx + 2, by + 2)]);}
                if (this.block(bx + 1, by).os === neg(os) && this.block(bx + 2, by).os === os) {ls.push([this.block(bx, by), this.block(bx + 1, by), this.block(bx + 2, by)]);}
                if (this.block(bx + 1, by - 1).os === neg(os) && this.block(bx + 2, by - 2).os === os) {ls.push([this.block(bx, by), this.block(bx + 1, by - 1), this.block(bx + 2, by - 2)]);}
                if (this.block(bx, by - 1).os === neg(os) && this.block(bx, by - 2).os === os) {ls.push([this.block(bx, by), this.block(bx, by - 1), this.block(bx, by - 2)]);}
                if (this.block(bx - 1, by - 1).os === neg(os) && this.block(bx - 2, by - 2).os === os) {ls.push([this.block(bx, by), this.block(bx - 1, by - 1), this.block(bx - 2, by - 2)]);}
                if (this.block(bx - 1, by).os === neg(os) && this.block(bx - 2, by).os === os) {ls.push([this.block(bx, by), this.block(bx - 1, by), this.block(bx - 2, by)]);}
                if (this.block(bx - 1, by + 1).os === neg(os) && this.block(bx - 2, by + 2).os === os) {ls.push([this.block(bx, by), this.block(bx - 1, by + 1), this.block(bx - 2, by + 2)]);}
            } else if (os === 'O') {
                if (this.block(bx + 1, by).os === neg(os) && this.block(bx - 1, by).os === neg(os)) {ls.push([this.block(bx, by), this.block(bx + 1, by), this.block(bx - 1, by)]);}
                if (this.block(bx + 1, by + 1).os === neg(os) && this.block(bx - 1, by - 1).os === neg(os)) {ls.push([this.block(bx, by), this.block(bx + 1, by + 1), this.block(bx - 1, by - 1)]);}
                if (this.block(bx, by + 1).os === neg(os) && this.block(bx, by - 1).os === neg(os)) {ls.push([this.block(bx, by), this.block(bx, by + 1), this.block(bx, by - 1)]);}
                if (this.block(bx - 1, by + 1).os === neg(os) && this.block(bx + 1, by - 1).os === neg(os)) {ls.push([this.block(bx, by), this.block(bx - 1, by + 1), this.block(bx + 1, by - 1)]);}
            }
            return ls;
        }
        
        Chessboard.moveAble = function(bx, by) {
            var b = this.block(bx, by);
            if (b.safeO && b.safeS) {return 'S';}
            if (b.safeS) {return 'S';}
            if (b.safeO) {return 'O';}
            return false;
        }
        
        Chessboard.isSafe = function(bx, by, os) {
            if (os === 'O') {
                return (! ((this.block(bx-1, by).os === false && this.block(bx+1, by).os === 'S') ||
                           (this.block(bx+1, by).os === false && this.block(bx-1, by).os === 'S') ||
                           (this.block(bx, by-1).os === false && this.block(bx, by+1).os === 'S') ||
                           (this.block(bx, by+1).os === false && this.block(bx, by-1).os === 'S') ||
                           (this.block(bx-1, by-1).os === false && this.block(bx+1, by+1).os === 'S') ||
                           (this.block(bx-1, by+1).os === false && this.block(bx+1, by-1).os === 'S') ||
                           (this.block(bx+1, by+1).os === false && this.block(bx-1, by-1).os === 'S') ||
                           (this.block(bx+1, by-1).os === false && this.block(bx-1, by+1).os === 'S')))
            } else
            if (os === 'S') {
                return (! ((this.block(bx+2, by).os === 'S' && this.block(bx+1, by).os === false) ||
                           (this.block(bx+2, by+2).os === 'S' && this.block(bx+1, by+1).os === false) ||
                           (this.block(bx, by+2).os === 'S' && this.block(bx, by+1).os === false) ||
                           (this.block(bx-2, by+2).os === 'S' && this.block(bx-1, by+1).os === false) ||
                           (this.block(bx-2, by).os === 'S' && this.block(bx-1, by).os === false) ||
                           (this.block(bx-2, by-2).os === 'S' && this.block(bx-1, by-1).os === false) ||
                           (this.block(bx, by-2).os === 'S' && this.block(bx, by-1).os === false) ||
                           (this.block(bx+2, by-2).os === 'S' && this.block(bx+1, by-1).os === false) || 
                           
                           (this.block(bx+1, by).os === 'O' && this.block(bx+2, by).os === false) ||
                           (this.block(bx+1, by+1).os === 'O' && this.block(bx+2, by+2).os === false) ||
                           (this.block(bx, by+1).os === 'O' && this.block(bx, by+2).os === false) ||
                           (this.block(bx-1, by+1).os === 'O' && this.block(bx-2, by+2).os === false) ||
                           (this.block(bx-1, by).os === 'O' && this.block(bx-2, by).os === false) ||
                           (this.block(bx-1, by-1).os === 'O' && this.block(bx-2, by-2).os === false) ||
                           (this.block(bx, by-1).os === 'O' && this.block(bx, by-2).os === false) ||
                           (this.block(bx+1, by-1).os === 'O' && this.block(bx+2, by-2).os === false)))
            }
        }
        
        GameLogic.randomOS = function() {
            return (Math.random() > 0.5) ? 'S' : 'O';
        }

    

    };
    
    /* I divide the code into Logic, Display and Control sections according to methods' functionalities for readability */
    // namespace GameControl
    var GameControl = new function() {
        
        var GameControl = this;
        
        // shorthands. going to directly mutate the GameDisplay.Chessboard prototype
        var Player = GameDisplay.Player.prototype;
        
        Player.usrMove = function(callback) {
            var Player = this;
            var prevX = false;
            var prevY = false;
            var prevOS = false;
            
            var mousemove = function(event) {
                var bx = GameDisplay.blockX(event.offsetX);
                var by = GameDisplay.blockY(event.offsetY);
                var os = GameDisplay.blockM(event.offsetX, event.offsetY);
                if (bx !== false && by !== false && (os !== prevOS || bx !== prevX || by !== prevY)) { // if the mouse is on a different O/S from last time, play hover animation // if mouse is in a chessboard block
                    GameDisplay.hoverAnimation(bx, by, os);
                }
                if (prevX !== false && prevY !== false && (prevX !== bx || prevY !== by)) { // if the block has changed, play dehover animations on the block
                    console.log("GameDisplay: call dehoverAnimation on", prevX+' '+prevY+' '+prevOS);
                    GameDisplay.dehoverAnimation(prevX, prevY, prevOS);
                }
                prevOS = os;
                prevX = bx;
                prevY = by;
            }
            
            var click = function(event) {
                
                var bx = GameDisplay.blockX(event.offsetX);
                var by = GameDisplay.blockY(event.offsetY);
                var os = GameDisplay.blockM(event.offsetX, event.offsetY);
                
                if (bx === false || by === false) {return;}
                if (GameDisplay.chessboard.isOccupied(bx, by)) {return;}
                
                canvas.removeEventListener("mousemove", mousemove, false);
                canvas.removeEventListener("click", click, false);
                GameDisplay.clickAnimation(bx, by, os);
                GameDisplay.chessboard.makeMove(bx, by, os);
                GameDisplay.chessboard.statusUpdate();
                GameLogger.logMove("Human", bx, by, os, "None");
                // const element = triggerRandomElemental();
                // applyElementalEffect(element, bx, by);
                applyElementalEffectWithAI(bx, by);
                
                var r;
                if ((r = GameDisplay.chessboard.hasSOS(bx, by, os).length)) {
                    Player.score += r;
                    Player.redrawScore();
                    Player.makeMove(callback);
                } else {
                    setTimeout(callback, 1000);
                }
                
                
            }
            
            canvas.addEventListener("mousemove", mousemove, false);
            canvas.addEventListener("click", click, false);
        };
        
        Player.cmpMove = function(callback) {
            var Player = this;
            var r;
            var cb = GameDisplay.chessboard;
            for (var i = 0; i < cb.size; i++) {
                for (var j = 0; j < cb.size; j++) {
                    if (! cb.isOccupied(i, j)) { // if found a move to make SOS
                        if ((r = cb.hasSOS(i, j, 'S').length)) {
                            cb.makeMove(i, j, 'S');
                            applyElementalEffectWithAI(i, j);
                        } else
                        if ((r = cb.hasSOS(i, j, 'O').length)) {
                            cb.makeMove(i, j, 'O');
                            applyElementalEffectWithAI(i, j);
                        } else {
                            continue;
                        }
                        Player.score += r;
                        Player.redrawScore();
                        cb.statusUpdate();
                        setTimeout(function() {Player.makeMove(callback)}, 1000); // make another move after 1 second
                        return;
                    }
                }
            }
            // if there no move to make SOS
            var moveAbleLs = [];
            var unmoveAble;
            for (var i = 0; i < cb.size; i++) {
                for (var j = 0; j < cb.size; j++) {
                    if (! cb.isOccupied(i, j)) {
                        var boolS = cb.isSafe(i, j, 'S');
                        var boolO = cb.isSafe(i, j, 'O');
                        if (boolO && boolS) {
                            moveAbleLs.push({"bx":i, "by":j, "os": GameLogic.randomOS()});
                        } else
                        if (boolS) {
                            moveAbleLs.push({"bx":i, "by":j, "os": 'S'});
                        } else 
                        if (boolO) {
                            moveAbleLs.push({"bx":i, "by":j, "os": 'O'});
                        } else {
                            unmoveAble = {"bx":i, "by":j, "os": GameLogic.randomOS()};
                            continue;
                        }
                    }
                }
            }
            // if all moves are dangrous, just pick one.
            if (! moveAbleLs.length) {
                cb.makeMove(unmoveAble.bx, unmoveAble.by, unmoveAble.os);
            } else {
                var idx = Math.floor(Math.random() * moveAbleLs.length);
                var m = moveAbleLs[idx];
                cb.makeMove(m.bx, m.by, m.os);
            }
            callback();
        }
    
        Player.makeMove = function(callback) {
            if (GameDisplay.chessboard.isFull()) {
                GameControl.gameOver(); return;}
            this.type === 'Human' ? this.usrMove(callback) : this.cmpMove(callback);
        }
        
        GameControl.gameStart = function(size) {
            console.log(canvas.parentNode.offsetHeight, canvas.parentNode.offsetWidth);
            this.A = new GameDisplay.Player("Your", 'Human');
            this.B = new GameDisplay.Player("Opponent's", 'AI');
            this.reset = document.createElement('button');
            this.reset.innerHTML = 'Reset';
            canvas.parentNode.appendChild(this.reset);
            this.reset.onclick = GameControl.gameReset;
            
            GameDisplay.start(size);
            createElementalLegend();
            GameDisplay.draw();
            
            (function callback() {GameControl.A.makeMove(function() {GameControl.B.makeMove(callback)})})();
        }
        
        GameControl.gameReset = function() {
            canvas.parentNode.removeChild(GameControl.A.div);
            canvas.parentNode.removeChild(GameControl.B.div);
            canvas.parentNode.removeChild(GameControl.reset);
            delete GameControl.A;   
            delete GameControl.B;  
            var s = GameDisplay.chessboard.size; 
            delete GameDisplay.chessboard;
            GameDisplay.clear();   
            GameControl.gameStart(s);
        }
        
        GameControl.gameOver = function() {
            if (this.A.score > this.B.score) {
                GameDisplay.drawGameOver('You Won');
            } else
            if (this.A.score < this.B.score) {
                GameDisplay.drawGameOver('You Lost');
            } else {
                GameDisplay.drawGameOver('Draw');
            }
            var f = function() {
                GameControl.gameReset();
                canvas.removeEventListener('click', f);  
                GameLogger.logResult('Draw' | 'You Won' | 'You Lost');
                GameLogger.export();  // print in dev console              
            };
            canvas.addEventListener('click', f);
        }
        
    }
    
    /* Main */
    GameControl.gameStart(5);
}
