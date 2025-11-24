import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'; 

export default class Enemy {
    constructor(scene, resources, type, position, player) {
        this.scene = scene;
        this.resources = resources;
        this.player = player;
        this.type = type;

        this.config = this.getStats(type);
        this.currentHealth = this.config.health;
        this.isDead = false;
        this.isHurt = false;
        this.isAttacking = false;
        this.attackCooldown = 0;

        // Adicionado para visão
        this.raycaster = new THREE.Raycaster();
        this.detectionRadius = 15.0; // Distância máxima de visão

        this.modelResource = resources.items[this.config.modelName];
        this.texture = resources.items.skel_texture;
        
        this.anims = [
            resources.items.animMelee, 
            resources.items.animMoveBasic, 
            resources.items.animMoveAdv,
            resources.items.animGeneral
        ];

        this.attackClips = []; 
        this.setupMesh(position);
        this.setupAnimations();
        setTimeout(() => this.equipItems(), 100);
    }

    getStats(type) {
        switch(type) {
            case 'warrior': return { modelName: 'skel_warrior', health: 8, speed: 1.5, damage: 3, range: 1.8, scale: 0.7, attackSpeed: 2.0 };
            case 'mage':    return { modelName: 'skel_mage',    health: 4, speed: 1.2, damage: 5, range: 7.0, scale: 0.65, attackSpeed: 3.0 };
            case 'rogue':   return { modelName: 'skel_rogue',   health: 5, speed: 4.5, damage: 2, range: 1.5, scale: 0.65, attackSpeed: 0.8 };
            default:        return { modelName: 'skel_minion',  health: 3, speed: 2.5, damage: 1, range: 1.5, scale: 0.6, attackSpeed: 1.2 }; 
        }
    }

    setupMesh(position) {
        if (!this.modelResource) return;
        this.model = SkeletonUtils.clone(this.modelResource.scene);
        this.model.position.copy(position);
        this.model.scale.set(this.config.scale, this.config.scale, this.config.scale);

        if (this.texture) {
            this.texture.colorSpace = THREE.SRGBColorSpace;
            this.texture.magFilter = THREE.NearestFilter;
            this.texture.minFilter = THREE.NearestFilter;
            this.texture.flipY = false;
        }

        this.model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.frustumCulled = false; 
                if (this.texture) child.material.map = this.texture;
                child.material = child.material.clone(); 
            }
        });
        this.scene.add(this.model);
    }

    setupAnimations() {
        this.mixer = new THREE.AnimationMixer(this.model);
        let allClips = [];
        this.anims.forEach(a => { if(a && a.animations) allClips.push(...a.animations); });

        this.clips = {};
        this.clips.idle = allClips.find(c => c.name === 'Idle_A') || allClips[0];
        this.clips.run = allClips.find(c => {
            const n = c.name.toLowerCase();
            return n.includes('run') && !n.includes('jump') && !n.includes('hop') && !n.includes('attack');
        });
        if (!this.clips.run) this.clips.run = allClips.find(c => c.name.toLowerCase().includes('walk'));
        this.clips.die = allClips.find(c => c.name.includes('Death_A'));
        this.clips.hit = allClips.find(c => c.name.includes('Hit_A'));

        let allMeleeAttacks = allClips.filter(c => c.name.includes("Melee_1H_Attack"));
        allMeleeAttacks.sort((a, b) => a.name.localeCompare(b.name));

        if (this.type === 'minion') this.attackClips = allMeleeAttacks.slice(0, 2);
        else if (this.type === 'warrior') this.attackClips = allMeleeAttacks.slice(2, 5);
        else if (this.type === 'mage') {
            const magic = allClips.find(c => c.name.includes('Cast') || c.name.includes('Shoot'));
            this.attackClips = magic ? [magic] : [];
        } else {
            this.attackClips = allMeleeAttacks; 
        }

        if (this.attackClips.length === 0) {
            const fallback = allClips.find(c => c.name.includes('Attack'));
            if(fallback) this.attackClips.push(fallback);
        }
        this.playAnim('idle');
    }

    equipItems() {
        let rightHand, leftHand;
        this.model.traverse(c => {
            if(c.isBone) {
                const n = c.name.toLowerCase();
                if (n.includes('hand') && !n.includes('slot')) {
                    if (n.includes('right') || n.endsWith('r')) rightHand = c;
                    if (n.includes('left') || n.endsWith('l')) leftHand = c;
                }
            }
        });

        if(!rightHand) return;

        if (this.type === 'warrior') {
            this.attachToBone(rightHand, 'skel_blade', {x:0, y:-0.1, z:0}, {x:Math.PI/2, y:0, z:0});
            this.attachToBone(leftHand, 'skel_shield', {x:0.1, y:0, z:0}, {x:Math.PI/2, y:Math.PI/2, z:Math.PI/2});
        } else if (this.type === 'mage') {
            this.attachToBone(rightHand, 'skel_staff', {x:0, y:-0.3, z:0}, {x:Math.PI/2, y:0, z:0});
        } else if (this.type === 'rogue') {
            const dagger = this.attachToBone(rightHand, 'skel_blade', {x:0, y:-0.1, z:0}, {x:Math.PI/2, y:0, z:0});
            if(dagger) dagger.scale.set(0.7, 0.7, 0.7);
        } else {
            this.attachToBone(rightHand, 'skel_axe', {x:0, y:-0.1, z:0}, {x:Math.PI/2, y:0, z:0});
        }
    }

    attachToBone(bone, resourceName, pos, rot) {
        const res = this.resources.items[resourceName];
        if(!res) return null;
        const mesh = res.scene.clone();
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.rotation.set(rot.x, rot.y, rot.z);
        mesh.traverse(c => { if(c.isMesh) { c.castShadow = true; c.material.map = this.texture; }});
        bone.add(mesh);
        return mesh;
    }

    playAnim(name, once = false) {
        let clip = this.clips[name];
        if (name === 'attack' && this.attackClips.length > 0) {
            const idx = Math.floor(Math.random() * this.attackClips.length);
            clip = this.attackClips[idx];
        }
        if(!clip) return;
        
        const action = this.mixer.clipAction(clip);
        if(this.currentAction === action && !once) return;

        if (name === 'run') action.timeScale = this.config.speed * 0.5; 
        else action.timeScale = 1.0;

        if(once) {
            action.reset().setLoop(THREE.LoopOnce).clampWhenFinished = true;
            action.play();
        } else {
            if(this.currentAction) this.currentAction.fadeOut(0.2);
            action.reset().fadeIn(0.2).play();
            this.currentAction = action;
        }
    }

    // --- NOVA FUNÇÃO DE VISÃO ---
    canSeePlayer(playerPos, mapBuilder) {
        if (!this.model || this.isDead) return false;

        const dist = this.model.position.distanceTo(playerPos);
        if (dist > this.detectionRadius) return false;

        // 1. Raycast (Paredes)
        if (mapBuilder && mapBuilder.walls.length > 0) {
            // Lança raio da altura dos olhos (Y+1.2)
            const rayOrigin = this.model.position.clone().add(new THREE.Vector3(0, 1.2, 0));
            const targetHead = playerPos.clone().add(new THREE.Vector3(0, 1.2, 0));
            
            const direction = new THREE.Vector3().subVectors(targetHead, rayOrigin).normalize();
            
            this.raycaster.set(rayOrigin, direction);
            this.raycaster.far = dist; 

            const intersects = this.raycaster.intersectObjects(mapBuilder.walls);
            
            // Se bateu em parede, bloqueia visão
            if (intersects.length > 0) {
                return false; 
            }
        }
        return true; 
    }

    // --- UPDATE ATUALIZADO COM FÍSICA ---
    update(deltaTime, playerPosition, allEnemies, mapBuilder) {
        if (this.mixer) this.mixer.update(deltaTime);
        if (this.isDead || !this.model) return;

        // 1. Calcula vetor de movimento total (Separação + Perseguição)
        let totalMove = new THREE.Vector3();

        // Separação (não aplica direto na posição, soma no vetor)
        const separation = this.getSeparationVector(allEnemies);
        totalMove.add(separation);

        if (this.attackCooldown > 0) this.attackCooldown -= deltaTime;

        const distToPlayer = this.model.position.distanceTo(playerPosition);
        const canSee = this.canSeePlayer(playerPosition, mapBuilder);

        // Lógica de IA: Persegue se vê o player e está numa distância razoável
        let chasing = false;
        if (distToPlayer > this.config.range && distToPlayer < 20 && canSee && !this.isAttacking) {
            // Olha para o player
            this.model.lookAt(playerPosition.x, this.model.position.y, playerPosition.z);
            
            // Adiciona vetor de perseguição
            const chaseDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.model.quaternion);
            totalMove.add(chaseDir.multiplyScalar(this.config.speed * deltaTime));
            chasing = true;
        }

        // 2. Aplica Física de Paredes no movimento total
        if (totalMove.lengthSq() > 0) {
            const nextPos = this.model.position.clone().add(totalMove);

            if (mapBuilder && mapBuilder.walls) {
                const enemyRadius = 0.5; // Raio de colisão do esqueleto
                const enemyCenter = nextPos.clone().add(new THREE.Vector3(0, 1.0, 0));

                for (const wall of mapBuilder.walls) {
                    const wallBox = new THREE.Box3().setFromObject(wall);
                    const closestPoint = new THREE.Vector3();
                    wallBox.clampPoint(enemyCenter, closestPoint);

                    const flatEnemy = new THREE.Vector3(enemyCenter.x, 0, enemyCenter.z);
                    const flatClosest = new THREE.Vector3(closestPoint.x, 0, closestPoint.z);
                    const distance = flatEnemy.distanceTo(flatClosest);

                    if (distance < enemyRadius) {
                        // Empurra para fora da parede (Slide)
                        const pushDir = new THREE.Vector3().subVectors(flatEnemy, flatClosest).normalize();
                        if (distance === 0) pushDir.set(1, 0, 0);
                        
                        const overlap = enemyRadius - distance;
                        nextPos.add(pushDir.multiplyScalar(overlap));
                        enemyCenter.add(pushDir.multiplyScalar(overlap));
                    }
                }
            }
            
            this.model.position.copy(nextPos);
        }

        // 3. Controle de Animação e Ataque
        if (chasing) {
            this.playAnim('run');
        } else if (distToPlayer <= this.config.range && canSee) {
            this.performAttack();
        } else {
            if(!this.isAttacking) this.playAnim('idle');
        }
    }

    getSeparationVector(enemies) {
        const separationDistance = 0.8; 
        let moveVec = new THREE.Vector3(0, 0, 0);
        let count = 0;
        for (const other of enemies) {
            if (other === this || other.isDead) continue;
            const dist = this.model.position.distanceTo(other.model.position);
            if (dist > 0 && dist < separationDistance) {
                const pushDir = this.model.position.clone().sub(other.model.position).normalize();
                moveVec.add(pushDir);
                count++;
            }
        }
        if (count > 0) {
            moveVec.divideScalar(count).normalize().multiplyScalar(2.0 * 0.016); // Pequeno ajuste fixo
        }
        return moveVec;
    }

    performAttack() {
        if (this.isAttacking || this.attackCooldown > 0) return;

        this.isAttacking = true;
        this.attackCooldown = this.config.attackSpeed;
        this.playAnim('attack', true);

        setTimeout(() => {
            if(!this.isDead && !this.player.isDead) {
                const dist = this.model.position.distanceTo(this.player.model.position);
                const enemyForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.model.quaternion);
                const toPlayer = this.player.model.position.clone().sub(this.model.position).normalize();
                const angle = enemyForward.dot(toPlayer);

                if (dist <= this.config.range + 1.0 && angle > 0.5) {
                    this.player.takeDamage(this.config.damage);
                }
            }
            this.isAttacking = false;
        }, 600);
    }

    checkHit(attackData) {
        if(this.isDead) return false;
        const dist = this.model.position.distanceTo(attackData.position);
        const toEnemy = this.model.position.clone().sub(attackData.position).normalize();
        const angle = attackData.direction.dot(toEnemy);

        if (dist <= attackData.range + 0.5 && angle > 0.2) {
            const enemyForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.model.quaternion);
            const alignment = attackData.direction.dot(enemyForward);
            
            let dmg = 1;
            if (alignment > 0.5) dmg = 3; // Backstab

            this.takeDamage(dmg);
            return true;
        }
        return false;
    }

    takeDamage(amount) {
        if(this.isDead) return;
        this.currentHealth -= amount;
        
        this.model.traverse(c => { if(c.isMesh) {
            c.material.emissive.setHex(amount > 1 ? 0xffff00 : 0xff0000); 
            c.material.emissiveIntensity = 1;
        }});
        
        setTimeout(() => { if(this.model) this.model.traverse(c => { 
            if(c.isMesh) {
                c.material.emissive.setHex(0x000000); 
                c.material.emissiveIntensity = 0;
            }
        }); }, 200);

        if (this.currentHealth <= 0) {
            this.die();
        } else {
            this.playAnim('hit', true);
        }
    }

    die() {
        this.isDead = true;
        this.playAnim('die', true); 
        setTimeout(() => {
            if (this.scene && this.model) {
                this.scene.remove(this.model);
                this.model = null;
            }
        }, 3000); 
    }
}