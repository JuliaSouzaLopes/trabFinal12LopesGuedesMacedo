import * as THREE from 'three';

export default class Environment {
    constructor(scene) {
        this.scene = scene;
        this.setSunlight();
        this.setFog();
    }

    setSunlight() {
        // Luz Ambiente Fria (Azulada/Cinza para Inverno)
        this.ambientLight = new THREE.AmbientLight(0xb9d5ff, 0.6); // Cor de gelo
        this.scene.add(this.ambientLight);

        // Luz do Sol (Pálida e inclinada)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.sunLight.position.set(10, 10, -5);
        this.sunLight.castShadow = true;
        
        // Ajuste de Sombras para ficarem nítidas
        this.sunLight.shadow.camera.far = 50;
        this.sunLight.shadow.mapSize.set(2048, 2048);
        this.sunLight.shadow.normalBias = 0.05;
        
        this.scene.add(this.sunLight);
    }

    setFog() {
        // Neblina densa para esconder o fim do mapa e dar clima de mistério
        // Cor: #87CEEB (Céu) ou algo mais cinza #a0a0a0
        const fogColor = new THREE.Color('#a0a0a0'); 
        this.scene.background = fogColor;
        
        // Fog exponencial (mais realista)
        // 0.02 é a densidade. Aumente para mais neblina.
        this.scene.fog = new THREE.FogExp2(fogColor, 0.03);
    }
}