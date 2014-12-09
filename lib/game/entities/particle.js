ig.module(
	'game.entities.particle'
)
.requires(
	'impact.entity'

)
.defines(function(){

EntityParticle = ig.Entity.extend({
    
		size: {x: 4, y: 4},
		zIndex: 351,
		gravityFactor: 0,
		speed: 25,
	
		type: ig.Entity.TYPE.NONE, // Player friendly group
		checkAgainst: ig.Entity.TYPE.NONE,
		collides: ig.Entity.COLLIDES.NEVER,

		animSheet: new ig.AnimationSheet( 'media/particles.png', 4, 4),
		animSheet2: new ig.AnimationSheet( 'media/superparticles.png', 4, 4),
			
		init: function( x, y, settings ) {
			this.parent( x, y, settings );
			if(this.super){
				this.animSheet = this.animSheet2;
			}
			var rand = Math.random();
			if(rand > 0.75){
				this.addAnim( 'idle', 0.2, [0] );	
			} else if(rand > 0.5){
				this.addAnim( 'idle', 0.2, [1] );	
			} else if(rand > 0.25){
				this.addAnim( 'idle', 0.2, [2] );	
			} else {
				this.addAnim( 'idle', 0.2, [3] );	
			}
			this.killTimer = new ig.Timer(1.5*Math.random());
			
			this.vel.x = Math.random() * this.xModifier * this.speed;
			this.vel.y = Math.random() * this.yModifier * this.speed;
			// Add the animations
		},
    
		update: function() {

		    this.last.x = this.pos.x;
		    this.last.y = this.pos.y;
		    this.vel.y += ig.game.gravity * ig.system.tick * this.gravityFactor;
		    
		    this.vel.x = this.getNewVelocity( this.vel.x, this.accel.x, this.friction.x, this.maxVel.x );
		    this.vel.y = this.getNewVelocity( this.vel.y, this.accel.y, this.friction.y, this.maxVel.y );
		    
		    // movement & collision
		    var mx = this.vel.x * ig.system.tick;
		    var my = this.vel.y * ig.system.tick;
		    
		    /*

		    // Instead of using this, which is the normal way
		    // of handling collisions against the collision map
		    // we will do something a little different...

		    var res = ig.game.collisionMap.trace( 
		        this.pos.x, this.pos.y, mx, my, this.size.x, this.size.y
		    );

		    */

		    // Create a dummy collision result,
		    // which reports that there was no collision
		    // (even if there really should have been).

		    var res = {

		        collision: {
		            x: false,
		            y: false
		        },
		        pos: {
		            x: this.pos.x + mx,
		            y: this.pos.y + my
		        },
		        tile: {
		            x: 0,
		            y: 0
		        }

		    };

		    this.handleMovementTrace( res );

		    this.currentAnim.angle += this.angleModifier;
		    
		    if( this.currentAnim ) {
		        this.currentAnim.update();
		    }

		    if(this.killTimer.delta()>0){
				this.kill();
			}
		},

		draw: function(){
			this.parent();
		}
	});
});
