ig.module(
	'game.entities.player'
)
.requires(
	'impact.entity',
	'game.entities.bounceable',
	'game.entities.board'

)
.defines(function(){

EntityPlayer = EntityBounceable.extend({
    
		//sfxJump: new ig.Sound('media/FX/Jump_04.*'),
		
		size: {x: 8, y: 8},
		maxVel: {x: 60, y: 1000},
		offset: {x: 0, y: 0},
		friction: {x: 260, y: 0},
		zIndex: 100,
		gravityFactor: 10,
		active: true,
		superPowerDuration: 22,
		streak: 0,
		score: 0,
		stopped: false,
	
		type: ig.Entity.TYPE.A, // Player friendly group
		checkAgainst: ig.Entity.TYPE.NONE,
		collides: ig.Entity.COLLIDES.PASSIVE,
		
		animSheet: new ig.AnimationSheet( 'media/player_sprite.png', 8, 8 ),
			
		flip: false,
		accelGround: 160,
		accelAir: 200,
		jump: 130,
			
		init: function( x, y, settings ) {
			this.parent( x, y, settings );
	
			// Add the animations
			this.addAnim( 'idle', 0.2, [0] );
			this.addAnim( 'hurt', 0.2, [1] );
			this.addAnim( 'super', 0.2, [2] );
			this.addAnim( 'superover', 0.2, [2,0] );
			/*
			this.addAnim( 'walk', 0.1, [1,2,3] );
			this.addAnim( 'jump', 1, [3] );
			this.addAnim( 'fall', 1, [2] );*/
			this.hurtTimer = new ig.Timer(0);
			this.superPowerTimer = new ig.Timer(0);
			this.superParticleTimer = new ig.Timer(0.1);
		},

		draw: function(){
			this.currentAnim.scaleY = this.spritescaley;
			this.currentAnim.scaleX = this.spritescalex;
			this.parent();
		},

		hurt: function(enemy){
			if(this.superPowerTimer.delta()<0){
				this.streak++;
				this.score += enemy.scoreValue * this.streak;
				ig.game.spawnEntity(EntityBoard, enemy.pos.x, enemy.pos.y, {text: enemy.scoreValue * this.streak});
				enemy.die();
			} else if(this.hurtTimer.delta()>0){
				this.hurtTimer = new ig.Timer(2);
				ig.game.sfxHurt.play();
				this.loseHealth();
			}
		},

		win: function(){
			this.winner = true;
		},

		loseHealth: function(){
			ig.game.healthBar[ig.game.healthBar.length-1].die();
			ig.game.healthBar.erase(ig.game.healthBar[ig.game.healthBar.length-1]);
			ig.game.cameraShakeTimer = new ig.Timer(0.5);
			if(ig.game.healthBar.length === 0){
				this.die();
			}

		},

		die: function(){
			this.dead = true;
			this.deadTimer = new ig.Timer(1);
			ig.game.cameraShakeTimer = new ig.Timer(3);
		},

		gainSuperPower: function(){
			this.superPowerTimer = new ig.Timer(this.superPowerDuration);
			ig.music.play('super');
			this.isPlayingSuper = true;
			this.streak = 0;
		},

		loseSuperPower: function(){
			ig.music.play('main');
			ig.game.loadAllCoins();
			ig.game.checkIfLastEnemy();
		},

		pickupCoin: function(){
			this.score += 10;
			ig.game.spawnEntity(EntityBoard, this.pos.x, this.pos.y, {text: 10});
			ig.game.sfxCoin.play();
			var coins = ig.game.getEntitiesByType(EntityCoin);
			var last = true;
			coins.forEach(function(coin){
				if(!coin._killed){
					last = false;
				}
			})
			if(last === true){
				this.gainSuperPower();
			}
		},
    
		update: function() {
			
			var accel =this.accelGround ;
			//var accel = this.standing ? this.accelGround : this.accelAir;
			if(this.dead){
				this.currentAnim.alpha = this.deadTimer.delta()*-1;
				if(this.deadTimer.delta()>0){
					this.currentAnim.alpha = 0;
					this.kill();
				}
			}
			//Left
			if( ig.input.state('left') && !this.dead && !this.winner && !this.stopped) {
					this.goingLeft = true;
					this.goingRight = false;
					//Moving left
					if (this.vel.x > 0){
							this.accel.x = -(accel*4);
					} else {
							this.accel.x = -accel;
					}
					this.flip = true;
			} else if ( ig.input.state('right') && !this.dead && !this.winner && !this.stopped){
					this.goingRight = true;
					this.goingLeft = false;
					//Moving right
					if (this.vel.x < 0){
							this.accel.x = accel*4
					} else {
							this.accel.x = accel;
					}
					this.flip = false;
			} else {
					this.goingRight = false;
					this.goingLeft = false;
					this.accel.x = 0;
			}
									

			if( this.standing && ig.input.pressed('jump') && !this.dead && !this.winner && !this.stopped){
					//Jumping
					this.stretch(0.3, 0.3);
					this.vel.y = -this.jump;
					ig.game.sfxJump.play();
			}
					
			if ((this.vel.x > 0 && this.standing )|| (this.vel.x < 0 && this.standing)){
					//Walking or swimming or whatever
					this.currentAnim = this.anims.walk;
			} else if (!this.standing && this.vel.y > 0){
					//Falling
					this.currentAnim = this.anims.fall;
			} else if (!this.standing){
					//Jumping
					this.currentAnim = this.anims.jump;
			}
			else {
					//Idle
					this.currentAnim = this.anims.idle;
			}

			if(this.superPowerTimer.delta()>0 && this.isPlayingSuper){
				this.loseSuperPower();
				this.isPlayingSuper = false;
			}
			
			if(this.superPowerTimer.delta()<0){
				if(this.superPowerTimer.delta()<-3){
					this.currentAnim = this.anims.super;
				} else {
					this.currentAnim = this.anims.superover;
				}
				if(this.superParticleTimer.delta()>0){
					ig.game.spawnSuperParticle(this.pos.x, this.pos.y);
					this.superParticleTimer.reset();
				}
			} else if(this.hurtTimer.delta()>0){
				this.currentAnim = this.anims.idle;
			} else {
				this.currentAnim = this.anims.hurt;
			}
			
			this.currentAnim.flip.x = this.flip;

			
			if(!this.standing){
				this.standingLastFrame = false;
			} else {
				this.standingLastFrame = true;
			}
			
			// move!
			this.parent();

			if(this.standing && !this.standingLastFrame){
				this.squash(0.3, 0.3);
				this.dip(-2, 0.3);
			}
		}
	});
});
