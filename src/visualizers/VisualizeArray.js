import * as Tone from 'tone';

export class ArrayVisualizer {
    constructor(parent, array, _target = 'Canvas', ratio = 4 / 10) {
        this.parent = parent
        this._array = array;
        this._target = document.getElementById(_target);
        this._ratio = ratio;
        this._type = 'horizontal'; // Default type
        this._color =  [
            '#FF5733',  // Base orange
            '#33A1FF',  // Light blue (complementary)
            '#FF33B1',  // Magenta (opposite on color wheel)
            '#33FF57',  // Bright green (vibrant contrast)
            '#5733FF',  // Purple (contrasting tone)
            '#FFBD33',  // Warm yellow (vibrant and complementary)
            '#33FFBD',  // Mint green (cool contrast)
            '#FF3380'   // Pink (near complementary)
        ];

        this._backgroundColor = '#3C3D37'
        this._activeColor = '#ECDFCC'; // Default color
        this._rows = 1; // Default to single row
        this._columns = array.length; // Default to length of array
        this._width = this._target.offsetWidth;
        this._height = this._width * this._ratio;
        this.elementWidth = this._width / this._columns;
        this.elementHeight = this._height / this._rows;
        //need to keep track of min and max acroos multiple frames
        //in order to catch when we draw multiply seqs
        this._min = 0
        this._max = 1
        this._minActive = 0
        this._maxActive = 1
        this._seqNum = 0
        this._displayLength = 8 //x dimension of drawing
        this._activeLength = 8 //length of longest array of last frame 
        
        this._subDivision = '16n'
        this._enabled = false
        this._svg = null
        this.index = 0

        // this.loop = new Tone.Loop(time=>{
        //     this.index = Math.floor(Tone.Transport.ticks / Tone.Time(this._subDivision).toTicks());
        //     this.visualize(this.index)
        // }, '16n')
    }

    createSVG() {
        // const existingSVG = this._target.querySelector('svg.array-visualizer-svg');
        // if (existingSVG) {
        //     this._target.removeChild(existingSVG);
        // }
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute('width', this._width);
        svg.setAttribute('height', this._height);
        svg.setAttribute('class', 'array-visualizer-svg');

        return svg;
    }

    clearSVG() {
        if (this._svg) {
            while (this._svg.firstChild) {
                this._svg.removeChild(this._svg.firstChild);
            }
        }

        const background = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        background.setAttribute('x', 0);
        background.setAttribute('y', 0);
        background.setAttribute('width', this._width);
        background.setAttribute('height', this._height);
        background.setAttribute('fill', this._backgroundColor);  // Set background color to white
        this._svg.appendChild(background);  // Append background before drawing elements

    }

    // Visualization logic based on the set type
    startVisualFrame(){
        this.clearSVG();

        //clear min and max values
        this._min = this._minActive
        this._max = this._maxActive
        this._minActive = null
        this._maxActive = null
        this._seqNum = 0
        this._displayLength = this._activeLength
        this._activeLength = 8
    }

    visualize(arr, index) {

        const isMultipleArrays = Array.isArray(arr) && arr.every(item => Array.isArray(item));
        if( arr.length > this._activeLength) this._activeLength = arr.length

        arr = this.transformArray(arr)
        this.calculateMinMax(arr)
       
        index = index % arr.length
        //console.log('drawing', index)
        switch (this._type) {
            case 'horizontal':
                this.drawHorizontalLines(index, arr);
                break;
            case 'vertical':
                this.drawVerticalBars(index, arr);
                break;
            case 'numbers':
                this.drawNumericValues(index, arr);
                break;
            default:
                console.error('Unknown visualization type');
        }
        this._seqNum+=1
    }

    calculateMinMax(arr) {
        // Filter the array to include only numbers and numeric strings
        const numericValues = arr
            .filter(item => !isNaN(item) && item !== '' && item !== null)  // Filter out non-numeric values
            .map(item => Number(item));  // Convert numeric strings to numbers

        // Calculate min and max
        const min = Math.min(...numericValues)-.6;
        const max = Math.max(...numericValues)+.6;

        //apply if there is a new min or max
        if(this._minActive === null || min < this._minActive ) this._minActive = min
        if(this._maxActive === null || max > this._maxActive ) this._maxActive = max
    }

    transformArray(arr) {
        const replacements = {
            'O': -1, 'o': 1,
            'X': 0, 'x': 0,
            '1': 3,
            '2': 2,
            '3': 1,
            '*': 4,
            '^': 5
        };
        const rep = ['*','O','o','x','X','^']
        let isDrum = false
        for( let i in rep) isDrum = arr.includes(rep[i]) ? true : isDrum
        if( isDrum) return arr.map(item => replacements[item] !== undefined ? replacements[item] : item);
        else return arr
    }

    // Enable the visualizer: create the SVG and allow drawing
    enable(seqs = null) {
        if(seqs !== null) this.parent.seqToDraw = seqs
        this.parent.drawingLoop.start()
        if (this._enabled) return; // Already enabled

        this._enabled = true;
        this._svg = this.createSVG();
        this._target.appendChild(this._svg);
        this.parent.drawingLoop.start()
    }

    // Disable the visualizer: remove the SVG and prevent drawing
    disable(seqs = null) {
        if (!this._enabled) return; // Already disabled

        this._enabled = false;
        if (this._target && this._svg && this._target.contains(this._svg)) {
            this._target.removeChild(this._svg); // Remove the SVG
        }
        this._svg = null; // Clear reference


    }

    // Getters and Setters for dynamic properties

    // Visualization type
    get type() { return this._type;}
    set type(value) { this._type = value; }

    // Visualization color
    get color() { return this._color; }
    set color(value) { this._color = value; }

    // Size ratio
    get ratio() { return this._ratio; }
    set ratio(value) {
        this._ratio = value;
        this._height = this._width * this._ratio;
        this._svg.setAttribute('height', this._height);
    }

    // Number of rows (for numbers mode)
    get rows() { return this._rows;}
    set rows(value) {  this._rows = value; }

    // Number of columns (for numbers mode)
    get columns() {return this._columns;  }
    set columns(value) { this._columns = value; }

    get enabled() { return this._enabled; }
    set enabled(value) {
        if (value)  this.enable();
        else this.disable();
    }

    // Drawing methods
    drawHorizontalLines(index, arr, elementWidth= this.elementWidth) {
        // Normalize array values between 0 and 1
        arr = arr.map(x => (x - this._min) / (this._max - this._min));

        arr.forEach((value, i) => {
            if(typeof value === 'number' && !isNaN(value)) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", 'line');

                // Calculate the X positions (using a small offset for visual separation)
                const x1 = i * elementWidth/this._displayLength;
                const x2 = (i + 1) * elementWidth/this._displayLength-2;

                // Y position is proportional to the normalized value
                const y = this._height * (1 - value);  // Subtract from height to flip Y axis (0 at bottom)
                let width = this._height/(this._max-this._min) -2
                if(width < 2 ) width = 2
                // Set line coordinates
                line.setAttribute('x1', x1);
                line.setAttribute('x2', x2);
                line.setAttribute('y1', y);
                line.setAttribute('y2', y);

                // Set color based on active index
                if (index === i)  line.setAttribute('stroke', this._activeColor);  // Highlight current index
                else  line.setAttribute('stroke', this._color[this._seqNum]);
                
                // Set line thickness proportional to the available space
                line.setAttribute('stroke-width', width);  // Slightly smaller than the element width

                this._svg.appendChild(line);
            }
        });
    }


    drawVerticalBars(index, arr, elementWidth= this.elementWidth) {
    // Normalize array values between 0 and 1
    arr = arr.map(x => (x - this._min) / (this._max - this._min));

    // Clear the SVG before redrawing
    this.clearSVG();

    arr.forEach((value, i) => {
        if(typeof value === 'number' && !isNaN(value)) {
            const bar = document.createElementNS("http://www.w3.org/2000/svg", 'rect');

            // Calculate the X position for each bar
            const x = i * (elementWidth / this._displayLength);

            // Height of the bar (proportional to the normalized value)
            const barHeight = value * this._height;

            // Y position: Subtract barHeight from the total height to align the bars at the bottom
            const y = this._height - barHeight;
            let barWidth =  elementWidth / this._displayLength*.98
            barWidth = barWidth>4 ? barWidth-2 : barWidth

            // Set the bar's attributes
            bar.setAttribute('x', x);
            bar.setAttribute('y', y);  // Aligns bars at the bottom
            bar.setAttribute('width', barWidth);  // Slightly smaller than the element width for spacing
            bar.setAttribute('height', barHeight);  // Height proportional to normalized value

            // Set the fill color based on the active index
            if (index === i) {
                bar.setAttribute('fill', this._activeColor);
            } else {
                bar.setAttribute('fill', this._color[this._seqNum]);
            }

            this._svg.appendChild(bar);
        }
    });
}


    drawNumericValues(index, arr, elementWidth= this.elementWidth, elementHeight= this.elementHeight) {
        const itemsPerRow = Math.ceil(this.this._displayLength / this._rows);

        arr.forEach((value, i) => {
            const row = Math.floor(index / itemsPerRow);
            const col = i % itemsPerRow;
            const text = document.createElementNS("http://www.w3.org/2000/svg", 'text');
            text.setAttribute('x', col * elementWidth + elementWidth / 2);
            text.setAttribute('y', row * elementHeight + elementHeight / 2);
            if( index == i) text.setAttribute('fill', this._activeColor);
            else text.setAttribute('fill', this._color);
            text.setAttribute('font-size', '16');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('alignment-baseline', 'middle');
            text.textContent = Math.round(value);
            this._svg.appendChild(text);
        });
    }

    // Destroy the visualizer instance and clean up resources
    destroy() {
        if (this._target && this._svg && this._target.contains(this._svg)) {
            this._target.removeChild(this._svg);
        }

        // Nullify references
        this._array = null;
        this._target = null;
        this._svg = null;
    }
}
