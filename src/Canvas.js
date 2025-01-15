import { useState, useEffect } from 'react';
import { sketch } from './p5Library';

function Canvas(props) {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        // const sketch = (p) => {
        //     let grey = p.color(220, 229, 234);
        //     let div;

        //     p.setup = function () {
        //         div = document.getElementById(props.id);
        //         p.initialize(div, grey);
        //     };

        //     p.draw = function () {
        //         p.drawElements();
        //     };

        //     p.mousePressed = function () {
        //         for (const element of Object.values(p.elements)) {
        //             if (typeof (element) !== 'string') {
        //                 try {
        //                     element.isPressed();
        //                 } catch (e) {
        //                     //no pressed function
        //                 }
        //             }
        //         }
        //     }

        //     p.mouseReleased = function () {
        //         for (const element of Object.values(p.elements)) {
        //             if (typeof (element) !== 'string') {
        //                 try {
        //                     element.isReleased();
        //                 } catch (e) {
        //                     //no releaed function
        //                 }
        //             }
        //         }
        //     }

        //     p.mouseClicked = function () {
        //         for (const element of Object.values(p.elements)) {
        //             if (typeof (element) !== 'string') {
        //                 try {
        //                     element.isClicked();
        //                 } catch (e) {
        //                     //no clicked function
        //                 }
        //             }
        //         }
        //     }

        //     p.mouseDragged = function () {
        //         for (const element of Object.values(p.elements)) {
        //             if (typeof (element) !== 'string') {
        //                 try {
        //                     element.isDragged();
        //                 } catch (e) {
        //                     //no clicked function
        //                 }
        //             }
        //         }
        //     }

        //     p.windowResized = function () {
        //         p.divResized();
        //     };
        // };
        window.sketch = sketch;

    }, [props.id]);

    const maxClicked = () => {
        setIsMaximized(!isMaximized);
        props.onMaximize(props.id);
        try {
            window[props.id].divResized(isMaximized ? "-h" : "+h", props.canvasLength);
        } catch (error) {
            console.log(error);
        }
    };

    let css = props.maximized && !(props.maximized === props.id) ? 'minimize' : "p5-container";

    return (
        <span className={css}>
            <span className="span-container" >
                <div style={{ marginLeft: "5px" }}>{props.id}</div>
                {props.canvasLength > 1 &&
                    <span id="controls">
                        <button className="button-container" onClick={maxClicked}>
                            {isMaximized ? '-' : '+'}
                        </button>
                    </span>
                }
            </span>
            <div id={props.id} className='canvas-container'></div>
        </span>
    );

}

export default Canvas;