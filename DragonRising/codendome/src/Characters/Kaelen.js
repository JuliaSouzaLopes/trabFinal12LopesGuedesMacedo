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
        if (!this.resource) return;

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
        this.anims.forEach(f => { if (f && f.animations) allClips = [...allClips, ...f.animations]; });

        this.animations.idle = allClips.find(a => a.name === 'Idle_A') || allClips.find(a => a.name.toLowerCase().includes('idle'));

        const basicClips = this.animMoveBasic ? this.animMoveBasic.animations : [];
        this.animations.run = basicClips.find(a => a.name === 'Run_A') || allClips.find(a => a.name.toLowerCase().includes('run'));
        this.animations.block = allClips.find(a => a.name.includes('Block_Idle')) || this.animations.idle;
        this.animations.blockHit = allClips.find(a => a.name.includes('Block_Hit'));

        if (this.animMoveAdv && this.animMoveAdv.animations) {
            const adv = this.animMoveAdv.animations;
            if (adv.length > 5) {
                this.dodgeClips = {
                    backward: adv[2], forward: adv[3], left: adv[4], right: adv[5]
                };
            }
        }

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

        if (this.animations.idle) this.playAnimation('idle');
    }

    attachWeapons() {
        let rightHand, leftHand;
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

        if (rightHand) {
            const slotR = new THREE.Group();
            slotR.name = 'handslotr';
            rightHand.add(slotR);

            if (this.swordResource) {
                while (rightHand.children.length > 1) rightHand.remove(rightHand.children[1]);
                const sword = this.swordResource.scene.clone();
                sword.position.set(0, 0, 0.05);
                sword.rotation.set(Math.PI, 0, Math.PI / 2);
                sword.traverse(c => { if (c.isMesh) { c.castShadow = true; if (this.texture) c.material.map = this.texture; } });
                rightHand.add(sword);
            }
        }

        if (leftHand) {
            const slotL = new THREE.Group();
            slotL.name = 'handslotl';
            leftHand.add(slotL);

            if (this.shieldResource) {
                while (leftHand.children.length > 1) leftHand.remove(leftHand.children[1]);
                const shield = this.shieldResource.scene.clone();
                shield.position.set(shieldPos.x, shieldPos.y, shieldPos.z);
                shield.rotation.set(shieldRot.x, shieldRot.y, shieldRot.z);
                shield.traverse(c => { if (c.isMesh) { c.castShadow = true; if (this.texture) c.material.map = this.texture; } });
                leftHand.add(shield);
            }
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
        if (!clipToPlay) clipToPlay = this.animations.idle;
        this.playAnimation(clipToPlay, true, 0.05, 1.4);
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.model.rotation.y);
        let force = clipToPlay.name.includes("Jump") ? 8.0 : 5.0;
        this.lungeVelocity.copy(forward).multiplyScalar(force);

        return { position: this.model.position.clone(), direction: forward, range: this.attackRange };
    }

    performDodge() {
        if (this.state === 'dodge' || this.state === 'attack' || !this.dodgeClips) return;
        if (!this.input.keys.forward && !this.input.keys.backward && !this.input.keys.left && !this.input.keys.right) return;

        this.state = 'dodge';
        this.isInvulnerable = true;

        let clip = this.dodgeClips.forward;
        let dodgeDir = new THREE.Vector3(0, 0, 0);

        if (this.input.keys.forward) { clip = this.dodgeClips.forward; dodgeDir.set(0, 0, -1); }
        else if (this.input.keys.backward) { clip = this.dodgeClips.backward; dodgeDir.set(0, 0, 1); }
        else if (this.input.keys.left) { clip = this.dodgeClips.left; dodgeDir.set(-1, 0, 0); }
        else if (this.input.keys.right) { clip = this.dodgeClips.right; dodgeDir.set(1, 0, 0); }

        this.playAnimation(clip, true, 0.1, 1.3);
        if (dodgeDir.lengthSq() > 0) dodgeDir.normalize();
        this.lungeVelocity.copy(dodgeDir).multiplyScalar(12.0);
    }

    takeDamage(amount) {
        if (this.isDead || this.isInvulnerable) return;
        if (this.state === 'block') {
            amount = Math.ceil(amount * 0.2);
            if (this.animations.blockHit) {
                const action = this.mixer.clipAction(this.animations.blockHit);
                action.reset().setLoop(THREE.LoopOnce).play();
            }
        }
        this.currentHealth -= amount;

        this.model.traverse(c => { if (c.isMesh) c.material.emissive.setHex(0xff0000); });
        setTimeout(() => { if (this.model) this.model.traverse(c => { if (c.isMesh) c.material.emissive.setHex(0x000000); }); }, 200);

        if (this.currentHealth <= 0) this.die();
    }

    die() {
        this.isDead = true;
        const death = this.animGeneral.animations.find(a => a.name.includes('Death_A'));
        if (death) this.playAnimation(death, true);
        setTimeout(() => location.reload(), 2000);
    }

    // --- SISTEMA DE COLISÃO FÍSICA (Bounding Box) ---
    getBoundingBox() {
        const box = new THREE.Box3();
        // CAIXA MAIS FINA: Reduzi X e Z para 0.8 (era 1.2). 
        // Isso permite passar em portas estreitas sem travar.
        box.setFromCenterAndSize(
            this.model.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
            new THREE.Vector3(0.8, 3.0, 0.8)
        );
        return box;
    }

    checkCollision(playerBox, mapBuilder) {
        if (!mapBuilder || !mapBuilder.walls) return false;

        for (const wall of mapBuilder.walls) {
            const wallBox = new THREE.Box3().setFromObject(wall);

            // TRUQUE DE HITBOX:
            // Reduzimos a caixa da parede em 0.2 unidades em cada lado.
            // Isso ignora relevos da pedra e tochas que poderiam travar o jogador.
            wallBox.expandByScalar(-0.2);

            if (playerBox.intersectsBox(wallBox)) {
                return true;
            }
        }
        return false;
    }

   update(deltaTime, mousePos, enemies, mapBuilder) {
        if (!this.model || !this.mixer) return;
        this.mixer.update(deltaTime);
        if (this.isDead) return;

        // 1. CHECAGEM DE AÇÕES (Restaurada)
        // Ataque: Clique Esquerdo (Básico) ou Espaço (Pulo/Ataque Forte)
        if (this.input.mouse.leftClick || this.input.keys.jump) {
            this.performAttack();
        }

        // Esquiva: Shift
        if (this.input.keys.dodge) {
            this.performDodge();
        }

        // 2. MOVIMENTO E ROTAÇÃO
        // Só move se não estiver no meio de uma esquiva
        if (this.state !== 'dodge') {
            this.handleMovement(deltaTime, enemies, mapBuilder);
            this.handleRotation(mousePos);
        }
    }


    handleRotation(mousePos) {
        if (mousePos) this.model.lookAt(mousePos.x, this.model.position.y, mousePos.z);
    }

    handleMovement(deltaTime, enemies, mapBuilder) {
        // 1. Calcula a direção baseada nas teclas (moveDirection)
        let moveX = 0;
        let moveZ = 0;

        if (this.input.keys.forward) moveZ -= 1;
        if (this.input.keys.backward) moveZ += 1;
        if (this.input.keys.left) moveX -= 1;
        if (this.input.keys.right) moveX += 1;

        // Se não estiver apertando nada, toca idle e retorna
        if (moveX === 0 && moveZ === 0) {
            if (this.state === 'idle' || (this.state !== 'attack' && this.state !== 'block' && this.state !== 'dodge')) {
                this.playAnimation('idle');
            }
            return;
        }

        // Cria o vetor moveDirection que estava faltando
        const moveDirection = new THREE.Vector3(moveX, 0, moveZ).normalize();

        // 2. Define velocidade
        let currentSpeed = this.speed;
        if (this.state === 'attack') currentSpeed *= 0.5;

        // 3. Calcula onde o jogador QUER ir (Posição Futura)
        const displacement = moveDirection.multiplyScalar(currentSpeed * deltaTime);
        const nextPos = this.model.position.clone().add(displacement);

        // 4. Colisão com Paredes (Lógica de Deslizar / Sliding)
        if (mapBuilder && mapBuilder.walls.length > 0) {
            const playerRadius = 0.4; // Raio do corpo do herói (ajuste se precisar)

            // Usamos o centro do corpo para calcular colisão, não o pé
            const playerCenter = nextPos.clone().add(new THREE.Vector3(0, 1.5, 0));

            for (const wall of mapBuilder.walls) {
                // Cria uma caixa matemática para a parede
                const wallBox = new THREE.Box3().setFromObject(wall);

                // Encontra o ponto na parede mais próximo do centro do jogador
                const closestPoint = new THREE.Vector3();
                wallBox.clampPoint(playerCenter, closestPoint);

                // Calculamos a distância apenas no plano horizontal (X e Z)
                // Isso evita que o chão ou teto empurrem o jogador
                const flatPlayer = new THREE.Vector3(playerCenter.x, 0, playerCenter.z);
                const flatClosest = new THREE.Vector3(closestPoint.x, 0, closestPoint.z);

                const distance = flatPlayer.distanceTo(flatClosest);

                // Se a distância for menor que o raio, houve colisão
                if (distance < playerRadius) {
                    // Calcula a direção para empurrar o jogador para fora (Normal)
                    const pushDir = new THREE.Vector3().subVectors(flatPlayer, flatClosest).normalize();

                    // Se estiver exatamente dentro (distancia 0), empurra pra qualquer lado
                    if (distance === 0) pushDir.set(1, 0, 0);

                    const overlap = playerRadius - distance;

                    // Aplica o empurrão na posição futura (Desliza suavemente)
                    nextPos.add(pushDir.multiplyScalar(overlap));

                    // Atualiza o centro para a próxima verificação de parede
                    playerCenter.add(pushDir.multiplyScalar(overlap));
                }
            }
        }

        // 5. Colisão com Inimigos (Simples, para não atravessar)
        if (enemies) {
            for (const enemy of enemies) {
                if (enemy.isDead || !enemy.model) continue;
                const dist = nextPos.distanceTo(enemy.model.position);
                const minDist = 0.8;
                if (dist < minDist) {
                    const pushDir = new THREE.Vector3().subVectors(nextPos, enemy.model.position).normalize();
                    const pushAmt = minDist - dist;
                    nextPos.add(pushDir.multiplyScalar(pushAmt));
                }
            }
        }

        // 6. Aplica a posição final calculada
        this.model.position.copy(nextPos);

        // 7. Animação de corrida
        if (this.state !== 'attack' && this.state !== 'block') {
            this.playAnimation('run');
        }
    }
}