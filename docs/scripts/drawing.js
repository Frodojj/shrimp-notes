/*
 * Jimmy Cerra
 * 27 Oct. 2021
 * MIT License
 */

SVG.Drawing = {
	DRAW: "drawing", // Event invoked while drawing.
	END: "drawingend", // Event invoked when drawing is finished.
	ERASER_MASK: 32, // Mask for eraser. See MouseEvent.buttons
	START: "drawingstart", // Event invoked while drawing.
	NAMES: ["drawingstart", "drawing", "drawingend"], // Custom events.
	/**
	 * Factory that makes a utility function that transforms an x, y
	 * position from viewPort to viewBox according to SVG spec, viewBox,
	 * and preserveAspectRatio attributes of the SVG node. See the
	 * following documents:
	 *
	 * https://svgwg.org/svg2-draft/coords.html#PreserveAspectRatioAttribute
	 * https://www.w3.org/TR/geometry-1/#DOMRect
	 * https://svgwg.org/svg2-draft/coords.html#InterfaceSVGPreserveAspectRatio
	 *
	 * @param node The SVG element (SVGSVGElement).
	 * @return A function([x, y], {left, top, width, height}) where x, y
	 *		 are coordinates in the viewPort and {left, top, width, height}
	 *       is the bounding rect of the SVG node. Function returns array
	 *		 [xInBox, yInBox] of the coordinates in the SVG node's viewBox.
	 */
	alignXYFn(node) {
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
	},
	
	/** Returns the element from point if it's a child of node. */
	childFromPoint(point, node) {
		const el = document.elementFromPoint(...point);
		if (el !== node && (el.parentNode === node || node.contains(el))) {
			return el;
		}
	},
	
	/**
	 * Makes an array of doubles for dispatching custom events. The doubles,
	 * [name, fn], are suitable as parameters for SVG.on/SVG.off or
	 * or add/removeEventListener. The custom event names are the values of:
	 *     * start: called at pointerdown with 1 finger after debounce.
	 *     * move: called at pointermove if pointerdown triggered
	 *     * end: called at pointerup/leave if pointerdown triggered.
	 * The debounce has a default of 50ms to account for multiple fingers.
	 * The buttonsMask paramater is the mask for the PointerEvent.buttons to
	 * respond to. Others will be ignored. The default (= 33) is the mask for
	 * primary-click/pen-tip/touch and pen-eraser button.
	 */
	dispatchers(start, move, end, debounce = 50, buttonsMask = 33) {
		let isDrawing = false; // whether drawingstart was fired.
		let timeout = null; // pointerdown debounce.
		
		const dispatchEvent = (name, node, buttons, [x, y]) => {
			const detail = {
				detail: {
					buttons: buttons,
					node: node,
					point: [x, y],
					rect: node.getBoundingClientRect()
				}
			};
			const customEvent = new CustomEvent(name, detail);
			node.dispatchEvent(customEvent);
		}
		
		const filterButtons = (e) => {
			// 01 = binary 000001 bitmask for left-click/pen-tip.
			// 32 = binary 100000 bitmask for eraser.
			// 33 = binary 100001 bitmask for left-click | eraser.
			// If buttons is not supported (undefined or 0), set it to bitmask
			// for left-click/pen-tip = 1
			return (e.buttons || 1) & buttonsMask;
		}
		
		const pointerdown = (e) => {
			const buttons = filterButtons(e);
			if (buttons) {
				if (e.isPrimary) {
					// These must be outside timer, or could be null.
					const node = e.currentTarget;
					const point = [e.clientX, e.clientY];
				
					// Debounce so 2 finger gestures don't trigger.
					clearTimeout(timeout); // Reset clock
					timeout = setTimeout(() => {
						if (timeout) {
							// initialize State
							dispatchEvent(start, node, buttons, point);
							isDrawing = true;
							timeout = null; // reset clock
						}
					}, debounce);
				} else {
					// There must be two fingers. Abort start drawing.
					timeout = null; // reset clock
				}
			}
		}
		
		const pointermove = (e) => {
			if (e.isPrimary && isDrawing) {
				const buttons = filterButtons(e);
				const node = e.currentTarget;
				const point = [e.clientX, e.clientY];
				dispatchEvent(move, node, buttons, point);
			}
		}
		
		const pointerup = (e) => {
			if (e.isPrimary && isDrawing) {
				const buttons = filterButtons(e);
				const node = e.currentTarget;
				const point = [e.clientX, e.clientY];
				dispatchEvent(end, node, buttons, point);
				isDrawing = false; // up = done drawing.
				timeout = null; // make sure clock reset
			}
		}
		
		return [
			["pointerdown", pointerdown],
			["pointerleave", pointerup],
			["pointermove", pointermove],
			["pointerup", pointerup]
		];
	},
	
	/**
	 * Makes an array of an array suitable as parameters for
	 * addEventListener/removeEventListener. Passes e.detail to the event
	 * handlers. When the eraser button is pressed, calls removeFromPoint
	 * instead.
	 */
	listeners(tool) {
		// Makes [event name, event listener function] array.
		const params = (name) => {
			const listener = (e) => {
				const detail = e.detail;
				if(detail.buttons & this.ERASER_MASK) {
					// Eraser button
					this.removeFromPoint(detail.point, detail.node);
				} else {
					// Call drawing tool's event listener with detail object.
					tool[name]?.(detail);
				}
			};
			return [name, listener];
		};
		
		return [
			params(this.START),
			params(this.DRAW),
			params(this.END)
		];
	},
	
	/** Removes element from point if descendant of node. */
	removeFromPoint(point, node) {
		this.childFromPoint(point, node)?.remove();
	}
};


/** Creates SVG paths from a SVG.js factory. */
SVG.PathTool = class PathTool {
	/**
	 * Makes a Path.
	 *
	 * @param svg Makes nodes. The result of calling SVG().
	 * @param attr Attributes of the SVG path element made.
	 */
	constructor(svg, attr={}) {
		// SVG.js path's attributes.
		this.attr = attr;
		
		// SVG.js factory that makes the path.
		this.svg = svg;
		
		// Function that aligns coordinates from viewPort to viewBox.
		this.align = SVG.Drawing.alignXYFn(svg.node);
		
		// SVG.js path that's being drawn.
		this.path = null;
	}

	/** Adds/draws points for the middle of a path. */
	[SVG.Drawing.DRAW](d) {			
		const [x, y] = this.align(d.point, d.rect);

		// Create new point in SVG syntax
		const newPoint = "L " + x + " " + y;

		// Add new point to path's points
		const points = this.path.array();
		points.push(newPoint);

		// Redraw path
		this.path.plot(points);
	}

	/** Resets state for making a path. */
	[SVG.Drawing.END](d) {
		// remove reference so no chance of modifying old path.
		this.path = null;
	}

	/** Creates the path node at the initial point. */
	[SVG.Drawing.START](d) {
		const [x, y] = this.align(d.point, d.rect);
		
		// Initial point and a 0 length line in SVG syntax 
		// to display the point.
		const initPoint = "M " + x + " " + y + " l 0 0";

		// Draw the SVG path and return it.
		this.path = this.svg.path(initPoint).attr(this.attr);
	}
};


// Add draw function to SVG.js
SVG.extend(SVG.Svg, {
	draw(tool) {
		const DT = SVG.Drawing;
		
		if (!this.drawingDispatchers) {
			// Lazy creation of Dispatcher for Drawing Events
			this.drawingDispatchers = DT.dispatchers(...DT.NAMES);
			for (const listener of this.drawingDispatchers) {
				this.on(...listener);
			}
		}
		
		// Turn off old drawing event listeners
		this.off(DT.NAMES);
		
		if (tool) {
			// add tool's listeners if tool exists.
			const listeners = DT.listeners(tool);
			for (const listener of listeners) {
				this.on(...listener);
			}
		}
		
		return this;
	},
	drawEraser() {
		// Removes elements under a pointer except for attached element.
		const removerTool = {
			[SVG.Drawing.START](d) {
				SVG.Drawing.removeFromPoint(d.point, d.node);
			},
			
			[SVG.Drawing.DRAW](d) {
				SVG.Drawing.removeFromPoint(d.point, d.node);
			}
		};
		
		return this.draw(removerTool);
	},
	drawPath(attr = {}) {
		return this.draw(new SVG.PathTool(this, attr));
	}
});