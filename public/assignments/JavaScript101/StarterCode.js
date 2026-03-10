/* Intro
Be sure to open the javascript console in Chrome for this tutorial
Also, you can drag the divider to make the codebox wider
*/

/**** A - Variables, values, and objects *****/
//let, const, and var all let you define variables
//if in doubt, just use let!

// an object is a collection of code which you can also 
//save in a variable. 
//Objects are created using the *new* keyword.

//define an oscillator object, and refer to it as vco:
let vco = new Tone.Oscillator()
//var and const can be used just like let (mostly)
//var vco = new Tone.Oscillator()
//const vco = new Tone.Oscillator()

//we can also just store numbers or text:
let val = 100
let val = 'hello'

//DON'T redefine objects! But updating numbers is ok:
let val = 200

/**** B - Executing and Debugging *****/
//execute a line by putting your cursor on it and typing option/alt-enter
let vco = new Tone.Oscillator().start()
let output = new Tone.Multiply(0.1).toDestination()
vco.connect( output )

//open the javascript console and inspect the vco
console.log( vco )
//hint: try using the oscillators .get() method
console.log( vco.get() )

//if we redefine vco it loses its reference:
//execute these line by line and look at the frequency in the console
vco.frequency.value = 100
console.log( vco.get() )
let vco = new Tone.Oscillator()
console.log( vco.get() )
//note this may cause the first 'vco' to keep playing endlessly
//refresh your browser to clear all currently running code

/**** C - Methods and Functions *****/

//properties use the '=' operator
let vco = new Tone.Oscillator().start()
let output = new Tone.Multiply(0.1).toDestination()
vco.connect( output )

vco.frequency.value = 100
vco.type = 'square'
//methods use parentheses
vco.start()
vco.stop()
//look at examples and references to find available properties and methods

//methods and functions MAY use arguments inside the parentheses.
//again, look at examples or references

//define functions - execute this block:
let myFunction = function(myArgument){
  console.log( myArgument) 
}

//then call the function by executing the following lines:
myFunction( 100 )
myFunction( 'foo' )
myFunction( vco )
