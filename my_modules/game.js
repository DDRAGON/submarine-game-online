const gameObj = {
    playersMap: new Map(),
    itemsMap: new Map(),
    airMap: new Map(),
    AIMap: new Map(),
    flyingMissilesMap: new Map(),
    missileAliveFlame: 180,
    missileSpeed: 3,
    missileWidth: 30,
    missileHeight: 30,
    fieldWidth: 900,
    fieldHeight: 900,
    addingAiPlayerNum: 10,
    itemTotal: 20,
    airTotal:30,
    itemPoint: 3,
    killPoint: 500
};

init(); // 初期化（初期化はサーバー起動時に行う）

function init() {
    for (let i = 0; i < gameObj.itemTotal; i++) {
        addItem();
    }
    for (let a = 0; a < gameObj.airTotal; a++) {
        addAir();
    }
}

const gameTicker = setInterval(() => {
    movePlayers(gameObj.playersMap); // 潜水艦の移動
    AIMoveDecision(gameObj.AIMap); // AI の行動選択
    moveAIs(gameObj.AIMap); // AI の移動
    moveMissile(gameObj.flyingMissilesMap); // ミサイルの移動
    checkGetItem(gameObj.playersMap, gameObj.itemsMap, gameObj.airMap, gameObj.flyingMissilesMap);
    checkGetItem(gameObj.AIMap, gameObj.itemsMap, gameObj.airMap, gameObj.flyingMissilesMap);
    addAIs();
}, 33);

function movePlayers(playersMap) { // 潜水艦の移動
    for (let [key, value] of playersMap) {

        if (value.isAlive === false) {
            if (value.deadCount < 60) {
                value.deadCount += 1;
            } else {
               gameObj.playersMap.delete(key);
            }
            continue;
        }

        switch (value.direction) {
            case 'left':
                value.x -= 1;
                break;
            case 'up':
                value.y -= 1;
                break;
            case 'down':
                value.y += 1;
                break;
            case 'right':
                value.x += 1;
                break;
        }
        if (value.x > gameObj.fieldWidth) value.x -= gameObj.fieldWidth;
        if (value.x < 0) value.x += gameObj.fieldWidth;
        if (value.y < 0) value.y += gameObj.fieldHeight;
        if (value.y > gameObj.fieldHeight) value.y -= gameObj.fieldHeight;

        value.aliveTime.clock += 1;
        if (value.aliveTime.clock === 30) {
            value.aliveTime.clock = 0;
            value.aliveTime.seconds += 1;
            decreaseAir(value);
            value.score += 1;
        }
    }
}

function moveAIs(AIMap) {
   for (let [key, value] of AIMap) {

      if (value.isAlive === false) {
         if (value.deadCount < 60) {
            value.deadCount += 1;
         } else {
            gameObj.AIMap.delete(key);
         }
         continue;
      }

      switch (value.direction) {
         case 'left':
            value.x -= 1;
            break;
         case 'up':
            value.y -= 1;
            break;
         case 'down':
            value.y += 1;
            break;
         case 'right':
            value.x += 1;
            break;
      }
      if (value.x > gameObj.fieldWidth) value.x -= gameObj.fieldWidth;
      if (value.x < 0) value.x += gameObj.fieldWidth;
      if (value.y < 0) value.y += gameObj.fieldHeight;
      if (value.y > gameObj.fieldHeight) value.y -= gameObj.fieldHeight;

      value.aliveTime.clock += 1;
      if (value.aliveTime.clock === 30) {
         value.aliveTime.clock = 0;
         value.aliveTime.seconds += 1;
         decreaseAir(value);
         value.score += 1;
      }
   }
}


const directions = ['left', 'up', 'down', 'right'];
function AIMoveDecision(AIMap) {
    for (let [key, ai] of AIMap) {

        switch(ai.level) {
            case 1:
                if (Math.floor(Math.random() * 60) === 1) {
                    ai.direction = directions[Math.floor(Math.random() * directions.length)];
                }
                if (ai.missilesMany > 0 && Math.floor(Math.random() * 90) === 1) {
                    missileEmit(ai.id, ai.direction);
                }
                break;
            case 2:
            case 3:
        }
    }
}

function moveMissile(flyingMissilesMap) { // ミサイルの移動
    for (let [missileId, flyingMissile] of flyingMissilesMap) {
        const missile = flyingMissile;

        if (missile.aliveFlame === 0) {
            flyingMissilesMap.delete(missileId);
            continue;
        }

        flyingMissile.aliveFlame -= 1;

        switch (flyingMissile.direction) {
            case 'left':
                flyingMissile.x -= gameObj.missileSpeed;
                break;
            case 'up':
                flyingMissile.y -= gameObj.missileSpeed;
                break;
            case 'down':
                flyingMissile.y += gameObj.missileSpeed;
                break;
            case 'right':
                flyingMissile.x += gameObj.missileSpeed;
                break;
        }
    }
}

function decreaseAir(playerObj) {
    playerObj.airTime -= 1;
    if (playerObj.airTime === 0) {
        playerObj.isAlive = false;
        return;
    }
}

const submarineImageWidth = 42;
const itemRadius = 4;
const airRadius = 6;
const addAirTime = 30;
function checkGetItem(playersMap, itemsMap, airMap, flyingMissilesMap) {
    for (let [id, playerObj] of playersMap) {
        if (playerObj.isAlive === false) { return; }

        // アイテムのミサイル（赤丸）
        for (let [itemKey, itemObj] of itemsMap) {

            const distanceObj = calculationBetweenTwoPoints(
               playerObj.x, playerObj.y, itemObj.x, itemObj.y, gameObj.fieldWidth, gameObj.fieldHeight
            );

            if (
                distanceObj.distanceX <= (submarineImageWidth/2 + itemRadius) &&
                distanceObj.distanceY <= (submarineImageWidth/2 + itemRadius)
            ) { // got item!

                gameObj.itemsMap.delete(itemKey);
                playerObj.missilesMany = playerObj.missilesMany > 5 ? 6 : playerObj.missilesMany + 1;
                playerObj.score += gameObj.itemPoint;
                addItem();
            }
        }

        // アイテムの空気（青丸）
        for (let [airKey, airObj] of airMap) {

            const distanceObj = calculationBetweenTwoPoints(
               playerObj.x, playerObj.y, airObj.x, airObj.y, gameObj.fieldWidth, gameObj.fieldHeight
            );

            if (
                distanceObj.distanceX <= (submarineImageWidth/2 + airRadius) &&
                distanceObj.distanceY <= (submarineImageWidth/2 + airRadius)
            ) { // got air!

                gameObj.airMap.delete(airKey);
                if (playerObj.airTime + addAirTime > 99) {
                    playerObj.airTime = 99;
                } else {
                    playerObj.airTime += addAirTime;
                }
                playerObj.score += gameObj.itemPoint;
                addAir();
            }
        }

        // 撃ち放たれているミサイル
        for (let [missileId, flyingMissile] of flyingMissilesMap) {

            const distanceObj = calculationBetweenTwoPoints(
               playerObj.x, playerObj.y, flyingMissile.x, flyingMissile.y, gameObj.fieldWidth, gameObj.fieldHeight
            );

            if (
                distanceObj.distanceX <= (submarineImageWidth/2 + gameObj.missileWidth/2) &&
                distanceObj.distanceY <= (submarineImageWidth/2 + gameObj.missileHeight/2) &&
                id !== flyingMissile.emitPlayerId
            ) {
                playerObj.isAlive = false;
                flyingMissilesMap.delete(missileId);

                // 得点の更新
                if (gameObj.playersMap.has(flyingMissile.emitPlayerId)) {
                    const emitPlayer = gameObj.playersMap.get(flyingMissile.emitPlayerId);
                    emitPlayer.score += gameObj.killPoint;
                    gameObj.playersMap.set(flyingMissile.emitPlayerId, emitPlayer);
                } else if (gameObj.AIMap.has(flyingMissile.emitPlayerId)) {
                    const emitAI = gameObj.AIMap.get(flyingMissile.emitPlayerId);
                    emitAI.score += gameObj.killPoint;
                    gameObj.AIMap.set(flyingMissile.emitPlayerId, emitAI);
                }
            }
        }
    }
}

function addAIs() {
    if (gameObj.playersMap.size + gameObj.AIMap.size < gameObj.addingAiPlayerNum) {
        const addMany = gameObj.addingAiPlayerNum - gameObj.playersMap.size - gameObj.AIMap.size;

        for (let i = 0; i < addMany; i++) {

            const playerX = Math.floor(Math.random() * gameObj.fieldWidth);
            const playerY = Math.floor(Math.random() * gameObj.fieldHeight);
            const level   = Math.floor(Math.random() * 1) + 1;
            const id = Math.floor(Math.random() * 100000) + ',' + playerX + ',' + playerY + ',' + level;
            const playerObj = {
                x: playerX,
                y: playerY,
                isAlive: true,
                deadCount: 0,
                direction: 'right',
                missilesMany: 0,
                airTime: 99,
                aliveTime: {'clock': 0, 'seconds': 0},
                score: 0,
                level: level,
                id : id
            };
            gameObj.AIMap.set(id, playerObj);
        }
    }
}

function getMapData() {
    return {
        playersMap: Array.from(gameObj.playersMap),
        AIMap: Array.from(gameObj.AIMap),
        itemsMap: Array.from(gameObj.itemsMap),
        airMap: Array.from(gameObj.airMap),
        flyingMissilesMap: Array.from(gameObj.flyingMissilesMap)
    };
}

function newConnection(socketId) {
    const playerX = Math.floor(Math.random() * gameObj.fieldWidth);
    const playerY = Math.floor(Math.random() * gameObj.fieldHeight);
    const playerObj = {
        x: playerX,
        y: playerY,
        isAlive: true,
        deadCount: 0,
        direction: 'right',
        missilesMany: 0,
        airTime: 99,
        aliveTime: {'clock': 0, 'seconds': 0},
        score: 0,
        socketId: socketId
    };
    gameObj.playersMap.set(socketId, playerObj);

    const startObj = {
        playerObj: playerObj,
        fieldWidth: gameObj.fieldWidth,
        fieldHeight: gameObj.fieldHeight,
    };
    return startObj;
}

function updatePlayerDirection(socketId, direction) {
    const playerObj = gameObj.playersMap.get(socketId);
    playerObj.direction = direction;
    gameObj.playersMap.set(socketId, playerObj);
}

function missileEmit(id, direction) {
    let targetObj = null;

    if (gameObj.playersMap.has(id)) {
        targetObj = gameObj.playersMap.get(id);
    } else if (gameObj.AIMap.has(id)) {
        targetObj = gameObj.AIMap.get(id);
    } else {
        return; // 無いやん
    }

    if (targetObj.missilesMany <= 0) return; // 撃てないやん
    if (targetObj.isAlive === false) return; // 死んでるやんけ

    targetObj.missilesMany -= 1;
    const missileId = Math.floor(Math.random() * 100000) + ',' + id + ',' + targetObj.x + ',' + targetObj.y;

    const missileObj = {
        emitPlayerId: id,
        x: targetObj.x,
        y: targetObj.y,
        aliveFlame: gameObj.missileAliveFlame,
        direction: direction,
        id: missileId
    };
    gameObj.flyingMissilesMap.set(missileId, missileObj);
}

function disconnect(socketId) {
    gameObj.playersMap.delete(socketId);
}

function addItem() {
    const itemX = Math.floor(Math.random() * gameObj.fieldWidth);
    const itemY = Math.floor(Math.random() * gameObj.fieldHeight);
    const itemKey = `${itemX},${itemY}`;

    if (gameObj.itemsMap.has(itemKey)) { // アイテムの位置が被ってしまった場合は
        return addItem(); // 場所が重複した場合は作り直し
    }

    const itemObj = {
        x: itemX,
        y: itemY,
        isAlive: true
    };
    gameObj.itemsMap.set(itemKey, itemObj);
}

function addAir() {
    const airX = Math.floor(Math.random() * gameObj.fieldWidth);
    const airY = Math.floor(Math.random() * gameObj.fieldHeight);
    const airKey = `${airX},${airY}`;

    if (gameObj.airMap.has(airKey)) { // アイテムの位置が被ってしまった場合は
        return addAir(); // 場所が重複した場合は作り直し
    }

    const airObj = {
        x: airX,
        y: airY,
        isAlive: true
    };
    gameObj.airMap.set(airKey, airObj);
}

function calculationBetweenTwoPoints(pX, pY, oX, oY, gameWidth, gameHeight) {
   let distanceX = 99999999;
   let distanceY = 99999999;

   if (pX <= oX) {
      // 右から
      distanceX = oX - pX;
      // 左から
      let tmpDistance = pX + gameWidth - oX;
      if (distanceX > tmpDistance) {
         distanceX = tmpDistance;
      }

   } else {
      // 右から
      distanceX = pX - oX;
      // 左から
      let tmpDistance = oX + gameWidth - pX;
      if (distanceX > tmpDistance) {
         distanceX = tmpDistance;
      }
   }

   if (pY <= oY) {
      // 下から
      distanceY = oY - pY;
      // 上から
      let tmpDistance = pY + gameHeight - oY;
      if (distanceY > tmpDistance) {
         distanceY = tmpDistance;
      }

   } else {
      // 上から
      distanceY = pY - oY;
      // 下から
      let tmpDistance = oY + gameHeight - pY;
      if (distanceY > tmpDistance) {
         distanceY = tmpDistance;
      }
   }

   return {
      distanceX,
      distanceY
   };
}


module.exports = {
    newConnection,
    getMapData,
    updatePlayerDirection,
    missileEmit,
    disconnect
};