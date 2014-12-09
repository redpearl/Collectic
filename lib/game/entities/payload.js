ig.module(
	'game.entities.payload'
)
.requires(
	'impact.entity'

)
.defines(function(){

EntityPayload = ig.Entity.extend({
    
		size: {x: 4, y: 4},
		zIndex: 251,
		gravityFactor: 0,
	
		type: ig.Entity.TYPE.NONE, // Player friendly group
		checkAgainst: ig.Entity.TYPE.NONE,
		collides: ig.Entity.COLLIDES.NEVER,

		animSheet: new ig.AnimationSheet( 'media/payload.png', 4, 4),
			
		init: function( x, y, settings ) {
			this.parent( x, y, settings );
			this.addAnim( 'idle', 0.2, [0] );
			this.addAnim( 'hurt', 0.2, [1] );
			this.addAnim( 'super', 0.2, [2] );
			this.addAnim( 'superover', 0.2, [2,0] );
			this.particleTimer = new ig.Timer(0.1);
			ig.game.spawnParticleExplosion(this.pos.x, this.pos.y);
			// Add the animations
		},
    
		update: function() {
			// move!
			if(ig.game.player.currentAnim === ig.game.player.anims.idle){
				this.currentAnim = this.anims.idle;
			} else if(ig.game.player.currentAnim === ig.game.player.anims.super){
				this.currentAnim = this.anims.super;
			} else if(ig.game.player.currentAnim === ig.game.player.anims.hurt){
				this.currentAnim = this.anims.hurt;
			} else if(ig.game.player.currentAnim === ig.game.player.anims.superover){
				this.currentAnim = this.anims.superover;
			}
			this.currentAnim.update();
			if(this.particleTimer.delta()>0){
				ig.game.spawnParticleExplosion(this.pos.x, this.pos.y);
				this.particleTimer.reset();
			}
			//this.parent();
		},

		draw: function(){
			this.parent();
		}
	});
});
