/*
 * Jimmy Cerra
 * 16 Oct. 2021
 * MIT License
 */


/**
 * Sample app that uses drawing.js classes. Controls which events are attached
 * to the svg node. */
class DrawingApp {
	/** Default SVG attributes of path element drawn. */
	static PATH = {
		"fill": "none",
		"stroke": "currentColor",
		"stroke-linecap": "round",
		"stroke-width": "2"

	};
	
	static TOOL_ZOOM = {
		oneFingerPan: false, // Use two fingers instead.
		panButton: 1, // mouse middle-click.
		zoomMax: 8,
		zoomMin: 1/16
	};
	
	static VIEW_ZOOM = {
		...DrawingApp.TOOL_ZOOM,
		oneFingerPan: true, // Use one finger.
		panButton: 0 // mouse left-lick. 
	};
	
	node; // SVG element to draw on.
	svg; // Factory that makes SVG elements from SVG.js.
	tool; // Drawing Tool being used.
	
	/** The node is the SVG Element. */
	constructor(node) {
		this.node = node;
		this.svg = SVG(node);
		this.svg.panZoom(DrawingApp.VIEW_ZOOM);
		this.tool = null;
		const pointerTool = new PointerTool();
		for (const listener of pointerTool.listeners) {
			this.node.addEventListener(...listener);
		};
	}
	
	/** Sets tool to draw with a SVG path element. */
	addPath(attr = DrawingApp.PATH) {
		this.addTool(new PathDrawer(this.svg, attr));
	}
	
	/** Sets the DrawingTool to use. */
	addTool(tool) {
		this.removeTool();
		this.svg.panZoom(DrawingApp.TOOL_ZOOM);
		this.tool = tool;
		for (const listener of this.tool.listeners) {
			this.node.addEventListener(...listener);
		};
	}
	
	/** Sets zoom attributes to VIEW_ZOOM */
	panZoom() {
		this.removeTool();
		this.svg.panZoom(DrawingApp.VIEW_ZOOM);
	}
	
	/** Sets tool to remove element under it. */
	removeShape() {
		this.addTool(new ElementRemover());
	}
	
	/** Unsets the DrawingTool being used. */
	removeTool() {
		if (this.tool) {
			for (const listener of this.tool.listeners) {
				this.node.removeEventListener(...listener);
			}
			this.tool = null;
		}
	}
}


/** Sets up app with the HTML document. */
window.addEventListener("load", function(e) {
	const defaults = DrawingApp.PATH;
	const drawingNode = document.querySelector("main svg");
	ViewBox.validate(drawingNode);
	const drawingApp = new DrawingApp(drawingNode);
	const paths = new Map();
	const widths = [1, 2, 3, 5, 10, 20];
	
	// Helper to add an EventListener to nodes by selector.
	const addListener = function(selector, listener, events = ["input"]) {
		const nodes = document.querySelectorAll(selector);
		for (const n of nodes) {
			for (const e of events) {
				n.addEventListener(e, listener, false);
			}
		}
	};
	
	// EventListener that changes tool color.
	const colorFn = e => {
		let value = e.target.value;
		let name = e.target.dataset.tool;
		if (paths.has(name)) {
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
		
		if (!name) {
			// if no name
			drawingApp[e.target.value]();
		}
		else if (paths.has(name)) {
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
		if (paths.has(name)) {
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