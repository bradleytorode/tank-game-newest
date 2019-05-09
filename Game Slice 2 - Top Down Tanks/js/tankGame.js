
// config
var config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 1280,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: {
                y: 0
            } // Top down game, so no gravity
        }
    },

    pixelArt: true,

    scene: {
        preload: preload,
        create: create,
        update: update
    },
    callbacks: {
        postBoot: function () {
            resize();
        }
    }
};

var game = new Phaser.Game(config);
var player, enemyTanks = [], maxEnemies = 10, enemyBullets, explosions;

function preload() {
    this.load.atlas('tank', 'assets/tanks/tanks.png', 'assets/tanks/tanks.json');
    this.load.atlas('enemy', 'assets/tanks/enemy-tanks.png', 'assets/tanks/tanks.json');
    this.load.atlas('enemyDuel', 'assets/tanks/enemy-tanks-duel-turrets.png', 'assets/tanks/tanks.json');
    this.load.atlas('enemySuicider', 'assets/tanks/enemy-tanks-suicide.png', 'assets/tanks/tanks.json');
    this.load.atlas('enemyMachinegun', 'assets/tanks/enemy-tanks-machinegun.png', 'assets/tanks/tanks.json');
    this.load.image('earth', 'assets/tanks/scorched_earth.png');
    this.load.spritesheet('explosion', 'assets/tanks/explosion.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('bullet', 'assets/tanks/bullet.png');
    this.load.image('landscape-tileset', 'assets/landscape-tileset.png');
    this.load.tilemapTiledJSON('level1', 'assets/level1.json');
}

function create() {

    window.addEventListener('resize', resize, false)
    
    this.physics.world.on('worldbounds', function (body) {
        killBullet(body.gameObject)
    }, this);

    this.map = this.make.tilemap({ key: 'level1' });
    var landscape = this.map.addTilesetImage('landscape', 'landscape-tileset');

    //createStaticLayer = name, name of tileset so var landscape and origin points
    this.map.createStaticLayer('ground', landscape, 0, 0);

    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    var destructLayer = this.map.createDynamicLayer('destructibles', landscape, 0, 0);
    destructLayer.setCollisionByProperty({ collides: true });

    player = new PlayerTank(this, this.game.config.height * 0.5, this.game.config.width * 0.5, 'tank', 'tank1');
    player.enableCollision(destructLayer);
    this.input.on('pointerdown', tryShoot, this);
    this.cameras.main.startFollow(player.hull, true, 0.5, 0.5);
    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 1,

    });
    

    //console.log('bullets.children.length ' + bullets.children.length)
    var outerFrame = new Phaser.Geom.Rectangle(0, 0, game.config.width, game.config.height);
    var innerFrame = new Phaser.Geom.Rectangle(game.config.width * 0.25, game.config.height * 0.25, game.config.width * 0.5, game.config.height * 0.5)
    var enemyTank, loc;

    enemyBullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: maxEnemies,

    });

    explosions = this.physics.add.group({
        defaultKey: 'explosion',
        maxSize: maxEnemies
    })

    this.anims.create({
        key: 'explode',
        frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 23, first: 23 }),
        frameRate: 24
    }
    )



    for (var i = 0; i < maxEnemies; i++) {
        loc = Phaser.Geom.Rectangle.RandomOutside(outerFrame, innerFrame)
        var rand = Math.floor(Math.random() * 3)
        
        switch (rand) {
            case 0:
                enemyTank = new EnemyTank(this, loc.x, loc.y, 'enemy', 'tank1', player);
                break;
            case 1:
                enemyTank = new EnemyTankDuelTurret(this, loc.x, loc.y, 'enemyDuel', 'tank1', player);
                break;
            case 2:
                enemyTank = new EnemyTankMachinegun(this, loc.x, loc.y, 'enemyMachinegun', 'tank1', player);
                break;               
                
        }
        
        enemyTank.enableCollision(destructLayer);
        enemyTank.setBullets(enemyBullets)
        enemyTanks.push(enemyTank);
        this.physics.add.collider(enemyTank.hull, player.hull);
        if (i > 0) {
            for (var j = 0; j < enemyTanks.length - 1; j++) {
                this.physics.add.collider(enemyTank.hull, enemyTanks[j].hull);
            }
        }
    }
}



function update(time, delta) {
    player.update();
    for (var i = 0; i < enemyTanks.length; i++) {
        enemyTanks[i].update(time, delta);
    }

}

function tryShoot(pointer) {
    //console.log('try shoot');
    var bullet = bullets.get(player.turret.x, player.turret.y);
    if (bullet) {
        fireBullet.call(this, bullet, player.turret.rotation, enemyTanks);
    }
}

function fireBullet(bullet, rotation, target) {
    bullets.setDepth(3);
    //console.log('fire bullet');
    bullet.body.collideWorldBounds = true;
    bullet.body.onWorldBounds = true;
    bullet.enableBody(false);
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.rotation = rotation;

    var destructLayer = this.map.getLayer('destructibles').tilemapLayer;
    this.physics.add.collider(bullet, destructLayer, damageWall, null, this);

    this.physics.velocityFromRotation(bullet.rotation, 500, bullet.body.velocity);
    if (target === player) {
        this.physics.add.overlap(player.hull, bullet, bulletHitPlayer, null, this)
    } else {
        for (var i = 0; i < enemyTanks.length; i++) {
            this.physics.add.overlap(enemyTanks[i].hull, bullet, bulletHitEnemy, null, this)
        }
    }
}

function bulletHitPlayer(hull, bullet) {
    killBullet(bullet);
    player.damage();
    if (player.isDestroyed()) {
        this.input.enabled = false;
        enemyTanks = []
        this.physics.pause();
        var explosion = explosions.get(hull.x, hull.y);
        if (explosion) {
            activateExplosion(explosion);
            explosion.play('explode');
        }
    }
}

function killBullet(bullet) {
    bullet.disableBody(true, true);
    bullet.setActive(false);
    bullet.setVisible(false);
}

function activateExplosion(explosion) {
    explosion.setDepth(5);
    explosion.setActive(true);
    explosion.setVisible(true)
}

function bulletHitEnemy(hull, bullet) {
    var enemy;
    var index;
    for (var i = 0; i < enemyTanks.length; i++) {
        if (enemyTanks[i].hull === hull) {
            enemy = enemyTanks[i];
            index = i;
            break;
        }
    }
    killBullet(bullet);
    enemy.damage();
    var explosion = explosions.get(hull.x, hull.y);
    if (explosion) {
        activateExplosion(explosion);
        explosion.on('animationcomplete', animComplete, this)
        explosion.play('explode');
    }
    if (enemy.isDestroyed()) {
        //remove from enemy tanks list
        enemyTanks.splice(index, 1);
    }
}

function animComplete(animation, frame, gameObject) {
    gameObject.disableBody(true, true);
}

function damageWall(bullet, tile) {
    var destructLayer = this.map.getLayer('destructibles').tilemapLayer;
    killBullet(bullet);

    var index = tile.index + 1;
    var tileProperties = destructLayer.tileset[0].tileProperties[tile.index];

    var checkCollision = false;

    if (tileProperties) {
        if (tileProperties.collides) {
            checkCollision = true;
        }
    }

    const newTile = destructLayer.putTileAt(index, tile.x, tile.y);

    if (checkCollision) {
        newTile.setCollision(true);
    }

}

function resize() {
    var canvas = document.querySelector("canvas");
    var windowWidth = window.innerWidth;
    var windowHeight = window.innerHeight;
    var windowRatio = windowWidth / windowHeight;
    var gameRatio = game.config.width / game.config.height;
    if (windowRatio < gameRatio) {
        canvas.style.width = windowWidth + "px";
        canvas.style.height = (windowWidth / gameRatio) + "px";
    } else {
        canvas.style.width = (windowHeight * gameRatio) + "px";
        canvas.style.height = windowHeight + "px";
    }
}
