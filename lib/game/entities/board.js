ig.module(
	'game.entities.board'
)
.requires(
	'impact.entity'

)
.defines(function(){

EntityBoard = ig.Entity.extend({
    
		size: {x: 4, y: 4},
		zIndex: 251,
		gravityFactor: 0,
		alpha: 1,
	
		type: ig.Entity.TYPE.NONE, // Player friendly group
		checkAgainst: ig.Entity.TYPE.NONE,
		collides: ig.Entity.COLLIDES.NEVER,

		//animSheet: new ig.AnimationSheet( 'media/payload.png', 4, 4),
			
		init: function( x, y, settings ) {
			this.parent( x, y, settings );
			this.vel.y = -3;
			this.killTimer = new ig.Timer(1);
			//this.addAnim( 'idle', 0.2, [0] );
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
			this.parent();
			//this.parent();
		},

		draw: function(){
			this.parent();
			ig.game.font.alpha = this.killTimer.delta()*-1;
			if(this.killTimer.delta()>0){
				ig.game.font.alpha = 0;
				this.kill();
			}
			ig.game.font.draw( this.text, this.pos.x, this.pos.y, ig.Font.ALIGN.CENTER );
			ig.game.font.alpha = 1;
		}
	});
});
