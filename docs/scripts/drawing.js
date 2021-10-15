/*
 * Jimmy Cerra
 * 15 Oct. 2021
 * MIT License
 * 
 * Copyright 2021 James Francis Cerra
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
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
	 *         in he viewPort and width, height are the dimension of the
	 *         viewPort. Function returns an array [xInBox, yInBox] of the
	 *         coordinates in the viewBox for the SVG Element.
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
		const xMax = (scale, x, w) => x*scale+box.x+box.width-w*scale;
		const xMid = (scale, x, w) => x*scale+box.x+(box.width-w*scale)/2;
		const xMin = (scale, x) => x*scale+box.x;
		const yMax = (scale, y, h) => y*scale+box.y+box.height-h*scale;
		const yMid = (scale, y, h) => y*scale+box.y+(box.height-h*scale)/2;
		const yMin = (scale, y) => y*scale+box.y;
		
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
				const xInBox = xAlignFn(scale, x, width);
				const yInBox = yAlignFn(scale, y, height);
				return [xInBox, yInBox];
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
		if(width <= 0 || height <= 0) {
			const [w, h] = ViewBox.alignDimensions(node);
			const attr = `${x} ${y} ${w} ${h}`;
			node.setAttribute("viewBox", attr);
		}
	}
}


/** Used to bind/unbind groups of events with a node. */
class Dispatcher {
	/** Adds a dispatcher's EventListeners to a node. */
	static bind(node, dispatcher) {
		const listeners = dispatcher.listeners;
		
		for(const listener of listeners) {
			node.addEventListener(...listener);
		}
	}
	
	/** Removes a dispatcher's EventListeners to a node. */
	static unbind(node, dispatcher) {
		const listeners = dispatcher.listeners;
		
		for(const listener of listeners) {
			node.removeEventListener(...listener);
		}
	}
	
	/** The EventListeners associated with this Dispatcher. */
	listeners = [];
}


/** Represents a Tool that you draw with. Uses custom events. */
class DrawingTool extends Dispatcher {
	/** Custom Event invoked when drawing is finished. */
	static END = "drawingend";
	
	/** Custom Event invoked while a drawing is being created. */
	static DRAWING = "drawing";
		
	/** Convenience array of names of events pushed to listeners. */
	static NAMES = [DrawingTool.DRAWING, DrawingTool.END];
	
	/**
	 * Convenience function to make CustomEvent of name and with detail object
	 * = {clientHeight, clientWidth, clientX, clientY, offsetX, offsetY} where
	 * clientHeight/clientWidth come from the BoundingClientRect of the
	 * currentTarget.
	 *
	 * @param name Name of the CustomEvent to create.
	 * @param e PointerEvent or an object with clientX, clientY, offsetX,
	 *          offsetY, and getBoundingClientRect()
	 */
	static event(name, e, [x, y]) {
		return new CustomEvent(name, {
			detail: {
				init: [x, y],
				point: [e.clientX, e.clientY],
				rect: e.currentTarget.getBoundingClientRect()
			}
		});
	}
	
	/** Makes a blank tool. Passes e.detail to the handlers. */
	constructor() {
		super();
		for(const n of DrawingTool.NAMES) {
			this.listeners.push([n, (e) => this[n]?.(e.detail)]);
		}
	}
}


/** Represents PointerEvents that dispatch the custom DrawingTool events. */
class PointerTool extends Dispatcher {
	static NAMES = [
		"pointerdown", "pointerleave", "pointermove", "pointerup"
	];
	static OPTIONS = {capture: false, passive: false};
	static MOVING = 2;// pointer is moving.
	static INIT = 1; // pointer is down.
	static NONE = 0; // not doing anything.
	
	pointerState = PointerTool.NONE; // state of pointer.
	downPoint = []; // Point that the pointer was down on.

	/**
	 * Makes a PointerTool. Options used are {capture: false, passive: false}
	 * because all events call e.preventDefault() every time. The custom events
	 * dispatches have detail set to the Event of the handler itself.
	 */
	constructor() {
		super();
		for(const n of PointerTool.NAMES) {
			this.listeners.push([n, (e) => this[n]?.(e), PointerTool.OPTIONS]);
		}
	}
	
	/**
	 * Sets state to INIT and records the point where pointer was down if
	 * is primary pointer. Otherwise, resets state to NONE.
	 */
	pointerdown(e) {
		if(e.isPrimary) {
			e.preventDefault();
			this.pointerState = PointerTool.INIT;
			this.downPoint = [e.clientX, e.clientY];
		} else {
			this.pointerState = PointerTool.NONE;
		}
	}
	
	/** Same as pointerup function. */
	pointerleave(e) {
		this.pointerup(e);
	}
	
	/** Sets state to MOVING & dispatches DRAWING event if state is truthy. */
	pointermove(e) {
		if(this.pointerState && e.isPrimary) {
			e.preventDefault();
			this.pointerState = PointerTool.MOVING;
			const ev = DrawingTool.event(
				DrawingTool.DRAWING, e, this.downPoint);
			e.currentTarget.dispatchEvent(ev);
		}
	}
	
	/** Dispatches END event and sets state to NONE if state is truthy. */
	pointerup(e) {
		if(this.pointerState && e.isPrimary) {
			e.preventDefault();
			const ev = DrawingTool.event(DrawingTool.END, e, this.downPoint);
			e.currentTarget.dispatchEvent(ev);
			this.pointerState = PointerTool.NONE;
		}
	}
}


/** Tool that removes elements under an event, except for root Element. */
class ElementRemover extends DrawingTool {
	root;
	
	/** 
	 * Makes an ElementRemover tool.
	 * 
	 * @param root The root node that contains anything being removed. The 
	 *             root will not be removed.
	 */
	constructor(root) {
		super();
		this.root = root;
	}
	
	/** Removes an element under the mouse if it's removable. */
	drawing(e) {
		const [x, y] = e.point;
		const el = document.elementFromPoint(x, y);
		if(this.isRemovable(el)) {
			el.remove();
		}
	}
	
	/**
	 * Returns true if el is not the root node but is contained by the root.
	 */
	isRemovable(el) {
		// if root contains the element but isn't the element.
		return (el !== this.root) && 
			((el.parentNode === this.root) || this.root.contains(el));
	}
}


/** Creates SVG paths from a SVG.js factory. */
class PathDrawer extends DrawingTool {
	align; // Function that translates coordinates from viewPort to viewBox.
	attr; // SVG path's attributes.
	path; // SVG path that's being drawn.
	svg; // factory that makes the path.
	
	/**
	 * Makes a PathDrawer.
	 * 
	 * @param svgFactory Makes nodes. The result of calling SVG()
	 * @param svgAttributes Attributes of the SVG path element made.
	 */
	constructor(svgFactory, svgAttributes={}) {
		super();
		this.attr = svgAttributes;
		this.svg = svgFactory;	
		this.align = ViewBox.alignXYFn(svgFactory.node);
	}
	
	/** Adds/draws points for the middle of a path. */
	drawing(e) {
		if(! this?.path) {
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
	drawingend(e) {
		if(! this?.path) {
			this.drawingStart(this.getPosition(e.point, e.rect));
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