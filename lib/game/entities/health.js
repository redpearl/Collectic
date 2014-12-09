ig.module(
	'game.entities.health'
)
.requires(
	'impact.entity'

)
.defines(function(){

EntityHealth = ig.Entity.extend({
    
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
			// Add the animations
		},

		die: function(){
			this.killTimer = new ig.Timer(1.5);
			this.dead = true;
			this.vel.y = 15;
			if(Math.random()>0.5){
				this.vel.x = Math.random()*-4;
			} else {
				this.vel.x = Math.random()*+4;
			}
		},
    
		update: function() {
			if(this.dead){
				this.currentAnim.angle += 0.05;
			}
			if(this.killTimer && this.killTimer.delta()>0){
				TweenMax.to(this.currentAnim, 0.5, {alpha: 0, onComplete: this.kill.bind(this)});
			}
			// move!
			//this.currentAnim.update();
			this.parent();
		},

		draw: function(){
			this.parent();
		}
	});
});
