const settings = {
    aimbot: {
        enabled: false,
        fov: 180, // 12.5 is sex
        spreadFov: true, // fov around spread
        onFire: true, // aims when you fire
        silent: true, // doesnt show you the aimbot
        smoothing: 0.975, // only for non-onFire aimbot
        smoothingType: 1, // 0 off, 1 constant, 2 slow end, 3 fast end, 4 time based
        distance: 0, // if within distance prio target and ignore fov
        predictPosition: true,
        // backtrack: false,
        predictSpread: true,
        visibleCheck: true,
        maxSpread: 1, // 0 to 1 (0 to 100%) spread
        autoFire: true,
        autoFireScopeOnly: false,
        autoScope: false,
        triggerbot: false,
        afterShotDelay: 0, // in milliseconds
        disableAfterShot: false,
        prioritize: [ 'NEO', 'ColdFries?', 'im not Aimbotting', 'OneShotMan' ], // [ 'some username', 'another username' ]
        ignore: [],
        keyBinds: {
            // feature: { key: 'some key', type: 'some type' }
            enabled: { key: 'MOUSE 2', type: 'hold' }, // toggle or hold type
            triggerbot: { key: 'C', type: 'hold' }
        }
    },
    visuals: {
        esp: true,
        drawName: true,
        tracers: true,
        enemyOnly: true,
        chams: false,
        visibleCheck: false,
        visibilityColoring: true,
        visibilityOverlay: false,
        visibleColor: { r: 0, g: 1, b: 0, a: 0.75 },
        hiddenColor: { r: 1, g: 0, b: 0, a: 0.75 },
        grenadeEsp: true,
        drawPrediction: true,
        drawPredictionColor: { r: 1, g: 0, b: 0, a: 0.75 },
        // drawBacktrack: false,
        // drawBacktrackColor: { r: 1, g: 0, b: 0, a: 0.75 },
        drawAimbotFov: true,
        drawAimbotFovColor: { r: 1, g: 0, b: 0, a: 1 },
        drawSpread: true,
        drawSpreadColor: { r: 1, g: 0, b: 0, a: 1 },
        ignore: [],
        keyBinds: {
            esp: { key: 'O', type: 'toggle' },
            visibilityOverlay: { key: 'O', type: 'toggle' },
            visibleCheck: { key: 'I', type: 'toggle' }
        }
    },
    misc: {
        bunnyhop: true,
        automaticWeapons: true,
        autoReload: true,
        removeScope: true,
        upsideDown: false,
        modifyGrenadeThrow: true,
        grenadeThrowPower: 0.8, // 0 to 1
        antiSpread: false,
        antiSpreadSilent: true,
        fakeLag: false,
        fakeLagAmount: 15, // 15 * 33.33... = 500ms max lag compensation
        unfocus: 'P', // false for off
        keyBinds: {
            // fakeLag: { key: 'U', type: 'toggle' }
        }
    }
};

window.hack = window.hack || {};
hack.settings = settings;

if (hack.loaded) throw new Error('Already loaded! Settings were updated.');
hack.loaded = true;

'use strict';

const httpGet = function (url) {
    const request = new XMLHttpRequest();
    request.open('GET', url, false);
    request.send();
    return request.response;
}

new Function(httpGet('https://cdn.jsdelivr.net/npm/babylonjs@7.25.1/babylon.js'))();
const BABYLON = window.BABYLON;
delete window.BABYLON;

const Collider = {};

const obf = {}; // obfuscated vars

let myPlayer;
let players = [];

const spreadIndicator = document.createElement('div');
spreadIndicator.style.position = 'absolute';
spreadIndicator.style.zIndex = 100;
spreadIndicator.style.borderRadius = '100%';
spreadIndicator.style.transform = 'translate(-50%, -50%)';
spreadIndicator.style.pointerEvents = 'none';
document.body.appendChild(spreadIndicator);

const fovCircle = document.createElement('div');
fovCircle.style.position = 'absolute';
fovCircle.style.zIndex = 100;
fovCircle.style.borderRadius = '100%';
fovCircle.style.borderStyle = 'solid'
fovCircle.style.borderWidth = 'thin'
fovCircle.style.transform = 'translate(-50%, -50%)';
fovCircle.style.pointerEvents = 'none';
document.body.appendChild(fovCircle);

const getControls = function () {
    const controls = getStoredObject('controls', {
        keyboard: {
            game: {
                up: 'W',
                down: 'S',
                left: 'A',
                right: 'D',
                jump: 'SPACE',
                melee: 'F',
                inspect: 'G',
                fire: 'MOUSE 0',
                scope: 'SHIFT',
                reload: 'R',
                swap_weapon: 'E',
                grenade: 'Q'
            },
            spectate: {
                ascend: 'SPACE',
                descend: 'SHIFT',
                toggle_freecam: 'V'
            }
        },
        gamepad: {
            game: {
                jump: 0,
                fire: 7,
                scope: 6,
                reload: 2,
                swap_weapon: 3,
                grenade: 5,
                melee: 1,
                inspect: 4
            },
            spectate: {
                ascend: 6,
                descend: 7
            }
        }
    })
    return controls.keyboard.game;
}

const isInChat = function () {
    return document.getElementById('chatIn').style.background == 'rgba(0, 0, 0, 0.5)';
}

let lastFired = 0;

const isKeyDown = {};
const isKeyDownByScript = {};

const keyHandler = function (event) {
    const isDown = event.type.includes('down');

    if (isKeyDownByScript[event.key] == isDown) return;
    if (event.type == 'keydown' && isInChat()) return;
    if (event.type.includes('mouse')) event.key = 'mouse ' + event.button;
    if (event.key == undefined) return;
    const key = event.key == ' ' ? event.key = 'SPACE': event.key.toLocaleUpperCase();
    
    isKeyDown[key] = isDown;

    for (const [categoryName, category] of Object.entries(hack.settings)) {
        if (!category.keyBinds) continue;
        for (const [feature, keyBind] of Object.entries(category.keyBinds)) {
            if (key != keyBind.key) continue;
            category[feature] = keyBind.type == 'toggle' ? (isDown ? !category[feature]: category[feature]): isDown;
            if (categoryName == 'aimbot' && feature == 'enabled') lastFired = 0;
        }
    }

    if (event.type == 'keydown') {
        if (key == hack.settings.misc.unfocus && document.onpointerlockchange) {
            const onpointerlockchangeOld = document.onpointerlockchange;
            document.onpointerlockchange = function () { return document.onpointerlockchange = onpointerlockchangeOld; }
            document.pointerLockElement ? document.exitPointerLock(): canvas.requestPointerLock();
        }
    }
}

const virtualKeyPress = function (type, key) {
    isKeyDownByScript[key] = type.includes('down');
    document.dispatchEvent(new KeyboardEvent(type));
    document.dispatchEvent(new KeyboardEvent(type, { key: key }));
}

document.addEventListener('mousedown', keyHandler, true);
document.addEventListener('mouseup', keyHandler, true);
document.addEventListener('keydown', keyHandler, true);
document.addEventListener('keyup', keyHandler, true);

const pushOld = Array.prototype.push;
Array.prototype.push = function () {
    const old = pushOld.apply(this, arguments);
    if (!(arguments[0] && arguments[0].id == 'egg.egg')) return old; // PlayerActor.bodyMesh hook
    
    let player;
    for (const [key, property] of Object.entries(arguments[0])) {
        if (!(property && property.normalName)) continue;
        if (!obf.player) obf.player = key;
        player = property;
        break;
    }

    if (!player) return old;

    players[player.id] = player;

    if (myPlayer) return old;

    for (const player of Object.values(players)) {
        if (!(player && 'ws' in player)) continue;
        myPlayer = player;
        myPlayerHooks();
        return old;
    }

    if (obf.update) return old;

    const playerPrototype = Object.getPrototypeOf(player);

    for (const [name, property] of Object.entries(playerPrototype)) {
        if (property.toString().match(/\.syncMe/)) {
            obf.update = name;
            break;
        }
    }

    const updateOld = playerPrototype[obf.update];
    playerPrototype[obf.update] = function () {
        players[this.id] = this;
        return updateOld.apply(this, arguments);
    }

    return old;
}

const modOld = Math.mod;

const statesToSync = {};

const syncStates = function () {
    const stateBuffer = myPlayer[obf.stateBuffer];
    for (const [stateIdx, state] of Object.entries(statesToSync)) {
        if (modOld(myPlayer.stateIdx - stateIdx, 256) <= 3) {
            const currentState = stateBuffer[stateIdx];
            if (state.yaw) currentState[obf.yaw] = state.yaw;
            if (state.pitch) currentState[obf.pitch] = state.pitch;
            if (state.controlKeys) {
                currentState[obf.controlKeys] &= ~CONTROL.up;
                currentState[obf.controlKeys] &= ~CONTROL.down;
                currentState[obf.controlKeys] &= ~CONTROL.right;
                currentState[obf.controlKeys] &= ~CONTROL.left;
                if (state.controlKeys & CONTROL.up) currentState[obf.controlKeys] |= CONTROL.up;
                else if (state.controlKeys & CONTROL.down) currentState[obf.controlKeys] |= CONTROL.down;
                if (state.controlKeys & CONTROL.right) currentState[obf.controlKeys] |= CONTROL.right;
                else if (state.controlKeys & CONTROL.left) currentState[obf.controlKeys] |= CONTROL.left;
            }
        } else delete statesToSync[stateIdx];
    }
}

const seedBuffer = [];

const myPlayerHooks = function () {
    if (!obf.randomGen) {
        const signOld = Math.sign;
        Math.sign = function () {
            const caller = arguments.callee.caller;
            if (caller && caller.toString().match(/"verysoft"/)) { // Collider.rayCollidesWithMap hook
                Collider['rayCollidesWithMap'] = caller;
                const passedFunc = caller.arguments[2];
                if (passedFunc.toString().match(/mesh\.softness/)) { // Collider.projectileCollidesWithCell hook
                    Collider['projectileCollidesWithCell'] = passedFunc;
                } else { // Collider.grenadeCollidesWithCell hook
                    Collider['grenadeCollidesWithCell'] = passedFunc;
                }
                if (Object.keys(Collider).length == 3) Math.sign = signOld;
            }
            return signOld.apply(this, arguments);
        }
        
        Math.normalize3 = function () {
            return { x: -1e10, y: 0, z: 0 };
        } // isMeshVisible() >> true hook
        
        const sqrtOld = Math.sqrt;
        Math.sqrt = function () {
            const caller = arguments.callee.caller;
            if (caller && caller.toString().match(/grenade_beep/)) { // GrenadeActor.prototype.update hook
                const grenade = caller.caller.arguments[0];
                if (!grenade.modified) {
                    grenade.modified = true;
                    for (const mesh of Object.values(grenade[obf.actor].meshes))
                        mesh.setRenderingGroupId(hack.settings.visuals.grenadeEsp ? 1: 0);
                }
            }/* else if (!Collider.rayCollidesWithPlayer &&
                caller && caller.toString().match(/Math\.sqrt\([a-zA-Z_$]+\)\)\/\(2/)) { // Collider.rayCollidesWithPlayer hook
                Collider.rayCollidesWithPlayerHelper = caller;
                Collider.rayCollidesWithPlayer = caller.caller;
            }*/
            return sqrtOld.apply(this, arguments);
        }

        const resetStateBuffer = myPlayer.resetStateBuffer.toString();
        const result = resetStateBuffer.match(/this\.([a-zA-Z_$]+)/g);
        obf.stateBuffer = result[0].replace(/this\./, '');
        obf.yaw = result[1].replace(/this\./, '');
        obf.pitch = result[2].replace(/this\./, '');
        obf.jumping = result[3].replace(/this\./, '');
        obf.climbing = result[4].replace(/this\./, '');
        obf.x = result[5].replace(/this\./, '');
        obf.y = result[6].replace(/this\./, '');
        obf.z = result[7].replace(/this\./, '');
        obf.controlKeys = result[11].replace(/this\./, '');
    
        const isAtReady = myPlayer.isAtReady.toString();
        obf.playing = isAtReady.match(/\(this\.([a-zA-Z_$]+)/)[1];
    
        const endShellStreak = myPlayer.endShellStreak.toString();
        obf.actor = endShellStreak.match(/this\.([a-zA-Z_$]+)\./)[1];
        obf.mesh = endShellStreak.match(/([a-zA-Z_$]+)\.position/)[1];
    
        const disableShield = myPlayer.disableShield.toString();
        obf.bodyMesh = disableShield.match(/([a-zA-Z_$]+)\.renderOverlay/)[1];

        const fire = myPlayer.weapon.fire.toString();
        obf.randomGen = fire.match(/this\.[a-zA-Z_$]+\.([a-zA-Z_$]+)\.getFloat/)[1];

        const playerPrototype = Object.getPrototypeOf(myPlayer);

        const fireOld = playerPrototype.fire;
        playerPrototype.fire = function () { //Player.prototype.fire hook
            const minAmmo = hack.settings.misc.autoReload ? smartReloadMinAmmo[myPlayer.weapon.constructor.standardMeshName]: 0;
            if (myPlayer.weapon.ammo.rounds > minAmmo) return fireOld.apply(this, arguments);
        };

        const gunPrototype = Object.getPrototypeOf(Object.getPrototypeOf(myPlayer.weapon));
        const fireOld1 = gunPrototype.fire;
        gunPrototype.fire = function () { // Gun.prototype.fire hook
            onFire();
            const miscSettings = hack.settings.misc;
            if (miscSettings.antiSpread && miscSettings.antiSpreadSilent) {
                const accuracyOld = myPlayer.weapon.accuracy;
                myPlayer.weapon.accuracy = 0;
                const old = fireOld1.apply(this, arguments);
                myPlayer.weapon.accuracy = accuracyOld;
                return old;
            }
            return fireOld1.apply(this, arguments);
        }

        const getElementByIdOld = document.getElementById;
        document.getElementById = function () {
            if (arguments[0] == 'weaponName') { // updateAmmoUi hook
                const caller = arguments.callee.caller.caller;
                if (caller && caller.toString().match(/syncMe:/)) { // in ws.onmessage
                    const ammoOld = document.getElementById('ammo').innerHTML.split('/');
                    const roundsOld = parseInt(ammoOld[0]);
                    const storeOld = parseInt(ammoOld[1]);
                    const ammo = myPlayer.weapon.ammo;
                    const rounds = ammo.rounds;
                    const store = ammo.store;
                    const ammoDiff = (roundsOld + storeOld) - (rounds + store);
                    if (storeOld !== store || roundsOld !== rounds) {
                        if (ammoDiff < 0) {
                            myPlayer[obf.randomGen].seed =
                            seedBuffer[(seedBuffer.length += 3 * ammoDiff) - 1];
                        } else {
                            for (_ = 0; _ < 3 * ammoDiff; _++)
                                myPlayer[obf.randomGen].getFloat();
                        }
                        // console.log('desynced by ' + ammoDiff + ' shot(s)');
                    }
                }
            }
            return getElementByIdOld.apply(this, arguments);
        }

        const powOld = Math.pow;
        Math.pow = function () {
            const old = powOld.apply(this, arguments);
            const caller = arguments.callee.caller;
            if (caller && caller.toString().match(/mouseSpeed/)) { // onCanvasMouseMove hook
                if (hack.settings.misc.removeScope && myPlayer.scope)
                    return old / myPlayer.weapon[obf.actor].scopeFov;
            };
            return old;
        }

        const throwGrenade = myPlayer.throwGrenade.toString();
        obf.clamp = throwGrenade.match(/Math\.([a-zA-Z_$]+)/)[1];

        const clampOld = Math[obf.clamp];
        Math[obf.clamp] = function () {
            const caller = arguments.callee.caller;
            if (caller && caller.toString().match(/throwGrenade/)) // Player.prototype.throwGrenade hook
                if (hack.settings.misc.modifyGrenadeThrow) return hack.settings.misc.grenadeThrowPower;
            return clampOld.apply(this, arguments);
        }
    }

    const randomGen = myPlayer[obf.randomGen];

    const setSeedOld = randomGen.setSeed;
    randomGen.setSeed = function () {
        const old = setSeedOld.apply(this, arguments);
        seedBuffer.length = 0;
        seedBuffer.push(randomGen.seed);
        return old;
    }

    const getFloatOld = randomGen.getFloat;
    randomGen.getFloat = function () {
        const old = getFloatOld.apply(this, arguments);
        seedBuffer.push(randomGen.seed);
        return old;
    }

    // const boundingBoxRenderer = myPlayer.scene.getBoundingBoxRenderer();
    // if (boundingBoxRenderer.enabled == undefined) {
    //     boundingBoxRenderer.enabled = true;
    //     const renderOld = boundingBoxRenderer.render;
    //     boundingBoxRenderer.render = function () {
    //         if (this.enabled) return renderOld.apply(this, arguments);
    //     }
    // }

    // const shadowMap = myPlayer.scene.lights[0] && myPlayer.scene.lights[0].getShadowGenerator().getShadowMap();
    // if (shadowMap) {
    //     shadowMap.onBeforeBindObservable.add(function () { boundingBoxRenderer.enabled = false; } );
    //     shadowMap.onAfterUnbindObservable.add(function () { boundingBoxRenderer.enabled = true; } );
    // }

    const actorPrototype = Object.getPrototypeOf(myPlayer[obf.actor]);
    const removeOld = actorPrototype.remove;
    actorPrototype.remove = function () { // PlayerActor.prototype.remove hook
        const old = removeOld.apply(this, arguments);
        const player = this[obf.player];
        // player[obf.actor][obf.bodyMesh].showBoundingBox = false;
        if (player.tracer) {
            player.tracer.dispose();
            player.tracer = undefined;
        }
        delete players[player.id];
        return old;
    }

    const oncloseOld = myPlayer.ws.onclose;
    myPlayer.ws.onclose = function () { // game end hook
        const old = oncloseOld.apply(this, arguments);
        myPlayer = undefined;
        for (const player of Object.values(players)) {
            if (player.tracer) {
                player.tracer.dispose();
                player.tracer = undefined;
            }
            // if (!(player && player[obf.actor] && player[obf.actor][obf.bodyMesh])) continue;
            // player[obf.actor][obf.bodyMesh].showBoundingBox = false;
        }
        players = [];
        spreadIndicator.style.display = 'none';
        fovCircle.style.display = 'none';
        return old;
    }

    const saveStateOld = myPlayer.saveState;
    myPlayer.saveState = function () { // Player.prototype.saveState hook for myPlayer
        const old = saveStateOld.apply(this, arguments);

        if (myPlayer.stateIdx % 3 != 0) return old; // serverSync hook

        syncStates();

        if (!hack.settings.misc.fakeLag) return old;
        // console.log(myPlayer.serverStateIdx, serverStateIdx)

        const serverStateIdxOld = myPlayer.serverStateIdx;
        myPlayer.serverStateIdx = modOld(myPlayer.serverStateIdx - hack.settings.misc.fakeLagAmount, 256);
        const stateIdxOld = myPlayer.stateIdx;
        myPlayer.stateIdx = modOld(myPlayer.stateIdx - hack.settings.misc.fakeLagAmount, 256);

        let currentStateIdx, callCounter = 0;
        Math.mod = function () {
            // const caller = arguments.callee.caller;
            // if (!(caller && caller.toString().match(/serverStateIdx\)/))) {
            //     myPlayer.serverStateIdx = serverStateIdxOld;
            //     serverStateIdx = undefined;
            //     Math.mod = modOld;
            //     return modOld.apply(this, arguments);
            // }

            callCounter++;
            if (callCounter > 2) {
                if ((callCounter % 2) == 0) {
                    arguments[0] = currentStateIdx;
                    if (callCounter == 8) {
                        myPlayer.serverStateIdx = serverStateIdxOld;
                        myPlayer.stateIdx = stateIdxOld;
                        Math.mod = modOld;
                    }
                } else {
                    return currentStateIdx = modOld.apply(this, arguments);
                }
            }
            return modOld.apply(this, arguments);
        }
        return old;
    }

    const renderOld = myPlayer.scene.render;
    myPlayer.scene.render = function () { // Scene.prototype.render hook
        onRender();
        return renderOld.apply(this, arguments);
    }

    const updateOld = myPlayer[obf.update];
    myPlayer[obf.update] = function () { // Player.prototype.update hook for myPlayer
        onUpdate();
        return updateOld.apply(this, arguments);
    }

    const updateOld1 = myPlayer[obf.actor].update;
    myPlayer[obf.actor].update = function () { // PlayerActor.prototype.update hook for myPlayer
        const scopeOld = myPlayer.scope;
        if (hack.settings.misc.removeScope) myPlayer.scope = false;
        const old = updateOld1.apply(this, arguments);
        if (hack.settings.misc.removeScope) myPlayer.scope = scopeOld;
        return old;
    }
}

const getDirectionFromRotation = function (rotation) {
    return BABYLON.Matrix.Translation(0, 0, 1)
        .multiply(BABYLON.Matrix.RotationYawPitchRoll(rotation.yaw, rotation.pitch, 0))
        .getTranslation();
}

const getRotationFromDirection = function (direction) {
    direction.normalize();
    return {
        yaw: Math.radRange(Math.atan2(direction.x, direction.z)),
        pitch: -Math.asin(direction.y)
    };
}

const getPlayerPosition = function (player) {
    return player[obf.actor][obf.mesh].position;
}

const getPlayerDirection = function (player) {
    return getDirectionFromRotation({ yaw: player[obf.yaw], pitch: player[obf.pitch] });
}

const getCrosshairPosition = function (player) {
    return player[obf.actor].eye.getAbsolutePosition().add(getPlayerDirection(player));
}

let camera;

const getCameraById = function (id) {
    for (const camera of myPlayer.scene.cameras)
        if (camera.id == id) return camera;
}

const getCamera = function () {
    return camera = (!camera || camera._isDisposed) ? getCameraById('camera'): camera;
};

const worldToScreenPosition = function (vector3) {
    return BABYLON.Vector3.Project(
        vector3,
        BABYLON.Matrix.Identity(),
        getCamera().getTransformationMatrix(),
        new BABYLON.Viewport(0, 0, canvas.width, canvas.height)
    );
}

const predictPosition = function (target) {
    const myPlayerPosition = getPlayerPosition(myPlayer);
    const targetVelocity = new BABYLON.Vector3(target.dx, target.dy, target.dz);
    if (target[obf.climbing]) targetVelocity.y *= 4;
    const targetPosition = getPlayerPosition(target).add(targetVelocity);
    // const miscSettings = hack.settings.misc;
    // if (miscSettings.fakeLag && miscSettings.fakeLagAmount >= 3) {}
    const distance = BABYLON.Vector3.Distance(myPlayerPosition, targetPosition);
    const deltaTime = distance / myPlayer.weapon.constructor.velocity;
    let predictedPosition = targetPosition.add(targetVelocity.scale(deltaTime));
    if (!target.onGround && !target[obf.climbing] && Collider.grenadeCollidesWithCell) {
        predictedPosition.y = targetPosition.y;
        const terminalVelocity = -0.29
        const gravity = extern.GameOptions.value.gravity * -0.012;
        const timeAccelerating = Math.min(deltaTime, (terminalVelocity - targetVelocity.y) / gravity);
        const predictedY = targetPosition.y + targetVelocity.y * timeAccelerating + (1 / 2) * gravity * timeAccelerating ** 2 + terminalVelocity * Math.max(deltaTime - timeAccelerating, 0);
        const rayToGround = Collider.rayCollidesWithMap(predictedPosition, new BABYLON.Vector3(0, predictedY - 1 - targetPosition.y, 0), Collider.grenadeCollidesWithCell);
        predictedPosition.y = Math.max(rayToGround ? rayToGround.pick.pickedPoint.y: 0, predictedY);
    }
    return predictedPosition;
}

const getRotationMatrix = function (directionOrRotation) {
    const rotation = directionOrRotation.yaw ? directionOrRotation: getRotationFromDirection(directionOrRotation);
    const rotationMatrix = BABYLON.Matrix.RotationYawPitchRoll(rotation.yaw, rotation.pitch, 0);
    return rotationMatrix;
}

const getDirectionMatrix = function (rotationMatrix) {
    const forwardMatrix = BABYLON.Matrix.Translation(0, 0, myPlayer.weapon.constructor.range);
    const directionMatrix = forwardMatrix.multiply(rotationMatrix);
    return directionMatrix;
}

const predictSpread = function (directionOrRotation, invert) {
    if (myPlayer.weapon.constructor.standardMeshName == 'dozenGauge') return directionOrRotation;
    const directionMatrix = getDirectionMatrix(getRotationMatrix(directionOrRotation));
	const spread = myPlayer.weapon.accuracy;
    let seed = myPlayer[obf.randomGen].seed;
	const spreadMatrix = BABYLON.Matrix.RotationYawPitchRoll(
        ((seed = (9301 * seed + 49297) % 233280, seed / 233280) - .5) * spread,
        ((seed = (9301 * seed + 49297) % 233280, seed / 233280) - .5) * spread,
        ((seed = (9301 * seed + 49297) % 233280, seed / 233280) - .5) * spread
    );
    if (invert) spreadMatrix.invert();
	const direction = directionMatrix.multiply(spreadMatrix).getTranslation().normalize();
    return directionOrRotation.yaw ? getRotationFromDirection(direction): direction;
};

const YOffset = new BABYLON.Vector3(0, -0.05, 0);

const visibleCheck = function (target) {
    if (!myPlayer) return;
    if (!Collider.projectileCollidesWithCell) return;
    if (target[obf.actor].hands.renderOverlay && target[obf.actor].hands.overlayColor.g == 1) return;

    const aimbotSettings = hack.settings.aimbot;

    const myPlayerPosition = getPlayerPosition(myPlayer);
    const targetPosition = aimbotSettings.predictPosition ? predictPosition(target): getPlayerPosition(target);

    let directionToTarget = targetPosition.add(YOffset).subtract(myPlayerPosition).normalize();
    const rotationMatrix = getRotationMatrix(directionToTarget);
    directionToTarget = getDirectionMatrix(rotationMatrix).getTranslation();
    // now directionToTarget length is myPlayer.weapon.constructor.range (intended)
    
    const eyePosition = BABYLON.Matrix.Translation(0, .1, 0)
    .multiply(rotationMatrix)
    .add(BABYLON.Matrix.Translation(myPlayerPosition.x, myPlayerPosition.y + 0.31, myPlayerPosition.z))
    .getTranslation();

    const rayCollidesWithMap = Collider.rayCollidesWithMap(eyePosition, directionToTarget, Collider.projectileCollidesWithCell);
    const distanceToMap = rayCollidesWithMap ? BABYLON.Vector3.DistanceSquared(eyePosition, rayCollidesWithMap.pick.pickedPoint): Infinity;
    const distanceToTarget = BABYLON.Vector3.DistanceSquared(eyePosition, targetPosition);

    return distanceToTarget < distanceToMap;
}

const fireFov = 8;

const triggerbot = function () {
    if (!myPlayer) return;
    if (!(Collider.projectileCollidesWithCell)) return;

    const aimbotSettings = hack.settings.aimbot;
    
    const myPlayerPosition = getPlayerPosition(myPlayer);
    const myPlayerDirection = predictSpread(getPlayerDirection(myPlayer));

    const rotationMatrix = getRotationMatrix(myPlayerDirection);
    const directionToTarget = getDirectionMatrix(rotationMatrix).getTranslation();
    const eyePosition = BABYLON.Matrix.Translation(0, .1, 0)
    .multiply(rotationMatrix)
    .add(BABYLON.Matrix.Translation(myPlayerPosition.x, myPlayerPosition.y + 0.3, myPlayerPosition.z))
    .getTranslation();

    const rayCollidesWithMap = Collider.rayCollidesWithMap(eyePosition, directionToTarget, Collider.projectileCollidesWithCell);
    const distanceToMap = rayCollidesWithMap ? BABYLON.Vector3.DistanceSquared(eyePosition, rayCollidesWithMap.pick.pickedPoint): Infinity;

    for (const player of Object.values(players)) {
        if (!(player && player[obf.playing] && player != myPlayer && (player.team == 0 || player.team != myPlayer.team))) continue;
        if (player[obf.actor].hands.renderOverlay && player[obf.actor].hands.overlayColor.g == 1) continue;
        const targetPosition = aimbotSettings.predictPosition ? predictPosition(player, true): getPlayerPosition(player);
        const distanceToTarget = BABYLON.Vector3.DistanceSquared(eyePosition, targetPosition);
        if (distanceToTarget > distanceToMap) continue;

        const directionToTarget = targetPosition.add(YOffset).subtract(eyePosition).normalize();
        const newFov = Math.acos(BABYLON.Vector3.Dot(myPlayerDirection, directionToTarget)) * (180 / Math.PI);
        if (newFov < fireFov / (distanceToTarget ** 0.5)) return myPlayer.pullTrigger();
    }
}

const setRadPrecision = function (value) {
    return Math.floor(value * 8192) / 8192;
}

let silentRotation;

const getAimbotTarget = function () {
    const aimbotSettings = hack.settings.aimbot;

    if (myPlayer.weapon.accuracy > aimbotSettings.maxSpread) return {};
    
    const myPlayerPosition = getPlayerPosition(myPlayer);
    let myPlayerDirection = getPlayerDirection(myPlayer);

    if (aimbotSettings.spreadFov)
        myPlayerDirection = predictSpread(myPlayerDirection);

    let fov = aimbotSettings.fov;
    let distance = aimbotSettings.distance;
    let target;
    let prioritized = false;

    for (const player of Object.values(players)) {
        if (!(player && player[obf.playing] && player != myPlayer)) continue;
        if (!(player.team == 0 || player.team != myPlayer.team)) continue;
        if (!(!aimbotSettings.visibleCheck || visibleCheck(player))) continue;
        if (aimbotSettings.ignore.includes(player.normalName)) continue;

        const priorityTarget = aimbotSettings.prioritize.includes(player.normalName);
        if (!(!prioritized || priorityTarget)) continue;

        const targetPosition = aimbotSettings.predictPosition ? predictPosition(player): getPlayerPosition(player);
        const newDistance = BABYLON.Vector3.Distance(myPlayerPosition, targetPosition);

        if (newDistance < distance) {
            distance = newDistance;
            target = player;
            prioritized = priorityTarget;
        } else if (distance == aimbotSettings.distance) {
            const directionToTarget = targetPosition.add(YOffset).subtract(myPlayerPosition).normalize();
            const newFov = Math.acos(BABYLON.Vector3.Dot(myPlayerDirection, directionToTarget)) * (180 / Math.PI);
            if (newFov < fov) {
                fov = newFov;
                target = player;
                prioritized = priorityTarget;
            }
        }
    }

    if (target) {
        const myPlayerPosition = getPlayerPosition(myPlayer);
        const myPlayerDirection = silentRotation ? getDirectionFromRotation(silentRotation): getPlayerDirection(myPlayer);
        const targetPosition = aimbotSettings.predictPosition ? predictPosition(target): getPlayerPosition(target);
        const directionToTarget = targetPosition.add(YOffset).subtract(myPlayerPosition).normalize();
        const direction = aimbotSettings.predictSpread ? predictSpread(directionToTarget, true): directionToTarget;
        const rotation = getRotationFromDirection(direction);
        rotation.yaw = setRadPrecision(rotation.yaw);
        rotation.pitch = setRadPrecision(rotation.pitch);
        const bulletToTargetFov = Math.acos(BABYLON.Vector3.Dot(predictSpread(myPlayerDirection), directionToTarget)) * (180 / Math.PI);
        // const crosshairToTargetFov = Math.acos(BABYLON.Vector3.Dot(myPlayerDirection, directionToTarget)) * (180 / Math.PI);
        const distance = BABYLON.Vector3.Distance(myPlayerPosition, targetPosition);
        return { bulletToTargetFov, distance, target, direction, rotation };
    }

    return {};
}

const CONTROL = {
    up: 1,
    down: 2,
    left: 4,
    right: 8,
    jump: 16,
    fire: 32,
    melee: 64,
    scope: 128,
    ascend: 256,
    descend: 512
};

const getSilentControlKeys = function (newYaw) {
    const controlKeys = myPlayer[obf.controlKeys];
    let controlKeysOld = 0;
    
    if (!(controlKeys & CONTROL.up && controlKeys & CONTROL.down)) {
        if (controlKeys & CONTROL.up) controlKeysOld |= CONTROL.up;
        else if (controlKeys & CONTROL.down) controlKeysOld |= CONTROL.down;
    }

    if (!(controlKeys & CONTROL.right && controlKeys & CONTROL.left)) {
        if (controlKeys & CONTROL.right) controlKeysOld |= CONTROL.right;
        else if (controlKeys & CONTROL.left) controlKeysOld |= CONTROL.left;
    }

    if (myPlayer[obf.climbing]) return controlKeysOld;

    let yawDiff = Math.radDifference(myPlayer[obf.yaw], newYaw) * 180 / Math.PI;
    const yawDiffPositive = yawDiff > 0 // a turn to the left if positive
    yawDiff *= yawDiffPositive ? 1: -1;
    
    let controlKeysNew = 0;
    
    if (yawDiff > 157.5) {
        if (controlKeysOld & CONTROL.up) controlKeysNew |= CONTROL.down;
        else if (controlKeysOld & CONTROL.down) controlKeysNew |= CONTROL.up;
        if (controlKeysOld & CONTROL.right) controlKeysNew |= CONTROL.left;
        else if (controlKeysOld & CONTROL.left) controlKeysNew |= CONTROL.right;
    } else if (yawDiff > 112.5) {
        if (yawDiffPositive) {
            if (controlKeysOld & CONTROL.up) { controlKeysNew |= CONTROL.down; controlKeysNew |= CONTROL.right; }
            else if (controlKeysOld & CONTROL.down) { controlKeysNew |= CONTROL.up; controlKeysNew |= CONTROL.left; }
            if (controlKeysOld & CONTROL.right) { controlKeysNew |= CONTROL.down; controlKeysNew |= CONTROL.left; }
            else if (controlKeysOld & CONTROL.left) { controlKeysNew |= CONTROL.up; controlKeysNew |= CONTROL.right; }
        } else {
            if (controlKeysOld & CONTROL.up) { controlKeysNew |= CONTROL.down; controlKeysNew |= CONTROL.left; }
            else if (controlKeysOld & CONTROL.down) { controlKeysNew |= CONTROL.up; controlKeysNew |= CONTROL.right; }
            if (controlKeysOld & CONTROL.right) { controlKeysNew |= CONTROL.up; controlKeysNew |= CONTROL.left; }
            else if (controlKeysOld & CONTROL.left) { controlKeysNew |= CONTROL.down; controlKeysNew |= CONTROL.right; }
        }
    } else if (yawDiff > 67.5) {
        if (yawDiffPositive) {
            if (controlKeysOld & CONTROL.up) controlKeysNew |= CONTROL.right;
            else if (controlKeysOld & CONTROL.down) controlKeysNew |= CONTROL.left;
            if (controlKeysOld & CONTROL.right) controlKeysNew |= CONTROL.down;
            else if (controlKeysOld & CONTROL.left) controlKeysNew |= CONTROL.up;
        } else {
            if (controlKeysOld & CONTROL.up) controlKeysNew |= CONTROL.left;
            else if (controlKeysOld & CONTROL.down) controlKeysNew |= CONTROL.right;
            if (controlKeysOld & CONTROL.right) controlKeysNew |= CONTROL.up;
            else if (controlKeysOld & CONTROL.left) controlKeysNew |= CONTROL.down;
        }
    } else if (yawDiff > 22.5) {
        if (yawDiffPositive) {
            if (controlKeysOld & CONTROL.up) { controlKeysNew |= CONTROL.up; controlKeysNew |= CONTROL.right; }
            else if (controlKeysOld & CONTROL.down) { controlKeysNew |= CONTROL.down; controlKeysNew |= CONTROL.left; }
            if (controlKeysOld & CONTROL.right) { controlKeysNew |= CONTROL.down; controlKeysNew |= CONTROL.right; }
            else if (controlKeysOld & CONTROL.left) { controlKeysNew |= CONTROL.up; controlKeysNew |= CONTROL.left; }
        } else {
            if (controlKeysOld & CONTROL.up) { controlKeysNew |= CONTROL.up; controlKeysNew |= CONTROL.left; }
            else if (controlKeysOld & CONTROL.down) { controlKeysNew |= CONTROL.down; controlKeysNew |= CONTROL.right; }
            if (controlKeysOld & CONTROL.right) { controlKeysNew |= CONTROL.up; controlKeysNew |= CONTROL.right; }
            else if (controlKeysOld & CONTROL.left) { controlKeysNew |= CONTROL.down; controlKeysNew |= CONTROL.left; }
        }
    }

    return controlKeysNew;
}

const clamp = function (value, min, max) {
    return Math.min(Math.max(value, min), max);
}

const maxAimTime = 700;
let currentAimTime = 0;
let nowOld = 0;

const onRender = function () {
    if (!myPlayer) return;

    const aimbotSettings = hack.settings.aimbot;

    const deltaTime = performance.now() - nowOld;
    nowOld += deltaTime;
    
    if (aimbotSettings.enabled && performance.now() > lastFired + aimbotSettings.afterShotDelay) {
        const {rotation, distance, bulletToTargetFov} = getAimbotTarget();
        if (rotation) {
            currentAimTime += deltaTime;
            if (!aimbotSettings.onFire) {
                // https://github.com/AimTuxOfficial/AimTux/blob/master/src/Hacks/aimbot.cpp
        
                if (aimbotSettings.smoothingType != 0) {
                    let smoothing = 1 - aimbotSettings.smoothing;

                    const currentState = silentRotation || {
                        yaw: myPlayer[obf.yaw],
                        pitch:  myPlayer[obf.pitch]
                    };
    
                    const yawDiff = Math.radDifference(rotation.yaw, currentState.yaw);
                    const pitchDiff = Math.radDifference(rotation.pitch, currentState.pitch);
            
                    if (aimbotSettings.smoothingType != 2) { // not slow end
                        smoothing /= ((yawDiff ** 2 + pitchDiff ** 2) ** 0.5) * 4; // constant
                        if (aimbotSettings.smoothingType == 3) smoothing *= smoothing * 10; // fast end
                        else if (aimbotSettings.smoothingType == 4) smoothing *= currentAimTime / maxAimTime; // time based
                        smoothing = Math.min(1, smoothing);
                    }
    
                    rotation.yaw = setRadPrecision(currentState.yaw + yawDiff * smoothing);
                    rotation.pitch = setRadPrecision(currentState.pitch + pitchDiff * smoothing);
                }

                if (aimbotSettings.silent) {
                    rotation.controlKeys = getSilentControlKeys(rotation.yaw);
                    silentRotation = rotation;
                    statesToSync[myPlayer.stateIdx] = rotation;
                    for (let i = 1; i < 3; i++) {
                        const stateIdx = modOld(myPlayer.stateIdx - i, 256);
                        if (statesToSync[stateIdx]) break;
                        statesToSync[stateIdx] = rotation;
                    }
                } else {
                    myPlayer[obf.yaw] = rotation.yaw;
                    myPlayer[obf.pitch] = rotation.pitch;
                    silentRotation = undefined;
                }
            }

            if (aimbotSettings.autoFire
                && (!aimbotSettings.onFire && bulletToTargetFov < fireFov / distance)
                && (!aimbotSettings.autoFireScopeOnly || (myPlayer.scope && myPlayer.scopeDelay == 0)))
                myPlayer.pullTrigger();
        } else {
            currentAimTime -= deltaTime;
            silentRotation = undefined;
        }
    } else {
        currentAimTime -= deltaTime;
        silentRotation = undefined;
    }

    currentAimTime = clamp(currentAimTime, 0, maxAimTime);

    if (aimbotSettings.triggerbot) triggerbot();

    const visualSettings = hack.settings.visuals;

    for (const player of Object.values(players)) { // esp
        if (!(player && player[obf.actor] && player != myPlayer)) continue;
        
        const actor = player[obf.actor];
        const mesh = actor[obf.mesh];
        const bodyMesh = actor[obf.bodyMesh];
        const ignore = visualSettings.ignore.includes(player.normalName);
        const isEnemy = !ignore && (!visualSettings.enemyOnly || (player.team == 0 || player.team != myPlayer.team));
        const isVisible = isEnemy && visibleCheck(player);
        const visibleCheckPassed = !visualSettings.visibleCheck || isVisible;

        const chams = visualSettings.chams && isEnemy && visibleCheckPassed;
        bodyMesh.renderingGroupId = chams ? 1: 0;
        // for (const property of Object.values(actor)) {
        //     if (!(property && property.setRenderingGroupId)) continue;
        //     property.setRenderingGroupId(chams ? 1: 0);
        // }
        
        for (const mesh of actor.gunContainer.getChildMeshes())
            mesh.setRenderingGroupId(chams ? 1: 0);

        if (actor.nameSprite) {
            const drawName = visualSettings.drawName && isEnemy && visibleCheckPassed;
            actor.nameSprite._manager.renderingGroupId = drawName ? 1: 0;
            actor.nameSprite.renderingGroupId = drawName ? 1: 0;
            const distance = drawName ? BABYLON.Vector3.Distance(getPlayerPosition(myPlayer), mesh.position): 0;
			const fac = distance ** 1.25;
			actor.nameSprite.width = fac / 10 + 0.6;
			actor.nameSprite.height = fac / 20 + 0.3;
        }

        const visibilityOverlay = visualSettings.visibilityOverlay && isEnemy;
        bodyMesh.renderOverlay = visibilityOverlay ? true: actor.hands.renderOverlay;
        bodyMesh.overlayColor = visibilityOverlay
            ? (isVisible ? visualSettings.visibleColor: visualSettings.hiddenColor)
            : actor.hands.overlayColor;
        bodyMesh.overlayAlpha = bodyMesh.overlayColor.a || actor.hands.overlayAlpha;

        if (visualSettings.drawPrediction && isEnemy && visibleCheckPassed) {
            if (!player.prediction) {
                const sphere = BABYLON.MeshBuilder.CreateSphere('', { diameter: 0.05 }, myPlayer.scene);
                sphere.renderingGroupId = 2;
                sphere.renderOverlay = true;
                sphere.overlayAlpha = 1;
                // sphere.renderOutline = true
                // sphere.outlineColor = { r: 1, g: 1, b: 1 };
                // sphere.outlineWidth = 0.001;
                sphere.parent = mesh;
                player.prediction = sphere;
            }
            player.prediction.overlayColor = isVisible ? visualSettings.hiddenColor: visualSettings.visibleColor;
            player.prediction.setAbsolutePosition(predictPosition(player, true).add({ x: 0, y: 0.3027, z: 0}).add(YOffset));
        } else if (player.prediction) {
            player.prediction.dispose();
            player.prediction = undefined;
        }

        if (visualSettings.esp && isEnemy) {
            if (!player.esp) {
                // const boxSize = { width: 0.4944, height: 0.6054, depth: 0.4944 };
                // const vertices = [
                //     new BABYLON.Vector3(-boxSize.width / 2, -boxSize.height / 2, -boxSize.depth / 2),
                //     new BABYLON.Vector3(boxSize.width / 2, -boxSize.height / 2, -boxSize.depth / 2),
                //     new BABYLON.Vector3(boxSize.width / 2, boxSize.height / 2, -boxSize.depth / 2),
                //     new BABYLON.Vector3(-boxSize.width / 2, boxSize.height / 2, -boxSize.depth / 2),
                //     new BABYLON.Vector3(-boxSize.width / 2, -boxSize.height / 2, boxSize.depth / 2),
                //     new BABYLON.Vector3(boxSize.width / 2, -boxSize.height / 2, boxSize.depth / 2),
                //     new BABYLON.Vector3(boxSize.width / 2, boxSize.height / 2, boxSize.depth / 2),
                //     new BABYLON.Vector3(-boxSize.width / 2, boxSize.height / 2, boxSize.depth / 2),
                // ];
                // const lines = [];
                // for (let i = 0; i < 4; i++) {
                //     lines.push([vertices[i], vertices[(i + 1) % 4]]);
                //     lines.push([vertices[i + 4], vertices[(i + 1) % 4 + 4]]);
                //     lines.push([vertices[i], vertices[i + 4]]);
                // };
                // const box = BABYLON.MeshBuilder.CreateLineSystem('', { lines }, myPlayer.scene);
                // box.renderingGroupId = 1;
                // box.parent = bodyMesh;
                // player.esp = box;
                const box = BABYLON.MeshBuilder.CreateBox('', { width: 0.4944, height: 0.6054, depth: 0.4944 }, myPlayer.scene);
                box.visibility = 1/100_000_000;
                box.enableEdgesRendering();
                // box.edgesWidth = 1;
                box.parent = bodyMesh;
                player.esp = box;
            }
            // const color = visualSettings.visibilityColoring && isVisible
            //     ? visualSettings.visibleColor: visualSettings.hiddenColor;
            // player.esp.color.set(color.r, color.g, color.b)
            // player.esp.alpha = color.a;
            player.esp.renderingGroupId = visibleCheckPassed ? 1 : 0;
            const color = visualSettings.visibilityColoring && isVisible
                ? visualSettings.visibleColor: visualSettings.hiddenColor;
            player.esp.edgesColor.set(color.r, color.g, color.b, color.a)
        } else if (player.esp) {
            player.esp.dispose();
            player.esp = undefined;
        }

        // bodyMesh.showBoundingBox = visualSettings.esp && isEnemy;
        // const boundingBoxRenderer = myPlayer.scene.getBoundingBoxRenderer();
        // const vis = visualSettings.visibleColor;
        // const hid = visualSettings.hiddenColor;
        // if (visualSettings.visibilityColoring) boundingBoxRenderer.frontColor.set(vis.r, vis.g, vis.b);
        // else boundingBoxRenderer.frontColor.set(hid.r, hid.g, hid.b);
        // boundingBoxRenderer.backColor.set(hid.r, hid.g, hid.b);
        // boundingBoxRenderer.showBackLines = !visualSettings.visibleCheckPassed;

        if (visualSettings.tracers && isEnemy && player[obf.playing] && visibleCheckPassed) {
            const targetPosition = bodyMesh.absolutePosition;
            const crosshairPosition = getCrosshairPosition(myPlayer);
            if (!player.tracer) {
                const line = BABYLON.MeshBuilder.CreateLines('', { points: [crosshairPosition, targetPosition], updatable: true }, myPlayer.scene);
                line.renderingGroupId = 1;
                player.tracer = line;
            }
            player.tracer.setVerticesData(BABYLON.VertexBuffer.PositionKind, [
                targetPosition.x, targetPosition.y, targetPosition.z,
                crosshairPosition.x, crosshairPosition.y, crosshairPosition.z
            ]);
            const color = visualSettings.visibilityColoring && isVisible
                ? visualSettings.visibleColor: visualSettings.hiddenColor;
            player.tracer.color.set(color.r, color.g, color.b)
            player.tracer.alpha = color.a;
        } else if (player.tracer) {
            player.tracer.dispose();
            player.tracer = undefined;
        }
    }

    if ((visualSettings.drawSpread || visualSettings.drawAimbotFov) && getCamera() && myPlayer[obf.playing]) {
        const myPlayerDirection = getPlayerDirection(myPlayer);
        const spreadScreenPosition = worldToScreenPosition(
            getCrosshairPosition(myPlayer).add(
                predictSpread(myPlayerDirection)
                .subtract(myPlayerDirection)
            )
        );
        if (visualSettings.drawSpread) {
            spreadIndicator.style.display = '';
            const c = visualSettings.drawSpreadColor;
            spreadIndicator.style.backgroundColor = `rgba(${c.r * 255}, ${c.g * 255}, ${c.b * 255}, ${c.a * 255})`;
            spreadIndicator.style.height = (innerHeight / 173.2) * (1.25 / getCamera().fov) ** 1.125 + 'px';
            spreadIndicator.style.width = spreadIndicator.style.height;
            spreadIndicator.style.top = spreadScreenPosition.y + 'px';
            spreadIndicator.style.left = spreadScreenPosition.x + 'px';
        }
        if (visualSettings.drawAimbotFov) {
            fovCircle.style.display = '';
            const c = visualSettings.drawAimbotFovColor;
            fovCircle.style.borderColor = `rgba(${c.r * 255}, ${c.g * 255}, ${c.b * 255}, ${c.a * 255})`;
            fovCircle.style.height = aimbotSettings.fov * (innerHeight / 42.5) * (1.25 / getCamera().fov) ** 1.125 + 'px';
            fovCircle.style.width = fovCircle.style.height;
            fovCircle.style.top = (aimbotSettings.spreadFov ? spreadScreenPosition.y: innerHeight / 2) + 'px';
            fovCircle.style.left = (aimbotSettings.spreadFov ? spreadScreenPosition.x: innerWidth / 2) + 'px';
        }
    } else {
        spreadIndicator.style.display = 'none';
        fovCircle.style.display = 'none';
    }
}

const smartReloadMinAmmo = {
    eggk47: 1,
    dozenGauge: 0,
    csg1: 1,
    rpegg: 0,
    smg: 1,
    m24: 0,
    aug: 3,
    cluck9mm: 1
};

const rof = {
    eggk47: 2,
    dozenGauge: 8,
    csg1: 11,
    rpegg: 40,
    smg: 1,
    m24: 12,
    aug: 12,
    cluck9mm: 3
};

const onUpdate = function () {
    if (!myPlayer) return;

    const aimbotSettings = hack.settings.aimbot;
    const miscSettings = hack.settings.misc;

    const controls = getControls();
    const autoScope = aimbotSettings.autoScope && !isKeyDown[controls.scope];

    if (aimbotSettings.enabled && performance.now() > lastFired + aimbotSettings.afterShotDelay) {
        const {rotation, distance, bulletToTargetFov} = getAimbotTarget();
        if (rotation) {
            if (aimbotSettings.autoFire
                && (aimbotSettings.onFire || bulletToTargetFov < fireFov / distance)
                && (!aimbotSettings.autoFireScopeOnly || (myPlayer.scope && myPlayer.scopeDelay == 0)))
                myPlayer.pullTrigger();
            if (autoScope) virtualKeyPress('keydown', controls.scope);
        } else if (autoScope) virtualKeyPress('keyup', controls.scope);
    } else if (autoScope) virtualKeyPress('keyup', controls.scope);

    if (aimbotSettings.triggerbot) triggerbot();

    if (miscSettings.upsideDown && !statesToSync[myPlayer.stateIdx]) {
        statesToSync[myPlayer.stateIdx] = { pitch: -Math.PI };
    }

    if (miscSettings.bunnyhop && isKeyDown[controls.jump]) virtualKeyPress('keydown', controls.jump)
    
    const weaponConstructor = myPlayer.weapon.constructor;
    if (miscSettings.automaticWeapons) {
        if (weaponConstructor.automaticOld == null) {
            weaponConstructor.automaticOld = weaponConstructor.automatic;
            weaponConstructor.automatic = true;
            weaponConstructor.rofOld = weaponConstructor.rof;
            weaponConstructor.rof = rof[weaponConstructor.standardMeshName];
        }
    } else if (weaponConstructor.automaticOld == false) {
        weaponConstructor.automaticOld = null;
        weaponConstructor.automatic = false;
        weaponConstructor.rof = weaponConstructor.rofOld;
    }
    
    if (miscSettings.autoReload) {
        const minAmmo = smartReloadMinAmmo[weaponConstructor.standardMeshName]
        if (myPlayer.weapon.ammo.rounds <= minAmmo) myPlayer.reload();
    }

    // for (const player of Object.values(players)) {
    //     if (!(player && player[obf.playing] && player != myPlayer)) continue;
    //     if (!(player.team == 0 || player.team != myPlayer.team)) continue;
    //     if (!(!aimbotSettings.visibleCheck || visibleCheck(player))) continue;
    //     if (aimbotSettings.ignore.includes(player.normalName)) continue;

    //     player.stateBuffer = player.stateBuffer || []
    //     player.stateBuffer[myPlayer.stateIdx] = player.stateBuffer[myPlayer.stateIdx] || {};

    //     const currentState = player.stateBuffer[myPlayer.stateIdx];

    //     currentState.position = {
    //         x: player[obf.x],
    //         y: player[obf.y],
    //         z: player[obf.z]
    //     };

    //     // let sphere;

    //     // const stateOld = player.stateBuffer[modOld(myPlayer.stateIdx - 15, 256)];
    //     // if (stateOld && stateOld.backtrack) {
    //     //     sphere = stateOld.backtrack;
    //     //     stateOld.backtrack = undefined;
    //     // } else if (currentState.backtrack) {
    //     //     sphere = currentState.backtrack
    //     // } else {
    //     //     sphere = BABYLON.MeshBuilder.CreateSphere('', { diameter: 0.05 }, myPlayer.scene);
    //     //     sphere.renderingGroupId = 2;
    //     //     sphere.renderOverlay = true;
    //     //     sphere.overlayAlpha = 1;
    //     // }

    //     // sphere.visibility = hack.settings.visuals.drawBacktrack;
    //     // sphere.setAbsolutePosition(new BABYLON.Vector3(0, 0.31, 0).add(currentState.position).add(YOffset));
    //     // currentState.backtrack = sphere;
    // }
}

const onFire = function () {
    currentAimTime /= 2;
    if (!myPlayer) return;

    const miscSettings = hack.settings.misc;

    let antiSpreadRotation = {};
    if (miscSettings.antiSpread) {
        const rotation = getRotationFromDirection(predictSpread(getPlayerDirection(myPlayer), true));
        rotation.yaw = setRadPrecision(rotation.yaw);
        rotation.pitch = setRadPrecision(rotation.pitch);
        if (miscSettings.antiSpreadSilent) {
            rotation.controlKeys = getSilentControlKeys(rotation.yaw);
        } else {
            myPlayer[obf.yaw] = rotation.yaw;
            myPlayer[obf.pitch] = rotation.pitch;
        }
        statesToSync[myPlayer.stateIdx] = rotation;
        antiSpreadRotation = rotation;
    }

    const aimbotSettings = hack.settings.aimbot;

    if (aimbotSettings.enabled && performance.now() > lastFired + aimbotSettings.afterShotDelay) {
        const {rotation, distance} = getAimbotTarget();
        if (rotation) {
            if (aimbotSettings.onFire) {
                if (aimbotSettings.silent) {
                    rotation.controlKeys = getSilentControlKeys(rotation.yaw);
                } else {
                    myPlayer[obf.yaw] = rotation.yaw;
                    myPlayer[obf.pitch] = rotation.pitch;
                }
    
                statesToSync[myPlayer.stateIdx] = rotation;
                for (let i = 1; i < 3; i++) {
                    const stateIdx = modOld(myPlayer.stateIdx - i, 256);
                    if (statesToSync[stateIdx]) break;
                    statesToSync[stateIdx] = rotation;
                }
            }
            // const deltaTime = distance / myPlayer.weapon.constructor.velocity;
            // if (aimbotSettings.backtrack && deltaTime < 5) { // 500ms max
            //     serverStateIdx = modOld(myPlayer.serverStateIdx - Math.floor(deltaTime * 3), 256);
            // }
        }
        if (aimbotSettings.disableAfterShot) aimbotSettings.enabled = false;
    }

    if (miscSettings.antiSpread) {
        for (let i = 1; i < 3; i++) {
            const stateIdx = modOld(myPlayer.stateIdx - i, 256);
            if (statesToSync[stateIdx]) break;
            statesToSync[stateIdx] = antiSpreadRotation;
        }
    }

    lastFired = performance.now();
}
