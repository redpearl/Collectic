ig.module(
	'game.entities.junction'
)
.requires(
	'impact.entity'

)
.defines(function(){

EntityJunction = ig.Entity.extend({
    
		size: {x: 4, y: 4},
		zIndex: 251,
		gravityFactor: 0,
	
		type: ig.Entity.TYPE.NONE, // Player friendly group
		checkAgainst: ig.Entity.TYPE.NONE,
		collides: ig.Entity.COLLIDES.NEVER,

		ready: true,
		
		//animSheet: new ig.AnimationSheet( 'media/portraits.png', 48, 48),
			
		init: function( x, y, settings ) {
			this.parent( x, y, settings );
			// Add the animations
		},

		ready: function(){
			this.rightNode = ig.game.getEntityByName(this.right);
			this.leftNode = ig.game.getEntityByName(this.left);
		},

		sendPayload: function(payload, direction){
			this.payload = payload;
			this.direction = direction;
			this.tweenPayload(direction);
		},

		tweenPayload: function(direction){
			if(direction === 'right'){
				TweenMax.to(this.payload.pos, 0.3, {x: this.rightNode.pos.x});
				TweenMax.to(this.payload.pos, 0.3, {y: this.rightNode.pos.y, onComplete: this.sendPayloadToJunction.bind(this)});
			} else {
				TweenMax.to(this.payload.pos, 0.3, {x: this.leftNode.pos.x});
				TweenMax.to(this.payload.pos, 0.3, {y: this.leftNode.pos.y, onComplete: this.sendPayloadToJunction.bind(this)});
			}
		},

		sendPayloadToJunction: function(){
			if(this.direction === 'right'){
				this.rightNode.sendPayload(this.payload, 'right');
			} else {
				this.leftNode.sendPayload(this.payload, 'left');
			}
		},
    
		update: function() {
			// move!
			this.parent();
		},

		draw: function(){
			this.parent();
		}
	});
});
