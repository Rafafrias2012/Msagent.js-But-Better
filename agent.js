// agent.js
import { BufferStream, SeekDir } from './buffer.js';
import { ContextMenu } from './contextmenu.js';
import { wordballoonDrawImage, wordballoonDrawText } from './wordballoon.js';

// Utility functions
const Utils = {
    dwAlign(off) {
        let ul = off >>> 0;
        ul += 3;
        ul >>= 2;
        ul <<= 2;
        return ul;
    },

    randint(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    },

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
};

// Constants
const WORD_BALLOON_POSITIONS = {
    ABOVE_CENTERED: 'above',
    BELOW_CENTERED: 'below'
};

// Base animation state manager
class AnimationStateManager {
    constructor(char, anim, finishCallback) {
        this.char = char;
        this.anim = anim;
        this.finishCallback = finishCallback;
        this.frameIndex = 0;
        this.cancelled = false;
        this.interval = null;
    }

    play() {
        this.nextFrame();
    }

    cancel() {
        this.cancelled = true;
        if (this.interval) {
            clearTimeout(this.interval);
            this.interval = null;
        }
    }

    nextFrame() {
        requestAnimationFrame(() => {
            if (this.cancelled) return;

            this.char.drawAnimationFrame(this.anim.frameInfo[this.frameIndex++]);

            if (this.frameIndex >= this.anim.frameInfo.length) {
                this.finishCallback();
                return;
            }

            this.interval = setTimeout(() => {
                this.nextFrame();
            }, this.anim.frameInfo[this.frameIndex].frameDuration * 10);
        });
    }
}

// Word Balloon Base Class
class WordBalloonState {
    constructor(char, options = {}) {
        this.char = char;
        this.hasTip = options.hasTip || false;
        this.position = options.position || WORD_BALLOON_POSITIONS.ABOVE_CENTERED;
        
        this.balloonCanvas = document.createElement('canvas');
        this.balloonCanvasCtx = this.balloonCanvas.getContext('2d');
        
        this.balloonCanvas.style.position = 'absolute';
        this.balloonCanvas.style.pointerEvents = 'none';
    }

    show() {
        this.balloonCanvas.style.display = 'block';
    }

    hide() {
        this.balloonCanvas.style.display = 'none';
    }

    finish() {
        this.balloonCanvas.remove();
    }

    positionUpdated() {
        const size = this.char.getSize();
        this.balloonCanvas.style.left = 
            -(this.balloonCanvas.width / 2 - size.w / 2) + 'px';
        
        switch (this.position) {
            case WORD_BALLOON_POSITIONS.ABOVE_CENTERED:
                this.balloonCanvas.style.top = -this.balloonCanvas.height + 'px';
                break;
            case WORD_BALLOON_POSITIONS.BELOW_CENTERED:
                this.balloonCanvas.style.bottom = -this.balloonCanvas.height + 'px';
                break;
        }
    }
}

// Text Word Balloon
class TextWordBalloonState extends WordBalloonState {
    constructor(char, text, options = {}) {
        super(char, options);
        
        this.text = text;
        const textColor = options.textColor || '#000000';
        
        this.balloonCanvasCtx.font = '14px arial';
        this.balloonCanvas.width = 300;
        this.balloonCanvas.height = 300;

        const rect = wordballoonDrawText(
            this.balloonCanvasCtx, 
            { x: 0, y: 0 }, 
            this.text, 
            20, 
            this.hasTip, 
            textColor
        );

        this.balloonCanvas.width = rect.w;
        this.balloonCanvas.height = rect.h;

        wordballoonDrawText(
            this.balloonCanvasCtx, 
            { x: 0, y: 0 }, 
            this.text, 
            20, 
            this.hasTip, 
            textColor
        );

        this.char.getElement().appendChild(this.balloonCanvas);
        this.show();
    }
}

// Image Word Balloon
class ImageWordBalloonState extends WordBalloonState {
    constructor(char, img, options = {}) {
        super(char, options);
        
        this.img = img;
        
        this.balloonCanvas.width = 300;
        this.balloonCanvas.height = 300;

        const rect = wordballoonDrawImage(
            this.balloonCanvasCtx, 
            { x: 0, y: 0 }, 
            this.img, 
            this.hasTip
        );

        this.balloonCanvas.width = rect.w;
        this.balloonCanvas.height = rect.h;

        wordballoonDrawImage(
            this.balloonCanvasCtx, 
            { x: 0, y: 0 }, 
            this.img, 
            this.hasTip
        );

        this.char.getElement().appendChild(this.balloonCanvas);
        this.show();
    }
}

// Main Agent Class
export class Agent {
    constructor(data) {
        this.data = data;
        this._initializeDOM();
        this._setupEventListeners();
        
        this.animState = null;
        this.wordballoonState = null;
        this.usernameBalloonState = null;
    }

    _initializeDOM() {
        this.charDiv = document.createElement('div');
        this.charDiv.classList.add('agent-character');
        this.charDiv.style.position = 'fixed';

        this.cnv = document.createElement('canvas');
        this.ctx = this.cnv.getContext('2d');
        this.cnv.width = this.data.characterInfo.charWidth;
        this.cnv.height = this.data.characterInfo.charHeight;
        this.cnv.style.display = 'none';

        this.contextMenu = new ContextMenu(this.charDiv);
        this.charDiv.appendChild(this.cnv);
    }

    _setupEventListeners() {
        // Drag and move event listeners
        const startDrag = (clientX, clientY) => {
            this.dragging = true;
            this.lastTouchX = clientX;
            this.lastTouchY = clientY;
        };

        const stopDrag = () => {
            this.dragging = false;
        };

        const performDrag = (clientX, clientY) => {
            if (!this.dragging) return;

            const movementX = clientX - this.lastTouchX;
            const movementY = clientY - this.lastTouchY;
            
            this.lastTouchX = clientX;
            this.lastTouchY = clientY;
            
            this.x += movementX;
            this.y += movementY;
            this.setLoc();
        };

        this.cnv.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
        this.cnv.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY);
        });

        document.addEventListener('mousemove', (e) => performDrag(e.clientX, e.clientY));
        document.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            perform Drag(touch.clientX, touch.clientY);
        });

        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);

        window.addEventListener('resize', () => this.setLoc());
    }

    setLoc() {
        this.x = Utils.clamp(this.x, 0, document.documentElement.clientWidth - this.cnv.width);
        this.y = Utils.clamp(this.y, 0, document.documentElement.clientHeight - this.cnv.height);
        this.charDiv.style.top = this.y + 'px';
        this.charDiv.style.left = this.x + 'px';

        if (this.wordballoonState) this.wordballoonState.positionUpdated();
    }

    getElement() {
        return this.charDiv;
    }

    getContextMenu() {
        return this.contextMenu;
    }

    getAt() {
        return { x: this.x, y: this.y };
    }

    getSize() {
        return {
            w: this.data.characterInfo.charWidth,
            h: this.data.characterInfo.charHeight
        };
    }

    drawAnimationFrame(frame) {
        this.ctx.clearRect(0, 0, this.cnv.width, this.cnv.height);
        for (const mimg of frame.images) {
            this.drawImage(this.data.images[mimg.imageIndex], mimg.xOffset, mimg.yOffset);
        }
    }

    drawImage(imageEntry, xOffset, yOffset) {
        const rgbaBuffer = new Uint32Array(imageEntry.image.width * imageEntry.image.height);
        const buffer = imageEntry.image.data;
        const bufStream = new BufferStream(buffer);
        const rows = new Array(imageEntry.image.height);

        for (let y = imageEntry.image.height - 1; y >= 0; --y) {
            const row = bufStream.subBuffer(imageEntry.image.width).raw();
            rows[y] = row.slice(0, imageEntry.image.width);
            bufStream.seek(Utils.dwAlign(bufStream.tell()), SeekDir.BEG);
        }

        for (let y = 0; y < imageEntry.image.height; ++y) {
            const row = rows[y];
            for (let x = 0; x < imageEntry.image.width; ++x) {
                rgbaBuffer[y * imageEntry.image.width + x] = this.data.characterInfo.palette[row[x]].to_rgba();
            }
        }

        const data = new ImageData(new Uint8ClampedArray(rgbaBuffer.buffer), imageEntry.image.width, imageEntry.image.height);
        this.ctx.putImageData(data, xOffset, yOffset);
    }

    addToDom(parent = document.body) {
        if (!this.charDiv.parentElement) {
            parent.appendChild(this.charDiv);
        }
    }

    remove() {
        this.charDiv.remove();
    }

    playAnimation(index, finishCallback) {
        if (this.animState) {
            this.animState.cancel();
            this.animState = null;
        }
        const animInfo = this.data.animInfo[index];
        this.animState = new AnimationStateManager(this, animInfo.animationData, () => {
            this.animState = null;
            finishCallback();
        });
        this.animState.play();
    }

    playAnimationByName(name, finishCallback) {
        const index = this.data.animInfo.findIndex(n => n.name === name);
        if (index !== -1) this.playAnimation(index, finishCallback);
    }

    playAnimationByNamePromise(name) {
        return new Promise((resolve) => {
            this.playAnimationByName(name, () => resolve());
        });
    }

    setUsername(username, color) {
        if (this.usernameBalloonState) {
            this.usernameBalloonState.finish();
            this.usernameBalloonState = null;
        }
        this.usernameBalloonState = new TextWordBalloonState(this, username, { hasTip: false, position: WORD_BALLOON_POSITIONS.BELOW_CENTERED, textColor: color });
        this.usernameBalloonState.show();
    }

    speak(text) {
        if (this.wordballoonState) {
            this.stopSpeaking();
        }
        this.wordballoonState = new TextWordBalloonState(this, text, { hasTip: true, position: WORD_BALLOON_POSITIONS.ABOVE_CENTERED });
        this.wordballoonState.positionUpdated();
        this.wordballoonState.show();
    }

    speakImage(img) {
        if (this.wordballoonState) {
            this.stopSpeaking();
        }
        this.wordballoonState = new ImageWordBalloonState(this, img, { hasTip: true, position: WORD_BALLOON_POSITIONS.ABOVE_CENTERED });
        this.wordballoonState.positionUpdated();
        this.wordballoonState.show();
    }

    stopSpeaking() {
        if (this.wordballoonState) {
            this.wordballoonState.finish();
            this.wordballoonState = null;
        }
    }

    show() {
        this.x = Utils.randint(0, document.documentElement.clientWidth - this.data.characterInfo.charWidth);
        this.y = Utils.randint(0, document.documentElement.clientHeight - this.data.characterInfo.charHeight);
        this.setLoc();
        this.cnv.style.display = 'block';
    }

    hide(remove = false) {
        if (remove) this.remove();
        else this.cnv.style.display = 'none';
    }

    listAnimations() {
        return this.data.animInfo.map(n => n.name);
    }
}
