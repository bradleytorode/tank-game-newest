class BaseTank {
    constructor(scene, x, y, texture, frame) {
        this.scene = scene;
        this.shadow = scene.physics.add.sprite(x, y, texture, 'shadow');
        this.shadow.setDepth(1);
        this.hull = scene.physics.add.sprite(x, y, texture, frame);
        this.hull.body.setSize(this.hull.width - 8, this.hull.height - 8)
        this.hull.body.collideWorldBounds = true;
        this.hull.body.bounce.setTo(1, 1);
        this.hull.setDepth(2);
        this.turret = scene.physics.add.sprite(x, y, texture, 'turret');
        this.turret.setDepth(4);
        this.damageCount = 0;
        this.damageMax = 2;

    }
    update() {
        this.shadow.x = this.turret.x = this.hull.x;
        this.shadow.y = this.turret.y = this.hull.y;
        this.shadow.rotation = this.hull.rotation;
    }
    setBullets(bullets) {
        this.bullets = bullets;
    }
    burn() {
        this.turret.setVisible(false);
        this.hull.setVelocity(0);
        this.hull.body.immovable = true;
    }
    isDestroyed() {
        if (this.damageCount >= this.damageMax) {
            return true;
        }
    }
    enableCollision(destructLayer) {
        this.scene.physics.add.collider(this.hull, destructLayer);
    }
}

class PlayerTank extends BaseTank {
    constructor(scene, x, y, texture, frame) {
        super(scene, x, y, texture, frame)
        this.currentSpeed = 0;
        this.keys = scene.input.keyboard.addKeys(
            {
                left: Phaser.Input.Keyboard.KeyCodes.LEFT,
                right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
                up: Phaser.Input.Keyboard.KeyCodes.UP,
                down: Phaser.Input.Keyboard.KeyCodes.DOWN,
                w: Phaser.Input.Keyboard.KeyCodes.W,
                a: Phaser.Input.Keyboard.KeyCodes.A,
                s: Phaser.Input.Keyboard.KeyCodes.S,
                d: Phaser.Input.Keyboard.KeyCodes.D
            }
        );
        this.damageMax = 10;
    }
    update() {
        super.update();
        if (this.keys.up.isDown || this.keys.w.isDown) {
            if (this.currentSpeed < 100) {
                this.currentSpeed += 10;
            }
        } else if (this.keys.down.isDown || this.keys.s.isDown) {
            if (this.currentSpeed > -100) {
                this.currentSpeed -= 10;
            }
        } else {
            this.currentSpeed *= 0.9;
        }
        if (this.keys.left.isDown || this.keys.a.isDown) {
            if (this.currentSpeed > 0) {
                this.hull.angle--
            } else {
                this.hull.angle++
            }
        } else if (this.keys.right.isDown || this.keys.d.isDown) {
            if (this.currentSpeed > 0) {
                this.hull.angle++
            } else {
                this.hull.angle--
            }
        }
        this.scene.physics.velocityFromRotation(this.hull.rotation, this.currentSpeed, this.hull.body.velocity);
        const worldPoint = this.scene.input.activePointer.positionToCamera(this.scene.cameras.main);
        this.turret.rotation = Phaser.Math.Angle.Between(this.turret.x, this.turret.y, worldPoint.x, worldPoint.y);
    }
    damage() {
        this.scene.cameras.main.shake(200, 0.005)
        this.damageCount++
        if (this.damageCount >= this.damageMax) {
            this.burn();
        }
    }
}

class EnemyTank extends BaseTank {
    constructor(scene, x, y, texture, frame, player) {
        super(scene, x, y, texture, frame);
        this.player = player;
        this.hull.angle = Phaser.Math.RND.angle();
        this.scene.physics.velocityFromRotation(this.hull.rotation, 100, this.hull.body.velocity);
        this.fireTime = 0;
        this.delay = 2000;
        this.range = 300;

    }
    update(time, delta) {
        super.update();
        this.turret.rotation = Phaser.Math.Angle.Between(this.hull.x, this.hull.y, this.player.hull.x, this.player.hull.y);
        this.shadow.rotation = this.hull.rotation = Math.atan2(this.hull.body.velocity.y, this.hull.body.velocity.x);        
        if (Phaser.Math.Distance.Between(this.hull.x, this.hull.y, this.player.hull.x, this.player.hull.y) < this.range && this.fireTime == 0) {
            //within range
            console.log(time)
            this.fireTime = time;
            var bullet = this.bullets.get(this.turret.x, this.turret.y);
            if (bullet) {
                fireBullet.call(this.scene, bullet, this.turret.rotation, this.player);
            }
        }
        //console.log(this.fireTime)
        if (this.fireTime > 0) {
            if (time > this.fireTime + this.delay) {
                this.fireTime = 0;
                console.log("reset Firetime")
            }

        }
    }
    damage() {
        this.damageCount++;
        if (this.damageCount >= this.damageMax) {
            //destroy
            this.turret.destroy();
            this.hull.destroy();
        } else if (this.damageCount == this.damageMax - 1) {
            //disable/ visual damage
            this.burn();
        }
    }
}


class EnemyTankDuelTurret extends EnemyTank {
    constructor(scene, x, y, texture, frame, player) {
        super(scene, x, y, texture, frame);
        this.player = player;
        this.hull.angle = Phaser.Math.RND.angle();
        this.scene.physics.velocityFromRotation(this.hull.rotation, 100, this.hull.body.velocity);
        this.fireTime = 0;
        this.delay = 4000;
        this.range = 700;
        console.log(this.range);
    }
    update(time, delta) {
        super.update(time, delta);        
    }
    damage() {
        super.damage();
    }
}

/*
class EnemyTankSuicider extends EnemyTank {
    constructor(scene, x, y, texture, frame, player) {
        super(scene, x, y, texture, frame);
        this.player = player;
        this.hull.angle = Phaser.Math.RND.angle();
        this.scene.physics.velocityFromRotation(this.hull.rotation, 100, this.hull.body.velocity);
        this.turret = scene.physics.add.sprite(x, y, texture, 'turret');
        this.delay = 0;
        this.range = 0;
        this.bullets = 4;
    }
    update(time, delta) {
        super.update(time, delta);
    }
    damage() {
        super.damage();
    }
}
*/

class EnemyTankMachinegun extends EnemyTank {
    constructor(scene, x, y, texture, frame, player) {
        super(scene, x, y, texture, frame);
        this.player = player;
        this.hull.angle = Phaser.Math.RND.angle();
        this.scene.physics.velocityFromRotation(this.hull.rotation, 100, this.hull.body.velocity);
        this.fireTime = 0;
        this.delay = 4000;
        this.range = 200;
    }
    update(time, delta) {
        super.update(time, delta);
    }
    damage() {
        super.damage();
    }
}


