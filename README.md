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
	- listeners
		- Array of objects that hold parameters for standard JS functions

- DrawingTool extends Dispatcher
	- static DRAW
		- Represents the custom event that drawing is ongoing.
    - static END
		- Represents the custom event that drawing ends.
	- static NAMES
		- Array of event handler names to register.
	- static drawEvent(e, {buttons, point})
		- Convenience function that makes a custom DRAW event.
	- static endEvent(e, {buttons, point})
		- Convenience function that makes a custom END event.
	- static makeEvent(name, e, buttons, \[x, y])
		- Convenience function that makes a custom event for a DrawingTool.
	- static removeChildFromPoint(c)
		- Removes an element that is at c.init point and contained
		  by c.currentTarget. c is the custom event.

- PointerState
	- static MOVING: 2 (truthy)
		- Represents drawing is ongoing.
	- static INIT: 1 (truthy)
		- Represents start drawing.
	- static NONE: 0 (falsy)
		- Represents an idle state.
	- buttons
		- Buttons pressed when pointerdown occured.
	- point
		- \[x, y] point where pointerdown occured.
	- state
		- NONE, INIT, or MOVING.
	- init(x, y, buttons)
		- Sets state to INIT and point and buttons.
	- moving()
		- Sets state to MOVING.
	- reset()
		- Sets state to NONE, point to [], buttons to 0.

- PointerTool extends Dispatcher
	- static NAMES
		- Array of event handler names to register.
	- static OPTIONS
		- Options object for the event handlers.
	- static VALID_BUTTONS = 33
		- Mask for MouseEvent.Buttons that represents a touch, left-click, 
		  pen-tip or pen-eraser button.
	- pointer
		- State of the pointerTool.
	- pointerdown(e)
		- Event listener that, if valid buttons are set then: if primary 
		  pointer then sets state to init, else resets state.
	- pointerleave(e)
		- Event listener that just calls pointerup().
	- pointermove(e)
		- Event listener. If primary & state is truthy then sets state to
		  MOVING and dispatches DRAW event.
	- pointerup(e)
		- Event listener. If primary & state is truthy then dispatches END
		  and resets state.

- ElementRemover extends DrawingTool
	- \[DrawingTool.DRAW](e)
		- Erases element by calling DrawingTool.removeChildFromPoint(e).
	
	- \[DrawingTool.END](e) {
		- Erases element by calling DrawingTool.removeChildFromPoint(e).

- PathDrawer extends DrawingTool
	- align
		- FN made by ViewBox.alignXYFn() and used by getPosition().
	- attr
		- SVG path element's attributes.
	- path
		- SVG path element being drawn, or null if not drawn.
	- svg
		- SVG.js factory.
	- \[DrawingTool.DRAW](e)
		- Custom event listener. Draws path or erases depending on button.
	- \[DrawingTool.END](e)
		- Custom event listener. Finishes path or erase depending on button.
	- drawingStart(\[x, y])
		- Makes initial path.
	- getPosition(\[x, y], rect): \[x, y]
		- Aligns coordinates with SVG element's viewBox.

No matter where you go, there you are. Think about that, and have a good day!

-- Jimmy Cerra (Frodojj)
