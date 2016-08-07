/**
 * tiltfx.js
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2015, Codrops
 * http://www.codrops.com
 */
;(function(window) {
	
	'use strict';

	/**
	 * **************************************************************************
	 * utils
	 * **************************************************************************
	 */
	
	// from https://gist.github.com/desandro/1866474
	var lastTime = 0;
	var prefixes = 'webkit moz ms o'.split(' ');
	// get unprefixed rAF and cAF, if present
	var requestAnimationFrame = window.requestAnimationFrame;
	var cancelAnimationFrame = window.cancelAnimationFrame;
	// loop through vendor prefixes and get prefixed rAF and cAF
	var prefix;
	for( var i = 0; i < prefixes.length; i++ ) {
		if ( requestAnimationFrame && cancelAnimationFrame ) {
			break;
		}
		prefix = prefixes[i];
		requestAnimationFrame = requestAnimationFrame || window[ prefix + 'RequestAnimationFrame' ];
		cancelAnimationFrame  = cancelAnimationFrame  || window[ prefix + 'CancelAnimationFrame' ] ||
		window[ prefix + 'CancelRequestAnimationFrame' ];
	}

	// fallback to setTimeout and clearTimeout if either request/cancel is not supported
	if ( !requestAnimationFrame || !cancelAnimationFrame ) {
		requestAnimationFrame = function( callback, element ) {
			var currTime = new Date().getTime();
			var timeToCall = Math.max( 0, 16 - ( currTime - lastTime ) );
			var id = window.setTimeout( function() {
				callback( currTime + timeToCall );
			}, timeToCall );
			lastTime = currTime + timeToCall;
			return id;
		};

		cancelAnimationFrame = function( id ) {
			window.clearTimeout( id );
		};
	}

	function extend( a, b ) {
		for( var key in b ) { 
			if( b.hasOwnProperty( key ) ) {
				a[key] = b[key];
			}
		}
		return a;
	}

	// from http://www.quirksmode.org/js/events_properties.html#position
	function getMousePos(e) {
		var posx = 0;
		var posy = 0;
		if (!e) var e = window.event;
		if (e.pageX || e.pageY) 	{
			posx = e.pageX;
			posy = e.pageY;
		}
		else if (e.clientX || e.clientY) 	{
			posx = e.clientX + document.body.scrollLeft
				+ document.documentElement.scrollLeft;
			posy = e.clientY + document.body.scrollTop
				+ document.documentElement.scrollTop;
		}
		return {
			x : posx,
			y : posy
		}
	}

	// from http://www.sberry.me/articles/javascript-event-throttling-debouncing
	function throttle(fn, delay) {
		var allowSample = true;

		return function(e) {
			if (allowSample) {
				allowSample = false;
				setTimeout(function() { allowSample = true; }, delay);
				fn(e);
			}
		};
	}

	/***************************************************************************/

	/**
	 * TiltFx fn
	 */
	function TiltFx(el, options) {
		this.el = el;
		this.options = extend( {}, this.options );
		this._init();
		this._initEvents();
	}

	/**
	 * TiltFx options.
	 */
	TiltFx.prototype.options = {
		// number of extra image elements (div with background-image) to add to the DOM - min:1, max:5 (for a higher number, it's recommended to remove the transitions of .tilt__front in the stylesheet.
		extraImgs : 3,
		// the opacity value for all the image elements.
		opacity : 0.6,
		// by default the first layer does not move.
		bgfixed : true,
		// image element's movement configuration
		movement : {
			perspective : 1500, // perspective value
			translateX : 10, // a relative movement of -10px to 10px on the x-axis (setting a negative value reverses the direction)
			translateY : 10, // a relative movement of -10px to 10px on the y-axis 
			translateZ : 2, // a relative movement of -20px to 20px on the z-axis (perspective value must be set). Also, this specific translation is done when the mouse moves vertically.
			rotateX : 3, // a relative rotation of -2deg to 2deg on the x-axis (perspective value must be set)
			rotateY : 3, // a relative rotation of -2deg to 2deg on the y-axis (perspective value must be set)
			rotateZ : 0// z-axis rotation; by default there's no rotation on the z-axis (perspective value must be set)
		}
	}

	/**
	 * Initialize: build the necessary structure for the image elements and replace it with the HTML img element.
	 */
	TiltFx.prototype._init = function() {
		this.tiltWrapper = document.createElement('div');
		this.tiltWrapper.className = 'tilt';

		// main image element.
		this.tiltImgBack = document.createElement('div');
		this.tiltImgBack.className = 'tilt__back';
		this.tiltImgBack.style.backgroundImage = 'url(' + this.el.src + ')';
		//this.tiltImgBack.style.backgroundSize = "100% 100%";
		this.tiltWrapper.appendChild(this.tiltImgBack);

		// image elements limit.
		if( this.options.extraImgs < 1 ) {
			this.options.extraImgs = 1;
		}
		else if( this.options.extraImgs > 5 ) {
			this.options.extraImgs = 5;
		}

		if( !this.options.movement.perspective ) {
			this.options.movement.perspective = 0;
		}

		// add the extra image elements.
		this.imgElems = [];
		for(var i = 0; i < this.options.extraImgs; ++i) {
			var el = document.createElement('div');
			el.className = 'tilt__front';
			el.style.backgroundImage = 'url(' + this.el.src + ')';
			//el.style.backgroundSize = "100% 100%";
			el.style.opacity = this.options.opacity;
			this.tiltWrapper.appendChild(el);
			this.imgElems.push(el);
		}

		if( !this.options.bgfixed ) {
			this.imgElems.push(this.tiltImgBack);
			++this.options.extraImgs;
		}

		// add it to the DOM and remove original img element.
		this.el.parentNode.insertBefore(this.tiltWrapper, this.el);
		this.el.parentNode.removeChild(this.el);

		// tiltWrapper properties: width/height/left/top
		this.view = { width : this.tiltWrapper.offsetWidth, height : this.tiltWrapper.offsetHeight };
	};

	/**
	 * Initialize the events on the main wrapper.
	 */
	TiltFx.prototype._initEvents = function() {
		var self = this,
			moveOpts = self.options.movement;

		// mousemove event..
		this.tiltWrapper.addEventListener('mousemove', function(ev) {
			requestAnimationFrame(function() {
					// mouse position relative to the document.
				var mousepos = getMousePos(ev),
					// document scrolls.
					docScrolls = {left : document.body.scrollLeft + document.documentElement.scrollLeft, top : document.body.scrollTop + document.documentElement.scrollTop},
					bounds = self.tiltWrapper.getBoundingClientRect(),
					// mouse position relative to the main element (tiltWrapper).
					relmousepos = {
						x : mousepos.x - bounds.left - docScrolls.left,
						y : mousepos.y - bounds.top - docScrolls.top
					};

				// configure the movement for each image element.
				for(var i = 0, len = self.imgElems.length; i < len; ++i) {
					var el = self.imgElems[i],
						rotX = moveOpts.rotateX ? 2 * ((i+1)*moveOpts.rotateX/self.options.extraImgs) / self.view.height * relmousepos.y - ((i+1)*moveOpts.rotateX/self.options.extraImgs) : 0,
						rotY = moveOpts.rotateY ? 2 * ((i+1)*moveOpts.rotateY/self.options.extraImgs) / self.view.width * relmousepos.x - ((i+1)*moveOpts.rotateY/self.options.extraImgs) : 0,
						rotZ = moveOpts.rotateZ ? 2 * ((i+1)*moveOpts.rotateZ/self.options.extraImgs) / self.view.width * relmousepos.x - ((i+1)*moveOpts.rotateZ/self.options.extraImgs) : 0,
						transX = moveOpts.translateX ? 2 * ((i+1)*moveOpts.translateX/self.options.extraImgs) / self.view.width * relmousepos.x - ((i+1)*moveOpts.translateX/self.options.extraImgs) : 0,
						transY = moveOpts.translateY ? 2 * ((i+1)*moveOpts.translateY/self.options.extraImgs) / self.view.height * relmousepos.y - ((i+1)*moveOpts.translateY/self.options.extraImgs) : 0,
						transZ = moveOpts.translateZ ? 2 * ((i+1)*moveOpts.translateZ/self.options.extraImgs) / self.view.height * relmousepos.y - ((i+1)*moveOpts.translateZ/self.options.extraImgs) : 0;

					el.style.WebkitTransform = 'perspective(' + moveOpts.perspective + 'px) translate3d(' + transX + 'px,' + transY + 'px,' + transZ + 'px) rotate3d(1,0,0,' + rotX + 'deg) rotate3d(0,1,0,' + rotY + 'deg) rotate3d(0,0,1,' + rotZ + 'deg)';
					el.style.transform = 'perspective(' + moveOpts.perspective + 'px) translate3d(' + transX + 'px,' + transY + 'px,' + transZ + 'px) rotate3d(1,0,0,' + rotX + 'deg) rotate3d(0,1,0,' + rotY + 'deg) rotate3d(0,0,1,' + rotZ + 'deg)';
				}
			});
		});

		// reset all when mouse leaves the main wrapper.
		this.tiltWrapper.addEventListener('mouseleave', function(ev) {
			setTimeout(function() {
			for(var i = 0, len = self.imgElems.length; i < len; ++i) {
				var el = self.imgElems[i];
				el.style.WebkitTransform = 'perspective(' + moveOpts.perspective + 'px) translate3d(0,0,0) rotate3d(1,1,1,0deg)';
				el.style.transform = 'perspective(' + moveOpts.perspective + 'px) translate3d(0,0,0) rotate3d(1,1,1,0deg)';
			}	
			}, 60);
			
		});

		// window resize
		window.addEventListener('resize', throttle(function(ev) {
			// recalculate tiltWrapper properties: width/height/left/top
			self.view = { width : self.tiltWrapper.offsetWidth, height : self.tiltWrapper.offsetHeight };
		}, 50));
	};

	function init() {
		createElements();
		// search for imgs with the class "tilt-effect"
		[].slice.call(document.querySelectorAll('img.tilt-effect')).forEach(function(img) {
			new TiltFx(img);
		});
		chart();
		scrollMenu();
		sideNavBar();
	}

 
	init();

 	//$('.carousel').carousel({full_width: true});

	window.TiltFx = TiltFx;
})(window);

function chart() {
	var ctx = document.getElementById("myChart").getContext("2d");
	var data = {
    labels: ["Website Design", "UX Design", "Express", "Javascript", "HTML & CSS", "Python", "Angular", "Backend","Chrom Extension"],
    datasets: [
      {
        label: "Percieved Interest",
        fillColor: "rgba(43,176,212,.4)",
        strokeColor: "rgba(43,176,212,1)",
        pointColor: "rgba(43,176,212,1)",
        pointHighlightStroke: "rgba(43,176,212,1)",
        data: [100, 75, 95, 90, 95, 85, 90, 85, 79]
      },
      {
        label: "Relative Skill",
        fillColor: "rgba(140,200,50,.4)",
        strokeColor: "rgba(140,200,50,1)",
        pointColor: "rgba(140,200,50,1)",
        pointHighlightStroke: "rgba(140,200,50,1)",
        data: [85, 65, 70, 90, 95, 60, 85, 60, 80]
      }
    ]
	};
	new Chart(ctx).Radar(data, {
		animationSteps: 30,
		animationEasing: "easeInOutExpo",
		responsive: true,
		showTooltips: true,
		scaleOverride: true,
    scaleSteps: 5,
    scaleStepWidth: 20,
    scaleStartValue: 0,
    scaleLineColor: "rgba(200,200,200,.15)",
    angleShowLineOut: true,
    angleLineWidth : 1,
    angleLineColor : "rgba(200,200,250,.15)",
    pointLabelFontFamily : "'freight-sans-pro', Calibri, Candara, Segoe, 'Segoe UI', Optima, Arial, sans-serif",
    pointLabelFontSize : 14,
		pointLabelFontColor : "#99b",
		pointDot : false,
		datasetStrokeWidth : 1
	});
}

function toggleClass() {
	if (this.classList[0]) {
		this.className = "";
	} else {
		this.className = "open";
	}
}

function addClass(name, element) {
	element.classList.toggle(name);
}

function removeClass(clas, list, index) {
	for (var i of list) {
		if (i === index) {
			continue;
		}

		i.classList.remove(clas);
	}
}

function siblings(str, index, list) {
	for (var i of list) {
		if (i === index) {
			break;
		}

		i.classList.add(str);
	}

	for (var i = list.indexOf(index); i < list.length; i++) {
		list[i].classList.remove(str);
	}
}

function addData(data) {
	var node = document.getElementById("left-data");
	node = node.children;

	node[0].innerText = data.title;
	node[1].innerText = data.body;
	node[2].innerText = data.technologies;
	node[3].innerText = data.status;
	node[4].innerText = data.worked;
}

function createHero(src) {
	var node = document.createElement('img');
	node.src = src;
	node.className = "hero__img tilt-effect";

	var wrapper = document.createElement('div');
	wrapper.className = "hero__imgwrap";
	wrapper.appendChild(node);
	node = wrapper;

	wrapper = document.createElement('div');
	wrapper.className = "hero";
	wrapper.appendChild(node);

	return wrapper;
}

function createImg(obj, flag) {
	var wrapper = document.createElement('div');
	wrapper.className = "panel-image col s12 m6 l6";
	wrapper.appendChild(createHero(obj.img));
	var node = wrapper;

	wrapper = document.createElement('div');
	wrapper.className = "panel-content col s12 m6 l6";
	
	var span = document.createElement('div');
	if (!flag) {
		span.className = "panel-title";
	} else {
		span.className = "panel-title right-align";
	}
	span.innerText = obj.title;

	var p = document.createElement('p');
	p.innerText = obj.body;
	wrapper.appendChild(p);

	p = document.createElement('p');
	p.innerText = obj.technologies;
	wrapper.appendChild(p);
	
	p = document.createElement('P');
	p.innerText = "Worked on " + obj.worked;
	wrapper.appendChild(p);
	
	p = document.createElement('P');
	p.innerHTML = "Status: <b>" + obj.status + "</b>";
	wrapper.appendChild(p);

	if (obj.link) {
		p = document.createElement('a');
		p.href = obj.link;
		p.className = "waves-effect waves-teal btn-flat no-transform";
		p.innerText = "Github link";
		wrapper.appendChild(p);
	}

	p = document.createElement('div');
	p.className = "panel row";
	p.appendChild(span);

	if (flag) {
		p.appendChild(wrapper);
		p.appendChild(node);
	} else {
		p.appendChild(node);
		p.appendChild(wrapper);
	}
	

	return p;
}

function createElements() {
	var slider = document.getElementById("slides");


	if (!data[0]) {
		return;
	}

	var flag = true;
	
	for (var obj of data) {
		flag = !flag;
		slider.appendChild(createImg(obj, flag));
		var line = document.createElement('div');
		line.className = "line";
		slider.appendChild(line);
	}
}

var lastPos = 0;

function scrollMenu() {
	window.addEventListener("scroll", function(e) {
		var pos = window.scrollY;
		var el = document.getElementById("menu");

		if (pos < lastPos) {
			el.classList.add("visible");
		} else {
			el.classList.remove("visible");	
		}
		
		lastPos = pos;


		if (lastPos === 0) {
			el.classList.remove("visible");
		}

		el.style.height = "auto";

		var uls = document.getElementsByClassName('side-nav');

		for (var i of uls) {
			i.style.transform = "translateX(-150%)";
		}

	}, 
	false, false);
}

function sideNavBar() {
	var el = document.getElementsByClassName('button-collapse');

	for (var i of el) {
		i.addEventListener("click", function(e) {
			var parent = this.parentElement;
			var menu = parent.children[2];
			
			menu.style.transform = "translateX(0)";
			menu = parent.parentElement;
			menu.style.height = "100%";

			var that = menu;
			menu = parent.children[2];

			for (var j of menu.children) {
				j.addEventListener("click", function(e) {
					that.style.height = "auto";
					this.parentElement.style.transform = "translateX(-105%)"
				});
			}
		}, false, false);
	}
}