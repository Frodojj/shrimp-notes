/*
 Jimmy Cerra
 10 Sept. 2021
 MIT License
 
 Copyright 2021 James Francis Cerra
 
 Permission is hereby granted, free of charge, to any person obtaining a copy of
 this software and associated documentation files (the "Software"), to deal in
 the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do
 so, subject to the following conditions:
 
 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

/* Generic Pattern of building something in sequence. Subclasses should 
   override start, next, end. This default implementation does nothing. */
class DrawingTool {
	// Called when starting. e.g. mouse clicks down
	start(e) { /* Do nothing */ }
	
	// Called when continuing. e.g. mouse moves
	next(e) { /* Do nothing */ }
	
	// Called when finished. e.g. mouse released up
	end(e) { /* Do nothing */ }
	
	/* Adds event listeners to node to execute start(e). When start(e) 
	   executes, two more event listeners are added to execute next(e) and 
	   end(e). After end(e) executes, the event listeners for next(e) and 
	   end(e) are removed, but the event listener for start(e) is still 
	   attached. The eventlistener for start(e) is returned by this function
	   (so it can be unbound). The optional object specifies arrays of the 
	   events to attach each method to. */
	listenTo(node, {
				start = ["pointerdown"], 
				next = ["pointermove"], 
				end = ["pointerup", "pointerleave"]
			} = {} // optional default paramater object
		) {
			
		// EventListener to make next parts of the object
		const nextListener = (e) => {
			this.next(e);
		};
		
		// EventListener to finish making the object then remove itself
		//  and then "next" EventListener.
		const endListener = (e) => {
			this.end(e);
			DrawingTool.unbind(node, nextListener, next);
			DrawingTool.unbind(node, endListener, end);
		};
		
		// EventListener to start.
		const startListener = (e) => {
			this.start(e);
			DrawingTool.bind(node, nextListener, next);
			DrawingTool.bind(node, endListener, end);
		};
		
		// Attachs EventListener to start.
		DrawingTool.bind(node, startListener, start);
		
		return startListener;
	}
	
	/* Add an event handler to an event or multiple events, default is 
	   pointerdown. */
	static bind(node, handler, events = ["pointerdown"]) {
		for(let e of events) {
			node.addEventListener(e, handler);
		}
	}

	/* Removes an event handler to an event or multiple events, default is 
	   pointerdown. */
	static unbind(node, handler, events = ["pointerdown"]) {
		for(let e of events) {
			node.removeEventListener(e, handler);
		}
	}
}


/* Tool that removes elements under an event, except for root Element. */
class ElementRemover extends DrawingTool {
	#root;
	constructor(root) {
		super();
		this.#root = root;
	}
	
	start(e) {
		// Determine point under pointer
		const x = e.clientX, y = e.clientY;
		
		// Determine which element is there
		const el = document.elementFromPoint(x, y);
		
		// remove if not root element.
		if(this.isRemovable(el)) {
			el.remove();
		}
	}
	
	next(e) {
		// same as for start(e)
		this.start(e);
	}
	
	isRemovable(el) {
		// if root contains the element but isn't the element.
		return (el !== this.#root) && this.#root.contains(el);
	}
}


/* Creates svg paths from a SVG.js factory. */
class PathDrawer extends DrawingTool {
	#attr; // svg path's attributes.
	#svg; // factory that makes the path.
	#path; // svg path that's being drawn.
	
	// svgFactory is result of calling SVG(). svgAttributes are svg attr.
	constructor(svgFactory, svgAttributes = { }) {
		super();
		this.#attr = svgAttributes;
		this.#svg = svgFactory;
	}
	
	start(e) {
		// Determine initial point
		const x = e.offsetX, y = e.offsetY;
		
		// Calculate initial point (and a 0 length line to display point)
		// in svg syntax.
		const initPoint = "M " + x + " " + y + " l 0 0";
		
		// Draw the svg path and return it.
		this.#path = this.#svg.path(initPoint).attr(this.#attr);
	}
	
	next(e) {
		// Determine new point location
		const x = e.offsetX, y = e.offsetY;
		
		// Create new point in svg syntax
		const newPoint = "L " + x + " " + y;
		
		// Add new point to path's points
		const points = this.#path.array();
		points.push(newPoint);
		
		// Redraw path
		this.#path.plot(points);
	}
	
	end(e) {
		// remove reference to old path
		this.#path = null;
	}
}