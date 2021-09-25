/*
 Jimmy Cerra
 25 Sept. 2021
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

class Drawing {
	static defaultPath = {
		"fill": "none",
		"stroke": "currentColor",
		"stroke-width": "2",
		"stroke-linecap": "round"
	}
	
	#factory; // Makes svg elements from SVG.js
	#node; // The actual svg element on the page.
	#listener; // The tool being used.
	
	// Root is HTML Element to put SVG node.
	constructor(root) {
		this.#factory = SVG().addTo(root).size("100%", "100%");
		this.#node = this.#factory.node; // SVG node, not HTML Element root.
		this.#listener = null;
	}
	
	addPath(attr = Drawing.defaultPath) {
		this.removeTool();
		let tool = new PathDrawer(this.#factory, attr);
		this.#listener = tool.listenTo(this.#node);
	}
	
	removeShape() {
		this.removeTool();
		let tool = new ElementRemover(this.#node);
		this.#listener = tool.listenTo(this.#node);
	}

	removeTool() {
		if(this.#listener)
			DrawingTool.unbind(this.#node, this.#listener);
		this.#listener = null;
	}
};

window.addEventListener("load", function(e) {
	const drawingNode = document.querySelector("main");
	const drawing = new Drawing(drawingNode);
	const paths = new Map();
	const widths = [1, 2, 3, 5, 10, 20];
	
	const addListener = function(selector, listener, events = ["input"]) {
		const nodes = document.querySelectorAll(selector);
		for(let n of nodes) {
			for(let e of events) {
				n.addEventListener(e, listener, false);
			}
		}
	};
	
	const colorFn = e => {
		let value = e.target.value;
		let name = e.target.dataset.tool;
		if(paths.has(name)) {
			const tool = paths.get(name);
			tool["stroke"] = value;
		}
		else {
			const tool = { ...Drawing.defaultPath, "stroke": value };
			paths.set(name, tool);
		}
		// Set icon color
		let icon = document.querySelector("#" + name + " ~ label svg");
		icon.setAttribute("color", value);
	};
	
	const toolFn = e => {
		let value = e.target.value;
		let name = e.target.dataset.tool;
		
		if(! name) {
			// if no name
			drawing[e.target.value]();
		}
		else if(paths.has(name)) {
			const tool = paths.get(name);
			drawing[e.target.value](tool);
		}
		else {
			const tool = { ...Drawing.defaultPath};
			paths.set(name, tool);
			drawing[e.target.value](tool);
		}
	};
	
	const widthFn = e => {
		let value = widths[e.target.value];
		let name = e.target.dataset.tool;
		if(paths.has(name)) {
			const tool = paths.get(name);
			tool["stroke-width"] = value;
		}
		else {
			const tool = { ...Drawing.defaultPath, "stroke-width": value };
			paths.set(name, tool);
		}
	};
	
	addListener("input[name='strokeColor']", colorFn, ["click", "input"]);
	addListener("input[name='tool']", toolFn);
	addListener("input[name='strokeWidth']", widthFn);
});