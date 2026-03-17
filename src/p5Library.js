import { initialize, divResized, drawElements, drawBackground, GuiColors, 
    setColor, setFont, setp5Theme, debug,
    listThemes, setThemeParameters, exportTheme } from './p5Elements';

import themes from './p5Themes.json';

export const sketch = (p, config = {}) => {
    let grey = p.color(220, 229, 234);
    let div;
    p.setColor = setColor;
    p.setFont = setFont;
    p.debug = debug
    p.backgroundColor = [255,255,255]

    //theme functions
    p.setTheme = setp5Theme
    p.listThemes = listThemes
    p.setThemeParameters = setThemeParameters
    p.exportTheme = exportTheme
    //p.theme = setp5Theme('default')

    p.p5Code = '';

    p.Debug = function(){ p.debug(); }

p.setup = function () {

        let parent = p._userNode;
        div = document.createElement("div");
        div.id = "Canvas" + Math.floor(Math.random()*1000)
        parent.appendChild(div);

        if( config.height === undefined) config.height = 1
        let dim =  p.initialize(div, config.height)


        p.activeTheme = themes['dark']
        p.width = dim[0]
        p.height = dim[1]
        //console.log(p.width, p.height)
        p.frame = 0
        p.x = 0
        p.y = 0
        p.capture = null

// let lastWidth = div.offsetWidth;
// let lastHeight = div.offsetHeight;
// let resizePending = false;

// const observer = new ResizeObserver(entries => {

//     const rect = entries[0].contentRect;

//     const w = Math.round(rect.width);
//     const h = Math.round(rect.height);

//     if (w === lastWidth && h === lastHeight) return;

//     lastWidth = w;
//     lastHeight = h;

//     if (!resizePending) {
//         resizePending = true;

//         requestAnimationFrame(() => {
//             resizePending = false;
//             p.resizeCanvas(w, h, true);
//         });
//     }

// });

//         observer.observe(p._userNode);
    };

    p.draw = function () {
        p.drawBackground();        

        try {
            eval(p.p5Code);
        } catch (error) {
            console.log("Error in p5Code: ", error);
        }
        p.frame += 1

        p.drawElements();
        
    };

    p.mousePressed = function () {
        for (const element of Object.values(p.elements)) {
            if (typeof (element) !== 'string') {
                try {
                    element.isPressed();
                } catch (e) {
                    //no pressed function
                }
            }
        }
    }

    p.mouseReleased = function () {
        for (const element of Object.values(p.elements)) {
            if (typeof (element) !== 'string') {
                try {
                    element.isReleased();
                } catch (e) {
                    //no releaed function
                }
            }
        }
    }

    p.mouseClicked = function () {
        for (const element of Object.values(p.elements)) {
            if (typeof (element) !== 'string') {
                try {
                    element.isClicked();
                } catch (e) {
                    //no clicked function
                }
            }
        }
    }

    p.mouseDragged = function () {
        for (const element of Object.values(p.elements)) {
            if (typeof (element) !== 'string') {
                try {
                    element.isDragged();
                } catch (e) {
                    //no clicked function
                }
            }
        }
    }

    p.windowResized = function () {
        console.log('foo')
        //p.divResized();
    };

    p.openWebcam = function(width, height) {
      p.capture = p.createCapture(p.VIDEO);
      p.capture.size(width, height);
      p.capture.hide();
      console.log("Webcam opened with resolution:", width, "x", height);
    }
};
