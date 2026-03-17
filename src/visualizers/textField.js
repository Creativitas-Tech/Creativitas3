  import * as Tone from 'tone';

export class TextField {
    constructor(numLines = 10, _target = 'Canvas') {
    const container = document.getElementById(_target);
    if (!container) {
      console.error(`No element found with id "${_target}"`);
      return;
    }


    this.numLines = numLines;
    this.lines = Array(numLines).fill('');
    this.cursorPosition = {
      'line':-1,
      'start':-1,
      'end':-1
    }
    
    // Create the div
    this.div = document.createElement('div');
    Object.assign(this.div.style, {
      background: "rgba(0,0,0,0.6)",
      color: "#0f0",
      fontFamily: "Courier New, monospace",
      fontSize: "14px",
      lineHeight: "18px",
      whiteSpace: "pre",
      padding: "4px",
      overflowY: "auto",
      maxHeight: "100%",
      pointerEvents: "auto"
    });

    container.appendChild(this.div);

        this.lineHeight = 20;
        this.lines = [];

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

        this.div.style.fontFamily = 'Consolas, monospace';
        this.div.style.fontSize = '18px';
        this.div.style.color = '#ffcc00';
        this.div.style.backgroundColor = '#000';
    }

    // Write text to a given line index
    writeLine(lineNum, text) {
      // Expand the array as needed
      while (this.lines.length <= lineNum) this.lines.push('');
      this.lines[lineNum] = text;
      this.trimTrailingEmptyLines();
      this.render();
    }

  clearLine(lineNum) {
    if (lineNum < 0 || lineNum >= this.lines.length) return;
    this.lines[lineNum] = '';
    this.trimTrailingEmptyLines();
    this.render();
  }

  clear() {
    this.lines = [];
    this.render();
  }

  trimTrailingEmptyLines() {
    // Remove undefined or empty lines at the end
    while (this.lines.length > 0 && !this.lines[this.lines.length - 1]) {
      this.lines.pop();
    }
  }

    // Redraw all lines
    // render() {
    //   this.div.textContent = this.lines.join('\n');
    // }
  render() {
    let highlightPos = [this.cursorPosition.start,this.cursorPosition.end]
    let highlightLine = this.cursorPosition.line
    this.ensureStyle()

    const esc = (s) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    let html = "";
    for (let i = 0; i < this.lines.length; i++) {
      const line = String(this.lines[i] ?? "");
      
      if ( i === highlightLine &&
        highlightPos[0] >= 0 &&
        highlightPos[0] <= line.length &&
        highlightPos[1] >= highlightPos[0]
      ) {
        html +=
          esc(line.slice(0, highlightPos[0])) +
          `<span class="seq-cursor">${esc(line.slice(highlightPos[0], highlightPos[1]))}</span>` +
          esc(line.slice(highlightPos[1]));
      } else {
        html += esc(line);
      }
      if (i < this.lines.length - 1) html += "\n";
    }
    //console.log(html)
    this.div.innerHTML = html;
    this.scrollToBottom()
  }

  scrollToBottom() {
    this.div.scrollTop = this.div.scrollHeight;
  }

  ensureStyle() {
    if (this._hasStyle) return;

    const style = document.createElement("style");
    style.textContent = `
      .seq-cursor {
        background: rgba(255,255,255,0.25);
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
    this._hasStyle = true;
  }
 
}
