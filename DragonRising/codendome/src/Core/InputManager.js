export default class InputManager {
    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            action: false // Espaço
        };
        
        this.mouse = {
            leftClick: false,
            rightClick: false
        };

        // Teclado
        window.addEventListener('keydown', (e) => this.keyDown(e));
        window.addEventListener('keyup', (e) => this.keyUp(e));

        // Mouse
        window.addEventListener('mousedown', (e) => this.mouseDown(e));
        window.addEventListener('mouseup', (e) => this.mouseUp(e));
    }

    keyDown(event) {
        switch(event.code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
            case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
            case 'Space': this.keys.action = true; break;
        }
    }

    keyUp(event) {
        switch(event.code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
            case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
            case 'Space': this.keys.action = false; break;
        }
    }

    mouseDown(event) {
        if(event.button === 0) this.mouse.leftClick = true;
        if(event.button === 2) this.mouse.rightClick = true;
    }

    mouseUp(event) {
        if(event.button === 0) this.mouse.leftClick = false;
        if(event.button === 2) this.mouse.rightClick = false;
    }
}