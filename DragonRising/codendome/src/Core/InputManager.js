export default class InputManager {
    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,   // Espaço
            dodge: false   // Shift
        };
        
        this.mouse = {
            leftClick: false,
            rightClick: false,
            position: { x: 0, y: 0 } // Posição 2D na tela
        };

        window.addEventListener('keydown', (e) => this.keyDown(e));
        window.addEventListener('keyup', (e) => this.keyUp(e));
        window.addEventListener('mousedown', (e) => this.mouseDown(e));
        window.addEventListener('mouseup', (e) => this.mouseUp(e));
        window.addEventListener('mousemove', (e) => this.mouseMove(e));
        // Desativar menu de contexto no botão direito
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    keyDown(event) {
        switch(event.code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
            case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
            case 'Space': this.keys.jump = true; break;
            case 'ShiftLeft': case 'ShiftRight': this.keys.dodge = true; break;
        }
    }

    keyUp(event) {
        switch(event.code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
            case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
            case 'Space': this.keys.jump = false; break;
            case 'ShiftLeft': case 'ShiftRight': this.keys.dodge = false; break;
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

    mouseMove(event) {
        // Normaliza coordenadas do mouse (-1 a +1) para o Raycaster
        this.mouse.position.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.position.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
}