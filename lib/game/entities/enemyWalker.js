ig.module(
	'game.entities.enemyWalker'
)
.requires(
	'impact.entity',
	'game.entities.bounceable'

)
.defines(function(){

EntityEnemyWalker = EntityBounceable.extend({
    
		size: {x: 8, y: 8},
		maxVel: {x: 60, y: 1000},
		zIndex: 251,
		gravityFactor: 5,
		jump: 95,
		offsetJumpTimer: 0,
		scoreValue: 200,
	
		type: ig.Entity.TYPE.A, // Player friendly group
		checkAgainst: ig.Entity.TYPE.A,
		collides: ig.Entity.COLLIDES.NEVER,

		animSheet: new ig.AnimationSheet( 'media/player_sprite.png', 8, 8),
			
		init: function( x, y, settings ) {
			this.parent( x, y, settings );
			this.addAnim( 'idle', 0.2, [4] );
			this.jumpTimer = new ig.Timer(3000);
			var rand = Math.random();
			this.offsetJumpTimer = new ig.Timer(2*rand);
			this.vel.x = 15;
			this.direction = 'right';
			// Add the animations
		},

		setJumpTimer: function(){
			this.jumpTimer = new ig.Timer(3);
		},

		check: function(other){
			if(other === ig.game.player){
				ig.game.player.hurt(this);
			}
		},

		die: function(){
			ig.game.sfxKill.play();
			ig.game.spawnParticleExplosion(this.pos.x, this.pos.y);
			this.kill();
			ig.game.checkIfLastEnemy();
		},
    
		update: function() {
			// move!

			if(this.vel.x < 0.5 && this.direction === 'right'){
				this.vel.x = -15;
				this.direction = 'left';
			} else if(this.vel.x > -0.5 && this.direction === 'left'){
				this.vel.x = 15;
				this.direction = 'right';
			}
			
			if(!this.standing){
				this.standingLastFrame = false;
			} else {
				this.standingLastFrame = true;
			}
			this.parent();

			if(this.standing && !this.standingLastFrame){
				this.squash(0.3, 0.3);
				this.dip(-2, 0.3);
			}
		},

		draw: function(){
			this.parent();
		}
	});
});
