let camera, scene, renderer, controls;

const objects = [];
let raycaster;

const mobs = [];
const bullets = [];
let attackRaycaster;
let lastMobDamageTime = 0;

// === CHUNK RENDSZER ===
const BLOCK_SIZE = 20;
const CHUNK_SIZE = 6;
const RENDER_DIST = 3;
const chunks = {};
let lastChunkX = null;
let lastChunkZ = null;

// Blokk típusok
const BLOCK_TYPES = [
    { color: 0x4CAF50, name: 'grass' },
    { color: 0x8B4513, name: 'dirt' },
    { color: 0x808080, name: 'stone' },
];

// Eszköztár blokk típusok
const TOOLBAR_BLOCKS = [
    { color: 0x4CAF50, name: 'Fű' },
    { color: 0x8B4513, name: 'Föld' },
    { color: 0x808080, name: 'Kő' },
    { color: 0xC2B280, name: 'Homok' },
    { color: 0x6D4C2A, name: 'Fa' },
    { color: 0x2E7D32, name: 'Levél' },
    { color: 0xB71C1C, name: 'Vörös' },
    { color: 0x1565C0, name: 'Kék' },
    { color: 0xFFD700, name: 'Arany' },
];
let toolbarMaterials = [];
let selectedSlot = 0;
let blockMaterials;
let boxGeometry;

// Növény anyagok
let treeTrunkMat, treeLeafMat, darkLeafMat;
let flowerMats;
let grassTuftMat, bushMat;

// Víz és épületek
const SEA_LEVEL = 1;
let waterMat, wallMat, roofMat, doorMat;
const buildings = []; // {x,z,w,d} épületek téglalapjai

// Inventár: mob tokenek
const inventory = {};
let craftingOpen = false;
const allies = []; // védő mobok

function simpleHash(x, z) {
    let h = (x * 374761393 + z * 668265263) ^ 0x5bf03635;
    h = (h ^ (h >> 13)) * 0x27d4eb2d;
    return (h ^ (h >> 15)) >>> 0;
}

// === PERLIN NOISE ===
const perm = new Uint8Array(512);
function initNoise() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }
function grad(hash, x, z) {
    const h = hash & 3;
    const u = h < 2 ? x : z;
    const v = h < 2 ? z : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}
function noise2D(x, z) {
    const X = Math.floor(x) & 255;
    const Z = Math.floor(z) & 255;
    const xf = x - Math.floor(x);
    const zf = z - Math.floor(z);
    const u = fade(xf);
    const v = fade(zf);
    const aa = perm[perm[X] + Z];
    const ab = perm[perm[X] + Z + 1];
    const ba = perm[perm[X + 1] + Z];
    const bb = perm[perm[X + 1] + Z + 1];
    return lerp(
        lerp(grad(aa, xf, zf), grad(ba, xf - 1, zf), u),
        lerp(grad(ab, xf, zf - 1), grad(bb, xf - 1, zf - 1), u),
        v
    );
}
function getHeight(worldX, worldZ) {
    const scale1 = 0.02, scale2 = 0.05, scale3 = 0.01;
    let h = noise2D(worldX * scale1, worldZ * scale1) * 4;
    h += noise2D(worldX * scale2, worldZ * scale2) * 2;
    h += noise2D(worldX * scale3, worldZ * scale3) * 6;
    return Math.floor(h + 3);
}

const MOB_TYPES = [
    // Hostile
    { name: 'Zombie', bodyColor: 0x2E7D32, headColor: 0x4CAF50, eyeColor: 0x000000, speed: 15, hp: 3, damage: 1, behavior: 'hostile' },
    { name: 'Skeleton', bodyColor: 0xCCCCCC, headColor: 0xEEEEEE, eyeColor: 0x333333, speed: 20, hp: 2, damage: 1, behavior: 'hostile' },
    { name: 'Spider', bodyColor: 0x3E2723, headColor: 0x4E342E, eyeColor: 0xFF0000, speed: 25, hp: 2, damage: 1, behavior: 'hostile' },
    { name: 'Creeper', bodyColor: 0x7CB342, headColor: 0x8BC34A, eyeColor: 0x000000, speed: 12, hp: 4, damage: 2, behavior: 'hostile' },
    // Passive
    { name: 'Cow', bodyColor: 0x6D4C41, headColor: 0x8D6E63, eyeColor: 0x000000, speed: 8, hp: 3, damage: 0, behavior: 'passive' },
    { name: 'Sheep', bodyColor: 0xEEEEEE, headColor: 0xDDDDDD, eyeColor: 0x333333, speed: 7, hp: 2, damage: 0, behavior: 'passive' },
    { name: 'Chicken', bodyColor: 0xFFFFFF, headColor: 0xFFFFFF, eyeColor: 0x111111, speed: 10, hp: 1, damage: 0, behavior: 'passive' },
    { name: 'Pig', bodyColor: 0xF8BBD0, headColor: 0xF48FB1, eyeColor: 0x000000, speed: 8, hp: 3, damage: 0, behavior: 'passive' },
    // Neutral
    { name: 'Wolf', bodyColor: 0xBDBDBD, headColor: 0xCFCFCF, eyeColor: 0x333333, speed: 22, hp: 4, damage: 2, behavior: 'neutral' },
    { name: 'Enderman', bodyColor: 0x1A1A2E, headColor: 0x16213E, eyeColor: 0xBB86FC, speed: 30, hp: 5, damage: 3, behavior: 'neutral' },
];

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let health = 20;
let gameOver = false;
let lastGroundY = 10;
let isFalling = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

init();
animate();

function init() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.y = 80;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 60, 350);

    // Napfény
    const ambientLight = new THREE.AmbientLight(0x666666);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xFFFFCC, 1.2);
    sunLight.position.set(100, 200, 100);
    scene.add(sunLight);
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x556B2F, 0.6);
    scene.add(hemiLight);

    controls = new THREE.PointerLockControls(camera, document.body);

    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    instructions.addEventListener('click', function () {
        controls.lock();
    });

    controls.addEventListener('lock', function () {
        if (gameOver) return;
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });

    controls.addEventListener('unlock', function () {
        if (craftingOpen) return;
        blocker.style.display = 'block';
        instructions.style.display = '';
    });

    scene.add(controls.getObject());

    const onKeyDown = function (event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                break;
            case 'Space':
                if (canJump === true) velocity.y += 350;
                canJump = false;
                break;
            case 'Digit1': selectedSlot = 0; updateToolbar(); break;
            case 'Digit2': selectedSlot = 1; updateToolbar(); break;
            case 'Digit3': selectedSlot = 2; updateToolbar(); break;
            case 'Digit4': selectedSlot = 3; updateToolbar(); break;
            case 'Digit5': selectedSlot = 4; updateToolbar(); break;
            case 'Digit6': selectedSlot = 5; updateToolbar(); break;
            case 'Digit7': selectedSlot = 6; updateToolbar(); break;
            case 'Digit8': selectedSlot = 7; updateToolbar(); break;
            case 'Digit9': selectedSlot = 8; updateToolbar(); break;
        }
    };

    const onKeyUp = function (event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = false;
                break;
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 15);

    // Noise inicializálás
    initNoise();

    // Megosztott geometriák
    boxGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    blockMaterials = BLOCK_TYPES.map(type => new THREE.MeshLambertMaterial({ color: type.color }));

    // Növény anyagok
    treeTrunkMat = new THREE.MeshLambertMaterial({ color: 0x6D4C2A });
    treeLeafMat = new THREE.MeshLambertMaterial({ color: 0x2E7D32 });
    darkLeafMat = new THREE.MeshLambertMaterial({ color: 0x1B5E20 });
    flowerMats = [
        new THREE.MeshLambertMaterial({ color: 0xFF4444 }),  // piros
        new THREE.MeshLambertMaterial({ color: 0xFFEB3B }),  // sárga
        new THREE.MeshLambertMaterial({ color: 0xE91E63 }),  // rózsaszín
        new THREE.MeshLambertMaterial({ color: 0x9C27B0 }),  // lila
        new THREE.MeshLambertMaterial({ color: 0x2196F3 }),  // kék
        new THREE.MeshLambertMaterial({ color: 0xFFFFFF }),  // fehér
    ];
    grassTuftMat = new THREE.MeshLambertMaterial({ color: 0x66BB6A, transparent: true, opacity: 0.9 });
    bushMat = new THREE.MeshLambertMaterial({ color: 0x388E3C });

    // Víz és épület anyagok
    waterMat = new THREE.MeshLambertMaterial({ color: 0x1E88E5, transparent: true, opacity: 0.6 });
    wallMat = new THREE.MeshLambertMaterial({ color: 0x795548 });
    roofMat = new THREE.MeshLambertMaterial({ color: 0xA1887F });
    doorMat = new THREE.MeshLambertMaterial({ color: 0x4E342E });

    // Barkácsasztal: E billentyű
    document.addEventListener('keydown', function (e) {
        if (e.code === 'KeyE' && !gameOver && (controls.isLocked || craftingOpen)) {
            toggleCrafting();
        }
    });

    // Kezdő chunkok generálása
    updateChunks(0, 0);

    // Mobok spawnolása
    spawnMobs(6);

    // Támadás raycaster (kattintáshoz)
    attackRaycaster = new THREE.Raycaster();
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // Eszköztár anyagok
    toolbarMaterials = TOOLBAR_BLOCKS.map(t => new THREE.MeshLambertMaterial({ color: t.color }));
    initToolbar();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();

    if (controls.isLocked === true) {
        raycaster.ray.origin.copy(controls.getObject().position);
        raycaster.ray.origin.y -= 10;

        const intersections = raycaster.intersectObjects(objects, false);
        const onObject = intersections.length > 0;
        const delta = (time - prevTime) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize(); // this ensures consistent movements in all directions

        if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

        if (onObject === true) {
            velocity.y = Math.max(0, velocity.y);
            canJump = true;
            checkFallDamage(controls.getObject().position.y);
        }

        if (velocity.y < -100) {
            isFalling = true;
        }

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        controls.getObject().position.y += (velocity.y * delta); // new behavior

        const playerPos = controls.getObject().position;
        const groundY = getTerrainHeight(playerPos.x, playerPos.z);

        if (playerPos.y < groundY) {
            velocity.y = 0;
            playerPos.y = groundY;
            canJump = true;
            checkFallDamage(groundY);
        }

        // Chunkok frissítése a játékos pozíciója alapján
        updateChunks(playerPos.x, playerPos.z);

        updateMobs(delta);
        updateBullets(delta);
    }

    prevTime = time;
    renderer.render(scene, camera);
}

function checkFallDamage(landY) {
    if (isFalling) {
        const fallDistance = lastGroundY - landY;
        if (fallDistance > 30) {
            const damage = Math.floor(fallDistance / 30);
            takeDamage(damage);
        }
        isFalling = false;
    }
    lastGroundY = landY;
}

function takeDamage(amount) {
    if (gameOver) return;
    health -= amount;
    if (health < 0) health = 0;
    updateHealthBar();
    flashDamage();
    if (health <= 0) {
        doGameOver();
    }
}

function updateHealthBar() {
    const heartsEl = document.getElementById('hearts');
    if (!heartsEl) return;
    let html = '';
    for (let i = 0; i < 20; i++) {
        if (i < health) {
            html += '<span class="heart full">\u2764</span>';
        } else {
            html += '<span class="heart empty">\u2764</span>';
        }
    }
    heartsEl.innerHTML = html;
}

function flashDamage() {
    const overlay = document.getElementById('damage-overlay');
    if (!overlay) return;
    overlay.style.opacity = '0.5';
    setTimeout(() => { overlay.style.opacity = '0'; }, 300);
}

// === CHUNK RENDSZER FÜGGVÉNYEK ===

function chunkKey(cx, cz) { return cx + ',' + cz; }

function generateChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    if (chunks[key]) return;

    const group = new THREE.Group();
    const chunkBlocks = [];

    for (let bx = 0; bx < CHUNK_SIZE; bx++) {
        for (let bz = 0; bz < CHUNK_SIZE; bz++) {
            const worldX = cx * CHUNK_SIZE + bx;
            const worldZ = cz * CHUNK_SIZE + bz;
            const height = getHeight(worldX, worldZ);

            // Blokkok a magasság alapján
            for (let by = Math.max(height - 1, -1); by <= Math.max(height, SEA_LEVEL); by++) {
                let mat;
                if (by > height && by <= SEA_LEVEL) {
                    // Víz blokk
                    mat = waterMat;
                } else if (by <= height) {
                    // Homok a vízpart közelében
                    const isBeach = height <= SEA_LEVEL + 1 && height >= SEA_LEVEL - 1;
                    if (by === height && isBeach) {
                        mat = toolbarMaterials[3]; // homok
                    } else if (by === height) {
                        mat = blockMaterials[0]; // grass
                    } else if (by >= height - 2) {
                        mat = blockMaterials[1]; // dirt
                    } else {
                        mat = blockMaterials[2]; // stone
                    }
                } else {
                    continue;
                }

                const box = new THREE.Mesh(boxGeometry, mat);
                box.position.set(
                    worldX * BLOCK_SIZE,
                    by * BLOCK_SIZE,
                    worldZ * BLOCK_SIZE
                );

                group.add(box);
                chunkBlocks.push(box);
            }
        }
    }

    // Épület generálás (determinisztikus, ritka)
    const buildHash = simpleHash(cx * 7, cz * 13);
    if (buildHash % 30 === 0) {
        const bx0 = 2;
        const bz0 = 2;
        const wX = cx * CHUNK_SIZE + bx0;
        const wZ = cz * CHUNK_SIZE + bz0;
        const bHeight = getHeight(wX, wZ);
        if (bHeight > SEA_LEVEL + 1) {
            createBuilding(group, chunkBlocks, wX, wZ, bHeight);
        }
    }

    // Növények generálása a felszinen (csak szárazföldön)
    for (let bx = 0; bx < CHUNK_SIZE; bx++) {
        for (let bz = 0; bz < CHUNK_SIZE; bz++) {
            const worldX = cx * CHUNK_SIZE + bx;
            const worldZ = cz * CHUNK_SIZE + bz;
            const height = getHeight(worldX, worldZ);
            if (height <= SEA_LEVEL) continue; // nincs növény vízben
            const hash = simpleHash(worldX, worldZ);
            const chance = hash % 100;
            const topY = (height + 1) * BLOCK_SIZE;
            const px = worldX * BLOCK_SIZE;
            const pz = worldZ * BLOCK_SIZE;

            if (chance < 3) {
                const tree = createTree(hash);
                tree.position.set(px, topY, pz);
                group.add(tree);
            } else if (chance < 7) {
                const tuft = createGrassTuft();
                tuft.position.set(px, topY, pz);
                group.add(tuft);
            } else if (chance < 10) {
                const flower = createFlower(hash);
                flower.position.set(px, topY, pz);
                group.add(flower);
            } else if (chance < 11) {
                const bush = createBush();
                bush.position.set(px, topY, pz);
                group.add(bush);
            }
        }
    }

    scene.add(group);
    chunkBlocks.forEach(b => objects.push(b));
    chunks[key] = { group: group, blocks: chunkBlocks };
}

function createBuilding(group, chunkBlocks, wX, wZ, bHeight) {
    const W = 4, D = 4, H = 3; // szélesség, mélység, magasság blokkban
    const baseY = (bHeight + 1) * BLOCK_SIZE;
    const startX = wX * BLOCK_SIZE;
    const startZ = wZ * BLOCK_SIZE;

    // Épület pozíció mentése (mobok elkerülik)
    buildings.push({
        minX: startX - BLOCK_SIZE,
        maxX: startX + W * BLOCK_SIZE + BLOCK_SIZE,
        minZ: startZ - BLOCK_SIZE,
        maxZ: startZ + D * BLOCK_SIZE + BLOCK_SIZE,
    });

    for (let bx = 0; bx < W; bx++) {
        for (let bz = 0; bz < D; bz++) {
            for (let by = 0; by < H; by++) {
                // Falak: csak a széleken
                const isWall = bx === 0 || bx === W - 1 || bz === 0 || bz === D - 1;
                // Ajtó: középen az elején, alsó 2 blokk
                const isDoor = bz === 0 && bx === Math.floor(W / 2) && by < 2;

                if (!isWall && by < H - 1) continue; // belül üres
                if (isDoor) continue; // ajtó nyitva

                let mat = wallMat;
                if (by === H - 1) mat = roofMat; // tető

                const box = new THREE.Mesh(boxGeometry, mat);
                box.position.set(
                    startX + bx * BLOCK_SIZE,
                    baseY + by * BLOCK_SIZE,
                    startZ + bz * BLOCK_SIZE
                );
                group.add(box);
                chunkBlocks.push(box);
            }
        }
    }

    // Barkácsasztal az épület belsejében
    const craftGeo = new THREE.BoxGeometry(BLOCK_SIZE * 0.8, BLOCK_SIZE * 0.6, BLOCK_SIZE * 0.8);
    const craftMat = new THREE.MeshLambertMaterial({ color: 0xFF6F00 });
    const craftTable = new THREE.Mesh(craftGeo, craftMat);
    craftTable.position.set(
        startX + Math.floor(W / 2) * BLOCK_SIZE,
        baseY + BLOCK_SIZE * 0.3,
        startZ + Math.floor(D / 2) * BLOCK_SIZE
    );
    craftTable.userData.isCraftingTable = true;
    group.add(craftTable);
    // Pici tábla a tetején
    const labelGeo = new THREE.BoxGeometry(BLOCK_SIZE * 0.5, 2, BLOCK_SIZE * 0.5);
    const labelMat = new THREE.MeshLambertMaterial({ color: 0xFFD54F });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(
        craftTable.position.x,
        baseY + BLOCK_SIZE * 0.65,
        craftTable.position.z
    );
    group.add(label);
}

function createTree(hash) {
    const group = new THREE.Group();
    const trunkH = 3 + (hash % 3); // 3-5 blokk magas törzs
    const trunkGeo = new THREE.BoxGeometry(6, trunkH * BLOCK_SIZE, 6);
    const trunk = new THREE.Mesh(trunkGeo, treeTrunkMat);
    trunk.position.y = trunkH * BLOCK_SIZE / 2;
    group.add(trunk);

    // Lombkorona
    const leafType = hash % 2;
    const leafMat = leafType === 0 ? treeLeafMat : darkLeafMat;
    const crownSize = 16 + (hash % 10);
    const crownGeo = new THREE.BoxGeometry(crownSize, crownSize * 0.7, crownSize);
    const crown = new THREE.Mesh(crownGeo, leafMat);
    crown.position.y = trunkH * BLOCK_SIZE + crownSize * 0.3;
    group.add(crown);

    // Kis extra lomb tetején
    const topGeo = new THREE.BoxGeometry(crownSize * 0.6, crownSize * 0.5, crownSize * 0.6);
    const top = new THREE.Mesh(topGeo, leafMat);
    top.position.y = crown.position.y + crownSize * 0.5;
    group.add(top);

    return group;
}

function createFlower(hash) {
    const group = new THREE.Group();
    // Szár
    const stemGeo = new THREE.BoxGeometry(1, 8, 1);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 4;
    group.add(stem);

    // Virágfej
    const flowerGeo = new THREE.BoxGeometry(4, 4, 4);
    const mat = flowerMats[hash % flowerMats.length];
    const head = new THREE.Mesh(flowerGeo, mat);
    head.position.y = 10;
    head.rotation.y = (hash % 8) * 0.8;
    group.add(head);

    return group;
}

function createGrassTuft() {
    const group = new THREE.Group();
    for (let i = 0; i < 3; i++) {
        const bladeGeo = new THREE.BoxGeometry(1, 6 + Math.random() * 4, 1);
        const blade = new THREE.Mesh(bladeGeo, grassTuftMat);
        blade.position.set((i - 1) * 3, 3 + Math.random() * 2, Math.random() * 4 - 2);
        blade.rotation.z = (Math.random() - 0.5) * 0.3;
        group.add(blade);
    }
    return group;
}

function createBush() {
    const group = new THREE.Group();
    const bushGeo = new THREE.BoxGeometry(12, 10, 12);
    const bush = new THREE.Mesh(bushGeo, bushMat);
    bush.position.y = 5;
    group.add(bush);
    // Kis kiemelkedés tetején
    const topGeo = new THREE.BoxGeometry(8, 6, 8);
    const top = new THREE.Mesh(topGeo, treeLeafMat);
    top.position.y = 11;
    group.add(top);
    return group;
}

function removeChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    const chunk = chunks[key];
    if (!chunk) return;

    chunk.blocks.forEach(b => {
        const idx = objects.indexOf(b);
        if (idx !== -1) objects.splice(idx, 1);
    });
    scene.remove(chunk.group);
    delete chunks[key];
}

function updateChunks(playerX, playerZ) {
    const cx = Math.floor(playerX / (CHUNK_SIZE * BLOCK_SIZE));
    const cz = Math.floor(playerZ / (CHUNK_SIZE * BLOCK_SIZE));

    if (cx === lastChunkX && cz === lastChunkZ) return;
    lastChunkX = cx;
    lastChunkZ = cz;

    // Generáld az új chunkokat
    const neededKeys = new Set();
    for (let dx = -RENDER_DIST; dx <= RENDER_DIST; dx++) {
        for (let dz = -RENDER_DIST; dz <= RENDER_DIST; dz++) {
            const key = chunkKey(cx + dx, cz + dz);
            neededKeys.add(key);
            generateChunk(cx + dx, cz + dz);
        }
    }

    // Töröld a messze levő chunkokat
    for (const key of Object.keys(chunks)) {
        if (!neededKeys.has(key)) {
            const [kcx, kcz] = key.split(',').map(Number);
            removeChunk(kcx, kcz);
        }
    }
}

function getTerrainHeight(worldPosX, worldPosZ) {
    const bx = Math.floor(worldPosX / BLOCK_SIZE);
    const bz = Math.floor(worldPosZ / BLOCK_SIZE);
    const h = getHeight(bx, bz);
    return (h + 1) * BLOCK_SIZE + BLOCK_SIZE / 2;
}

// === MOB RENDSZER ===

function createMobMesh(type) {
    const group = new THREE.Group();

    // Test
    const bodyGeo = new THREE.BoxGeometry(8, 12, 6);
    const bodyMat = new THREE.MeshLambertMaterial({ color: type.bodyColor });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 6;
    group.add(body);

    // Fej
    const headGeo = new THREE.BoxGeometry(8, 8, 8);
    const headMat = new THREE.MeshLambertMaterial({ color: type.headColor });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 16;
    group.add(head);

    // Szemek
    const eyeGeo = new THREE.BoxGeometry(1.5, 1.5, 1);
    const eyeMat = new THREE.MeshBasicMaterial({ color: type.eyeColor });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-2, 17, 4.1);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(2, 17, 4.1);
    group.add(rightEye);

    // Lábak
    const legGeo = new THREE.BoxGeometry(3, 6, 3);
    const legMat = new THREE.MeshLambertMaterial({ color: type.bodyColor });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-2, -3, 0);
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(2, -3, 0);
    group.add(rightLeg);

    // Pók laposabb
    if (type.name === 'Spider') {
        body.scale.set(1.5, 0.5, 1);
        body.position.y = 3;
        head.scale.set(0.8, 0.6, 0.8);
        head.position.y = 7;
        leftEye.position.set(-2, 7.5, 3.5);
        rightEye.position.set(2, 7.5, 3.5);
        leftLeg.position.set(-5, 0, 0);
        rightLeg.position.set(5, 0, 0);
    }

    // Csontváz: vékonyabb test, bordák
    if (type.name === 'Skeleton') {
        body.scale.set(0.6, 1, 0.5);
        head.scale.set(0.9, 0.9, 0.9);
        leftLeg.scale.set(0.6, 1, 0.6);
        rightLeg.scale.set(0.6, 1, 0.6);
        const ribGeo = new THREE.BoxGeometry(6, 0.8, 4);
        const ribMat = new THREE.MeshLambertMaterial({ color: 0xAAAAAA });
        for (let r = 0; r < 3; r++) {
            const rib = new THREE.Mesh(ribGeo, ribMat);
            rib.position.set(0, 3 + r * 3, 0);
            group.add(rib);
        }
        const bowGeo = new THREE.BoxGeometry(1, 10, 1);
        const bowMat = new THREE.MeshLambertMaterial({ color: 0x6D4C2A });
        const bow = new THREE.Mesh(bowGeo, bowMat);
        bow.position.set(6, 8, 0);
        bow.rotation.z = 0.3;
        group.add(bow);
    }

    // Tehén: szélesebb test, szarvak
    if (type.name === 'Cow') {
        body.scale.set(1.3, 1, 1.5);
        head.scale.set(1.1, 0.9, 1);
        // Szarvak
        const hornGeo = new THREE.BoxGeometry(1, 4, 1);
        const hornMat = new THREE.MeshLambertMaterial({ color: 0xEEEECC });
        const lHorn = new THREE.Mesh(hornGeo, hornMat);
        lHorn.position.set(-4, 21, 2);
        lHorn.rotation.z = 0.3;
        group.add(lHorn);
        const rHorn = new THREE.Mesh(hornGeo, hornMat);
        rHorn.position.set(4, 21, 2);
        rHorn.rotation.z = -0.3;
        group.add(rHorn);
    }

    // Birka: bolyhos test
    if (type.name === 'Sheep') {
        body.scale.set(1.2, 1.2, 1.4);
        head.scale.set(0.8, 0.8, 0.9);
        head.position.y = 15;
        head.position.z = 3;
    }

    // Csirke: kicsi, csőr
    if (type.name === 'Chicken') {
        body.scale.set(0.6, 0.5, 0.8);
        body.position.y = 3;
        head.scale.set(0.5, 0.5, 0.5);
        head.position.y = 8;
        leftLeg.scale.set(0.4, 0.6, 0.4);
        leftLeg.position.y = -1;
        rightLeg.scale.set(0.4, 0.6, 0.4);
        rightLeg.position.y = -1;
        // Csőr
        const beakGeo = new THREE.BoxGeometry(2, 1, 2);
        const beakMat = new THREE.MeshLambertMaterial({ color: 0xFF8F00 });
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.position.set(0, 7.5, 3);
        group.add(beak);
    }

    // Malac: rózsaszín, orr
    if (type.name === 'Pig') {
        body.scale.set(1.1, 0.9, 1.3);
        head.scale.set(1, 0.9, 0.9);
        // Orr
        const snoutGeo = new THREE.BoxGeometry(4, 3, 2);
        const snoutMat = new THREE.MeshLambertMaterial({ color: 0xE91E63 });
        const snout = new THREE.Mesh(snoutGeo, snoutMat);
        snout.position.set(0, 15.5, 5);
        group.add(snout);
    }

    // Farkas: vékonyabb, farok
    if (type.name === 'Wolf') {
        body.scale.set(0.8, 0.8, 1.3);
        head.scale.set(0.8, 0.7, 0.9);
        head.position.z = 3;
        // Farok
        const tailGeo = new THREE.BoxGeometry(2, 6, 2);
        const tailMat = new THREE.MeshLambertMaterial({ color: type.bodyColor });
        const tail = new THREE.Mesh(tailGeo, tailMat);
        tail.position.set(0, 8, -6);
        tail.rotation.x = -0.5;
        group.add(tail);
    }

    // Enderman: magas, vékony
    if (type.name === 'Enderman') {
        body.scale.set(0.5, 1.8, 0.5);
        body.position.y = 10;
        head.position.y = 26;
        leftLeg.scale.set(0.5, 1.5, 0.5);
        leftLeg.position.y = -4;
        rightLeg.scale.set(0.5, 1.5, 0.5);
        rightLeg.position.y = -4;
        leftEye.position.y = 27;
        rightEye.position.y = 27;
    }

    return group;
}

function spawnMobs(count) {
    for (let i = 0; i < count; i++) {
        const typeIndex = Math.floor(Math.random() * MOB_TYPES.length);
        const type = MOB_TYPES[typeIndex];
        const mesh = createMobMesh(type);

        const playerP = controls ? controls.getObject().position : new THREE.Vector3(0, 80, 0);
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 150;
        const mx = playerP.x + Math.cos(angle) * dist;
        const mz = playerP.z + Math.sin(angle) * dist;
        mesh.position.x = mx;
        mesh.position.y = getTerrainHeight(mx, mz);
        mesh.position.z = mz;

        scene.add(mesh);
        mobs.push({
            mesh: mesh,
            type: type,
            hp: type.hp,
            speed: type.speed,
            damage: type.damage,
            behavior: type.behavior,
            aggro: false,
            fleeTime: 0,
            wanderAngle: Math.random() * Math.PI * 2,
            wanderTimer: 0,
            lastAttackTime: 0,
            walkCycle: Math.random() * Math.PI * 2
        });
    }
}

function isInsideBuilding(x, z) {
    for (const b of buildings) {
        if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
    }
    return false;
}

function updateMobs(delta) {
    const playerPos = controls.getObject().position;
    const now = performance.now();

    // Védő mobok frissítése
    updateAllies(delta);

    for (let i = mobs.length - 1; i >= 0; i--) {
        const mob = mobs[i];
        const mobPos = mob.mesh.position;
        const toPlayerDist = Math.sqrt((playerPos.x - mobPos.x) ** 2 + (playerPos.z - mobPos.z) ** 2);

        // === PASSIVE: kóborol, menekül ha ütik ===
        if (mob.behavior === 'passive') {
            if (mob.fleeTime > 0) {
                mob.fleeTime -= delta;
                // Menekülés a játékostól
                const fdx = mobPos.x - playerPos.x;
                const fdz = mobPos.z - playerPos.z;
                const fd = Math.sqrt(fdx * fdx + fdz * fdz) || 1;
                mobPos.x += (fdx / fd) * mob.speed * 2 * delta;
                mobPos.z += (fdz / fd) * mob.speed * 2 * delta;
                mob.mesh.rotation.y = Math.atan2(-fdx, -fdz);
            } else {
                // Kóborolás
                mob.wanderTimer -= delta;
                if (mob.wanderTimer <= 0) {
                    mob.wanderAngle = Math.random() * Math.PI * 2;
                    mob.wanderTimer = 2 + Math.random() * 4;
                }
                mobPos.x += Math.cos(mob.wanderAngle) * mob.speed * 0.3 * delta;
                mobPos.z += Math.sin(mob.wanderAngle) * mob.speed * 0.3 * delta;
                mob.mesh.rotation.y = Math.atan2(Math.cos(mob.wanderAngle), Math.sin(mob.wanderAngle));
            }
            mobPos.y = getTerrainHeight(mobPos.x, mobPos.z);

            mob.walkCycle += delta * mob.speed * 0.3;
            const legSwing = Math.sin(mob.walkCycle) * 0.4;
            if (mob.mesh.children[4]) mob.mesh.children[4].rotation.x = legSwing;
            if (mob.mesh.children[5]) mob.mesh.children[5].rotation.x = -legSwing;
            continue;
        }

        // === NEUTRAL: kóborol, támad ha aggro ===
        if (mob.behavior === 'neutral' && !mob.aggro) {
            mob.wanderTimer -= delta;
            if (mob.wanderTimer <= 0) {
                mob.wanderAngle = Math.random() * Math.PI * 2;
                mob.wanderTimer = 2 + Math.random() * 5;
            }
            mobPos.x += Math.cos(mob.wanderAngle) * mob.speed * 0.2 * delta;
            mobPos.z += Math.sin(mob.wanderAngle) * mob.speed * 0.2 * delta;
            mob.mesh.rotation.y = Math.atan2(Math.cos(mob.wanderAngle), Math.sin(mob.wanderAngle));
            mobPos.y = getTerrainHeight(mobPos.x, mobPos.z);

            mob.walkCycle += delta * mob.speed * 0.2;
            const legSwing = Math.sin(mob.walkCycle) * 0.3;
            if (mob.mesh.children[4]) mob.mesh.children[4].rotation.x = legSwing;
            if (mob.mesh.children[5]) mob.mesh.children[5].rotation.x = -legSwing;
            continue;
        }

        // === HOSTILE (vagy aggro NEUTRAL): támad ===
        let targetX = playerPos.x;
        let targetZ = playerPos.z;
        let targetDist = toPlayerDist;
        let targetIsMob = -1;

        // Hostile mobokat más hostile mobokhoz is küldjük
        if (mob.behavior === 'hostile') {
            for (let j = 0; j < mobs.length; j++) {
                if (i === j) continue;
                const other = mobs[j];
                if (other.type.name === mob.type.name) continue;
                if (other.behavior === 'passive') continue;
                const odx = other.mesh.position.x - mobPos.x;
                const odz = other.mesh.position.z - mobPos.z;
                const odist = Math.sqrt(odx * odx + odz * odz);
                if (odist < targetDist && odist < 100) {
                    targetX = other.mesh.position.x;
                    targetZ = other.mesh.position.z;
                    targetDist = odist;
                    targetIsMob = j;
                }
            }
        }

        const dx = targetX - mobPos.x;
        const dz = targetZ - mobPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        mob.mesh.rotation.y = Math.atan2(dx, dz);

        if (dist > 12) {
            const newX = mobPos.x + (dx / dist) * mob.speed * delta;
            const newZ = mobPos.z + (dz / dist) * mob.speed * delta;
            if (!isInsideBuilding(newX, newZ)) {
                mobPos.x = newX;
                mobPos.z = newZ;
            }
        }
        mobPos.y = getTerrainHeight(mobPos.x, mobPos.z);

        mob.walkCycle += delta * mob.speed * 0.3;
        const legSwing = Math.sin(mob.walkCycle) * 0.5;
        if (mob.mesh.children[4]) mob.mesh.children[4].rotation.x = legSwing;
        if (mob.mesh.children[5]) mob.mesh.children[5].rotation.x = -legSwing;

        if (dist < 15 && now - mob.lastAttackTime > 1000) {
            mob.lastAttackTime = now;

            if (targetIsMob !== -1 && targetIsMob < mobs.length) {
                const target = mobs[targetIsMob];
                target.hp -= mob.damage;
                target.mesh.children.forEach(child => {
                    if (child.material) {
                        const oc = child.material.color.getHex();
                        child.material.color.setHex(0xff0000);
                        setTimeout(() => child.material.color.setHex(oc), 150);
                    }
                });
                if (target.hp <= 0) {
                    scene.remove(target.mesh);
                    mobs.splice(targetIsMob, 1);
                    if (targetIsMob < i) i--;
                    if (mobs.length < 5) {
                        setTimeout(() => spawnMobs(3), 5000);
                    }
                }
            } else {
                takeDamage(mob.damage);
            }
        }
    }
}

function onMouseDown(event) {
    if (craftingOpen) return;
    if (!controls.isLocked || gameOver) return;

    if (event.button === 0) {
        // Balklikk: blokk kiütés vagy lövés
        attackRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = attackRaycaster.intersectObjects(objects, false);

        if (intersects.length > 0 && intersects[0].distance < 60) {
            breakBlock(intersects[0]);
        } else {
            shootBullet();
        }
    } else if (event.button === 2) {
        // Jobbklikk: blokk elhelyezés
        attackRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = attackRaycaster.intersectObjects(objects, false);

        if (intersects.length > 0 && intersects[0].distance < 60) {
            placeBlock(intersects[0]);
        }
    }
}

function shootBullet() {
    const bulletGeo = new THREE.SphereGeometry(1, 8, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);
    bullet.position.copy(controls.getObject().position);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    scene.add(bullet);
    bullets.push({ mesh: bullet, direction: dir.clone(), speed: 300, life: 2 });
}

function breakBlock(hit) {
    const block = hit.object;
    // Eltávolítás az objects tömbből
    const idx = objects.indexOf(block);
    if (idx !== -1) objects.splice(idx, 1);
    // Eltávolítás a parent group-ból
    if (block.parent) block.parent.remove(block);
}

function placeBlock(hit) {
    // Számítsuk ki hova kerüljön az új blokk (a normal irányába)
    const normal = hit.face.normal.clone();
    const pos = hit.object.position.clone();
    pos.x += normal.x * BLOCK_SIZE;
    pos.y += normal.y * BLOCK_SIZE;
    pos.z += normal.z * BLOCK_SIZE;

    // Ne rakj blokkot magadba
    const playerPos = controls.getObject().position;
    const dx = Math.abs(playerPos.x - pos.x);
    const dy = Math.abs(playerPos.y - pos.y);
    const dz = Math.abs(playerPos.z - pos.z);
    if (dx < BLOCK_SIZE && dy < BLOCK_SIZE * 1.5 && dz < BLOCK_SIZE) return;

    const box = new THREE.Mesh(boxGeometry, toolbarMaterials[selectedSlot]);
    box.position.copy(pos);
    scene.add(box);
    objects.push(box);
}

function initToolbar() {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) return;
    toolbar.innerHTML = '';
    for (let i = 0; i < TOOLBAR_BLOCKS.length; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot' + (i === selectedSlot ? ' selected' : '');
        slot.style.backgroundColor = '#' + TOOLBAR_BLOCKS[i].color.toString(16).padStart(6, '0');
        slot.title = TOOLBAR_BLOCKS[i].name;
        const num = document.createElement('span');
        num.textContent = (i + 1);
        num.style.fontSize = '11px';
        num.style.opacity = '0.7';
        slot.appendChild(num);
        toolbar.appendChild(slot);
    }
}

function updateToolbar() {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) return;
    const slots = toolbar.querySelectorAll('.slot');
    slots.forEach((s, i) => {
        s.className = 'slot' + (i === selectedSlot ? ' selected' : '');
    });
}

function updateBullets(delta) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.mesh.position.add(b.direction.clone().multiplyScalar(b.speed * delta));
        b.life -= delta;

        // Ellenőrizzük, eltalált-e mobot
        let hitMob = false;
        for (let j = mobs.length - 1; j >= 0; j--) {
            const mob = mobs[j];
            const dist = b.mesh.position.distanceTo(mob.mesh.position.clone().add(new THREE.Vector3(0, 10, 0)));
            if (dist < 12) {
                hitMob = true;
                mob.hp -= 1;

                // Passzív: menekülés, Semleges: aggro
                if (mob.behavior === 'passive') mob.fleeTime = 3;
                if (mob.behavior === 'neutral') mob.aggro = true;

                // Piros villanás a mobon
                mob.mesh.children.forEach(child => {
                    if (child.material) {
                        const origColor = child.material.color.getHex();
                        child.material.color.setHex(0xff0000);
                        setTimeout(() => child.material.color.setHex(origColor), 150);
                    }
                });

                if (mob.hp <= 0) {
                    // Mob drop!
                    const dropName = mob.type.name;
                    inventory[dropName] = (inventory[dropName] || 0) + 1;
                    updateInventoryUI();
                    scene.remove(mob.mesh);
                    mobs.splice(j, 1);
                    if (mobs.length < 5) {
                        setTimeout(() => spawnMobs(3), 5000);
                    }
                }
                break;
            }
        }

        // Lövedék eltávolítása ha talált vagy lejárt
        if (hitMob || b.life <= 0) {
            scene.remove(b.mesh);
            bullets.splice(i, 1);
        }
    }
}

function doGameOver() {
    gameOver = true;
    controls.unlock();
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');
    blocker.style.display = 'block';
    instructions.style.display = 'none';
    document.getElementById('gameover').style.display = 'flex';
}

// === INVENTORY & CRAFTING ===

const CRAFT_RECIPES = [
    { name: 'ZombieFarkas', need: { Zombie: 1, Wolf: 1 }, result: 'Védő Farkas', color: 0x4CAF50, speed: 25, hp: 6, damage: 3 },
    { name: 'SpiderCow', need: { Spider: 1, Cow: 1 }, result: 'Védő Pók', color: 0x8B0000, speed: 28, hp: 5, damage: 2 },
    { name: 'CreeperPig', need: { Creeper: 1, Pig: 1 }, result: 'Védő Creeper', color: 0x00E676, speed: 15, hp: 8, damage: 4 },
    { name: 'SkeletonSheep', need: { Skeleton: 1, Sheep: 1 }, result: 'Védő Csontváz', color: 0xFFD700, speed: 22, hp: 5, damage: 2 },
    { name: 'EndermanChicken', need: { Enderman: 1, Chicken: 1 }, result: 'Védő Enderman', color: 0x7C4DFF, speed: 35, hp: 7, damage: 4 },
    { name: 'ZombieSkeleton', need: { Zombie: 2, Skeleton: 1 }, result: 'Védő Zombi', color: 0x33691E, speed: 18, hp: 10, damage: 3 },
];

function updateInventoryUI() {
    const el = document.getElementById('inventory-bar');
    if (!el) return;
    let html = '<b>Zsákmány:</b> ';
    const keys = Object.keys(inventory).filter(k => inventory[k] > 0);
    if (keys.length === 0) {
        html += '<i>üres</i>';
    } else {
        keys.forEach(k => {
            html += '<span class="inv-item">' + k + ': ' + inventory[k] + '</span> ';
        });
    }
    el.innerHTML = html;
}

function toggleCrafting() {
    craftingOpen = !craftingOpen;
    const panel = document.getElementById('crafting-panel');
    if (!panel) return;
    if (craftingOpen) {
        renderCraftingUI();
        panel.style.display = 'block';
        controls.unlock();
    } else {
        panel.style.display = 'none';
        controls.lock();
    }
}

function renderCraftingUI() {
    const panel = document.getElementById('crafting-panel');
    if (!panel) return;
    let html = '<h2>Barkácsasztal</h2><p>Keverd össze a mob tokeneket!</p>';
    html += '<div class="craft-list">';
    CRAFT_RECIPES.forEach((recipe, idx) => {
        const needStr = Object.entries(recipe.need).map(([k, v]) => k + ' x' + v).join(' + ');
        let canCraft = true;
        for (const [k, v] of Object.entries(recipe.need)) {
            if ((inventory[k] || 0) < v) canCraft = false;
        }
        html += '<div class="craft-recipe' + (canCraft ? ' craftable' : ' locked') + '">';
        html += '<span class="craft-name">' + recipe.result + '</span>';
        html += '<span class="craft-need">' + needStr + '</span>';
        if (canCraft) {
            html += '<button onclick="doCraft(' + idx + ')">Készít</button>';
        }
        html += '</div>';
    });
    html += '</div>';
    html += '<p class="craft-hint">Nyomj <b>E</b>-t a bezáráshoz</p>';
    panel.innerHTML = html;
}

function doCraft(idx) {
    const recipe = CRAFT_RECIPES[idx];
    // Ellenőrzés
    for (const [k, v] of Object.entries(recipe.need)) {
        if ((inventory[k] || 0) < v) return;
    }
    // Levonás
    for (const [k, v] of Object.entries(recipe.need)) {
        inventory[k] -= v;
    }
    updateInventoryUI();

    // Védő mob létrehozása
    spawnAlly(recipe);
    renderCraftingUI();
}

function spawnAlly(recipe) {
    const group = new THREE.Group();

    // Test (az ally színe a recipe-ből)
    const bodyGeo = new THREE.BoxGeometry(8, 12, 6);
    const bodyMat = new THREE.MeshLambertMaterial({ color: recipe.color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 6;
    group.add(body);

    // Fej
    const headGeo = new THREE.BoxGeometry(8, 8, 8);
    const headMat = new THREE.MeshLambertMaterial({ color: recipe.color });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 16;
    group.add(head);

    // Szem (arany - jelzi hogy szövetséges)
    const eyeGeo = new THREE.BoxGeometry(1.5, 1.5, 1);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(-2, 17, 4.1);
    group.add(lEye);
    const rEye = new THREE.Mesh(eyeGeo, eyeMat);
    rEye.position.set(2, 17, 4.1);
    group.add(rEye);

    // Lábak
    const legGeo = new THREE.BoxGeometry(3, 6, 3);
    const legMat = new THREE.MeshLambertMaterial({ color: recipe.color });
    const lLeg = new THREE.Mesh(legGeo, legMat);
    lLeg.position.set(-2, -3, 0);
    group.add(lLeg);
    const rLeg = new THREE.Mesh(legGeo, legMat);
    rLeg.position.set(2, -3, 0);
    group.add(rLeg);

    // Korona (jelzi hogy védő)
    const crownGeo = new THREE.BoxGeometry(6, 3, 6);
    const crownMat = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = 22;
    group.add(crown);

    // Pozíció: játékos mellett
    const pp = controls.getObject().position;
    group.position.set(pp.x + 15, getTerrainHeight(pp.x + 15, pp.z), pp.z);

    scene.add(group);
    allies.push({
        mesh: group,
        speed: recipe.speed,
        hp: recipe.hp,
        damage: recipe.damage,
        name: recipe.result,
        lastAttackTime: 0,
        walkCycle: Math.random() * Math.PI * 2
    });
}

function updateAllies(delta) {
    const playerPos = controls.getObject().position;
    const now = performance.now();

    for (let i = allies.length - 1; i >= 0; i--) {
        const ally = allies[i];
        const aPos = ally.mesh.position;

        // Kövesd a játékost (de ne menj túl közel)
        const toPlayerDX = playerPos.x - aPos.x;
        const toPlayerDZ = playerPos.z - aPos.z;
        const toPlayerDist = Math.sqrt(toPlayerDX ** 2 + toPlayerDZ ** 2);

        // Keresd a legközelebbi hostile mobot
        let closestEnemy = -1;
        let closestDist = 80;
        for (let j = 0; j < mobs.length; j++) {
            if (mobs[j].behavior !== 'hostile' && !mobs[j].aggro) continue;
            const edx = mobs[j].mesh.position.x - aPos.x;
            const edz = mobs[j].mesh.position.z - aPos.z;
            const ed = Math.sqrt(edx * edx + edz * edz);
            if (ed < closestDist) {
                closestDist = ed;
                closestEnemy = j;
            }
        }

        let targetDX, targetDZ, targetDist;

        if (closestEnemy !== -1 && closestDist < 60) {
            // Támadj ellenséges mobot
            targetDX = mobs[closestEnemy].mesh.position.x - aPos.x;
            targetDZ = mobs[closestEnemy].mesh.position.z - aPos.z;
            targetDist = closestDist;
        } else if (toPlayerDist > 25) {
            // Kövesd a játékost
            targetDX = toPlayerDX;
            targetDZ = toPlayerDZ;
            targetDist = toPlayerDist;
        } else {
            targetDX = 0; targetDZ = 0; targetDist = 0;
        }

        if (targetDist > 10) {
            const d = Math.sqrt(targetDX ** 2 + targetDZ ** 2) || 1;
            aPos.x += (targetDX / d) * ally.speed * delta;
            aPos.z += (targetDZ / d) * ally.speed * delta;
            ally.mesh.rotation.y = Math.atan2(targetDX, targetDZ);
        }
        aPos.y = getTerrainHeight(aPos.x, aPos.z);

        // Járás animáció
        ally.walkCycle += delta * ally.speed * 0.3;
        const ls = Math.sin(ally.walkCycle) * 0.5;
        if (ally.mesh.children[4]) ally.mesh.children[4].rotation.x = ls;
        if (ally.mesh.children[5]) ally.mesh.children[5].rotation.x = -ls;

        // Sebzés ellenséges mobon
        if (closestEnemy !== -1 && closestDist < 15 && now - ally.lastAttackTime > 800) {
            ally.lastAttackTime = now;
            const target = mobs[closestEnemy];
            target.hp -= ally.damage;

            target.mesh.children.forEach(child => {
                if (child.material) {
                    const oc = child.material.color.getHex();
                    child.material.color.setHex(0xff0000);
                    setTimeout(() => child.material.color.setHex(oc), 150);
                }
            });

            if (target.hp <= 0) {
                const dropName = target.type.name;
                inventory[dropName] = (inventory[dropName] || 0) + 1;
                updateInventoryUI();
                scene.remove(target.mesh);
                mobs.splice(closestEnemy, 1);
                if (mobs.length < 5) {
                    setTimeout(() => spawnMobs(3), 5000);
                }
            }
        }
    }
}
