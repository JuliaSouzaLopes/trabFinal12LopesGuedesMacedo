import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default class Resources {
    constructor() {
        this.items = {};
        this.toLoad = [
            // --- PERSONAGEM E ANIMAÇÕES (MANTIDOS) ---
            { name: 'knight', type: 'glb', path: '/models/Knight.glb' },
            { name: 'knightTexture', type: 'texture', path: '/models/Textures/knight_texture.png' },
            { name: 'animMelee', type: 'glb', path: '/models/Animation/Rig_Medium_CombatMelee.glb' },
            { name: 'animMoveBasic', type: 'glb', path: '/models/Animation/Rig_Medium_MovementBasic.glb' },
            { name: 'animMoveAdv', type: 'glb', path: '/models/Animation/Rig_Medium_MovementAdvanced.glb' },
            { name: 'animGeneral', type: 'glb', path: '/models/Animation/Rig_Medium_General.glb' },
            { name: 'sword', type: 'gltf', path: '/models/sword_1handed.gltf' },
            { name: 'shield', type: 'gltf', path: '/models/shield_round.gltf' },

            // --- INIMIGOS (MANTIDOS) ---
            { name: 'skel_minion', type: 'glb', path: '/models/Enemies/Skeleton_Minion.glb' },
            { name: 'skel_warrior', type: 'glb', path: '/models/Enemies/Skeleton_Warrior.glb' },
            { name: 'skel_mage', type: 'glb', path: '/models/Enemies/Skeleton_Mage.glb' },
            { name: 'skel_rogue', type: 'glb', path: '/models/Enemies/Skeleton_Rogue.glb' },
            { name: 'skel_texture', type: 'texture', path: '/models/Textures/skeleton_texture.png' },
            { name: 'skel_blade', type: 'gltf', path: '/models/Enemies/Weapons/Skeleton_Blade.gltf' },
            { name: 'skel_axe', type: 'gltf', path: '/models/Enemies/Weapons/Skeleton_Axe.gltf' },
            { name: 'skel_staff', type: 'gltf', path: '/models/Enemies/Weapons/Skeleton_Staff.gltf' },
            { name: 'skel_shield', type: 'gltf', path: '/models/Enemies/Weapons/Skeleton_Shield_Small_A.gltf' },

            // --- NOVO CENÁRIO (KAYKIT HEXAGON) ---
            // 1. A Textura Única
            { name: 'map_texture', type: 'texture', path: '/models/Sanctuary/Textures/kaykit_map_texture.png' },

            // 2. Os Modelos
            { name: 'floor_grass', type: 'glb', path: '/models/Sanctuary/hex_grass.gltf' },
            { name: 'wall_straight', type: 'glb', path: '/models/Sanctuary/wall_straight.gltf' },
            { name: 'wall_corner', type: 'glb', path: '/models/Sanctuary/wall_corner_A_outside.gltf' },
            { name: 'wall_gate', type: 'glb', path: '/models/Sanctuary/wall_straight_gate.gltf' },
            { name: 'house_a', type: 'glb', path: '/models/Sanctuary/building_home_A_yellow.gltf' },
            { name: 'tower_a', type: 'glb', path: '/models/Sanctuary/building_tower_A_yellow.gltf' }
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
        if (this.totalCount === 0) {
            if (this.onReady) this.onReady();
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
            if (this.onReady) this.onReady();
        }
    }
}
