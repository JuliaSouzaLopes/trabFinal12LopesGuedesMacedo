import * as THREE from 'three';

export default class Enemy {
    constructor(scene, resources, type, position, player) {
        this.scene = scene;
        this.resources = resources;
        this.player = player;
        this.type = type; 
        
        this.stats = {
            warrior: { hp: 30, speed: 2.5, range: 1.5, scale: 1.0, mesh: 'skel_warrior', weapon: 'skel_axe' },
            mage:    { hp: 15, speed: 2.0, range: 8.0, scale: 0.9, mesh: 'skel_mage', weapon: 'skel_staff' },
            rogue:   { hp: 20, speed: 3.5, range: 1.2, scale: 0.9, mesh: 'skel_rogue', weapon: 'skel_blade' },
            minion:  { hp: 10, speed: 1.5, range: 1.2, scale: 0.7, mesh: 'skel_minion', weapon: 'skel_blade' }
        };

        const config = this.stats[type] || this.stats.warrior;
        this.speed = config.speed;
        this.health = config.hp;
        this.attackRange = config.range;
        
        this.detectionRadius = 12.0;
        this.state = 'PATROL';
        this.patrolTarget = position.clone();
        this.patrolTimer = 0;
        this.isDead = false;
        this.mixer = null;
        
        // Inicializa ações com null para evitar crash
        this.actions = { idle: null, run: null, attack: null, death: null };

        this.setupModel(config, position);
    }

    setupModel(config, position) {
        const resource = this.resources.items[config.mesh];
        if (!resource) {
            console.warn(`⚠️ Inimigo '${config.mesh}' não carregado! Usando Warrior como fallback.`);
            // Fallback de emergência se o modelo não existir (evita tela preta)
            if(config.mesh !== 'skel_warrior') {
                this.setupModel(this.stats.warrior, position);
            }
            return;
        }

        this.model = resource.scene.clone();
        this.model.position.copy(position);
        this.model.scale.set(config.scale, config.scale, config.scale);

        // Adiciona Arma
        const weaponRes = this.resources.items[config.weapon];
        if (weaponRes) {
            this.attachWeapon(this.model, weaponRes.scene.clone());
        }

        this.scene.add(this.model);

        // --- SISTEMA DE ANIMAÇÃO ROBUSTO ---
        this.mixer = new THREE.AnimationMixer(this.model);
        const clips = resource.animations || [];

        if (clips.length > 0) {
            // 1. Tenta achar por nome (mais seguro)
            let idleClip = clips.find(c => /idle/i.test(c.name)) || clips[0];
            let runClip = clips.find(c => /run|walk/i.test(c.name)) || clips[1] || idleClip;
            let attackClip = clips.find(c => /attack/i.test(c.name)) || clips[2] || runClip;
            let deathClip = clips.find(c => /death|die/i.test(c.name)) || clips[3] || idleClip;

            this.actions.idle = this.mixer.clipAction(idleClip);
            this.actions.run = this.mixer.clipAction(runClip);
            this.actions.attack = this.mixer.clipAction(attackClip);
            this.actions.death = this.mixer.clipAction(deathClip);
            
            this.actions.idle.play();
        } else {
            console.warn(`⚠️ Modelo ${config.mesh} não tem animações!`);
            // Cria ações vazias para não quebrar o código
            this.createDummyActions();
        }
    }

    createDummyActions() {
        // Cria "ações falsas" que não fazem nada, mas respondem aos métodos stop() e play()
        const dummy = { 
            play: () => {}, stop: () => {}, reset: () => { return dummy; }, 
            setLoop: () => { return dummy; }, isRunning: () => false, clampWhenFinished: true 
        };
        this.actions = { idle: dummy, run: dummy, attack: dummy, death: dummy };
    }

    attachWeapon(model, weaponMesh) {
        let handFound = false;
        model.traverse((child) => {
            // Procura mão direita (nomes variam muito em GLBs)
            if (child.isBone && (child.name.toLowerCase().includes('hand.r') || child.name.toLowerCase().includes('handright') || child.name.includes('Hand_R'))) {
                weaponMesh.position.set(0, 0, 0);
                weaponMesh.rotation.set(Math.PI, 0, Math.PI/2);
                child.add(weaponMesh);
                handFound = true;
            }
        });
        // Se não achou osso, cola no modelo mesmo (fallback feio mas funcional)
        if(!handFound) {
            weaponMesh.position.set(0.5, 1, 0);
            model.add(weaponMesh);
        }
    }

    update(deltaTime, playerPos, allEnemies) {
        if (this.isDead || !this.model) return;
        if (this.mixer) this.mixer.update(deltaTime);

        const distToPlayer = this.model.position.distanceTo(playerPos);

        // --- MÁQUINA DE ESTADOS ---
        if (this.state === 'PATROL') {
            if (distToPlayer < this.detectionRadius) {
                this.state = 'CHASE';
                return;
            }

            this.patrolTimer -= deltaTime;
            if (this.patrolTimer <= 0) {
                const rx = (Math.random() - 0.5) * 10;
                const rz = (Math.random() - 0.5) * 10;
                this.patrolTarget = new THREE.Vector3(this.model.position.x + rx, 0, this.model.position.z + rz);
                this.patrolTimer = 4 + Math.random() * 4;
            }
            this.moveTowards(this.patrolTarget, deltaTime, allEnemies);
        } 
        else if (this.state === 'CHASE') {
            if (distToPlayer > this.detectionRadius * 1.5) {
                this.state = 'PATROL';
                this.safePlay('idle');
                return;
            }

            if (distToPlayer <= this.attackRange) {
                this.safeStop('run');
                // Só ataca se a ação de ataque existir e não estiver rodando
                if (this.actions.attack && !this.actions.attack.isRunning()) {
                    this.actions.attack.reset().play();
                    if (Math.random() > 0.95) this.player.takeDamage(2); 
                }
                this.model.lookAt(playerPos.x, 0, playerPos.z);
            } else {
                this.safeStop('attack');
                this.moveTowards(playerPos, deltaTime, allEnemies);
            }
        }
    }

    moveTowards(target, deltaTime, allEnemies) {
        const direction = new THREE.Vector3().subVectors(target, this.model.position);
        direction.y = 0;
        const dist = direction.length();

        if (dist < 0.5) {
            this.safePlay('idle');
            return;
        }

        direction.normalize();
        
        // Separação (Não encavalar)
        const separation = new THREE.Vector3();
        let count = 0;
        for (const other of allEnemies) {
            if (other !== this && !other.isDead && other.model) {
                const d = this.model.position.distanceTo(other.model.position);
                if (d < 1.2) {
                    const push = new THREE.Vector3().subVectors(this.model.position, other.model.position).normalize();
                    separation.add(push);
                    count++;
                }
            }
        }
        if (count > 0) direction.add(separation.divideScalar(count)).normalize();

        this.model.lookAt(this.model.position.x + direction.x, 0, this.model.position.z + direction.z);
        this.model.position.add(direction.multiplyScalar(this.speed * deltaTime));
        
        this.safePlay('run');
    }

    // Helpers para evitar crash se a animação for nula
    safePlay(name) {
        // Para todas as outras e toca a solicitada
        if (name === 'run') {
            if(this.actions.idle) this.actions.idle.stop();
            if(this.actions.run && !this.actions.run.isRunning()) this.actions.run.play();
        }
        if (name === 'idle') {
            if(this.actions.run) this.actions.run.stop();
            if(this.actions.idle && !this.actions.idle.isRunning()) this.actions.idle.play();
        }
    }
    
    safeStop(name) {
        if(this.actions[name]) this.actions[name].stop();
    }

    checkHit(attackInfo) {
        if (this.isDead) return;
        const dist = this.model.position.distanceTo(attackInfo.position);
        if (dist < attackInfo.range) {
            const toEnemy = new THREE.Vector3().subVectors(this.model.position, attackInfo.position).normalize();
            const angle = toEnemy.dot(attackInfo.direction);
            if (angle > 0.5) this.takeDamage(5);
        }
    }

    takeDamage(amount) {
        if(this.isDead) return;
        this.health -= amount;
        
        this.model.traverse(c => { if(c.isMesh) { 
            c.material.emissive.setHex(0xff0000); 
            setTimeout(() => { if(c) c.material.emissive.setHex(0x000000); }, 200); 
        }});

        if (this.health <= 0) {
            this.isDead = true;
            this.safeStop('run');
            this.safeStop('idle');
            this.safeStop('attack');
            
            if(this.actions.death) {
                this.actions.death.reset().setLoop(THREE.LoopOnce).clampWhenFinished = true;
                this.actions.death.play();
            }
            
            setTimeout(() => { 
                if(this.model && this.model.parent) this.scene.remove(this.model); 
                this.model = null; // Marca para limpeza
            }, 3000);
        }
    }
}