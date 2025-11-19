import * as THREE from 'three';

export default class Enemy {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position;
        
        // Status
        this.health = 3; // Morre com 3 golpes
        this.isDead = false;

        // Visual (Cubo Vermelho)
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Vermelho
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.scene.add(this.mesh);
    }

    takeDamage(amount) {
        if (this.isDead) return;

        this.health -= amount;
        console.log(`🩸 Inimigo atingido! Vida: ${this.health}`);

        // Feedback Visual (Piscar Branco)
        this.mesh.material.color.set(0xffffff);
        
        if (this.health <= 0) {
            this.die();
        } else {
            // Voltar a ser vermelho depois de 0.1s
            setTimeout(() => {
                if (!this.isDead) this.mesh.material.color.set(0xff0000);
            }, 100);
        }
    }

    die() {
        this.isDead = true;
        console.log("💀 Inimigo Morto!");

        // Feedback de Morte (Fica cinza e cai no chão)
        this.mesh.material.color.set(0x333333); // Cinza escuro (Cinzas)
        this.mesh.rotation.x = -Math.PI * 0.5; // Tomba para trás
        this.mesh.position.y = 0.5; // Ajusta altura para ficar no chão

        // (Opcional) Remover da cena após 2 segundos
        setTimeout(() => {
            this.scene.remove(this.mesh);
        }, 2000);
    }
}