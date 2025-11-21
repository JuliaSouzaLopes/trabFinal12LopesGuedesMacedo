import * as THREE from 'three';

export default class Kaelen {
    constructor(scene, resources, input) {
        this.scene = scene;
        this.input = input;
        this.resources = resources;

        this.resource = resources.items.knight;
        this.texture = resources.items.knightTexture;
        this.swordResource = resources.items.sword;
        this.shieldResource = resources.items.shield;

        this.animMoveBasic = resources.items.animMoveBasic;
        this.animMoveAdv = resources.items.animMoveAdv;
        this.animGeneral = resources.items.animGeneral;
        
        this.anims = [
            resources.items.animMelee,
            resources.items.animMoveBasic,
            resources.items.animMoveAdv,
            resources.items.animGeneral
        ];
        
        this.speed = 5.0;
        this.maxHealth = 20;
        this.currentHealth = this.maxHealth;
        this.attackRange = 2.5; 
        this.scale = new THREE.Vector3(0.7, 0.8, 0.7);

        this.state = 'idle'; 
        this.comboIndex = -1;
        this.isDead = false;
        this.isInvulnerable = false;
        
        this.lungeVelocity = new THREE.Vector3();
        this.lungeFriction = 5.0;

        this.animations = {};
        this.currentAction = null;
        this.mixer = null;

        this.setModel();
    }

    setModel() {
        if(!this.resource) return;

        this.model = this.resource.scene;
        this.model.scale.copy(this.scale);
        this.model.position.set(0, 0, 0);
        
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
                if (this.texture) child.material.map = this.texture;
            }
        });

        this.attachWeapons();
        this.scene.add(this.model);

        this.mixer = new THREE.AnimationMixer(this.model);
        let allClips = [];
        this.anims.forEach(f => { if(f && f.animations) allClips = [...allClips, ...f.animations]; });

        // Mapeamento
        this.animations.idle = allClips.find(a => a.name === 'Idle_A') || allClips.find(a => a.name.toLowerCase().includes('idle'));
        
        const basicClips = this.animMoveBasic ? this.animMoveBasic.animations : [];
        this.animations.run = basicClips.find(a => a.name === 'Run_A') || allClips.find(a => a.name.toLowerCase().includes('run'));
        this.animations.block = allClips.find(a => a.name.includes('Block_Idle')) || this.animations.idle;
        this.animations.blockHit = allClips.find(a => a.name.includes('Block_Hit'));
        
        // ESQUIVAS (MovementAdvanced)
        if (this.animMoveAdv && this.animMoveAdv.animations) {
            const adv = this.animMoveAdv.animations;
            // 2=Trás, 3=Frente, 4=Esq, 5=Dir
            if (adv.length > 5) {
                this.dodgeClips = {
                    backward: adv[2], forward: adv[3], left: adv[4], right: adv[5]
                };
            }
        }

        // ATAQUES
        const wantedAttacks = ["Melee_1H_Attack_Chop", "Melee_1H_Attack_Slice_Diagonal", "Melee_1H_Attack_Slice_Horizontal", "Melee_1H_Attack_Stab"];
        this.jumpAttackClip = allClips.find(a => a.name.includes("Melee_1H_Attack_Jump_Chop"));
        this.groundAttacks = allClips.filter(a => wantedAttacks.some(w => a.name.includes(w))).sort((a, b) => a.name.localeCompare(b.name));

        this.mixer.addEventListener('finished', (e) => {
            if (this.state === 'attack' || this.state === 'dodge') {
                this.state = 'idle';
                this.isInvulnerable = false;
                this.playAnimation('idle', false, 0.2);
            }
        });

        if(this.animations.idle) this.playAnimation('idle');
    }

    attachWeapons() {
        let rightHand, leftHand;
        const swordPos = { x: 0, y: 0, z: 0.01 };
        const swordRot = { x: Math.PI, y: 0, z: Math.PI / 2 }; 
        const shieldPos = { x: 0.1, y: 0.05, z: 0 };
        const shieldRot = { x: Math.PI / 2, y: Math.PI / 2, z: Math.PI / 2 };

        this.model.traverse((child) => {
            if (child.isBone) {
                const n = child.name.toLowerCase();
                if (n.includes('hand')) {
                    if ((n.includes('right') || n.endsWith('r')) && !n.includes('slot')) rightHand = child;
                    if ((n.includes('left') || n.endsWith('l')) && !n.includes('slot')) leftHand = child;
                }
            }
        });

        if (rightHand && this.swordResource) {
            while(rightHand.children.length > 0) rightHand.remove(rightHand.children[0]);
            const sword = this.swordResource.scene.clone();
            sword.position.set(swordPos.x, swordPos.y, swordPos.z); 
            sword.rotation.set(swordRot.x, swordRot.y, swordRot.z); 
            sword.traverse(c => { if(c.isMesh) { c.castShadow = true; if(this.texture) c.material.map = this.texture; }});
            rightHand.add(sword);
        }
        if (leftHand && this.shieldResource) {
            while(leftHand.children.length > 0) leftHand.remove(leftHand.children[0]);
            const shield = this.shieldResource.scene.clone();
            shield.position.set(shieldPos.x, shieldPos.y, shieldPos.z); 
            shield.rotation.set(shieldRot.x, shieldRot.y, shieldRot.z);
            shield.traverse(c => { if(c.isMesh) { c.castShadow = true; if(this.texture) c.material.map = this.texture; }});
            leftHand.add(shield);
        }
    }

    playAnimation(name, once = false, fade = 0.1, speed = 1.0) {
        let clip = typeof name === 'string' ? this.animations[name] : name;
        if (!clip) return;
        const action = this.mixer.clipAction(clip);
        action.timeScale = speed;
        if (once) {
            action.reset().setLoop(THREE.LoopOnce).clampWhenFinished = true;
            if (this.currentAction) { this.currentAction.fadeOut(fade); action.fadeIn(fade); }
            action.play();
            this.currentAction = action;
        } else {
            if (this.currentAction && this.currentAction.getClip().name === clip.name) return;
            action.reset().setLoop(THREE.LoopRepeat).play();
            if (this.currentAction) this.currentAction.crossFadeTo(action, fade);
            this.currentAction = action;
        }
    }

    performAttack() {
        if (this.state === 'attack' || this.state === 'dodge' || this.state === 'block') return;
        this.state = 'attack';
        let clipToPlay;
        if (this.input.keys.jump && this.jumpAttackClip) {
            clipToPlay = this.jumpAttackClip;
        } else {
            this.comboIndex = (this.comboIndex + 1) % this.groundAttacks.length;
            clipToPlay = this.groundAttacks[this.comboIndex];
        }
        if(!clipToPlay) clipToPlay = this.animations.idle;
        this.playAnimation(clipToPlay, true, 0.05, 1.4);
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.model.rotation.y);
        let force = clipToPlay.name.includes("Jump") ? 8.0 : 5.0;
        this.lungeVelocity.copy(forward).multiplyScalar(force);

        return { position: this.model.position.clone(), direction: forward, range: this.attackRange };
    }

    performDodge() {
        if (this.state === 'dodge' || this.state === 'attack' || !this.dodgeClips) return;
        
        // --- CORREÇÃO 1: Se não apertar nada, não esquiva ---
        if (!this.input.keys.forward && !this.input.keys.backward && !this.input.keys.left && !this.input.keys.right) {
            return;
        }

        this.state = 'dodge';
        this.isInvulnerable = true;
        
        let clip = this.dodgeClips.forward;
        let dodgeDir = new THREE.Vector3(0, 0, 0); 

        // --- CORREÇÃO 2: Vetores Corrigidos ---
        // Forward é -Z (frente da câmera)
        // Backward é +Z
        // Left é -X
        // Right é +X
        if (this.input.keys.forward) { 
            clip = this.dodgeClips.forward; 
            dodgeDir.set(0, 0, -1); // Frente
        }
        else if (this.input.keys.backward) { 
            clip = this.dodgeClips.backward; 
            dodgeDir.set(0, 0, 1); // Trás
        } 
        else if (this.input.keys.left) { 
            clip = this.dodgeClips.left; 
            dodgeDir.set(-1, 0, 0); // Esquerda
        } 
        else if (this.input.keys.right) { 
            clip = this.dodgeClips.right; 
            dodgeDir.set(1, 0, 0); // Direita
        }

        // Importante: Aplicar a rotação do modelo
        // Se o modelo gira, "frente" muda. O vetor local deve ser alinhado com a rotação do mundo?
        // NÃO! Se a câmera é fixa, W deve ser sempre "Fundo da tela".
        // Se usamos movimentação relativa à câmera (o que estamos fazendo no handleMovement),
        // a esquiva deve seguir a mesma lógica.
        // O dodgeDir acima já está em coordenadas "globais" relativas ao input.
        
        // Toca animação
        this.playAnimation(clip, true, 0.1, 1.3);
        
        // Impulso forte na direção da tecla
        // Normalizamos para garantir velocidade constante na diagonal se houver
        if(dodgeDir.lengthSq() > 0) dodgeDir.normalize();
        
        this.lungeVelocity.copy(dodgeDir).multiplyScalar(12.0); 
    }

    takeDamage(amount) {
        if (this.isDead || this.isInvulnerable) return;
        if (this.state === 'block') {
            amount = Math.ceil(amount * 0.2);
            if(this.animations.blockHit) {
                const action = this.mixer.clipAction(this.animations.blockHit);
                action.reset().setLoop(THREE.LoopOnce).play();
            }
        }
        this.currentHealth -= amount;
        const bar = document.getElementById('player-health-fill');
        if (bar) bar.style.width = `${Math.max(0, (this.currentHealth / this.maxHealth) * 100)}%`;
        
        this.model.traverse(c => { if (c.isMesh) c.material.emissive.setHex(0xff0000); });
        setTimeout(() => { if(this.model) this.model.traverse(c => { if(c.isMesh) c.material.emissive.setHex(0x000000); }); }, 200);

        if (this.currentHealth <= 0) this.die();
    }

    die() {
        this.isDead = true;
        const death = this.animGeneral.animations.find(a => a.name.includes('Death_A'));
        if(death) this.playAnimation(death, true);
        setTimeout(() => location.reload(), 2000);
    }

    update(deltaTime, mousePos, enemies) {
        if (!this.model || !this.mixer) return;
        this.mixer.update(deltaTime);
        if (this.isDead) return;

        if (this.lungeVelocity.lengthSq() > 0.1) {
            const moveAmount = this.lungeVelocity.clone().multiplyScalar(deltaTime);
            this.model.position.add(moveAmount);
            this.lungeVelocity.multiplyScalar(Math.max(0, 1 - this.lungeFriction * deltaTime));
        } else {
            this.lungeVelocity.set(0,0,0);
        }

        if (this.input.keys.dodge && this.state !== 'dodge') {
            this.performDodge();
            return;
        }
        if (this.input.mouse.leftClick) {
            this.input.mouse.leftClick = false; 
            return this.performAttack();
        }
        if (this.input.mouse.rightClick && this.state !== 'attack' && this.state !== 'dodge') {
            if (this.state !== 'block') {
                this.state = 'block';
                this.playAnimation(this.animations.block, false, 0.1);
            }
            this.handleRotation(mousePos);
            return;
        } else if (!this.input.mouse.rightClick && this.state === 'block') {
            this.state = 'idle';
        }

        if (this.state !== 'dodge') {
            this.handleMovement(deltaTime, enemies);
            this.handleRotation(mousePos);
        }
    }

    handleRotation(mousePos) {
        if (mousePos) this.model.lookAt(mousePos.x, this.model.position.y, mousePos.z);
    }

    handleMovement(deltaTime, enemies, mapBuilder) { // <--- Recebe mapBuilder
        let moveX = 0;
        let moveZ = 0;

        if (this.input.keys.forward) moveZ -= 1;
        if (this.input.keys.backward) moveZ += 1;
        if (this.input.keys.left) moveX -= 1;
        if (this.input.keys.right) moveX += 1;

        if (moveX === 0 && moveZ === 0) {
            if (this.state === 'idle' || (this.state !== 'attack' && this.state !== 'block')) {
                this.playAnimation('idle');
            }
            return;
        }

        let currentSpeed = this.speed;
        if (this.state === 'attack') currentSpeed *= 0.5;

        // Normaliza vetor
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        moveX /= length; 
        moveZ /= length;

        // --- PREVISÃO DE COLISÃO (CENÁRIO) ---
        const nextX = this.model.position.x + (moveX * currentSpeed * deltaTime);
        const nextZ = this.model.position.z + (moveZ * currentSpeed * deltaTime);

        let wallCollision = false;
        
        if (mapBuilder) {
            // Converte posição do mundo (3D) para coordenadas do Grid (Array)
            // O tileSize deve vir do MapBuilder. Se não tiver acesso direto, use o valor padrão (2)
            const tileSize = mapBuilder.tileSize || 2; 
            
            // Precisamos inverter a lógica de "spawn" do MapBuilder para achar o índice
            const offsetX = (mapBuilder.levelData[0].length * tileSize) / 2;
            const offsetZ = (mapBuilder.levelData.length * tileSize) / 2;

            const gridX = Math.floor((nextX + offsetX + (tileSize/2)) / tileSize);
            const gridZ = Math.floor((nextZ + offsetZ + (tileSize/2)) / tileSize);

            // Verifica se está dentro dos limites do array
            if (gridZ >= 0 && gridZ < mapBuilder.levelData.length && 
                gridX >= 0 && gridX < mapBuilder.levelData[0].length) {
                
                const tileType = mapBuilder.levelData[gridZ][gridX];
                
                // Se o tile for 2 (Parede) ou 3 (Coluna) ou 4 (Porta fechada)
                if (tileType === 2 || tileType === 3 || tileType === 4) {
                    wallCollision = true;
                }
            }
        }

        // --- PREVISÃO DE COLISÃO (INIMIGOS) ---
        const nextPos = new THREE.Vector3(nextX, this.model.position.y, nextZ);
        let enemyCollision = false;
        
        if (enemies) {
            for (const enemy of enemies) {
                if(enemy.isDead) continue;
                if (nextPos.distanceTo(enemy.model.position) < 0.8) {
                    enemyCollision = true;
                    break;
                }
            }
        }

        // Só move se não bater em nada
        if (!wallCollision && !enemyCollision) {
            this.model.position.x = nextX;
            this.model.position.z = nextZ;
            
            if (this.state !== 'attack') this.playAnimation('run');
        }
    }
}