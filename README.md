# shrimp-notes

Hello, world! This is going to be a note taking app. The initial purpose is to
help with note taking during my jiu-jitsu classes and math classes. Currently
uses [svg.js](https://github.com/svgdotjs/svg.js) to help manage making svg
elements, but this can be factored out easily. Also uses 
[svg.panzoom.js](https://github.com/svgdotjs/svg.panzoom.js) for zooming, but
again this can be factored out. The most important classes are currently in
drawing.js The file main.js an example app using it. You can find a
[demo here](https://frodojj.github.io/shrimp-notes/) or in the docs directory.

## Make sure you have a valid viewBox!!!

Your SVG node needs to have a viewBox. `DrawingApp` in main.js has a static
function `validateViewBox(node)` that shows how to make a viewBox that fits the
content or the viewPort of the SVG element.

```
DrawingApp.validateViewBox(node);
```

## Quick Summary

Here is a list of the methods/properties added to the SVG() object:

- drawingDispatchers
	- Array of the PointerEvent listener parameter arrays that dispatch the
	  drawing events.
- draw(tool)
	- Removes old tool's event listeners and draw with the specified tool. If 
	  drawingDispatchers is falsy, first creates new dispatchers on the node.
	  If tool is falsy, just removes old tool's event listener.
- drawEraser()
	- Draw with the eraser tool, which erases the element under the mouse
	  as long as it is the a child of the SVG node.
- drawPath(attr = {})
	- Draw with the path tool, which makes a path.

## Drawing a path.

To start drawing a path on the `node` SVG element use the `drawPath` tool:

```
const svg = SVG(node);
svg.drawPath(attr);
```

The parameter `attr` constains an object with the attributes for the new path.
For example:

```
const attr = {
	"fill": "none",
	"stroke": "currentColor",
	"stroke-linecap": "round",
	"stroke-width": "2"
};
```

Note: When a tool is added for the first time, event handlers for pointer
events are added to the `node` SVG element. The next time they are reused.

## Erasing.

If you're using a drawing pen, you can use the eraser to remove the top shape.
Or you can use the `erase` tool to do the same thing:

```
svg.drawEraser();
```

## Removing the current tool.

When you call a tool without removing the previous tool, the previous tool will
be removed and the other one added in it's place.

To remove the current tool manually without adding a new tool, call
`draw(false)` like so:

```
svg.draw(false);
```

## Adding an arbitrary tool.

To add a tool, simply call `draw(tool)` like so:

```
const tool = new MyTool();
svg.draw(tool);
```

## Creating an arbitrary tool.

To make a new tool, create an object with methods named the appropriate 
event to listen to. The names are part of SVG.DrawingTool. For example:

```
const myTool = {
	[SVG.DrawingTool.START](d) {
		// Do Stuff
	},

	[SVG.DrawingTool.DRAW](d) {
		// Do Stuff
	},
	
	[SVG.DrawingTool.END](d) {
		// Do Stuff
	}
};

svg.draw(myTool);
```

The parameter `d` contains details about the event with the following
properties:

- buttons
	- MouseEvent.buttons or 1 (mask for main button) if buttons is unsupported
- node
	- currentTarget for the event. Usually should be the svg element node that
	  the events are attached to.
- point: \[clientX, clientY]
	- The point of the current event.
- rect:
	- The result of currentTarget.getBoundingClientRect().

The object `SVG.DrawingTool` contains convenience functions to help making a
drawing tool easier:
 
- SVG.DrawingTool
	- START
		- Represents the custom event that drawing starts.
	- DRAW
		- Represents the custom event that drawing is ongoing.
    - END
		- Represents the custom event that drawing ends.
	- NAMES
		- The array: `[START, DRAW, END].
	- ERASER_MASK
		- 32 (the mask for an eraser) + 1 (primary pointer mask) = 33.
    - alignXYFn(node): fn(\[x, y], {left, top, width, height}): \[x, y]
		- Higher order function that returns another function that transforms
		  coordinates in the element (with rect of the bounding box) to
		  coordinates in the SVG node's viewBox.
	- dispatchers(start, move, end, debounce = 50, buttonsMask = 33)
		- Makes PointerEvent listeners that dispatch custom events named the
		  values of start, move, end. Debounce is the time between the down
		  event firing and the start event being dispatched if no more than
		  one finger was detected. buttonsMask is the mask of a valid button.
		  See MouseEvent.buttons for more info. If MouseEvent.buttons is not
		  supported, 1 (primary pointer) is used.
	- listeners(tool)
		- Makes drawing tool listeners from tool's methods with the same names
		  as the values of START, DRAW, and END>
	- removeFromPoint(point, node)
		- Convenience function that removes and element at point if node
		  is not the element and node contains the element.

The function `alignXYFn` is probably the most important. It translates points
from the details parameter to points in the SVG document. You can use it like
so:

```
class MyTool {
	constructor(svg) {
		this.svg = svg;
		this.align = SVG.DrawingTool.alignXYFn(svg.node);
	}
	
	[SVG.DrawingTool.START](d) {
		const [x, y] = this.align(d.point, d.rect);
		// Do Stuff with x, y coordinates
	}

	[SVG.DrawingTool.DRAW](d) {
		const [x, y] = this.align(d.point, d.rect);
		// Do Stuff with x, y coordinates
	}
	
	[SVG.DrawingTool.END](d) {
		const [x, y] = this.align(d.point, d.rect);
		// Do Stuff with x, y coordinates
	}
}

const svg = SVG(node);
svg.draw(new MyTool(svg));

```

Two classes come with the distribution:

- SVG.RemoverTool
	- Erases element under pointer.

- SVG.PathTool
	- Draws a path element.
	- constructor(svg, attr={})
		- svg is the SVG() factory. attr object has the attributes of the path.

Example use:

```
\\ same as svg.drawEraser()
svg.draw(new SVG.RemoverTool());


\\ same as svg.drawPath(attr);
svg.draw(new SVG.PathTool(svg, attr));

```

## Parting thought

No matter where you go, there you are. Think about that, and have a good day!

-- Jimmy Cerra (Frodojj)
