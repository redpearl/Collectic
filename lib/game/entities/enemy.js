ig.module(
	'game.entities.enemy'
)
.requires(
	'impact.entity',
	'game.entities.bounceable'

)
.defines(function(){

EntityEnemy = EntityBounceable.extend({
    
		size: {x: 4, y: 4},
		maxVel: {x: 60, y: 1000},
		zIndex: 251,
		gravityFactor: 5,
		jump: 95,
		offsetJumpTimer: 0,
		scoreValue: 100,
	
		type: ig.Entity.TYPE.A, // Player friendly group
		checkAgainst: ig.Entity.TYPE.A,
		collides: ig.Entity.COLLIDES.NEVER,

		animSheet: new ig.AnimationSheet( 'media/enemy.png', 4, 4),
			
		init: function( x, y, settings ) {
			this.parent( x, y, settings );
			this.addAnim( 'idle', 0.2, [0] );
			this.jumpTimer = new ig.Timer(3000);
			var rand = Math.random();
			this.offsetJumpTimer = new ig.Timer(2*rand);
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
			
		},
    
		update: function() {
			// move!
			if(this.offsetJumpTimer && this.offsetJumpTimer.delta()>0){
				this.setJumpTimer();
				this.offsetJumpTimer = undefined;
			}
			if(!this.standing){
				this.standingLastFrame = false;
			} else {
				this.standingLastFrame = true;
			}
			this.parent();
			if(this.jumpTimer.delta()>0){
				ig.game.sfxEjump.play();
				this.jumpTimer.reset();
				this.stretch(0.3, 0.3);
				this.vel.y = -this.jump;
				this.preparing = false;
			} else if (this.jumpTimer.delta()>-0.35 && !this.preparing){
				this.squash(0.6, 0.8);
				this.dip(-2, 0.3);
				this.preparing = true;
			}
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
