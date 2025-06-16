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
            if (!tile) return false; // Skip out-of-bounds tiles
            if (!tile.os) return false; // Skip empty tiles
            if (tile.status.fortified || tile.status.earthShield) return false; // Skip protected tiles
            if (tile.partOfSOS) return false; // Skip SOS tiles
            if (tile.status.frozen > 0) return false; // Skip frozen tiles
            return true; // Valid tile
        });

    // Apply fire effect to all valid tiles
    validTiles.forEach(([nx, ny], index) => {
        setTimeout(() => {
            const tile = board.block(nx, ny);
            console.log(`Applying fire effect to tile at (${nx}, ${ny})`);
            tile.os = false; // Remove the letter (S or O)
            tile.status.explosionFrame = 12; // Trigger red flash animation
            tile.status.destroyed = true; // Mark tile as destroyed

            // // Play burn sound
            // GameDisplay.playBurnSound();

            // Reset the tile after the Fire effect
            setTimeout(() => {
                tile.status.destroyed = false; // Allow the tile to receive inputs again
                GameDisplay.redraw(); // Redraw the board to reflect the reset
                console.log(`Tile at (${nx}, ${ny}) is now playable again.`);
            }, 1000); // Reset after 1 second
        }, index * 500); // Delay each tile by 500ms
    });

    // Debug log for tiles processed
    if (validTiles.length === 0) {
        console.log(`No valid tiles for Fire effect at (${x}, ${y})`);
    } else {
        // Add a final delay to ensure the effect lasts at least 1 second
        setTimeout(() => {
            console.log("Fire effect completed.");
        }, validTiles.length * 500);
    }

    return board;
}

const effectScores = {
    Fire: 3,   // Fire adds +3 to the score
    Ice: -1,   // Ice subtracts -1 from the score
    Earth: 1   // Earth adds +1 to the score
};

function expectiminimax(state, depth, isMaxPlayer) {
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
                        nextState.board.makeMove(i, j, os);
                        let eval = expectiminimax(nextState, depth - 1, false);
                        maxEval = Math.max(maxEval, eval);
                    });
                }
            }
        }
        return maxEval;
    } else {
        let expectedValue = 0;
        const probabilities = { Fire: 0.35, Ice: 0.30, Earth: 0.25 };

        for (const effect in probabilities) {
            let simulatedState = state.clone();

            // Apply the elemental effect
            if (effect === 'Fire') {
                simulateFire(simulatedState.board, 0, 0); // Example position (0, 0)
            } else if (effect === 'Ice') {
                simulateIce(simulatedState.board, 0, 0); // Example position (0, 0)
            } else if (effect === 'Earth') {
                simulateEarth(simulatedState.board, 0, 0); // Example position (0, 0)
            }

            // Evaluate the board and add the effect's score
            const evalScore = evaluateBoard(simulatedState.board) + effectScores[effect];
            expectedValue += probabilities[effect] * evalScore;
        }

        return expectedValue;
    }
}


function simulateIce(board, x, y) {
    const directions = [
        [0, 1], [0, -1], [1, 0], [-1, 0]
    ];

    // Filter valid adjacent tiles that are not part of an SOS
    const validTiles = directions
        .map(([dx, dy]) => [x + dx, y + dy])
        .filter(([nx, ny]) => {
            const tile = board.block(nx, ny);
            if (!tile) return false; // Skip out-of-bounds tiles
            if (tile.status.frozen > 0) return false; // Skip already frozen tiles
            if (tile.status.destroyed) return false; // Skip destroyed tiles
            if (tile.partOfSOS) return false; // Skip SOS tiles
            return true; // Valid tile
        });

    // If there are valid tiles, freeze one
    if (validTiles.length > 0) {
        const [nx, ny] = validTiles[Math.floor(Math.random() * validTiles.length)];
        const tile = board.block(nx, ny);
        tile.status.frozen = 1; // Freeze for 3 turns
        tile.status.effectApplied = true; // Mark as applied

        // // Play freeze sound
        // GameDisplay.playFreezeSound();
        console.log(`Ice froze tile at (${nx}, ${ny})`);
    } else {
        console.log(`No valid tiles for Ice effect at (${x}, ${y})`);
    }

    return board;
}

function simulateEarth(board, x, y) {
    const tile = board.block(x, y);

    // Only fortify the tile if it is not part of an SOS
    if (tile && !tile.status.destroyed && !tile.partOfSOS) {
        tile.status.fortified = 3; // Shield remains for 2 turns
        tile.status.earthShield = true; // Optional visual indicator

        // // Play earth sound
        // GameDisplay.playEarthSound();

        setTimeout(() => {
            tile.status.earthShield = false;
            GameDisplay.redraw();
        }, 500);
        console.log(`Earth fortified tile at (${x}, ${y})`);
    } else {
        console.log(`Tile at (${x}, ${y}) is not valid for Earth effect.`);
    }

    return board;
}

function triggerRandomElemental() {
    const effects = ['Fire', 'Ice', 'Earth'];
    const probabilities = [0.35, 0.30, 0.25]; // Fire: 35%, Ice: 30%, Earth: 25%
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < effects.length; i++) {
        cumulative += probabilities[i];
        if (r < cumulative) return effects[i];
    }
    return 'Fire'; // Default to Fire if something goes wrong (shouldn't happen)
}

function chooseElementalEffect(board, x, y) {
    let bestScore = -Infinity;
    const scores = {};
    const effects = ['Fire', 'Ice', 'Earth']; // include no effect option
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
        const evalScore = expectiminimax(new GameState(simulatedBoard), 1, false) + Math.random() * 0.1;
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

    // Return the applied effect
    return bestEffect;
}

function evaluateBoard(board) {
    const weights = {
        destroyed: -1,
        frozen: -0.5,
        fortified: 0.5,
        partOfSOS: 1
    };

    let score = 0;
    for (let i = 0; i < board.size; i++) {
        for (let j = 0; j < board.size; j++) {
            const b = board.block(i, j);

            if (b.status.destroyed) score += weights.destroyed;
            if (b.status.frozen > 0) score += weights.frozen;
            if (b.status.fortified > 0) score += weights.fortified;
            if (b.partOfSOS) score += weights.partOfSOS;
        }
    }
    return score;
}

function createElementalLegend() {
    const legendContainer = document.getElementById("legend-container");

    // Clear existing legend content
    legendContainer.innerHTML = '';

    // Create and append the new legend
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

    legendContainer.appendChild(legend);
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
            element: element
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

    // Audio elements
    const backgroundMusic = new Audio('music.mp3');
    const burnSound = new Audio('burn.mp3');
    const earthSound = new Audio('earth.mp3');
    const freezeSound = new Audio('freeze.mp3');
    const invalidSound = new Audio('invalid.mp3');

    // Set default volume
    backgroundMusic.volume = 0.3;
    burnSound.volume = 0.5;
    earthSound.volume = 0.5;
    freezeSound.volume = 0.5;
    invalidSound.volume = 0.5;

    // Loop background music
    backgroundMusic.loop = true;
    backgroundMusic.play();

    // Wait for user interaction before playing background music
    document.addEventListener('click', function startMusic() {
        backgroundMusic.play().catch(error => {
            console.log("Error playing background music:", error);
        });
        document.removeEventListener('click', startMusic); // Remove the listener after the first interaction
    });


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
                if (this.__animateInterval__) {
                    clearInterval(this.__animateInterval__);
                }
                this.__animateInterval__ = setInterval(function() {
                    if (! condf.call(obj, param)) {
                        clearInterval(obj.__animateInterval__); return;
                    }
                    func.call(obj);
                }, 1000 / GameDisplay.FPS);
            };
        };
        
        GameDisplay.OSClass = function(x, y, os) {
            GameDisplay.Animate(this);
            this.trans = GameDisplay.OS_ORI_TRANS;
            this.C_TRANS = 1 / (0.1 * GameDisplay.FPS);
            this.x = x;
            this.y = y;
            this.os = os;
            this.strans = function(n) { // helper
                if (typeof n === 'undefined') {return this.trans;}
                if (n > 1) {return (this.trans = 1);}
                if (n < 0.1) {return (this.trans = 0);}
                return (this.trans = n);
            };
            // var OSClass = this;

            window.GameDisplay = GameDisplay; // This line is fine if `GameDisplay` needs to be globally accessible.
        };
        var OSClass = GameDisplay.OSClass.prototype;
        console.log(GameDisplay.OSClass.prototype);
        
        OSClass.fadein = Animate.during(function(lim) {
            return this.trans < lim
        }, function() {
            this.strans(this.trans+this.C_TRANS); 
            GameDisplay.redraw();
        });

        OSClass.fadeout = Animate.during(function(lim) {
            return this.trans > lim;
        }, function() {
            this.strans(this.trans-this.C_TRANS); 
            GameDisplay.redraw();
        });

        OSClass.fadeto = function(n) {
            (this.trans < n) ? this.fadein(n) : this.fadeout(n);
        };        

        OSClass.draw = function() {
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.font = GameDisplay.OS_FONT_SIZE + "px Arial";
            ctx.strokeStyle ="rgba(0,0,0," + this.trans +")";
            var tx = this.x + GameDisplay.OSWidth / 2;
            var ty = this.y + GameDisplay.OSHeight / 2;
            ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
            ctx.shadowBlur = 5;
            ctx.fillStyle = "rgba(255, 255, 255, " + this.trans + ")";
            ctx.fillText(this.os, tx, ty);
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
            if (this.partOfSOS) {
                ctx.fillStyle = '#FF5648';
            }
            else {
                ctx.fillStyle = ((this.bx + this.by) % 2) ? '#f3e0d1' : '#fcf5f0';
            }
            ctx.fillRect(this.x, this.y, GameDisplay.blkHeight, GameDisplay.blkWidth);

            if (this.isOccupied()) {
                ctx.fillStyle = "#5e3900"; // Set the fill color for the text
                ctx.font = GameDisplay.OS_FONT_SIZE + 'px Arial';
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(this.os, this.x + GameDisplay.blkWidth / 2, this.y + GameDisplay.blkHeight / 2); // Filled text
            } else {
                if (this.O) this.O.draw(); // Check if `O` exists before calling `draw`
                if (this.S) this.S.draw();
            }

            // Explosion animation overlay
            if (this.status.explosionFrame > 0) {
                ctx.fillStyle = `rgba(255, 69, 0, ${0.6 - this.status.explosionFrame * 0.1})`; // Flame orange;
                ctx.fillRect(this.x, this.y, GameDisplay.blkWidth, GameDisplay.blkHeight);
                this.status.explosionFrame--;
                setTimeout(GameDisplay.redraw, 60); // Schedule next frame
            }

            // Frozen tiles – show blue overlay
            if (this.status.frozen > 0) {
                ctx.fillStyle = 'rgba(173, 216, 230, 0.5)';;
                ctx.fillRect(this.x, this.y, GameDisplay.blkWidth, GameDisplay.blkHeight);
                ctx.strokeStyle = '#00BFFF'; // Icy blue border
                ctx.lineWidth = 3;
                ctx.strokeRect(this.x, this.y, GameDisplay.blkWidth, GameDisplay.blkHeight);
            }
            
            // EarthShield visual effect
            if (this.status.earthShield) {
                const glowAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 200); // Pulsating glow
                ctx.strokeStyle = `rgba(34, 139, 34, ${glowAlpha})`; // Green glow
                ctx.lineWidth = 4;
                ctx.strokeRect(this.x + 2, this.y + 2, GameDisplay.blkWidth - 4, GameDisplay.blkHeight - 4);
            }

            // Fortified tiles – show brown border
            if (this.status.fortified > 0) {
                ctx.strokeStyle = 'rgba(139, 69, 19, 0.8)'; // Earthy brown
                ctx.lineWidth = 4;
                ctx.strokeRect(this.x + 2, this.y + 2, GameDisplay.blkWidth - 4, GameDisplay.blkHeight - 4);
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

            // Create a size x size chessboard;
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
            this.div.className = 'player-score';
            canvas.parentNode.insertBefore(this.div, canvas.nextSibling);
            this.redrawScore();
        }

        var Player = GameDisplay.Player.prototype;
        Player.redrawScore = function() {
            this.div.innerHTML = this.name + " score: " + this.score;
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
        
        GameDisplay.redraw = function() {
            GameDisplay.clear(); 
            GameDisplay.draw();
        }.bind(GameDisplay);
        
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
            // console.log('dehoverAnimation');
            var bl = this.chessboard.block(bx,by);
            if (bl.isOccupied()) {
                return;
            }
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
            if (this.blockX(x) < this.chessboard.size 
                && this.blockY(y) < this.chessboard.size) {
                return x / GameDisplay.blkWidth % 1 > 0.5 ? "S" : "O";
            } else {
                return false;
            }
        };

        GameDisplay.Chessboard.prototype.statusUpdate = function() {
            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    let block = this.block(i, j);
                    if (block.status.fortified > 0) {
                        block.status.fortified--;
                    }
                    if (block.status.frozen > 0) {
                        block.status.frozen--;
                    }
                    // Reset earthShield after its duration
                    if (block.status.earthShield && block.status.fortified === 0) {
                        block.status.earthShield = false;
                    }
                    // Reset effectApplied flag for the next turn
                    block.status.effectApplied = false;
                }
            }
        };

        GameDisplay.Chessboard.prototype.hasValidMoves = function() {
            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    const block = this.block(i, j);
                    if (!block.isOccupied() && block.status.frozen === 0 && !block.partOfSOS) {
                        return true; // At least one valid move exists
                    }
                }
            }
            return false; // No valid moves left
        };
         
        GameDisplay.drawGameOver = function(str) {
            ctx.fillStyle = 'rgba(79, 58, 52, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#f3e0d1';
            ctx.font = GameDisplay.OS_FONT_SIZE/3 + 'px Arial';
            ctx.fillText(str, canvas.width/2, canvas.height/2);
            ctx.font = GameDisplay.OS_FONT_SIZE/4 + 'px Arial';
            ctx.fillText('Retry', canvas.width/2, canvas.height/2 + GameDisplay.OS_FONT_SIZE/4);
        }  
        
        GameDisplay.start = function(size) {
            this.blkHeight = this.blkWidth = this.OSHeight = EDGE_LENGTH / size;
            this.OSWidth = this.OSHeight / 2;
            this.OS_FONT_SIZE = this.OSWidth - 5;
            canvas.width = canvas.height = size * GameDisplay.blkHeight;
            this.chessboard = new this.Chessboard(size);
        }
        
        // Play sound effects for specific actions
        GameDisplay.playBurnSound = function () {
            burnSound.currentTime = 0; // Reset sound to start
            burnSound.play();
        };

        GameDisplay.playEarthSound = function () {
            earthSound.currentTime = 0;
            earthSound.play();
        };

        GameDisplay.playFreezeSound = function () {
            freezeSound.currentTime = 0;
            freezeSound.play();
        };

        GameDisplay.playInvalidSound = function () {
            invalidSound.currentTime = 0;
            invalidSound.play();
        };
    };

    /* I divide the code into Logic, Display and Control sections according to method functionalities for readability */
    // namespace GameLogic
    var GameLogic = new function() {
        var GameLogic = this;
        
        /* Global Varible */
        GameLogic.chessboard;
        // Going to directly mutate the GameDisplay.Chessboard prototype
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
            const block = this.block(bx, by);

            // Prevent moves on frozen tiles
            if (block.status.frozen > 0) {
                console.log(`Move not allowed: Tile at (${bx}, ${by}) is frozen.`);
                return false; // Indicate that the move was not successful
            }

            this.currentOS++; 
            // Change the surrounding's safeO/S fields
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
            // // if made SOS, then turn the blocks to other color
            // var ls = this.hasSOS(bx, by, os);
            // for (var i = 0; i < ls.length; i++) {
            //     ls[i][0].partOfSOS = ls[i][1].partOfSOS = ls[i][2].partOfSOS = true;
            // }
            // GameDisplay.redraw();
            
            // Check for SOS and update tiles
            const sosList = this.hasSOS(bx, by, os);
            for (let i = 0; i < sosList.length; i++) {
                sosList[i][0].partOfSOS = sosList[i][1].partOfSOS = sosList[i][2].partOfSOS = true;
            }

            GameDisplay.redraw();
            return true; // Indicate that the move was successful
        };
        
        Chessboard.isOccupied = function(bx, by) {return GameDisplay.chessboard.block(bx, by).os;}
        
        Chessboard.hasSOS = function(bx, by, os) {
            function neg(os) {return (os === 'S' ? 'O' : 'S');}
            var ls = [];
            if (os === 'S') {
                if (this.block(bx, by + 1).os === neg(os) && this.block(bx, by + 2).os === os) {
                    ls.push([this.block(bx, by), 
                        this.block(bx, by + 1), 
                        this.block(bx, by + 2)]);
                    }
            
                if (this.block(bx + 1, by + 1).os === neg(os) && this.block(bx + 2, by + 2).os === os) {
                    ls.push([this.block(bx, by), 
                    this.block(bx + 1, by + 1), 
                    this.block(bx + 2, by + 2)]);
                }
                if (this.block(bx + 1, by).os === neg(os) && this.block(bx + 2, by).os === os) {
                    ls.push([this.block(bx, by), 
                    this.block(bx + 1, by), 
                    this.block(bx + 2, by)]);
                }
                if (this.block(bx + 1, by - 1).os === neg(os) && this.block(bx + 2, by - 2).os === os) {
                    ls.push([this.block(bx, by), 
                    this.block(bx + 1, by - 1), 
                    this.block(bx + 2, by - 2)]);
                }
                if (this.block(bx, by - 1).os === neg(os) && this.block(bx, by - 2).os === os) {
                    ls.push([this.block(bx, by), 
                    this.block(bx, by - 1), 
                    this.block(bx, by - 2)]);
                }
                if (this.block(bx - 1, by - 1).os === neg(os) && this.block(bx - 2, by - 2).os === os) {
                    ls.push([this.block(bx, by), 
                    this.block(bx - 1, by - 1), 
                    this.block(bx - 2, by - 2)]);
                }
                if (this.block(bx - 1, by).os === neg(os) && this.block(bx - 2, by).os === os) {
                    ls.push([this.block(bx, by), 
                    this.block(bx - 1, by), 
                    this.block(bx - 2, by)]);
                }
                if (this.block(bx - 1, by + 1).os === neg(os) && this.block(bx - 2, by + 2).os === os) {
                    ls.push([this.block(bx, by), 
                    this.block(bx - 1, by + 1), 
                    this.block(bx - 2, by + 2)]);
                }
            } else if (os === 'O') {
                if (this.block(bx + 1, by).os === neg(os) && this.block(bx - 1, by).os === neg(os)) {
                    ls.push([this.block(bx, by), 
                    this.block(bx + 1, by), 
                    this.block(bx - 1, by)]);
                }
                if (this.block(bx + 1, by + 1).os === neg(os) && this.block(bx - 1, by - 1).os === neg(os)) {
                    ls.push([this.block(bx, by), 
                    this.block(bx + 1, by + 1), 
                    this.block(bx - 1, by - 1)]);
                }
                if (this.block(bx, by + 1).os === neg(os) && this.block(bx, by - 1).os === neg(os)) {
                    ls.push([this.block(bx, by), 
                    this.block(bx, by + 1), 
                    this.block(bx, by - 1)]);
                }
                if (this.block(bx - 1, by + 1).os === neg(os) && this.block(bx + 1, by - 1).os === neg(os)) {
                    ls.push([this.block(bx, by), 
                    this.block(bx - 1, by + 1), 
                    this.block(bx + 1, by - 1)]);
                }
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
        
        // This is going to directly mutate the GameDisplay.Chessboard prototype
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
                if (bx !== false && by !== false && (os !== prevOS || bx !== prevX || by !== prevY)) { 
                    // If the mouse is on a different O/S from last time, play hover animation 
                    // If mouse is in a chessboard block
                    GameDisplay.hoverAnimation(bx, by, os);
                }
                if (prevX !== false && prevY !== false && (prevX !== bx || prevY !== by)) { 
                    // If the block has changed, play dehover animations on the block
                    // console.log("GameDisplay: call dehoverAnimation on", prevX+' '+prevY+' '+prevOS);
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
                // Prevent moves on frozen tiles
                if (GameDisplay.chessboard.block(bx, by).status.frozen > 0) {
                    console.log(`Move not allowed: Tile at (${bx}, ${by}) is frozen.`);
                    return;
                }
                        
                canvas.removeEventListener("mousemove", mousemove, false);
                canvas.removeEventListener("click", click, false);

                GameDisplay.clickAnimation(bx, by, os);
                const moveSuccessful = GameDisplay.chessboard.makeMove(bx, by, os);

                if (moveSuccessful) {
                    GameDisplay.chessboard.statusUpdate();
                    let element = null; // Initialize the element variable

                    // Apply elemental effect if not already applied
                    const tile = GameDisplay.chessboard.block(bx, by);
                    if (tile && !tile.status.effectApplied) {
                        element = applyElementalEffectWithAI(bx, by);
                        tile.status.effectApplied = true;

                        // Check if the tile is valid before playing the sound
                        if (!tile.status.destroyed && !tile.status.frozen && !tile.partOfSOS) {
                            if (!tile.status.destroyed && !tile.status.frozen && !tile.partOfSOS && element === 'Fire') {
                                GameDisplay.playBurnSound();
                            } else if (element === 'Earth') {
                                GameDisplay.playEarthSound();
                            } else if (element === 'Ice') {
                                GameDisplay.playFreezeSound();
                            }
                        } else {
                            GameDisplay.playInvalidSound();
                        }
                    }

                    // Log the move with the correct elemental effect
                    GameLogger.logMove("Human", bx, by, os, element);

                    const r = GameDisplay.chessboard.hasSOS(bx, by, os).length;
                    if (r) {
                        Player.score += r;
                        Player.redrawScore();
                        Player.makeMove(callback);
                    } else {
                        setTimeout(callback, 1000);
                    }
                }
            }
            
            canvas.addEventListener("mousemove", mousemove, false);
            canvas.addEventListener("click", click, false);
        };
        
        // Check for a move to make SOS
        Player.cmpMove = function(callback) {
            console.log("AI is making a move...");
            var Player = this;
            var cb = GameDisplay.chessboard;

            // Recursive function to process SOS moves one by one
            function processSOSMoves() {
                for (var i = 0; i < cb.size; i++) {
                    for (var j = 0; j < cb.size; j++) {
                        const block = cb.block(i, j);
                        if (!block.isOccupied() && block.status.frozen === 0) {
                            let r;
                            if ((r = cb.hasSOS(i, j, 'S').length)) {
                                cb.makeMove(i, j, 'S');
                                let element = null; // Initialize the element variable

                                // Apply the elemental effect if not already applied
                                if (!block.status.effectApplied) {
                                    element = applyElementalEffectWithAI(i, j);
                                    block.status.effectApplied = true; // Mark as applied

                                    // Check if the tile is valid before playing the sound
                                    if (!block.status.destroyed && !block.status.frozen && !block.partOfSOS) {
                                        if (!block.status.destroyed && !block.status.frozen && !block.partOfSOS && element === 'Fire') {
                                            GameDisplay.playBurnSound();
                                        } else if (element === 'Earth') {
                                            GameDisplay.playEarthSound();
                                        } else if (element === 'Ice') {
                                            GameDisplay.playFreezeSound();
                                        }
                                    } else {
                                       GameDisplay.playInvalidSound();
                                    }
                                }

                                GameLogger.logMove("AI", i, j, 'S', element);
                                Player.score += r;
                                Player.redrawScore();
                                cb.statusUpdate();

                                console.log("SOS found, making move at", i, j, "with OS 'S'");
                                setTimeout(processSOSMoves, 1000); // Delay before processing the next SOS move
                                return; // Exit the loop and wait for the next call
                            } else if ((r = cb.hasSOS(i, j, 'O').length)) {
                                cb.makeMove(i, j, 'O');
                                let element = null; // Initialize the element variable

                                if (!block.status.effectApplied) {
                                    element = applyElementalEffectWithAI(i, j);
                                    block.status.effectApplied = true;

                                    // Check if the tile is valid before playing the sound
                                    if (!block.status.destroyed && !block.status.frozen && !block.partOfSOS) {
                                        if (!block.status.destroyed && !block.status.frozen && !block.partOfSOS && element === 'Fire') {
                                            GameDisplay.playBurnSound();
                                        } else if (element === 'Earth') {
                                            GameDisplay.playEarthSound();
                                        } else if (element === 'Ice') {
                                            GameDisplay.playFreezeSound();
                                        }
                                    } else {
                                        GameDisplay.playInvalidSound();
                                    }
                                }
                                
                                GameLogger.logMove("AI", i, j, 'O', element);
                                Player.score += r;
                                Player.redrawScore();
                                cb.statusUpdate();

                                console.log("SOS found, making move at", i, j, "with OS 'O'");
                                setTimeout(processSOSMoves, 1000); // Delay before processing the next SOS move
                                return; // Exit the loop and wait for the next call
                            }
                        }
                    }
                }

                // If no SOS moves are found, make a random move
                var moveAbleLs = [];
                for (var i = 0; i < cb.size; i++) {
                    for (var j = 0; j < cb.size; j++) {
                        const block = cb.block(i, j);
                        if (!block.isOccupied() && block.status.frozen === 0) {
                            moveAbleLs.push({ bx: i, by: j, os: GameLogic.randomOS() });
                        }
                    }
                }

            if (moveAbleLs.length > 0) {
                    var move = moveAbleLs[Math.floor(Math.random() * moveAbleLs.length)];
                    cb.makeMove(move.bx, move.by, move.os);
                    let element = null;

                    // Apply the elemental effect if not already applied
                    const block = cb.block(move.bx, move.by);
                    if (block && !block.status.effectApplied) {
                        element = applyElementalEffectWithAI(move.bx, move.by);
                        block.status.effectApplied = true;

                        // Check if the tile is valid before playing the sound
                        if (!block.status.destroyed && !block.status.frozen && !block.partOfSOS) {
                            if (!block.status.destroyed && !block.status.frozen && !block.partOfSOS &&element === 'Fire') {
                                GameDisplay.playBurnSound();
                            } else if (element === 'Earth') {
                                GameDisplay.playEarthSound();
                            } else if (element === 'Ice') {
                                GameDisplay.playFreezeSound();
                            }
                        } else {
                            GameDisplay.playInvalidSound();
                        }
                    }

                    GameLogger.logMove("AI", move.bx, move.by, move.os, element);
                    console.log("No SOS found, making random move at", move.bx, move.by, "with OS", move.os);
                } else {
                    console.log("No valid moves available for AI.");
                }

                // Invoke the callback to end the AI's turn
                setTimeout(callback, 1000);
            }

            // Start processing SOS moves
            processSOSMoves();
        };
    
        Player.makeMove = function(callback) {
            if (GameDisplay.chessboard.isFull()) {
                GameControl.gameOver(); 
                return;
            }

            // Check if there are any valid moves left
            if (!GameDisplay.chessboard.hasValidMoves()) {
                console.log("No valid moves left. Ending the game.");
                GameControl.gameOver();
                return;
            }
            this.type === 'Human' ? this.usrMove(callback) : this.cmpMove(callback);
        }
        
        GameControl.gameStart = function(size) {
            console.log(canvas.parentNode.offsetHeight, canvas.parentNode.offsetWidth);

            this.A = new GameDisplay.Player("Your", 'Human');
            this.B = new GameDisplay.Player("Opponent's", 'AI');

            // Create a container div for the Reset button
            const resetContainer = document.createElement('div');
            resetContainer.id = 'reset-container'; // Assign an ID for styling
            canvas.parentNode.appendChild(resetContainer);

            resetContainer.style.textAlign = 'center'; // Center the Reset button
            resetContainer.style.marginTop = '20px'; // Add spacing above the Reset button


            this.reset = document.createElement('button');
            this.reset.innerHTML = 'Reset';

            canvas.parentNode.appendChild(this.reset);

            // Apply inline styles to the Reset button
            this.reset.style.padding = '10px 20px';
            this.reset.style.fontSize = '16px';
            this.reset.style.fontFamily = 'Arial, sans-serif';
            this.reset.style.backgroundColor = '#c13535'; // Blue background
            this.reset.style.color = 'white'; // White text
            this.reset.style.border = 'none';
            this.reset.style.borderRadius = '5px';
            this.reset.style.cursor = 'pointer';
            this.reset.style.transition = 'background-color 0.3s ease';

            // Add hover effect using JavaScript
            this.reset.addEventListener('mouseover', function() {
                this.style.backgroundColor = '#e56060'; // Darker blue on hover
            });
            this.reset.addEventListener('mouseout', function() {
                this.style.backgroundColor = '#c13535'; // Original blue color
            });

            this.reset.onclick = function() {
                location.reload(); // Reload the page to reset the game
            };
            
            GameDisplay.start(size);
            GameDisplay.draw();
            
            // Start the game loop
            (function callback() {
                GameControl.A.makeMove(function() {
                    // GameControl.B.makeMove(callback)
                    setTimeout(() => GameControl.B.makeMove(callback), 1200);
                })
            })();
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
            let winner;

            if (this.A.score > this.B.score) {
                GameDisplay.drawGameOver('You Won');
                winner = 'You Won';
            } else if (this.A.score < this.B.score) {
                GameDisplay.drawGameOver('You Lost');
                winner = 'You Lost';
            } else {
                GameDisplay.drawGameOver('Draw');
                winner = 'Draw';
            }

            // Log the result
            GameLogger.logResult(winner);

            // Export the game log
            GameLogger.export();

            // Reset the game on click
            const resetGame = () => {
                location.reload(); // Reload the page to reset the game
                canvas.removeEventListener('click', resetGame);
                canvas.addEventListener('click', resetGame);
            };
            canvas.addEventListener('click', resetGame);
        };
        
    }
    
    /* Main */
    GameControl.gameStart(4);
}
