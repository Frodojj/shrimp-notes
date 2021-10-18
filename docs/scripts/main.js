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
	
	/** Default Pan and Zoom settings. */
	static TOOL_ZOOM = {
		oneFingerPan: false, // Use two fingers instead.
		panButton: 1, // mouse middle-click.
		zoomMax: 8,
		zoomMin: 1/16
	};
	
	/** View "Finger" mode Pan and Zoom settings. */
	static VIEW_ZOOM = {
		...DrawingApp.TOOL_ZOOM,
		oneFingerPan: true, // Use one finger.
		panButton: 0 // mouse left-click. 
	};
	
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
	 * Utility function that makes verifies/creates a SVG node's viewBox. If
	 * the node doesn't have a viewBox attribute, or if the viewBox's width
	 * or height are 0 or negative, then ViewBox.alignDimensions(node)
	 * is called.
	 *
	 * @param node The SVG node (SVGSVGElement)
	 */
	static validateViewBox(node) {
		// baseVal doesn't exist when attribute is missing for Firefox
		const {x=0, y=0, width=0, height=0} = node?.viewBox?.baseVal ?? {};
		
		// Make sure dimensions are valid.
		if (width <= 0 || height <= 0) {
			const [w, h] = DrawingApp.alignDimensions(node);
			node.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
		}
	}
	
	svg; // Factory that makes SVG elements from SVG.js.
	
	/** The node is the SVG Element. */
	constructor(node) {
		this.node = node;
		this.svg = SVG(node);
		
		// Add pan and zoom after making sure has a good viewBox.
		DrawingApp.validateViewBox(node);
		this.svg.panZoom(DrawingApp.VIEW_ZOOM);
	}
	
	/** Sets tool to draw with a SVG path element. */
	addPath(attr = DrawingApp.PATH) {
		this.svg.drawPath(attr);
		this.svg.panZoom(DrawingApp.TOOL_ZOOM);
	}
	
	/** Sets zoom attributes to VIEW_ZOOM */
	panZoom() {
		this.svg.draw(false);
		this.svg.panZoom(DrawingApp.VIEW_ZOOM);
	}
	
	/** Sets tool to remove element under it. */
	removeShape() {
		this.svg.drawEraser();
		this.svg.panZoom(DrawingApp.TOOL_ZOOM);
	}
	
	removeTool() {
		this.svg.draw(false);
	}
}


/** Sets up app with the HTML document. */
window.addEventListener("load", function(e) {
	const defaults = DrawingApp.PATH;
	const drawingNode = document.querySelector("main svg");
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