/*
 * Jimmy Cerra
 * 13 Oct. 2021
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


/**
 * Sample app that uses drawing.js classes. Controls which events are attached
 * to the svg node. */
class DrawingApp {
	/** Default SVG attributes of path element drawn. */
	static DEFAULTPATH = {
		"fill": "none",
		"stroke": "currentColor",
		"stroke-width": "2",
		"stroke-linecap": "round"
	};
	
	node; // SVG element to draw on.
	svg; // Factory that makes SVG elements from SVG.js.
	tool; // Drawing Tool being used.
	
	/**
	 * Makes the app.
	 * 
	 * @param node The SVG Element.
	 */
	constructor(node) {
		this.node = node;
		this.svg = SVG(node);
		this.svg.panZoom();
		this.tool = null;
		Dispatcher.bind(this.node, new PointerTool());
	}
	
	/**
	 * Sets DrawingTool to draw with a path element (basically a curvy line).
	 *
	 * @param attr SVG attributes for path element. Default is DEFAULTPATH.
	 */
	addPath(attr = DrawingApp.DEFAULTPATH) {
		this.addTool(new PathDrawer(this.svg, attr));
	}
	
	/** Sets the DrawingTool to use. */
	addTool(tool) {
		this.removeTool();
		this.tool = tool;
		Dispatcher.bind(this.node, tool);
	}
	
	panZoom() {
		this.removeTool();
	}
	
	/** Sets DrawingTool to erase element under it. */
	removeShape() {
		this.addTool(new ElementRemover(this.node));
	}
	
	/** Unsets the DrawingTool being used. */
	removeTool() {
		if(this.tool) {
			Dispatcher.unbind(this.node, this.tool);
			this.tool = null;
		}
	}
};


/** Sets up app with the HTML document. */
window.addEventListener("load", function(e) {
	const defaults = DrawingApp.DEFAULTPATH;
	const drawingNode = document.querySelector("main svg");
	ViewBox.validate(drawingNode);
	const drawingApp = new DrawingApp(drawingNode);
	const paths = new Map();
	const widths = [1, 2, 3, 5, 10, 20];
	
	// Helper to add an EventListener to nodes by selector.
	const addListener = function(selector, listener, events = ["input"]) {
		const nodes = document.querySelectorAll(selector);
		for(let n of nodes) {
			for(let e of events) {
				n.addEventListener(e, listener, false);
			}
		}
	};
	
	// EventListener that changes tool color.
	const colorFn = e => {
		let value = e.target.value;
		let name = e.target.dataset.tool;
		if(paths.has(name)) {
			const tool = paths.get(name);
			tool["stroke"] = value;
		}
		else {
			const tool = { ...defaults, "stroke": value };
			paths.set(name, tool);
		}
		// Set icon color
		let icon = document.querySelector("#" + name + " ~ label svg");
		icon.setAttribute("color", value);
	};
	
	// EventListener that changes tool being used.
	const toolFn = e => {
		let value = e.target.value;
		let name = e.target.dataset.tool;
		
		if(! name) {
			// if no name
			drawingApp[e.target.value]();
		}
		else if(paths.has(name)) {
			const tool = paths.get(name);
			drawingApp[e.target.value](tool);
		}
		else {
			const tool = { ...defaults};
			paths.set(name, tool);
			drawingApp[e.target.value](tool);
		}
	};
	
	// EventListener that changes tool width.
	const widthFn = e => {
		let value = widths[e.target.value];
		let name = e.target.dataset.tool;
		if(paths.has(name)) {
			const tool = paths.get(name);
			tool["stroke-width"] = value;
		}
		else {
			const tool = { ...defaults, "stroke-width": value };
			paths.set(name, tool);
		}
	};
	
	// Add EventListeners for toolbar.
	addListener("input[name='strokeColor']", colorFn, ["click", "input"]);
	addListener("input[name='tool']", toolFn);
	addListener("input[name='strokeWidth']", widthFn);
});