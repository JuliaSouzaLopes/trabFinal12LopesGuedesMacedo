import * as THREE from 'three';

export default class MapBuilder {
    constructor(scene, resources) {
        this.scene = scene;
        this.resources = resources;
        
        // O KayKit usa escala pequena. TileSize 1.73 (raiz de 3) é comum para hexágonos, 
        // mas para grade quadrada vamos testar 2 e ajustar.
        this.tileSize = 1.6; 

        this.texture = resources.items.map_texture;
        if (this.texture) {
            this.texture.colorSpace = THREE.SRGBColorSpace;
            this.texture.magFilter = THREE.NearestFilter;
            this.texture.minFilter = THREE.NearestFilter;
            this.texture.flipY = false;
        }

        // Layout (0=Entrada, 1=Chão, 2=Parede, 3=Casa, 4=Torre)
        this.levelData = [
            [4, 2, 2, 2, 2, 2, 4],
            [2, 1, 1, 1, 1, 1, 2],
            [2, 1, 3, 1, 3, 1, 2], // Casas no meio
            [2, 1, 1, 1, 1, 1, 2],
            [2, 1, 1, 1, 1, 1, 2],
            [2, 1, 1, 0, 1, 1, 2], // Entrada
            [4, 2, 2, 0, 2, 2, 4],
        ];
    }

    build() {
        const mapGroup = new THREE.Group();
        const offsetX = (this.levelData[0].length * this.tileSize) / 2;
        const offsetZ = (this.levelData.length * this.tileSize) / 2;

        this.levelData.forEach((row, z) => {
            row.forEach((type, x) => {
                const posX = (x * this.tileSize) - offsetX;
                // Adicionamos um offset no Z para cada linha impar se quisessemos hex grid real, 
                // mas vamos manter quadrado para facilitar a colisão por enquanto.
                const posZ = (z * this.tileSize) - offsetZ;
                
                this.createTile(type, posX, posZ, x, z, mapGroup);
            });
        });

        this.scene.add(mapGroup);
        this.createLighting();
    }

    createTile(type, x, z, gridX, gridZ, group) {
        // Chão em tudo (menos buraco absoluto)
        if (type !== -1) {
            const floor = this.spawnMesh('floor_grass', x, 0, z);
            // Rotacionar aleatoriamente para variar a grama
            floor.rotation.y = Math.floor(Math.random() * 6) * (Math.PI / 3);
            group.add(floor);
        }

        if (type === 0) return; // Entrada (Só chão)

        // Paredes
        if (type === 2) {
            // Lógica simples de rotação para paredes
            let meshName = 'wall_straight';
            let rotY = 0;

            const isTop = gridZ === 0;
            const isBottom = gridZ === this.levelData.length - 1;
            const isLeft = gridX === 0;
            const isRight = gridX === this.levelData[0].length - 1;

            if (isTop) rotY = Math.PI / 2;
            else if (isBottom) rotY = -Math.PI / 2;
            else if (isLeft) rotY = Math.PI;
            else if (isRight) rotY = 0;

            // Cantos
            if ((isTop && isLeft) || (isTop && isRight) || (isBottom && isLeft) || (isBottom && isRight)) {
                meshName = 'wall_corner';
                // Ajuste de rotação específico para cantos se necessário
                if(isTop && isLeft) rotY = Math.PI / 2;
                if(isTop && isRight) rotY = 0;
                if(isBottom && isRight) rotY = -Math.PI / 2;
                if(isBottom && isLeft) rotY = Math.PI;
            }

            const wall = this.spawnMesh(meshName, x, 0, z);
            wall.rotation.y = rotY;
            group.add(wall);
        }

        // Casas
        if (type === 3) {
            const house = this.spawnMesh('house_a', x, 0, z);
            group.add(house);
        }

        // Torres (Cantos)
        if (type === 4) {
            const tower = this.spawnMesh('tower_a', x, 0, z);
            group.add(tower);
        }
    }

    spawnMesh(name, x, y, z) {
        const res = this.resources.items[name];
        if (!res) return new THREE.Object3D();

        const mesh = res.scene.clone();
        mesh.position.set(x, y, z);
        
        // Escala do KayKit é ok, mas podemos ajustar
        mesh.scale.set(1, 1, 1); 

        mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                // APLICA A TEXTURA ÚNICA DO ATLAS
                if (this.texture) {
                    child.material = child.material.clone();
                    child.material.map = this.texture;
                    child.material.needsUpdate = true;
                }
            }
        });
        return mesh;
    }

    createLighting() {
        const sun = new THREE.DirectionalLight(0xffffff, 1);
        sun.position.set(5, 10, 5);
        sun.castShadow = true;
        this.scene.add(sun);

        const ambient = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambient);
    }
}
