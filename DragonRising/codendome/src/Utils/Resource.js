import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default class Resources {
    constructor() {
        this.items = {};
        this.toLoad = [
            // Personagem
            { name: 'knight', type: 'glb', path: '/models/Knight.glb' },
            { name: 'knightTexture', type: 'texture', path: '/models/Textures/knight_texture.png' },
            
            // *** NOVO: Animações separadas ***
            { name: 'knightAnims', type: 'glb', path: '/models/animations.glb' },
            
            // *** NOVO: Armas ***
            { name: 'sword', type: 'gltf', path: '/models/sword_1handed.gltf' },
            { name: 'shield', type: 'gltf', path: '/models/shield_round.gltf' },

            // Cenário
            { name: 'townMap', type: 'texture', path: '/models/Textures/colormap.png' },
            { name: 'road', type: 'glb', path: '/models/road.glb' },
            { name: 'tree', type: 'glb', path: '/models/tree.glb' }
        ];
        
        this.loaders = {
            gltfLoader: new GLTFLoader(),
            textureLoader: new THREE.TextureLoader()
        };

        this.loadedCount = 0;
        this.totalCount = this.toLoad.length;
        this.onReady = null; 
    }

    load() {
        if(this.totalCount === 0) {
            if(this.onReady) this.onReady();
            return;
        }

        for (const asset of this.toLoad) {
            if (asset.type === 'glb' || asset.type === 'gltf') {
                this.loaders.gltfLoader.load(
                    asset.path,
                    (file) => { this.sourceLoaded(asset, file); },
                    null,
                    (error) => { console.error(`Erro ao carregar ${asset.name}:`, error); }
                );
            } 
            else if (asset.type === 'texture') {
                this.loaders.textureLoader.load(
                    asset.path,
                    (file) => { this.sourceLoaded(asset, file); },
                    null,
                    (error) => { console.error(`Erro ao carregar ${asset.name}:`, error); }
                );
            }
        }
    }

    sourceLoaded(asset, file) {
        this.items[asset.name] = file;
        this.loadedCount++;

        if (this.loadedCount === this.totalCount) {
            console.log("Todos os assets carregados!");
            if(this.onReady) this.onReady();
        }
    }
}