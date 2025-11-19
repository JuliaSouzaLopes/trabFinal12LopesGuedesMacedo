import * as THREE from 'three';

export default class Kaelen {
    constructor(scene, resources, input) {
        this.scene = scene;
        this.input = input;
        
        // Recursos
        this.resource = resources.items.knight;        // O Corpo
        this.animResource = resources.items.knightAnims; // As Animações
        this.swordResource = resources.items.sword;
        this.shieldResource = resources.items.shield;
        this.texture = resources.items.knightTexture;
        
        // Configurações
        this.speed = 5.0;
        this.rotationSpeed = 12.0;
        this.attackRange = 2.0; 
        this.scale = new THREE.Vector3(0.7, 0.8, 0.7); // Deixar mais fino

        // Estado
        this.state = 'idle'; 
        this.comboIndex = 0;
        
        this.animations = {};
        this.currentAction = null;
        this.mixer = null;

        this.setModel();
    }

    setModel() {
        if(!this.resource || !this.animResource) {
            console.error("❌ Erro: Faltando modelo ou animações!");
            return;
        }

        // 1. Configurar o Corpo (Mesh)
        this.model = this.resource.scene;
        this.model.scale.copy(this.scale);
        this.model.position.set(0, 0, 0);
        
        // Textura Pixel Art
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

        // 2. Anexar Armas (Colocar na Mão)
        this.attachWeapons();

        this.scene.add(this.model);

        // --- SISTEMA DE ANIMAÇÃO (A Correção) ---
        // Criamos o Mixer no CORPO (this.model)
        this.mixer = new THREE.AnimationMixer(this.model);
        
        // Mas pegamos os clipes do OUTRO arquivo (this.animResource)
        const allClips = this.animResource.animations;

        if (!allClips || allClips.length === 0) {
            console.error("⚠️ O arquivo animations.glb está vazio ou não tem animações!");
            return;
        }

        console.log("🎬 Animações Carregadas:", allClips.map(c => c.name));

        // Busca Flexível
        this.animations.idle = allClips.find(a => a.name.toLowerCase().includes('idle')) || allClips[0];
        this.animations.run = allClips.find(a => a.name.toLowerCase().includes('run') || a.name.toLowerCase().includes('walk')) || allClips[1];
        
        // Filtra ataques
        this.attackClips = allClips.filter(a => {
            const n = a.name.toLowerCase();
            return (n.includes('attack') || n.includes('slash')) && !n.includes('idle');
        });

        // Listener para fim de ataque
        this.mixer.addEventListener('finished', (e) => {
            if (this.state === 'attack') {
                this.state = 'idle';
                this.model.scale.x = this.scale.x; // Reset espelhamento
                this.playAnimation('idle', false, 0.2);
            }
        });

        // Iniciar
        this.playAnimation('idle');
    }

    attachWeapons() {
        // KayKit usa nomes de ossos padrão. Geralmente "hand.R" ou "HandRight".
        // Vamos procurar o osso da mão direita.
        let rightHand = null;
        let leftHand = null;

        this.model.traverse((child) => {
            if (child.isBone) {
                const name = child.name.toLowerCase();
                if (name.includes('hand') && (name.includes('r') || name.includes('right'))) {
                    rightHand = child;
                }
                if (name.includes('hand') && (name.includes('l') || name.includes('left'))) {
                    leftHand = child;
                }
            }
        });

        // Colocar Espada na Mão Direita
        if (rightHand && this.swordResource) {
            const sword = this.swordResource.scene.clone();
            // Ajuste fino de posição/rotação para encaixar na mão
            sword.position.set(0, -0.1, 0.1); 
            sword.rotation.set(Math.PI / 2, 0, 0); 
            
            // Aplicar textura do Kaykit também na arma
            sword.traverse(c => { if(c.isMesh) c.material.map = this.texture; });
            
            rightHand.add(sword);
        } else {
            console.warn("⚠️ Mão direita não encontrada para equipar espada.");
        }

        // Colocar Escudo na Mão Esquerda
        if (leftHand && this.shieldResource) {
            const shield = this.shieldResource.scene.clone();
            shield.position.set(0, 0.1, 0);
            shield.rotation.set(Math.PI / 2, 0, Math.PI / 2);

            shield.traverse(c => { if(c.isMesh) c.material.map = this.texture; });
            
            leftHand.add(shield);
        }
    }

    playAnimation(name, once = false, fadeDuration = 0.2, timeScale = 1.0) {
        let clip = this.animations[name];
        if (!clip && name && name.uuid) clip = name; 
        if (!clip) return;

        const newAction = this.mixer.clipAction(clip);
        
        if (once) {
            newAction.reset();
            newAction.setLoop(THREE.LoopOnce);
            newAction.clampWhenFinished = true;
            newAction.timeScale = timeScale;
            newAction.play();
            if (this.currentAction) this.currentAction.stop();
            this.currentAction = newAction;
        } else {
            if (this.currentAction && this.currentAction.getClip().name === clip.name) return;
            newAction.reset();
            newAction.setLoop(THREE.LoopRepeat);
            newAction.timeScale = timeScale;
            newAction.play();
            if (this.currentAction) this.currentAction.crossFadeTo(newAction, fadeDuration);
            this.currentAction = newAction;
        }
    }

    attack() {
        if (this.state === 'attack') return; 
        this.state = 'attack';
        
        this.comboIndex = (this.comboIndex + 1) % 2;
        
        let clipToPlay = null;
        if (this.attackClips.length > 0) {
            const idx = this.comboIndex % this.attackClips.length;
            clipToPlay = this.attackClips[idx];
        } else {
            clipToPlay = this.animations.idle;
        }
        
        if (this.comboIndex === 1) {
            this.model.scale.x = -this.scale.x; 
        } else {
            this.model.scale.x = this.scale.x;
        }

        if(clipToPlay) {
            const action = this.mixer.clipAction(clipToPlay);
            action.reset();
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            action.timeScale = 1.5; 
            action.play();
            if (this.currentAction) this.currentAction.stop();
            this.currentAction = action;
        }

        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.model.rotation.y);
        this.model.position.add(forward.multiplyScalar(0.5));

        return {
            position: this.model.position.clone(),
            direction: forward,
            range: this.attackRange
        };
    }

    update(deltaTime) {
        if (!this.model || !this.mixer) return;
        this.mixer.update(deltaTime);

        if (this.state === 'attack') return;

        let moveX = 0;
        let moveZ = 0;
        let isMoving = false;

        if (this.input.keys.forward) moveZ -= 1;
        if (this.input.keys.backward) moveZ += 1;
        if (this.input.keys.left) moveX -= 1;
        if (this.input.keys.right) moveX += 1;

        if (this.input.keys.action || this.input.mouse.leftClick) {
            this.input.mouse.leftClick = false; 
            this.input.keys.action = false; 
            return this.attack(); 
        }

        if (moveX !== 0 || moveZ !== 0) {
            isMoving = true;
            const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
            moveX /= length; moveZ /= length;

            this.model.position.x += moveX * this.speed * deltaTime;
            this.model.position.z += moveZ * this.speed * deltaTime;

            const targetRotation = Math.atan2(moveX, moveZ);
            let rotationDiff = targetRotation - this.model.rotation.y;
            while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
            while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
            this.model.rotation.y += rotationDiff * this.rotationSpeed * deltaTime;
        }

        if (isMoving) {
            this.playAnimation('run');
        } else {
            this.playAnimation('idle');
        }
        return null;
    }
}