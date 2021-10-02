/*
 * Jimmy Cerra
 * 1 Oct. 2021
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
	listeners;
	
	/**
	 * Makes the Dispatcher object.
	 * 
	 * @param names Array of event names. The corresponding handlers will take
	 *              the same name as the event that they handle.
	 * @param options Optional options object passed to addEventHandler.
	 * @param fn Optional function to pre-process events before handing off to
	 *           the event handler.
	 */
	constructor({names, options={}, fn}) {
		this.listeners = [];
		for(const n of names) {
			const handler = fn ?
				(e) => this[n](fn(e)) :
				(e) => this[n](e);
			this.listeners.push([n, handler, options]);
		}
	}
}


/** Represents a Tool that you draw with. Uses custom events. */
class DrawingTool extends Dispatcher {
	/** Custom Event invoked when drawing is finished. */
	static END = "drawingend";
	
	/** Custom Event invoked while a drawing is being created. */
	static NEXT = "drawingmove";
	
	/** Custom Event invoked when drawing has started. */
	static START = "drawingstart";
	
	/**
	 * Makes a blank tool. A pre-process function passes e.detail to the 
	 * handlers.
	 */
	constructor() {
		super({
			names: [DrawingTool.END, DrawingTool.NEXT, DrawingTool.START],
			fn: (e) => e.detail
		});
	}
}


/** Represents PointerEvents that dispatch the custom DrawingTool events. */
class PointerTool extends Dispatcher {
	static DOWN = "pointerdown";
	static LEAVE = "pointerleave";
	static MOVE = "pointermove";
	static UP = "pointerup";
	
	/**
	 * All pointerevents are dispatched if true. Otherwise only pointerup. 
	 * pointerup sets this to true. pointerdown and pointerleave set it to
	 * false. controller is initially false.
	 */
	controller = false;
	
	/**
	 * Makes a PointerTool. Options used are {capture: false, passive: false}
	 * because all events call e.preventDefault() every time. The custom events
	 * dispatches have detail set to the Event of the handler itself.
	 */
	constructor() {
		super({
			names: [PointerTool.DOWN, PointerTool.LEAVE, 
				PointerTool.MOVE, PointerTool.UP],
			options: {capture: false, passive: false}
		});
		this.controller = false;
	}
	
	/**
	 * Sets controller to true and dispatches DrawingTool.START event. 
	 * Dispatches DrawingTool.NEXT event if controller is true.
	 * e.preventDefault() is called every time.
	 */
	pointerdown(e) {
		this.controller = true;
		const ev = new CustomEvent(DrawingTool.START, { detail: e });
		e.currentTarget.dispatchEvent(ev);
		e.preventDefault();
	}
	
	/** Same as pointerup function. */
	pointerleave(e) {
		this.pointerup(e);
	}
	
	/**
	 * Dispatches DrawingTool.NEXT event if controller is true.
	 * e.preventDefault() is called every time.
	 */
	pointermove(e) {
		if(this.controller) {
			const ev = new CustomEvent(DrawingTool.NEXT, { detail: e });
			e.currentTarget.dispatchEvent(ev);
		}
		e.preventDefault();
	}
	
	/**
	 * If controller is true, then dispatches DrawingTool.END event and sets 
	 * controller to false. e.preventDefault() is called every time.
	 */
	pointerup(e) {
		if(this.controller) {
			const ev = new CustomEvent(DrawingTool.END, { detail: e });
			e.currentTarget.dispatchEvent(ev);
			this.controller = false;
		}
		e.preventDefault();
	}
}

/** Tool that removes elements under an event, except for root Element. */
class ElementRemover extends DrawingTool {
	// SVG node.
	#root;
	
	/** 
	 * Makes an ElementRemover tool.
	 * 
	 * @param root The SVG node that contains anything being removed. The 
	 *             Element root will not be removed.
	 */
	constructor(root) {
		super();
		this.#root = root;
	}
	
	/** Does nothing at all. */
	drawingend(e) { }
	
	/** Same as drawingstart. */
	drawingmove(e) {
		this.drawingstart(e);
	}
	
	/** Removes an element under the mouse if it's removable. */
	drawingstart(e) {	
		// Determine point under pointer
		const x = e.clientX, y = e.clientY;
		
		// Determine which element is there
		const el = document.elementFromPoint(x, y);
		
		// remove if not root element.
		if(this.isRemovable(el)) {
			el.remove();
		}
	}
	
	/**
	 * Returns true if el is not the root node but is contained by the root.
	 */
	isRemovable(el) {
		// if root contains the element but isn't the element.
		return (el !== this.#root) && 
			((el.parentNode === this.#root) || this.#root.contains(el));
	}
}


/** Creates SVG paths from a SVG.js factory. */
class PathDrawer extends DrawingTool {
	#attr; // SVG path's attributes.
	#svg; // factory that makes the path.
	#path; // SVG path that's being drawn.
	
	// 
	/**
	 * Makes a PathDrawer.
	 * 
	 * @param svgFactory Makes nodes. The result of calling SVG()
	 * @param svgAttributes Attributes of the SVG path element made.
	 */
	constructor(svgFactory, svgAttributes={}) {
		super();
		this.#attr = svgAttributes;
		this.#svg = svgFactory;
	}
	
	/** Resets state for making a path. */
	drawingend(e) {
		// remove reference to old path
		this.#path = null;
	}
	
	/** Adds/draws points for the middle of a path. */
	drawingmove(e) {	
		// Determine new point location
		const x = e.offsetX, y = e.offsetY;
		
		// Create new point in SVG syntax
		const newPoint = "L " + x + " " + y;
		
		// Add new point to path's points
		const points = this.#path.array();
		points.push(newPoint);
		
		// Redraw path
		this.#path.plot(points);
	}
	
	/** Creates the path node at the initial point. */
	drawingstart(e) {	
		// Determine initial point
		const x = e.offsetX, y = e.offsetY;
		
		// Initial point, and a 0 length line to display point, in SVG syntax
		const initPoint = "M " + x + " " + y + " l 0 0";
		
		// Draw the SVG path and return it.
		this.#path = this.#svg.path(initPoint).attr(this.#attr);
	}
}