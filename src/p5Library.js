import { initialize, divResized, drawElements, drawBackground, GuiColors, 
    setColor, setFont, setTheme, debug,
    listThemes, setThemeParameters, exportTheme } from './p5Elements';

export const sketch = (p) => {
    let grey = p.color(220, 229, 234);
    let div;
    p.setColor = setColor;
    p.setFont = setFont;
    p.debug = debug

    //theme functions
    p.setTheme = setTheme
    p.listThemes = listThemes
    p.setThemeParameters = setThemeParameters
    p.exportTheme = exportTheme

    p.p5Code = '';

    p.Debug = function(){ p.debug(); }

    p.setup = function () {
        let divID = p.canvas.parentElement.id;
        let div = document.getElementById(p.canvas.parentElement.id);
        // div = document.getElementById(props.id);
        let dim =  p.initialize(div, grey) 

        p.width = dim[0]
        p.height = dim[1]
        p.frame = 0
        p.x = 0
        p.y = 0
        p.capture = null
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
        p.divResized();
    };

    p.openWebcam = function(width, height) {
      p.capture = p.createCapture(p.VIDEO);
      p.capture.size(width, height);
      p.capture.hide();
      console.log("Webcam opened with resolution:", width, "x", height);
    }
};
