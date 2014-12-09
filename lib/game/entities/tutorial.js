ig.module(
	'game.entities.tutorial'
)
.requires(
	'impact.entity'

)
.defines(function(){

EntityTutorial = ig.Entity.extend({
    
		size: {x: 320, y: 240},
		zIndex: 251,
		gravityFactor: 0,
	
		type: ig.Entity.TYPE.A, // Player friendly group
		checkAgainst: ig.Entity.TYPE.A,
		collides: ig.Entity.COLLIDES.NEVER,

		animSheet: new ig.AnimationSheet( 'media/tut01.png', 320, 240),
		animSheet2: new ig.AnimationSheet( 'media/tut02.png', 320, 240),
		animSheet3: new ig.AnimationSheet( 'media/tut03.png', 320, 240),
		animSheet4: new ig.AnimationSheet( 'media/tut04.png', 320, 240),
		animSheet5: new ig.AnimationSheet( 'media/tut05.png', 320, 240),
		animSheet6: new ig.AnimationSheet( 'media/tut06.png', 320, 240),
			
		init: function( x, y, settings ) {
			this.parent( x, y, settings );
			if(this.number === 2){
				this.animSheet = this.animSheet2;
			} else if(this.number === 3){
				this.animSheet = this.animSheet3;
			} else if(this.number === 4){
				this.animSheet = this.animSheet4;
			} else if(this.number === 5){
				this.animSheet = this.animSheet5;
			} else if(this.number === 6){
				this.animSheet = this.animSheet6;
			}
			TweenMax.to(this.pos, 1, {x: 0});
			this.addAnim( 'idle', 0.2, [0] );
			this.cooldownTimer = new ig.Timer(1);
			// Add the animations
		},
    
		update: function() {
			// move!
			this.currentAnim.update();
			if(ig.input.pressed('jump') && this.cooldownTimer.delta()>0 && !this.end){
				TweenMax.to(this.pos, 1, {x: 640, onComplete: this.kill.bind(this)});
				if(this.number < 6){
					ig.game.spawnEntity(EntityTutorial, -320, 0, {number: this.number+1});
				} else {
					ig.game.player.stopped = false;
				}
				this.end = true;
			}
			//this.parent();
		},

		draw: function(){
			this.parent();
		}
	});
});
