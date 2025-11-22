import * as THREE from 'three';

export default class MapBuilder {
    constructor(scene, resources) {
        this.scene = scene;
        this.resources = resources;
        this.walls = []; 
        this.tileSize = 4.0; // Mantendo escala
        
        this.setupTexture(resources.items.dungeon_texture);
        this.setupTexture(resources.items.nature_texture);

        // LEGENDA:
        // 0=Vazio, 1=Chão, 2=Parede (Auto), 3=Invisivel, 4=Porta
        // 5=Barril, 6=Caixa, 9=Fogueira, T=Arvore, R=Pedra

        // MAPA GIGANTE (30x30) com ROTAS CLARAS
        this.levelData = [
            ['T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T'],
            ['T','T','T','T','T','T','2','2','2','2','2','2','2','2','2','2','2','2','2','2','T','T','T','T','T','T','T','T','T','T'],
            ['T','T','T','T','T','T','2','1','1','1','1','1','1','1','1','1','1','1','1','2','T','T','T','T','T','T','T','T','T','T'], // Arena Norte (Boss)
            ['T','T','T','T','T','T','2','1','6','1','5','1','9','1','5','1','6','1','1','2','T','T','T','T','T','T','T','T','T','T'],
            ['T','T','T','T','T','T','2','1','1','1','1','1','1','1','1','1','1','1','1','2','T','T','T','T','T','T','T','T','T','T'],
            ['T','2','2','2','2','2','2','2','2','2','2','4','2','2','4','2','2','2','2','2','2','2','2','2','2','T','T','T','T','T'],
            ['T','2','1','1','1','1','1','1','2','1','1','1','1','1','1','1','1','2','1','1','1','1','1','1','2','T','T','T','T','T'],
            ['T','2','1','5','1','1','6','1','4','1','1','1','1','1','1','1','1','4','1','6','1','1','5','1','2','T','T','T','T','T'],
            ['T','2','1','1','1','1','1','1','2','1','1','1','1','1','1','1','1','2','1','1','1','1','1','1','2','T','T','T','T','T'],
            ['T','2','2','2','2','4','2','2','2','1','1','1','1','1','1','1','1','2','2','2','4','2','2','2','2','T','T','T','T','T'], // Corredor Largo Central
            ['T','T','T','T','T','1','1','1','2','1','1','1','1','1','1','1','1','2','1','1','1','T','T','T','T','T','T','T','T','T'],
            ['T','T','T','T','T','1','1','1','2','1','1','1','9','1','1','1','1','2','1','1','1','T','T','T','T','T','T','T','T','T'], // Hub Central (Fogueira)
            ['T','T','T','T','T','1','1','1','2','1','1','1','1','1','1','1','1','2','1','1','1','T','T','T','T','T','T','T','T','T'],
            ['T','2','2','2','2','4','2','2','2','2','4','2','2','2','2','4','2','2','2','2','4','2','2','2','2','T','T','T','T','T'],
            ['T','2','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','2','T','T','T','T','T'], // Corredor Sul
            ['T','2','1','5','1','6','1','5','1','6','1','5','1','1','5','1','6','1','5','1','6','1','5','1','2','T','T','T','T','T'],
            ['T','2','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','1','2','T','T','T','T','T'],
            ['T','2','2','2','2','2','2','2','2','2','2','2','1','1','2','2','2','2','2','2','2','2','2','2','2','T','T','T','T','T'],
            ['T','T','T','T','T','T','T','T','T','T','T','2','1','1','2','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T'], // Entrada Estreita
            ['T','T','T','T','T','T','T','T','T','T','T','2','1','1','2','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T'],
            ['T','T','T','T','T','T','T','T','T','T','T','2','1','1','2','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T'],
            ['T','T','T','T','T','T','T','T','T','T','T','2','3','3','2','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T'], // Parede Invisível Sul
            ['T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T','T'],
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

        const offsetX = (this.levelData[0].length * this.tileSize) / 2;
        const offsetZ = (this.levelData.length * this.tileSize) / 2;

        this.levelData.forEach((row, z) => {
            row.forEach((type, x) => {
                const posX = (x * this.tileSize) - offsetX;
                const posZ = (z * this.tileSize) - offsetZ;

                // Chão (tudo que não é abismo ou árvore de fundo)
                if (type !== '0' && type !== 'T') {
                    this.spawnMesh('floor', posX, 0, posZ, mapGroup, 'dungeon_texture', false);
                }

                if (type === '2') this.createAutoWall(x, z, posX, posZ, mapGroup);
                else if (type === '3') this.createInvisibleWall(posX, posZ, mapGroup);
                else if (type === '4') {
                    const door = this.spawnMesh('wall_doorway', posX, 0, posZ, mapGroup, 'dungeon_texture', true);
                    if(this.checkWall(x-1, z)) door.rotation.y = Math.PI / 2;
                }
                else if (type === '5') this.spawnMesh('barrel', posX, 0, posZ, mapGroup, 'dungeon_texture', true);
                else if (type === '6') this.spawnMesh('crate', posX, 0, posZ, mapGroup, 'dungeon_texture', true);
                else if (type === '9') this.createCampfire(posX, posZ, mapGroup);
                else if (type === 'T') this.spawnNature('tree', posX, posZ, mapGroup, 1.5);
                else if (type === 'R') this.spawnNature('rock', posX, posZ, mapGroup, 2.0);
            });
        });

        this.scene.add(mapGroup);
        this.createSanctuaryLighting();
    }

    // --- LÓGICA DE PAREDES INTELIGENTES (BITMASK) ---
    createAutoWall(x, z, wx, wz, group) {
        const n = this.checkWall(x, z - 1) ? 1 : 0;
        const e = this.checkWall(x + 1, z) ? 1 : 0;
        const s = this.checkWall(x, z + 1) ? 1 : 0;
        const w = this.checkWall(x - 1, z) ? 1 : 0;
        const mask = (n * 1) + (e * 2) + (s * 4) + (w * 8);

        let mesh = 'wall';
        let rot = 0;

        switch(mask) {
            case 0: mesh='wall'; break;
            case 1: mesh='wall_endcap'; rot = Math.PI; break;
            case 2: mesh='wall_endcap'; rot = Math.PI/2; break;
            case 4: mesh='wall_endcap'; rot = 0; break;
            case 8: mesh='wall_endcap'; rot = -Math.PI/2; break;
            case 5: mesh='wall'; rot = Math.PI/2; break;
            case 10: mesh='wall'; rot = 0; break;
            case 3: mesh='wall_corner'; rot = Math.PI/2; break;
            case 6: mesh='wall_corner'; rot = 0; break;
            case 12: mesh='wall_corner'; rot = -Math.PI/2; break;
            case 9: mesh='wall_corner'; rot = Math.PI; break;
            case 7: mesh='wall_tsplit'; rot = 0; break;
            case 14: mesh='wall_tsplit'; rot = -Math.PI/2; break;
            case 13: mesh='wall_tsplit'; rot = Math.PI; break;
            case 11: mesh='wall_tsplit'; rot = Math.PI/2; break;
            case 15: mesh='wall_crossing'; rot=0; break;
            default: mesh='wall';
        }
        
        if(!this.resources.items[mesh]) mesh = 'wall'; // Fallback

        const obj = this.spawnMesh(mesh, wx, 0, wz, group, 'dungeon_texture', true);
        if(obj) obj.rotation.y = rot;
    }

    checkWall(x, z) {
        if (z < 0 || z >= this.levelData.length || x < 0 || x >= this.levelData[0].length) return false;
        const t = this.levelData[z][x];
        return t === '2' || t === '4' || t === '3';
    }

    createInvisibleWall(x, z, group) {
        const geo = new THREE.BoxGeometry(3.5, 5, 3.5);
        const mat = new THREE.MeshBasicMaterial({ visible: false });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, 2.5, z);
        mesh.userData.isWall = true; 
        this.walls.push(mesh); 
        group.add(mesh);
    }

    spawnMesh(name, x, y, z, group, textureName, isSolid) {
        const resource = this.resources.items[name];
        if (!resource) return null;

        const mesh = resource.scene.clone();
        mesh.position.set(x, y, z);
        mesh.scale.set(3.5, 3.5, 3.5); 

        const texture = this.resources.items[textureName];
        if (texture) {
            mesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
                    if(isSolid) child.userData.isWall = true;
                }
            });
        }

        if (isSolid) this.walls.push(mesh);
        group.add(mesh);
        return mesh;
    }

    spawnNature(name, x, z, group, baseScale) {
        const mesh = this.spawnMesh(name, x, 0, z, group, 'nature_texture', false);
        if(!mesh) return;
        mesh.rotation.y = Math.random() * Math.PI * 2;
        const s = baseScale + (Math.random() * 0.4 - 0.2);
        mesh.scale.set(s * 3.5, s * 3.5, s * 3.5);
    }

    createCampfire(x, z, group) {
        const light = new THREE.PointLight(0xff6600, 8, 20); // Luz maior
        light.position.set(x, 2.0, z);
        light.castShadow = true;
        group.add(light);
        this.spawnMesh('crate', x+1, 0, z, group, 'dungeon_texture', true);
        this.spawnMesh('barrel', x-1, 0, z, group, 'dungeon_texture', true);
    }

    createSanctuaryLighting() {
        this.scene.children.forEach(c => { if(c.isLight) this.scene.remove(c); });
        const ambient = new THREE.AmbientLight(0x404040, 1.2); 
        this.scene.add(ambient);
        const moonLight = new THREE.DirectionalLight(0x6688ff, 0.8);
        moonLight.position.set(20, 30, 20);
        moonLight.castShadow = true;
        this.scene.add(moonLight);
    }
}