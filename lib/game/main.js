ig.module( 
	'game.main' 
)
.requires(
	'impact.game',
	'plugins.scalingPlugin',
	'game.levels.test',
	'game.levels.easy',
	'game.levels.medium',
	'game.levels.hard',
	'game.levels.testonecoin',
	'game.entities.player',
	'game.entities.tutorial',
	'game.entities.particle',
	'game.entities.health',
	'impact.font'
)
.defines(function(){

MyGame = ig.Game.extend({
	
	// Load a font
	font: new ig.Font( 'media/04b03.font.png' ),
	gravity: 30,
	wave: 1,
	
	init: function() {
		// Initialize your game here; bind keys etc.
		ig.game.initKeys();
		ig.game.loadLevel(LevelTest);
		ig.game.player = ig.game.spawnEntity(EntityPlayer, 100, 100);
		ig.game.sfxCoin = new ig.Sound('media/sound/coin.*');
		ig.game.sfxHurt = new ig.Sound('media/sound/hurt.*');
		ig.game.sfxJump = new ig.Sound('media/sound/jump.*');
		ig.game.sfxEjump = new ig.Sound('media/sound/ejump.*');
		ig.game.sfxEjump.volume = 0.2;
		ig.game.sfxZip = new ig.Sound('media/sound/zip.*');
		ig.game.sfxKill = new ig.Sound('media/sound/kill.*');
		ig.music.add('media/sound/testmusic.*', 'main');
		ig.music.add('media/sound/testsupermusic.*', 'super');
		ig.music.loop = true;
		ig.music.play('main');
		ig.game.createHealthBar();
		ig.game.initTutorial();
	},

	createHealthBar: function(){
		ig.game.healthBar = [];
		for (var i = 0; i < 7; i++) {
			ig.game.healthBar.push(ig.game.spawnEntity(EntityHealth, 5 + i*5, 5));
		};
	},

	initTutorial: function(){
		ig.game.spawnEntity(EntityTutorial, -320, 0, {number: 1});
		ig.game.player.stopped = true;
	},

	spawnEnemies: function(difficulty){
		if(difficulty === 'easy'){
			ig.game.loadLevelEntitiesByType(LevelEasy, 'EntityEnemy');
			ig.game.loadLevelEntitiesByType(LevelEasy, 'EntityEnemyWalker');
		} else if(difficulty === 'medium'){
			ig.game.loadLevelEntitiesByType(LevelMedium, 'EntityEnemy');
			ig.game.loadLevelEntitiesByType(LevelMedium, 'EntityEnemyWalker');
		} else if(difficulty === 'hard'){
			ig.game.loadLevelEntitiesByType(LevelHard, 'EntityEnemy');
			ig.game.loadLevelEntitiesByType(LevelHard, 'EntityEnemyWalker');
		} else {
			ig.game.player.win();
		}
	},

	checkIfLastEnemy: function(){
		var last = true;
		var normals = ig.game.getEntitiesByType(EntityEnemy);
		var walkers = ig.game.getEntitiesByType(EntityEnemyWalker);
		normals.forEach(function(normal){
			if(!normal._killed){
				last = false;
			}
		});
		walkers.forEach(function(walker){
			if(!walker._killed){
				last = false;
			}
		});
		if(last){
			ig.game.wave++;
			if(ig.game.wave === 2){
				ig.game.spawnEnemies('medium');
			} else if(ig.game.wave === 3){
				ig.game.spawnEnemies('hard');
			} else {
				ig.game.player.win();
			}
		}
	},	

	loadLevelEntitiesByType: function( data, type ) {
		for( var i = 0; i < data.entities.length; i++ ) {
			var ent = data.entities[i];
			if(ent.type === type){
				this.spawnEntity( ent.type, ent.x, ent.y, ent.settings );
			}
		}
		this.sortEntities();
		
		// Call post-init ready function on all entities
		for( var i = 0; i < this.entities.length; i++ ) {
			//this.entities[i].ready();
		}
	},

	loadAllCoins: function(){
		ig.game.loadLevelEntitiesByType(LevelTest, 'EntityCoin');
	},

	initKeys: function(){
		ig.input.bind( ig.KEY.M, 'mute' );
		ig.input.bind( ig.KEY.A, 'left' );
		ig.input.bind( ig.KEY.LEFT_ARROW, 'left' );
		ig.input.bind( ig.KEY.D, 'right' );
		ig.input.bind( ig.KEY.RIGHT_ARROW, 'right' );
		ig.input.bind( ig.KEY.UP_ARROW, 'up' );
		ig.input.bind( ig.KEY.W, 'up' );
		ig.input.bind( ig.KEY.DOWN_ARROW, 'down' );
		ig.input.bind( ig.KEY.S, 'down' );
		ig.input.bind( ig.KEY.SPACE, 'jump' );
	},

	spawnParticleExplosion: function(posx, posy){
		ig.game.spawnEntity(EntityParticle, posx, posy, {xModifier: 1, yModifier: 1, angleModifier: Math.random()});
		ig.game.spawnEntity(EntityParticle, posx, posy, {xModifier: -1, yModifier: 1, angleModifier: Math.random()});
		ig.game.spawnEntity(EntityParticle, posx, posy, {xModifier: 1, yModifier: -1, angleModifier: Math.random()});
		ig.game.spawnEntity(EntityParticle, posx, posy, {xModifier: -1, yModifier: -1, angleModifier: Math.random()});
	},

	spawnSuperParticle: function(posx, posy){
		var rand1 = Math.random();
		var rand2 = Math.random();
		var mod1 = 1;
		if(rand1 > 0.5){
			mod1 = -1;
		}
		var mod2 = 1;
		if(rand2 > 0.5){
			mod2 = -1;
		}
		ig.game.spawnEntity(EntityParticle, posx, posy, {xModifier: mod1, yModifier: mod2, angleModifier: Math.random(), super: true});
	},
	
	update: function() {
		// Update all entities and backgroundMaps
		this.parent();

		if(ig.input.pressed('mute')){
			ig.Sound.enabled = !ig.Sound.enabled;
			if(!ig.Sound.enabled){
				ig.music.volume = 0;
			} else {
				ig.music.volume = 1;
			}
		}

		if(ig.game.cameraShakeTimer && ig.game.cameraShakeTimer.delta()<0){
			ig.game.cameraShake(10);
		} else {
			ig.game.screen.x = 0;
			ig.game.screen.y = 0;
		}
		
		// Add your own, additional update code here
	},

	cameraShake: function(camShakePower){
		if(!camShakePower){
			this.camShakePower = 5;
		}
		var mod = 1;
			if(Math.random()>0.5){
				mod = -1;
			}
		ig.game.screen.x = Math.random()*3*mod;
		ig.game.screen.y = Math.random()*3*mod;
	},
	
	draw: function() {
		// Draw all entities and backgroundMaps
		this.parent();
		
		
		// Add your own drawing code here
		
		
		this.font.draw( ig.game.player.score, 280, 5, ig.Font.ALIGN.CENTER );
		if(ig.game.player._killed){
			this.font.draw( 'You died...', 175, 70, ig.Font.ALIGN.CENTER );	
		} else if(ig.game.player.winner){
			this.font.draw( 'You won!', 175, 70, ig.Font.ALIGN.CENTER );	
		}
		
	}
});


// Start the Game with 60fps, a resolution of 320x240, scaled
// up by a factor of 2
ig.main( '#canvas', MyGame, 60, 320, 240, 2 );

});
