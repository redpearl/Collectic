ig.module(
	'game.entities.entry'
)
.requires(
	'impact.entity',
	'game.entities.payload',
	'game.entities.junction'

)
.defines(function(){

EntityEntry = ig.Entity.extend({
    
		size: {x: 4, y: 4},
		zIndex: 251,
		gravityFactor: 0,
	
		type: ig.Entity.TYPE.A, // Player friendly group
		checkAgainst: ig.Entity.TYPE.A,
		collides: ig.Entity.COLLIDES.NEVER,

		animSheet: new ig.AnimationSheet( 'media/teleport.png', 4, 4),
			
		init: function( x, y, settings ) {
			this.parent( x, y, settings );
			this.addAnim( 'idle', 0.2, [0] );
			this.addAnim( 'invisible', 0.2, [1] );
			// Add the animations
		},

		ready: function(){
			this.rightNode = ig.game.getEntityByName(this.right);
			this.leftNode = ig.game.getEntityByName(this.left);
		},

		check: function(other){
			if(other === ig.game.player && this.ready){
				this.sendPayload();
				this.resetReady();
				ig.game.player.pos.x = 10000;
				ig.game.sfxZip.play();
			}
		},

		sendPayload: function(payload, direction){
			if(!payload){
				this.payload = ig.game.spawnEntity(EntityPayload, this.pos.x, this.pos.y, {father: this});
				var time = 0.3;
				if(this.rightNode){
					if(this.distanceTo(this.rightNode) < 25){
						time = 0.15;
					}
					TweenMax.to(this.payload.pos, time, {x: this.rightNode.pos.x});
					TweenMax.to(this.payload.pos, time, {y: this.rightNode.pos.y, onComplete: this.sendPayloadToJunction.bind(this)});
				} else if(this.leftNode){
					if(this.distanceTo(this.leftNode) < 25){
						time = 0.15;
					}
					TweenMax.to(this.payload.pos, time, {x: this.leftNode.pos.x});
					TweenMax.to(this.payload.pos, time, {y: this.leftNode.pos.y, onComplete: this.sendPayloadToJunction.bind(this)});
				}
			} else {
				this.payload = payload;
				this.resetReady();
				this.playerExit();
			}
		},

		resetReady: function(){
			this.readyTimer = new ig.Timer(2.6);
			this.ready = false;
		},

		playerExit: function(){
			ig.game.player.vel.x = 0;
			ig.game.player.vel.y = 0;
			ig.game.player.pos.x = this.pos.x;
			ig.game.player.pos.y = this.pos.y;
			this.payload.kill();
			this.payload = 0;
		},

		sendPayloadToJunction: function(){
			if(this.rightNode){
				this.rightNode.sendPayload(this.payload, 'right');
			} else if (this.leftNode){
				this.leftNode.sendPayload(this.payload, 'left');
			}
			
		},
    
		update: function() {
			// move!
			if(this.ready){
				this.currentAnim = this.anims.idle;
			} else {
				this.currentAnim = this.anims.invisible;
			}
			this.parent();

			if(this.readyTimer && this.readyTimer.delta()>0){
				this.ready = true;
			}
		},

		draw: function(){
			this.parent();
		}
	});
});
