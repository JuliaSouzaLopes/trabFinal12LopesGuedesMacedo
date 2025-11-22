import * as THREE from 'three';
import Resources from './Utils/Resource.js';
import InputManager from './Core/InputManager.js';
import Kaelen from './Characters/Kaelen.js';
import Enemy from './Characters/Enemy.js';
import MapBuilder from './World/MapBuilder.js'; 

export default class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.sizes = { width: window.innerWidth, height: window.innerHeight };
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#101015'); 

        this.camera = new THREE.PerspectiveCamera(35, this.sizes.width / this.sizes.height, 0.1, 100);
        this.camera.position.set(0, 15, 15);
        this.scene.add(this.camera);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.raycaster = new THREE.Raycaster();
        this.mousePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        this.enemies = [];
        this.input = new InputManager();
        this.resources = new Resources();
        
        this.fadedObjects = []; 
        
        this.resources.onReady = () => {
            this.createWorld();
        };
        this.resources.load();

        this.clock = new THREE.Clock();
        this.tick();

        window.addEventListener('resize', () => this.resize());
    }

    createWorld() {
        this.mapBuilder = new MapBuilder(this.scene, this.resources);
        this.mapBuilder.build();

        this.kaelen = new Kaelen(this.scene, this.resources, this.input);
        this.kaelen.model.position.set(0, 0, 0); // Centro (Fogueira) - Seguro

        // --- SPAWNERS ESPALHADOS (LONGE DO JOGADOR) ---
        
        // 1. Corredor Sul (Longe da fogueira)
        // Z positivo é "para baixo" na tela.
        this.spawnEnemy('minion', new THREE.Vector3(4, 0, 12)); 
        this.spawnEnemy('minion', new THREE.Vector3(-4, 0, 12)); 

        // 2. Sala Oeste (Esquerda)
        this.spawnEnemy('mage', new THREE.Vector3(-20, 0, -4));
        this.spawnEnemy('warrior', new THREE.Vector3(-18, 0, -2));

        // 3. Sala Leste (Direita)
        this.spawnEnemy('rogue', new THREE.Vector3(20, 0, -4));
        this.spawnEnemy('rogue', new THREE.Vector3(22, 0, -6));

        // 4. Arena Norte (Boss/Fundo)
        // Z negativo é "para cima".
        this.spawnEnemy('warrior', new THREE.Vector3(0, 0, -25));
        this.spawnEnemy('mage', new THREE.Vector3(-5, 0, -22));
        this.spawnEnemy('mage', new THREE.Vector3(5, 0, -22));
    }

    spawnEnemy(type, position) {
        // Verifica se o recurso existe antes de tentar criar
        // Mapeamento de nomes: 'warrior' -> 'skel_warrior' no Resource.js
        const meshName = 'skel_' + type;
        if (this.resources.items[meshName]) {
            const enemy = new Enemy(this.scene, this.resources, type, position, this.kaelen);
            this.enemies.push(enemy);
        } else {
            console.warn(`Impossível spawnar ${type}: Modelo ${meshName} não carregado.`);
        }
    }

    resize() {
        this.sizes.width = window.innerWidth;
        this.sizes.height = window.innerHeight;
        this.camera.aspect = this.sizes.width / this.sizes.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.sizes.width, this.sizes.height);
    }

    handleOcclusion() {
        if (!this.kaelen || !this.mapBuilder) return;

        this.fadedObjects.forEach(obj => {
            obj.traverse(child => {
                if (child.isMesh && child.material) {
                    child.material.transparent = false;
                    child.material.opacity = 1.0;
                    child.material.needsUpdate = true;
                }
            });
        });
        this.fadedObjects = [];

        const playerPos = this.kaelen.model.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const camPos = this.camera.position.clone();
        const direction = new THREE.Vector3().subVectors(playerPos, camPos);
        const distance = direction.length();
        direction.normalize();

        this.raycaster.set(camPos, direction);
        
        const intersects = this.raycaster.intersectObjects(this.mapBuilder.walls, true);

        for (const hit of intersects) {
            if (hit.distance < distance - 0.5) {
                let objectToFade = hit.object;
                while(objectToFade.parent && objectToFade.parent.type !== 'Scene' && objectToFade.parent.name !== 'SanctuaryMap') {
                    objectToFade = objectToFade.parent;
                }

                if (!this.fadedObjects.includes(objectToFade)) {
                    this.fadedObjects.push(objectToFade);
                    objectToFade.traverse(child => {
                        if (child.isMesh && child.material) {
                            child.material.transparent = true;
                            child.material.opacity = 0.25; 
                            child.material.needsUpdate = true;
                        }
                    });
                }
            } else {
                break; 
            }
        }
    }

    tick() {
        const deltaTime = this.clock.getDelta();

        let mouseWorldPos = null;
        if (this.input) {
            this.raycaster.setFromCamera(this.input.mouse.position, this.camera);
            const target = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(this.mousePlane, target);
            mouseWorldPos = target;
        }

        if (this.kaelen) {
            const attackInfo = this.kaelen.update(deltaTime, mouseWorldPos, this.enemies, this.mapBuilder);

            this.enemies = this.enemies.filter(e => e.model !== null);
            this.enemies.forEach(enemy => {
                enemy.update(deltaTime, this.kaelen.model.position, this.enemies);
                if (attackInfo) enemy.checkHit(attackInfo);
            });

            const targetX = this.kaelen.model.position.x;
            const targetZ = this.kaelen.model.position.z + 10;
            this.camera.position.x += (targetX - this.camera.position.x) * 5 * deltaTime;
            this.camera.position.z += (targetZ - this.camera.position.z) * 5 * deltaTime;
            this.camera.lookAt(this.kaelen.model.position);

            this.handleOcclusion();
        }

        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(() => this.tick());
    }
}