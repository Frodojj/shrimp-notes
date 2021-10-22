/*
 * Jimmy Cerra
 * 20 Oct. 2021
 * MIT License
 */


/** Represents a Tool that you draw with. Uses custom events. */
SVG.DrawingTool = class {
	/** Event invoked while drawing. */
	static START = "drawingstart";
	
	/** Event invoked while drawing. */
	static DRAW = "drawing";
	
	/** Event invoked when drawing is finished. */
	static END = "drawingend";
	
	/** Events associated with drawing (DRAW, END) */
	static NAMES = [this.START, this.DRAW, this.END];
	
	/**
	 * Factory that makes a utility function that transforms an x, y position
	 * from viewPort to viewBox according to SVG spec, viewBox, and
	 * preserveAspectRatio attributes of the SVG node. See the following
	 * documents:
	 *
	 * https://svgwg.org/svg2-draft/coords.html#PreserveAspectRatioAttribute
	 * https://www.w3.org/TR/geometry-1/#DOMRect
	 * https://svgwg.org/svg2-draft/coords.html#InterfaceSVGPreserveAspectRatio
	 *
	 * @param node The SVG element (SVGSVGElement).
	 * @return A function(x, y, width, height) where x, y are coordinates
	 *		 in he viewPort and width, height are the dimension of the
	 *		 viewPort. Function returns an array [xInBox, yInBox] of the
	 *		 coordinates in the viewBox for the SVG Element.
	 */
	static alignXYFn(node) {
		const box = node.viewBox.baseVal;
		const fit = node.preserveAspectRatio.baseVal;

		// SVG algorithms for scaling down or up.
		const scaleDown = (width, height) => {
			const xScale = box.width / width;
			const yScale = box.height / height;
			return (xScale > yScale) ? yScale : xScale;
		};
		const scaleUp = (width, height) => {
			const xScale = box.width / width;
			const yScale = box.height / height;
			return (xScale < yScale) ? yScale : xScale;
		};
		
		// SVG algorithms for aligning viewPort coordinates with
		// viewBox at max (bottom/end) or middle (middle).
		const xMax = (scale, x, w) => (x - w) * scale + box.x + box.width;
		const xMid = (scale, x, w) =>
			x * scale + box.x + (box.width - w * scale) / 2;
		const xMin = (scale, x) => x * scale + box.x;
		const yMax = (scale, y, h) => (y - h) * scale + box.y + box.height;
		const yMid = (scale, y, h) =>
			y * scale + box.y + (box.height - h * scale) / 2;
		const yMin = (scale, y) => y * scale + box.y;
		
		// Returns a function for aligning x/y values. Choose the
		// appropriate alignment function for chosen SVG aspect ratio method.
		const alignFn = (xAlignFn, yAlignFn) => {
			// If preserveAspectRatio uses slice, then scale down uniformly.
			// If uses meet or uses default, then scale up uniformly.
			let scaleFn;
			switch(fit.meetOrSlice) {
				case fit.SVG_MEETORSLICE_SLICE:
					scaleFn = scaleDown;
					break;
				case fit.SVG_MEETORSLICE_MEET:
				default:
					scaleFn = scaleUp;
			}
			
			// Returns a function that transforms coordinates on viewPort
			// to coordinates in the viewBox.
			return ([x, y], {left, top, width, height}) => {
				const dx = x - left;
				const dy = y - top;
				const scale = scaleFn(width, height);
				const xInBox = xAlignFn(scale, dx, width);
				const yInBox = yAlignFn(scale, dy, height);
				return [xInBox, yInBox];
			};
		};
		
		// non-uniform scaling with box = viewPort dimensions.
		const nonuniformFn = ([x, y], {left, top, width, height}) => {
			const dx = x - left;
			const dy = y - top;
			const xInBox = dx * box.width / width + box.x;
			const yInBox = dy * box.height / height + box.y;
			return [xInBox, yInBox];
		};
		
		// Determine offset using SVG algorithm
		switch(fit.align) {
			// none = nonuniform scaling
			case(fit.SVG_PRESERVEASPECTRATIO_NONE):
				return nonuniformFn;
			case fit.SVG_PRESERVEASPECTRATIO_XMINYMIN:
				return alignFn(xMin, yMin);
			case fit.SVG_PRESERVEASPECTRATIO_XMIDYMIN:
				return alignFn(xMid, yMin);
			case fit.SVG_PRESERVEASPECTRATIO_XMAXYMIN:
				return alignFn(xMax, yMin);
			case fit.SVG_PRESERVEASPECTRATIO_XMINYMID:
				return alignFn(xMin, yMid);
			case fit.SVG_PRESERVEASPECTRATIO_XMAXYMID:
				return alignFn(xMax, yMid);
			case fit.SVG_PRESERVEASPECTRATIO_XMINYMAX:
				return alignFn(xMin, yMax);
			case fit.SVG_PRESERVEASPECTRATIO_XMIDYMAX:
				return alignFn(xMid, yMax);
			case fit.SVG_PRESERVEASPECTRATIO_XMAXYMAX:
				return alignFn(xMax, yMax);
			// Default according to SVG spec
			case fit.SVG_PRESERVEASPECTRATIO_XMIDYMID:
			default:
				return alignFn(xMid, yMid);
		}
	}
	
	/** Convenience function to make CustomEvent of name at clientX/Y. */
	static clientEvent(name, e, init) {
		const node = e.currentTarget; // Attached node.
		const point = [e.clientX, e.clientY];
		return new CustomEvent(name, {
			detail: this.eventDetail(node, point, init)
		});
	}
	
	/** Makes a DRAW CustomEvent. */
	static drawEvent(e, init) {
		return this.clientEvent(this.DRAW, e, init);
	}
	
	/** Makes an END CustomEvent. */
	static endEvent(e, init) {
		return this.clientEvent(this.END, e, init);
	}
	
	/**
	 * Makes the detail object for the custom event.
	 * 
	 * @param node    The currentTarget node where listener is attached.
	 * @param [x,y]   The current point of the event.
	 * @param buttons The initial MouseEvent.buttons at pointer down.
	 * @param point   The initial point at pointer down.
	 */
	static eventDetail(node, [x, y], {buttons, point}) {
		const [xi, yi] = point;
		return {
			buttons: buttons,
			currentTarget: node,
			init: [xi, yi],
			point: [x, y],
			rect: node.getBoundingClientRect()
		};
	}
		
	/** Removes element at point if isn't root but is contained by root. */
	static removeTop(point, root) {
		const el = document.elementFromPoint(...point);
		if (el !== root && (el.parentNode === root || root.contains(el))) {
			el.remove();
		}
	}
	
	/** Makes a START CustomEvent. */
	static startEvent(e, init) {
		const node = e.currentTarget; // Attached node.
		const point = init.point;
		return new CustomEvent(this.START, {
			detail: this.eventDetail(node, point, init)
		});
	}
	
	/** The EventListeners associated with this tool. */
	listeners = [];
	
	/** Makes a blank tool. Passes e.detail to the handlers. */
	constructor() {
		for (const n of SVG.DrawingTool.NAMES) {
			const fn = (e) => {
				const d = e.detail;
				if(d.buttons & 32) {
					// eraser button
					SVG.DrawingTool.removeTop(d.point, d.currentTarget);
				} else {
					// call drawing tool event listener with detail object.
					this[n]?.(d);
				}
			};
			this.listeners.push([n, fn]);
		}
	}
	
	/** Adds each event listener to the node. */
	addTo(node) {
		for (const listener of this.listeners) {
			node.addEventListener(...listener);
		}
	}
	
	/** Removes each event listener from the node. */
	removeFrom(node) {
		for (const listener of this.listeners) {
			node.removeEventListener(...listener);
		}
	}
};

// Add to SVG.js without polluting global namespace.
(function (svg) {
	/** Represents the state of a PointerTool */
	class PointerState {
		static MOVING = 2;// pointer is moving.
		static INIT = 1; // pointer is down.
		static NONE = 0; // not doing anything.
		
		buttons = 0; // Buttons pressed when pointerdown occurred.
		point = []; // Point where pointerdown occurred.
		state = PointerTool.NONE; // state of pointer.
		
		constructor() {
			this.reset();
		}
		
		init(x, y, buttons) {
			this.buttons = buttons;
			this.point = [x, y];
			this.state = PointerState.INIT;
		}
		
		moving() {
			this.state = PointerState.MOVING;
		}
		
		reset() {
			this.buttons = 0;
			this.point = [];
			this.state = PointerState.NONE;
		}
	}
	
	
	/** Dispatches SVG.DrawingTool events with PointerEvents. */
	class PointerTool {
		static NAMES =
			["pointerdown", "pointerleave", "pointermove", "pointerup"];
		static OPTIONS = {capture: false, passive: false};
		
		listeners = []; // The PointerEvent listeners of this PointerTool.
		pointer = new PointerState(); // state of this PointerTool
		timeout = null; // state of the timeout
		debounceTime = 30; // Time between touching and pointerdown init.
		
		/** Attaches to node if it exists. */
		constructor(node, debounceTime) {
			if (debounceTime) this.debounceTime = debounceTime;
		
			// Add all event listeners to this.listeners and to node.
			for (const n of PointerTool.NAMES) {
				const listener = [n, (e) => this[n]?.(e), PointerTool.OPTIONS];
				this.listeners.push(listener); // add to listeners array
				node?.addEventListener?.(...listener); // if node add it.
			}
		}
		
		dispatchEvent(ev) {
			const node = ev.detail.currentTarget;
			node.dispatchEvent(ev);
		}
		
		/** If valid buttons: If primary then sets init else resets state. */
		pointerdown(e) {
			// 01 = binary 000001 bitmask for left-click/pen-tip.
			// 32 = binary 100000 bitmask for eraser.
			// 33 = binary 100001 bitmask for left-click | eraser.
			// If buttons is not supported (undefined or 0), set it to bitmask
			// for left-click/pen-tip = 1
			const buttons = (e.buttons || 1) & 33;
			if (buttons) {
				if (e.isPrimary) {
					// Debounce before init so 2 finger gestures don't trigger.
					clearTimeout(this.timeout); // Reset clock
					this.timeout = setTimeout(() => {
						if (this.timeout) {
							this.pointer.init(e.clientX, e.clientY, buttons);
						}
						this.timeout = null;
					}, this.debounceTime);
				} else {
					this.timeout = null;
					this.pointer.reset();
				}
			}
		}

		/** Same as pointerup function. */
		pointerleave(e) {
			this.pointerup(e);
		}

		/** Sets state to MOVING & dispatches DRAW event if state is truthy. */
		pointermove(e) {
			if (e.isPrimary) {
				switch(this.pointer.state) {
					case PointerState.INIT: {
						// Dispatching here in case two fingers, cuz second
						// finger sets state to NONE, but second finger's
						// pointerdown is fired after primary finger.
						this.dispatchEvent(
							SVG.DrawingTool.startEvent(e, this.pointer)
						);
						this.pointer.moving();
						// fall through cuz now done
					}
					case PointerState.MOVING: {
						this.dispatchEvent(
							SVG.DrawingTool.drawEvent(e, this.pointer)
						);
					}
				}
			}
		}

		/** Dispatches END event and sets state to NONE if state is truthy. */
		pointerup(e) {
			if (e.isPrimary) {
				switch(this.pointer.state) {
					case PointerState.INIT: {
						// Dispatching here in case two fingers.
						this.dispatchEvent(
							SVG.DrawingTool.startEvent(e, this.pointer)
						);
						// fall through cuz now done
					}
					case PointerState.MOVING: {
						this.dispatchEvent(
							SVG.DrawingTool.endEvent(e, this.pointer)
						);
						this.pointer.reset();
					}
				}
			}
		}
	}
	
	/** Removes elements under a pointer except for attached element. */
	class ElementRemover extends SVG.DrawingTool {
		[SVG.DrawingTool.START](e) {
			SVG.DrawingTool.removeTop(e.point, e.currentTarget);
		}
		
		[SVG.DrawingTool.DRAW](e) {
			SVG.DrawingTool.removeTop(e.point, e.currentTarget);
		}
		
	}
	
	
	/** Creates SVG paths from a SVG.js factory. */
	class PathDrawer extends SVG.DrawingTool {
		align; // Function that aligns coordinates from viewPort to viewBox.
		attr; // SVG.js path's attributes.
		path; // SVG.js path that's being drawn.
		svg; // SVG.js factory that makes the path.
		
		/**
		 * Makes a PathDrawer.
		 *
		 * @param svg Makes nodes. The result of calling SVG().
		 * @param attr Attributes of the SVG path element made.
		 */
		constructor(svg, attr={}) {
			super();
			this.attr = attr;
			this.svg = svg;
			this.align = SVG.DrawingTool.alignXYFn(svg.node);
		}

		/** Adds/draws points for the middle of a path. */
		[SVG.DrawingTool.DRAW](e) {			
			const [x, y] = this.getPosition(e.point, e.rect);

			// Create new point in SVG syntax
			const newPoint = "L " + x + " " + y;

			// Add new point to path's points
			const points = this.path.array();
			points.push(newPoint);

			// Redraw path
			this.path.plot(points);
		}

		/** Resets state for making a path. */
		[SVG.DrawingTool.END](e) {
			// remove reference to old path
			this.path = null;
		}

		/** Creates the path node at the initial point. */
		[SVG.DrawingTool.START](e) {
			const [x, y] = this.getPosition(e.init, e.rect);
			
			// Initial point and a 0 length line in SVG syntax 
			// to display the point.
			const initPoint = "M " + x + " " + y + " l 0 0";

			// Draw the SVG path and return it.
			this.path = this.svg.path(initPoint).attr(this.attr);
		}

		/** Scales position with element's bounds and SVG viewBox */
		getPosition(point, rect) {
			const snap = ([x, y], snap=10) => {
				return [(x - x % snap), (y - y % snap)];
			};
			
			return this.align(point, rect);
		}
	}
	
	
	// Add draw function to SVG.js
	svg.extend(svg.Svg, {
		debounce(time) {
			if (this.drawingPointer) {
				this.drawingPointer.debounceTime = time;
			} else {
				this.drawingPointer = this.pointerTool({time: time});
			}
			return this;
		},
		drawingPointer: null,
		drawingTool: null,
		draw(tool) {
			// Lazy creation of Dispatcher for Drawing Events
			this.drawingPointer = this.drawingPointer || this.pointerTool();
			
			// add tool if tool exists, otherwise remove tool.
			if(tool) {
				this.draw(false);
				this.drawingTool = tool;
				this.drawingTool.addTo(this.node);
			} else {
				this.drawingTool?.removeFrom?.(this.node);
			}
			return this;
		},
		drawEraser() {
			return this.draw(this.eraserTool());
		},
		drawPath(attr = {}) {
			return this.draw(this.pathTool(attr));
		},
		eraserTool() {
			return new ElementRemover();
		},
		pathTool(attr = {}) {
			return new PathDrawer(this, attr);
		},
		pointerTool({node, time} = {}) {
			return new PointerTool(node ?? this.node, time);
		}
	});
})(SVG);


