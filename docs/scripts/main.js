/*
 * Jimmy Cerra
 * 26 Oct. 2021
 * MIT License
 */


/**
 * Sample app that uses drawing.js classes. Controls which events are attached
 * to the svg node and the parameters for those events. */
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
		...this.TOOL_ZOOM,
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
			const [w, h] = this.alignDimensions(node);
			node.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
		}
	}
	
	svg; // Factory that makes SVG elements from SVG.js.
	
	/** The node is the SVG Element. */
	constructor(node) {
		// Make sure has a good viewBox.
		DrawingApp.validateViewBox(node);
		
		this.svg = SVG(node);		
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
}


/** Takes care of attributes object state for app. */
class DrawingAttributes {
	attrsMap = new Map();          // Map of names with path attributes.
	defaultPath = DrawingApp.PATH; // Default path copied.
	widths = [1, 2, 3, 5, 10, 20]; // Possible width values.
	
	/** Gets an object of attributes or makes one if it doesn't exist. */
	getAttributes(name) {
		const map = this.attrsMap;
		
		if (map.has(name)) {
			return map.get(name);
		}
		else {
			// make a new name/value pair.
			const attrs = { ...this.defaultPath};
			map.set(name, attrs);
			return attrs;
		}
	}
	
	/** Sets a particular prop value for a named attribute */
	setAttribute(name, prop, value) {
		const attrs = this.getAttributes(name);
		attrs[prop] = value;
	}
	
	/** Sets color of attribute object name. */
	setColor(name, value) {
		this.setAttribute(name, "stroke", value);
	}
	
	/** Sets size of attribute object name to item in widths array. */
	setSize(name, item) {
		const length = this.widths.length;
		
		// Make sure value is in array.
		if (item > length) item = length;
		else if (item < 0) item = 0;
		
		// Set the width to the value in array.
		this.setWidth(name, this.widths[item]);
	}
	
	/** Sets width of attribute object name. */
	setWidth(name, value) {
		this.setAttribute(name, "stroke-width", value);
	}
}


/** Sets up app with the HTML document. */
window.addEventListener("load", function(ev) {
	const node = document.querySelector("main svg");
	const app = new DrawingApp(node);
	const state = new DrawingAttributes();
	/*
	const logObserver = new MutationObserver(([{target}]) => {
		console.log('viewBox: ', target.viewBox.baseVal);
	});
	
	logObserver.observe(node, {attributeFilter: ["viewBox"]});
	*/
	
	
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
		let attr = e.target.dataset.tool;
		let value = e.target.value;
		state.setColor(attr, value);
		
		// Set icon color
		let icon = document.querySelector("#" + attr + " ~ label svg");
		icon.setAttribute("color", value);
	};
	
	// EventListener that changes tool being used.
	const toolFn = e => {
		let attrName = e.target.dataset.tool;
		let fnName = e.target.value;
		
		if(!attrName) {
			app[fnName]();
		} else {
			app[fnName](state.getAttributes(attrName));
		}
	};
	
	// EventListener that changes tool width.
	const widthFn = e => {
		let attr = e.target.dataset.tool;
		let value = e.target.value;
		state.setSize(attr, value);
	};
	
	// Add EventListeners for toolbar.
	addListener("input[name='strokeColor']", colorFn, ["click", "input"]);
	addListener("input[name='tool']", toolFn);
	addListener("input[name='strokeWidth']", widthFn);
});