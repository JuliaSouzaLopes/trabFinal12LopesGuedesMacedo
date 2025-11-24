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

        // Spawn do Player
        if (this.mapBuilder.spawnPoint) {
            this.kaelen.model.position.copy(this.mapBuilder.spawnPoint);
        } else {
            this.kaelen.model.position.set(0, 0, 0);
        }

        // Spawn Inimigos do Mapa
        if (this.mapBuilder.enemySpawns) {
            this.mapBuilder.enemySpawns.forEach(spawnData => {
                this.spawnEnemy(spawnData.type, spawnData.pos);
            });
        }
    }

    spawnEnemy(type, position) {
        let actualType = type;
        let isBoss = false;

        if (type === 'boss') {
            actualType = 'warrior';
            isBoss = true;
        }

        const meshName = 'skel_' + actualType;
        if (this.resources.items[meshName]) {
            const enemy = new Enemy(this.scene, this.resources, actualType, position, this.kaelen);
            if (isBoss) {
                enemy.model.scale.set(1.5, 1.5, 1.5);
                enemy.health = 100;
                enemy.attackCooldown = 1.0;
                enemy.model.traverse(c => { if (c.isMesh) c.material.color.setHex(0xffaaaa); });
            }
            this.enemies.push(enemy);
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
                while (objectToFade.parent && objectToFade.parent.type !== 'Scene' && objectToFade.parent.name !== 'SanctuaryMap') {
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

            // FILTRO DE SEGURANÇA: Remove inimigos sem modelo (mortos e limpados)
            this.enemies = this.enemies.filter(e => e.model !== null);

            this.enemies.forEach(enemy => {
                // Checa vida de novo
                if (!enemy.isDead && enemy.model) {
                
                    enemy.update(deltaTime, this.kaelen.model.position, this.enemies, this.mapBuilder);

                    if (attackInfo) {
                        enemy.checkHit(attackInfo);
                    }
                } else if (enemy.isDead && enemy.model) {
                    // Inimigo morto ainda precisa rodar animação de morte, mas não lógica de ataque
                    
                    enemy.update(deltaTime, this.kaelen.model.position, this.enemies, this.mapBuilder);
                }
            });

            // Câmera
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