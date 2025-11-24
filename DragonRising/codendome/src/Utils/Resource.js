import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default class Resources {
    constructor() {
        this.items = {};
        this.toLoad = [
            // --- PLAYER ---
            { name: 'knight', type: 'glb', path: '/models/Knight.glb' },
            { name: 'knightTexture', type: 'texture', path: '/models/Textures/knight_texture.png' },
            { name: 'sword', type: 'gltf', path: '/models/sword_1handed.gltf' },
            { name: 'shield', type: 'gltf', path: '/models/shield_round.gltf' },

            // --- INIMIGOS (Mantidos) ---
            { name: 'skel_minion', type: 'glb', path: '/models/Enemies/Skeleton_Minion.glb' },
            { name: 'skel_warrior', type: 'glb', path: '/models/Enemies/Skeleton_Warrior.glb' },
            { name: 'skel_mage', type: 'glb', path: '/models/Enemies/Skeleton_Mage.glb' },
            { name: 'skel_rogue', type: 'glb', path: '/models/Enemies/Skeleton_Rogue.glb' },
            { name: 'skel_texture', type: 'texture', path: '/models/Textures/skeleton_texture.png' },
            // (Mantenha as armas dos inimigos aqui também...)
            { name: 'skel_blade', type: 'gltf', path: '/models/Enemies/Weapons/Skeleton_Blade.gltf' },
            { name: 'skel_axe', type: 'gltf', path: '/models/Enemies/Weapons/Skeleton_Axe.gltf' },
            { name: 'skel_staff', type: 'gltf', path: '/models/Enemies/Weapons/Skeleton_Staff.gltf' },
            { name: 'skel_shield', type: 'gltf', path: '/models/Enemies/Weapons/Skeleton_Shield_Small_A.gltf' },


            // ARMAS
            { name: 'skel_blade', type: 'gltf', path: '/models/Enemies/Weapons/Skeleton_Blade.gltf' },
            { name: 'skel_axe', type: 'gltf', path: '/models/Enemies/Weapons/Skeleton_Axe.gltf' },
            { name: 'skel_staff', type: 'gltf', path: '/models/Enemies/Weapons/Skeleton_Staff.gltf' },
            { name: 'skel_shield', type: 'gltf', path: '/models/Enemies/Weapons/Skeleton_Shield_Small_A.gltf' },

            // ANIMAÇÕES
            { name: 'animMelee', type: 'glb', path: '/models/Animation/Rig_Medium_CombatMelee.glb' },
            { name: 'animMoveBasic', type: 'glb', path: '/models/Animation/Rig_Medium_MovementBasic.glb' },
            { name: 'animMoveAdv', type: 'glb', path: '/models/Animation/Rig_Medium_MovementAdvanced.glb' },
            { name: 'animGeneral', type: 'glb', path: '/models/Animation/Rig_Medium_General.glb' },

            { name: 'dungeon_texture', type: 'texture', path: '/models/Dungeons/dungeon_texture.png' },

            // A textura da floresta também está na raiz da pasta Nature
            { name: 'nature_texture', type: 'texture', path: '/models/Nature/forest_texture.png' },

            // Paredes e Props
            { name: 'wall', type: 'gltf', path: '/models/Dungeons/wall.gltf' },
            { name: 'wall_corner', type: 'gltf', path: '/models/Dungeons/wall_corner.gltf' },
            { name: 'wall_doorway', type: 'gltf', path: '/models/Dungeons/wall_doorway.gltf' },
            { name: 'wall_endcap', type: 'gltf', path: '/models/Dungeons/wall_endcap.gltf' },
            { name: 'wall_tsplit', type: 'gltf', path: '/models/Dungeons/wall_Tsplit.gltf' },
            { name: 'wall_crossing', type: 'gltf', path: '/models/Dungeons/wall_crossing.gltf' },
            { name: 'floor', type: 'gltf', path: '/models/Dungeons/floor_dirt_large.gltf' },
            { name: 'barrel', type: 'gltf', path: '/models/Dungeons/barrel_small.gltf' },
            { name: 'crate', type: 'gltf', path: '/models/Dungeons/crates_stacked.gltf' },
            { name: 'pillar', type: 'gltf', path: '/models/Dungeons/pillar.gltf' },
            { name: 'torch', type: 'gltf', path: '/models/Dungeons/torch_mounted.gltf' },
            { name: 'rubble', type: 'gltf', path: '/models/Dungeons/rubble_large.gltf' },
            { name: 'floor_stone', type: 'gltf', path: '/models/Dungeons/floor_tile_large.gltf' }, // Para o Boss

            // Natureza
            { name: 'tree', type: 'gltf', path: '/models/Nature/Tree_2_A_Color1.gltf' },
            { name: 'rock', type: 'gltf', path: '/models/Nature/Rock_2_A_Color1.gltf' }
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
        if (this.totalCount === 0) { if (this.onReady) this.onReady(); return; }

        for (const asset of this.toLoad) {
            const loader = asset.type === 'texture' ? this.loaders.textureLoader : this.loaders.gltfLoader;

            loader.load(
                asset.path,
                (file) => {
                    this.items[asset.name] = file;
                    this.checkDone();
                },
                null,
                (err) => {
                    console.error(`❌ Erro em ${asset.name}:`, err);
                    this.checkDone();
                }
            );
        }
    }

    checkDone() {
        this.loadedCount++;
        if (this.loadedCount === this.totalCount) {
            console.log("Resources: Todos os assets carregados.");
            if (this.onReady) this.onReady();
        }
    }
}