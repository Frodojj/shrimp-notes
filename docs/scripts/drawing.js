/*
 * Jimmy Cerra
 * 17 Oct. 2021
 * MIT License
 */

/** Utility functions for dealing with a SVG viewBox. */
class ViewBox {
	/**
	 * Utility function that returns dimensions of either:
	 * 1. the content size (via BBox),
	 * 2. or if falsy then the node's viewport size (BoundingClientRect),
	 * 3. or if falsy then the default dimensions 300x150.
	 *
	 * @param node The SVG node (SVGSVGElement).
	 * @return [width, height] Valid viewBox dimensions.
	 */
	static alignDimensions(node) {
		const bBox = node.getBBox?.() ?? {}; // Content size.
		const rect = node.getBoundingClientRect?.() ?? {}; // Element size.
		const width = bBox?.width || rect?.width || 300;
		const height = bBox?.height || rect?.height || 150;
		return [width, height];
	}

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
			return (x, y, width, height) => {
				const scale = scaleFn(width, height);
				return [xAlignFn(scale, x, width), yAlignFn(scale, y, height)];
			};
		};

		// non-uniform scaling with box = viewPort dimensions.
		const nonuniformFn = (x, y, width, height) => {
			const xInBox = x * box.width / width + box.x;
			const yInBox = y * box.height / height + box.y;
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

	/**
	 * Utility function that makes verifies/creates a SVG node's viewBox. If
	 * the node doesn't have a viewBox attribute, or if the viewBox's width
	 * or height are 0 or negative, then ViewBox.alignDimensions(node)
	 * is called.
	 *
	 * @param node The SVG node (SVGSVGElement)
	 */
	static validate(node) {
		// baseVal doesn't exist when attribute is missing for Firefox
		const {x=0, y=0, width=0, height=0} = node?.viewBox?.baseVal ?? {};

		// Make sure dimensions are valid.
		if (width <= 0 || height <= 0) {
			const [w, h] = ViewBox.alignDimensions(node);
			node.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
		}
	}
}


/** Used to bind/unbind groups of events with a node. */
class Dispatcher {
	listeners = []; // The EventListeners associated with this Dispatcher.
}


/** Represents a Tool that you draw with. Uses custom events. */
class DrawingTool extends Dispatcher {
	static DRAW = "drawing"; // Event invoked while drawing.
	static END = "drawingend"; // Event invoked when drawing is finished.
	static NAMES = [DrawingTool.DRAW, DrawingTool.END];
	
	/** Makes a DRAW CustomEvent. */
	static drawEvent(e, {buttons, point}) {
		return DrawingTool.makeEvent(DrawingTool.DRAW, e, buttons, point);
	}
	
	/** Makes an END CustomEvent. */
	static endEvent(e, {buttons, point}) {
		return DrawingTool.makeEvent(DrawingTool.END, e, buttons, point);
	}
	
	/**
	 * Convenience function to make CustomEvent of name and with detail object
	 * = {clientHeight, clientWidth, clientX, clientY, offsetX, offsetY} where
	 * clientHeight/clientWidth come from the BoundingClientRect of the
	 * currentTarget.
	 *
	 * @param name    Name of the CustomEvent to create.
	 * @param e       PointerEvent.
	 * @param buttons Inital pointerdown button mask (see MouseDown.buttons)
	 * @param [x,y]   Initial pointerdown location.
	 */
	static makeEvent(name, e, buttons, [x, y]) {
		const currentTarget = e.currentTarget;
		const eraserMask = 32; // From MouseDown.buttons
		const primaryMask = 1; // From MouseDown.buttons
		
		return new CustomEvent(name, {
			detail: {
				init: [x, y],
				isPrimaryButton: buttons & primaryMask,
				isEraserButton: buttons & eraserMask,
				currentTarget: currentTarget,
				point: [e.clientX, e.clientY],
				rect: currentTarget.getBoundingClientRect()
			}
		});
	}
	
	/** Removes element under c.point if it's a child of c.currentTarget. */
	static removeChildFromPoint(c) {
		const e = document.elementFromPoint(...c.point);
		const t = c.currentTarget;
		const isRemovable = (e !== t) && (e.parentNode === t || t.contains(e));
		if (isRemovable) {
			e.remove();
		}
	}
	
	/** Makes a blank tool. Passes e.detail to the handlers. */
	constructor() {
		super();
		for (const n of DrawingTool.NAMES) {
			this.listeners.push([n, (e) => this[n]?.(e.detail)]);
		}
	}
}

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



/** Represents PointerEvents that dispatch the custom DrawingTool events. */
class PointerTool extends Dispatcher {
	static NAMES = ["pointerdown", "pointerleave", "pointermove", "pointerup"];
	static OPTIONS = {capture: false, passive: false};
	
	// 01 = binary 000001 bitmask for left-click/pen-tip.
	// 32 = binary 100000 bitmask for eraser.
	// 33 = binary 100001 bitmask for left-click | eraser.
	static VALID_BUTTONS = 33;
	
	// state of the pointerTool
	pointer = new PointerState();
	
	/**
	 * Makes a PointerTool. Options used are {capture: false, passive: false}
	 * because all events call e.preventDefault() every time.
	 */
	constructor() {
		super();
		for (const n of PointerTool.NAMES) {
			this.listeners.push([n, (e) => this[n]?.(e), PointerTool.OPTIONS]);
		}
	}
	
	/** If valid buttons: If primary then sets init else resets state. */
	pointerdown(e) {
		// If buttons is not supported (undefined or 0), set it to bitmask
		// for left-click/pen-tip = 1 because something triggered pointerdown.
		const buttons = (e.buttons || 1) & PointerTool.VALID_BUTTONS;
		if (buttons) {
			if (e.isPrimary) {
				this.pointer.init(e.clientX, e.clientY, buttons);
			} else {
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
		if (this.pointer.state && e.isPrimary) {
			this.pointer.moving();
			const ev = DrawingTool.drawEvent(e, this.pointer);
			e.currentTarget.dispatchEvent(ev);
		}
	}

	/** Dispatches END event and sets state to NONE if state is truthy. */
	pointerup(e) {
		if (this.pointer.state && e.isPrimary) {
			const ev = DrawingTool.endEvent(e, this.pointer);
			e.currentTarget.dispatchEvent(ev);
			this.pointer.reset();
		}
	}
}


/** Tool that removes elements under a pointer, except for attached element. */
class ElementRemover extends DrawingTool {
	[DrawingTool.DRAW](e) {
		DrawingTool.removeChildFromPoint(e);
	}
	
	[DrawingTool.END](e) {
		DrawingTool.removeChildFromPoint(e);
	}
}


/** Creates SVG paths from a SVG.js factory. */
class PathDrawer extends DrawingTool {
	align; // Function that aligns coordinates from viewPort to viewBox.
	attr; // SVG.js path's attributes.
	path; // SVG.js path that's being drawn.
	svg; // SVG.js factory that makes the path.

	/**
	 * Makes a PathDrawer.
	 *
	 * @param svgFactory Makes nodes. The result of calling SVG()
	 * @param svgAttributes Attributes of the SVG path element made.
	 */
	constructor(svgFactory, svgAttributes = {}) {
		super();
		this.attr = svgAttributes;
		this.svg = svgFactory;
		this.align = ViewBox.alignXYFn(svgFactory.node);
	}

	/** Adds/draws points for the middle of a path. */
	[DrawingTool.DRAW](e) {
		if (e.isEraserButton) {
			DrawingTool.removeChildFromPoint(e);
			return;
		}
		
		if (!this?.path) {
			this.drawingStart(this.getPosition(e.init, e.rect));
		}

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
	[DrawingTool.END](e) {
		if (e.isEraserButton) {
			DrawingTool.removeChildFromPoint(e);
		} else {
			if (!this?.path) {
				this.drawingStart(this.getPosition(e.point, e.rect));
			}
		}
		
		// remove reference to old path
		this.path = null;
	}

	/** Creates the path node at the initial point. */
	drawingStart([x, y]) {
		// Initial point, and a 0 length line to display point, in SVG syntax
		const initPoint = "M " + x + " " + y + " l 0 0";

		// Draw the SVG path and return it.
		this.path = this.svg.path(initPoint).attr(this.attr);
	}

	/** Scales position with element's bounds and SVG viewBox */
	getPosition([x, y], rect) {
		return this.align(x-rect.x, y-rect.y, rect.width, rect.height);
	}
}