ig.module(
	'game.entities.coin'
)
.requires(
	'impact.entity'

)
.defines(function(){

EntityCoin = ig.Entity.extend({
    
		size: {x: 4, y: 4},
		zIndex: 251,
		gravityFactor: 0,
	
		type: ig.Entity.TYPE.A, // Player friendly group
		checkAgainst: ig.Entity.TYPE.A,
		collides: ig.Entity.COLLIDES.NEVER,

		animSheet: new ig.AnimationSheet( 'media/payload.png', 4, 4),
			
		init: function( x, y, settings ) {
			this.parent( x, y, settings );
			this.addAnim( 'idle', 0.2, [0] );
			// Add the animations
		},

		check: function(other){
			if(other === ig.game.player){
				ig.game.spawnParticleExplosion(this.pos.x, this.pos.y);
				this.kill();
				ig.game.player.pickupCoin();
			}
		},
    
		update: function() {
			// move!
			this.currentAnim.update();
			//this.parent();
		},

		draw: function(){
			this.parent();
		}
	});
});
