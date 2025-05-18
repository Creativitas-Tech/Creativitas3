/****************************************

plotTransferFunction

****************************************/

/**
 * Plots a transfer function on a specified SVG element with axis labels.
 * @module TransferFunctionPlotter
 * @param {function} myFunction - The transfer function to plot. Takes a number input and returns a number.
 * @param {string} _target - The ID of the HTML element where the transfer function will be plotted.
 */
export const PlotTransferFunction = function(myFunction, _target = 'Canvas', ratio= 4/10) {
    const target = document.getElementById(_target);

    // Check if an existing SVG is present and remove it if it is
    const existingSVG = target.querySelector('svg.transfer-function-svg');
    if (existingSVG) {
        target.removeChild(existingSVG);
    }

    if(myFunction === 'stop'){
        
        return
    }
    // Set the dimensions based on the target container
    const width = target.offsetWidth; 
    const height = target.offsetWidth*ratio;
    const graph_size = height - 10

    

    // Create the SVG element for the transfer function
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('class', 'transfer-function-svg');

    // Draw border around the graph
    const border = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
    border.setAttribute('x', '1');
    border.setAttribute('y', '1');
    border.setAttribute('width', graph_size - 1);
    border.setAttribute('height', graph_size - 1);
    border.setAttribute('stroke', 'black');
    border.setAttribute('fill', 'none');
    svg.appendChild(border);

    // Create the path element for the transfer function
    const path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    path.setAttribute('class', 'transfer-function-path');
    svg.appendChild(path);

    // Append the SVG element to the target container
    target.appendChild(svg);

    // Function to draw the transfer function
    var _path = 'M';
    let range = {min: -1, max: 1};
    let step = (range.max - range.min) / graph_size;
    let x = range.min;

    for (let i = 0; i < graph_size; i++) {
        let y = myFunction(x);
        let svgX = i;  // map x directly to pixel x-coordinate
        let svgY = graph_size / 2 - (y * graph_size/2);  // scale y and invert, adjust scale factor as needed

        _path += `${svgX} ${svgY} `;
        x += step;
    }

    path.setAttribute('d', _path);
    path.setAttribute('stroke', 'black');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');

    // Add labels for -1 and 1 on both the X and Y axes
    function addLabel(text, x, y) {
        const label = document.createElementNS("http://www.w3.org/2000/svg", 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', y);
        label.textContent = text;
        label.setAttribute('font-family', 'sans-serif');
        label.setAttribute('font-size', '10px');
        label.setAttribute('fill', 'black');
        svg.appendChild(label);
    }

     // Add labels for -1 and 1 on both the X and Y axes with optional rotation
    function addLabel(text, x, y, rotation, anchor, valign) {
        const label = document.createElementNS("http://www.w3.org/2000/svg", 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', y);
        label.textContent = text;
        label.setAttribute('font-family', 'sans-serif');
        label.setAttribute('font-size', '10px');
        label.setAttribute('fill', 'black');
        if (rotation) {
            label.setAttribute('transform', `rotate(${rotation} ${x}, ${y})`);
        }
        if (anchor) {
            label.setAttribute('text-anchor', anchor);
        }
        if (valign) {
            label.setAttribute('alignment-baseline', valign);
        }
        svg.appendChild(label);
    }

    addLabel('-1', 5, height - 2, 0, 'start', 'baseline');
    addLabel('input', graph_size / 2, height - 11, 0, 'middle', 'hanging');
    addLabel('1', graph_size - 5, height - 2,0, 'end', 'baseline');
    addLabel('-1', graph_size + 3, graph_size - 5, 90, 'middle', 'baseline');
    addLabel('1', graph_size + 13, 10, 90, 'middle', 'hanging');
    addLabel('output', graph_size + 3, graph_size / 2, 90, 'middle', 'baseline'); // Rotated "output" label

}