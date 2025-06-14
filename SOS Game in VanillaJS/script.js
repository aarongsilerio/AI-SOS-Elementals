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
        
        /* Block Class */
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
        };
        var Block = GameDisplay.Block.prototype;
        Block.isOccupied = function() {return this.os;}
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

        Chessboard.isFull = function() {return this.currentOS === this.size * this.size;}
        
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
                        } else
                        if ((r = cb.hasSOS(i, j, 'O').length)) {
                            cb.makeMove(i, j, 'O');
                        } else {
                            continue;
                        }
                        Player.score += r;
                        Player.redrawScore();
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
            if (GameDisplay.chessboard.isFull()) {GameControl.gameOver(); return;}
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
            };
            canvas.addEventListener('click', f);
        }
        
    }
    
    /* Main */
    GameControl.gameStart(5);
}
