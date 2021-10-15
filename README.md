# shrimp-notes

Hello, world! This is going to be a note taking app. The initial purpose is to
help with note taking during my jiu-jitsu classes and math classes. Currently
uses svg.js to help manage making svg elements, but this can be factored out
easily. Also uses svg.panzoom.js for zooming, but again this can be factored
out. The most important classes are currently in drawing.js The file main.js
an example app using it.

The class structure of drawing.js is as follows:

- ViewBox
    - static alignDimensions(node): \[width, height]
		- Convenience function that returns the width/height of the content box
		  or the element's bounding box size.
    - static alignXYFn(node): fn(x, y, width, height): \[x, y]
		- Higher order function that returns another function that transforms
		  coordinates in the element (with width/height of the bounding box) to
		  coordinates in the SVG node's viewBox.
    - static validate(node)
		- sets the viewBox using alignDimensions() if one was not specified.

- Dispatcher
    - static bind(node, dispatcher)
		- Applies all listeners to node.addEventListener().
    - static unbind(node, dispatcher)
		- Applies all listeners to node.removeEventListener().
	- listeners
		- Array of objects that hold parameters for standard JS functions
		- addEventListener()/removeEventListener(). 

- DrawingTool extends Dispatcher
    - static END
		- Represents the custom event that drawing ends.
	- static DRAWING
		- Represents the custom event that drawing is ongoing.
	- static NAMES
		- Array of event handler names to register.
	- static event(name, e, \[x, y])
		- Convenience method that makes a custom event for a DrawingTool.

- PointerTool extends Dispatcher
	- static NAMES
		- Array of event handler names to register.
	- static OPTIONS
		- Options object for the event handlers.
	- static MOVING: 2 (truthy)
		- Represents drawing is ongoing.
	- static INIT: 1 (truthy)
		- Represents start drawing.
	- static NONE: 0 (falsy)
		- Represents an idle state.
	- pointerState
		- Enumerated state NONE, INIT, or MOVING.
	- downPoint
		- Cached point of pointerDown so starting position known if drawing.
	- pointerdown(e)
		- Event listener that, if is primary pointer, then sets state to INIT
		  and sets downPoint. However if it is not primary, then it sets state
		  to NONE. This works because multi-finger events always first run the
		  primary pointer event then other pointer events.
	- pointerleave(e)
		- Event listener that just calls pointerup().
	- pointermove(e)
		- Event listener. If pointerState is truthy then dispatches DRAWING
		  and sets pointerState to MOVING.
	- pointerup(e)
		- Event listener. If pointerState is truthy then dispatches END and
		  sets pointerState to NONE.

- ElementRemover extends DrawingTool
	- drawing(e)
		- Custom event listener to erase element if isRemovable().
	- isRemovable(el): true/false
		- Returns true if element is not the root but contains el node.

- PathDrawer extends DrawingTool
	- align
		- FN made by ViewBox.alignXYFn() and used by getPosition().
	- attr
		- SVG path element's attributes.
	- path
		- SVG path element being drawn, or null if not drawn.
	- svg
		- SVG.js factory.
	- drawing(e)
		- Custom event listener to draw path.
	- drawingend(e)
		- Custom event listener to finish drawing path.
	- drawingStart(\[x, y])
		- Makes initial path.
	- getPosition(\[x, y], rect): \[x, y]
		- Aligns coordinates with SVG element's viewBox.

No matter where you go, there you are. Think about that, and have a good day!

-- Jimmy Cerra (Frodojj)
