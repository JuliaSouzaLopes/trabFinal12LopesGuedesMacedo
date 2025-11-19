import * as THREE from 'three';
import Resources from './Utils/Resource.js';
import InputManager from './Core/InputManager.js';
import Kaelen from './Characters/Kaelen.js';
import Enemy from './Characters/Enemy.js';
import Environment from './World/Environment.js'; // <--- IMPORT NOVO

export default class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.sizes = { width: window.innerWidth, height: window.innerHeight };
        
        this.scene = new THREE.Scene();
        // (Cor de fundo será definida pelo Environment)

        this.camera = new THREE.PerspectiveCamera(35, this.sizes.width / this.sizes.height, 0.1, 100);
        this.camera.position.set(0, 15, 15);
        this.scene.add(this.camera);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras mais bonitas

        // --- AMBIENTE (Substitui as luzes manuais) ---
        this.environment = new Environment(this.scene);

        // Gerenciadores
        this.input = new InputManager();
        this.resources = new Resources();
        
        this.resources.onReady = () => {
            this.createWorld();
        };
        this.resources.load();

        this.clock = new THREE.Clock();
        this.tick();

        window.addEventListener('resize', () => this.resize());
    }

    createWorld() {
        // Textura do Chão
        const townTexture = this.resources.items.townMap;
        if (townTexture) {
            townTexture.colorSpace = THREE.SRGBColorSpace;
            townTexture.magFilter = THREE.NearestFilter;
            townTexture.minFilter = THREE.NearestFilter;
            townTexture.flipY = false;
        }

        // 1. Criar Kaelen
        this.kaelen = new Kaelen(this.scene, this.resources, this.input);

        // 2. Criar Inimigo (Usando a nova classe)
        // Vamos colocar o inimigo um pouco à frente
        this.enemy = new Enemy(this.scene, new THREE.Vector3(-3, 1, -3));

        // 3. Cenário (Chão e Árvore)
        if (this.resources.items.road) {
            const ground = this.resources.items.road.scene.clone();
            ground.traverse((child) => { if (child.isMesh) { child.material.map = townTexture; child.receiveShadow = true; }});
            ground.scale.set(10, 1, 10);
            this.scene.add(ground);
        }
        if (this.resources.items.tree) {
            const tree = this.resources.items.tree.scene.clone();
            tree.traverse((child) => { if(child.isMesh) { child.material.map = townTexture; child.castShadow = true; }});
            tree.position.set(4, 0, -4);
            this.scene.add(tree);
        }
    }

    resize() {
        this.sizes.width = window.innerWidth;
        this.sizes.height = window.innerHeight;
        this.camera.aspect = this.sizes.width / this.sizes.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.sizes.width, this.sizes.height);
    }

    tick() {
        const deltaTime = this.clock.getDelta();

        if (this.kaelen) {
            // Update do Kaelen retorna info do ataque se houver
            const attackInfo = this.kaelen.update(deltaTime);

            // Lógica de Dano no Inimigo
            if (attackInfo && this.enemy && !this.enemy.isDead) {
                const dist = attackInfo.position.distanceTo(this.enemy.mesh.position);
                
                // Vetor Kaelen -> Inimigo
                const toEnemy = this.enemy.mesh.position.clone().sub(attackInfo.position).normalize();
                const alignment = attackInfo.direction.dot(toEnemy);

                // Verifica alcance (2.5) e ângulo (0.5 = ~60 graus na frente)
                if (dist < 2.5 && alignment > 0.5) {
                    this.enemy.takeDamage(1); // Tira 1 de vida
                }
            }

            // Câmera segue
            const targetX = this.kaelen.model.position.x;
            const targetZ = this.kaelen.model.position.z + 10;
            this.camera.position.x += (targetX - this.camera.position.x) * 5 * deltaTime;
            this.camera.position.z += (targetZ - this.camera.position.z) * 5 * deltaTime;
            this.camera.lookAt(this.kaelen.model.position);
        }

        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(() => this.tick());
    }
}