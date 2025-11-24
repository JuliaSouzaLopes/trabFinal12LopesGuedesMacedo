import * as THREE from 'three';

export default class MapBuilder {
    constructor(scene, resources) {
        this.scene = scene;
        this.resources = resources;
        this.walls = []; 
        this.tileSize = 4.0; 
        
        this.spawnPoint = new THREE.Vector3(0, 0, 0); 
        this.enemySpawns = [];

        this.setupTexture(resources.items.dungeon_texture);
        this.setupTexture(resources.items.nature_texture);

        // LEGENDA DO MAPA:
        // 0 = Vazio (Abismo)
        // 1 = Chão Terra (Corredor/Salas)
        // 8 = Chão Pedra (Altar Boss)
        // 2 = Parede Sólida (Borda do mapa)
        // 3 = PILAR (Novo! Separa a nave das laterais sem fechar a visão)
        // 4 = Porta/Arco
        // 9 = Player Spawn (X Azul)
        // M = Minion | W = Warrior | R = Rogue | G = Mage | B = Boss
        // H = Cura
        // T = Tocha na parede (Decoração)
        // O = Entulho/Pedras (Bloqueio baixo)

         this.levelData = [
            // ALTAR DO BOSS (Norte) - Linha 0-3
            ['0','0','0','0','0','0','2','2','2','2','2','2','2','0','0','0','0','0','0'],
            ['0','0','0','0','0','0','2','T','8','B','8','T','2','0','0','0','0','0','0'], // Boss no altar
            ['0','0','0','0','0','0','2','8','8','8','8','8','2','0','0','0','0','0','0'],
            ['0','0','0','0','0','0','2','2','G','4','G','2','2','0','0','0','0','0','0'], // Magos guardando entrada
            
            // TRANSEPTO (Cruzamento horizontal) - Linha 4-6
            ['0','0','2','2','2','2','2','1','1','1','1','1','2','2','2','2','2','0','0'],
            ['0','0','2','H','W','1','1','1','1','1','1','1','1','1','W','H','2','0','0'], // Cura nas pontas, Warriors
            ['0','0','2','2','4','2','2','1','1','1','1','1','2','2','4','2','2','0','0'],
            
            // ALA OESTE (Esquerda) - Linha 7-10
            ['0','0','2','M','1','2','0','2','T','1','T','2','0','2','1','M','2','0','0'], // Minions nas alas
            ['0','0','2','1','R','2','0','2','1','1','1','2','0','2','R','1','2','0','0'], // Rogues protegidos
            ['0','0','2','M','1','2','0','2','1','1','1','2','0','2','1','M','2','0','0'],
            ['0','0','2','2','4','2','0','2','1','W','1','2','0','2','4','2','2','0','0'], // Warrior no centro
            
            // NAVE CENTRAL (Corredor principal) - Linha 11-16
            ['0','0','0','0','0','0','0','2','1','1','1','2','0','0','0','0','0','0','0'],
            ['0','0','0','0','0','0','0','2','M','1','M','2','0','0','0','0','0','0','0'], // Minions
            ['0','0','0','0','0','0','0','2','1','1','1','2','0','0','0','0','0','0','0'],
            ['0','0','0','0','0','0','0','2','1','G','1','2','0','0','0','0','0','0','0'], // Mago
            ['0','0','0','0','0','0','0','2','M','9','M','2','0','0','0','0','0','0','0'], // Minions
            ['0','0','0','0','0','0','0','2','1','1','1','2','0','0','0','0','0','0','0'],
            
            // ENTRADA (Sul) - Linha 17-19
            ['0','0','0','0','0','0','0','2','H','0','H','2','0','0','0','0','0','0','0'], // Cura na entrada
            ['0','0','0','0','0','0','0','2','2','4','2','2','0','0','0','0','0','0','0'], // Porta
            ['0','0','0','0','0','0','0','0','2','0','2','0','0','0','0','0','0','0','0'], // Player spawn
        ];
    }


    setupTexture(texture) {
        if(!texture) return;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.flipY = false;
    }

    build() {
        const mapGroup = new THREE.Group();
        mapGroup.name = "SanctuaryMap";
        this.walls = []; 
        this.enemySpawns = [];

        const offsetX = (this.levelData[0].length * this.tileSize) / 2;
        const offsetZ = (this.levelData.length * this.tileSize) / 2;

        this.levelData.forEach((row, z) => {
            row.forEach((type, x) => {
                const posX = (x * this.tileSize) - offsetX;
                const posZ = (z * this.tileSize) - offsetZ;

                // Lógica de Chão: Se não for vazio, tem chão
                if (type !== '0') {
                    // Se for 8 é pedra (boss), senão é terra
                    const floorType = (type === '8' || type === 'B') ? 'floor_stone' : 'floor'; 
                    // Se não tiver floor_stone carregado, usa floor normal
                    const finalFloor = this.resources.items[floorType] ? floorType : 'floor';
                    this.spawnMesh(finalFloor, posX, 0, posZ, mapGroup, 'dungeon_texture', false);
                }

                switch(type) {
                    // --- Entidades ---
                    case '9': this.spawnPoint.set(posX, 0, posZ); break;
                    case 'M': this.enemySpawns.push({ type: 'minion', pos: new THREE.Vector3(posX, 0, posZ) }); break;
                    case 'W': this.enemySpawns.push({ type: 'warrior', pos: new THREE.Vector3(posX, 0, posZ) }); break;
                    case 'R': this.enemySpawns.push({ type: 'rogue', pos: new THREE.Vector3(posX, 0, posZ) }); break;
                    case 'G': this.enemySpawns.push({ type: 'mage', pos: new THREE.Vector3(posX, 0, posZ) }); break;
                    case 'B': this.enemySpawns.push({ type: 'boss', pos: new THREE.Vector3(posX, 0, posZ) }); break;
                    case 'H': this.createHealSpot(posX, posZ, mapGroup); break;
                    
                    // --- Estrutura ---
                    case '2': // Parede Automática
                    case 'T': // Parede com Tocha
                        this.createAutoWall(x, z, posX, posZ, mapGroup); 
                        if (type === 'T') this.spawnProp('torch', posX, 2.5, posZ, mapGroup);
                        break;
                    
                    case '3': // Pilar (Novo!)
                        this.spawnMesh('pillar', posX, 0, posZ, mapGroup, 'dungeon_texture', true);
                        break;

                    case '4': // Porta
                        const door = this.spawnMesh('wall_doorway', posX, 0, posZ, mapGroup, 'dungeon_texture', true);
                        // Rotação baseada nas paredes vizinhas
                        if (this.checkWall(x-1, z) && this.checkWall(x+1, z)) {
                           // Leste-Oeste, rotação 0
                        } else {
                           door.rotation.y = Math.PI / 2;
                        }
                        break;
                    
                    case 'O': // Entulho (Bloqueio)
                         this.spawnMesh('rubble', posX, 0, posZ, mapGroup, 'dungeon_texture', true);
                         break;

                    case '5': this.spawnMesh('barrel', posX, 0, posZ, mapGroup, 'dungeon_texture', true); break;
                    case '6': this.spawnMesh('crate', posX, 0, posZ, mapGroup, 'dungeon_texture', true); break;
                }
            });
        });

        this.scene.add(mapGroup);
        this.createSanctuaryLighting();
    }

    createHealSpot(x, z, group) {
        const light = new THREE.PointLight(0x00ff00, 4, 6);
        light.position.set(x, 1.5, z);
        group.add(light);
        this.spawnMesh('barrel', x, 0, z, group, 'dungeon_texture', true);
    }

    createAutoWall(x, z, wx, wz, group) {
        // Verifica vizinhos para conectar paredes
        const n = this.checkWall(x, z - 1) ? 1 : 0;
        const e = this.checkWall(x + 1, z) ? 1 : 0;
        const s = this.checkWall(x, z + 1) ? 1 : 0;
        const w = this.checkWall(x - 1, z) ? 1 : 0;
        const mask = (n * 1) + (e * 2) + (s * 4) + (w * 8);
        
        let mesh = 'wall';
        let rot = 0;

        // Tabela de tileset simples
        switch(mask) {
            case 0: mesh='pillar'; break; // Sozinho vira pilar
            
            case 1: mesh='wall_endcap'; rot = Math.PI; break;
            case 2: mesh='wall_endcap'; rot = Math.PI/2; break;
            case 4: mesh='wall_endcap'; rot = 0; break;
            case 8: mesh='wall_endcap'; rot = -Math.PI/2; break;
            
            case 5: mesh='wall'; rot = Math.PI/2; break; // Reta Vertical
            case 10: mesh='wall'; rot = 0; break;        // Reta Horizontal
            
            case 3: mesh='wall_corner'; rot = Math.PI/2; break;
            case 6: mesh='wall_corner'; rot = 0; break;
            case 12: mesh='wall_corner'; rot = -Math.PI/2; break;
            case 9: mesh='wall_corner'; rot = Math.PI; break;
            
            case 7: mesh='wall_tsplit'; rot = 0; break;
            case 14: mesh='wall_tsplit'; rot = -Math.PI/2; break;
            case 13: mesh='wall_tsplit'; rot = Math.PI; break;
            case 11: mesh='wall_tsplit'; rot = Math.PI/2; break;
            
            case 15: mesh='wall_crossing'; rot = 0; break;
            
            default: mesh='wall'; 
        }

        const obj = this.spawnMesh(mesh, wx, 0, wz, group, 'dungeon_texture', true);
        if(obj) obj.rotation.y = rot;
    }

    checkWall(x, z) {
        if (z < 0 || z >= this.levelData.length || x < 0 || x >= this.levelData[0].length) return false;
        const t = this.levelData[z][x];
        // Paredes (2), Tochas (T) e Portas (4) se conectam. Pilares (3) NÃO se conectam com paredes.
        return t === '2' || t === '4' || t === 'T';
    }

    spawnMesh(name, x, y, z, group, textureName, isSolid) {
        // Fallback: se não tiver o pilar carregado, usa parede
        let finalName = name;
        if (name === 'pillar' && !this.resources.items['pillar']) finalName = 'wall';
        if (name === 'floor_stone' && !this.resources.items['floor_stone']) finalName = 'floor';
        if (name === 'rubble' && !this.resources.items['rubble']) finalName = 'crate';

        const resource = this.resources.items[finalName];
        if (!resource) return null;
        
        const mesh = resource.scene.clone();
        mesh.position.set(x, y, z);
        mesh.scale.set(3.5, 3.5, 3.5); // Escala mantida
        
        const texture = this.resources.items[textureName];
        if (texture) {
            mesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if(child.material) {
                         child.material.map = texture;
                         child.material.roughness = 0.8;
                         child.material.needsUpdate = true;
                    }
                    if(isSolid) child.userData.isWall = true; // Importante para colisão e visão
                }
            });
        }
        
        if (isSolid) this.walls.push(mesh);
        group.add(mesh);
        return mesh;
    }

    spawnProp(name, x, y, z, group) {
        const resource = this.resources.items[name];
        if (!resource) return;
        const mesh = resource.scene.clone();
        mesh.position.set(x, y, z);
        mesh.scale.set(3.5, 3.5, 3.5);
        // Props geralmente não colidem, apenas decoram
        group.add(mesh);
    }

    createSanctuaryLighting() {
        this.scene.children.forEach(c => { if(c.isLight) this.scene.remove(c); });
        
        // Ambiente mais escuro para destacar as tochas
        const ambient = new THREE.AmbientLight(0x404040, 0.3); 
        this.scene.add(ambient);
        
        // Luz direcional principal (Lua/Janelas altas)
        const dirLight = new THREE.DirectionalLight(0x6677aa, 0.8);
        dirLight.position.set(20, 50, 20);
        dirLight.castShadow = true;
        
        // Configuração de sombras para cobrir o mapa todo
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        const d = 60;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        this.scene.add(dirLight);

        // Adiciona PointLights onde tem tochas (T)
        this.levelData.forEach((row, z) => {
            row.forEach((type, x) => {
                if (type === 'T') {
                    const offsetX = (this.levelData[0].length * this.tileSize) / 2;
                    const offsetZ = (this.levelData.length * this.tileSize) / 2;
                    const posX = (x * this.tileSize) - offsetX;
                    const posZ = (z * this.tileSize) - offsetZ;
                    
                    const torchLight = new THREE.PointLight(0xffaa00, 3, 10);
                    torchLight.position.set(posX, 3, posZ);
                    this.scene.add(torchLight);
                }
            });
        });
    }
}