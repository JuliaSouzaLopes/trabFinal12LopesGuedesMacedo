import * as THREE from 'three';
import Resources from './Utils/Resource.js';
import InputManager from './Core/InputManager.js';
import Kaelen from './Characters/Kaelen.js';
import Enemy from './Characters/Enemy.js';
import MapBuilder from './World/MapBuilder.js'; // Import novo

export default class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.sizes = { width: window.innerWidth, height: window.innerHeight };
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#101015'); // Fundo escuro (Caverna)

        this.camera = new THREE.PerspectiveCamera(35, this.sizes.width / this.sizes.height, 0.1, 100);
        this.camera.position.set(0, 15, 15);
        this.scene.add(this.camera);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Raycaster para mira
        this.raycaster = new THREE.Raycaster();
        this.mousePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        this.enemies = [];
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
        // 1. Construir Mapa
        this.mapBuilder = new MapBuilder(this.scene, this.resources);
        this.mapBuilder.build();

        // 2. Player
        this.kaelen = new Kaelen(this.scene, this.resources, this.input);
        this.kaelen.model.position.set(0, 0, 4); // Perto da entrada (Z positivo)

        // 3. Inimigo (Teste) - Um esqueleto guardando o altar no fundo
        this.spawnEnemy('warrior', new THREE.Vector3(0, 0, -4));
    }

    spawnEnemy(type, position) {
        const enemy = new Enemy(this.scene, this.resources, type, position, this.kaelen);
        this.enemies.push(enemy);
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

        // Raycaster (Mira)
        let mouseWorldPos = null;
        if (this.input) {
            this.raycaster.setFromCamera(this.input.mouse.position, this.camera);
            const target = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(this.mousePlane, target);
            mouseWorldPos = target;
        }

        if (this.kaelen) {
            // NOVO: Passamos this.mapBuilder (que contém os dados do nível) para o update
            const attackInfo = this.kaelen.update(deltaTime, mouseWorldPos, this.enemies, this.mapBuilder);

            // Update Enemies
            this.enemies = this.enemies.filter(e => e.model !== null);
            this.enemies.forEach(enemy => {
                enemy.update(deltaTime, this.kaelen.model.position, this.enemies);
                if (attackInfo) enemy.checkHit(attackInfo);
            });

            // Câmera Segue Player
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