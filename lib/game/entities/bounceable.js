ig.module(
	'game.entities.bounceable'
)
.requires(
	'impact.entity'
)
.defines(function(){

EntityBounceable = ig.Entity.extend({
    
		type: ig.Entity.TYPE.NONE, // Player friendly group
		checkAgainst: ig.Entity.TYPE.NONE,
		collides: ig.Entity.COLLIDES.NEVER,

		scale: {x: 1, y: 1},
		
		init: function( x, y, settings ) {
			this.parent( x, y, settings );
		},

		squash: function(amount, time, bindTo){
			if(!time){
				time = 0.3;
			}

			if(!bindTo){
				bindTo = ig.game;
			}
			TweenMax.killTweensOf(this);
			this.scale.y = 1 - amount;
			TweenMax.to(this.scale, time, {y: 1, ease:Elastic.easeInOut});
			this.scale.x = 1 + amount;
			if(this.onComplete){
				TweenMax.to(this.scale, time, {x: 1, ease:Elastic.easeInOut, onComplete: this.onComplete.bind(bindTo)});
			} else {
				TweenMax.to(this.scale, time, {x: 1, ease:Elastic.easeInOut});
			}
		},

		dip: function(amount, time){
			this.offset.y = amount;
			TweenMax.to(this.offset, time, {y: 0});
		},

		stretch: function(amount, time, bindTo){
			if(!time){
				time = 0.3;
			}

			if(!bindTo){
				bindTo = ig.game;
			}
			TweenMax.killTweensOf(this);
			this.scale.y = 1 + amount;
			TweenMax.to(this.scale, time, {y: 1, ease:Elastic.easeInOut});
			this.scale.x = 1 - amount;
			if(this.onComplete){
				TweenMax.to(this.scale, time, {x: 1, ease:Elastic.easeInOut, onComplete: this.onComplete.bind(bindTo)});
			} else {
				TweenMax.to(this.scale, time, {x: 1, ease:Elastic.easeInOut});
			}
		},
    
		update: function() {
			this.parent();
		},

		draw: function(){
			this.currentAnim.scale.x = this.scale.x;
			this.currentAnim.scale.y = this.scale.y;
			this.parent();
		}
	});
});
