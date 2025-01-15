class Element {

    constructor(p, options) {
        this.ch = window.chClient;
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
        this.showLabel = typeof(options.showLabel) === 'undefined' ? true : options.showLabel; //|| activeTheme.showLabel
        this.showValue = typeof(options.showValue) === 'undefined' ? true : options.showValue; //|| activeTheme.showValue
        this.labelFont = options.labelFont || 'label'
        this.valueFont = options.valueFont || 'value'
        this.textFont = options.textFont || 'text'
        this.labelX = options.labelX || 0
        this.labelY = options.labelY || 0
        this.valueX = options.valueX || 0
        this.valueY = options.valueY || 0
        this.textX = options.textX || 0
        this.textY = options.textY || 0

        //position
        let currentGap = (prevElementSize+this.size) / 2
        elementXPosition+=(8*currentGap+5);
        if(elementXPosition>(100-this.size*8)){
            elementXPosition = this.size/2*8+5
            elementYPosition += (20*prevYElementSize+10)
            prevYElementSize=this.size
        }
        this.x = options.x || elementXPosition;
        this.y = options.y || elementYPosition;
        prevElementSize = this.size
        prevYElementSize = this.size>prevYElementSize ? this.size : prevYElementSize;
        this.cur_x = (this.x/100)*this.p.width
        this.cur_y = (this.y/100)*this.p.height
        this.cur_size = (this.size/6)*this.p.width
        this.x_box = this.cur_size;
        this.y_box = this.cur_size;

        //parameter values
        this.active = 0;
        this.min = options.min || 0;
        this.max = options.max || 1;
        this.curve = options.curve || 1;
        if(typeof(options.mapto)=='string') this.mapto = eval(options.mapto)
        else this.mapto = options.mapto || null;
        this.callback = options.callback || null;
        if( this.mapto || this.callback) this.maptoDefined = 'true'
        else this.maptoDefined = 'false'
        this.rawValue = unScaleOutput(options.value,0,1,this.min,this.max,this.curve) || 0.5;
        this.value = options.value || scaleOutput(0.5,0,1,this.min,this.max,this.curve);
        p.elements[this.id] = this;

        //collab-hub sharing values
        this.linkName = typeof options.link === 'string' ? options.link : null; // share params iff link is defined
        this.linkFunc = typeof options.link === 'function' ? options.link : null; 
        
        // set listener for updates from collab-hub (for linkName only)
        if (this.linkName) {
            this.ch.on(this.linkName, (incoming) => {
                this.forceSet(this.ch.getControl(this.linkName));
            })
        }

        this.mapValue(this.value, this.mapto);
        this.runCallBack()
    }

    getParam(param,val){ return val==='theme' ? activeTheme[param] : val}

    isPressed(){
        if(this.hide===true) return;
        //console.log('isPressed', this.label, this.p.mouseX,this.cur_x , this.x_box);
        if( this.p.mouseX < (this.cur_x + this.x_box/2) &&
            this.p.mouseX > (this.cur_x - this.x_box/2) &&
            this.p.mouseY > (this.cur_y - this.y_box/2) &&
            this.p.mouseY < (this.cur_y + this.y_box/2) )
        {
            this.active = 1
            //console.log('pressedas', this.label, this.p.mouseX.toFixed(1), this.p.mouseY.toFixed(1), this.cur_x.toFixed(1), this.cur_y.toFixed(1), this.x_box, this.y_box)
        }
    }

    isReleased(){
        if(this.hide===true) return;
        if( this.active===1 )  this.active = 0
    }

    resize(scaleWidth, scaleHeight) {
        this.x *= scaleWidth;
        this.y *= scaleHeight;
    }

    drawLabel(x,y){
        this.p.textSize(this.textSize*10);
        this.p.stroke(this.setColor(this.textColor))
        this.p.strokeWeight(0.00001 * this.textSize*20);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.fill(this.setColor(this.textColor));
        this.p.textFont(getFont(this.labelFont))
        this.p.text(this.label, x + (this.labelX/100)*this.p.width, y + (this.labelY/100)*this.p.height);
    }

    drawValue(x,y){
        let output = this.value
        this.p.stroke(this.setColor(this.textColor))
        this.p.textSize(this.textSize*10);
        this.p.strokeWeight(0.00001 * this.textSize*20);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.fill(this.setColor(this.textColor));
        this.p.textFont(getFont(this.valueFont))
        if(Math.abs(output) < 1) output = output.toFixed(4)
        else if(Math.abs(output) < 5) output = output.toFixed(3) 
        else if(Math.abs(output) < 100) output = output.toFixed(2) 
        else  output = output.toFixed(1)   
        this.p.text(output, x + (this.valueX/100)*this.p.width, y + (this.valueY/100)*this.p.height);
    }

    drawText(text,x,y){
        this.p.textSize(this.textSize*10);
        this.p.stroke(this.setColor(this.textColor))
        this.p.strokeWeight(0.00001 * this.textSize*20);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.fill(getColor(this.textColor));
        this.p.textFont(getFont(this.textFont))
        this.p.text(text, x + (this.textX/100)*this.p.width, y + (this.textY/100)*this.p.height);
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    setColor( arg ){
        if( typeof(arg)==='string'){
            return getColor( arg )
        }
        else if( Array.isArray(arg) ){
            if( arg.length===3) return arg
        } 
        console.log(this.label, typeof(arg), 'invalid color')
        return [0,0,0]
    }

    mapValue(output, destination) {
        if (destination) {
            try {
                destination.value.rampto(output, .1);
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
        } else if( this.maptoDefined==='false'){ console.log(this.label, 'no destination defined')}
    }

    runCallBack() {
        if (this.callback) {
            let output = this.value
            try {
                this.callback(output);
            } catch {
                try {
                    this.callback();
                } catch (error) {
                    console.log('Error with Callback Function: ', error);
                }
            }
        } else if( this.maptoDefined==='false'){ console.log(this.label, 'no destination defined')}

        // send updates to collab-hub
        if (this.sendName) { 
            this.ch.control(this.sendName, this.value);
        }
    }

    set(value){
        if(typeof(value) === 'string') this.value = value;
        else{
            this.value = value
            this.rawValue = unScaleOutput(value,0,1,this.min,this.max,this.curve);
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

    forceSet(value){
        // sets value without sending data to collab-hub
        if(typeof(value) === 'string') this.value = value;
        else{
            this.value = value
            this.rawValue = unScaleOutput(value,0,1,this.min,this.max,this.curve) || 0.5;
            this.mapValue(this.value, this.mapto);
        }

        this.runCallBack()
    }
}

/**************************************** KNOB ******************************************/
export class Knob extends Element {
    constructor(p, options) {
        super(p, options);
        this.incr = options.incr || 0.01;
        this.degrees = options.degrees || 320;
        this.startAngle = this.p.PI * (4/8 + (360 - this.degrees)/360);
        this.endAngle = this.p.PI * (4/8 - (360 - this.degrees)/360 ) + 2 * this.p.PI;

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
        if(this.hide===true) return;
        // Calculate the angle based on the knob's value
        this.startAngle = this.p.PI * (4/8 + (360 - this.degrees)/360);
        this.endAngle = this.p.PI * (4/8 - (360 - this.degrees)/360 ) + 2 * this.p.PI;
        let angle = this.p.map(this.rawValue, 0,1, 0, this.endAngle-this.startAngle);

        this.cur_x = (this.x/100)*this.p.width
        this.cur_y = (this.y/100)*this.p.height
        this.cur_size = (this.size/6)*this.p.width/2
        this.x_box = this.cur_size
        this.y_box = this.cur_size

        let border = this.getParam('border',this.border)

        // clear the previously drawn knob
        // this.p.fill(getColor('background'));
        // let  strokeWeight = this.border;
        // this.p.strokeWeight(strokeWeight);
        // this.p.stroke(getColor('background'));
        // this.p.arc(cur_x, cur_y, cur_size*1.2, cur_size*1.2,0,2*this.p.PI);

        // Display the label string beneath the knob
        this.p.textSize(this.textSize*10);
        let textWidthValue = this.p.textWidth(this.label);
        let textHeightValue = this.p.textAscent() + this.p.textDescent();
        if(this.showLabel) this.drawLabel(this.cur_x, this.cur_y + this.cur_size/2 + textHeightValue * .5 )
        if(this.showValue) this.drawValue(this.cur_x, this.cur_y + this.cur_size/2 + textHeightValue * (this.showLabel ? 1.5 : .5))

        // Draw the inactive knob background
        this.p.noFill();
        this.p.strokeWeight(border);
        this.p.stroke(this.setColor(this.borderColor))
        this.p.arc(this.cur_x, this.cur_y, this.cur_size, this.cur_size, this.p.constrain(this.startAngle + angle + (border/30/this.size/2),this.startAngle,this.endAngle), this.endAngle);

        // Draw the active knob background
        this.p.stroke(this.setColor(this.accentColor));
        this.p.arc(this.cur_x, this.cur_y, this.cur_size, this.cur_size, this.startAngle, this.p.constrain(this.startAngle + angle - (border/30/this.size/2),this.startAngle,this.endAngle));

        // Draw the knob value indicator as a line
        let indicatorLength = this.cur_size / 2 // Length of the indicator line
        let indicatorX = this.cur_x + this.p.cos(this.startAngle+angle) * indicatorLength;
        let indicatorY = this.cur_y + this.p.sin(this.startAngle+angle) * indicatorLength;
        this.p.stroke(this.setColor(this.accentColor));
        this.p.line(this.cur_x, this.cur_y, indicatorX, indicatorY);
    }

    isDragged() {
        if(this.hide===true) return;
        if(this.active){
        
            if(this.p.movedY != 0 ){ 
                if( this.p.keyIsDown(this.p.ALT)) this.rawValue -= this.p.movedY * this.incr/10;
                else this.rawValue -= this.p.movedY * this.incr;
            }
            
            if( this.rawValue > 1 ) this.rawValue = 1
            if( this.rawValue < 0 ) this.rawValue = 0
            this.value = scaleOutput(this.rawValue,0,1,this.min,this.max,this.curve)
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

p5.prototype.Knob = function (options = {}) {
    return new Knob(this, options);
};

p5.prototype.Dial = function (options = {}) {
    return new Knob(this, options);
};