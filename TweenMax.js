/**
 * VERSION: beta 1.662
 * DATE: 2012-12-15
 * JavaScript (ActionScript 3 and 2 also available)
 * UPDATES AND DOCS AT: http://www.greensock.com
 * 
 * Includes all of the following: TweenLite, TweenMax, TimelineLite, TimelineMax, easing.EasePack, plugins.CSSPlugin, plugins.RoundPropsPlugin, plugins.BezierPlugin
 *
 * Copyright (c) 2008-2012, GreenSock. All rights reserved. 
 * This work is subject to the terms in http://www.greensock.com/terms_of_use.html or for 
 * Club GreenSock members, the software agreement that was issued with your membership.
 * 
 * @author: Jack Doyle, jack@greensock.com
 **/

(window._gsQueue || (window._gsQueue = [])).push( function() {

/*
 * ----------------------------------------------------------------
 * TweenMax
 * ----------------------------------------------------------------
 */
	_gsDefine("TweenMax", ["core.Animation","core.SimpleTimeline","TweenLite"], function(Animation, SimpleTimeline, TweenLite) {
		
		var TweenMax = function(target, duration, vars) {
				TweenLite.call(this, target, duration, vars);
				this._cycle = 0;
				this._yoyo = (this.vars.yoyo === true);
				this._repeat = this.vars.repeat || 0;
				this._repeatDelay = this.vars.repeatDelay || 0;
				this._dirty = true; //ensures that if there is any repeat, the totalDuration will get recalculated to accurately report it.
			},
			p = TweenMax.prototype = TweenLite.to({}, 0.1, {}),
			_blankArray = [];

		TweenMax.version = 1.661;
		p.constructor = TweenMax;
		p.kill()._gc = false;
		TweenMax.killTweensOf = TweenMax.killDelayedCallsTo = TweenLite.killTweensOf;
		TweenMax.getTweensOf = TweenLite.getTweensOf;
		TweenMax.ticker = TweenLite.ticker;
	
		p.invalidate = function() {
			this._yoyo = (this.vars.yoyo === true);
			this._repeat = this.vars.repeat || 0;
			this._repeatDelay = this.vars.repeatDelay || 0;
			this._uncache(true);
			return TweenLite.prototype.invalidate.call(this);
		};
		
		p.updateTo = function(vars, resetDuration) {
			var curRatio = this.ratio, p;
			if (resetDuration && this.timeline != null && this._startTime < this._timeline._time) {
				this._startTime = this._timeline._time;
				this._uncache(false);
				if (this._gc) {
					this._enabled(true, false);
				} else {
					this._timeline.insert(this, this._startTime - this._delay); //ensures that any necessary re-sequencing of Animations in the timeline occurs to make sure the rendering order is correct.
				}
			}
			for (p in vars) {
				this.vars[p] = vars[p];
			}
			if (this._initted) {
				if (resetDuration) {
					this._initted = false;
				} else {
					if (this._notifyPluginsOfEnabled && this._firstPT) {
						TweenLite._onPluginEvent("_onDisable", this); //in case a plugin like MotionBlur must perform some cleanup tasks
					}
					if (this._time / this._duration > 0.998) { //if the tween has finished (or come extremely close to finishing), we just need to rewind it to 0 and then render it again at the end which forces it to re-initialize (parsing the new vars). We allow tweens that are close to finishing (but haven't quite finished) to work this way too because otherwise, the values are so small when determining where to project the starting values that binary math issues creep in and can make the tween appear to render incorrectly when run backwards. 
						var prevTime = this._time;
						this.render(0, true, false);
						this._initted = false;
						this.render(prevTime, true, false);
					} else if (this._time > 0) {
						this._initted = false;
						this._init();
						var inv = 1 / (1 - curRatio),
							pt = this._firstPT, endValue;
						while (pt) {
							endValue = pt.s + pt.c; 
							pt.c *= inv;
							pt.s = endValue - pt.c;
							pt = pt._next;
						}
					}
				}
			}
			return this;
		};
				
		p.render = function(time, suppressEvents, force) {
			var totalDur = (!this._dirty) ? this._totalDuration : this.totalDuration(), 
				prevTime = this._time,
				prevTotalTime = this._totalTime, 
				prevCycle = this._cycle, 
				isComplete, callback, pt;
			if (time >= totalDur) {
				this._totalTime = totalDur;
				this._cycle = this._repeat;
				if (this._yoyo && (this._cycle & 1) !== 0) {
					this._time = 0;
					this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
				} else {
					this._time = this._duration;
					this.ratio = this._ease._calcEnd ? this._ease.getRatio(1) : 1;
				}
				if (!this._reversed) {
					isComplete = true;
					callback = "onComplete";
				}
				if (this._duration === 0) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
					if (time === 0 || this._rawPrevTime < 0) if (this._rawPrevTime !== time) {
						force = true;
					}
					this._rawPrevTime = time;
				}
				
			} else if (time <= 0) {
				this._totalTime = this._time = this._cycle = 0;
				this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
				if (prevTotalTime !== 0 || (this._duration === 0 && this._rawPrevTime > 0)) {
					callback = "onReverseComplete";
					isComplete = this._reversed;
				}
				if (time < 0) {
					this._active = false;
					if (this._duration === 0) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
						if (this._rawPrevTime >= 0) {
							force = true;
						}
						this._rawPrevTime = time;
					}
				} else if (!this._initted) { //if we render the very beginning (time == 0) of a fromTo(), we must force the render (normal tweens wouldn't need to render at a time of 0 when the prevTime was also 0). This is also mandatory to make sure overwriting kicks in immediately.
					force = true;
				}
			} else {
				this._totalTime = this._time = time;
				
				if (this._repeat !== 0) {
					var cycleDuration = this._duration + this._repeatDelay;
					this._cycle = (this._totalTime / cycleDuration) >> 0; //originally _totalTime % cycleDuration but floating point errors caused problems, so I normalized it. (4 % 0.8 should be 0 but Flash reports it as 0.79999999!)
					if (this._cycle !== 0) if (this._cycle === this._totalTime / cycleDuration) {
						this._cycle--; //otherwise when rendered exactly at the end time, it will act as though it is repeating (at the beginning)
					}
					this._time = this._totalTime - (this._cycle * cycleDuration);
					if (this._yoyo) if ((this._cycle & 1) !== 0) {
						this._time = this._duration - this._time;
					}
					if (this._time > this._duration) {
						this._time = this._duration;
					} else if (this._time < 0) {
						this._time = 0;
					}
				}
				
				if (this._easeType) {
					var r = this._time / this._duration, 
						type = this._easeType, 
						pow = this._easePower;
					if (type === 1 || (type === 3 && r >= 0.5)) {
						r = 1 - r;
					}
					if (type === 3) {
						r *= 2;
					}
					if (pow === 1) {
						r *= r;
					} else if (pow === 2) {
						r *= r * r;
					} else if (pow === 3) {
						r *= r * r * r;
					} else if (pow === 4) {
						r *= r * r * r * r;
					}
					
					if (type === 1) {
						this.ratio = 1 - r;
					} else if (type === 2) {
						this.ratio = r;
					} else if (this._time / this._duration < 0.5) {
						this.ratio = r / 2;
					} else {
						this.ratio = 1 - (r / 2);
					}
					
				} else {
					this.ratio = this._ease.getRatio(this._time / this._duration);
				}
				
			}
				
			if (prevTime === this._time && !force) {
				if (prevTotalTime !== this._totalTime) if (this._onUpdate) if (!suppressEvents) { //so that onUpdate fires even during the repeatDelay - as long as the totalTime changed, we should trigger onUpdate.
					this._onUpdate.apply(this.vars.onUpdateScope || this, this.vars.onUpdateParams || _blankArray);
				}
				return;
			} else if (!this._initted) {
				this._init();
				if (!isComplete && this._time) { //_ease is initially set to defaultEase, so now that init() has run, _ease is set properly and we need to recalculate the ratio. Overall this is faster than using conditional logic earlier in the method to avoid having to set ratio twice because we only init() once but renderTime() gets called VERY frequently.
					this.ratio = this._ease.getRatio(this._time / this._duration);
				}
			}
			
			if (!this._active) if (!this._paused) {
				this._active = true; //so that if the user renders a tween (as opposed to the timeline rendering it), the timeline is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the tween already finished but the user manually re-renders it as halfway done.
			}
			if (prevTotalTime === 0) if (this.vars.onStart) if (this._totalTime !== 0 || this._duration === 0) if (!suppressEvents) {
				this.vars.onStart.apply(this.vars.onStartScope || this, this.vars.onStartParams || _blankArray);
			}
			
			pt = this._firstPT;
			while (pt) {
				if (pt.f) {
					pt.t[pt.p](pt.c * this.ratio + pt.s);
				} else {
					pt.t[pt.p] = pt.c * this.ratio + pt.s;
				}
				pt = pt._next;
			}
			
			if (this._onUpdate) if (!suppressEvents) {
				this._onUpdate.apply(this.vars.onUpdateScope || this, this.vars.onUpdateParams || _blankArray);
			}
			if (this._cycle !== prevCycle) if (!suppressEvents) if (!this._gc) if (this.vars.onRepeat) {
				this.vars.onRepeat.apply(this.vars.onRepeatScope || this, this.vars.onRepeatParams || _blankArray);
			}
			if (callback) if (!this._gc) { //check gc because there's a chance that kill() could be called in an onUpdate
				if (isComplete) {
					if (this._timeline.autoRemoveChildren) {
						this._enabled(false, false);
					}
					this._active = false;
				}
				if (!suppressEvents) if (this.vars[callback]) {
					this.vars[callback].apply(this.vars[callback + "Scope"] || this, this.vars[callback + "Params"] || _blankArray);
				}
			}
		};
		
//---- STATIC FUNCTIONS -----------------------------------------------------------------------------------------------------------
		
		TweenMax.to = function(target, duration, vars) {
			return new TweenMax(target, duration, vars);
		};
		
		TweenMax.from = function(target, duration, vars) {
			vars.runBackwards = true;
			if (vars.immediateRender !== false) {
				vars.immediateRender = true;
			}
			return new TweenMax(target, duration, vars);
		};
		
		TweenMax.fromTo = function(target, duration, fromVars, toVars) {
			toVars.startAt = fromVars;
			if (fromVars.immediateRender) {
				toVars.immediateRender = true;
			}
			return new TweenMax(target, duration, toVars);
		};
		
		TweenMax.staggerTo = TweenMax.allTo = function(targets, duration, vars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			stagger = stagger || 0;
			var a = [],
				l = targets.length,
				delay = vars.delay || 0,
				copy, i, p;
			for (i = 0; i < l; i++) {
				copy = {};
				for (p in vars) {
					copy[p] = vars[p];
				}
				copy.delay = delay;
				if (i === l - 1) if (onCompleteAll) {
					copy.onComplete = function() {
						if (vars.onComplete) {
							vars.onComplete.apply(vars.onCompleteScope, vars.onCompleteParams);
						}
						onCompleteAll.apply(onCompleteAllScope, onCompleteAllParams);
					}
				}
				a[i] = new TweenMax(targets[i], duration, copy);
				delay += stagger;
			}
			return a;
		};
		
		TweenMax.staggerFrom = TweenMax.allFrom = function(targets, duration, vars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			vars.runBackwards = true;
			if (vars.immediateRender !== false) {
				vars.immediateRender = true;
			}
			return TweenMax.staggerTo(targets, duration, vars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		};
		
		TweenMax.staggerFromTo = TweenMax.allFromTo = function(targets, duration, fromVars, toVars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			toVars.startAt = fromVars;
			if (fromVars.immediateRender) {
				toVars.immediateRender = true;
			}
			return TweenMax.staggerTo(targets, duration, toVars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		};
				
		TweenMax.delayedCall = function(delay, callback, params, scope, useFrames) {
			return new TweenMax(callback, 0, {delay:delay, onComplete:callback, onCompleteParams:params, onCompleteScope:scope, onReverseComplete:callback, onReverseCompleteParams:params, onReverseCompleteScope:scope, immediateRender:false, useFrames:useFrames, overwrite:0});
		};
		
		TweenMax.set = function(target, vars) {
			return new TweenMax(target, 0, vars);
		};
		
		TweenMax.isTweening = function(target) {
			var a = TweenLite.getTweensOf(target),
				i = a.length,
				tween;
			while (--i > -1) {
				if (((tween = a[i])._active || (tween._startTime === tween.timeline._time && tween.timeline._active))) {
					return true;
				}
			}
			return false;
		};
		
		var _getChildrenOf = function(timeline, includeTimelines) {
				var a = [],
					cnt = 0,
					tween = timeline._first;
				while (tween) {
					if (tween instanceof TweenLite) {
						a[cnt++] = tween;
					} else {
						if (includeTimelines) {
							a[cnt++] = tween;
						}
						a = a.concat(_getChildrenOf(tween, includeTimelines));
						cnt = a.length;
					}
					tween = tween._next;
				}
				return a;
			}, 
			getAllTweens = TweenMax.getAllTweens = function(includeTimelines) {
				var a = _getChildrenOf(Animation._rootTimeline, includeTimelines);
				return a.concat( _getChildrenOf(Animation._rootFramesTimeline, includeTimelines) );
			};
		
		TweenMax.killAll = function(complete, tweens, delayedCalls, timelines) {
			if (tweens == null) {
				tweens = true;
			}
			if (delayedCalls == null) {
				delayedCalls = true;
			}
			var a = getAllTweens((timelines != false)),
				l = a.length,
				allTrue = (tweens && delayedCalls && timelines),
				isDC, tween, i;
			for (i = 0; i < l; i++) {
				tween = a[i];
				if (allTrue || (tween instanceof SimpleTimeline) || ((isDC = (tween.target === tween.vars.onComplete)) && delayedCalls) || (tweens && !isDC)) {
					if (complete) {
						tween.totalTime(tween.totalDuration());
					} else {
						tween._enabled(false, false);
					}
				}
			}
		};
		
		TweenMax.killChildTweensOf = function(parent, complete) {
			if (parent == null) {
				return;
			}
			if (parent.jquery) {
				parent.each( function(i, e) {
					TweenMax.killChildTweensOf(e, complete);
				});
				return;
			}
			var tl = TweenLite._tweenLookup,
				a = [],
				target, curParent, p, i, l;
			for (p in tl) {
				curParent = tl[p].target.parentNode;
				while (curParent) {
					if (curParent === parent) {
						a = a.concat(tl[p].tweens);
					}
					curParent = curParent.parentNode;
				}
			}
			l = a.length;
			for (i = 0; i < l; i++) {
				if (complete) {
					a[i].totalTime(a[i].totalDuration());
				}
				a[i]._enabled(false, false);
			}
		};
		
		TweenMax.pauseAll = function(tweens, delayedCalls, timelines) {
			_changePause(true, tweens, delayedCalls, timelines);
		};
		
		TweenMax.resumeAll = function(tweens, delayedCalls, timelines) {
			_changePause(false, tweens, delayedCalls, timelines);
		};
		
		var _changePause = function(pause, tweens, delayedCalls, timelines) {
			if (tweens == undefined) {
				tweens = true;
			}
			if (delayedCalls == undefined) {
				delayedCalls = true;
			}
			var a = getAllTweens(timelines),
				allTrue = (tweens && delayedCalls && timelines),
				i = a.length,
				isDC, tween;
			while (--i > -1) {
				tween = a[i];
				if (allTrue || (tween instanceof SimpleTimeline) || ((isDC = (tween.target === tween.vars.onComplete)) && delayedCalls) || (tweens && !isDC)) {
					tween.paused(pause);
				}
			}
		};
		
	
//---- GETTERS / SETTERS ----------------------------------------------------------------------------------------------------------
		
		p.progress = function(value) {
			return (!arguments.length) ? this._time / this.duration() : this.totalTime( this.duration() * ((this._yoyo && (this._cycle & 1) !== 0) ? 1 - value : value) + (this._cycle * (this._duration + this._repeatDelay)), false);
		};
		
		p.totalProgress = function(value) {
			return (!arguments.length) ? this._totalTime / this.totalDuration() : this.totalTime( this.totalDuration() * value, false);
		};
		
		p.time = function(value, suppressEvents) {
			if (!arguments.length) {
				return this._time;
			}
			if (this._dirty) {
				this.totalDuration();
			}
			if (value > this._duration) {
				value = this._duration;
			}
			if (this._yoyo && (this._cycle & 1) !== 0) {
				value = (this._duration - value) + (this._cycle * (this._duration + this._repeatDelay));
			} else if (this._repeat != 0) {
				value += this._cycle * (this._duration + this._repeatDelay);
			}
			return this.totalTime(value, suppressEvents);
		};
		
		p.totalDuration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					//instead of Infinity, we use 999999999999 so that we can accommodate reverses
					this._totalDuration = (this._repeat === -1) ? 999999999999 : this._duration * (this._repeat + 1) + (this._repeatDelay * this._repeat);
					this._dirty = false;
				}
				return this._totalDuration;
			}
			return (this._repeat === -1) ? this : this.duration( (value - (this._repeat * this._repeatDelay)) / (this._repeat + 1) );
		};
		
		p.repeat = function(value) {
			if (!arguments.length) {
				return this._repeat;
			}
			this._repeat = value;
			return this._uncache(true);
		};
		
		p.repeatDelay = function(value) {
			if (!arguments.length) {
				return this._repeatDelay;
			}
			this._repeatDelay = value;
			return this._uncache(true);
		};
		
		p.yoyo = function(value) {
			if (!arguments.length) {
				return this._yoyo;
			}
			this._yoyo = value;
			return this;
		};
		
		
		return TweenMax;
		
	}, true);








/*
 * ----------------------------------------------------------------
 * TimelineLite 													(!TimelineLite)
 * ----------------------------------------------------------------
 */
	_gsDefine("TimelineLite", ["core.Animation","core.SimpleTimeline","TweenLite"], function(Animation, SimpleTimeline, TweenLite) {

		"use strict";

		var TimelineLite = function(vars) {
				SimpleTimeline.call(this, vars);
				this._labels = {};
				this.autoRemoveChildren = (this.vars.autoRemoveChildren === true);
				this.smoothChildTiming = (this.vars.smoothChildTiming === true);
				this._sortChildren = true;
				this._onUpdate = this.vars.onUpdate;
				var i = _paramProps.length,
					j, a;
				while (--i > -1) {
					if ((a = this.vars[_paramProps[i]])) {
						j = a.length;
						while (--j > -1) {
							if (a[j] === "{self}") {
								a = this.vars[_paramProps[i]] = a.concat(); //copy the array in case the user referenced the same array in multiple timelines/tweens (each {self} should be unique)
								a[j] = this;
							}
						}
					}
				}
				if (this.vars.tweens instanceof Array) {
					this.insertMultiple(this.vars.tweens, 0, this.vars.align || "normal", this.vars.stagger || 0);
				}
			},
			_paramProps = ["onStartParams","onUpdateParams","onCompleteParams","onReverseCompleteParams","onRepeatParams"],
			_blankArray = [],
			_copy = function(vars) {
				var copy = {}, p;
				for (p in vars) {
					copy[p] = vars[p];
				}
				return copy;
			},
			p = TimelineLite.prototype = new SimpleTimeline();

		TimelineLite.version = 1.641;
		p.constructor = TimelineLite;
		p.kill()._gc = false;

		p.to = function(target, duration, vars, offsetOrLabel, baseTimeOrLabel) {
			return this.insert( new TweenLite(target, duration, vars), this._parseTimeOrLabel(baseTimeOrLabel, offsetOrLabel, true));
		};

		p.from = function(target, duration, vars, offsetOrLabel, baseTimeOrLabel) {
			return this.insert( TweenLite.from(target, duration, vars), this._parseTimeOrLabel(baseTimeOrLabel, offsetOrLabel, true));
		};

		p.fromTo = function(target, duration, fromVars, toVars, offsetOrLabel, baseTimeOrLabel) {
			return this.insert( TweenLite.fromTo(target, duration, fromVars, toVars), this._parseTimeOrLabel(baseTimeOrLabel, offsetOrLabel, true));
		};

		p.staggerTo = function(targets, duration, vars, stagger, offsetOrLabel, baseTimeOrLabel, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			var tl = new TimelineLite({onComplete:onCompleteAll, onCompleteParams:onCompleteAllParams, onCompleteScope:onCompleteAllScope});
			stagger = stagger || 0;
			for (var i = 0; i < targets.length; i++) {
				if (vars.startAt != null) {
					vars.startAt = _copy(vars.startAt);
				}
				tl.insert( new TweenLite(targets[i], duration, _copy(vars)), i * stagger);
			}
			return this.insert(tl, this._parseTimeOrLabel(baseTimeOrLabel, offsetOrLabel, true));
		};

		p.staggerFrom = function(targets, duration, vars, stagger, offsetOrLabel, baseTimeOrLabel, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			if (vars.immediateRender == null) {
				vars.immediateRender = true;
			}
			vars.runBackwards = true;
			return this.staggerTo(targets, duration, vars, stagger, offsetOrLabel, baseTimeOrLabel, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		};

		p.staggerFromTo = function(targets, duration, fromVars, toVars, stagger, offsetOrLabel, baseTimeOrLabel, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			toVars.startAt = fromVars;
			if (fromVars.immediateRender) {
				toVars.immediateRender = true;
			}
			return this.staggerTo(targets, duration, toVars, stagger, offsetOrLabel, baseTimeOrLabel, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		};

		p.call = function(callback, params, scope, offsetOrLabel, baseTimeOrLabel) {
			return this.insert( TweenLite.delayedCall(0, callback, params, scope), this._parseTimeOrLabel(baseTimeOrLabel, offsetOrLabel, true));
		};

		p.set = function(target, vars, offsetOrLabel, baseTimeOrLabel) {
			vars.immediateRender = false;
			return this.insert( new TweenLite(target, 0, vars), this._parseTimeOrLabel(baseTimeOrLabel, offsetOrLabel, true));
		};

		TimelineLite.exportRoot = function(vars, ignoreDelayedCalls) {
			vars = vars || {};
			if (vars.smoothChildTiming == null) {
				vars.smoothChildTiming = true;
			}
			var tl = new TimelineLite(vars),
				root = tl._timeline;
			if (ignoreDelayedCalls == null) {
				ignoreDelayedCalls = true;
			}
			root._remove(tl, true);
			tl._startTime = 0;
			tl._rawPrevTime = tl._time = tl._totalTime = root._time;
			var tween = root._first, next;
			while (tween) {
				next = tween._next;
				if (!ignoreDelayedCalls || !(tween instanceof TweenLite && tween.target === tween.vars.onComplete)) {
					tl.insert(tween, tween._startTime - tween._delay);
				}
				tween = next;
			}
			root.insert(tl, 0);
			return tl;
		};

		p.insert = function(value, timeOrLabel) {
			if (value instanceof Animation) {
				//continue...
			} else if (value instanceof Array) {
				return this.insertMultiple(value, timeOrLabel);
			} else if (typeof(value) === "string") {
				return this.addLabel(value, this._parseTimeOrLabel(timeOrLabel || 0, 0, true));
			} else if (typeof(value) === "function") {
				value = TweenLite.delayedCall(0, value);
			} else {
				throw ("ERROR: Cannot insert() " + value + " into the TimelineLite/Max because it is neither a tween, timeline, function, nor a String.");
				return this;
			}

			SimpleTimeline.prototype.insert.call(this, value, this._parseTimeOrLabel(timeOrLabel || 0, 0, true));

			//if the timeline has already ended but the inserted tween/timeline extends the duration, we should enable this timeline again so that it renders properly.
			if (this._gc) if (!this._paused) if (this._time === this._duration) if (this._time < this.duration()) {
				//in case any of the anscestors had completed but should now be enabled...
				var tl = this;
				while (tl._gc && tl._timeline) {
					if (tl._timeline.smoothChildTiming) {
						tl.totalTime(tl._totalTime, true); //also enables them
					} else {
						tl._enabled(true, false);
					}
					tl = tl._timeline;
				}
			}
			return this;
		};

		p.remove = function(value) {
			if (value instanceof Animation) {
				return this._remove(value, false);
			} else if (value instanceof Array) {
				var i = value.length;
				while (--i > -1) {
					this.remove(value[i]);
				}
				return this;
			} else if (typeof(value) === "string") {
				return this.removeLabel(value);
			}
			return this.kill(null, value);
		};

		p.append = function(value, offsetOrLabel) {
			return this.insert(value, this._parseTimeOrLabel(null, offsetOrLabel, true));
		};

		p.insertMultiple = function(tweens, timeOrLabel, align, stagger) {
			align = align || "normal";
			stagger = stagger || 0;
			var i, tween, curTime = this._parseTimeOrLabel(timeOrLabel || 0, 0, true), l = tweens.length;
			for (i = 0; i < l; i++) {
				if ((tween = tweens[i]) instanceof Array) {
					tween = new TimelineLite({tweens:tween});
				}
				this.insert(tween, curTime);
				if (typeof(tween) === "string" || typeof(tween) === "function") {
					//do nothing
				} else if (align === "sequence") {
					curTime = tween._startTime + (tween.totalDuration() / tween._timeScale);
				} else if (align === "start") {
					tween._startTime -= tween.delay();
				}
				curTime += stagger;
			}
			return this._uncache(true);
		};

		p.appendMultiple = function(tweens, offsetOrLabel, align, stagger) {
			return this.insertMultiple(tweens, this._parseTimeOrLabel(null, offsetOrLabel, true), align, stagger);
		};

		p.addLabel = function(label, time) {
			this._labels[label] = time;
			return this;
		};

		p.removeLabel = function(label) {
			delete this._labels[label];
			return this;
		};

		p.getLabelTime = function(label) {
			return (this._labels[label] != null) ? this._labels[label] : -1;
		};

		p._parseTimeOrLabel = function(timeOrLabel, offsetOrLabel, appendIfAbsent) {
			if (typeof(offsetOrLabel) === "string") {
				return this._parseTimeOrLabel(offsetOrLabel, ((appendIfAbsent && typeof(timeOrLabel) === "number" && this._labels[offsetOrLabel] == null) ? timeOrLabel - this.duration() : 0), appendIfAbsent);
			}
			offsetOrLabel = offsetOrLabel || 0;
			if (timeOrLabel == null) {
				return this.duration() + offsetOrLabel;
			} else if (typeof(timeOrLabel) === "string" && isNaN(timeOrLabel)) {
				if (this._labels[timeOrLabel] == null) {
					return (appendIfAbsent) ? (this._labels[timeOrLabel] = this.duration() + offsetOrLabel) : offsetOrLabel;
				}
				return this._labels[timeOrLabel] + offsetOrLabel;
			}
			return Number(timeOrLabel) + offsetOrLabel;
		};

		p.seek = function(timeOrLabel, suppressEvents) {
			return this.totalTime(this._parseTimeOrLabel(timeOrLabel), (suppressEvents != false));
		}

		p.stop = function() {
			return this.paused(true);
		};

		p.gotoAndPlay = function(timeOrLabel, suppressEvents) {
			return SimpleTimeline.prototype.play.call(this, timeOrLabel, suppressEvents);
		};

		p.gotoAndStop = function(timeOrLabel, suppressEvents) {
			return this.pause(timeOrLabel, suppressEvents);
		};

		p.render = function(time, suppressEvents, force) {
			if (this._gc) {
				this._enabled(true, false);
			}
			this._active = !this._paused;
			var totalDur = (!this._dirty) ? this._totalDuration : this.totalDuration(),
				prevTime = this._time,
				prevStart = this._startTime,
				prevTimeScale = this._timeScale,
				prevPaused = this._paused,
				tween, isComplete, next, callback;
			if (time >= totalDur) {
				this._totalTime = this._time = totalDur;
				if (!this._reversed) if (!this._hasPausedChild()) {
					isComplete = true;
					callback = "onComplete";
					if (this._duration === 0) if (time === 0 || this._rawPrevTime < 0) if (this._rawPrevTime !== time) { //In order to accommodate zero-duration timelines, we must discern the momentum/direction of time in order to render values properly when the "playhead" goes past 0 in the forward direction or lands directly on it, and also when it moves past it in the backward direction (from a postitive time to a negative time).
						force = true;
					}
				}
				this._rawPrevTime = time;
				time = totalDur + 0.000001; //to avoid occassional floating point rounding errors - sometimes child tweens/timelines were not being fully completed (their progress might be 0.999999999999998 instead of 1 because when _time - tween._startTime is performed, floating point errors would return a value that was SLIGHTLY off)

			} else if (time <= 0) {
				this._totalTime = this._time = 0;
				if (prevTime !== 0 || (this._duration === 0 && this._rawPrevTime > 0)) {
					callback = "onReverseComplete";
					isComplete = this._reversed;
				}
				if (time < 0) {
					this._active = false;
					if (this._duration === 0) if (this._rawPrevTime >= 0) { //zero-duration timelines are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
						force = true;
					}
				} else if (!this._initted) {
					force = true;
				}
				this._rawPrevTime = time;
				time = -0.000001; //to avoid occassional floating point rounding errors in Flash - sometimes child tweens/timelines were not being rendered at the very beginning (their progress might be 0.000000000001 instead of 0 because when Flash performed _time - tween._startTime, floating point errors would return a value that was SLIGHTLY off)

			} else {
				this._totalTime = this._time = this._rawPrevTime = time;
			}

			if (this._time === prevTime && !force) {
				return;
			} else if (!this._initted) {
				this._initted = true;
			}
			if (prevTime === 0) if (this.vars.onStart) if (this._time !== 0) if (!suppressEvents) {
				this.vars.onStart.apply(this.vars.onStartScope || this, this.vars.onStartParams || _blankArray);
			}

			if (this._time > prevTime) {
				tween = this._first;
				while (tween) {
					next = tween._next; //record it here because the value could change after rendering...
					if (this._paused && !prevPaused) { //in case a tween pauses the timeline when rendering
						break;
					} else if (tween._active || (tween._startTime <= this._time && !tween._paused && !tween._gc)) {

						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, false);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, false);
						}

					}
					tween = next;
				}
			} else {
				tween = this._last;
				while (tween) {
					next = tween._prev; //record it here because the value could change after rendering...
					if (this._paused && !prevPaused) { //in case a tween pauses the timeline when rendering
						break;
					} else if (tween._active || (tween._startTime <= prevTime && !tween._paused && !tween._gc)) {

						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, false);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, false);
						}

					}
					tween = next;
				}
			}

			if (this._onUpdate) if (!suppressEvents) {
				this._onUpdate.apply(this.vars.onUpdateScope || this, this.vars.onUpdateParams || _blankArray);
			}

			if (callback) if (!this._gc) if (prevStart === this._startTime || prevTimeScale != this._timeScale) if (this._time === 0 || totalDur >= this.totalDuration()) { //if one of the tweens that was rendered altered this timeline's startTime (like if an onComplete reversed the timeline), it probably isn't complete. If it is, don't worry, because whatever call altered the startTime would complete if it was necessary at the new time. The only exception is the timeScale property. Also check _gc because there's a chance that kill() could be called in an onUpdate
				if (isComplete) {
					if (this._timeline.autoRemoveChildren) {
						this._enabled(false, false);
					}
					this._active = false;
				}
				if (!suppressEvents) if (this.vars[callback]) {
					this.vars[callback].apply(this.vars[callback + "Scope"] || this, this.vars[callback + "Params"] || _blankArray);
				}
			}
		};

		p._hasPausedChild = function() {
			var tween = this._first;
			while (tween) {
				if (tween._paused || ((tween instanceof TimelineLite) && tween._hasPausedChild())) {
					return true;
				}
				tween = tween._next;
			}
			return false;
		};

		p.getChildren = function(nested, tweens, timelines, ignoreBeforeTime) {
			ignoreBeforeTime = ignoreBeforeTime || -9999999999;
			var a = [],
				tween = this._first,
				cnt = 0;
			while (tween) {
				if (tween._startTime < ignoreBeforeTime) {
					//do nothing
				} else if (tween instanceof TweenLite) {
					if (tweens != false) {
						a[cnt++] = tween;
					}
				} else {
					if (timelines != false) {
						a[cnt++] = tween;
					}
					if (nested != false) {
						a = a.concat(tween.getChildren(true, tweens, timelines));
						cnt = a.length;
					}
				}
				tween = tween._next;
			}
			return a;
		};

		p.getTweensOf = function(target, nested) {
			var tweens = TweenLite.getTweensOf(target),
				i = tweens.length,
				a = [],
				cnt = 0;
			while (--i > -1) {
				if (tweens[i].timeline === this || (nested && this._contains(tweens[i]))) {
					a[cnt++] = tweens[i];
				}
			}
			return a;
		};

		p._contains = function(tween) {
			var tl = tween.timeline;
			while (tl) {
				if (tl === this) {
					return true;
				}
				tl = tl.timeline;
			}
			return false;
		};

		p.shiftChildren = function(amount, adjustLabels, ignoreBeforeTime) {
			ignoreBeforeTime = ignoreBeforeTime || 0;
			var tween = this._first;
			while (tween) {
				if (tween._startTime >= ignoreBeforeTime) {
					tween._startTime += amount;
				}
				tween = tween._next;
			}
			if (adjustLabels) {
				for (var p in this._labels) {
					if (this._labels[p] >= ignoreBeforeTime) {
						this._labels[p] += amount;
					}
				}
			}
			return this._uncache(true);
		};

		p._kill = function(vars, target) {
			if (vars == null) if (target == null) {
				return this._enabled(false, false);
			}
			var tweens = (target == null) ? this.getChildren(true, true, false) : this.getTweensOf(target),
				i = tweens.length,
				changed = false;
			while (--i > -1) {
				if (tweens[i]._kill(vars, target)) {
					changed = true;
				}
			}
			return changed;
		};

		p.clear = function(labels) {
			var tweens = this.getChildren(false, true, true),
				i = tweens.length;
			this._time = this._totalTime = 0;
			while (--i > -1) {
				tweens[i]._enabled(false, false);
			}
			if (labels != false) {
				this._labels = {};
			}
			return this._uncache(true);
		};

		p.invalidate = function() {
			var tween = this._first;
			while (tween) {
				tween.invalidate();
				tween = tween._next;
			}
			return this;
		};

		p._enabled = function(enabled, ignoreTimeline) {
			if (enabled === this._gc) {
				var tween = this._first;
				while (tween) {
					tween._enabled(enabled, true);
					tween = tween._next;
				}
			}
			return SimpleTimeline.prototype._enabled.call(this, enabled, ignoreTimeline);
		};

		p.progress = function(value) {
			return (!arguments.length) ? this._time / this.duration() : this.totalTime(this.duration() * value, false);
		};

		p.duration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					this.totalDuration(); //just triggers recalculation
				}
				return this._duration;
			}
			if (this.duration() !== 0) if (value !== 0) {
				this.timeScale(this._duration / value);
			}
			return this;
		};

		p.totalDuration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					var max = 0,
						tween = this._first,
						prevStart = -999999999999,
						next, end;
					while (tween) {
						next = tween._next; //record it here in case the tween changes position in the sequence...

						if (tween._startTime < prevStart && this._sortChildren) { //in case one of the tweens shifted out of order, it needs to be re-inserted into the correct position in the sequence
							this.insert(tween, tween._startTime - tween._delay);
						} else {
							prevStart = tween._startTime;
						}
						if (tween._startTime < 0) {//children aren't allowed to have negative startTimes, so adjust here if one is found.
							max -= tween._startTime;
							this.shiftChildren(-tween._startTime, false, -9999999999);
						}
						end = tween._startTime + ((!tween._dirty ? tween._totalDuration : tween.totalDuration()) / tween._timeScale);
						if (end > max) {
							max = end;
						}

						tween = next;
					}
					this._duration = this._totalDuration = max;
					this._dirty = false;
				}
				return this._totalDuration;
			}
			if (this.totalDuration() !== 0) if (value !== 0) {
				this.timeScale(this._totalDuration / value);
			}
			return this;
		};

		p.usesFrames = function() {
			var tl = this._timeline;
			while (tl._timeline) {
				tl = tl._timeline;
			}
			return (tl === Animation._rootFramesTimeline);
		};

		p.rawTime = function() {
			return (this._paused || (this._totalTime !== 0 && this._totalTime !== this._totalDuration)) ? this._totalTime : (this._timeline.rawTime() - this._startTime) * this._timeScale;
		};

		return TimelineLite;

	}, true);
	







	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * TimelineMax
 * ----------------------------------------------------------------
 */
	_gsDefine("TimelineMax", ["TimelineLite","TweenLite","easing.Ease"], function(TimelineLite, TweenLite, Ease) {

		var TimelineMax = function(vars) {
				TimelineLite.call(this, vars);
				this._repeat = this.vars.repeat || 0;
				this._repeatDelay = this.vars.repeatDelay || 0;
				this._cycle = 0;
				this._yoyo = (this.vars.yoyo === true);
				this._dirty = true;
			},
			_blankArray = [],
			_easeNone = new Ease(null, null, 1, 0),
			_getGlobalPaused = function(tween) {
				while (tween) {
					if (tween._paused) {
						return true;
					}
					tween = tween._timeline;
				}
				return false;
			},
			p = TimelineMax.prototype = new TimelineLite();

		p.constructor = TimelineMax;
		p.kill()._gc = false;
		TimelineMax.version = 1.641;

		p.invalidate = function() {
			this._yoyo = (this.vars.yoyo === true);
			this._repeat = this.vars.repeat || 0;
			this._repeatDelay = this.vars.repeatDelay || 0;
			this._uncache(true);
			return TimelineLite.prototype.invalidate.call(this);
		};

		p.addCallback = function(callback, timeOrLabel, params, scope) {
			return this.insert( TweenLite.delayedCall(0, callback, params, scope), timeOrLabel);
		};

		p.removeCallback = function(callback, timeOrLabel) {
			if (timeOrLabel == null) {
				this._kill(null, callback);
			} else {
				var a = this.getTweensOf(callback, false),
					i = a.length,
					time = this._parseTimeOrLabel(timeOrLabel);
				while (--i > -1) {
					if (a[i]._startTime === time) {
						a[i]._enabled(false, false);
					}
				}
			}
			return this;
		};

		p.tweenTo = function(timeOrLabel, vars) {
			vars = vars || {};
			var copy = {ease:_easeNone, overwrite:2, useFrames:this.usesFrames(), immediateRender:false}, p, t;
			for (p in vars) {
				copy[p] = vars[p];
			}
			copy.time = this._parseTimeOrLabel(timeOrLabel);
			t = new TweenLite(this, (Math.abs(Number(copy.time) - this._time) / this._timeScale) || 0.001, copy);
			copy.onStart = function() {
				t.target.paused(true);
				if (t.vars.time !== t.target.time()) { //don't make the duration zero - if it's supposed to be zero, don't worry because it's already initting the tween and will complete immediately, effectively making the duration zero anyway. If we make duration zero, the tween won't run at all.
					t.duration( Math.abs( t.vars.time - t.target.time()) / t.target._timeScale );
				}
				if (vars.onStart) { //in case the user had an onStart in the vars - we don't want to overwrite it.
					vars.onStart.apply(vars.onStartScope || t, vars.onStartParams || _blankArray);
				}
			}
			return t;
		};

		p.tweenFromTo = function(fromTimeOrLabel, toTimeOrLabel, vars) {
			vars = vars || {};
			vars.startAt = {time:this._parseTimeOrLabel(fromTimeOrLabel)};
			var t = this.tweenTo(toTimeOrLabel, vars);
			return t.duration((Math.abs( t.vars.time - t.vars.startAt.time) / this._timeScale) || 0.001);
		};

		p.render = function(time, suppressEvents, force) {
			if (this._gc) {
				this._enabled(true, false);
			}
			this._active = !this._paused;
			var totalDur = (!this._dirty) ? this._totalDuration : this.totalDuration(),
				prevTime = this._time,
				prevTotalTime = this._totalTime,
				prevStart = this._startTime,
				prevTimeScale = this._timeScale,
				prevRawPrevTime = this._rawPrevTime,
				prevPaused = this._paused,
				prevCycle = this._cycle,
				tween, isComplete, next, dur, callback;
			if (time >= totalDur) {
				if (!this._locked) {
					this._totalTime = totalDur;
					this._cycle = this._repeat;
				}
				if (!this._reversed) if (!this._hasPausedChild()) {
					isComplete = true;
					callback = "onComplete";
					if (this._duration === 0) if (time === 0 || this._rawPrevTime < 0) if (this._rawPrevTime !== time) { //In order to accommodate zero-duration timelines, we must discern the momentum/direction of time in order to render values properly when the "playhead" goes past 0 in the forward direction or lands directly on it, and also when it moves past it in the backward direction (from a postitive time to a negative time).
						force = true;
					}
				}
				this._rawPrevTime = time;
				if (this._yoyo && (this._cycle & 1) !== 0) {
					this._time = 0;
					time = -0.000001; //to avoid occasional floating point rounding errors - sometimes child tweens/timelines were not being rendered at the very beginning (their progress might be 0.000000000001 instead of 0 because when Flash performed _time - tween._startTime, floating point errors would return a value that was SLIGHTLY off)
				} else {
					this._time = this._duration;
					time = this._duration + 0.000001; //to avoid occasional floating point rounding errors in Flash - sometimes child tweens/timelines were not being fully completed (their progress might be 0.999999999999998 instead of 1 because when Flash performed _time - tween._startTime, floating point errors would return a value that was SLIGHTLY off)
				}

			} else if (time <= 0) {
				if (!this._locked) {
					this._totalTime = this._cycle = 0;
				}
				this._time = 0;
				if (prevTime !== 0 || (this._duration === 0 && this._rawPrevTime > 0 && !this._locked)) {
					callback = "onReverseComplete";
					isComplete = this._reversed;
				}
				if (time < 0) {
					this._active = false;
					if (this._duration === 0) if (this._rawPrevTime >= 0) { //zero-duration timelines are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
						force = true;
					}
				} else if (!this._initted) {
					force = true;
				}
				this._rawPrevTime = time;
				time = (this._duration === 0) ? 0 : -0.000001; //to avoid occasional floating point rounding errors - sometimes child tweens/timelines were not being rendered at the very beginning (their progress might be 0.000000000001 instead of 0 because when Flash performed _time - tween._startTime, floating point errors would return a value that was SLIGHTLY off)

			} else {
				this._time = this._rawPrevTime = time;
				if (!this._locked) {
					this._totalTime = time;
					if (this._repeat !== 0) {
						var cycleDuration = this._duration + this._repeatDelay;
						this._cycle = (this._totalTime / cycleDuration) >> 0; //originally _totalTime % cycleDuration but floating point errors caused problems, so I normalized it. (4 % 0.8 should be 0 but Flash reports it as 0.79999999!)
						if (this._cycle !== 0) if (this._cycle === this._totalTime / cycleDuration) {
							this._cycle--; //otherwise when rendered exactly at the end time, it will act as though it is repeating (at the beginning)
						}
						this._time = this._totalTime - (this._cycle * cycleDuration);
						if (this._yoyo) if ((this._cycle & 1) !== 0) {
							this._time = this._duration - this._time;
						}
						if (this._time > this._duration) {
							this._time = this._duration;
							time = this._duration + 0.000001; //to avoid occasional floating point rounding errors in Flash - sometimes child tweens/timelines were not being fully completed (their progress might be 0.999999999999998 instead of 1 because when Flash performed _time - tween._startTime, floating point errors would return a value that was SLIGHTLY off)
						} else if (this._time < 0) {
							this._time = time = 0;
						} else {
							time = this._time;
						}
					}
				}
			}

			if (this._cycle !== prevCycle) if (!this._locked) {
				/*
				 make sure children at the end/beginning of the timeline are rendered properly. If, for example,
				 a 3-second long timeline rendered at 2.9 seconds previously, and now renders at 3.2 seconds (which
				 would get transated to 2.8 seconds if the timeline yoyos or 0.2 seconds if it just repeats), there
				 could be a callback or a short tween that's at 2.95 or 3 seconds in which wouldn't render. So
				 we need to push the timeline to the end (and/or beginning depending on its yoyo value). Also we must
				 ensure that zero-duration tweens at the very beginning or end of the TimelineMax work.
				 */
				var backwards = (this._yoyo && (prevCycle & 1) !== 0),
					wrap = (backwards === (this._yoyo && (this._cycle & 1) !== 0)),
					recTotalTime = this._totalTime,
					recCycle = this._cycle,
					recRawPrevTime = this._rawPrevTime,
					recTime = this._time;

				this._totalTime = prevCycle * this._duration;
				if (this._cycle < prevCycle) {
					backwards = !backwards;
				} else {
					this._totalTime += this._duration;
				}
				this._time = prevTime; //temporarily revert _time so that render() renders the children in the correct order. Without this, tweens won't rewind correctly. We could arhictect things in a "cleaner" way by splitting out the rendering queue into a separate method but for performance reasons, we kept it all inside this method.

				this._rawPrevTime = (this._duration === 0) ? prevRawPrevTime - 0.00001 : prevRawPrevTime;
				this._cycle = prevCycle;
				this._locked = true; //prevents changes to totalTime and skips repeat/yoyo behavior when we recursively call render()
				prevTime = (backwards) ? 0 : this._duration;
				this.render(prevTime, suppressEvents, (this._duration === 0));
				if (!suppressEvents) if (!this._gc) {
					if (this.vars.onRepeat) {
						this.vars.onRepeat.apply(this.vars.onRepeatScope || this, this.vars.onRepeatParams || _blankArray);
					}
				}
				if (wrap) {
					prevTime = (backwards) ? this._duration + 0.000001 : -0.000001;
					this.render(prevTime, true, false);
				}
				this._time = recTime;
				this._totalTime = recTotalTime;
				this._cycle = recCycle;
				this._rawPrevTime = recRawPrevTime;
				this._locked = false;
			}

			if (this._time === prevTime && !force) {
				if (prevTotalTime !== this._totalTime) if (this._onUpdate) if (!suppressEvents) { //so that onUpdate fires even during the repeatDelay - as long as the totalTime changed, we should trigger onUpdate.
					this._onUpdate.apply(this.vars.onUpdateScope || this, this.vars.onUpdateParams || _blankArray);
				}
				return;
			} else if (!this._initted) {
				this._initted = true;
			}

			if (prevTotalTime === 0) if (this.vars.onStart) if (this._totalTime !== 0) if (!suppressEvents) {
				this.vars.onStart.apply(this.vars.onStartScope || this, this.vars.onStartParams || _blankArray);
			}

			if (this._time > prevTime) {
				tween = this._first;
				while (tween) {
					next = tween._next; //record it here because the value could change after rendering...
					if (this._paused && !prevPaused) { //in case a tween pauses the timeline when rendering
						break;
					} else if (tween._active || (tween._startTime <= this._time && !tween._paused && !tween._gc)) {
						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, false);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, false);
						}

					}
					tween = next;
				}
			} else {
				tween = this._last;
				while (tween) {
					next = tween._prev; //record it here because the value could change after rendering...
					if (this._paused && !prevPaused) { //in case a tween pauses the timeline when rendering
						break;
					} else if (tween._active || (tween._startTime <= prevTime && !tween._paused && !tween._gc)) {
						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, false);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, false);
						}

					}
					tween = next;
				}
			}

			if (this._onUpdate) if (!suppressEvents) {
				this._onUpdate.apply(this.vars.onUpdateScope || this, this.vars.onUpdateParams || _blankArray);
			}
			if (callback) if (!this._locked) if (!this._gc) if (prevStart === this._startTime || prevTimeScale !== this._timeScale) if (this._time === 0 || totalDur >= this.totalDuration()) { //if one of the tweens that was rendered altered this timeline's startTime (like if an onComplete reversed the timeline), it probably isn't complete. If it is, don't worry, because whatever call altered the startTime would complete if it was necessary at the new time. The only exception is the timeScale property. Also check _gc because there's a chance that kill() could be called in an onUpdate
				if (isComplete) {
					if (this._timeline.autoRemoveChildren) {
						this._enabled(false, false);
					}
					this._active = false;
				}
				if (!suppressEvents) if (this.vars[callback]) {
					this.vars[callback].apply(this.vars[callback + "Scope"] || this, this.vars[callback + "Params"] || _blankArray);
				}
			}
		};

		p.getActive = function(nested, tweens, timelines) {
			if (nested == null) {
				nested = true;
			}
			if (tweens == null) {
				tweens = true;
			}
			if (timelines == null) {
				timelines = false;
			}
			var a = [],
				all = this.getChildren(nested, tweens, timelines),
				cnt = 0,
				l = all.length,
				i, tween;
			for (i = 0; i < l; i++) {
				tween = all[i];
				//note: we cannot just check tween.active because timelines that contain paused children will continue to have "active" set to true even after the playhead passes their end point (technically a timeline can only be considered complete after all of its children have completed too, but paused tweens are...well...just waiting and until they're unpaused we don't know where their end point will be).
				if (!tween._paused) if (tween._timeline._time >= tween._startTime) if (tween._timeline._time < tween._startTime + tween._totalDuration / tween._timeScale) if (!_getGlobalPaused(tween._timeline)) {
					a[cnt++] = tween;
				}
			}
			return a;
		};


		p.getLabelAfter = function(time) {
			if (!time) if (time !== 0) { //faster than isNan()
				time = this._time;
			}
			var labels = this.getLabelsArray(),
				l = labels.length,
				i;
			for (i = 0; i < l; i++) {
				if (labels[i].time > time) {
					return labels[i].name;
				}
			}
			return null;
		};

		p.getLabelBefore = function(time) {
			if (time == null) {
				time = this._time;
			}
			var labels = this.getLabelsArray(),
				i = labels.length;
			while (--i > -1) {
				if (labels[i].time < time) {
					return labels[i].name;
				}
			}
			return null;
		};

		p.getLabelsArray = function() {
			var a = [],
				cnt = 0,
				p;
			for (p in this._labels) {
				a[cnt++] = {time:this._labels[p], name:p};
			}
			a.sort(function(a,b) {
				return a.time - b.time;
			});
			return a;
		};


//---- GETTERS / SETTERS -------------------------------------------------------------------------------------------------------

		p.progress = function(value) {
			return (!arguments.length) ? this._time / this.duration() : this.totalTime( this.duration() * ((this._yoyo && (this._cycle & 1) !== 0) ? 1 - value : value) + (this._cycle * (this._duration + this._repeatDelay)), false);
		};

		p.totalProgress = function(value) {
			return (!arguments.length) ? this._totalTime / this.totalDuration() : this.totalTime( this.totalDuration() * value, false);
		};

		p.totalDuration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					TimelineLite.prototype.totalDuration.call(this); //just forces refresh
					//Instead of Infinity, we use 999999999999 so that we can accommodate reverses.
					this._totalDuration = (this._repeat === -1) ? 999999999999 : this._duration * (this._repeat + 1) + (this._repeatDelay * this._repeat);
				}
				return this._totalDuration;
			}
			return (this._repeat === -1) ? this : this.duration( (value - (this._repeat * this._repeatDelay)) / (this._repeat + 1) );
		};

		p.time = function(value, suppressEvents) {
			if (!arguments.length) {
				return this._time;
			}
			if (this._dirty) {
				this.totalDuration();
			}
			if (value > this._duration) {
				value = this._duration;
			}
			if (this._yoyo && (this._cycle & 1) !== 0) {
				value = (this._duration - value) + (this._cycle * (this._duration + this._repeatDelay));
			} else if (this._repeat !== 0) {
				value += this._cycle * (this._duration + this._repeatDelay);
			}
			return this.totalTime(value, suppressEvents);
		};

		p.repeat = function(value) {
			if (!arguments.length) {
				return this._repeat;
			}
			this._repeat = value;
			return this._uncache(true);
		};

		p.repeatDelay = function(value) {
			if (!arguments.length) {
				return this._repeatDelay;
			}
			this._repeatDelay = value;
			return this._uncache(true);
		};

		p.yoyo = function(value) {
			if (!arguments.length) {
				return this._yoyo;
			}
			this._yoyo = value;
			return this;
		};

		p.currentLabel = function(value) {
			if (!arguments.length) {
				return this.getLabelBefore(this._time + 0.00000001);
			}
			return this.seek(value, true);
		};

		return TimelineMax;

	}, true);
	




	
	
	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * BezierPlugin 						(!BezierPlugin)
 * ----------------------------------------------------------------
 */
	_gsDefine("plugins.BezierPlugin", ["plugins.TweenPlugin"], function(TweenPlugin) {

		var BezierPlugin = function(props, priority) {
				TweenPlugin.call(this, "bezier", -1);
				this._overwriteProps.pop();
				this._func = {};
				this._round = {};
			},
			p = BezierPlugin.prototype = new TweenPlugin("bezier", 1),
			_RAD2DEG = 180 / Math.PI,
			_DEG2RAD = Math.PI / 180,
			_r1 = [],
			_r2 = [],
			_r3 = [],
			_corProps = {},
			Segment = function Segment(a, b, c, d) {
				this.a = a;
				this.b = b;
				this.c = c;
				this.d = d;
				this.da = d - a;
				this.ca = c - a;
				this.ba = b - a;
			},
			_correlate = ",x,y,z,left,top,right,bottom,marginTop,marginLeft,marginRight,marginBottom,paddingLeft,paddingTop,paddingRight,paddingBottom,backgroundPosition,backgroundPosition_y,",
			bezierThrough = BezierPlugin.bezierThrough = function(values, curviness, quadratic, basic, correlate, prepend) {
				var obj = {},
					props = [],
					i, p, a, j, r, l;
				correlate = (typeof(correlate) === "string") ? ","+correlate+"," : _correlate;
				if (curviness == null) {
					curviness = 1;
				}
				for (p in values[0]) {
					props.push(p);
				}
				_r1.length = _r2.length = _r3.length = 0;
				i = props.length;
				while (--i > -1) {
					p = props[i];
					_corProps[p] = (correlate.indexOf(","+p+",") !== -1);
					obj[p] = _parseAnchors(values, p, _corProps[p], prepend);
				}
				i = _r1.length;
				while (--i > -1) {
					_r1[i] = Math.sqrt(_r1[i]);
					_r2[i] = Math.sqrt(_r2[i]);
				}
				if (!basic) {
					i = props.length;
					while (--i > -1) {
						if (_corProps[p]) {
							a = obj[props[i]];
							l = a.length - 1;
							for (j = 0; j < l; j++) {
								r = a[j+1].da / _r2[j] + a[j].da / _r1[j];
								_r3[j] = (_r3[j] || 0) + r * r;
							}
						}
					}
					i = _r3.length;
					while (--i > -1) {
						_r3[i] = Math.sqrt(_r3[i]);
					}
				}
				i = props.length;
				while (--i > -1) {
					p = props[i];
					_calculateControlPoints(obj[p], curviness, quadratic, basic, _corProps[p]); //this method requires that _parseAnchors() and _setSegmentRatios() ran first so that _r1, _r2, and _r3 values are populated for all properties
				}
				return obj;
			},
			_parseBezierData = function(values, type, prepend) {
				type = type || "soft";
				var obj = {},
					inc = (type === "cubic") ? 3 : 2,
					soft = (type === "soft"),
					props = [],
					a, b, c, d, cur, i, j, l, p, cnt, tmp;
				if (soft && prepend) {
					values = [prepend].concat(values);
				}
				if (values == null || values.length < inc + 1) { throw "invalid Bezier data"; }
				for (p in values[0]) {
					props.push(p);
				}
				i = props.length;
				while (--i > -1) {
					p = props[i];
					obj[p] = cur = [];
					cnt = 0;
					l = values.length;
					for (j = 0; j < l; j++) {
						a = (prepend == null) ? values[j][p] : (typeof( (tmp = values[j][p]) ) === "string" && tmp.charAt(1) === "=") ? prepend[p] + Number(tmp.charAt(0) + tmp.substr(2)) : Number(tmp);
						if (soft) if (j > 1) if (j < l - 1) {
							cur[cnt++] = (a + cur[cnt-2]) / 2;
						}
						cur[cnt++] = a;
					}
					l = cnt - inc + 1;
					cnt = 0;
					for (j = 0; j < l; j += inc) {
						a = cur[j];
						b = cur[j+1];
						c = cur[j+2];
						d = (inc === 2) ? 0 : cur[j+3];
						cur[cnt++] = tmp = (inc === 3) ? new Segment(a, b, c, d) : new Segment(a, (2 * b + a) / 3, (2 * b + c) / 3, c);
					}
					cur.length = cnt;
				}
				return obj;
			},
			_parseAnchors = function(values, p, correlate, prepend) {
				var a = [],
					l, i, p1, p2, p3, tmp;
				if (prepend) {
					values = [prepend].concat(values);
					i = values.length;
					while (--i > -1) {
						if (typeof( (tmp = values[i][p]) ) === "string") if (tmp.charAt(1) === "=") {
							values[i][p] = prepend[p] + Number(tmp.charAt(0) + tmp.substr(2)); //accommodate relative values. Do it inline instead of breaking it out into a function for speed reasons
						}
					}
				}
				l = values.length - 2;
				if (l < 0) {
					a[0] = new Segment(values[0][p], 0, 0, values[(l < -1) ? 0 : 1][p]);
					return a;
				}
				for (i = 0; i < l; i++) {
					p1 = values[i][p];
					p2 = values[i+1][p];
					a[i] = new Segment(p1, 0, 0, p2);
					if (correlate) {
						p3 = values[i+2][p];
						_r1[i] = (_r1[i] || 0) + (p2 - p1) * (p2 - p1);
						_r2[i] = (_r2[i] || 0) + (p3 - p2) * (p3 - p2);
					}
				}
				a[i] = new Segment(values[i][p], 0, 0, values[i+1][p]);
				return a;
			},
			_calculateControlPoints = function(a, curviness, quad, basic, correlate) {
				var l = a.length - 1,
					ii = 0,
					cp1 = a[0].a,
					i, p1, p2, p3, seg, m1, m2, mm, cp2, qb, r1, r2, tl;
				for (i = 0; i < l; i++) {
					seg = a[ii];
					p1 = seg.a;
					p2 = seg.d;
					p3 = a[ii+1].d;

					if (correlate) {
						r1 = _r1[i];
						r2 = _r2[i];
						tl = ((r2 + r1) * curviness * 0.25) / (basic ? 0.5 : _r3[i] || 0.5);
						m1 = p2 - (p2 - p1) * (basic ? curviness * 0.5 : tl / r1);
						m2 = p2 + (p3 - p2) * (basic ? curviness * 0.5 : tl / r2);
						mm = p2 - (m1 + (m2 - m1) * ((r1 * 3 / (r1 + r2)) + 0.5) / 4);
					} else {
						m1 = p2 - (p2 - p1) * curviness * 0.5;
						m2 = p2 + (p3 - p2) * curviness * 0.5;
						mm = p2 - (m1 + m2) / 2;
					}
					m1 += mm;
					m2 += mm;

					seg.c = cp2 = m1;
					if (i !== 0) {
						seg.b = cp1;
					} else {
						seg.b = cp1 = seg.a + (seg.c - seg.a) * 0.6; //instead of placing b on a exactly, we move it inline with c so that if the user specifies an ease like Back.easeIn or Elastic.easeIn which goes BEYOND the beginning, it will do so smoothly.
					}

					seg.da = p2 - p1;
					seg.ca = cp2 - p1;
					seg.ba = cp1 - p1;

					if (quad) {
						qb = cubicToQuadratic(p1, cp1, cp2, p2);
						a.splice(ii, 1, qb[0], qb[1], qb[2], qb[3]);
						ii += 4;
					} else {
						ii++;
					}

					cp1 = m2;
				}
				seg = a[ii];
				seg.b = cp1;
				seg.c = cp1 + (seg.d - cp1) * 0.4; //instead of placing c on d exactly, we move it inline with b so that if the user specifies an ease like Back.easeOut or Elastic.easeOut which goes BEYOND the end, it will do so smoothly.
				seg.da = seg.d - seg.a;
				seg.ca = seg.c - seg.a;
				seg.ba = cp1 - seg.a;
				if (quad) {
					qb = cubicToQuadratic(seg.a, cp1, seg.c, seg.d);
					a.splice(ii, 1, qb[0], qb[1], qb[2], qb[3]);
				}
			},
			cubicToQuadratic = BezierPlugin.cubicToQuadratic = function(a, b, c, d) {
				var q1 = {a:a},
					q2 = {},
					q3 = {},
					q4 = {c:d},
					mab = (a + b) / 2,
					mbc = (b + c) / 2,
					mcd = (c + d) / 2,
					mabc = (mab + mbc) / 2,
					mbcd = (mbc + mcd) / 2,
					m8 = (mbcd - mabc) / 8;
				q1.b = mab + (a - mab) / 4;
				q2.b = mabc + m8;
				q1.c = q2.a = (q1.b + q2.b) / 2;
				q2.c = q3.a = (mabc + mbcd) / 2;
				q3.b = mbcd - m8;
				q4.b = mcd + (d - mcd) / 4;
				q3.c = q4.a = (q3.b + q4.b) / 2;
				return [q1, q2, q3, q4];
			},
			quadraticToCubic = BezierPlugin.quadraticToCubic = function(a, b, c) {
				return new Segment(a, (2 * b + a) / 3, (2 * b + c) / 3, c);
			},
			_parseLengthData = function(obj, resolution) {
				resolution = resolution >> 0 || 6;
				var a = [],
					lengths = [],
					d = 0,
					total = 0,
					threshold = resolution - 1,
					segments = [],
					curLS = [], //current length segments array
					p, i, l, index;
				for (p in obj) {
					_addCubicLengths(obj[p], a, resolution);
				}
				l = a.length;
				for (i = 0; i < l; i++) {
					d += Math.sqrt(a[i]);
					index = i % resolution;
					curLS[index] = d;
					if (index === threshold) {
						total += d;
						index = (i / resolution) >> 0;
						segments[index] = curLS;
						lengths[index] = total;
						d = 0;
						curLS = [];
					}
				}
				return {length:total, lengths:lengths, segments:segments};
			},
			_addCubicLengths = function(a, steps, resolution) {
				var inc = 1 / resolution,
					j = a.length,
					d, d1, s, da, ca, ba, p, i, inv, bez, index;
				while (--j > -1) {
					bez = a[j];
					s = bez.a;
					da = bez.d - s;
					ca = bez.c - s;
					ba = bez.b - s;
					d = d1 = 0;
					for (i = 1; i <= resolution; i++) {
						p = inc * i;
						inv = 1 - p;
						d = d1 - (d1 = (p * p * da + 3 * inv * (p * ca + inv * ba)) * p);
						index = j * resolution + i - 1;
						steps[index] = (steps[index] || 0) + d * d;
					}
				}
			};


		p.constructor = BezierPlugin;
		BezierPlugin.API = 2;

		BezierPlugin._cssRegister = function() {
			var CSSPlugin = window.com.greensock.plugins.CSSPlugin;
			if (!CSSPlugin) {
				return;
			}
			var _internals = CSSPlugin._internals,
				_parseToProxy = _internals._parseToProxy,
				_setPluginRatio = _internals._setPluginRatio,
				CSSPropTween = _internals.CSSPropTween;
			_internals._registerComplexSpecialProp("bezier", null, function(t, e, prop, cssp, pt, plugin) {
				if (e instanceof Array) {
					e = {values:e};
				}
				plugin = new BezierPlugin();
				var values = e.values,
					l = values.length - 1,
					pluginValues = [],
					v = {},
					i, p, data, transPT;
				if (l < 0) {
					return pt;
				}
				for (i = 0; i <= l; i++) {
					data = _parseToProxy(t, values[i], cssp, pt, plugin, (l !== i));
					pluginValues[i] = data.end;
				}
				for (p in e) {
					v[p] = e[p]; //duplicate the vars object because we need to alter some things which would cause problems if the user plans to reuse the same vars object for another tween.
				}
				v.values = pluginValues;
				pt = new CSSPropTween(t, "bezier", 0, 0, data.pt, 2);
				pt.data = data;
				pt.plugin = plugin;
				pt.setRatio = _setPluginRatio;
				if (v.autoRotate === 0) {
					v.autoRotate = true;
				}
				if (v.autoRotate) if (!(v.autoRotate instanceof Array)) {
					i = (v.autoRotate === true) ? 0 : Number(v.autoRotate) * _DEG2RAD;
					v.autoRotate = (data.end.left != null) ? [["left","top","rotation",i,true]] : (data.end.x != null) ? [["x","y","rotation",i,true]] : false;
				}
				if (v.autoRotate) {
					if (!cssp._transform) {
						cssp._enableTransforms(false);
					}
					data.autoRotate = cssp._target._gsTransform;
				}
				plugin._onInitTween(data.proxy, v, cssp._tween);
				return pt;
			});
		};


		p._onInitTween = function(target, vars, tween) {
			this._target = target;
			if (vars instanceof Array) {
				vars = {values:vars};
			}
			this._props = [];
			this._timeRes = (vars.timeResolution == null) ? 6 : parseInt(vars.timeResolution);
			var values = vars.values || [],
				first = {},
				second = values[0],
				autoRotate = vars.autoRotate || tween.vars.orientToBezier,
				p, isFunc, i, j, prepend;

			this._autoRotate = autoRotate ? (autoRotate instanceof Array) ? autoRotate : [["x","y","rotation",((autoRotate === true) ? 0 : Number(autoRotate) || 0)]] : null;
			for (p in second) {
				this._props.push(p);
			}

			i = this._props.length;
			while (--i > -1) {
				p = this._props[i];

				this._overwriteProps.push(p);
				isFunc = this._func[p] = (typeof(target[p]) === "function");
				first[p] = (!isFunc) ? parseFloat(target[p]) : target[ ((p.indexOf("set") || typeof(target["get" + p.substr(3)]) !== "function") ? p : "get" + p.substr(3)) ]();
				if (!prepend) if (first[p] !== values[0][p]) {
					prepend = first;
				}
			}
			this._beziers = (vars.type !== "cubic" && vars.type !== "quadratic" && vars.type !== "soft") ? bezierThrough(values, isNaN(vars.curviness) ? 1 : vars.curviness, false, (vars.type === "thruBasic"), vars.correlate, prepend) : _parseBezierData(values, vars.type, first);
			this._segCount = this._beziers[p].length;

			if (this._timeRes) {
				var ld = _parseLengthData(this._beziers, this._timeRes);
				this._length = ld.length;
				this._lengths = ld.lengths;
				this._segments = ld.segments;
				this._l1 = this._li = this._s1 = this._si = 0;
				this._l2 = this._lengths[0];
				this._curSeg = this._segments[0];
				this._s2 = this._curSeg[0];
				this._prec = 1 / this._curSeg.length;
			}

			if ((autoRotate = this._autoRotate)) {
				if (!(autoRotate[0] instanceof Array)) {
					this._autoRotate = autoRotate = [autoRotate];
				}
				i = autoRotate.length;
				while (--i > -1) {
					for (j = 0; j < 3; j++) {
						p = autoRotate[i][j];
						this._func[p] = (typeof(target[p]) === "function") ? target[ ((p.indexOf("set") || typeof(target["get" + p.substr(3)]) !== "function") ? p : "get" + p.substr(3)) ] : false;
					}
				}
			}
			return true;
		};

		//gets called every time the tween updates, passing the new ratio (typically a value between 0 and 1, but not always (for example, if an Elastic.easeOut is used, the value can jump above 1 mid-tween). It will always start and 0 and end at 1.
		p.setRatio = function(v) {
			var segments = this._segCount,
				func = this._func,
				target = this._target,
				curIndex, inv, i, p, b, t, val, l, lengths, curSeg;
			if (!this._timeRes) {
				curIndex = (v < 0) ? 0 : (v >= 1) ? segments - 1 : (segments * v) >> 0;
				t = (v - (curIndex * (1 / segments))) * segments;
			} else {
				lengths = this._lengths;
				curSeg = this._curSeg;
				v *= this._length;
				i = this._li;
				//find the appropriate segment (if the currently cached one isn't correct)
				if (v > this._l2 && i < segments - 1) {
					l = segments - 1;
					while (i < l && (this._l2 = lengths[++i]) <= v) {	}
					this._l1 = lengths[i-1];
					this._li = i;
					this._curSeg = curSeg = this._segments[i];
					this._s2 = curSeg[(this._s1 = this._si = 0)];
				} else if (v < this._l1 && i > 0) {
					while (i > 0 && (this._l1 = lengths[--i]) >= v) { 	}
					if (i === 0 && v < this._l1) {
						this._l1 = 0;
					} else {
						i++;
					}
					this._l2 = lengths[i];
					this._li = i;
					this._curSeg = curSeg = this._segments[i];
					this._s1 = curSeg[(this._si = curSeg.length - 1) - 1] || 0;
					this._s2 = curSeg[this._si];
				}
				curIndex = i;
				//now find the appropriate sub-segment (we split it into the number of pieces that was defined by "precision" and measured each one)
				v -= this._l1;
				i = this._si;
				if (v > this._s2 && i < curSeg.length - 1) {
					l = curSeg.length - 1;
					while (i < l && (this._s2 = curSeg[++i]) <= v) {	}
					this._s1 = curSeg[i-1];
					this._si = i;
				} else if (v < this._s1 && i > 0) {
					while (i > 0 && (this._s1 = curSeg[--i]) >= v) {	}
					if (i === 0 && v < this._s1) {
						this._s1 = 0;
					} else {
						i++;
					}
					this._s2 = curSeg[i];
					this._si = i;
				}
				t = (i + (v - this._s1) / (this._s2 - this._s1)) * this._prec;
			}
			inv = 1 - t;

			i = this._props.length;
			while (--i > -1) {
				p = this._props[i];
				b = this._beziers[p][curIndex];
				val = (t * t * b.da + 3 * inv * (t * b.ca + inv * b.ba)) * t + b.a;
				if (this._round[p]) {
					val = (val + ((val > 0) ? 0.5 : -0.5)) >> 0;
				}
				if (func[p]) {
					target[p](val);
				} else {
					target[p] = val;
				}
			}

			if (this._autoRotate) {
				var ar = this._autoRotate,
					b2, x1, y1, x2, y2, add, conv;
				i = ar.length;
				while (--i > -1) {
					p = ar[i][2];
					add = ar[i][3] || 0;
					conv = (ar[i][4] === true) ? 1 : _RAD2DEG;
					b = this._beziers[ar[i][0]][curIndex];
					b2 = this._beziers[ar[i][1]][curIndex];

					x1 = b.a + (b.b - b.a) * t;
					x2 = b.b + (b.c - b.b) * t;
					x1 += (x2 - x1) * t;
					x2 += ((b.c + (b.d - b.c) * t) - x2) * t;

					y1 = b2.a + (b2.b - b2.a) * t;
					y2 = b2.b + (b2.c - b2.b) * t;
					y1 += (y2 - y1) * t;
					y2 += ((b2.c + (b2.d - b2.c) * t) - y2) * t;

					val = Math.atan2(y2 - y1, x2 - x1) * conv + add;

					if (func[p]) {
						func[p].call(target, val);
					} else {
						target[p] = val;
					}
				}
			}
		};

		p._roundProps = function(lookup, value) {
			var op = this._overwriteProps,
				i = op.length;
			while (--i > -1) {
				if (lookup[op[i]] || lookup.bezier || lookup.bezierThrough) {
					this._round[op[i]] = value;
				}
			}
		};

		p._kill = function(lookup) {
			var a = this._props,
				p, i;
			for (p in this._beziers) {
				if (p in lookup) {
					delete this._beziers[p];
					delete this._func[p];
					i = a.length;
					while (--i > -1) {
						if (a[i] === p) {
							a.splice(i, 1);
						}
					}
				}
			}
			return TweenPlugin.prototype._kill.call(this, lookup);
		};

		TweenPlugin.activate([BezierPlugin]);
		return BezierPlugin;

	}, true);






	
	
	
	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * CSSPlugin
 * ----------------------------------------------------------------
 */
	_gsDefine("plugins.CSSPlugin", ["plugins.TweenPlugin","TweenLite"], function(TweenPlugin, TweenLite) {

		"use strict";

		/** @constructor **/
		var CSSPlugin = function() {
				TweenPlugin.call(this, "css");
				this._overwriteProps.length = 0;
			},
			_hasPriority, //turns true whenever a CSSPropTween instance is created that has a priority other than 0. This helps us discern whether or not we should spend the time organizing the linked list or not after a CSSPlugin's _onInitTween() method is called.
			_suffixMap, //we set this in _onInitTween() each time as a way to have a persistent variable we can use in other methods like _parse() without having to pass it around as a parameter and we keep _parse() decoupled from a particular CSSPlugin instance
			_cs, //computed style (we store this in a shared variable to conserve memory and make minification tighter
			_overwriteProps, //alias to the currently instantiating CSSPlugin's _overwriteProps array. We use this closure in order to avoid having to pass a reference around from method to method and aid in minification.
			_specialProps = {},
			p = CSSPlugin.prototype = new TweenPlugin("css");

		p.constructor = CSSPlugin;
		CSSPlugin.version = 1.661;
		CSSPlugin.API = 2;
		CSSPlugin.defaultTransformPerspective = 0;
		p = "px"; //we'll reuse the "p" variable to keep file size down
		CSSPlugin.suffixMap = {top:p, right:p, bottom:p, left:p, width:p, height:p, fontSize:p, padding:p, margin:p, perspective:p};


		var _numExp = /(?:\d|\-\d|\.\d|\-\.\d)+/g,
			_relNumExp = /(?:\d|\-\d|\.\d|\-\.\d|\+=\d|\-=\d|\+=.\d|\-=\.\d)+/g,
			_valuesExp = /(?:\+=|\-=|\-|\b)[\d\-\.]+[a-zA-Z0-9]*(?:%|\b)/gi, //finds all the values that begin with numbers or += or -= and then a number. Includes suffixes. We use this to split complex values apart like "1px 5px 20px rgb(255,102,51)"
			//_clrNumExp = /(?:\b(?:(?:rgb|rgba)\(.+?\))|\B#.+?\b)/, //only finds rgb(), rgba(), and # (hexadecimal) values but NOT color names like red, blue, etc.
			_NaNExp = /[^\d\-\.]/g,
			_suffixExp = /(?:\d|\-|\+|=|#|\.)*/g,
			_opacityExp = /opacity *= *([^)]*)/,
			_opacityValExp = /opacity:([^;]*)/,
			_capsExp = /([A-Z])/g,
			_camelExp = /-([a-z])/gi,
			_urlExp = /(^(?:url\(\"|url\())|(?:(\"\))$|\)$)/gi, //for pulling out urls from url(...) or url("...") strings (some browsers wrap urls in quotes, some don't when reporting things like backgroundImage)
			_camelFunc = function(s, g) { return g.toUpperCase(); },
			_horizExp = /(?:Left|Right|Width)/i,
			_ieGetMatrixExp = /(M11|M12|M21|M22)=[\d\-\.e]+/gi,
			_ieSetMatrixExp = /progid\:DXImageTransform\.Microsoft\.Matrix\(.+?\)/i,
			_DEG2RAD = Math.PI / 180,
			_RAD2DEG = 180 / Math.PI,
			_forcePT = {},
			_doc = document,
			_tempDiv = _doc.createElement("div"),
			_tempImg = _doc.createElement("img"),
			_internals = CSSPlugin._internals = {_specialProps:_specialProps}, //provides a hook to a few internal methods that we need to access from inside other plugins
			_agent = navigator.userAgent,
			_autoRound,
			_reqSafariFix, //we won't apply the Safari transform fix until we actually come across a tween that affects a transform property (to maintain best performance).

			_isSafari,
			_isFirefox, //Firefox has a bug that causes 3D transformed elements to randomly disappear unless a repaint is forced after each update on each element.
			_isSafariLT6, //Safari (and Android 4 which uses a flavor of Safari) has a bug that prevents changes to "top" and "left" properties from rendering properly if changed on the same frame as a transform UNLESS we set the element's WebkitBackfaceVisibility to hidden (weird, I know). Doing this for Android 3 and earlier seems to actually cause other problems, though (fun!)
			_ieVers,
			_supportsOpacity = (function() { //we set _isSafari, _ieVers, _isFirefox, and _supportsOpacity all in one function here to reduce file size slightly, especially in the minified version.
				var i = _agent.indexOf("Android"),
					d = _doc.createElement("div"), a;

				_isSafari = (_agent.indexOf("Safari") !== -1 && _agent.indexOf("Chrome") === -1 && (i === -1 || Number(_agent.substr(i+8, 1)) > 3));
				_isSafariLT6 = (_isSafari && (Number(_agent.substr(_agent.indexOf("Version/")+8, 1)) < 6));
				_isFirefox = (_agent.indexOf("Firefox") !== -1);

				(/MSIE ([0-9]{1,}[\.0-9]{0,})/).exec(_agent);
				_ieVers = parseFloat( RegExp.$1 );

				d.innerHTML = "<a style='top:1px;opacity:.55;'>a</a>";
				a = d.getElementsByTagName("a")[0];
				return a ? /^0.55/.test(a.style.opacity) : false;
			}()),
			_getIEOpacity = function(v) {
				return (_opacityExp.test( ((typeof(v) === "string") ? v : (v.currentStyle ? v.currentStyle.filter : v.style.filter) || "") ) ? ( parseFloat( RegExp.$1 ) / 100 ) : 1);
			},
			_log = function(s) {//for logging messages, but in a way that won't throw errors in old versions of IE.
				if (window.console) {
					console.log(s);
				}
			},
			_prefixCSS = "", //the non-camelCase vendor prefix like "-o-", "-moz-", "-ms-", or "-webkit-"
			_prefix = "", //camelCase vendor prefix like "O", "ms", "Webkit", or "Moz".

			//@private feed in a camelCase property name like "transform" and it will check to see if it is valid as-is or if it needs a vendor prefix. It returns the corrected camelCase property name (i.e. "WebkitTransform" or "MozTransform" or "transform" or null if no such property is found, like if the browser is IE8 or before, "transform" won't be found at all)
			_checkPropPrefix = function(p, e) {
				e = e || _tempDiv;
				var s = e.style,
					a, i;
				if (s[p] !== undefined) {
					return p;
				}
				p = p.charAt(0).toUpperCase() + p.substr(1);
				a = ["O","Moz","ms","Ms","Webkit"];
				i = 5;
				while (--i > -1 && s[a[i]+p] === undefined) { }
				if (i >= 0) {
					_prefix = (i === 3) ? "ms" : a[i];
					_prefixCSS = "-" + _prefix.toLowerCase() + "-";
					return _prefix + p;
				}
				return null;
			},

			_getComputedStyle = _doc.defaultView ? _doc.defaultView.getComputedStyle : function(o,s) {},

			/**
			 * @private Returns the css style for a particular property of an element. For example, to get whatever the current "left" css value for an element with an ID of "myElement", you could do:
			 * var currentLeft = CSSPlugin.getStyle( document.getElementById("myElement"), "left");
			 *
			 * @param {!Object} t Target element whose style property you want to query
			 * @param {!string} p Property name (like "left" or "top" or "marginTop", etc.)
			 * @param {Object=} cs Computed style object. This just provides a way to speed processing if you're going to get several properties on the same element in quick succession - you can reuse the result of the getComputedStyle() call.
			 * @param {boolean=} calc If true, the value will not be read directly from the element's "style" property (if it exists there), but instead the getComputedStyle() result will be used. This can be useful when you want to ensure that the browser itself is interpreting the value.
			 * @param {string=} dflt Default value that should be returned in the place of null, "none", "auto" or "auto auto".
			 * @return {?string} The current property value
			 */
			_getStyle = CSSPlugin.getStyle = function(t, p, cs, calc, dflt) {
				var rv;
				if (!_supportsOpacity) if (p === "opacity") { //several versions of IE don't use the standard "opacity" property - they use things like filter:alpha(opacity=50), so we parse that here.
					return _getIEOpacity(t);
				}
				if (!calc && t.style[p]) {
					rv = t.style[p];
				} else if ((cs = cs || _getComputedStyle(t, null))) {
					t = cs.getPropertyValue(p.replace(_capsExp, "-$1").toLowerCase());
					rv = (t || cs.length) ? t : cs[p]; //Opera behaves VERY strangely - length is usually 0 and cs[p] is the only way to get accurate results EXCEPT when checking for -o-transform which only works with cs.getPropertyValue()!
				} else if (t.currentStyle) {
					cs = t.currentStyle;
					rv = cs[p];
				}
				return (dflt != null && (!rv || rv === "none" || rv === "auto" || rv === "auto auto")) ? dflt : rv;
			},

			//@private returns at object containing ALL of the style properties in camelCase and their associated values.
			_getAllStyles = function(t, cs, keepOverwritten) {
				var s = {},
					pt = t._gsOverwrittenClassNamePT,
					i, tr;

				if (pt && !keepOverwritten) {
					while (pt) {
						pt.setRatio(0);
						pt = pt._next;
					}
					t._gsOverwrittenClassNamePT = null;
				}

				if ((cs = cs || _getComputedStyle(t, null))) {
					if ((i = cs.length)) {
						while (--i > -1) {
							s[cs[i].replace(_camelExp, _camelFunc)] = cs.getPropertyValue(cs[i]);
						}
					} else { //Opera behaves differently - cs.length is always 0, so we must do a for...in loop.
						for (i in cs) {
							s[i] = cs[i];
						}
					}
				} else if ((cs = t.currentStyle || t.style)) {
					for (i in cs) {
						s[i.replace(_camelExp, _camelFunc)] = cs[i];
					}
				}
				if (!_supportsOpacity) {
					s.opacity = _getIEOpacity(t);
				}
				tr = _getTransform(t, cs, false);
				s.rotation = tr.rotation * _RAD2DEG;
				s.rotationX = tr.rotationX * _RAD2DEG;
				s.rotationY = tr.rotationY * _RAD2DEG;
				s.skewX = tr.skewX * _RAD2DEG;
				s.scaleX = tr.scaleX;
				s.scaleY = tr.scaleY;
				s.scaleZ = tr.scaleZ;
				s.x = tr.x;
				s.y = tr.y;
				s.z = tr.z;
				if (s.filters) {
					delete s.filters;
				}
				return s;
			},

			//@private analyzes two style objects (as returned by _getAllStyles()) and only looks for differences between them that contain tweenable values (like a number or color). It returns an object a "difs" property which refers to an object containing only those isolated properties and values for tweening, and a "firstMPT" property which refers to the first MiniPropTween instance in a linked list that recorded all the starting values of the different properties so that we can revert to them at the end or beginning of the tween - we don't want the cascading to get messed up
			_cssDif = function(t, s1, s2, vars) {
				var difs = {},
					style = t.style,
					val, p, mpt;
				for (p in s2) {
					if (p !== "cssText") if (p !== "length") if (isNaN(p)) if (s1[p] !== (val = s2[p])) if (p.indexOf("Origin") === -1) if (typeof(val) === "number" || typeof(val) === "string") {
						difs[p] = ((val === "" || val === "auto" || val === "none") && typeof(s1[p]) === "string" && s1[p].replace(_NaNExp, "") !== "") ? 0 : val; //if the ending value is defaulting ("" or "auto"), we check the starting value and if it can be parsed into a number (a string which could have a suffix too, like 700px), then we swap in 0 for "" or "auto" so that things actually tween.
						if (style[p] !== undefined) {
							mpt = new MiniPropTween(style, p, style[p], mpt);
						}
					}
				}
				if (vars) {
					for (p in vars) { //copy properties (except className)
						if (p !== "className") {
							difs[p] = vars[p];
						}
					}
				}
				return {difs:difs, firstMPT:mpt};
			},
			_dimensions = {width:["Left","Right"], height:["Top","Bottom"]},
			_margins = ["marginLeft","marginRight","marginTop","marginBottom"],

			/**
			 * @private Gets the width or height of an element
			 * @param {!Object} t Target element
			 * @param {!string} p Property name ("width" or "height")
			 * @param {Object=} cs Computed style object (if one exists). Just a speed optimization.
			 * @return {number} Dimension (in pixels)
			 */
			_getDimension = function(t, p, cs) {
				var v = parseFloat((p === "width") ? t.offsetWidth : t.offsetHeight),
					a = _dimensions[p],
					i = a.length;
				cs = cs || _getComputedStyle(t, null);
				while (--i > -1) {
					v -= parseFloat( _getStyle(t, "padding" + a[i], cs, true) ) || 0;
					v -= parseFloat( _getStyle(t, "border" + a[i] + "Width", cs, true) ) || 0;
				}
				return v;
			},

			/**
			 * @private Pass the target element, the property name, the numeric value, and the suffix (like "%", "em", "px", etc.) and it will spit back the equivalent pixel number.
			 * @param {!Object} t Target element
			 * @param {!string} p Property name (like "left", "top", "marginLeft", etc.)
			 * @param {!number} v Value
			 * @param {string=} sfx Suffix (like "px" or "%" or "em")
			 * @param {boolean=} recurse If true, the call is a recursive one. In some browsers (like IE7/8), occasionally the value isn't accurately reported initially, but if we run the function again it will take effect.
			 * @return {number} value in pixels
			 */
			_convertToPixels = function(t, p, v, sfx, recurse) {
				if (sfx === "px" || !sfx) { return v; }
				if (sfx === "auto" || !v) { return 0; }
				var horiz = _horizExp.test(p),
					node = t,
					style = _tempDiv.style,
					neg = (v < 0),
					pix;
				if (neg) {
					v = -v;
				}
				if (sfx === "%" && p.indexOf("border") !== -1) {
					pix = (v / 100) * (horiz ? t.clientWidth : t.clientHeight);
				} else {
					style.cssText = "border-style:solid; border-width:0; position:absolute; line-height:0;";
					if (sfx === "%" || sfx === "em" || !node.appendChild) {
						node = t.parentNode || _doc.body;
						style[(horiz ? "width" : "height")] = v + sfx;
					} else {
						style[(horiz ? "borderLeftWidth" : "borderTopWidth")] = v + sfx;
					}
					node.appendChild(_tempDiv);
					pix = parseFloat(_tempDiv[(horiz ? "offsetWidth" : "offsetHeight")]);
					node.removeChild(_tempDiv);
					if (pix === 0 && !recurse) {
						pix = _convertToPixels(t, p, v, sfx, true);
					}
				}
				return neg ? -pix : pix;
			},

			//@private Parses position-related complex strings like "top left" or "50px 10px" or "70% 20%", etc. which are used for things like transformOrigin or backgroundPosition. Optionally decorates a supplied object (recObj) with the following properties: "ox" (offsetX), "oy" (offsetY), "oxp" (if true, "ox" is a percentage not a pixel value), and "oxy" (if true, "oy" is a percentage not a pixel value)
			_parsePosition = function(v, recObj) {
				if (v == null || v === "" || v === "auto" || v === "auto auto") { //note: Firefox uses "auto auto" as default whereas Chrome uses "auto".
					v = "0 0";
				}
				var a = v.split(" "),
					x = (v.indexOf("left") !== -1) ? "0%" : (v.indexOf("right") !== -1) ? "100%" : a[0],
					y = (v.indexOf("top") !== -1) ? "0%" : (v.indexOf("bottom") !== -1) ? "100%" : a[1];
				if (y == null) {
					y = "0";
				} else if (y === "center") {
					y = "50%";
				}
				if (x === "center" || isNaN(parseFloat(x))) { //remember, the user could flip-flop the values and say "bottom center" or "center bottom", etc. "center" is ambiguous because it could be used to describe horizontal or vertical, hence the isNaN().
					x = "50%";
				}
				if (recObj) {
					recObj.oxp = (x.indexOf("%") !== -1);
					recObj.oyp = (y.indexOf("%") !== -1);
					recObj.oxr = (x.charAt(1) === "=");
					recObj.oyr = (y.charAt(1) === "=");
					recObj.ox = parseFloat(x.replace(_NaNExp, ""));
					recObj.oy = parseFloat(y.replace(_NaNExp, ""));
				}
				return x + " " + y + ((a.length > 2) ? " " + a[2] : "");
			},

			/**
			 * @private Takes an ending value (typically a string, but can be a number) and a starting value and returns the change between the two, looking for relative value indicators like += and -= and it also ignores suffixes (but make sure the ending value starts with a number or +=/-= and that the starting value is a NUMBER!)
			 * @param {(number|string)} e End value which is typically a string, but could be a number
			 * @param {(number|string)} b Beginning value which is typically a string but could be a number
			 * @return {number} Amount of change between the beginning and ending values (relative values that have a "+=" or "-=" are recognized)
			 */
			_parseChange = function(e, b) {
				return (typeof(e) === "string" && e.charAt(1) === "=") ? parseInt(e.charAt(0) + "1") * parseFloat(e.substr(2)) : parseFloat(e) - parseFloat(b);
			},

			/**
			 * @private Takes a value and a default number, checks if the value is relative, null, or numeric and spits back a normalized number accordingly. Primarily used in the _parseTransform() function.
			 * @param {Object} v Value to be parsed
			 * @param {!number} d Default value (which is also used for relative calculations if "+=" or "-=" is found in the first parameter)
			 * @return {number} Parsed value
			 */
			_parseVal = function(v, d) {
				return (v == null) ? d : (typeof(v) === "string" && v.charAt(1) === "=") ? parseInt(v.charAt(0) + "1") * Number(v.substr(2)) + d : parseFloat(v);
			},

			/**
			 * @private Translates strings like "40deg" or "40" or 40rad" or "+=40deg" to a numeric radian angle, optionally relative to a default value (if "+=" or "-=" prefix is found)
			 * @param {Object} v Value to be parsed
			 * @param {!number} d Default value (which is also used for relative calculations if "+=" or "-=" is found in the first parameter)
			 * @return {number} parsed angle in radians
			 */
			_parseAngle = function(v, d) {
				if (v == null) {
					return d;
				}
				var m = (v.indexOf("rad") === -1) ? _DEG2RAD : 1,
					r = (v.charAt(1) === "=");
				v = Number(v.replace(_NaNExp, "")) * m;
				return r ? v + d : v;
			},

			/**
			 * @private Translates an ending rotation value (could be a string or number, relative or not) into a radian number representing the shortest direction (no more than 180 degrees away from the beginning, or Math.PI radians). For example, if b is 0 and e is "270deg", this method would return -Math.PI/2 (-90 degrees).
			 * @param {(number|string)} e ending/destination rotation value (can be a number or string. If a string, it can be relative or not)
			 * @param {number} b beginning value
			 * @return {number} rotation value in radians
			 */
			_parseShortRotation = function(e, b) {
				var r = (typeof(e) === "number") ? e * _DEG2RAD : _parseAngle(e, b),
					dif = (r - b) % (Math.PI * 2);
				if (dif !== dif % Math.PI) {
					dif += Math.PI * ((dif < 0) ? 2 : -2);
				}
				return b + dif;
			},

			_colorLookup = {aqua:[0,255,255],
				lime:[0,255,0],
				silver:[192,192,192],
				black:[0,0,0],
				maroon:[128,0,0],
				teal:[0,128,128],
				blue:[0,0,255],
				navy:[0,0,128],
				white:[255,255,255],
				fuchsia:[255,0,255],
				olive:[128,128,0],
				yellow:[255,255,0],
				orange:[255,165,0],
				gray:[128,128,128],
				purple:[128,0,128],
				green:[0,128,0],
				red:[255,0,0],
				pink:[255,192,203],
				cyan:[0,255,255],
				transparent:[255,255,255,0]},

			/**
			 * @private Parses a color (like #9F0, #FF9900, or rgb(255,51,153)) into an array with 3 elements for red, green, and blue. Also handles rgba() values (splits into array of 4 elements of course)
			 * @param {(string|number)} v The value the should be parsed which could be a string like #9F0 or rgb(255,102,51) or rgba(255,0,0,0.5) or it could be a number like 0xFF00CC or even a named color like red, blue, purple, etc.
			 * @return {Array.<number>} An array containing red, green, and blue (and optionally alpha) in that order.
			 */
			_parseColor = function(v) {
				if (!v || v === "") {
					return _colorLookup.black;
				} else if (_colorLookup[v]) {
					return _colorLookup[v];
				} else if (typeof(v) === "number") {
					return [v >> 16, (v >> 8) & 255, v & 255];
				} else if (v.charAt(0) === "#") {
					if (v.length === 4) { //for shorthand like #9F0
						var c1 = v.charAt(1),
							c2 = v.charAt(2),
							c3 = v.charAt(3);
						v = "#" + c1 + c1 + c2 + c2 + c3 + c3;
					}
					v = parseInt(v.substr(1), 16);
					return [v >> 16, (v >> 8) & 255, v & 255];
				}
				v = v.match(_numExp)  || _colorLookup.transparent;
				v[0] = Number(v[0]);
				v[1] = Number(v[1]);
				v[2] = Number(v[2]);
				if (v.length > 3) {
					v[3] = Number(v[3]);
				}
				return v;
			},
			_colorExp = "(?:\\b(?:(?:rgb|rgba)\\(.+?\\))|\\B#.+?\\b"; //we'll dynamically build this Regular Expression to conserve file size. After building it, it will be able to find rgb(), rgba(), # (hexadecimal), and named color values like red, blue, purple, etc.

		for (p in _colorLookup) {
			_colorExp += "|" + p + "\\b";
		}
		_colorExp = new RegExp(_colorExp+")", "gi");


		/**
		 * @private Returns a formatter function that handles taking a string (or number in some cases) and returning a consistently formatted one in terms of delimiters, quantity of values, etc. For example, we may get boxShadow values defined as "0px red" or "0px 0px 10px rgb(255,0,0)" or "0px 0px 20px 20px #F00" and we need to ensure that what we get back is described with 4 numbers and a color. This allows us to feed it into the _parseComplex() method and split the values up appropriately. The neat thing about this _getFormatter() function is that the dflt defines a pattern as well as a default, so for example, _getFormatter("0px 0px 0px 0px #777", true) not only sets the default as 0px for all distances and #777 for the color, but also sets the pattern such that 4 numbers and a color will always get returned.
		 * @param {!string} dflt The default value and pattern to follow. So "0px 0px 0px 0px #777" will ensure that 4 numbers and a color will always get returned.
		 * @param {boolean=} clr If true, the values should be searched for color-related data. For example, boxShadow values typically contain a color whereas borderRadius don't.
		 * @param {boolean=} collapsible If true, the value is a top/left/right/bottom style one that acts like margin or padding, where if only one value is received, it's used for all 4; if 2 are received, the first is duplicated for 3rd (bottom) and the 2nd is duplicated for the 4th spot (left), etc.
		 * @return {Function} formatter function
		 */
		var _getFormatter = function(dflt, clr, collapsible) {
				if (dflt == null) {
					return function(v) {return v;};
				}
				var dColor = clr ? (dflt.match(_colorExp) || [""])[0] : "",
					dVals = dflt.split(dColor).join("").match(_valuesExp) || [],
					pfx = dflt.substr(0, dflt.indexOf(dVals[0])),
					sfx = (dflt.charAt(dflt.length - 1) === ")") ? ")" : "",
					delim = (dflt.indexOf(" ") !== -1) ? " " : ",",
					numVals = dVals.length,
					dSfx = (numVals > 0) ? dVals[0].replace(_numExp, "") : "";
				if (clr) {
					return function(v) {
						if (typeof(v) === "number") {
							v += dSfx;
						}
						var color = (v.match(_colorExp) || [dColor])[0],
							vals = v.split(color).join("").match(_valuesExp) || [],
							i = vals.length;
						if (numVals > i--) {
							while (++i < numVals) {
								vals[i] = collapsible ? vals[(((i - 1) / 2) >> 0)] : dVals[i];
							}
						}
						return pfx + vals.join(delim) + delim + color + sfx;
					};

				} else {
					return function(v) {
						if (typeof(v) === "number") {
							v += dSfx;
						}
						var vals = v.match(_valuesExp) || [],
							i = vals.length;
						if (numVals > i--) {
							while (++i < numVals) {
								vals[i] = collapsible ? vals[(((i - 1) / 2) >> 0)] : dVals[i];
							}
						}
						return pfx + vals.join(delim) + sfx;
					};
				}
			},

			/**
			 * @private returns a formatter function that's used for edge-related values like marginTop, marginLeft, paddingBottom, paddingRight, etc. Just pass a comma-delimited list of property names related to the edges.
			 * @param {!string} props a comma-delimited list of property names in order from top to left, like "marginTop,marginRight,marginBottom,marginLeft"
			 * @return {Function} a formatter function
			 */
			_getEdgeParser = function(props) {
				props = props.split(",");
				return function(t, e, p, cssp, pt, plugin, vars) {
					var a = (e + "").split(" "),
						i;
					vars = {};
					for (i = 0; i < 4; i++) {
						vars[props[i]] = a[i] = a[i] || a[(((i - 1) / 2) >> 0)];
					}
					return cssp.parse(t, vars, pt, plugin);
				};
			},

			//@private used when other plugins must tween values first, like BezierPlugin or ThrowPropsPlugin, etc. That plugin's setRatio() gets called first so that the values are updated, and then we loop through the MiniPropTweens  which handle copying the values into their appropriate slots so that they can then be applied correctly in the main CSSPlugin setRatio() method. Remember, we typically create a proxy object that has a bunch of uniquely-named properties that we feed to the sub-plugin and it does its magic normally, and then we must interpret those values and apply them to the css because often numbers must get combined/concatenated, suffixes added, etc. to work with css, like boxShadow could have 4 values plus a color.
			_setPluginRatio = _internals._setPluginRatio = function(v) {
				this.plugin.setRatio(v);
				var d = this.data,
					proxy = d.proxy,
					mpt = d.firstMPT,
					min = 0.000001,
					val, pt, i, str;
				while (mpt) {
					val = proxy[mpt.v];
					if (mpt.r) {
						val = (val > 0) ? (val + 0.5) >> 0 : (val - 0.5) >> 0;
					} else if (val < min && val > -min) {
						val = 0;
					}
					mpt.t[mpt.p] = val;
					mpt = mpt._next;
				}
				if (d.autoRotate) {
					d.autoRotate.rotation = proxy.rotation;
				}
				//at the end, we must set the CSSPropTween's "e" (end) value dynamically here because that's what is used in the final setRatio() method.
				if (v === 1) {
					mpt = d.firstMPT;
					while (mpt) {
						pt = mpt.t;
						if (!pt.type) {
							pt.e = pt.s + pt.xs0;
						} else if (pt.type === 1) {
							str = pt.xs0 + pt.s + pt.xs1;
							for (i = 1; i < pt.l; i++) {
								str += pt["xn"+i] + pt["xs"+(i+1)];
							}
							pt.e = str;
						}
						mpt = mpt._next;
					}
				}
			},

			/**
			 * @private @constructor Used by a few SpecialProps to hold important values for proxies. For example, _parseToProxy() creates a MiniPropTween instance for each property that must get tweened on the proxy, and we record the original property name as well as the unique one we create for the proxy, plus whether or not the value needs to be rounded plus the original value.
			 * @param {!Object} t target object whose property we're tweening (often a CSSPropTween)
			 * @param {!string} p property name
			 * @param {(number|string|object)} v value
			 * @param {MiniPropTween=} next next MiniPropTween in the linked list
			 * @param {boolean=} r if true, the tweened value should be rounded to the nearest integer
			 */
			MiniPropTween = function(t, p, v, next, r) {
				this.t = t;
				this.p = p;
				this.v = v;
				this.r = r;
				if (next) {
					next._prev = this;
					this._next = next;
				}
			},

			/**
			 * @private Most other plugins (like BezierPlugin and ThrowPropsPlugin and others) can only tween numeric values, but CSSPlugin must accommodate special values that have a bunch of extra data (like a suffix or strings between numeric values, etc.). For example, boxShadow has values like "10px 10px 20px 30px rgb(255,0,0)" which would utterly confuse other plugins. This method allows us to split that data apart and grab only the numeric data and attach it to uniquely-named properties of a generic proxy object ({}) so that we can feed that to virtually any plugin to have the numbers tweened. However, we must also keep track of which properties from the proxy go with which CSSPropTween values and instances. So we create a linked list of MiniPropTweens. Each one records a target (the original CSSPropTween), property (like "s" or "xn1" or "xn2") that we're tweening and the unique property name that was used for the proxy (like "boxShadow_xn1" and "boxShadow_xn2") and whether or not they need to be rounded. That way, in the _setPluginRatio() method we can simply copy the values over from the proxy to the CSSPropTween instance(s). Then, when the main CSSPlugin setRatio() method runs and applies the CSSPropTween values accordingly, they're updated nicely. So the external plugin tweens the numbers, _setPluginRatio() copies them over, and setRatio() acts normally, applying css-specific values to the element.
			 * This method returns an object that has the following properties:
			 *  - proxy: a generic object containing the starting values for all the properties that will be tweened by the external plugin.  This is what we feed to the external _onInitTween() as the target
			 *  - end: a generic object containing the ending values for all the properties that will be tweened by the external plugin. This is what we feed to the external plugin's _onInitTween() as the destination values
			 *  - firstMPT: the first MiniPropTween in the linked list
			 *  - pt: the first CSSPropTween in the linked list that was created when parsing. If shallow is true, this linked list will NOT attach to the one passed into the _parseToProxy() as the "pt" (4th) parameter.
			 * @param {!Object} t target object to be tweened
			 * @param {!(Object|string)} vars the object containing the information about the tweening values (typically the end/destination values) that should be parsed
			 * @param {!CSSPlugin} cssp The CSSPlugin instance
			 * @param {CSSPropTween=} pt the next CSSPropTween in the linked list
			 * @param {TweenPlugin=} plugin the external TweenPlugin instance that will be handling tweening the numeric values
			 * @param {boolean=} shallow if true, the resulting linked list from the parse will NOT be attached to the CSSPropTween that was passed in as the "pt" (4th) parameter.
			 * @return An object containing the following properties: proxy, end, firstMPT, and pt (see above for descriptions)
			 */
			_parseToProxy = _internals._parseToProxy = function(t, vars, cssp, pt, plugin, shallow) {
				var bpt = pt,
					start = {},
					end = {},
					transform = cssp._transform,
					oldForce = _forcePT,
					i, p, xp, mpt, firstPT;
				cssp._transform = null;
				_forcePT = vars;
				pt = firstPT = cssp.parse(t, vars, pt, plugin);
				_forcePT = oldForce;
				//break off from the linked list so the new ones are isolated.
				if (shallow) {
					cssp._transform = transform;
					if (bpt) {
						bpt._prev = null;
						if (bpt._prev) {
							bpt._prev._next = null;
						}
					}
				}
				while (pt && pt !== bpt) {
					if (pt.type <= 1) {
						p = pt.p;
						end[p] = pt.s + pt.c;
						start[p] = pt.s;
						if (!shallow) {
							mpt = new MiniPropTween(pt, "s", p, mpt, pt.r);
							pt.c = 0;
						}
						if (pt.type === 1) {
							i = pt.l;
							while (--i > 0) {
								xp = "xn" + i;
								p = pt.p + "_" + xp;
								end[p] = pt.data[xp];
								start[p] = pt[xp];
								if (!shallow) {
									mpt = new MiniPropTween(pt, xp, p, mpt, pt.rxp[xp]);
								}
							}
						}
					}
					pt = pt._next;
				}
				return {proxy:start, end:end, firstMPT:mpt, pt:firstPT};
			},



			/**
			 * @constructor Each property that is tweened has at least one CSSPropTween associated with it. These instances store important information like the target, property, starting value, amount of change, etc. They can also optionally have a number of "extra" strings and numeric values named xs1, xn1, xs2, xn2, xs3, xn3, etc. where "s" indicates string and "n" indicates number. These can be pieced together in a complex-value tween (type:1) that has alternating types of data like a string, number, string, number, etc. For example, boxShadow could be "5px 5px 8px rgb(102, 102, 51)". In that value, there are 6 numbers that may need to tween and then pieced back together into a string again with spaces, suffixes, etc. xs0 is special in that it stores the suffix for standard (type:0) tweens, -OR- the first string (prefix) in a complex-value (type:1) CSSPropTween -OR- it can be the non-tweening value in a type:-1 CSSPropTween. We do this to conserve memory.
			 * CSSPropTweens have the following optional properties as well (not defined through the constructor):
			 *  - l: Length in terms of the number of extra properties that the CSSPropTween has (default: 0). For example, for a boxShadow we may need to tween 5 numbers in which case l would be 5; Keep in mind that the start/end values for the first number that's tweened are always stored in the s and c properties to conserve memory. All additional values thereafter are stored in xn1, xn2, etc.
			 *  - xfirst: The first instance of any sub-CSSPropTweens that are tweening properties of this instance. For example, we may split up a boxShadow tween so that there's a main CSSPropTween of type:1 that has various xs* and xn* values associated with the h-shadow, v-shadow, blur, color, etc. Then we spawn a CSSPropTween for each of those that has a higher priority and runs BEFORE the main CSSPropTween so that the values are all set by the time it needs to re-assemble them. The xfirst gives us an easy way to identify the first one in that chain which typically ends at the main one (because they're all prepende to the linked list)
			 *  - plugin: The TweenPlugin instance that will handle the tweening of any complex values. For example, sometimes we don't want to use normal subtweens (like xfirst refers to) to tween the values - we might want ThrowPropsPlugin or BezierPlugin some other plugin to do the actual tweening, so we create a plugin instance and store a reference here. We need this reference so that if we get a request to round values or disable a tween, we can pass along that request.
			 *  - data: Arbitrary data that needs to be stored with the CSSPropTween. Typically if we're going to have a plugin handle the tweening of a complex-value tween, we create a generic object that stores the END values that we're tweening to and the CSSPropTween's xs1, xs2, etc. have the starting values. We store that object as data. That way, we can simply pass that object to the plugin and use the CSSPropTween as the target.
			 *  - setRatio: Only used for type:2 tweens that require custom functionality. In this case, we call the CSSPropTween's setRatio() method and pass the ratio each time the tween updates. This isn't quite as efficient as doing things directly in the CSSPlugin's setRatio() method, but it's very convenient and flexible.
			 * @param {!Object} t Target object whose property will be tweened. Often a DOM element, but not always. It could be anything.
			 * @param {string} p Property to tween (name). For example, to tween element.width, p would be "width".
			 * @param {number} s Starting numeric value
			 * @param {number} c Change in numeric value over the course of the entire tween. For example, if element.width starts at 5 and should end at 100, c would be 95.
			 * @param {CSSPropTween=} next The next CSSPropTween in the linked list. If one is defined, we will define its _prev as the new instance, and the new instance's _next will be pointed at it.
			 * @param {number=} type The type of CSSPropTween where -1 = a non-tweening value, 0 = a standard simple tween, 1 = a complex value (like one that has multiple numbers in a comma- or space-delimited string like border:"1px solid red"), and 2 = one that uses a custom setRatio function that does all of the work of applying the values on each update.
			 * @param {string=} n Name of the property that should be used for overwriting purposes which is typically the same as p but not always. For example, we may need to create a subtween for the 2nd part of a "clip:rect(...)" tween in which case "p" might be xs1 but "n" is still "clip"
			 * @param {boolean=} r If true, the value(s) should be rounded
			 * @param {number=} pr Priority in the linked list order. Higher priority CSSPropTweens will be updated before lower priority ones. The default priority is 0.
			 * @param {string=} b Beginning value. We store this to ensure that it is EXACTLY what it was when the tween began without any risk of interpretation issues.
			 * @param {string=} e Ending value. We store this to ensure that it is EXACTLY what the user defined at the end of the tween without any risk of interpretation issues.
			 */
			CSSPropTween = _internals.CSSPropTween = function(t, p, s, c, next, type, n, r, pr, b, e) {
				this.t = t; //target
				this.p = p; //property
				this.s = s; //starting value
				this.c = c; //change value
				this.n = n || "css_" + p; //name that this CSSPropTween should be associated to (usually the same as p, but not always - n is what overwriting looks at)
				if (!(t instanceof CSSPropTween)) {
					_overwriteProps.push(this.n);
				}
				this.r = r; //round (boolean)
				this.type = type || 0; //0 = normal tween, -1 = non-tweening (in which case xs0 will be applied to the target's property, like tp.t[tp.p] = tp.xs0), 1 = complex-value SpecialProp, 2 = custom setRatio() that does all the work
				if (pr) {
					this.pr = pr;
					_hasPriority = true;
				}
				this.b = (b === undefined) ? s : b;
				this.e = (e === undefined) ? s + c : e;
				if (next) {
					this._next = next;
					next._prev = this;
				}
			},

			/**
			 * Takes a target, the beginning value and ending value (as strings) and parses them into a CSSPropTween (possibly with child CSSPropTweens) that accommodates multiple numbers, colors, comma-delimited values, etc. For example:
			 * sp.parseComplex(element, "boxShadow", "5px 10px 20px rgb(255,102,51)", "0px 0px 0px red", true, "0px 0px 0px rgb(0,0,0,0)", pt);
			 * It will walk through the beginning and ending values (which should be in the same format with the same number and type of values) and figure out which parts are numbers, what strings separate the numeric/tweenable values, and then create the CSSPropTweens accordingly. If a plugin is defined, no child CSSPropTweens will be created. Instead, the ending values will be stored in the "data" property of the returned CSSPropTween like: {s:-5, xn1:-10, xn2:-20, xn3:255, xn4:0, xn5:0} so that it can be fed to any other plugin and it'll be plain numeric tweens but the recomposition of the complex value will be handled inside CSSPlugin's setRatio().
			 * If a setRatio is defined, the type of the CSSPropTween will be set to 2 and recomposition of the values will be the responsibility of that method.
			 *
			 * @param {!Object} t Target whose property will be tweened
			 * @param {!string} p Property that will be tweened (its name, like "left" or "backgroundColor" or "boxShadow")
			 * @param {string} b Beginning value
			 * @param {string} e Ending value
			 * @param {boolean} clrs If true, the value could contain a color value like "rgb(255,0,0)" or "#F00" or "red". The default is false, so no colors will be recognized (a performance optimization)
			 * @param {(string|number|Object)} dflt The default beginning value that should be used if no valid beginning value is defined or if the number of values inside the complex beginning and ending values don't match
			 * @param {?CSSPropTween} pt CSSPropTween instance that is the current head of the linked list (we'll prepend to this).
			 * @param {number=} pr Priority in the linked list order. Higher priority properties will be updated before lower priority ones. The default priority is 0.
			 * @param {TweenPlugin=} plugin If a plugin should handle the tweening of extra properties, pass the plugin instance here. If one is defined, then NO subtweens will be created for any extra properties (the properties will be created - just not additional CSSPropTween instances to tween them) because the plugin is expected to do so. However, the end values WILL be populated in the "data" property, like {s:100, xn1:50, xn2:300}
			 * @param {function(number)=} setRatio If values should be set in a custom function instead of being pieced together in a type:1 (complex-value) CSSPropTween, define that custom function here.
			 * @return {CSSPropTween} The first CSSPropTween in the linked list which includes the new one(s) added by the parseComplex() call.
			 */
			_parseComplex = CSSPlugin.parseComplex = function(t, p, b, e, clrs, dflt, pt, pr, plugin, setRatio) {
				//DEBUG: _log("parseComplex: "+p+", b: "+b+", e: "+e);
				pt = new CSSPropTween(t, p, 0, 0, pt, (setRatio ? 2 : 1), null, false, pr, b, e);
				var ba = b.split(", ").join(",").split(" "), //beginning array
					ea = (e + "").split(", ").join(",").split(" "), //ending array
					l = ba.length,
					autoRound = (_autoRound !== false),
					i, xi, ni, bv, ev, bnums, enums, bn, rgba, temp, cv, str;
				if (l !== ea.length) {
					//DEBUG: _log("mismatched formatting detected on " + p + " (" + b + " vs " + e + ")");
					ba = (dflt || "").split(" ");
					l = ba.length;
				}
				pt.plugin = plugin;
				pt.setRatio = setRatio;
				for (i = 0; i < l; i++) {
					bv = ba[i];
					ev = ea[i];
					bn = parseFloat(bv);

					//if the value begins with a number (most common). It's fine if it has a suffix like px
					if (bn || bn === 0) {
						pt.appendXtra("", bn, _parseChange(ev, bn), ev.replace(_relNumExp, ""), (autoRound && ev.indexOf("px") !== -1), true);

					//if the value is a color
					} else if (clrs && (bv.charAt(0) === "#" || bv.indexOf("rgb") === 0 || _colorLookup[bv])) {
						bv = _parseColor(bv);
						ev = _parseColor(ev);
						rgba = (bv.length + ev.length > 6);

						if (rgba && !_supportsOpacity && ev[3] === 0) { //older versions of IE don't support rgba(), so if the destination alpha is 0, just use "transparent" for the color
							pt["xs" + pt.l] += pt.l ? " transparent" : "transparent";
							pt.e = pt.e.split(ea[i]).join("transparent");
						} else {
							pt.appendXtra((rgba ? "rgba(" : "rgb("), bv[0], ev[0] - bv[0], ",", true, true)
								.appendXtra("", bv[1], ev[1] - bv[1], ",", true)
								.appendXtra("", bv[2], ev[2] - bv[2], (rgba ? "," : ")"), true);
							if (rgba) {
								bv = (bv.length < 4) ? 1 : bv[3];
								pt.appendXtra("", bv, ((ev.length < 4) ? 1 : ev[3]) - bv, ")", false);
							}
						}

					} else {
						bnums = bv.match(_numExp); //gets each group of numbers in the beginning value string and drops them into an array

						//if no number is found, treat it as a non-tweening value and just append the string to the current xs.
						if (!bnums) {
							pt["xs" + pt.l] += pt.l ? " " + bv : bv;

						//loop through all the numbers that are found and construct the extra values on the pt.
						} else {
							enums = ev.match(_relNumExp); //get each group of numbers in the end value string and drop them into an array. We allow relative values too, like +=50 or -=.5
							if (!enums || enums.length !== bnums.length) {
								//DEBUG: _log("mismatched formatting detected on " + p + " (" + b + " vs " + e + ")");
								return pt;
							}
							ni = 0;
							for (xi = 0; xi < bnums.length; xi++) {
								cv = bnums[xi];
								temp = bv.indexOf(cv, ni);
								pt.appendXtra(bv.substr(ni, temp - ni), Number(cv), _parseChange(enums[xi], cv), "", (autoRound && bv.substr(temp + cv.length, 2) === "px"), (xi === 0));
								ni = temp + cv.length;
							}
							pt["xs" + pt.l] += bv.substr(ni);
						}
					}
				}
				//if there are relative values ("+=" or "-=" prefix), we need to adjust the ending value to eliminate the prefixes and combine the values properly.
				if (e.indexOf("=") !== -1) if (pt.data) {
					str = pt.xs0 + pt.data.s;
					for (i = 1; i < pt.l; i++) {
						str += pt["xs" + i] + pt.data["xn" + i];
					}
					pt.e = str + pt["xs" + i];
				}
				if (!pt.l) {
					pt.type = -1;
					pt.xs0 = pt.e;
				}
				return pt.xfirst || pt;
			},
			i = 9;


		p = CSSPropTween.prototype;
		p.l = p.pr = 0; //length (number of extra properties like xn1, xn2, xn3, etc.
		while (--i > 0) {
			p["xn" + i] = 0;
			p["xs" + i] = "";
		}
		p.xs0 = "";
		p._next = p._prev = p.xfirst = p.data = p.plugin = p.setRatio = p.rxp = null;


		/**
		 * Appends and extra tweening value to a CSSPropTween and automatically manages any prefix and suffix strings. The first extra value is stored in the s and c of the main CSSPropTween instance, but thereafter any extras are stored in the xn1, xn2, xn3, etc. The prefixes and suffixes are stored in the xs0, xs1, xs2, etc. properties. For example, if I walk through a clip value like "rect(10px, 5px, 0px, 20px)", the values would be stored like this:
		 * xs0:"rect(", s:10, xs1:"px, ", xn1:5, xs2:"px, ", xn2:0, xs3:"px, ", xn3:20, xn4:"px)"
		 * And they'd all get joined together when the CSSPlugin renders (in the setRatio() method).
		 * @param {string=} pfx Prefix (if any)
		 * @param {!number} s Starting value
		 * @param {!number} c Change in numeric value over the course of the entire tween. For example, if the start is 5 and the end is 100, the change would be 95.
		 * @param {string=} sfx Suffix (if any)
		 * @param {boolean=} r Round (if true).
		 * @param {boolean=} pad If true, this extra value should be separated by the previous one by a space. If there is no previous extra and pad is true, it will automatically drop the space.
		 * @return {CSSPropTween} returns itself so that multiple methods can be chained together.
		 */
		p.appendXtra = function(pfx, s, c, sfx, r, pad) {
			var pt = this,
				l = pt.l;
			pt["xs" + l] += (pad && l) ? " " + pfx : pfx || "";
			if (!c) if (l !== 0 && !pt.plugin) { //typically we'll combine non-changing values right into the xs to optimize performance, but we don't combine them when there's a plugin that will be tweening the values because it may depend on the values being split apart, like for a bezier, if a value doesn't change between the first and second iteration but then it does on the 3rd, we'll run into trouble because there's no xn slot for that value!
				pt["xs" + l] += s + (sfx || "");
				return pt;
			}
			pt.l++;
			pt.type = pt.setRatio ? 2 : 1;
			pt["xs" + pt.l] = sfx || "";
			if (l > 0) {
				pt.data["xn" + l] = s + c;
				pt.rxp["xn" + l] = r; //round extra property (we need to tap into this in the _parseToProxy() method)
				pt["xn" + l] = s;
				if (!pt.plugin) {
					pt.xfirst = new CSSPropTween(pt, "xn" + l, s, c, pt.xfirst || pt, 0, pt.n, r, pt.pr);
					pt.xfirst.xs0 = 0; //just to ensure that the property stays numeric which helps modern browsers speed up processing. Remember, in the setRatio() method, we do pt.t[pt.p] = val + pt.xs0 so if pt.xs0 is "" (the default), it'll cast the end value as a string. When a property is a number sometimes and a string sometimes, it prevents the compiler from locking in the data type, slowing things down slightly.
				}
				return pt;
			}
			pt.data = {s:s + c};
			pt.rxp = {};
			pt.s = s;
			pt.c = c;
			pt.r = r;
			return pt;
		};

		/**
		 * @constructor A SpecialProp is basically a css property that needs to be treated in a non-standard way, like if it may contain a complex value like boxShadow:"5px 10px 15px rgb(255, 102, 51)" or if it is associated with another plugin like ThrowPropsPlugin or BezierPlugin. Every SpecialProp is associated with a particular property name like "boxShadow" or "throwProps" or "bezier" and it will intercept those values in the vars object that's passed to the CSSPlugin and handle them accordingly.
		 * @param {!string} p Property name (like "boxShadow" or "throwProps")
		 * @param {(string|number)=} dflt Default starting value.
		 * @param {function(Object, Object, Object, Object):CSSPropTween=} parser A function that should be called when the associated property name is found in the vars. This function should return a CSSPropTween instance and it should ensure that it is properly inserted into the linked list. It will receive 4 paramters: 1) The target, 2) The value defined in the vars, 3) The CSSPlugin instance (whose _firstPT should be used for the linked list), and 4) A computed style object if one was calculated (this is a speed optimization that allows retrieval of starting values quicker)
		 * @param {boolean=} vpfx If true, the property will be checked to see if a vendor prefix is necessary and if so, it will be used.
		 * @param {boolean=} clrs If true, the special property may contain color values. Many do not in which case we can skip some processing steps when analyzing the starting/ending values.
		 * @param {function(string):string=} formatter Function that takes a string (beginning or ending value) and formats it correctly, like for boxShadow it could take "5px 5px red" and format it to "5px 5px 0px 0px red" so that both the beginning and ending values have a common order and quantity of values.
		 * @param {number=} pr Priority in the linked list order. Higher priority SpecialProps will be updated before lower priority ones. The default priority is 0.
		 */
		var SpecialProp = function(p, dflt, parser, vpfx, clrs, formatter, pr) {
				this.p = vpfx ? _checkPropPrefix(p) || p : p;
				_specialProps[p] = _specialProps[this.p] = this;
				this.format = formatter || _getFormatter(dflt, clrs);
				if (parser) {
					this.parse = parser;
				}
				this.clrs = clrs;
				this.dflt = dflt;
				this.pr = pr || 0;
			},

			//shortcut for creating a new SpecialProp that can accept multiple properties as a comma-delimited list (helps minification). dflt can be an array for multiple values (we don't do a comma-delimited list because the default value may contain commas, like rect(0px,0px,0px,0px)). We attach this method to the SpecialProp class/object instead of using a private _createSpecialProp() method so that we can tap into it externally if necessary, like from another plugin.
			_registerComplexSpecialProp = _internals._registerComplexSpecialProp = function(p, dflt, parser, vpfx, clrs, formatter, pr) {
				var a = p.split(","),
					da = (dflt instanceof Array) ? dflt : [dflt],
					i = a.length,
					temp;
				while (--i > -1) {
					temp = new SpecialProp(a[i], da[i], parser, (vpfx && i === 0), clrs, formatter, pr);
				}
			},
			//creates a placeholder special prop for a plugin so that the property gets caught the first time a tween of it is attempted, and at that time it makes the plugin register itself, thus taking over for all future tweens of that property. This allows us to not mandate that things load in a particular order and it also allows us to log() an error that informs the user when they attempt to tween an external plugin-related property without loading its .js file.
			_registerPluginProp = function(p) {
				if (!_specialProps[p]) {
					var pluginName = p.charAt(0).toUpperCase() + p.substr(1) + "Plugin";
					_registerComplexSpecialProp(p, null, function(t, e, p, cssp, pt, plugin, vars) {
						var pluginClass = window.com.greensock.plugins[pluginName];
						if (!pluginClass) {
							_log("Error: " + pluginName + " js file not loaded.");
							return pt;
						}
						pluginClass._cssRegister();
						return _specialProps[p].parse(t, e, p, cssp, pt, plugin, vars);
					});
				}
			};


		p = SpecialProp.prototype;

		/**
		 * Alias for _parseComplex() that automatically plugs in certain values for this SpecialProp, like its property name, whether or not colors should be sensed, the default value, and priority.
		 * @param {!Object} t target element
		 * @param {(string|number|object)} b beginning value
		 * @param {(string|number|object)} e ending (destination) value
		 * @param {CSSPropTween=} pt next CSSPropTween in the linked list
		 * @param {TweenPlugin=} plugin If another plugin will be tweening the complex value, that TweenPlugin instance goes here.
		 * @param {function=} setRatio If a custom setRatio() method should be used to handle this complex value, that goes here.
		 * @return {CSSPropTween=} First CSSPropTween in the linked list
		 */
		p.parseComplex = function(t, b, e, pt, plugin, setRatio) {
			return _parseComplex(t, this.p, b, e, this.clrs, this.dflt, pt, this.pr, plugin, setRatio);
		};

		/**
		 * Accepts a target and end value and spits back a CSSPropTween that has been inserted into the CSSPlugin's linked list and conforms with all the conventions we use internally, like type:-1, 0, 1, or 2, setting up any extra property tweens, priority, etc. For example, if we have a boxShadow SpecialProp and call:
		 * this._firstPT = sp.parse(element, "5px 10px 20px rgb(2550,102,51)", "boxShadow", this);
		 * It should figure out the starting value of the element's boxShadow, compare it to the provided end value and create all the necessary CSSPropTweens of the appropriate types to tween the boxShadow. The CSSPropTween that gets spit back should already be inserted into the linked list (the 4th parameter is the current head, so prepend to that).
		 * @param {!Object) t Target object whose property is being tweened
		 * @param {Object} e End value as provided in the vars object (typically a string, but not always - like a throwProps would be an object).
		 * @param {!string} p Property name
		 * @param {!CSSPlugin} cssp The CSSPlugin instance that should be associated with this tween.
		 * @param {?CSSPropTween} pt The CSSPropTween that is the current head of the linked list (we'll prepend to it)
		 * @param {TweenPlugin=} plugin If a plugin will be used to tween the parsed value, this is the plugin instance.
		 * @param {Object=} vars Original vars object that contains the data for parsing.
		 * @return {CSSPropTween} The first CSSPropTween in the linked list which includes the new one(s) added by the parse() call.
		 */
		p.parse = function(t, e, p, cssp, pt, plugin, vars) {
			return this.parseComplex(t.style, this.format(_getStyle(t, p, _cs, false, this.dflt)), this.format(e), pt, plugin);
		};

		/**
		 * Registers a special property that should be intercepted from any "css" objects defined in tweens. This allows you to handle them however you want without CSSPlugin doing it for you. The 2nd parameter should be a function that accepts 3 parameters:
		 *  1) Target object whose property should be tweened (typically a DOM element)
		 *  2) The end/destination value (could be a string, number, object, or whatever you want)
		 *  3) The tween instance (you probably don't need to worry about this, but it can be useful for looking up information like the duration)
		 *
		 * Then, your function should return a function which will be called each time the tween gets rendered, passing a numeric "ratio" parameter to your function that indicates the change factor (usually between 0 and 1). For example:
		 *
		 * CSSPlugin.registerSpecialProp("myCustomProp", function(target, value, tween) {
		 *      var start = target.style.width;
		 *      return function(ratio) {
		 *              target.style.width = (start + value * ratio) + "px";
		 *              console.log("set width to " + target.style.width);
		 *          }
		 * }, 0);
		 *
		 * Then, when I do this tween, it will trigger my special property:
		 *
		 * TweenLite.to(element, 1, {css:{myCustomProp:100}});
		 *
		 * In the example, of course, we're just changing the width, but you can do anything you want.
		 *
		 * @param {!string} name Property name (or comma-delimited list of property names) that should be intercepted and handled by your function. For example, if I define "myCustomProp", then it would handle that portion of the following tween: TweenLite.to(element, 1, {css:{myCustomProp:100}})
		 * @param {!function(Object, Object, Object, string):function(number)} onInitTween The function that will be called when a tween of this special property is performed. The function will receive 4 parameters: 1) Target object that should be tweened, 2) Value that was passed to the tween, 3) The tween instance itself (rarely used), and 4) The property name that's being tweened. Your function should return a function that should be called on every update of the tween. That function will receive a single parameter that is a "change factor" value (typically between 0 and 1) indicating the amount of change as a ratio. You can use this to determine how to set the values appropriately in your function.
		 * @param {number=} priority Priority that helps the engine determine the order in which to set the properties (default: 0). Higher priority properties will be updated before lower priority ones.
		 */
		CSSPlugin.registerSpecialProp = function(name, onInitTween, priority) {
			_registerComplexSpecialProp(name, null, function(t, e, p, cssp, pt, plugin, vars) {
				var rv = new CSSPropTween(t, p, 0, 0, pt, 2, p, false, priority);
				rv.plugin = plugin;
				rv.setRatio = onInitTween(t, e, cssp._tween, p);
				return rv;
			}, false, false, null, priority);
		};








		//transform-related methods and properties
		var _transformProps = ["scaleX","scaleY","scaleZ","x","y","z","skewX","rotation","rotationX","rotationY","perspective"],
			_transformProp = _checkPropPrefix("transform"), //the Javascript (camelCase) transform property, like msTransform, WebkitTransform, MozTransform, or OTransform.
			_transformPropCSS = _prefixCSS + "transform",
			_transformOriginProp = _checkPropPrefix("transformOrigin"),
			_supports3D = (_checkPropPrefix("perspective") !== null),

			/**
			 * Parses the transform values for an element, returning an object with x, y, z, scaleX, scaleY, scaleZ, rotation, rotationX, rotationY, skewX, and skewY properties. Note: by default (for performance reasons), all skewing is combined into skewX and rotation but skewY still has a place in the transform object so that we can record how much of the skew is attributed to skewX vs skewY. Remember, a skewY of 10 looks the same as a rotation of 10 and skewX of -10.
			 * @param {!Object} t target element
			 * @param {Object=} cs computed style object (optional)
			 * @param {boolean=} rec if true, the transform values will be recorded to the target element's _gsTransform object, like target._gsTransform = {x:0, y:0, z:0, scaleX:1...}
			 * @return {object} object containing all of the transform properties/values like {x:0, y:0, z:0, scaleX:1...}
			 */
			_getTransform = function(t, cs, rec) {
				var tm = rec ? t._gsTransform || {skewY:0} : {skewY:0},
					invX = (tm.scaleX < 0), //in order to interpret things properly, we need to know if the user applied a negative scaleX previously so that we can adjust the rotation and skewX accordingly. Otherwise, if we always interpret a flipped matrix as affecting scaleY and the user only wants to tween the scaleX on multiple sequential tweens, it would keep the negative scaleY without that being the user's intent.
					min = 0.000001,
					rnd = 100000,
					zOrigin = _supports3D ? parseFloat(_getStyle(t, _transformOriginProp, cs, false, "0 0 0").split(" ")[2]) || tm.zOrigin  || 0 : 0,
					s, m, i, n, scaleX, scaleY, rotation, skewX, difX, difY, difR, difS;
				if (_transformProp) {
					s = _getStyle(t, _transformPropCSS, cs, true);
				} else if (t.currentStyle) {
					//for older versions of IE, we need to interpret the filter portion that is in the format: progid:DXImageTransform.Microsoft.Matrix(M11=6.123233995736766e-17, M12=-1, M21=1, M22=6.123233995736766e-17, sizingMethod='auto expand') Notice that we need to swap b and c compared to a normal matrix.
					s = t.currentStyle.filter.match(_ieGetMatrixExp);
					s = (s && s.length === 4) ? s[0].substr(4) + "," + Number(s[2].substr(4)) + "," + Number(s[1].substr(4)) + "," + s[3].substr(4) + "," + (tm ? tm.x : 0) + "," + (tm ? tm.y : 0) : null;
				}
				//split the matrix values out into an array (m for matrix)
				m = (s || "").match(/(?:\-|\b)[\d\-\.e]+\b/gi) || [];
				i = m.length;
				while (--i > -1) {
					n = Number(m[i]);
					m[i] = ((n * rnd + ((n < 0) ? -0.5 : 0.5)) >> 0) / rnd; //convert strings to Numbers and round to 5 decimal places to avoid issues with tiny numbers
				}
				if (m.length === 16) {

					//we'll only look at these position-related 6 variables first because if x/y/z all match, it's relatively safe to assume we don't need to re-parse everything which risks losing important rotational information (like rotationX:180 plus rotationY:180 would look the same as rotation:180 - there's no way to know for sure which direction was taken based solely on the matrix3d() values)
					var a13 = m[8], a23 = m[9], a33 = m[10],
						a14 = m[12], a24 = m[13], a34 = m[14];

					//we manually compensate for non-zero z component of transformOrigin to work around bugs in Safari
					if (tm.zOrigin) {
						a34 = -tm.zOrigin;
						a14 = a13*a34-m[12];
						a24 = a23*a34-m[13];
						a34 = a33*a34+tm.zOrigin-m[14];
					}

					//only parse from the matrix if we MUST because not only is it usually unnecessary due to the fact that we store the values in the _gsTransform object, but also because it's impossible to accurately interpret rotationX, rotationY, and rotationZ if all are applied, so it's much better to rely on what we store. However, we must parse the first time that an object is tweened. We also assume that if the position has changed, the user must have done some styling changes outside of CSSPlugin, thus we force a parse in that scenario.
					if (!rec || a14 !== tm.x || a24 !== tm.y || a34 !== tm.z) {
						var a11 = m[0], a21 = m[1], a31 = m[2], a41 = m[3],
							a12 = m[4], a22 = m[5], a32 = m[6], a42 = m[7],
							a43 = m[11],
							minPI = -Math.PI + 0.0001,
							maxPI = Math.PI - 0.0001,
							angle = tm.rotationX = Math.atan2(a32, a33),
							xFlip = (angle < minPI || angle > maxPI),
							t1, t2, t3, t4, cos, sin, yFlip, zFlip;
						//rotationX
						if (angle) {
							cos = Math.cos(-angle);
							sin = Math.sin(-angle);
							t1 = a12*cos+a13*sin;
							t2 = a22*cos+a23*sin;
							t3 = a32*cos+a33*sin;
							t4 = a42*cos+a43*sin;
							a13 = a12*-sin+a13*cos;
							a23 = a22*-sin+a23*cos;
							a33 = a32*-sin+a33*cos;
							a43 = a42*-sin+a43*cos;
							a12 = t1;
							a22 = t2;
							a32 = t3;
							//a42 = t4;
						}
						//rotationY
						angle = tm.rotationY = Math.atan2(a13, a11);
						if (angle) {
							yFlip = (angle < minPI || angle > maxPI);
							cos = Math.cos(-angle);
							sin = Math.sin(-angle);
							t1 = a11*cos-a13*sin;
							t2 = a21*cos-a23*sin;
							t3 = a31*cos-a33*sin;
							t4 = a41*cos-a43*sin;
							//a13 = a11*sin+a13*cos;
							a23 = a21*sin+a23*cos;
							a33 = a31*sin+a33*cos;
							a43 = a41*sin+a43*cos;
							a11 = t1;
							a21 = t2;
							a31 = t3;
							//a41 = t4;
						}
						//rotationZ
						angle = tm.rotation = Math.atan2(a21, a22);
						if (angle) {
							zFlip = (angle < minPI || angle > maxPI);
							cos = Math.cos(-angle);
							sin = Math.sin(-angle);
							a11 = a11*cos+a12*sin;
							t2 = a21*cos+a22*sin;
							a22 = a21*-sin+a22*cos;
							a32 = a31*-sin+a32*cos;
							a21 = t2;
						}

						if (zFlip && xFlip) {
							tm.rotation = tm.rotationX = 0;
						} else if (zFlip && yFlip) {
							tm.rotation = tm.rotationY = 0;
						} else if (yFlip && xFlip) {
							tm.rotationY = tm.rotationX = 0;
						}

						tm.scaleX = ((Math.sqrt(a11 * a11 + a21 * a21) * rnd + 0.5) >> 0) / rnd;
						tm.scaleY = ((Math.sqrt(a22 * a22 + a23 * a23) * rnd + 0.5) >> 0) / rnd;
						tm.scaleZ = ((Math.sqrt(a32 * a32 + a33 * a33) * rnd + 0.5) >> 0) / rnd;
						tm.skewX = 0;
						tm.perspective = a43 ? 1 / a43 : 0;
						tm.x = a14;
						tm.y = a24;
						tm.z = a34;
					}

				} else if (!_supports3D || m.length === 0 || tm.x !== m[4] || tm.y !== m[5] || (!tm.rotationX && !tm.rotationY)) { //sometimes a 6-element matrix is returned even when we performed 3D transforms, like if rotationX and rotationY are 180. In cases like this, we still need to honor the 3D transforms. If we just rely on the 2D info, it could affect how the data is interpreted, like scaleY might get set to -1 or rotation could get offset by 180 degrees. For example, do a TweenLite.to(element, 1, {css:{rotationX:180, rotationY:180}}) and then later, TweenLite.to(element, 1, {css:{rotationX:0}}) and without this conditional logic in place, it'd jump to a state of being unrotated when the 2nd tween starts. Then again, we need to honor the fact that the user COULD alter the transforms outside of CSSPlugin, like by manually applying new css, so we try to sense that by looking at x and y because if those changed, we know the changes were made outside CSSPlugin and we force a reinterpretation of the matrix values.
					var k = (m.length >= 6),
						a = k ? m[0] : 1,
						b = m[1] || 0,
						c = m[2] || 0,
						d = k ? m[3] : 1;

					tm.x = m[4] || 0;
					tm.y = m[5] || 0;
					scaleX = Math.sqrt(a * a + b * b);
					scaleY = Math.sqrt(d * d + c * c);
					rotation = (a || b) ? Math.atan2(b, a) : tm.rotation || 0; //note: if scaleX is 0, we cannot accurately measure rotation. Same for skewX with a scaleY of 0. Therefore, we default to the previously recorded value (or zero if that doesn't exist).
					skewX = (c || d) ? Math.atan2(c, d) + rotation : tm.skewX || 0;
					difX = scaleX - Math.abs(tm.scaleX || 0);
					difY = scaleY - Math.abs(tm.scaleY || 0);
					if (Math.abs(skewX) > Math.PI / 2 && Math.abs(skewX) < Math.PI * 1.5) {
						if (invX) {
							scaleX *= -1;
							skewX += (rotation <= 0) ? Math.PI : -Math.PI;
							rotation += (rotation <= 0) ? Math.PI : -Math.PI;
						} else {
							scaleY *= -1;
							skewX += (skewX <= 0) ? Math.PI : -Math.PI;
						}
					}
					difR = (rotation - tm.rotation) % Math.PI;
					difS = (skewX - tm.skewX) % Math.PI;
					//if there's already a recorded _gsTransform in place for the target, we should leave those values in place unless we know things changed for sure (beyond a super small amount). This gets around ambiguous interpretations, like if scaleX and scaleY are both -1, the matrix would be the same as if the rotation was 180 with normal scaleX/scaleY. If the user tweened to particular values, those must be prioritized to ensure animation is consistent.
					if (tm.skewX === undefined || difX > min || difX < -min || difY > min || difY < -min || difR > min || difR < -min || difS > min || difS < -min) {
						tm.scaleX = scaleX;
						tm.scaleY = scaleY;
						tm.rotation = rotation;
						tm.skewX = skewX;
					}
					if (_supports3D) {
						tm.rotationX = tm.rotationY = tm.z = 0;
						tm.perspective = parseFloat(CSSPlugin.defaultTransformPerspective) || 0;
						tm.scaleZ = 1;
					}
				}
				tm.zOrigin = zOrigin;

				//some browsers have a hard time with very small values like 2.4492935982947064e-16 (notice the "e-" towards the end) and would render the object slightly off. So we round to 0 in these cases. The conditional logic here is faster than calling Math.abs(). Also, browsers tend to render a SLIGHTLY rotated object in a fuzzy way, so we need to snap to exactly 0 when appropriate.
				for (i in tm) {
					if (tm[i] < min) if (tm[i] > -min) {
						tm[i] = 0;
					}
					//alternate method rounds to 5 decimal places: tm[i] = ((tm[i] * rnd) >> 0) / rnd;
				}
				//DEBUG: _log("parsed rotation: "+(tm.rotationX*_RAD2DEG)+", "+(tm.rotationY*_RAD2DEG)+", "+(tm.rotation*_RAD2DEG)+", scale: "+tm.scaleX+", "+tm.scaleY+", "+tm.scaleZ+", position: "+tm.x+", "+tm.y+", "+tm.z+", perspective: "+tm.perspective);
				if (rec) {
					t._gsTransform = tm; //record to the object's _gsTransform which we use so that tweens can control individual properties independently (we need all the properties to accurately recompose the matrix in the setRatio() method)
				}
				return tm;
			},
			//for setting 2D transforms in IE6, IE7, and IE8 (must use a "filter" to emulate the behavior of modern day browser transforms)
			_setIETransformRatio = function(v) {
				var t = this.data, //refers to the element's _gsTransform object
					ang = -t.rotation,
					skew = ang + t.skewX,
					rnd = 100000,
					a = ((Math.cos(ang) * t.scaleX * rnd) >> 0) / rnd,
					b = ((Math.sin(ang) * t.scaleX * rnd) >> 0) / rnd,
					c = ((Math.sin(skew) * -t.scaleY * rnd) >> 0) / rnd,
					d = ((Math.cos(skew) * t.scaleY * rnd) >> 0) / rnd,
					style = this.t.style,
					cs = this.t.currentStyle,
					filters, val;
				if (!cs) {
					return;
				}
				val = b; //just for swapping the variables an inverting them (reused "val" to avoid creating another variable in memory). IE's filter matrix uses a non-standard matrix configuration (angle goes the opposite way, and b and c are reversed and inverted)
				b = -c;
				c = -val;
				filters = cs.filter;
				style.filter = ""; //remove filters so that we can accurately measure offsetWidth/offsetHeight
				var w = this.t.offsetWidth,
					h = this.t.offsetHeight,
					clip = (cs.position !== "absolute"),
					m = "progid:DXImageTransform.Microsoft.Matrix(M11=" + a + ", M12=" + b + ", M21=" + c + ", M22=" + d,
					ox = t.x,
					oy = t.y,
					dx, dy;

				//if transformOrigin is being used, adjust the offset x and y
				if (t.ox != null) {
					dx = ((t.oxp) ? w * t.ox * 0.01 : t.ox) - w / 2;
					dy = ((t.oyp) ? h * t.oy * 0.01 : t.oy) - h / 2;
					ox += dx - (dx * a + dy * b);
					oy += dy - (dx * c + dy * d);
				}

				if (!clip) {
					var mult = (_ieVers < 8) ? 1 : -1, //in Internet Explorer 7 and before, the box model is broken, causing the browser to treat the width/height of the actual rotated filtered image as the width/height of the box itself, but Microsoft corrected that in IE8. We must use a negative offset in IE8 on the right/bottom
						marg, prop, dif;
					dx = t.ieOffsetX || 0;
					dy = t.ieOffsetY || 0;
					t.ieOffsetX = Math.round((w - ((a < 0 ? -a : a) * w + (b < 0 ? -b : b) * h)) / 2 + ox);
					t.ieOffsetY = Math.round((h - ((d < 0 ? -d : d) * h + (c < 0 ? -c : c) * w)) / 2 + oy);
					for (i = 0; i < 4; i++) {
						prop = _margins[i];
						marg = cs[prop];
						//we need to get the current margin in case it is being tweened separately (we want to respect that tween's changes)
						val = (marg.indexOf("px") !== -1) ? parseFloat(marg) : _convertToPixels(this.t, prop, parseFloat(marg), marg.replace(_suffixExp, "")) || 0;
						if (val !== t[prop]) {
							dif = (i < 2) ? -t.ieOffsetX : -t.ieOffsetY; //if another tween is controlling a margin, we cannot only apply the difference in the ieOffsets, so we essentially zero-out the dx and dy here in that case. We record the margin(s) later so that we can keep comparing them, making this code very flexible.
						} else {
							dif = (i < 2) ? dx - t.ieOffsetX : dy - t.ieOffsetY;
						}
						style[prop] = (t[prop] = Math.round( val - dif * ((i === 0 || i === 2) ? 1 : mult) )) + "px";
					}
					m += ", sizingMethod='auto expand')";
				} else {
					dx = (w / 2);
					dy = (h / 2);
					//translate to ensure that transformations occur around the correct origin (default is center).
					m += ", Dx=" + (dx - (dx * a + dy * b) + ox) + ", Dy=" + (dy - (dx * c + dy * d) + oy) + ")";
				}
				if (filters.indexOf("DXImageTransform.Microsoft.Matrix(") !== -1) {
					style.filter = filters.replace(_ieSetMatrixExp, m);
				} else {
					style.filter = m + " " + filters; //we must always put the transform/matrix FIRST (before alpha(opacity=xx)) to avoid an IE bug that slices part of the object when rotation is applied with alpha.
				}

				//at the end or beginning of the tween, if the matrix is normal (1, 0, 0, 1) and opacity is 100 (or doesn't exist), remove the filter to improve browser performance.
				if (v === 0 || v === 1) if (a === 1) if (b === 0) if (c === 0) if (d === 1) if (!clip || m.indexOf("Dx=0, Dy=0") !== -1) if (!_opacityExp.test(filters) || parseFloat(RegExp.$1) === 100) if (filters.indexOf("gradient(") === -1) {
					style.removeAttribute("filter");
				}
			},
			_set3DTransformRatio = function(v) {
				var t = this.data, //refers to the element's _gsTransform object
					style = this.t.style,
					perspective = t.perspective,
					a11 = t.scaleX, a12 = 0, a13 = 0, a14 = 0,
					a21 = 0, a22 = t.scaleY, a23 = 0, a24 = 0,
					a31 = 0, a32 = 0, a33 = t.scaleZ, a34 = 0,
					a41 = 0, a42 = 0, a43 = (perspective) ? -1 / perspective : 0,
					angle = t.rotation,
					zOrigin = t.zOrigin,
					cma = ",",
					rnd = 100000,
					cos, sin, t1, t2, t3, t4, top, n, sfx;
				if (_isFirefox) { //Firefox has a bug that causes 3D elements to randomly disappear during animation unless a repaint is forced. One way to do this is change "top" by 0.05 which is imperceptible, so we go back and forth. Another way is to change the display to "none", read the clientTop, and then revert the display but that is much slower.
					top = style.top + "";
					n = parseFloat(top) || 0;
					sfx = top.substr((n + "").length);
					t._ffFix = !t._ffFix;
					style.top = (t._ffFix ? n + 0.05 : n - 0.05) + ((sfx === "") ? "px" : sfx);
				}

				if (angle) {
					cos = Math.cos(angle);
					sin = Math.sin(angle);
					t1 = a11*cos;
					t2 = a22*sin;
					a12 = a11*-sin;
					a22 = a22*cos;
					a11 = t1;
					a21 = t2;
				}
				angle = t.rotationY;
				if (angle) {
					cos = Math.cos(angle);
					sin = Math.sin(angle);
					t1 = a11*cos;
					t2 = a21*cos;
					t3 = a33*-sin;
					t4 = a43*-sin;
					a13 = a11*sin;
					a23 = a21*sin;
					a33 = a33*cos;
					a43 *= cos;
					a11 = t1;
					a21 = t2;
					a31 = t3;
					a41 = t4;
				}
				angle = t.rotationX;
				if (angle) {
					cos = Math.cos(angle);
					sin = Math.sin(angle);
					t1 = a12*cos+a13*sin;
					t2 = a22*cos+a23*sin;
					t3 = a32*cos+a33*sin;
					t4 = a42*cos+a43*sin;
					a13 = a12*-sin+a13*cos;
					a23 = a22*-sin+a23*cos;
					a33 = a32*-sin+a33*cos;
					a43 = a42*-sin+a43*cos;
					a12 = t1;
					a22 = t2;
					a32 = t3;
					a42 = t4;
				}
				if (zOrigin) {
					a34 -= zOrigin;
					a14 = a13*a34;
					a24 = a23*a34;
					a34 = a33*a34+zOrigin;
				}
				a14 += t.x;
				a24 += t.y;
				a34 = (((a34 + t.z) * rnd) >> 0) / rnd;

				style[_transformProp] = "matrix3d(" + (((a11 * rnd) >> 0) / rnd) + cma + (((a21 * rnd) >> 0) / rnd) + cma + (((a31 * rnd) >> 0) / rnd) + cma + (((a41 * rnd) >> 0) / rnd) + cma	+ (((a12 * rnd) >> 0) / rnd) + cma + (((a22 * rnd) >> 0) / rnd) + cma + (((a32 * rnd) >> 0) / rnd) + cma + (((a42 * rnd) >> 0) / rnd) + cma + (((a13 * rnd) >> 0) / rnd) + cma + (((a23 * rnd) >> 0) / rnd) + cma + (((a33 * rnd) >> 0) / rnd) + cma + (((a43 * rnd) >> 0) / rnd) + cma + (((a14 * rnd) >> 0) / rnd) + cma + (((a24 * rnd) >> 0) / rnd) + cma + a34 + cma + (perspective ? (1 + (-a34 / perspective)) : 1) + ")";
			},
			_set2DTransformRatio = function(v) {
				var t = this.data; //refers to the element's _gsTransform object
				if (!t.rotation && !t.skewX) {
					this.t.style[_transformProp] = "matrix(" + t.scaleX + ",0,0," + t.scaleY + "," + t.x + "," + t.y + ")";
				} else {
					var ang = t.rotation,
						skew = ang - t.skewX,
						rnd = 100000,
						//some browsers have a hard time with very small values like 2.4492935982947064e-16 (notice the "e-" towards the end) and would render the object slightly off. So we round to 5 decimal places.
						a = ((Math.cos(ang) * t.scaleX * rnd) >> 0) / rnd,
						b = ((Math.sin(ang) * t.scaleX * rnd) >> 0) / rnd,
						c = ((Math.sin(skew) * -t.scaleY * rnd) >> 0) / rnd,
						d = ((Math.cos(skew) * t.scaleY * rnd) >> 0) / rnd;
					this.t.style[_transformProp] = "matrix(" + a + "," + b + "," + c + "," + d + "," + t.x + "," + t.y + ")";
				}
			};

		_registerComplexSpecialProp("transform,scale,scaleX,scaleY,scaleZ,x,y,z,rotation,rotationX,rotationY,rotationZ,skewX,skewY,shortRotation,shortRotationX,shortRotationY,shortRotationZ,transformOrigin,transformPerspective", null, function(t, e, p, cssp, pt, plugin, vars) {
			if (cssp._transform) { return pt; } //only need to parse the transform once, and only if the browser supports it.
			var m1 = cssp._transform = _getTransform(t, _cs, true),
				style = t.style,
				min = 0.000001,
				i = _transformProps.length,
				v = vars,
				m2, rotation, skewY, copy, orig, has3D;

			if (typeof(v.transform) === "string" && _transformProp) { //for values like transform:"rotate(60deg) scale(0.5, 0.8)"
				copy = style[_transformProp];
				style[_transformProp] = v.transform;
				m2 = _getTransform(t, null, false);
				style[_transformProp] = copy;
			} else if (typeof(v) === "object") { //for values like scaleX, scaleY, rotation, x, y, skewX, and skewY or transform:{...} (object)
				rotation = (v.rotation != null) ? v.rotation : (v.rotationZ != null) ? v.rotationZ : m1.rotation * _RAD2DEG;
				m2 = {scaleX:_parseVal((v.scaleX != null) ? v.scaleX : v.scale, m1.scaleX),
					scaleY:_parseVal((v.scaleY != null) ? v.scaleY : v.scale, m1.scaleY),
					scaleZ:_parseVal((v.scaleZ != null) ? v.scaleZ : v.scale, m1.scaleZ),
					x:_parseVal(v.x, m1.x),
					y:_parseVal(v.y, m1.y),
					z:_parseVal(v.z, m1.z),
					perspective:_parseVal(v.transformPerspective, m1.perspective)};

				if (v.shortRotation != null || v.shortRotationZ != null) {
					m2.rotation = _parseShortRotation(v.shortRotation || v.shortRotationZ || 0, m1.rotation);
				} else {
					m2.rotation = (typeof(rotation) === "number") ? rotation * _DEG2RAD : _parseAngle(rotation, m1.rotation);
				}
				if (_supports3D) {
					m2.rotationX = (v.shortRotationX != null) ? _parseShortRotation(v.shortRotationX, m1.rotationX) : (typeof(v.rotationX) === "number") ? v.rotationX * _DEG2RAD : _parseAngle(v.rotationX, m1.rotationX);
					m2.rotationY = (v.shortRotationY != null) ? _parseShortRotation(v.shortRotationY, m1.rotationY) : (typeof(v.rotationY) === "number") ? v.rotationY * _DEG2RAD : _parseAngle(v.rotationY, m1.rotationY);
					if (m2.rotationX < min) if (m2.rotationX > -min) {
						m2.rotationX = 0;
					}
					if (m2.rotationY < min) if (m2.rotationY > -min) {
						m2.rotationY = 0;
					}
				}
				m2.skewX = (v.skewX == null) ? m1.skewX : (typeof(v.skewX) === "number") ? v.skewX * _DEG2RAD : _parseAngle(v.skewX, m1.skewX);

				//note: for performance reasons, we combine all skewing into the skewX and rotation values, ignoring skewY but we must still record it so that we can discern how much of the overall skew is attributed to skewX vs. skewY. Otherwise, if the skewY would always act relative (tween skewY to 10deg, for example, multiple times and if we always combine things into skewX, we can't remember that skewY was 10 from last time). Remember, a skewY of 10 degrees looks the same as a rotation of 10 degrees plus a skewX of -10 degrees.
				m2.skewY = (v.skewY == null) ? m1.skewY : (typeof(v.skewY) === "number") ? v.skewY * _DEG2RAD : _parseAngle(v.skewY, m1.skewY);
				if ((skewY = m2.skewY - m1.skewY)) {
					m2.skewX += skewY;
					m2.rotation += skewY;
				}
				//don't allow rotation/skew values to be a SUPER small decimal because when they're translated back to strings for setting the css property, the browser reports them in a funky way, like 1-e7. Of course we could use toFixed() to resolve that issue but that hurts performance quite a bit with all those function calls on every frame, plus it is virtually impossible to discern values that small visually (nobody will notice changing a rotation of 0.0000001 to 0, so the performance improvement is well worth it).
				if (m2.skewY < min) if (m2.skewY > -min) {
					m2.skewY = 0;
				}
				if (m2.skewX < min) if (m2.skewX > -min) {
					m2.skewX = 0;
				}
				if (m2.rotation < min) if (m2.rotation > -min) {
					m2.rotation = 0;
				}
			}

			has3D = (m1.z || m1.rotationX || m1.rotationY || m2.z || m2.rotationX || m2.rotationY || m2.perspective);
			if (!has3D && m2.scale != null) {
				m2.scaleZ = 1; //no need to tween scaleZ.
			}

			cssp._transformType = (has3D || this._transformType === 3) ? 3 : 2; //quicker than calling cssp._enableTransforms();

			while (--i > -1) {
				p = _transformProps[i];
				orig = m2[p] - m1[p];
				if (orig > min || orig < -min || _forcePT[p] != null) {
					pt = new CSSPropTween(m1, p, m1[p], orig, pt);
					pt.xs0 = 0; //ensures the value stays numeric in setRatio()
					pt.plugin = plugin;
					cssp._overwriteProps.push(pt.n);
				}
			}

			orig = v.transformOrigin;
			if (orig || (_supports3D && has3D && m1.zOrigin)) { //if anything 3D is happening and there's a transformOrigin with a z component that's non-zero, we must ensure that the transformOrigin's z-component is set to 0 so that we can manually do those calculations to get around Safari bugs. Even if the user didn't specifically define a "transformOrigin" in this particular tween (maybe they did it via css directly).
				if (_transformProp) {
					orig = (orig || _getStyle(t, p, _cs, false, "50% 50%")) + ""; //cast as string to avoid errors
					p = _transformOriginProp;
					pt = new CSSPropTween(style, p, 0, 0, pt, -1, "css_transformOrigin");
					pt.b = style[p];
					pt.plugin = plugin;
					if (_supports3D) {
						copy = m1.zOrigin;
						orig = orig.split(" ");
						m1.zOrigin = ((orig.length > 2) ? parseFloat(orig[2]) : copy) || 0; //Safari doesn't handle the z part of transformOrigin correctly, so we'll manually handle it in the _set3DTransformRatio() method.
						pt.xs0 = pt.e = style[p] = orig[0] + " " + (orig[1] || "50%") + " 0px"; //we must define a z value of 0px specifically otherwise iOS 5 Safari will stick with the old one (if one was defined)!
						pt = new CSSPropTween(m1, "zOrigin", 0, 0, pt, -1, pt.n); //we must create a CSSPropTween for the _gsTransform.zOrigin so that it gets reset properly at the beginning if the tween runs backward (as opposed to just setting m1.zOrigin here)
						pt.b = copy;
						pt.xs0 = pt.e = m1.zOrigin;
					} else {
						pt.xs0 = pt.e = style[p] = orig;
					}

				//for older versions of IE (6-8), we need to manually calculate things inside the setRatio() function. We record origin x and y (ox and oy) and whether or not the values are percentages (oxp and oyp).
				} else {
					_parsePosition(orig + "", m1);
				}
			}

			if (pt && pt.t === t) { //if no tweenable properties are found, remove the "transform" CSSPropTween from the linked list and return the original one that was passed in.
				if (pt._next) {
					pt._next._prev = null;
				}
				return pt._next;
			}
			return pt;

		}, true);



		_registerComplexSpecialProp("boxShadow", "0px 0px 0px 0px #999", null, true, true);
		_registerComplexSpecialProp("borderRadius", "0px", function(t, e, p, cssp, pt, plugin) {
			e = this.format(e);
			var props = ["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"],
				style = t.style,
				ea1, i, es2, bs2, bs, es, bn, en, w, h, esfx, bsfx, rel, hn, vn, em;
			w = parseFloat(t.offsetWidth);
			h = parseFloat(t.offsetHeight);
			ea1 = e.split(" ");
			for (i = 0; i < props.length; i++) { //if we're dealing with percentages, we must convert things separately for the horizontal and vertical axis!
				if (this.p.indexOf("border")) { //older browsers used a prefix
					props[i] = _checkPropPrefix(props[i]);
				}
				bs = bs2 = _getStyle(t, props[i], _cs, false, "0px");
				if (bs.indexOf(" ") !== -1) {
					bs2 = bs.split(" ");
					bs = bs2[0];
					bs2 = bs2[1];
				}
				es = es2 = ea1[i];
				bn = parseFloat(bs);
				bsfx = bs.substr((bn + "").length);
				rel = (es.charAt(1) === "=");
				if (rel) {
					en = parseInt(es.charAt(0)+"1");
					es = es.substr(2);
					en *= parseFloat(es);
					esfx = es.substr((en + "").length - (en < 0 ? 1 : 0)) || "";
				} else {
					en = parseFloat(es);
					esfx = es.substr((en + "").length);
				}
				if (esfx === "") {
					esfx = _suffixMap[p] || bsfx;
				}
				if (esfx !== bsfx) {
					hn = _convertToPixels(t, "borderLeft", bn, bsfx); //horizontal number (we use a bogus "borderLeft" property just because the _convertToPixels() method searches for the keywords "Left", "Right", "Top", and "Bottom" to determine of it's a horizontal or vertical property, and we need "border" in the name so that it knows it should measure relative to the element itself, not its parent.
					vn = _convertToPixels(t, "borderTop", bn, bsfx); //vertical number
					if (esfx === "%") {
						bs = (hn / w * 100) + "%";
						bs2 = (vn / h * 100) + "%";
					} else if (esfx === "em") {
						em = _convertToPixels(t, "borderLeft", 1, "em");
						bs = (hn / em) + "em";
						bs2 = (vn / em) + "em";
					} else {
						bs = hn + "px";
						bs2 = vn + "px";
					}
					if (rel) {
						es = (parseFloat(bs) + en) + esfx;
						es2 = (parseFloat(bs2) + en) + esfx;
					}
				}
				pt = _parseComplex(style, props[i], bs + " " + bs2, es + " " + es2, false, "0px", pt);
			}
			return pt;
		}, true, false, _getFormatter("0px 0px 0px 0px", false, true));
		_registerComplexSpecialProp("backgroundPosition", "0 0", function(t, e, p, cssp, pt, plugin) {
			var bp = "background-position",
				cs = (_cs || _getComputedStyle(t, null)),
				bs = this.format( ((cs) ? _ieVers ? cs.getPropertyValue(bp + "-x") + " " + cs.getPropertyValue(bp + "-y") : cs.getPropertyValue(bp) : t.currentStyle.backgroundPositionX + " " + t.currentStyle.backgroundPositionY) || "0 0"), //Internet Explorer doesn't report background-position correctly - we must query background-position-x and background-position-y and combine them (even in IE10). Before IE9, we must do the same with the currentStyle object and use camelCase
				es = this.format(e),
				ba, ea, i, pct, overlap;
			if ((bs.indexOf("%") !== -1) !== (es.indexOf("%") !== -1)) {
				ba = bs.split(" ");
				ea = es.split(" ");
				_tempImg.setAttribute("src", _getStyle(t, "backgroundImage").replace(_urlExp, "")); //set the temp <img>'s src to the background-image so that we can measure its width/height
				i = 2;
				while (--i > -1) {
					bs = ba[i];
					pct = (bs.indexOf("%") !== -1);
					if (pct !== (ea[i].indexOf("%") !== -1)) {
						overlap = (i === 0) ? t.offsetWidth - _tempImg.width : t.offsetHeight - _tempImg.height;
						ba[i] = pct ? (parseFloat(bs) / 100 * overlap) + "px" : (parseFloat(bs) / overlap * 100) + "%";
					}
				}
				bs = ba.join(" ");
			}
			return this.parseComplex(t.style, bs, es, pt, plugin);
		}, false, false, _parsePosition); //note: backgroundPosition doesn't support interpreting between px and % (start and end values should use the same units) because doing so would require determining the size of the image itself and that can't be done quickly.
		_registerComplexSpecialProp("backgroundSize", "0 0", null, false, false, _parsePosition);
		_registerComplexSpecialProp("perspective", "0px", null, true);
		_registerComplexSpecialProp("perspectiveOrigin", "50% 50%", null, true);
		_registerComplexSpecialProp("transformStyle", "preserve-3d", null, true);
		_registerComplexSpecialProp("margin", null, _getEdgeParser("marginTop,marginRight,marginBottom,marginLeft"));
		_registerComplexSpecialProp("padding", null, _getEdgeParser("paddingTop,paddingRight,paddingBottom,paddingLeft"));
		_registerComplexSpecialProp("clip", "rect(0px,0px,0px,0px)");
		_registerComplexSpecialProp("textShadow", "0px 0px 0px #999", null, false, true);
		_registerComplexSpecialProp("autoRound", null, function(t, e, p, cssp, pt) {return pt;}); //just so that we can ignore "autoRound"
		_registerComplexSpecialProp("border", "0px solid #000", function(t, e, p, cssp, pt, plugin) {
				return this.parseComplex(t.style, this.format(_getStyle(t, "borderTopWidth", _cs, false, "0px") + " " + _getStyle(t, "borderTopStyle", _cs, false, "solid") + " " + _getStyle(t, "borderTopColor", _cs, false, "#000")), this.format(e), pt, plugin);
			}, false, true, function(v) {
				var a = v.split(" ");
				return a[0] + " " + (a[1] || "solid") + " " + (v.match(_colorExp) || ["#000"])[0];
			});


		//opacity-related
		var _setIEOpacityRatio = function(v) {
				var t = this.t,
					val = this.s + this.c * v,
					skip;
				if (val === 100) { //for older versions of IE that need to use a filter to apply opacity, we should remove the filter if opacity hits 1 in order to improve performance.
					t.removeAttribute("filter");
					skip = (!_getStyle(this.data, "filter")); //if a class is applied that has an alpha filter, it will take effect (we don't want that), so re-apply our alpha filter in that case. We must first remove it and then check.
				}
				if (!skip) {
					if (this.xn1) {
						t.filter = t.filter || "alpha(opacity=100)"; //works around bug in IE7/8 that prevents changes to "visibility" from being applied properly if the filter is changed to a different alpha on the same frame.
					}
					if (t.filter.indexOf("opacity") === -1) { //only used if browser doesn't support the standard opacity style property (IE 7 and 8)
						t.filter += " alpha(opacity=" + (val >> 0) + ")"; //we round the value because otherwise, bugs in IE7/8 can prevent "visibility" changes from being applied properly.
					} else {
						t.filter = t.filter.replace(_opacityExp, "opacity=" + (val >> 0));
					}
				}
			};
		_registerComplexSpecialProp("opacity,alpha,autoAlpha", "1", function(t, e, p, cssp, pt, plugin) {
			var b = parseFloat(_getStyle(t, "opacity", _cs, false, "1")),
				e = parseFloat(e),
				style = t.style,
				vb;
			if (p === "autoAlpha") {
				vb = _getStyle(t, "visibility", _cs);
				if (b === 1) if (vb === "hidden") { //if visibility is initially set to "hidden", we should interpret that as intent to make opacity 0.
					b = 0;
				}
				pt = new CSSPropTween(style, "visibility", 0, 0, pt, -1, null, false, 0, ((b !== 0) ? "visible" : "hidden"), ((e === 0) ? "hidden" : "visible"));
				pt.xs0 = "visible";
				cssp._overwriteProps.push(pt.n);
			}
			if (_supportsOpacity) {
				pt = new CSSPropTween(style, "opacity", b, e - b, pt);
			} else {
				pt = new CSSPropTween(style, "opacity", b * 100, (e - b) * 100, pt);
				pt.xn1 = (p === "autoAlpha") ? 1 : 0; //we need to record whether or not this is an autoAlpha so that in the setRatio(), we know to duplicate the setting of the alpha in order to work around a bug in IE7 and IE8 that prevents changes to "visibility" from taking effect if the filter is changed to a different alpha(opacity) at the same time. Setting it to the SAME value first, then the new value works around the IE7/8 bug.
				style.zoom = 1; //helps correct an IE issue.
				pt.type = 2;
				pt.b = "alpha(opacity=" + pt.s + ")";
				pt.e = "alpha(opacity=" + (pt.s + pt.c) + ")";
				pt.data = t;
				pt.plugin = plugin;
				pt.setRatio = _setIEOpacityRatio;
			}
			return pt;
		});


		var _setClassNameRatio = function(v) {
			if (v === 1 || v === 0) {
				this.t.className = (v === 1) ? this.e : this.b;
				var mpt = this.data, //first MiniPropTween
					s = this.t.style,
					removeProp = s.removeProperty ? "removeProperty" : "removeAttribute"; //note: old versions of IE use "removeAttribute()" instead of "removeProperty()"
				while (mpt) {
					if (!mpt.v) {
						s[removeProp](mpt.p.replace(_capsExp, "-$1").toLowerCase());
					} else {
						s[mpt.p] = mpt.v;
					}
					mpt = mpt._next;
				}
			} else if (this.t.className !== this.b) {
				this.t.className = this.b;
			}
		};
		_registerComplexSpecialProp("className", null, function(t, e, p, cssp, pt, plugin, vars) {
			var b = t.className,
				cssText = t.style.cssText,
				difData, bs;
			pt = cssp._classNamePT = new CSSPropTween(t, p, 0, 0, pt, 2);
			pt.setRatio = _setClassNameRatio;
			pt.b = b;
			pt.e = (e.charAt(1) !== "=") ? e : (e.charAt(0) === "+") ? b + " " + e.substr(2) : b.split(e.substr(2)).join("");
			if (cssp._tween._duration) { //if it's a zero-duration tween, there's no need to tween anything or parse the data. In fact, if we switch classes temporarily (which we must do for proper parsing) and the class has a transition applied, it could cause a quick flash to the end state and back again initially in some browsers.
				bs = _getAllStyles(t, _cs, true);
				t.className = pt.e;
				difData = _cssDif(t, bs, _getAllStyles(t), vars);
				t.className = b;
				pt.data = difData.firstMPT;
				t.style.cssText = cssText; //we recorded cssText before we swapped classes and ran _getAllStyles() because in cases when a className tween is overwritten, we remove all the related tweening properties from that class change (otherwise class-specific stuff can't override properties we've directly set on the target's style object due to specificity). Note: see _getAllStyles() for the code that reverts things and makes the className CSSPropTween run its setRatio(0). Also, we record the className CSSPropTween instance in the element's _gsOverwrittenClassNamePT property (a linked list).
				pt = pt.xfirst = cssp.parse(t, difData.difs, pt, plugin); //we record the CSSPropTween as the xfirst so that we can handle overwriting propertly (if "className" gets overwritten, we must kill all the properties associated with the className part of the tween, so we can loop through from xfirst to the pt itself)
			}
			return pt;
		});

		p = "bezier,throwProps,physicsProps,physics2D".split(",");
		i = p.length;
		while (i--) {
			_registerPluginProp(p[i]);
		}








		p = CSSPlugin.prototype;
		p._firstPT = null;

		//gets called when the tween renders for the first time. This kicks everything off, recording start/end values, etc.
		p._onInitTween = function(target, vars, tween) {
			if (!target.nodeType) { //css is only for dom elements
				return false;
			}
			this._target = target;
			this._tween = tween;
			this._vars = vars;
			_autoRound = vars.autoRound;
			_hasPriority = false;
			_suffixMap = vars.suffixMap || CSSPlugin.suffixMap;
			_cs = _getComputedStyle(target, "");
			_overwriteProps = this._overwriteProps;
			var style = target.style,
				v, pt, pt2, first, last, next, zIndex, tpt, threeD;

			if (_reqSafariFix) if (style.zIndex === "") {
				v = _getStyle(target, "zIndex", _cs);
				if (v === "auto" || v === "") {
					//corrects a bug in [non-Android] Safari that prevents it from repainting elements in their new positions if they don't have a zIndex set. We also can't just apply this inside _parseTransform() because anything that's moved in any way (like using "left" or "top" instead of transforms like "x" and "y") can be affected, so it is best to ensure that anything that's tweening has a z-index. Setting "WebkitPerspective" to a non-zero value worked too except that on iOS Safari things would flicker randomly. Plus zIndex is less memory-intensive.
					style.zIndex = 0;
				}
			}

			if (typeof(vars) === "string") {
				first = style.cssText;
				v = _getAllStyles(target, _cs);
				style.cssText = first + ";" + vars;
				v = _cssDif(target, v, _getAllStyles(target)).difs;
				if (!_supportsOpacity && _opacityValExp.test(vars)) {
					v.opacity = parseFloat( RegExp.$1 );
				}
				vars = v;
				style.cssText = first;
			}
			this._firstPT = pt = this.parse(target, vars, null);

			if (this._transformType) {
				threeD = (this._transformType === 3);
				if (!_transformProp) {
					style.zoom = 1; //helps correct an IE issue.
				} else if (_isSafari) {
					_reqSafariFix = true;
					//if zIndex isn't set, iOS Safari doesn't repaint things correctly sometimes (seemingly at random).
					if (style.zIndex === "") {
						zIndex = _getStyle(target, "zIndex", _cs);
						if (zIndex === "auto" || zIndex === "") {
							style.zIndex = 0;
						}
					}
					//Setting WebkitBackfaceVisibility corrects 3 bugs:
					// 1) [non-Android] Safari skips rendering changes to "top" and "left" that are made on the same frame/render as a transform update.
					// 2) iOS Safari sometimes neglects to repaint elements in their new positions. Setting "WebkitPerspective" to a non-zero value worked too except that on iOS Safari things would flicker randomly.
					// 3) Safari sometimes displayed odd artifacts when tweening the transform (or WebkitTransform) property, like ghosts of the edges of the element remained. Definitely a browser bug.
					//Note: we allow the user to override the auto-setting by defining WebkitBackfaceVisibility in the vars of the tween.
					if (_isSafariLT6) {
						style.WebkitBackfaceVisibility = this._vars.WebkitBackfaceVisibility || (threeD ? "visible" : "hidden");
					}
				}
				pt2 = pt;
				while (pt2 && pt2._next) {
					pt2 = pt2._next;
				}
				tpt = new CSSPropTween(target, "transform", 0, 0, null, 2);
				this._linkCSSP(tpt, null, pt2);
				tpt.setRatio = (threeD && _supports3D) ? _set3DTransformRatio : _transformProp ? _set2DTransformRatio : _setIETransformRatio;
				tpt.data = this._transform || _getTransform(target, _cs, true);
				_overwriteProps.pop(); //we don't want to force the overwrite of all "transform" tweens of the target - we only care about individual transform properties like scaleX, rotation, etc. The CSSPropTween constructor automatically adds the property to _overwriteProps which is why we need to pop() here.
			}

			if (_hasPriority) {
				//reorders the linked list in order of pr (priority)
				while (pt) {
					next = pt._next;
					pt2 = first;
					while (pt2 && pt2.pr > pt.pr) {
						pt2 = pt2._next;
					}
					if ((pt._prev = pt2 ? pt2._prev : last)) {
						pt._prev._next = pt;
					} else {
						first = pt;
					}
					if ((pt._next = pt2)) {
						pt2._prev = pt;
					} else {
						last = pt;
					}
					pt = next;
				}
				this._firstPT = first;
			}
			return true;
		};


		p.parse = function(target, vars, pt, plugin) {
			var style = target.style,
				p, sp, bn, en, bs, es, bsfx, esfx, isStr, rel;
			for (p in vars) {
				es = vars[p]; //ending value string
				sp = _specialProps[p]; //SpecialProp lookup.
				if (sp) {
					pt = sp.parse(target, es, p, this, pt, plugin, vars);

				} else {
					bs = _getStyle(target, p, _cs) + "";
					isStr = (typeof(es) === "string");
					if (p === "color" || p === "fill" || p === "stroke" || p.indexOf("Color") !== -1 || (isStr && !es.indexOf("rgb"))) { //Opera uses background: to define color sometimes in addition to backgroundColor:
						if (!isStr) {
							es = _parseColor(es);
							es = ((es.length > 3) ? "rgba(" : "rgb(") + es.join(",") + ")";
						}
						pt = _parseComplex(style, p, bs, es, true, "transparent", pt, 0, plugin);


					} else if (isStr && (es.indexOf(" ") !== -1 || es.indexOf(",") !== -1)) {
						pt = _parseComplex(style, p, bs, es, true, null, pt, 0, plugin);

					} else {
						bn = parseFloat(bs);
						bsfx = bs.substr((bn + "").length);

						if (bs === "" || bs === "auto") {
							if (p === "width" || p === "height") {
								bn = _getDimension(target, p, _cs);
								bsfx = "px";
							} else {
								bn = (p !== "opacity") ? 0 : 1;
								bsfx = "";
							}
						}

						rel = (isStr && es.charAt(1) === "=");
						if (rel) {
							en = parseInt(es.charAt(0)+"1");
							es = es.substr(2);
							en *= parseFloat(es);
							esfx = es.substr((en + "").length - (en < 0 ? 1 : 0)) || "";
						} else {
							en = parseFloat(es);
							esfx = isStr ? es.substr((en + "").length) || "" : "";
						}

						if (esfx === "") {
							esfx = _suffixMap[p] || bsfx; //populate the end suffix, prioritizing the map, then if none is found, use the beginning suffix.
						}

						es = (en || en === 0) ? (rel ? en + bn : en) + esfx : vars[p]; //ensures that any += or -= prefixes are taken care of. Record the end value before normalizing the suffix because we always want to end the tween on exactly what they intended even if it doesn't match the beginning value's suffix.

						//if the beginning/ending suffixes don't match, normalize them...
						if (bsfx !== esfx) if (esfx !== "") if (en || en === 0) if (bn || bn === 0) {
							bn = _convertToPixels(target, p, bn, bsfx);
							if (esfx === "%") {
								bn /= _convertToPixels(target, p, 100, "%") / 100;
								if (bn > 100) { //extremely rare
									bn = 100;
								}

							} else if (esfx === "em") {
								bn /= _convertToPixels(target, p, 1, "em");

							//otherwise convert to pixels.
							} else {
								en = _convertToPixels(target, p, en, esfx);
								esfx = "px"; //we don't use bsfx after this, so we don't need to set it to px too.
							}
							if (rel) if (en || en === 0) {
								es = (en + bn) + esfx; //the changes we made affect relative calculations, so adjust the end value here.
							}
						}

						if (rel) {
							en += bn;
						}

						if ((bn || bn === 0) && (en || en === 0)) { //faster than isNaN(). Also, previously we required en !== bn but that doesn't really gain much performance and it prevents _parseToProxy() from working properly if beginning and ending values match but need to get tweened by an external plugin anyway. For example, a bezier tween where the target starts at left:0 and has these points: [{left:50},{left:0}] wouldn't work properly because when parsing the last point, it'd match the first (current) one and a non-tweening CSSPropTween would be recorded when we actually need a normal tween (type:0) so that things get updated during the tween properly.
							pt = new CSSPropTween(style, p, bn, en - bn, pt, 0, "css_" + p, (_autoRound !== false && (esfx === "px" || p === "zIndex")), 0, bs, es);
							pt.xs0 = esfx;
							//DEBUG: _log("tween "+p+" from "+pt.b+" to "+pt.e+" with suffix: "+pt.xs0)
						} else {
							pt = new CSSPropTween(style, p, en || bn || 0, 0, pt, -1, "css_" + p, false, 0, bs, es);
							pt.xs0 = (p === "display" && es === "none") ? bs : es; //intermediate value is typically the same as the end value except for "display"
							//DEBUG: _log("non-tweening value "+p+": "+pt.xs0);
						}
					}
				}
				if (plugin) if (pt && !pt.plugin) {
					pt.plugin = plugin;
				}
			}
			return pt;
		};


		//gets called every time the tween updates, passing the new ratio (typically a value between 0 and 1, but not always (for example, if an Elastic.easeOut is used, the value can jump above 1 mid-tween). It will always start and 0 and end at 1.
		p.setRatio = function(v) {
			var pt = this._firstPT,
				min = 0.000001,
				val, str, i;

			//at the end of the tween, we set the values to exactly what we received in order to make sure non-tweening values (like "position" or "float" or whatever) are set and so that if the beginning/ending suffixes (units) didn't match and we normalized to px, the value that the user passed in is used here. We check to see if the tween is at its beginning in case it's a from() tween in which case the ratio will actually go from 1 to 0 over the course of the tween (backwards).
			if (v === 1 && (this._tween._time === this._tween._duration || this._tween._time === 0)) {
				while (pt) {
					if (pt.type !== 2) {
						pt.t[pt.p] = pt.e;
					} else {
						pt.setRatio(v);
					}
					pt = pt._next;
				}

			} else if (v || !(this._tween._time === this._tween._duration || this._tween._time === 0) || this._tween._rawPrevTime === -0.000001) {
				while (pt) {
					val = pt.c * v + pt.s;
					if (pt.r) {
						val = (val > 0) ? (val + 0.5) >> 0 : (val - 0.5) >> 0;
					} else if (val < min) if (val > -min) {
						val = 0;
					}
					if (!pt.type) {
						pt.t[pt.p] = val + pt.xs0;
					} else if (pt.type === 1) { //complex value (one that typically has multiple numbers inside a string, like "rect(5px,10px,20px,25px)"
						i = pt.l;
						if (i === 2) {
							pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2;
						} else if (i === 3) {
							pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2 + pt.xn2 + pt.xs3;
						} else if (i === 4) {
							pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2 + pt.xn2 + pt.xs3 + pt.xn3 + pt.xs4;
						} else if (i === 5) {
							pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2 + pt.xn2 + pt.xs3 + pt.xn3 + pt.xs4 + pt.xn4 + pt.xs5;
						} else {
							str = pt.xs0 + val + pt.xs1;
							for (i = 1; i < pt.l; i++) {
								str += pt["xn"+i] + pt["xs"+(i+1)];
							}
							pt.t[pt.p] = str;
						}

					} else if (pt.type === -1) { //non-tweening value
						pt.t[pt.p] = pt.xs0;

					} else if (pt.setRatio) { //custom setRatio() for things like SpecialProps, external plugins, etc.
						pt.setRatio(v);
					}
					pt = pt._next;
				}

				//if the tween is reversed all the way back to the beginning, we need to restore the original values which may have different units (like % instead of px or em or whatever).
			} else {
				while (pt) {
					if (pt.type !== 2) {
						pt.t[pt.p] = pt.b;
					} else {
						pt.setRatio(v);
					}
					pt = pt._next;
				}
			}
		};

		/**
		 * @private
		 * Forces rendering of the target's transforms (rotation, scale, etc.) whenever the CSSPlugin's setRatio() is called.
		 * Basically, this tells the CSSPlugin to create a CSSPropTween (type 2) after instantiation that runs last in the linked
		 * list and calls the appropriate (3D or 2D) rendering function. We separate this into its own method so that we can call
		 * it from other plugins like BezierPlugin if, for example, it needs to apply an autoRotation and this CSSPlugin
		 * doesn't have any transform-related properties of its own. You can call this method as many times as you
		 * want and it won't create duplicate CSSPropTweens.
		 *
		 * @param {boolean} threeD if true, it should apply 3D tweens (otherwise, just 2D ones are fine and typically faster)
		 */
		p._enableTransforms = function(threeD) {
			this._transformType = (threeD || this._transformType === 3) ? 3 : 2;
		};

		/** @private **/
		p._linkCSSP = function(pt, next, prev, remove) {
			if (pt) {
				if (next) {
					next._prev = pt;
				}
				if (pt._next) {
					pt._next._prev = pt._prev;
				}
				if (prev) {
					prev._next = pt;
				} else if (!remove && this._firstPT === null) {
					this._firstPT = pt;
				}
				if (pt._prev) {
					pt._prev._next = pt._next;
				} else if (this._firstPT === pt) {
					this._firstPT = pt._next;
				}
				pt._next = next;
				pt._prev = prev;
			}
			return pt;
		};

		//we need to make sure that if alpha or autoAlpha is killed, opacity is too. And autoAlpha affects the "visibility" property.
		p._kill = function(lookup) {
			var copy = lookup,
				changed = false,
				pt, p, xfirst;
			if (lookup.css_autoAlpha || lookup.css_alpha) {
				copy = {};
				for (p in lookup) { //copy the lookup so that we're not changing the original which may be passed elsewhere.
					copy[p] = lookup[p];
				}
				copy.css_opacity = 1;
				if (copy.css_autoAlpha) {
					copy.css_visibility = 1;
				}
			}
			if (lookup.css_className && (pt = this._classNamePT)) {
				xfirst = pt.xfirst;
				if (xfirst && xfirst._prev) {
					this._linkCSSP(xfirst._prev, pt._next, xfirst._prev._prev); //break off the prev
				} else if (xfirst === this._firstPT) {
					this._firstPT = null;
				}
				if (pt._next) {
					this._linkCSSP(pt._next, pt._next._next, xfirst._prev);
				}
				this._target._gsOverwrittenClassNamePT = this._linkCSSP(pt, this._target._gsOverwrittenClassNamePT);
				this._classNamePT = null;
				changed = true;
			}
			return TweenPlugin.prototype._kill.call(this, copy) || changed;
		};


		TweenPlugin.activate([CSSPlugin]);
		return CSSPlugin;

	}, true);

	
	
	
	
	
	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * RoundPropsPlugin
 * ----------------------------------------------------------------
 */
	_gsDefine("plugins.RoundPropsPlugin", ["plugins.TweenPlugin"], function(TweenPlugin) {

		var RoundPropsPlugin = function(props, priority) {
				TweenPlugin.call(this, "roundProps", -1);
				this._overwriteProps.length = 0;
			},
			p = RoundPropsPlugin.prototype = new TweenPlugin("roundProps", -1);

		p.constructor = RoundPropsPlugin;
		RoundPropsPlugin.API = 2;

		p._onInitTween = function(target, value, tween) {
			this._tween = tween;
			return true;
		};

		p._onInitAllProps = function() {
			var tween = this._tween,
				rp = (tween.vars.roundProps instanceof Array) ? tween.vars.roundProps : tween.vars.roundProps.split(","),
				i = rp.length,
				lookup = {},
				rpt = tween._propLookup.roundProps,
				prop, pt, next;
			while (--i > -1) {
				lookup[rp[i]] = 1;
			}
			i = rp.length;
			while (--i > -1) {
				prop = rp[i];
				pt = tween._firstPT;
				while (pt) {
					next = pt._next; //record here, because it may get removed
					if (pt.pg) {
						pt.t._roundProps(lookup, true);
					} else if (pt.n === prop) {
						this._add(pt.t, prop, pt.s, pt.c);
						//remove from linked list
						if (next) {
							next._prev = pt._prev;
						}
						if (pt._prev) {
							pt._prev._next = next;
						} else if (tween._firstPT === pt) {
							tween._firstPT = next;
						}
						pt._next = pt._prev = null;
						tween._propLookup[prop] = rpt;
					}
					pt = next;
				}
			}
			return false;
		};

		p._add = function(target, p, s, c) {
			this._addTween(target, p, s, s + c, p, true);
			this._overwriteProps.push(p);
		};

		TweenPlugin.activate([RoundPropsPlugin]);

		return RoundPropsPlugin;

	}, true);


	
	
	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * EasePack
 * ----------------------------------------------------------------
 */
	_gsDefine("easing.Back", ["easing.Ease"], function(Ease) {
		
		var gs = window.com.greensock, 
			_class = gs._class, 
			_create = function(n, f) {
				var c = _class("easing." + n, function(){}, true), 
					p = c.prototype = new Ease();
				p.constructor = c;
				p.getRatio = f;
				return c;
			},
			
			//BACK
			_createBack = function(n, f) {
				var c = _class("easing." + n, function(overshoot) {
						this._p1 = (overshoot || overshoot === 0) ? overshoot : 1.70158;
						this._p2 = this._p1 * 1.525;
					}, true), 
					p = c.prototype = new Ease();
				p.constructor = c;
				p.getRatio = f;
				p.config = function(overshoot) {
					return new c(overshoot);
				};
				return c;
			}, 
			BackOut = _createBack("BackOut", function(p) {
				return ((p = p - 1) * p * ((this._p1 + 1) * p + this._p1) + 1);
			}), 
			BackIn = _createBack("BackIn", function(p) {
				return p * p * ((this._p1 + 1) * p - this._p1);
			}), 
			BackInOut = _createBack("BackInOut", function(p) {
				return ((p *= 2) < 1) ? 0.5 * p * p * ((this._p2 + 1) * p - this._p2) : 0.5 * ((p -= 2) * p * ((this._p2 + 1) * p + this._p2) + 2);
			}),  
			
			//BOUNCE
			BounceOut = _create("BounceOut", function(p) {
				if (p < 1 / 2.75) {
					return 7.5625 * p * p;
				} else if (p < 2 / 2.75) {
					return 7.5625 * (p -= 1.5 / 2.75) * p + 0.75;
				} else if (p < 2.5 / 2.75) {
					return 7.5625 * (p -= 2.25 / 2.75) * p + 0.9375;
				} else {
					return 7.5625 * (p -= 2.625 / 2.75) * p + 0.984375;
				}
			}), 
			BounceIn = _create("BounceIn", function(p) {
				if ((p = 1 - p) < 1 / 2.75) {
					return 1 - (7.5625 * p * p);
				} else if (p < 2 / 2.75) {
					return 1 - (7.5625 * (p -= 1.5 / 2.75) * p + 0.75);
				} else if (p < 2.5 / 2.75) {
					return 1 - (7.5625 * (p -= 2.25 / 2.75) * p + 0.9375);
				} else {
					return 1 - (7.5625 * (p -= 2.625 / 2.75) * p + 0.984375);
				}
			}), 
			BounceInOut = _create("BounceInOut", function(p) {
				var invert = (p < 0.5);
				if (invert) {
					p = 1 - (p * 2);
				} else {
					p = (p * 2) - 1;
				}
				if (p < 1 / 2.75) {
					p = 7.5625 * p * p;
				} else if (p < 2 / 2.75) {
					p = 7.5625 * (p -= 1.5 / 2.75) * p + 0.75;
				} else if (p < 2.5 / 2.75) {
					p = 7.5625 * (p -= 2.25 / 2.75) * p + 0.9375;
				} else {
					p = 7.5625 * (p -= 2.625 / 2.75) * p + 0.984375;
				}
				return invert ? (1 - p) * 0.5 : p * 0.5 + 0.5;
			}),
			
			//CIRC
			CircOut = _create("CircOut", function(p) {
				return Math.sqrt(1 - (p = p - 1) * p);
			}),
			CircIn = _create("CircIn", function(p) {
				return -(Math.sqrt(1 - (p * p)) - 1);
			}),
			CircInOut = _create("CircInOut", function(p) {
				return ((p*=2) < 1) ? -0.5 * (Math.sqrt(1 - p * p) - 1) : 0.5 * (Math.sqrt(1 - (p -= 2) * p) + 1);
			}),
			
			//ELASTIC
			_2PI = Math.PI * 2,
			_createElastic = function(n, f, def) {
				var c = _class("easing." + n, function(amplitude, period) {
						this._p1 = amplitude || 1;
						this._p2 = period || def;
						this._p3 = this._p2 / _2PI * (Math.asin(1 / this._p1) || 0);
					}, true), 
					p = c.prototype = new Ease();
				p.constructor = c;
				p.getRatio = f;
				p.config = function(amplitude, period) {
					return new c(amplitude, period);
				};
				return c;
			}, 
			ElasticOut = _createElastic("ElasticOut", function(p) {
				return this._p1 * Math.pow(2, -10 * p) * Math.sin( (p - this._p3) * _2PI / this._p2 ) + 1;
			}, 0.3), 
			ElasticIn = _createElastic("ElasticIn", function(p) {
				return -(this._p1 * Math.pow(2, 10 * (p -= 1)) * Math.sin( (p - this._p3) * _2PI / this._p2 ));
			}, 0.3), 
			ElasticInOut = _createElastic("ElasticInOut", function(p) {
				return ((p *= 2) < 1) ? -.5 * (this._p1 * Math.pow(2, 10 * (p -= 1)) * Math.sin( (p - this._p3) * _2PI / this._p2)) : this._p1 * Math.pow(2, -10 *(p -= 1)) * Math.sin( (p - this._p3) * _2PI / this._p2 ) *.5 + 1;
			}, 0.45),
			
			//Expo
			ExpoOut = _create("ExpoOut", function(p) {
				return 1 - Math.pow(2, -10 * p);
			}),
			ExpoIn = _create("ExpoIn", function(p) {
				return Math.pow(2, 10 * (p - 1)) - 0.001;
			}),
			ExpoInOut = _create("ExpoInOut", function(p) {
				return ((p *= 2) < 1) ? 0.5 * Math.pow(2, 10 * (p - 1)) : 0.5 * (2 - Math.pow(2, -10 * (p - 1)));
			}), 
			
			//Sine
			_HALF_PI = Math.PI / 2,
			SineOut = _create("SineOut", function(p) {
				return Math.sin(p * _HALF_PI);
			}),
			SineIn = _create("SineIn", function(p) {
				return -Math.cos(p * _HALF_PI) + 1;
			}),
			SineInOut = _create("SineInOut", function(p) {
				return -0.5 * (Math.cos(Math.PI * p) - 1);
			}),
			
			//SlowMo
			SlowMo = _class("easing.SlowMo", function(linearRatio, power, yoyoMode) {
				power = (power || power === 0) ? power : 0.7;
				if (linearRatio == null) {
					linearRatio = 0.7;
				} else if (linearRatio > 1) {
					linearRatio = 1;
				}
				this._p = (linearRatio != 1) ? power : 0;
				this._p1 = (1 - linearRatio) / 2;
				this._p2 = linearRatio;
				this._p3 = this._p1 + this._p2;
				this._calcEnd = (yoyoMode === true);
			}, true),
			p = SlowMo.prototype = new Ease();
			
		p.constructor = SlowMo;
		p.getRatio = function(p) {
			var r = p + (0.5 - p) * this._p;
			if (p < this._p1) {
				return this._calcEnd ? 1 - ((p = 1 - (p / this._p1)) * p) : r - ((p = 1 - (p / this._p1)) * p * p * p * r);
			} else if (p > this._p3) {
				return this._calcEnd ? 1 - (p = (p - this._p3) / this._p1) * p : r + ((p - r) * (p = (p - this._p3) / this._p1) * p * p * p);
			}
			return this._calcEnd ? 1 : r;
		};
		SlowMo.ease = new SlowMo(0.7, 0.7);
		
		p.config = SlowMo.config = function(linearRatio, power, yoyoMode) {
			return new SlowMo(linearRatio, power, yoyoMode);
		};
		
		
		//SteppedEase
		var SteppedEase = _class("easing.SteppedEase", function(steps) {
				steps = steps || 1;
				this._p1 = 1 / steps;
				this._p2 = steps + 1;
			}, true);
		p = SteppedEase.prototype = new Ease();	
		p.constructor = SteppedEase;
		p.getRatio = function(p) {
			if (p < 0) {
				p = 0;
			} else if (p >= 1) {
				p = 0.999999999;
			}
			return ((this._p2 * p) >> 0) * this._p1;
		};
		p.config = SteppedEase.config = function(steps) {
			return new SteppedEase(steps);
		};
		
		
		_class("easing.Bounce", {
				easeOut:new BounceOut(),
				easeIn:new BounceIn(),
				easeInOut:new BounceInOut()
			}, true);
		
		_class("easing.Circ", {
				easeOut:new CircOut(),
				easeIn:new CircIn(),
				easeInOut:new CircInOut()
			}, true);
		
		_class("easing.Elastic", {
				easeOut:new ElasticOut(),
				easeIn:new ElasticIn(),
				easeInOut:new ElasticInOut()
			}, true);
			
		_class("easing.Expo", {
				easeOut:new ExpoOut(),
				easeIn:new ExpoIn(),
				easeInOut:new ExpoInOut()
			}, true);
			
		_class("easing.Sine", {
				easeOut:new SineOut(),
				easeIn:new SineIn(),
				easeInOut:new SineInOut()
			}, true);
		
		
		return {
			easeOut:new BackOut(),
			easeIn:new BackIn(),
			easeInOut:new BackInOut()
		};
		
	}, true);


}); 











/*
 * ----------------------------------------------------------------
 * Base classes like TweenLite, SimpleTimeline, Ease, Ticker, etc. (!TweenLite)
 * ----------------------------------------------------------------
 */
(function(window) {

	"use strict";
	var _namespace = function(ns) {
			var a = ns.split("."),
				p = window, i;
			for (i = 0; i < a.length; i++) {
				p[a[i]] = p = p[a[i]] || {};
			}
			return p;
		},
		gs = _namespace("com.greensock"),
		a, i, e, e2, p, _gsInit,
		_classLookup = {},

	//_DepClass is for defining a dependent class. ns = namespace (leaving off "com.greensock." as that's assumed), dep = an array of namespaces that are required, def = the function that will return the class definition (this function will be passed each dependency in order as soon as they arrive), global = if true, the class is added to the global scope (window) or if requirejs is being used, it will tap into that instead.
		_DepClass = function(ns, dep, def, global) {
			this.sc = (_classLookup[ns]) ? _classLookup[ns].sc : []; //subclasses
			_classLookup[ns] = this;
			this.gsClass = null;
			this.def = def;
			var _dep = dep || [],
				_classes = [];
			this.check = function(init) {
				var i = _dep.length, cnt = 0, cur;
				while (--i > -1) {
					if ((cur = _classLookup[_dep[i]] || new _DepClass(_dep[i])).gsClass) {
						_classes[i] = cur.gsClass;
					} else {
						cnt++;
						if (init) {
							cur.sc.push(this);
						}
					}
				}
				if (cnt === 0 && def) {
					var a = ("com.greensock." + ns).split("."),
						n = a.pop(),
						cl = _namespace(a.join("."))[n] = this.gsClass = def.apply(def, _classes);

					//exports to multiple environments
					if (global) {
						(window.GreenSockGlobals || window)[n] = cl; //provides a way to avoid global namespace pollution. By default, the main classes like TweenLite, Power1, Strong, etc. are added to window unless a GreenSockGlobals is defined. So if you want to have things added to a custom object instead, just do something like window.GreenSockGlobals = {} before loading any GreenSock files. You can even set up an alias like window.GreenSockGlobals = windows.gs = {} so that you can access everything like gs.TweenLite. Also remember that ALL classes are added to the window.com.greensock object (in their respective packages, like com.greensock.easing.Power1, com.greensock.TweenLite, etc.)
						if (typeof(define) === "function" && define.amd){ //AMD
							define((window.GreenSockAMDPath ? window.GreenSockAMDPath + "/" : "") + ns.split(".").join("/"), [], function() { return cl; });
						} else if (typeof(module) !== "undefined" && module.exports){ //node
							module.exports = cl;
						}
					}

					for (i = 0; i < this.sc.length; i++) {
						this.sc[i].check(false);
					}

				}
			};
			this.check(true);
		},
	//a quick way to create a class that doesn't have any dependencies. Returns the class, but first registers it in the GreenSock namespace so that other classes can grab it (other classes might be dependent on the class).
		_class = gs._class = function(ns, f, g) {
			f = f || function() {};
			var c = new _DepClass(ns, [], function(){ return f; }, g);
			return f;
		};

	//used to create _DepClass instances (which basically registers a class that has dependencies). ns = namespace, dep = dependencies (array), f = initialization function which should return the class, g = global (whether or not the class should be added to the global namespace (or if RequireJS is used, it will be defined as a named module instead)
	window._gsDefine = function(ns, dep, f, g) {
		return new _DepClass(ns, dep, f, g);
	};



	/*
	 * ----------------------------------------------------------------
	 * Ease
	 * ----------------------------------------------------------------
	 */
	var _baseParams = [0, 0, 1, 1],
		_blankArray = [],
		Ease = _class("easing.Ease", function(func, extraParams, type, power) {
			this._func = func;
			this._type = type || 0;
			this._power = power || 0;
			this._params = extraParams ? _baseParams.concat(extraParams) : _baseParams;
		}, true);

	p = Ease.prototype;
	p._calcEnd = false;
	p.getRatio = function(p) {
		if (this._func) {
			this._params[0] = p;
			return this._func.apply(null, this._params);
		} else {
			var t = this._type,
				pw = this._power,
				r = (t === 1) ? 1 - p : (t === 2) ? p : (p < 0.5) ? p * 2 : (1 - p) * 2;
			if (pw === 1) {
				r *= r;
			} else if (pw === 2) {
				r *= r * r;
			} else if (pw === 3) {
				r *= r * r * r;
			} else if (pw === 4) {
				r *= r * r * r * r;
			}
			return (t === 1) ? 1 - r : (t === 2) ? r : (p < 0.5) ? r / 2 : 1 - (r / 2);
		}
	};

	//create all the standard eases like Linear, Quad, Cubic, Quart, Quint, Strong, Power0, Power1, Power2, Power3, and Power4 (each with easeIn, easeOut, and easeInOut)
	a = ["Linear","Quad","Cubic","Quart","Quint"];
	i = a.length;
	while(--i > -1) {
		e = _class("easing." + a[i], null, true);
		e2 = _class("easing.Power" + i, null, true);
		e.easeOut = e2.easeOut = new Ease(null, null, 1, i);
		e.easeIn = e2.easeIn = new Ease(null, null, 2, i);
		e.easeInOut = e2.easeInOut = new Ease(null, null, 3, i);
	}
	_class("easing.Strong", gs.easing.Power4, true);
	gs.easing.Linear.easeNone = gs.easing.Linear.easeIn;


	/*
	 * ----------------------------------------------------------------
	 * EventDispatcher
	 * ----------------------------------------------------------------
	 */
	var EventDispatcher = _class("events.EventDispatcher", function(target) {
		this._listeners = {};
		this._eventTarget = target || this;
	});
	p = EventDispatcher.prototype;

	p.addEventListener = function(type, callback, scope, useParam, priority) {
		priority = priority || 0;
		var list = this._listeners[type],
			index = 0,
			listener, i;
		if (list == null) {
			this._listeners[type] = list = [];
		}
		i = list.length;
		while (--i > -1) {
			listener = list[i];
			if (listener.c === callback) {
				list.splice(i, 1);
			} else if (index === 0 && listener.pr < priority) {
				index = i + 1;
			}
		}
		list.splice(index, 0, {c:callback, s:scope, up:useParam, pr:priority});
	};

	p.removeEventListener = function(type, callback) {
		var list = this._listeners[type], i;
		if (list) {
			i = list.length;
			while (--i > -1) {
				if (list[i].c === callback) {
					list.splice(i, 1);
					return;
				}
			}
		}
	};

	p.dispatchEvent = function(type) {
		var list = this._listeners[type];
		if (list) {
			var i = list.length,
				t = this._eventTarget,
				listener;
			while (--i > -1) {
				listener = list[i];
				if (listener.up) {
					listener.c.call(listener.s || t, {type:type, target:t});
				} else {
					listener.c.call(listener.s || t);
				}
			}
		}
	};


	/*
	 * ----------------------------------------------------------------
	 * Ticker
	 * ----------------------------------------------------------------
	 */
	var _reqAnimFrame = window.requestAnimationFrame,
		_cancelAnimFrame = window.cancelAnimationFrame,
		_getTime = Date.now || function() {return new Date().getTime();};

	//now try to determine the requestAnimationFrame and cancelAnimationFrame functions and if none are found, we'll use a setTimeout()/clearTimeout() polyfill.
	a = ["ms","moz","webkit","o"];
	i = a.length;
	while (--i > -1 && !_reqAnimFrame) {
		_reqAnimFrame = window[a[i] + "RequestAnimationFrame"];
		_cancelAnimFrame = window[a[i] + "CancelAnimationFrame"] || window[a[i] + "CancelRequestAnimationFrame"];
	}

	_class("Ticker", function(fps, useRAF) {
		var _self = this,
			_startTime = _getTime(),
			_useRAF = (useRAF !== false && _reqAnimFrame),
			_fps, _req, _id, _gap, _nextTime,
			_cancelReq = function() {
				if (_id == null) {
					return;
				}
				if (!_useRAF || !_cancelAnimFrame) {
					window.clearTimeout(_id);
				} else {
					_cancelAnimFrame(_id);
				}
				_id = null;
			},
			_tick = function(manual) {
				_self.time = (_getTime() - _startTime) / 1000;
				if (!_fps || _self.time >= _nextTime || (manual === true)) {
					_self.frame++;
					_nextTime = (_self.time > _nextTime) ? _self.time + _gap - (_self.time - _nextTime) : _self.time + _gap - 0.001;
					if (_nextTime < _self.time + 0.001) {
						_nextTime = _self.time + 0.001;
					}
					_self.dispatchEvent("tick");
				}
				if (manual !== true) {
					_id = _req(_tick);
				}
			};

		EventDispatcher.call(_self);
		this.time = this.frame = 0;
		this.tick = function() {
			_tick(true);
		};

		this.fps = function(value) {
			if (!arguments.length) {
				return _fps;
			}
			_fps = value;
			_gap = 1 / (_fps || 60);
			_nextTime = this.time + _gap;
			_req = (_fps === 0) ? function(f){} : (!_useRAF || !_reqAnimFrame) ? function(f) { return window.setTimeout( f, (((_nextTime - _self.time) * 1000 + 1) >> 0) || 1); } : _reqAnimFrame;
			_cancelReq();
			_id = _req(_tick);
		};

		this.useRAF = function(value) {
			if (!arguments.length) {
				return _useRAF;
			}
			_cancelReq();
			_useRAF = value;
			_self.fps(_fps);
		};
		_self.fps(fps);

		//a bug in iOS 6 Safari occasionally prevents the requestAnimationFrame from working initially, so we use a 1-second timeout that automatically falls back to setTimeout() if it senses this condition.
		window.setTimeout(function() {
			if (_useRAF && !_id) {
				_self.useRAF(false);
			}
		}, 1000);
	});

	p = gs.Ticker.prototype = new gs.events.EventDispatcher();
	p.constructor = gs.Ticker;


	/*
	 * ----------------------------------------------------------------
	 * Animation
	 * ----------------------------------------------------------------
	 */
	var Animation = _class("core.Animation", function(duration, vars) {
			this.vars = vars || {};
			this._duration = this._totalDuration = duration || 0;
			this._delay = Number(this.vars.delay) || 0;
			this._timeScale = 1;
			this._active = (this.vars.immediateRender === true);
			this.data = this.vars.data;
			this._reversed = (this.vars.reversed === true);

			if (!_rootTimeline) {
				return;
			}
			if (!_gsInit) {
				_ticker.tick(); //the first time an animation (tween or timeline) is created, we should refresh the time in order to avoid a gap. The Ticker's initial time that it records might be very early in the load process and the user may have loaded several other large scripts in the mean time, but we want tweens to act as though they started when the page's onload was fired. Also remember that the requestAnimationFrame likely won't be called until the first screen redraw.
				_gsInit = true;
			}

			var tl = this.vars.useFrames ? _rootFramesTimeline : _rootTimeline;
			tl.insert(this, tl._time);

			if (this.vars.paused) {
				this.paused(true);
			}
		}),
		_ticker = Animation.ticker = new gs.Ticker();

	p = Animation.prototype;
	p._dirty = p._gc = p._initted = p._paused = false;
	p._totalTime = p._time = 0;
	p._rawPrevTime = -1;
	p._next = p._last = p._onUpdate = p._timeline = p.timeline = null;
	p._paused = false;

	p.play = function(from, suppressEvents) {
		if (arguments.length) {
			this.seek(from, suppressEvents);
		}
		this.reversed(false);
		return this.paused(false);
	};

	p.pause = function(atTime, suppressEvents) {
		if (arguments.length) {
			this.seek(atTime, suppressEvents);
		}
		return this.paused(true);
	};

	p.resume = function(from, suppressEvents) {
		if (arguments.length) {
			this.seek(from, suppressEvents);
		}
		return this.paused(false);
	};

	p.seek = function(time, suppressEvents) {
		return this.totalTime(Number(time), (suppressEvents != false));
	};

	p.restart = function(includeDelay, suppressEvents) {
		this.reversed(false);
		this.paused(false);
		return this.totalTime((includeDelay) ? -this._delay : 0, (suppressEvents !== false));
	};

	p.reverse = function(from, suppressEvents) {
		if (arguments.length) {
			this.seek((from || this.totalDuration()), suppressEvents);
		}
		this.reversed(true);
		return this.paused(false);
	};

	p.render = function() {

	};

	p.invalidate = function() {
		return this;
	};

	p._enabled = function (enabled, ignoreTimeline) {
		this._gc = !enabled;
		this._active = (enabled && !this._paused && this._totalTime > 0 && this._totalTime < this._totalDuration);
		if (ignoreTimeline !== true) {
			if (enabled && this.timeline == null) {
				this._timeline.insert(this, this._startTime - this._delay);
			} else if (!enabled && this.timeline != null) {
				this._timeline._remove(this, true);
			}
		}
		return false;
	};


	p._kill = function(vars, target) {
		return this._enabled(false, false);
	};

	p.kill = function(vars, target) {
		this._kill(vars, target);
		return this;
	};

	p._uncache = function(includeSelf) {
		var tween = includeSelf ? this : this.timeline;
		while (tween) {
			tween._dirty = true;
			tween = tween.timeline;
		}
		return this;
	};

//----Animation getters/setters --------------------------------------------------------

	p.eventCallback = function(type, callback, params, scope) {
		if (type == null) {
			return null;
		} else if (type.substr(0,2) === "on") {
			if (arguments.length === 1) {
				return this.vars[type];
			}
			if (callback == null) {
				delete this.vars[type];
			} else {
				this.vars[type] = callback;
				this.vars[type + "Params"] = params;
				this.vars[type + "Scope"] = scope;
				if (params) {
					var i = params.length;
					while (--i > -1) {
						if (params[i] === "{self}") {
							params = this.vars[type + "Params"] = params.concat(); //copying the array avoids situations where the same array is passed to multiple tweens/timelines and {self} doesn't correctly point to each individual instance.
							params[i] = this;
						}
					}
				}
			}
			if (type === "onUpdate") {
				this._onUpdate = callback;
			}
		}
		return this;
	};

	p.delay = function(value) {
		if (!arguments.length) {
			return this._delay;
		}
		if (this._timeline.smoothChildTiming) {
			this.startTime( this._startTime + value - this._delay );
		}
		this._delay = value;
		return this;
	};

	p.duration = function(value) {
		if (!arguments.length) {
			this._dirty = false;
			return this._duration;
		}
		this._duration = this._totalDuration = value;
		this._uncache(true); //true in case it's a TweenMax or TimelineMax that has a repeat - we'll need to refresh the totalDuration.
		if (this._timeline.smoothChildTiming) if (this._time > 0) if (this._time < this._duration) if (value !== 0) {
			this.totalTime(this._totalTime * (value / this._duration), true);
		}
		return this;
	};

	p.totalDuration = function(value) {
		this._dirty = false;
		return (!arguments.length) ? this._totalDuration : this.duration(value);
	};

	p.time = function(value, suppressEvents) {
		if (!arguments.length) {
			return this._time;
		}
		if (this._dirty) {
			this.totalDuration();
		}
		if (value > this._duration) {
			value = this._duration;
		}
		return this.totalTime(value, suppressEvents);
	};

	p.totalTime = function(time, suppressEvents) {
		if (!arguments.length) {
			return this._totalTime;
		}
		if (this._timeline) {
			if (time < 0) {
				time += this.totalDuration();
			}
			if (this._timeline.smoothChildTiming) {
				if (this._dirty) {
					this.totalDuration();
				}
				if (time > this._totalDuration) {
					time = this._totalDuration;
				}
				this._startTime = (this._paused ? this._pauseTime : this._timeline._time) - ((!this._reversed ? time : this._totalDuration - time) / this._timeScale);
				if (!this._timeline._dirty) { //for performance improvement. If the parent's cache is already dirty, it already took care of marking the anscestors as dirty too, so skip the function call here.
					this._uncache(false);
				}
				if (!this._timeline._active) {
					//in case any of the anscestors had completed but should now be enabled...
					var tl = this._timeline;
					while (tl._timeline) {
						tl.totalTime(tl._totalTime, true);
						tl = tl._timeline;
					}
				}
			}
			if (this._gc) {
				this._enabled(true, false);
			}
			if (this._totalTime !== time) {
				this.render(time, suppressEvents, false);
			}
		}
		return this;
	};

	p.startTime = function(value) {
		if (!arguments.length) {
			return this._startTime;
		}
		if (value != this._startTime) {
			this._startTime = value;
			if (this.timeline) if (this.timeline._sortChildren) {
				this.timeline.insert(this, value - this._delay); //ensures that any necessary re-sequencing of Animations in the timeline occurs to make sure the rendering order is correct.
			}
		}
		return this;
	};

	p.timeScale = function(value) {
		if (!arguments.length) {
			return this._timeScale;
		}
		value = value || 0.000001; //can't allow zero because it'll throw the math off
		if (this._timeline && this._timeline.smoothChildTiming) {
			var t = (this._pauseTime || this._pauseTime === 0) ? this._pauseTime : this._timeline._totalTime;
			this._startTime = t - ((t - this._startTime) * this._timeScale / value);
		}
		this._timeScale = value;
		return this._uncache(false);
	};

	p.reversed = function(value) {
		if (!arguments.length) {
			return this._reversed;
		}
		if (value !== this._reversed) {
			this._reversed = value;
			this.totalTime(this._totalTime, true);
		}
		return this;
	};

	p.paused = function(value) {
		if (!arguments.length) {
			return this._paused;
		}
		if (value !== this._paused) if (this._timeline) {
			if (!value && this._timeline.smoothChildTiming) {
				this._startTime += this._timeline.rawTime() - this._pauseTime;
				this._uncache(false);
			}
			this._pauseTime = (value) ? this._timeline.rawTime() : null;
			this._paused = value;
			this._active = (!this._paused && this._totalTime > 0 && this._totalTime < this._totalDuration);
		}
		if (this._gc) if (!value) {
			this._enabled(true, false);
		}
		return this;
	};


	/*
	 * ----------------------------------------------------------------
	 * SimpleTimeline
	 * ----------------------------------------------------------------
	 */
	var SimpleTimeline = _class("core.SimpleTimeline", function(vars) {
		Animation.call(this, 0, vars);
		this.autoRemoveChildren = this.smoothChildTiming = true;
	});

	p = SimpleTimeline.prototype = new Animation();
	p.constructor = SimpleTimeline;
	p.kill()._gc = false;
	p._first = p._last = null;
	p._sortChildren = false;

	p.insert = function(tween, time) {
		tween._startTime = Number(time || 0) + tween._delay;
		if (tween._paused) if (this !== tween._timeline) { //we only adjust the _pauseTime if it wasn't in this timeline already. Remember, sometimes a tween will be inserted again into the same timeline when its startTime is changed so that the tweens in the TimelineLite/Max are re-ordered properly in the linked list (so everything renders in the proper order).
			tween._pauseTime = tween._startTime + ((this.rawTime() - tween._startTime) / tween._timeScale);
		}
		if (tween.timeline) {
			tween.timeline._remove(tween, true); //removes from existing timeline so that it can be properly added to this one.
		}
		tween.timeline = tween._timeline = this;
		if (tween._gc) {
			tween._enabled(true, true);
		}

		var prevTween = this._last;
		if (this._sortChildren) {
			var st = tween._startTime;
			while (prevTween && prevTween._startTime > st) {
				prevTween = prevTween._prev;
			}
		}
		if (prevTween) {
			tween._next = prevTween._next;
			prevTween._next = tween;
		} else {
			tween._next = this._first;
			this._first = tween;
		}
		if (tween._next) {
			tween._next._prev = tween;
		} else {
			this._last = tween;
		}
		tween._prev = prevTween;

		if (this._timeline) {
			this._uncache(true);
		}
		return this;
	};

	p._remove = function(tween, skipDisable) {
		if (tween.timeline === this) {
			if (!skipDisable) {
				tween._enabled(false, true);
			}
			tween.timeline = null;

			if (tween._prev) {
				tween._prev._next = tween._next;
			} else if (this._first === tween) {
				this._first = tween._next;
			}
			if (tween._next) {
				tween._next._prev = tween._prev;
			} else if (this._last === tween) {
				this._last = tween._prev;
			}

			if (this._timeline) {
				this._uncache(true);
			}
		}
		return this;
	};

	p.render = function(time, suppressEvents, force) {
		var tween = this._first,
			next;
		this._totalTime = this._time = this._rawPrevTime = time;
		while (tween) {
			next = tween._next; //record it here because the value could change after rendering...
			if (tween._active || (time >= tween._startTime && !tween._paused)) {
				if (!tween._reversed) {
					tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, false);
				} else {
					tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, false);
				}
			}
			tween = next;
		}
	};

	p.rawTime = function() {
		return this._totalTime;
	};


	/*
	 * ----------------------------------------------------------------
	 * TweenLite
	 * ----------------------------------------------------------------
	 */
	var TweenLite = _class("TweenLite", function(target, duration, vars) {
		Animation.call(this, duration, vars);

		if (target == null) {
			throw "Cannot tween an undefined reference.";
		}
		this.target = target;

		this._overwrite = (this.vars.overwrite == null) ? _overwriteLookup[TweenLite.defaultOverwrite] : (typeof(this.vars.overwrite) === "number") ? this.vars.overwrite >> 0 : _overwriteLookup[this.vars.overwrite];

		var jq, i, targ;
		if ((target instanceof Array || target.jquery) && typeof(target[0]) === "object") {
			this._targets = target.slice(0); //works for both jQuery and Array instances
			this._propLookup = [];
			this._siblings = [];
			for (i = 0; i < this._targets.length; i++) {
				targ = this._targets[i];
				//in case the user is passing in an array of jQuery objects, for example, we need to check one more level and pull things out if necessary...
				if (targ.jquery) {
					this._targets.splice(i--, 1);
					this._targets = this._targets.concat(targ.constructor.makeArray(targ));
					continue;
				}
				this._siblings[i] = _register(targ, this, false);
				if (this._overwrite === 1) if (this._siblings[i].length > 1) {
					_applyOverwrite(targ, this, null, 1, this._siblings[i]);
				}
			}

		} else {
			this._propLookup = {};
			this._siblings = _register(target, this, false);
			if (this._overwrite === 1) if (this._siblings.length > 1) {
				_applyOverwrite(target, this, null, 1, this._siblings);
			}
		}

		if (this.vars.immediateRender || (duration === 0 && this._delay === 0 && this.vars.immediateRender !== false)) {
			this.render(-this._delay, false, true);
		}
	}, true);

	p = TweenLite.prototype = new Animation();
	p.constructor = TweenLite;
	p.kill()._gc = false;

//----TweenLite defaults, overwrite management, and root updates ----------------------------------------------------

	p.ratio = 0;
	p._firstPT = p._targets = p._overwrittenProps = null;
	p._notifyPluginsOfEnabled = false;

	TweenLite.version = 1.651;
	TweenLite.defaultEase = p._ease = new Ease(null, null, 1, 1);
	TweenLite.defaultOverwrite = "auto";
	TweenLite.ticker = _ticker;

	var _plugins = TweenLite._plugins = {},
		_tweenLookup = TweenLite._tweenLookup = {},
		_tweenLookupNum = 0,
		_reservedProps = {ease:1, delay:1, overwrite:1, onComplete:1, onCompleteParams:1, onCompleteScope:1, useFrames:1, runBackwards:1, startAt:1, onUpdate:1, onUpdateParams:1, onUpdateScope:1, onStart:1, onStartParams:1, onStartScope:1, onReverseComplete:1, onReverseCompleteParams:1, onReverseCompleteScope:1, onRepeat:1, onRepeatParams:1, onRepeatScope:1, easeParams:1, yoyo:1, orientToBezier:1, immediateRender:1, repeat:1, repeatDelay:1, data:1, paused:1, reversed:1},
		_overwriteLookup = {none:0, all:1, auto:2, concurrent:3, allOnStart:4, preexisting:5, "true":1, "false":0},
		_rootFramesTimeline = Animation._rootFramesTimeline = new SimpleTimeline(),
		_rootTimeline = Animation._rootTimeline = new SimpleTimeline();

	_rootTimeline._startTime = _ticker.time;
	_rootFramesTimeline._startTime = _ticker.frame;
	_rootTimeline._active = _rootFramesTimeline._active = true;

	Animation._updateRoot = function() {
		_rootTimeline.render((_ticker.time - _rootTimeline._startTime) * _rootTimeline._timeScale, false, false);
		_rootFramesTimeline.render((_ticker.frame - _rootFramesTimeline._startTime) * _rootFramesTimeline._timeScale, false, false);
		if (!(_ticker.frame % 120)) { //dump garbage every 120 frames...
			var i, a, p;
			for (p in _tweenLookup) {
				a = _tweenLookup[p].tweens;
				i = a.length;
				while (--i > -1) {
					if (a[i]._gc) {
						a.splice(i, 1);
					}
				}
				if (a.length === 0) {
					delete _tweenLookup[p];
				}
			}
		}
	};

	_ticker.addEventListener("tick", Animation._updateRoot);

	var _register = function(target, tween, scrub) {
			var id = target._gsTweenID, a, i;
			if (!_tweenLookup[id || (target._gsTweenID = id = "t" + (_tweenLookupNum++))]) {
				_tweenLookup[id] = {target:target, tweens:[]};
			}
			if (tween) {
				a = _tweenLookup[id].tweens;
				a[(i = a.length)] = tween;
				if (scrub) {
					while (--i > -1) {
						if (a[i] === tween) {
							a.splice(i, 1);
						}
					}
				}
			}
			return _tweenLookup[id].tweens;
		},

		_applyOverwrite = function(target, tween, props, mode, siblings) {
			var i, changed, curTween;
			if (mode === 1 || mode >= 4) {
				var l = siblings.length;
				for (i = 0; i < l; i++) {
					if ((curTween = siblings[i]) !== tween) {
						if (!curTween._gc) if (curTween._enabled(false, false)) {
							changed = true;
						}
					} else if (mode === 5) {
						break;
					}
				}
				return changed;
			}
			//NOTE: Add 0.0000000001 to overcome floating point errors that can cause the startTime to be VERY slightly off (when a tween's time() is set for example)
			var startTime = tween._startTime + 0.0000000001,
				overlaps = [],
				oCount = 0,
				zeroDur = (tween._duration === 0),
				globalStart;
			i = siblings.length;
			while (--i > -1) {
				if ((curTween = siblings[i]) === tween || curTween._gc || curTween._paused) {
					//ignore
				} else if (curTween._timeline !== tween._timeline) {
					globalStart = globalStart || _checkOverlap(tween, 0, zeroDur);
					if (_checkOverlap(curTween, globalStart, zeroDur) === 0) {
						overlaps[oCount++] = curTween;
					}
				} else if (curTween._startTime <= startTime) if (curTween._startTime + curTween.totalDuration() / curTween._timeScale + 0.0000000001 > startTime) if (!((zeroDur || !curTween._initted) && startTime - curTween._startTime <= 0.0000000002)) {
					overlaps[oCount++] = curTween;
				}
			}

			i = oCount;
			while (--i > -1) {
				curTween = overlaps[i];
				if (mode === 2) if (curTween._kill(props, target)) {
					changed = true;
				}
				if (mode !== 2 || (!curTween._firstPT && curTween._initted)) {
					if (curTween._enabled(false, false)) { //if all property tweens have been overwritten, kill the tween.
						changed = true;
					}
				}
			}
			return changed;
		},

		_checkOverlap = function(tween, reference, zeroDur) {
			var tl = tween._timeline,
				ts = tl._timeScale,
				t = tween._startTime;
			while (tl._timeline) {
				t += tl._startTime;
				ts *= tl._timeScale;
				if (tl._paused) {
					return -100;
				}
				tl = tl._timeline;
			}
			t /= ts;
			return (t > reference) ? t - reference : ((zeroDur && t === reference) || (!tween._initted && t - reference < 0.0000000002)) ? 0.0000000001 : ((t = t + tween.totalDuration() / tween._timeScale / ts) > reference) ? 0 : t - reference - 0.0000000001;
		};


//---- TweenLite instance methods -----------------------------------------------------------------------------

	p._init = function() {
		if (this.vars.startAt) {
			this.vars.startAt.overwrite = 0;
			this.vars.startAt.immediateRender = true;
			TweenLite.to(this.target, 0, this.vars.startAt);
		}
		var i, initPlugins, pt;
		if (this.vars.ease instanceof Ease) {
			this._ease = (this.vars.easeParams instanceof Array) ? this.vars.ease.config.apply(this.vars.ease, this.vars.easeParams) : this.vars.ease;
		} else if (typeof(this.vars.ease) === "function") {
			this._ease = new Ease(this.vars.ease, this.vars.easeParams);
		} else {
			this._ease = TweenLite.defaultEase;
		}
		this._easeType = this._ease._type;
		this._easePower = this._ease._power;
		this._firstPT = null;

		if (this._targets) {
			i = this._targets.length;
			while (--i > -1) {
				if ( this._initProps( this._targets[i], (this._propLookup[i] = {}), this._siblings[i], (this._overwrittenProps ? this._overwrittenProps[i] : null)) ) {
					initPlugins = true;
				}
			}
		} else {
			initPlugins = this._initProps(this.target, this._propLookup, this._siblings, this._overwrittenProps);
		}

		if (initPlugins) {
			TweenLite._onPluginEvent("_onInitAllProps", this); //reorders the array in order of priority. Uses a static TweenPlugin method in order to minimize file size in TweenLite
		}
		if (this._overwrittenProps) if (this._firstPT == null) if (typeof(this.target) !== "function") { //if all tweening properties have been overwritten, kill the tween. If the target is a function, it's probably a delayedCall so let it live.
			this._enabled(false, false);
		}
		if (this.vars.runBackwards) {
			pt = this._firstPT;
			while (pt) {
				pt.s += pt.c;
				pt.c = -pt.c;
				pt = pt._next;
			}
		}
		this._onUpdate = this.vars.onUpdate;
		this._initted = true;
	};

	p._initProps = function(target, propLookup, siblings, overwrittenProps) {
		var p, i, initPlugins, plugin, a, pt, v;
		if (target == null) {
			return false;
		}
		for (p in this.vars) {
			if (_reservedProps[p]) {
				if (p === "onStartParams" || p === "onUpdateParams" || p === "onCompleteParams" || p === "onReverseCompleteParams" || p === "onRepeatParams") if ((a = this.vars[p])) {
					i = a.length;
					while (--i > -1) {
						if (a[i] === "{self}") {
							a = this.vars[p] = a.concat(); //copy the array in case the user referenced the same array in multiple tweens/timelines (each {self} should be unique)
							a[i] = this;
						}
					}
				}

			} else if (_plugins[p] && (plugin = new _plugins[p]())._onInitTween(target, this.vars[p], this)) {

				//t - target 		[object]
				//p - property 		[string]
				//s - start			[number]
				//c - change		[number]
				//f - isFunction	[boolean]
				//n - name			[string]
				//pg - isPlugin 	[boolean]
				//pr - priority		[number]
				this._firstPT = pt = {_next:this._firstPT, t:plugin, p:"setRatio", s:0, c:1, f:true, n:p, pg:true, pr:plugin._priority};
				i = plugin._overwriteProps.length;
				while (--i > -1) {
					propLookup[plugin._overwriteProps[i]] = this._firstPT;
				}
				if (plugin._priority || plugin._onInitAllProps) {
					initPlugins = true;
				}
				if (plugin._onDisable || plugin._onEnable) {
					this._notifyPluginsOfEnabled = true;
				}

			} else {
				this._firstPT = propLookup[p] = pt = {_next:this._firstPT, t:target, p:p, f:(typeof(target[p]) === "function"), n:p, pg:false, pr:0};
				pt.s = (!pt.f) ? parseFloat(target[p]) : target[ ((p.indexOf("set") || typeof(target["get" + p.substr(3)]) !== "function") ? p : "get" + p.substr(3)) ]();
				v = this.vars[p];
				pt.c = (typeof(v) === "number") ? v - pt.s : (typeof(v) === "string" && v.charAt(1) === "=") ? parseInt(v.charAt(0)+"1") * Number(v.substr(2)) : Number(v) || 0; //previously, we used Number(v.split("=").join("")) but that wouldn't adequately handle a value like "+=-500" or "-=-500".
			}
			if (pt) if (pt._next) {
				pt._next._prev = pt;
			}
		}

		if (overwrittenProps) if (this._kill(overwrittenProps, target)) { //another tween may have tried to overwrite properties of this tween before init() was called (like if two tweens start at the same time, the one created second will run first)
			return this._initProps(target, propLookup, siblings, overwrittenProps);
		}
		if (this._overwrite > 1) if (this._firstPT) if (siblings.length > 1) if (_applyOverwrite(target, this, propLookup, this._overwrite, siblings)) {
			this._kill(propLookup, target);
			return this._initProps(target, propLookup, siblings, overwrittenProps);
		}
		return initPlugins;
	};

	p.render = function(time, suppressEvents, force) {
		var prevTime = this._time,
			isComplete, callback, pt;
		if (time >= this._duration) {
			this._totalTime = this._time = this._duration;
			this.ratio = this._ease._calcEnd ? this._ease.getRatio(1) : 1;
			if (!this._reversed) {
				isComplete = true;
				callback = "onComplete";
			}
			if (this._duration === 0) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
				if (time === 0 || this._rawPrevTime < 0) if (this._rawPrevTime !== time) {
					force = true;
				}
				this._rawPrevTime = time;
			}

		} else if (time <= 0) {
			this._totalTime = this._time = 0;
			this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
			if (prevTime !== 0 || (this._duration === 0 && this._rawPrevTime > 0)) {
				callback = "onReverseComplete";
				isComplete = this._reversed;
			}
			if (time < 0) {
				this._active = false;
				if (this._duration === 0) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
					if (this._rawPrevTime >= 0) {
						force = true;
					}
					this._rawPrevTime = time;
				}
			} else if (!this._initted) { //if we render the very beginning (time == 0) of a fromTo(), we must force the render (normal tweens wouldn't need to render at a time of 0 when the prevTime was also 0). This is also mandatory to make sure overwriting kicks in immediately.
				force = true;
			}

		} else {
			this._totalTime = this._time = time;

			if (this._easeType) {
				var r = time / this._duration, type = this._easeType, pow = this._easePower;
				if (type === 1 || (type === 3 && r >= 0.5)) {
					r = 1 - r;
				}
				if (type === 3) {
					r *= 2;
				}
				if (pow === 1) {
					r *= r;
				} else if (pow === 2) {
					r *= r * r;
				} else if (pow === 3) {
					r *= r * r * r;
				} else if (pow === 4) {
					r *= r * r * r * r;
				}

				if (type === 1) {
					this.ratio = 1 - r;
				} else if (type === 2) {
					this.ratio = r;
				} else if (time / this._duration < 0.5) {
					this.ratio = r / 2;
				} else {
					this.ratio = 1 - (r / 2);
				}

			} else {
				this.ratio = this._ease.getRatio(time / this._duration);
			}

		}

		if (this._time === prevTime && !force) {
			return;
		} else if (!this._initted) {
			this._init();
			if (!isComplete && this._time) { //_ease is initially set to defaultEase, so now that init() has run, _ease is set properly and we need to recalculate the ratio. Overall this is faster than using conditional logic earlier in the method to avoid having to set ratio twice because we only init() once but renderTime() gets called VERY frequently.
				this.ratio = this._ease.getRatio(this._time / this._duration);
			}
		}

		if (!this._active) if (!this._paused) {
			this._active = true;  //so that if the user renders a tween (as opposed to the timeline rendering it), the timeline is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the tween already finished but the user manually re-renders it as halfway done.
		}
		if (prevTime === 0) if (this.vars.onStart) if (this._time !== 0 || this._duration === 0) if (!suppressEvents) {
			this.vars.onStart.apply(this.vars.onStartScope || this, this.vars.onStartParams || _blankArray);
		}

		pt = this._firstPT;
		while (pt) {
			if (pt.f) {
				pt.t[pt.p](pt.c * this.ratio + pt.s);
			} else {
				pt.t[pt.p] = pt.c * this.ratio + pt.s;
			}
			pt = pt._next;
		}


		if (this._onUpdate) if (!suppressEvents) {
			this._onUpdate.apply(this.vars.onUpdateScope || this, this.vars.onUpdateParams || _blankArray);
		}

		if (callback) if (!this._gc) { //check _gc because there's a chance that kill() could be called in an onUpdate
			if (isComplete) {
				if (this._timeline.autoRemoveChildren) {
					this._enabled(false, false);
				}
				this._active = false;
			}
			if (!suppressEvents) if (this.vars[callback]) {
				this.vars[callback].apply(this.vars[callback + "Scope"] || this, this.vars[callback + "Params"] || _blankArray);
			}
		}

	};

	p._kill = function(vars, target) {
		if (vars === "all") {
			vars = null;
		}
		if (vars == null) if (target == null || target == this.target) {
			return this._enabled(false, false);
		}
		target = target || this._targets || this.target;
		var i, overwrittenProps, p, pt, propLookup, changed, killProps, record;
		if ((target instanceof Array || target.jquery) && typeof(target[0]) === "object") {
			i = target.length;
			while (--i > -1) {
				if (this._kill(vars, target[i])) {
					changed = true;
				}
			}
		} else {
			if (this._targets) {
				i = this._targets.length;
				while (--i > -1) {
					if (target === this._targets[i]) {
						propLookup = this._propLookup[i] || {};
						this._overwrittenProps = this._overwrittenProps || [];
						overwrittenProps = this._overwrittenProps[i] = vars ? this._overwrittenProps[i] || {} : "all";
						break;
					}
				}
			} else if (target !== this.target) {
				return false;
			} else {
				propLookup = this._propLookup;
				overwrittenProps = this._overwrittenProps = vars ? this._overwrittenProps || {} : "all";
			}

			if (propLookup) {
				killProps = vars || propLookup;
				record = (vars != overwrittenProps && overwrittenProps != "all" && vars != propLookup && (vars == null || vars._tempKill != true)); //_tempKill is a super-secret way to delete a particular tweening property but NOT have it remembered as an official overwritten property (like in BezierPlugin)
				for (p in killProps) {
					if ((pt = propLookup[p])) {
						if (pt.pg && pt.t._kill(killProps)) {
							changed = true; //some plugins need to be notified so they can perform cleanup tasks first
						}
						if (!pt.pg || pt.t._overwriteProps.length === 0) {
							if (pt._prev) {
								pt._prev._next = pt._next;
							} else if (pt === this._firstPT) {
								this._firstPT = pt._next;
							}
							if (pt._next) {
								pt._next._prev = pt._prev;
							}
							pt._next = pt._prev = null;
						}
						delete propLookup[p];
					}
					if (record) {
						overwrittenProps[p] = 1;
					}
				}
			}
		}
		return changed;
	};

	p.invalidate = function() {
		if (this._notifyPluginsOfEnabled) {
			TweenLite._onPluginEvent("_onDisable", this);
		}
		this._firstPT = null;
		this._overwrittenProps = null;
		this._onUpdate = null;
		this._initted = this._active = this._notifyPluginsOfEnabled = false;
		this._propLookup = (this._targets) ? {} : [];
		return this;
	};

	p._enabled = function(enabled, ignoreTimeline) {
		if (enabled && this._gc) {
			if (this._targets) {
				var i = this._targets.length;
				while (--i > -1) {
					this._siblings[i] = _register(this._targets[i], this, true);
				}
			} else {
				this._siblings = _register(this.target, this, true);
			}
		}
		Animation.prototype._enabled.call(this, enabled, ignoreTimeline);
		if (this._notifyPluginsOfEnabled) if (this._firstPT) {
			return TweenLite._onPluginEvent(((enabled) ? "_onEnable" : "_onDisable"), this);
		}
		return false;
	};


//----TweenLite static methods -----------------------------------------------------

	TweenLite.to = function(target, duration, vars) {
		return new TweenLite(target, duration, vars);
	};

	TweenLite.from = function(target, duration, vars) {
		vars.runBackwards = true;
		if (vars.immediateRender != false) {
			vars.immediateRender = true;
		}
		return new TweenLite(target, duration, vars);
	};

	TweenLite.fromTo = function(target, duration, fromVars, toVars) {
		toVars.startAt = fromVars;
		if (fromVars.immediateRender) {
			toVars.immediateRender = true;
		}
		return new TweenLite(target, duration, toVars);
	};

	TweenLite.delayedCall = function(delay, callback, params, scope, useFrames) {
		return new TweenLite(callback, 0, {delay:delay, onComplete:callback, onCompleteParams:params, onCompleteScope:scope, onReverseComplete:callback, onReverseCompleteParams:params, onReverseCompleteScope:scope, immediateRender:false, useFrames:useFrames, overwrite:0});
	};

	TweenLite.set = function(target, vars) {
		return new TweenLite(target, 0, vars);
	};

	TweenLite.killTweensOf = TweenLite.killDelayedCallsTo = function(target, vars) {
		var a = TweenLite.getTweensOf(target),
			i = a.length;
		while (--i > -1) {
			a[i]._kill(vars, target);
		}
	};

	TweenLite.getTweensOf = function(target) {
		if (target == null) { return; }
		var i, a, j, t;
		if ((target instanceof Array || target.jquery) && typeof(target[0]) === "object") {
			i = target.length;
			a = [];
			while (--i > -1) {
				a = a.concat(TweenLite.getTweensOf(target[i]));
			}
			i = a.length;
			//now get rid of any duplicates (tweens of arrays of objects could cause duplicates)
			while (--i > -1) {
				t = a[i];
				j = i;
				while (--j > -1) {
					if (t === a[j]) {
						a.splice(i, 1);
					}
				}
			}
		} else {
			a = _register(target).concat();
			i = a.length;
			while (--i > -1) {
				if (a[i]._gc) {
					a.splice(i, 1);
				}
			}
		}
		return a;
	};



	/*
	 * ----------------------------------------------------------------
	 * TweenPlugin   (could easily be split out as a separate file/class, but included for ease of use (so that people don't need to include another <script> call before loading plugins which is easy to forget)
	 * ----------------------------------------------------------------
	 */
	var TweenPlugin = _class("plugins.TweenPlugin", function(props, priority) {
		this._overwriteProps = (props || "").split(",");
		this._propName = this._overwriteProps[0];
		this._priority = priority || 0;
	}, true);

	p = TweenPlugin.prototype;
	TweenPlugin.version = 12;
	TweenPlugin.API = 2;
	p._firstPT = null;

	p._addTween = function(target, prop, start, end, overwriteProp, round) {
		var c, pt;
		if (end != null && (c = (typeof(end) === "number" || end.charAt(1) !== "=") ? Number(end) - start : parseInt(end.charAt(0)+"1") * Number(end.substr(2)))) {
			this._firstPT = pt = {_next:this._firstPT, t:target, p:prop, s:start, c:c, f:(typeof(target[prop]) === "function"), n:overwriteProp || prop, r:round};
			if (pt._next) {
				pt._next._prev = pt;
			}
		}
	}

	p.setRatio = function(v) {
		var pt = this._firstPT,
			val;
		while (pt) {
			val = pt.c * v + pt.s;
			if (pt.r) {
				val = (val + ((val > 0) ? 0.5 : -0.5)) >> 0; //about 4x faster than Math.round()
			}
			if (pt.f) {
				pt.t[pt.p](val);
			} else {
				pt.t[pt.p] = val;
			}
			pt = pt._next;
		}
	}

	p._kill = function(lookup) {
		if (lookup[this._propName] != null) {
			this._overwriteProps = [];
		} else {
			var i = this._overwriteProps.length;
			while (--i > -1) {
				if (lookup[this._overwriteProps[i]] != null) {
					this._overwriteProps.splice(i, 1);
				}
			}
		}
		var pt = this._firstPT;
		while (pt) {
			if (lookup[pt.n] != null) {
				if (pt._next) {
					pt._next._prev = pt._prev;
				}
				if (pt._prev) {
					pt._prev._next = pt._next;
					pt._prev = null;
				} else if (this._firstPT === pt) {
					this._firstPT = pt._next;
				}
			}
			pt = pt._next;
		}
		return false;
	}

	p._roundProps = function(lookup, value) {
		var pt = this._firstPT;
		while (pt) {
			if (lookup[this._propName] || (pt.n != null && lookup[ pt.n.split(this._propName + "_").join("") ])) { //some properties that are very plugin-specific add a prefix named after the _propName plus an underscore, so we need to ignore that extra stuff here.
				pt.r = value;
			}
			pt = pt._next;
		}
	}

	TweenLite._onPluginEvent = function(type, tween) {
		var pt = tween._firstPT,
			changed;
		if (type === "_onInitAllProps") {
			//sorts the PropTween linked list in order of priority because some plugins need to render earlier/later than others, like MotionBlurPlugin applies its effects after all x/y/alpha tweens have rendered on each frame.
			var pt2, first, last, next;
			while (pt) {
				next = pt._next;
				pt2 = first;
				while (pt2 && pt2.pr > pt.pr) {
					pt2 = pt2._next;
				}
				if ((pt._prev = pt2 ? pt2._prev : last)) {
					pt._prev._next = pt;
				} else {
					first = pt;
				}
				if ((pt._next = pt2)) {
					pt2._prev = pt;
				} else {
					last = pt;
				}
				pt = next;
			}
			pt = tween._firstPT = first;
		}
		while (pt) {
			if (pt.pg) if (typeof(pt.t[type]) === "function") if (pt.t[type]()) {
				changed = true;
			}
			pt = pt._next;
		}
		return changed;
	}

	TweenPlugin.activate = function(plugins) {
		var i = plugins.length;
		while (--i > -1) {
			if (plugins[i].API === TweenPlugin.API) {
				TweenLite._plugins[(new plugins[i]())._propName] = plugins[i];
			}
		}
		return true;
	}



	//now run through all the dependencies discovered and if any are missing, log that to the console as a warning. This is why it's best to have TweenLite load last - it can check all the dependencies for you.
	if ((a = window._gsQueue)) {
		for (i = 0; i < a.length; i++) {
			a[i]();
		}
		for (p in _classLookup) {
			if (!_classLookup[p].def) {
				console.log("Warning: TweenLite encountered missing dependency: com.greensock."+p);
			}
		}
	}


})(window);