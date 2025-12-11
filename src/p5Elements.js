/*
p5Elements.js
created by Kayli Requenez F23
*/

import p5 from 'p5';
import themes from './p5Themes.json';

let activeTheme = themes['default']; // Default theme preset


export function debug() {
    console.log('esy')
    console.log(activeTheme)
}

//************** THEME DEFINITIONS *************/
// Function to list available themes
export function listThemes() {
    console.log(Object.keys(themes))
}

export function setp5Theme(p,themeName) {
    //console.log(p, themeName, themes)
    if (!themes[themeName]) {
        console.error(`Theme '${themeName}' not found.`);
        return;
    }
    activeTheme = themes[themeName]; // Default theme preset
    Object.assign(p, activeTheme);
    return themes[themeName]
}

// Function to update theme parameters
export function setThemeParameters(parameters) {
    if (activeTheme) {
        // Merge the provided parameters with the active theme
        activeTheme = { ...activeTheme, ...parameters };
    } else {
        console.error(`Active theme '${activeTheme}' not found.`);
    }
}

// Function to get the current theme values in JSON format
export function exportTheme() {
    console.log(`exporting ` + activeTheme);
    console.log(JSON.stringify(activeTheme, null, 2))
    return JSON.stringify(activeTheme, null, 2);
}

//************** INITIALIZE **************

export function initialize(p, div, height) {
    p.div = div;
    p.createCanvas(div.offsetWidth, div.offsetWidth * .4 * height).parent(div).style('position', 'relative');
    p.width = div.offsetWidth;
    p.height = div.offsetWidth * .4 * height;
    p.elements = {};

    if (div && div.id) {
        const registerOnView = (view) => {
            if (!view) {
                return;
            }
            if (!view.__creativitasCanvasRegistry) {
                Object.defineProperty(view, '__creativitasCanvasRegistry', {
                    value: {},
                    configurable: true,
                    enumerable: false,
                    writable: true,
                });
            }
            view.__creativitasCanvasRegistry[div.id] = p;
        };

        if (typeof window !== 'undefined') {
            registerOnView(window);
        }

        const hostView = div.ownerDocument?.defaultView;
        if (hostView && hostView !== window) {
            registerOnView(hostView);
        }
    }

    return [p.width, p.height]
}

p5.prototype.initialize = function (div, height) {
    return initialize(this, div, height);
};

function resizeP5(string, scaleWidth, scaleHeight) {
    var regex = /(\w+)\.(\w+)\((.*?)\)/;
    var match = string.match(regex);

    if (match) {
        // Extract the canvas, function name, and items inside the parentheses
        var canvasName = match[1]
        var functionName = match[2];
        let items = match[3].split(',').map(item => item.trim());

        // New values
        for (let i = 0; i < (functionName === 'arc' ? 4 : items.length); i++) {
            if (functionName === 'circle' && i > 1) {
                items[i] *= (scaleWidth + scaleHeight) / 2;
            }
            else {
                if (i % 2 === 0) {
                    items[i] *= scaleWidth;
                }
                else {
                    items[i] *= scaleHeight;
                }
            }
        }

        // Replace the items with new values
        return string.replace(match[0], canvasName + '.' + functionName + '(' + items.join(', ') + ')');
    }
    return string;
}

export function divResized(p, maxClicked, canvasLength) {
    let prevWidth = p.width;
    let prevHeight = p.height;
    const doc = (p && p.canvas && p.canvas.ownerDocument) || document;
    p.resizeCanvas(0, 0);

    const canvasesCont = doc.getElementById("canvases") || p.div;
    const controlsCont = doc.getElementById("controls");
    const flexCont = doc.getElementById('flex') || (canvasesCont && canvasesCont.parentElement) || (p.div && p.div.parentElement);

    const controlsHeight = controlsCont ? controlsCont.offsetHeight : 0;
    const canvasesHeight = canvasesCont ? canvasesCont.offsetHeight : (p.div ? p.div.offsetHeight : prevHeight);
    const flexWidth = flexCont ? flexCont.offsetWidth : (p.div ? p.div.offsetWidth : prevWidth);
    const divWidth = p.div ? p.div.offsetWidth : prevWidth;
    //const divHeight = p.div ? p.div.offsetHeight : prevHeight;
    const divHeight =  prevHeight;

    if (maxClicked === '+h') {
        p.height = canvasesHeight - controlsHeight;
        p.width = divWidth;
    }
    else if (maxClicked === '-h') {
        const safeLength = canvasLength && canvasLength > 0 ? canvasLength : 1;
        p.height = canvasesHeight / safeLength - controlsHeight;
        p.width = prevWidth;
    }
    else if (maxClicked === '+w') {
        p.width = flexWidth;
        p.height = divHeight;
    }
    else if (maxClicked === '-w') {
        p.width = flexWidth / 2;
        p.height = prevHeight;
    }
    else {
        p.width = divWidth;
        p.height = divHeight;
    }

    p.width = Math.max(p.width, 1);
    p.height = Math.max(p.height, 1);

    let scaleWidth = prevWidth ? p.width / prevWidth : 1;
    let scaleHeight = prevHeight ? p.height / prevHeight : 1;
    p.resizeCanvas(p.width, p.height);
    for (let [key, element] of Object.entries(p.elements)) {
        if (typeof (element) === "string") {
            p.elements[key] = resizeP5(element, scaleWidth, scaleHeight);
        }
        else {
            element.resize(scaleWidth, scaleHeight);
        }
    }
    p.drawElements();
};

p5.prototype.divResized = function (maxClicked = false, canvasLength = null) {
    divResized(this, maxClicked, canvasLength);
};

function drawGrid(p) {
    let margin = 10;
    let spacingX = Math.ceil((p.width - 2 * margin) / 3) - 5;
    let spacingY = Math.ceil((p.height - 2 * margin) / 3) - 5;
    p.textSize(12);
    let bgColorSum = p.backgroundColor.reduce((a, b) => a + b)
    //let isBlack = p.red(p.backgroundColor) === 0 && p.green(p.backgroundColor) === 0 && p.blue(p.backgroundColor) === 0;
    p.fill(bgColorSum < 382 ? 255 : 0);
    p.noStroke();
    for (let i = 0; i < 4; i++) {
        let x = margin + i * spacingX;
        let y = margin + i * spacingY;
        p.text(x, x, margin);
        p.text(y, margin, y);
    }
}

let updateCanvas = 1;

//************** DRAW ELEMENTS //**************

export function drawBackground(p) {
    if (updateCanvas > 0) {
        updateCanvas = 1
        let bg = [p.backgroundColor[0],p.backgroundColor[1],p.backgroundColor[2]]
        //console.log(...bg)
        p.background(...bg);
    }
}

p5.prototype.drawBackground = function () {
    drawBackground(this);
};

export function drawElements(p) {
    if (updateCanvas > 0) {
        updateCanvas = 1
        //drawGrid(p);
        for (let element of Object.values(p.elements)) {
            if (typeof (element) === "string") {
                //when would this be called?
                eval(element);
            }
            else {
                //draw gui elements
                element.draw();
            }
        }
    }
}

p5.prototype.drawElements = function () {
    drawElements(this);
};

const scaleOutput = function (input, inLow, inHigh, outLow, outHigh, curve) {
    if (curve === undefined) curve = 1;
    let val = (input - inLow) * (1 / (inHigh - inLow));
    val = Math.pow(val, curve);
    return val * (outHigh - outLow) + outLow;
}

const unScaleOutput = function (input, outLow, outHigh, inLow, inHigh, curve) {
    if (curve === undefined) curve = 1;
    else curve = 1 / curve;
    let val = (input - inLow) * (1 / (inHigh - inLow));
    val = Math.pow(val, curve);
    return val * (outHigh - outLow) + outLow;
}

/*
 * returns an element by querying its id
 * - the id of an element is unique
 * - multiple elements with the same label are id as label, label1, etc.
*/
// Function to retrieve an element by its label
const getElementByLabel = (p, label) => {
    const elementArray = Object.values(p.elements);
    for (const element of elementArray) {
        console.log(element.id)
        if (element.id === label) {
            return element;
        }
    }
    return null; // Return null if no matching element is found
};

p5.prototype.getElementByLabel = function (label) {
    getElementByLabel(this, label);
};



/********************** COLORS & FONTS ***********************/
export const setColor = function (name, value) {
    if (name === 'border') activeTheme.borderColor = value
    else if (name === 'accent') activeTheme.accentColor = value
    else if (name === 'background') {
        activeTheme.backgroundColor = value
    }
    else if (name === 'text') activeTheme.textColor = value

    else if (typeof (name) === 'string' && Array.isArray(value)) {
        if (value.length = 3) {
            activeTheme[name] = value;
            console.error(`new Color added: ${name}`);
        } else console.error('second argument must be an array of three values in RGB format')
    }
    else console.error(`incorrect color values: ${name}, ${value} `)
}

const getColor = function (p,name) {
    
    if (name === 'border') return activeTheme.borderColor
    if (name === 'accent') return activeTheme.accentColor
    if (name === 'background') { 
        let bg = [p.backgroundColor[0],p.backgroundColor[1],p.backgroundColor[2]]
        return  bg
    }
    if (name === 'text') return activeTheme.textColor
    //console.log(name)
    if (Array.isArray(name)) {
        return name
    } else {
        console.error(`Invalid color property: ${name}`);
        return [0, 0, 0]
    }
}

export const GuiFonts = {
    label: 'Helvetica',
    value: 'Courier',
    text: 'Times New Roman',
    title: 'Verdana',
};

export const setFont = function (name, value) {
    if (name === 'label') activeTheme.labelFont = value
    else if (name === 'value') activeTheme.valueFont = value
    else if (name === 'text') activeTheme.mainFont = value
    else if (name === 'title') activeTheme.titleFont = value

    else if (typeof (name) === 'string' && typeof (value) === 'string') {
        activeTheme[name] = value;
        console.error(`new Font added: ${name}`);
    }
    else console.error(`incorrect font values: ${name}, ${value} `)
}

const getFont = function (name) {
    if (name === 'label') return activeTheme.labelFont
    if (name === 'value') return activeTheme.valueFont
    if (name === 'text') return activeTheme.mainFont
    if (name === 'title') return activeTheme.titleFont

    if (typeof (name) === 'string') {
        return name
    } else {
        console.error(`Invalid font property: ${name}`);
        return 'Geneva'
    }
}

/**************************************** ELEMENT ******************************************/
let elementXPosition = 0;
let elementYPosition = 25;
let prevElementSize = 0;
let prevYElementSize = 0;
class Element {
    constructor(p, options) {
        this.p = p;
        this.ch = window.chClient;
        //console.log(this.ch)
        this.theme = activeTheme;
        this.label = options.label || "myElement";
        this.id = this.label;
        this.hide = false;
        let i = 1;
        while (this.id in p.elements) {
            this.id += i;
            i++;
        }
        //appearance
        this.style = options.style || 1;
        this.size = options.size || 1;
        this.textSize = options.textSize || 1;
        this.border = options.border || 'theme' || 6;
        this.borderColor = options.borderColor || 'border';
        this.accentColor = options.accentColor || 'accent';
        this.borderRadius = options.borderRadius || activeTheme.borderRadius || 0;

        //text
        this.textColor = options.textColor || 'text';
        this.showLabel = typeof (options.showLabel) === 'undefined' ? true : options.showLabel; //|| activeTheme.showLabel
        this.showValue = typeof (options.showValue) === 'undefined' ? true : options.showValue; //|| activeTheme.showValue
        this.labelFont = options.labelFont || 'label'
        this.valueFont = options.valueFont || 'value'
        this.mainFont = options.mainFont || 'text'
        this.labelX = options.labelX || 0
        this.labelY = options.labelY || 0
        this.valueX = options.valueX || 0
        this.valueY = options.valueY || 0
        this.textX = options.textX || 0
        this.textY = options.textY || 0

        //position
        let currentGap = (prevElementSize + this.size) / 2
        elementXPosition += (8 * currentGap + 5);
        if (elementXPosition > (100 - this.size * 8)) {
            elementXPosition = this.size / 2 * 8 + 5
            elementYPosition += (20 * prevYElementSize + 10)
            prevYElementSize = this.size
        }
        this.x = options.x || elementXPosition;
        this.y = options.y || elementYPosition;
        prevElementSize = this.size
        prevYElementSize = this.size > prevYElementSize ? this.size : prevYElementSize;
        this.cur_x = (this.x / 100) * this.p.width
        this.cur_y = (this.y / 100) * this.p.height
        this.cur_size = (this.size / 6) * this.p.width
        this.x_box = this.cur_size;
        this.y_box = this.cur_size;

        //parameter values
        this.active = 0;
        this.isInteger = options.isInteger || false;
        this.min = options.min || 0;
        this.max = options.max || 1;
        this.curve = options.curve || 1;
        if (typeof (options.mapto) == 'string') this.mapto = eval(options.mapto)
        else this.mapto = options.mapto || null;
        this.callback = options.callback || null;
        if (this.mapto || this.callback) this.maptoDefined = 'true'
        else this.maptoDefined = 'false'
        this.value = options.value != undefined ? options.value : scaleOutput(0.5, 0, 1, this.min, this.max, this.curve);
        this.prevValue = this.value
        this.rawValue = unScaleOutput(this.value, 0, 1, this.min, this.max, this.curve);
        p.elements[this.id] = this;

        //collab-hub sharing values
        this.linkName = typeof options.link === 'string' ? options.link : null; // share params iff link is defined
        this.linkFunc = typeof options.link === 'function' ? options.link : null;

        // set listener for updates from collab-hub (for linkName only)
        if (this.linkName) {
            this.ch.on(this.linkName, (incoming) => {
                this.forceSet(incoming.values);
            })
        }

        this.mapValue(this.value, this.mapto);
        this.runCallBack()
    }

    setLink(name){
        //collab-hub sharing values
        this.linkName = typeof name === 'string' ? name : null; // share params iff link is defined
        this.linkFunc = typeof name === 'function' ? name : null;
        console.log('set element linkName to ', this.linkName)
        // set listener for updates from collab-hub (for linkName only)
        if (this.linkName) {
            this.ch.on(this.linkName, (incoming) => {
                this.forceSet(incoming.values);
            })
        }
    }

    getParam(param, val) { return val === 'theme' ? activeTheme[param] : val }

    isPressed() {
        if (this.hide === true) return;
        //console.log('isPressed', this.label, this.p.mouseX,this.cur_x , this.p.mouseY, this.cur_y);
        if (this.p.mouseX < (this.cur_x + this.x_box / 2) &&
            this.p.mouseX > (this.cur_x - this.x_box / 2) &&
            this.p.mouseY > (this.cur_y - this.y_box / 2) &&
            this.p.mouseY < (this.cur_y + this.y_box / 2)) {
            this.active = 1
            //console.log('pressedas', this.label, this.p.mouseX.toFixed(1), this.p.mouseY.toFixed(1), this.cur_x.toFixed(1), this.cur_y.toFixed(1), this.x_box, this.y_box)
            //console.log(this.p.width, this.p.height)
        }
    }

    isReleased() {
        if (this.hide === true) return;
        if (this.active === 1) this.active = 0
    }

    resize(scaleWidth, scaleHeight) {
        // Keep element positions as percentages; cur_x/cur_y are derived during draw.
        // Base resize intentionally does nothing so subclasses can scale visual size only.
    }

    drawLabel(x, y) {
        this.p.textSize(this.textSize * 10 * this.p.width / 600);
        this.p.stroke(this.setColor(this.textColor))
        this.p.strokeWeight(0.00001 * this.textSize * 20 * this.p.width/600);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.fill(this.setColor(this.textColor));
        this.p.textFont(getFont(this.labelFont))
        this.p.text(this.label, x + (this.labelX / 100) * this.p.width, y + (this.labelY / 100) * this.p.height);
    }

    drawValue(x, y) {
        try{
            let output = this.value
            //console.log(this.value,x,y)
            this.p.stroke(this.setColor(this.textColor))
            this.p.textSize(this.textSize * 10 * this.p.width/600);
            this.p.strokeWeight(0.00001 * this.textSize * 20);
            this.p.textAlign(this.p.CENTER, this.p.CENTER);
            this.p.fill(this.setColor(this.textColor));
            this.p.textFont(getFont(this.valueFont))
            if(this.isInteger) output = output.toFixed(0)
            else{
                if (Math.abs(this.max) < 1) output = output.toFixed(3)
                else if (Math.abs(this.max) < 5) output = output.toFixed(2)
                else if (Math.abs(this.max) < 100) output = output.toFixed(1)
                else output = output.toFixed(1)
            }
            this.p.text(output, x + (this.valueX / 100) * this.p.width, y + (this.valueY / 100) * this.p.height);
        } catch(e){}
    }

    drawText(text, x, y) {
        this.p.textSize(this.textSize * 10 * this.p.width/600);
        this.p.stroke(this.setColor(this.textColor))
        this.p.strokeWeight(0.00001 * this.textSize * 20);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.fill(getColor(this.p,this.textColor));
        this.p.textFont(getFont(this.mainFont))
        this.p.text(text, x + (this.textX / 100) * this.p.width, y + (this.textY / 100) * this.p.height);
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    setColor(arg) {
        if (typeof (arg) === 'string') {
            return getColor(this.p,arg)
        }
        else if (Array.isArray(arg)) {
            if (arg.length === 3) return arg
        }
        console.log(this.label, typeof (arg), 'invalid color')
        return [0, 0, 0]
    }

    mapValue(output, destination) {
        //console.log(output, destination)
        if(this.isInteger) {
            output = Math.floor(output)
            if(output === this.prevValue) return
        }
        if (destination) {
            try {
                destination.value.rampTo(output, .1);
            } catch {
                try {
                    destination.value = output;
                } catch {
                    try {
                        //console.log(destination, output)
                        destination = output;
                    } catch (error) {
                        console.log('Error setting Mapto to value: ', error);
                    }
                }
            }
        } //else if (this.maptoDefined === 'false') { console.log(this.label, 'no destination defined') }
    }

    runCallBack() {
        //console.log(this.value, this.callback)
        if (this.callback) {
            let output = this.value
            if(this.isInteger) {
                output = Math.floor(output)
                if(output === this.prevValue) return
            }
            try {
                this.callback(output);
            } catch {
                try {
                    this.callback();
                } catch (error) {
                    console.log('Error with Callback Function: ', error);
                }
            }
        } else if (this.maptoDefined === 'false') { console.log(this.label, 'no destination defined') }

        // send updates to collab-hub
        if (this.sendName) {
            this.ch.control(this.sendName, this.value);
        }
    }

    set(value) {
        //console.log(value)
        if (typeof (value) === 'string') {
            this.value = value;
        } 
        else {
            this.value = value
            this.rawValue = unScaleOutput(value, 0, 1, this.min, this.max, this.curve);
            this.mapValue(this.value, this.mapto);
        }

        this.runCallBack()

        // send updates to collab-hub
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) {
            this.linkFunc();
        }
    }

    forceSet(value) {
        // sets value without sending data to collab-hub
        if (typeof (value) === 'string') {
            this.value = value;
        }
        else {
            this.value = value;
            if(!Array.isArray(this.value)) this.rawValue = unScaleOutput(value, 0, 1, this.min, this.max, this.curve);
            if(!Array.isArray(this.value)) this.mapValue(this.value, this.mapto);
        }

        this.runCallBack();
    }
    ccSet(value){
        // sets value without sending data to collab-hub
        if (typeof (value) === 'string') {
            this.value = value;
        }
        else {
            this.value = value;
            this.rawValue = unScaleOutput(value, 0, 1, this.min, this.max, this.curve);
            //this.mapValue(this.value, this.mapto);
        }

        //this.runCallBack();
    }
}

/**************************************** KNOB ******************************************/
export class Knob extends Element {
    constructor(p, options) {
        super(p, options);
        this.incr = options.incr || 0.01;
        this.degrees = options.degrees || 320;
        this.startAngle = this.p.PI * (4 / 8 + (360 - this.degrees) / 360);
        this.endAngle = this.p.PI * (4 / 8 - (360 - this.degrees) / 360) + 2 * this.p.PI;

        // send initial val to collab-hub
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) this.linkFunc();
    }

    resize(scaleWidth, scaleHeight) {
        super.resize(scaleWidth, scaleHeight);
        if (Math.max(Math.abs(1 - scaleWidth)) > Math.max(Math.abs(1 - scaleHeight))) this.size *= scaleWidth;
        else this.size *= scaleHeight;
    }

    draw() {
        //console.log(this.rawValue)
        if (this.hide === true) return;
        // Calculate the angle based on the knob's value
        this.startAngle = this.p.PI * (4 / 8 + (360 - this.degrees) / 360);
        this.endAngle = this.p.PI * (4 / 8 - (360 - this.degrees) / 360) + 2 * this.p.PI;
        let angle = this.p.map(this.rawValue, 0, 1, 0, this.endAngle - this.startAngle);

        this.cur_x = (this.x / 100) * this.p.width
        this.cur_y = (this.y / 100) * this.p.height
        this.cur_size = (this.size / 6) * this.p.width / 2
        this.x_box = this.cur_size
        this.y_box = (this.size / 6) * this.p.height
        this.y_box = this.y_box >20 ? this.y_box : 20
        let border = this.getParam('border', this.border)

        // clear the previously drawn knob
        // this.p.fill(p,getColor('background'));
        // let  strokeWeight = this.border;
        // this.p.strokeWeight(strokeWeight);
        // this.p.stroke(getColor(p,'background'));
        // this.p.arc(cur_x, cur_y, cur_size*1.2, cur_size*1.2,0,2*this.p.PI);

        // Display the label string beneath the knob
        this.p.textSize(this.textSize * 10 * this.p.width/600);
        let textWidthValue = this.p.textWidth(this.label);
        let textHeightValue = this.p.textAscent() + this.p.textDescent();
        if (this.showLabel) this.drawLabel(this.cur_x, this.cur_y + this.cur_size / 2 + textHeightValue * .5)
        if (this.showValue) this.drawValue(this.cur_x, this.cur_y + this.cur_size / 2 + textHeightValue * (this.showLabel ? 1.5 : .5))

        // Draw the inactive knob background
        this.p.noFill();
        this.p.strokeWeight(border);
        this.p.stroke(this.setColor(this.borderColor))
        this.p.arc(this.cur_x, this.cur_y, this.cur_size, this.cur_size, this.p.constrain(this.startAngle + angle + (border / 30 / this.size / 2), this.startAngle, this.endAngle), this.endAngle);

        // Draw the active knob background
        this.p.stroke(this.setColor(this.accentColor));
        this.p.arc(this.cur_x, this.cur_y, this.cur_size, this.cur_size, this.startAngle, this.p.constrain(this.startAngle + angle - (border / 30 / this.size / 2), this.startAngle, this.endAngle));

        // Draw the knob value indicator as a line
        let indicatorLength = this.cur_size / 2 // Length of the indicator line
        let indicatorX = this.cur_x + this.p.cos(this.startAngle + angle) * indicatorLength;
        let indicatorY = this.cur_y + this.p.sin(this.startAngle + angle) * indicatorLength;
        this.p.stroke(this.setColor(this.accentColor));
        this.p.line(this.cur_x, this.cur_y, indicatorX, indicatorY);
    }

    isDragged() {
        if (this.hide === true) return;
        if (this.active) {

            if (this.p.movedY != 0) {
                if (this.p.keyIsDown(this.p.ALT)) this.rawValue -= this.p.movedY * this.incr / 10;
                else this.rawValue -= this.p.movedY * this.incr;
            }

            if (this.rawValue > 1) this.rawValue = 1
            if (this.rawValue < 0) this.rawValue = 0
            this.value = scaleOutput(this.rawValue, 0, 1, this.min, this.max, this.curve)
            this.mapValue(this.value, this.mapto);

            this.runCallBack()
            //console.log('knob', this.linkName)
            // send updates to collab-hub
            if (this.linkName) {
                //console.log('link')
                this.ch.control(this.linkName, this.value);
            }
            if (this.linkFunc) this.linkFunc();

            let output = this.value
            if(this.isInteger) {
                output = Math.floor(output)
                if(output === this.prevValue) return
            }
            this.prevValue = output
        }
    }
}

p5.prototype.Knob = function (options = {}) {
    return new Knob(this, options);
};

p5.prototype.Dial = function (options = {}) {
    return new Knob(this, options);
};

/**************************************** FADER ******************************************/
export class Fader extends Element {
    constructor(p, options) {
        super(p, options);
        this.incr = options.incr || 0.01;
        this.orientation = options.orientation === 'horizontal' ? 'horizontal' : 'vertical';
        this.isHorizontal = this.orientation === 'horizontal'
        this.value = this.value || 0.5
        this.dragging = false;
        this.size = options.size || 1

        // send initial val to collab-hub
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) this.linkFunc();
    }

    resize(scaleWidth, scaleHeight) {
        super.resize(scaleWidth, scaleHeight);
        this.size *= this.isHorizontal ? scaleWidth : scaleHeight;
    }

    draw() {
        if (this.hide === true) return;
        this.isHorizontal = this.orientation === 'horizontal'
        this.cur_size = (this.size / 6) * this.p.width / 2
        let border = this.getParam('border', this.border)

        let x_corner = (this.x / 100) * this.p.width
        let y_corner = (this.y / 100) * this.p.height
        if (this.isHorizontal) {
            this.x_box = this.cur_size
            this.y_box = border * 3 * this.size
            this.cur_x = (this.x / 100) * this.p.width + this.cur_size / 2
            this.cur_y = (this.y / 100) * this.p.height + border
        }
        else {
            this.y_box = this.cur_size
            this.x_box = border * 3 * this.size
            this.cur_x = (this.x / 100) * this.p.width + border
            this.cur_y = (this.y / 100) * this.p.height + this.cur_size / 2
        }
        let strokeWeight = border * this.size;
        this.thickness = border // cur_size * .1; //Indicator thickness
        let rectThickness = this.thickness * .95;

        // Display the label and value strings
        this.p.textSize(this.textSize * 10 * this.p.width/600);
        let textWidthValue = this.p.textWidth(this.label);
        let textHeightValue = this.p.textAscent() + this.p.textDescent();
        let curTextY = this.isHorizontal ? this.cur_y + border * 2 + textHeightValue * .5 : this.cur_y + this.cur_size / 2 + border + textHeightValue * .5
        if (this.showLabel) this.drawLabel(this.cur_x, curTextY)
        if (this.showValue) this.drawValue(this.cur_x, curTextY + (this.showLabel ? 1 : 0) * textHeightValue)
        //console.log('fader', this.cur_x, curTextY)

        //Display Actual Fader
        this.p.noFill();
        this.p.stroke(this.setColor(this.borderColor))
        this.p.strokeWeight(border * 1.5);
        if (this.isHorizontal) this.p.rect(x_corner, y_corner, this.cur_size, border * 2);
        else this.p.rect(x_corner, y_corner, border * 2, this.cur_size);
        // this.p.stroke(p,getColor(this.accentColor))
        // if (this.isHorizontal) this.p.rect(this.cur_x, this.cur_y, this.cur_size, border);
        // else this.p.rect(this.cur_x, this.cur_y, rectThickness, this.cur_size);

        //Clear beneath Display Indicator
        this.p.fill( getColor(this.p, 'background'))
        this.p.stroke(this.setColor('background'))
        this.pos = this.p.map(this.rawValue, 0, 1, this.isHorizontal ? x_corner : y_corner + this.cur_size - this.thickness, this.isHorizontal ? x_corner + this.cur_size - this.thickness : y_corner);
        let clearSize = border * .25
        if (this.isHorizontal) this.p.rect(this.pos - clearSize, y_corner, this.thickness + clearSize * 2, this.thickness * 2);
        else this.p.rect(x_corner, this.pos - clearSize, this.thickness * 2, this.thickness + clearSize * 2);
        //Display indicator
        this.p.fill(this.setColor(this.accentColor));
        this.p.stroke(this.setColor(this.accentColor))
        this.pos = this.p.map(this.rawValue, 0, 1, this.isHorizontal ? x_corner : y_corner + this.cur_size - this.thickness, this.isHorizontal ? x_corner + this.cur_size - this.thickness : y_corner);
        if (this.isHorizontal) this.p.rect(this.pos, y_corner, this.thickness, this.thickness * 2);
        else this.p.rect(x_corner, this.pos, this.thickness * 2, this.thickness);
    }

    isDragged() {
        if (this.hide === true) return;
        if (this.active) {
            if (this.isHorizontal) {
                if (this.p.movedX !== 0) {
                    if (this.p.keyIsDown(this.p.ALT)) this.rawValue += this.p.movedX * this.incr / 10;
                    else this.rawValue += this.p.movedX * this.incr / this.size;
                }
            }
            else {
                if (this.p.movedY !== 0) {
                    if (this.p.keyIsDown(this.p.ALT)) this.rawValue -= this.p.movedY * this.incr / 10;
                    else this.rawValue -= this.p.movedY * this.incr / this.size;
                }
            }
            if (this.rawValue > 1) this.rawValue = 1
            if (this.rawValue < 0) this.rawValue = 0
            this.value = scaleOutput(this.rawValue, 0, 1, this.min, this.max, this.curve)
            this.mapValue(this.value, this.mapto);

            this.runCallBack()

            // send updates to collab-hub
            if (this.linkName) {
                this.ch.control(this.linkName, this.value);
            }
            if (this.linkFunc) this.linkFunc();
        }
    }
}

p5.prototype.Fader = function (options = {}) {
    return new Fader(this, options);
};

p5.prototype.Slider = function (options = {}) {
    return new Fader(this, options);
};

/**************************************** PAD ******************************************/
// This is fixed now - value is an array [x,y]

export class Pad extends Element {
    constructor(p, options) {
        super(p, options);
        this.incr = options.incr || 0.01;
        this.value = options.value || [0.5,0.5]
        this.rawValue = options.value || [0.5,0.5]
        this.dragging = false;
        this.sizeX = options.sizeX || options.size || 5
        this.sizeY = options.sizeY || options.size || 5
        this.labelX = 0
        this.labelY = 0
        // if (typeof (options.mapto) == 'string') this.mapto = eval(options.mapto)
        // else this.mapto = options.mapto || null;
        // if (typeof (options.maptoY) == 'string') this.maptoY = eval(options.maptoY)
        // else this.maptoY = options.maptoY || null;

        // send initial val to collab-hub
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) this.linkFunc();

        //console.log('pad', this.value, this.rawValue)
    }

    resize(scaleWidth, scaleHeight) {
        super.resize(scaleWidth, scaleHeight);
        //this.size *= this.isHorizontal ? scaleWidth : scaleHeight;
    }

    draw() {
        if (this.hide === true) return;
        this.cur_size = (this.size / 6) * this.p.width / 2
        this.cur_sizeX = (this.sizeX / 6) * this.p.width / 2
        this.cur_sizeY = (this.sizeY / 6) * this.p.width / 2
        let border = this.getParam('border', this.border)

        let x_corner = (this.x / 100) * this.p.width - this.cur_sizeX / 2
        let y_corner = (this.y / 100) * this.p.height - this.cur_sizeY / 2

        this.x_box = this.cur_sizeX * 2
        this.y_box = this.cur_sizeY * 2
        this.cur_x = (this.x / 100) * this.p.width //+ this.cur_sizeX/2
        this.cur_y = (this.y / 100) * this.p.height //+ this.cur_sizeY/2

        //console.log(this.cur_x, this.cur_y, this.x_box,this.y_box)

        let strokeWeight = border
        this.thickness = border // cur_size * .1; //Indicator thickness
        let rectThickness = this.thickness * .95;

        //Display Pad
        this.p.fill(this.setColor(this.borderColor));
        this.p.stroke(this.setColor(this.borderColor))
        this.p.strokeWeight(border * 1.5);
        this.p.rect(x_corner, y_corner, this.cur_sizeX, this.cur_sizeY);

        //Display indicator
        this.p.fill(this.setColor(this.accentColor));
        this.p.stroke(this.setColor(this.accentColor))
        let indicatorX = x_corner + this.rawValue[0] * (this.cur_sizeX - 0 * border)
        let indicatorY = y_corner + this.rawValue[1] * (this.cur_sizeY - 0 * border)
        //this.pos = this.p.map(this.value, 0,1,  x_corner  + this.cur_size - this.thickness, this.isHorizontal ? x_corner + this.cur_size - this.thickness : y_corner);
        this.p.circle(indicatorX, indicatorY, (this.cur_sizeX + this.cur_sizeY) / 30)


        // Display the label and values
        // let textHeightValue = this.p.textAscent() + this.p.textDescent();
        // if (this.showLabel) this.drawLabel(this.cur_x, this.cur_y - this.cur_sizeY / 2 - textHeightValue)

        // Display the label and value strings
        this.p.textSize(this.textSize * 10 * this.p.width/600);
        let textWidthValue = this.p.textWidth(this.label);
        let textHeightValue = this.p.textAscent() + this.p.textDescent();

        let curTextY = this.cur_y + this.cur_sizeY/2  + textHeightValue * 1 
        if (this.showLabel) this.drawLabel(this.cur_x , curTextY)
        //console.log(this.showLabel, this.cur_x+ this.textX, curTextY+ this.textY)
        //if (this.showValue) this.drawValue(this.cur_x, curTextY + (this.showLabel ? 1 : 0) * textHeightValue)
 
    }

    isDragged() {
        if (this.hide === true) return;
        if (this.active) {
            if( !Array.isArray(this.value)) this.value = [0,0]
            
            if (this.p.movedX !== 0) {
                if (this.p.keyIsDown(this.p.ALT)) this.rawValue[0] += this.p.movedX * this.incr / 10;
                else this.rawValue[0] += this.p.movedX * this.incr / this.sizeX;
            }

            if (this.p.movedY !== 0) {
                if (this.p.keyIsDown(this.p.ALT)) this.rawValue[1] += this.p.movedY * this.incr / 10;
                else this.rawValue[1] += this.p.movedY * this.incr / this.sizeY;
            }

            if (this.rawValue[0] > 1) this.rawValue[0] = 1
            if (this.rawValue[0] < 0) this.rawValue[0] = 0
            //console.log(this.rawValue, this.value)
            this.value[0] = scaleOutput(this.rawValue[0], 0, 1, this.min, this.max, this.curve)
            
            //this.mapValue(this.value[0], this.maptoX);

            if (this.rawValue[1] > 1) this.rawValue[1] = 1
            if (this.rawValue[1] < 0) this.rawValue[1] = 0
            this.value[1] = scaleOutput(this.rawValue[1], 0, 1, this.min, this.max, this.curve)
            //this.mapValue(this.value[1], this.maptoY);
            //console.log(this.value, this.mapto)
            this.mapValue(this.value, this.mapto);
            this.runCallBack()

            // send updates to collab-hub
            if (this.linkName) {
                this.ch.control(this.linkName, this.value);
            }
            if (this.linkFunc) this.linkFunc();
        }
    }



}

p5.prototype.Pad = function (options = {}) {
    return new Pad(this, options);
};

p5.prototype.JoyStick = function (options = {}) {
    return new Pad(this, options);
};

/**************************************** BUTTON ******************************************/
export class Button extends Element {
    constructor(p, options) {
        super(p, options);
        this.value = options.value || 0
        this.rawValue = this.value
        this.cornerRadius = options.cornerRadius || 1

        // send initial val to collab-hub
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) this.linkFunc();
    }

    resize(scaleWidth, scaleHeight) {
        super.resize(scaleWidth, scaleHeight)
        const useWidth = Math.abs(1 - scaleWidth) >= Math.abs(1 - scaleHeight);
        this.size *= useWidth ? scaleWidth : scaleHeight;
    }

    draw() {
        if (this.hide === true) return;
        this.cur_x = (this.x / 100) * this.p.width
        this.cur_y = (this.y / 100) * this.p.height
        this.cur_size = (this.size / 6) * this.p.width / 2
        this.x_box = this.cur_size
        this.y_box = this.cur_size
        let border = this.getParam('border', this.border)

        if (this.rawValue) {
            this.p.fill(this.setColor(this.accentColor))
            this.p.stroke(this.setColor(this.borderColor));
            this.p.strokeWeight(border / 2);
            this.p.rect(this.cur_x - this.cur_size / 2, this.cur_y - this.cur_size / 2, this.cur_size, this.cur_size, this.cur_size / 2 * this.cornerRadius);
        }
        else {
            this.p.noFill()
            this.p.stroke(this.setColor(this.borderColor));
            this.p.strokeWeight(border / 2);
            this.p.rect(this.cur_x - this.cur_size / 2, this.cur_y - this.cur_size / 2, this.cur_size, this.cur_size, this.cur_size / 2 * this.cornerRadius);
        }

        // Display the label string inside the button
        if (this.showLabel) this.drawLabel(this.cur_x, this.cur_y)//if(this.showValue) this.drawValue(this.cur_x, this.cur_y+6*(2+this.size*2.5) )
    }

    isPressed() {
        if (this.hide === true) return;
        if (this.p.mouseX < (this.cur_x + this.x_box / 2) &&
            this.p.mouseX > (this.cur_x - this.x_box / 2) &&
            this.p.mouseY > (this.cur_y - this.y_box / 2) &&
            this.p.mouseY < (this.cur_y + this.y_box / 2)) {
            this.active = 1
            // Calculate the value
            let newValue = scaleOutput(1, 0, 1, this.min, this.max, this.curve);
            // Use the set method to update the value and trigger all necessary actions
            //console.log('Button isPressed - calling set() with value:', newValue);
            this.set(newValue);
            if (this.maptoDefined === 'false') postButtonError('Buttons')

        }
    }

    isReleased() {
        if (this.hide === true) return;
        if (this.active === 1) {
            this.active = 0
            // Calculate the value
            let newValue = scaleOutput(0, 0, 1, this.min, this.max, this.curve);
            // Use the set method to update the value and trigger all necessary actions
            console.log('Button isReleased - calling set() with value:', newValue);
            this.set(newValue);
        }
    }

    forceSet(value) {
        // sets value without sending data to collab-hub
        if (value) {
            this.active = 1
            this.rawValue = 1
            this.value = scaleOutput(this.rawValue, 0, 1, this.min, this.max, this.curve)
            this.mapValue(this.value, this.mapto);

            this.runCallBack();
            if (this.maptoDefined === 'false') postButtonError('Buttons')

        } else {
            this.active = 0
            this.rawValue = 0
            this.value = scaleOutput(this.rawValue, 0, 1, this.min, this.max, this.curve)
        }
    }
}

p5.prototype.Button = function (options = {}) {
    return new Button(this, options);
};

function postButtonError(name) {
    if (name === 'Buttons') console.log(name + ' generally work by defining a callback function. For buttons, the value is 1 on every press.')
    if (name === 'Toggle buttons') console.log(name + ' generally work by defining a callback function. The value for toggle buttons alternates between 1 and 0.')
    if (name === 'RadioButtons') console.log(name + ' generally work by defining a callback function. The value for radio buttons is the text string of the selected button.')

    if (name === 'Buttons') console.log(`An example of defining a callback for a button is: 
callback: function(val){ env.triggerAttackRelease(0.1) }`)
    if (name === 'Toggle buttons') console.log(`An example of defining a callback for a toggle is: 
callback: function(val){ 
    if(val==1) vco.type = 'square'; 
    else vco.type = 'sawtooth'; 
}`)
    if (name === 'RadioButtons') console.log(`An example of defining a callback for a radio button is: 
callback: function(val){ vco.type = val }`)
}

/**************************************** MOMENTARY ******************************************/
export class Momentary extends Button {
    constructor(p, options) {
        super(p, options);
        this.value = options.value || 0
        this.rawValue = this.value
    }

    isReleased() {
        if (this.hide === true) return;
        if (this.active === 1) {
            this.active = 0
            this.rawValue = 0
            this.value = scaleOutput(this.rawValue, 0, 1, this.min, this.max, this.curve)
            this.mapValue(this.value, this.mapto);
            this.runCallBack();
        }
    }
}

p5.prototype.Momentary = function (options = {}) {
    return new Momentary(this, options);
};

/**************************************** TOGGLE ******************************************/
export class Toggle extends Button {
    constructor(p, options) {
        super(p, options);
        this.state = options.state || false;

        // send initial val to collab-hub
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) this.linkFunc();
    }

    isPressed() {
        if (this.hide === true) return;
        if (this.p.mouseX < (this.cur_x + this.x_box / 2) &&
            this.p.mouseX > (this.cur_x - this.x_box / 2) &&
            this.p.mouseY > (this.cur_y - this.y_box / 2) &&
            this.p.mouseY < (this.cur_y + this.y_box / 2)) {
            this.active = 1
            this.rawValue = this.rawValue ? 0 : 1
            this.value = scaleOutput(this.rawValue, 0, 1, this.min, this.max, this.curve)
            this.mapValue(this.value, this.mapto);
            this.runCallBack();
            if (this.maptoDefined === 'false') postButtonError('Toggle buttons')

            // send updates to collab-hub
            if (this.linkName) {
                this.ch.control(this.linkName, this.value);
            }
            if (this.linkFunc) this.linkFunc();
        }
    }

    isReleased() {
        if (this.hide === true) return;
        if (this.active === 1) {
            this.active = 0
        }
    }

    forceSet(value) {
        // sets value without sending data to collab-hub
        this.rawValue = value
        this.value = scaleOutput(this.rawValue, 0, 1, this.min, this.max, this.curve)
        this.mapValue(this.value, this.mapto);

        this.runCallBack();
        if (this.maptoDefined === 'false') postButtonError('Toggle buttons')
    }
}

p5.prototype.Toggle = function (options = {}) {
    return new Toggle(this, options);
};

/**************************************** RADIO BUTTON ******************************************/
export class RadioButton extends Button {
    constructor(p, options) {
        super(p, options);
        this.radioOptions = options.radioOptions || ['on', 'off'];
        this.orientation = options.orientation || 'vertical';
        this.isHorizontal = this.orientation === 'horizontal'
        this.value = options.value || this.radioOptions[0]; //default first radioOption
        this.radioHeight = this.cur_size / 2;
        this.radioWidth = this.cur_size * 2;
        this.border = options.border || activeTheme.radioBorder || 2

        // send initial val to collab-hub
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) this.linkFunc();
    }

    draw() {
        if (this.hide === true) return;
        this.radioClicked = {};

        this.isHorizontal = this.orientation === 'horizontal'
        this.cur_size = (this.size / 6) * this.p.width / 2

        this.radioHeight = this.cur_size / 2;
        this.radioWidth = this.cur_size * 2;
        let border = this.getParam('border', this.border)


        //calculate widest radioOption for radioButton width
        this.p.textSize(this.textSize * 10 * this.p.width / 600); 
        let textWidth = 0
        for (let i = 0; i < this.radioOptions.length; i++) {
            let width = this.p.textWidth(this.radioOptions[i]);
            if (width > textWidth) textWidth = width
        }
        this.cur_size = textWidth
        this.radioWidth = this.cur_size * 1.5;

        if (this.isHorizontal) {
            this.cur_x = (this.x / 100) * this.p.width
            this.cur_y = (this.y / 100) * this.p.height

            this.x_corner = this.cur_x - this.radioWidth * this.radioOptions.length / 2
            this.y_corner = this.cur_y - this.radioHeight / 2

            this.x_box = this.radioWidth * this.radioOptions.length
            this.y_box = this.radioHeight
        }
        else {
            this.cur_x = (this.x / 100) * this.p.width
            this.cur_y = (this.y / 100) * this.p.height

            this.x_corner = this.cur_x - this.radioWidth / 2
            this.y_corner = this.cur_y - this.radioHeight * this.radioOptions.length / 2

            this.y_box = this.radioHeight * this.radioOptions.length
            this.x_box = this.radioWidth
        }

        if (this.showLabel) this.drawLabel(this.cur_x,
            this.isHorizontal ? this.cur_y + this.radioHeight : this.cur_y + this.radioHeight * (this.radioOptions.length / 2 + 0.5)
        )

        for (let i = 0; i < this.radioOptions.length; i++) {
            let option = this.radioOptions[i];
            let x = this.isHorizontal ? this.x_corner + i * this.radioWidth : this.x_corner;
            let y = this.isHorizontal ? this.y_corner : this.y_corner + this.radioHeight * i;

            this.p.fill(this.value === option ? this.setColor(this.accentColor) : this.setColor(this.borderColor));
            this.p.stroke(0);
            this.p.strokeWeight(border);
            this.p.rect(x, y, this.radioWidth, this.radioHeight);

            this.drawText(option, x + this.radioWidth / 2, y + this.radioHeight / 2)
            this.radioClicked[this.radioOptions[i]] = () => {
                if (this.isHorizontal) return this.p.mouseX >= x && this.p.mouseX <= x + this.radioSize
                else return this.p.mouseY >= y && this.p.mouseY <= y + this.radioSize / 2
            };
        }
    }


    isPressed() {
        if (this.hide === true) {
            return;
        }

        if (this.p.mouseX < (this.cur_x + this.x_box / 2) &&
            this.p.mouseX > (this.cur_x - this.x_box / 2) &&
            this.p.mouseY > (this.cur_y - this.y_box / 2) &&
            this.p.mouseY < (this.cur_y + this.y_box / 2)) {

            let newValue;
            if (this.isHorizontal) {
                let position = (this.cur_x + this.x_box / 2) - this.p.mouseX;
                position = Math.floor(position / this.radioWidth);
                position = this.radioOptions.length - position - 1;
                newValue = this.radioOptions[position];
            } else {
                let position = (this.cur_y + this.y_box / 2) - this.p.mouseY;
                position = Math.floor(position / this.radioHeight);
                position = this.radioOptions.length - position - 1;
                newValue = this.radioOptions[position];
            }

            // Directly set the value to ensure it sticks
            this.value = newValue;
            this.active = 1;

            // Run the callback to trigger any associated actions
            this.runCallBack();
            //console.log('rb', this.value, this.linkName)

            // Send the update to collab-hub if needed
            if (this.linkName) {
                this.ch.control(this.linkName, this.value);
            }

            if (this.linkFunc) {
                this.linkFunc();
            }


            if (this.maptoDefined === 'false') postButtonError('RadioButtons');
        }
    }

    isReleased() {
        //so super isReleased not called
    }

    // Override forceSet to properly handle radio button values
    forceSet(value) {
        // Check if the value is one of the valid radio options
        if (this.radioOptions.includes(value)) {
            this.value = value;
            this.runCallBack();
        } else {
            // For numeric values (from CollabHub), try to map to a radio option
            if (typeof value === 'number' && value >= 0 && value < this.radioOptions.length) {
                this.value = this.radioOptions[value];
                this.runCallBack();
            }
        }
    }
}

p5.prototype.RadioButton = function (options = {}) {
    return new RadioButton(this, options);
};

p5.prototype.Radio = function (options = {}) {
    return new RadioButton(this, options);
};

/**************************************** DROPDOWN MENU ******************************************/

export class Dropdown extends Button {
    constructor(p, options) {
        super(p, options);
        this.dropdownOptions = options.dropdownOptions || ['on', 'off'];
        this.value = options.value || this.dropdownOptions[0]; // Default to the first dropdown option
        this.isOpen = false; // Track whether the dropdown is open
        this.cur_size = this.size || 30; // Increase the size for better readability
        this.border = options.border || activeTheme.radioBorder || 2;
        this.accentColor = options.accentColor || [200, 50, 0]; // Default accent color

        // Send initial value to collab-hub if linked
        if (this.linkName) {
            this.ch.control(this.linkName, this.value);
        }
        if (this.linkFunc) this.linkFunc();
    }

    draw() {
        if (this.hide === true) return;

        this.cur_x = (this.x / 100) * this.p.width;
        this.cur_y = (this.y / 100) * this.p.height;

        this.p.textSize(this.cur_size * 0.9 * this.p.width / 600); // Larger text size
        let textWidth = this.p.textWidth(this.value);
        this.boxWidth = Math.max(textWidth + 20, 100); // Ensure a minimum width for the dropdown
        this.boxHeight = this.cur_size;

        // Draw the main dropdown box
        this.p.fill(255); // Background color
        this.p.stroke(0); // Border color
        this.p.strokeWeight(this.border);
        this.p.rect(this.cur_x, this.cur_y, this.boxWidth, this.boxHeight);

        this.drawText(this.value, this.cur_x + this.boxWidth / 2, this.cur_y + this.boxHeight / 2);

        if (this.isOpen) {
            for (let i = 0; i < this.dropdownOptions.length; i++) {
                let option = this.dropdownOptions[i];
                let y = this.cur_y + (i + 1) * (this.boxHeight + 2); // Increase spacing between options

                if (this.value === option) {
                    this.p.fill(this.accentColor); // Selected option background
                } else {
                    this.p.fill(200); // Unselected option background color (light grey)
                }

                this.p.stroke(0);
                this.p.rect(this.cur_x, y, this.boxWidth, this.boxHeight);
                this.p.fill(0); // Text color
                this.drawText(option, this.cur_x + this.boxWidth / 2, y + this.boxHeight / 2);
            }
        }
    }

    isPressed() {
        if (this.hide === true) return;

        if (this.p.mouseX >= this.cur_x && this.p.mouseX <= this.cur_x + this.boxWidth &&
            this.p.mouseY >= this.cur_y && this.p.mouseY <= this.cur_y + this.boxHeight) {
            this.isOpen = !this.isOpen; // Toggle dropdown open/close state
        } else if (this.isOpen) {
            // Check if click is on one of the options
            for (let i = 0; i < this.dropdownOptions.length; i++) {
                let y = this.cur_y + (i + 1) * (this.boxHeight + 2); // Calculate the position of each option
                if (this.p.mouseX >= this.cur_x && this.p.mouseX <= this.cur_x + this.boxWidth &&
                    this.p.mouseY >= y && this.p.mouseY <= y + this.boxHeight) {
                    this.value = this.dropdownOptions[i];
                    this.isOpen = false;
                    this.runCallBack();
                    this.mapValue(this.value, this.mapto);
                    if (this.maptoDefined === 'false') postButtonError('Dropdown');

                    // Send updates to collab-hub if linked
                    if (this.linkName) {
                        this.ch.control(this.linkName, this.value);
                    }
                    if (this.linkFunc) this.linkFunc();
                    return; // Exit after selecting an option
                }
            }

            // Close dropdown if clicked outside
            this.isOpen = false;
        } else {
            this.isOpen = false; // Close dropdown if clicked outside
        }
    }

    isReleased() {
        // Override to prevent calling the superclass method
    }
}

p5.prototype.Dropdown = function (options = {}) {
    return new Dropdown(this, options);
};



/**************************************** LINES ******************************************/
export class Line extends Element {
    constructor(p, x1, y1, x2, y2, options) {
        super(p, options);
        this.x1 = x1 || 0
        this.x2 = x2 || 0
        this.y1 = y1 || 0
        this.y2 = y2 || 0
        this.showLabel = options.showLabel || 'false'
        this.border = options.border || 2
        this.color = options.color || activeTheme.lineColor || 'border'
    }

    resize(scaleWidth, scaleHeight) {
        super.resize(scaleWidth, scaleHeight)
        const useWidth = Math.abs(1 - scaleWidth) >= Math.abs(1 - scaleHeight);
        this.size *= useWidth ? scaleWidth : scaleHeight;
    }

    draw() {
        if (this.hide === true) return;
        let x1 = (this.x1 / 100) * this.p.width
        let x2 = (this.x2 / 100) * this.p.width
        let y1 = (this.y1 / 100) * this.p.height
        let y2 = (this.y2 / 100) * this.p.height
        let border = this.getParam('border', this.border)

        this.p.fill(this.setColor(this.color));
        this.p.stroke(this.setColor(this.color));
        this.p.strokeWeight(border * 2);
        this.p.line(x1, y1, x2, y2)
    }

    isPressed() { }
    pressed() { }
    isReleased() { }
}

p5.prototype.Line = function (x1, y1, x2, y2, options = {}) {
    return new Line(this, x1, y1, x2, y2, options);
};

/**************************************** TEXT ******************************************/
export class Text extends Element {
    constructor(p, options) {
        super(p, options);
        this.border = options.border || activeTheme['border'] || 0
        this.textSize = options.size || activeTheme['textSize'] || options.textSize || 1
    }

    resize(scaleWidth, scaleHeight) {
        super.resize(scaleWidth, scaleHeight)
        const useWidth = Math.abs(1 - scaleWidth) >= Math.abs(1 - scaleHeight);
        // For Text, scale the font size, not the widget size box
        this.textSize *= useWidth ? scaleWidth : scaleHeight;
    }

    draw() {
        if (this.hide === true) return;
        this.cur_x = (this.x / 100) * this.p.width
        this.cur_y = (this.y / 100) * this.p.height
        this.cur_size = (this.size / 6) * this.p.width / 2
        let border = this.getParam('border', this.border)
        let borderRadius = this.getParam('borderRadius', this.borderRadius)

        this.drawText(this.label, this.cur_x, this.cur_y)

        if (border > 0) {
            let textWidthValue = this.p.textWidth(this.label);
            let textHeightValue = this.p.textAscent() + this.p.textDescent();
            this.p.noFill()
            this.p.stroke(this.setColor(this.borderColor));
            this.p.strokeWeight(border);
            this.p.rect(this.cur_x - textWidthValue / 2 - 2 - borderRadius / 2, this.cur_y - textHeightValue / 2 - 1,
                textWidthValue + 4 + borderRadius, textHeightValue + 1,
                borderRadius, borderRadius)
        }
    }

    isPressed() { }
    pressed() { }
    isReleased() { }
}

p5.prototype.Text = function (options = {}) {
    return new Text(this, options);
};


