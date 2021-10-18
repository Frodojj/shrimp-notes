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
To make he pointer event handlers without attaching them, just call
`svg.drawPointer()`. The parameters for `addEventListener()` or
`removeEventListener()` are the items of the `listeners` array.

## Erasing.

If you're using a drawing pen, you can use the eraser to erase. Or you can
use the `erase` tool:

```
svg.drawEraser();
```

## Removing the current tool.

When you call a tool without removing the previous tool, the previous tool will
be removed and the other one added in it's place. To remove the current tool
manually without adding a new tool, call `draw(false)` like so:

```
svg.draw(false);
```

## Creating an arbitrary tool.

To make a new tool, extend `SVG.DrawingTool`. You can find it's specification
below:

- SVG.DrawingTool
	- static DRAW
		- Represents the custom event that drawing is ongoing.
    - static END
		- Represents the custom event that drawing ends.
	- static NAMES
		- Array of event handler names to register.
    - static alignXYFn(node): fn(x, y, width, height): \[x, y]
		- Higher order function that returns another function that transforms
		  coordinates in the element (with width/height of the bounding box)
		  to coordinates in the SVG node's viewBox.
	- static drawEvent(e, {buttons, point})
		- Convenience function that makes a custom DRAW event.
	- static endEvent(e, {buttons, point})
		- Convenience function that makes a custom END event.
	- static makeEvent(name, e, buttons, \[x, y])
		- Convenience function that makes a custom event for a DrawingTool.
	- static removeChildFromPoint(e)
		- Removes an element that is at e.init point and contained
		  by e.currentTarget.
	- listeners
		- Array of parameters applied to add/removeEventListener.
	- addTo(node)
		- Adds all event listeners to node.
	- removeFrom(node)
		- Removes all event listeners from node.

Basically, you extend this class and write methods called
`[SVG.DrawingTool.Draw](e)` and `[SVG.DrawingTool.END](e)`. The parameter `e`
contains the following properties:

- buttons
	- MouseEvent.buttons or 1 (mask for main button) if buttons is unsupported
- currentTarget
	- currentTarget for the event. Usually should be the svg element node that
	  the events are attached to.
- init: \[x, y]
	- Initial point where pointerdown happened.
- point: \[clientX, clientY]
	- The point of the current move or end event.
- rect:
	- The result of currentTarget.getBoundingClientRect().

The method `[SVG.DrawingTool.DRAW]` is called when the drawing has started, for
example when the pointer move happens. `[SVG.DrawingTool.END]` is called when 
pointer out or pointer leave happens. No down event is triggered, but you can
check for the initial point in the object dispatched to the event (note:
not e.detail). It is done this way so as not to interfere with multi-finger
events (like zoom or pan). See the code to `PathDrawer` in drawing.js for an
example. Here's a short summary:

```
class MyTool extends SVG.DrawingTool {
	[SVG.DrawingTool.DRAW](e) {
		// Do Stuff
	}
	
	[SVG.DrawingTool.END](e) {
		// Do Stuff
	}
}
```

Note that you have to test and handle the eraser in your function if you want
the eraser to work. So:

```
class MyTool extends SVG.DrawingTool {
	[SVG.DrawingTool.DRAW](e) {
		if(e.buttons & 32) { // eraser button
			SVG.DrawingTool.removeChildFromPoint(e);
			return;
		}
		// Do Stuff
	}
	
	[SVG.DrawingTool.END](e) {
		if(e.buttons & 32) { // eraser button
			SVG.DrawingTool.removeChildFromPoint(e);
		}
		// Do Stuff
	}
}
```

## Adding an arbitrary tool.

To add the tool you just created, simply call `draw(tool)` like so:

```
const tool = new MyTool();
svg.draw(tool);
```

No matter where you go, there you are. Think about that, and have a good day!

-- Jimmy Cerra (Frodojj)
