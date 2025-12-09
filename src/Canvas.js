import { useState, useEffect, useRef } from 'react';
import { sketch } from './p5Library';

function Canvas(props) {
    const [isPopout, setIsPopout] = useState(false);
    const wrapperRef = useRef(null);
    const placeholderRef = useRef(null);
    const popoutWindowRef = useRef(null);
    const popoutCloseHandlerRef = useRef(null);
    const resizeObserverRef = useRef(null);
    const resizeRafRef = useRef(null);

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

    useEffect(() => {
        const wrapperEl = wrapperRef.current;
        if (!wrapperEl) {
            return;
        }

        const view = wrapperEl.ownerDocument?.defaultView || window;
        const ResizeObserverImpl = view.ResizeObserver || window.ResizeObserver;
        if (!ResizeObserverImpl) {
            return;
        }

        const scheduleResize = () => {
            if (resizeRafRef.current !== null) {
                return;
            }
            resizeRafRef.current = view.requestAnimationFrame(() => {
                resizeRafRef.current = null;
                const ownerView = wrapperRef.current?.ownerDocument?.defaultView;
                const contexts = [];
                const seen = new Set();

                const pushContext = (candidate) => {
                    if (!candidate || typeof candidate.divResized !== 'function') {
                        return;
                    }
                    if (seen.has(candidate)) {
                        return;
                    }
                    seen.add(candidate);
                    contexts.push(candidate);
                };

                const collectFromRegistry = (source) => {
                    if (!source) {
                        return;
                    }
                    const registry = source.__creativitasCanvasRegistry;
                    if (registry && Object.prototype.hasOwnProperty.call(registry, props.id)) {
                        pushContext(registry[props.id]);
                    }
                };

                collectFromRegistry(ownerView);
                collectFromRegistry(window);

                if (ownerView && ownerView !== window) {
                    pushContext(ownerView?.[props.id]);
                }
                pushContext(window?.[props.id]);

                for (const context of contexts) {
                    try {
                        context.divResized();
                    } catch (error) {
                        console.log(error);
                    }
                }
            });
        };

        const observer = new ResizeObserverImpl(scheduleResize);
        observer.observe(wrapperEl);
        resizeObserverRef.current = observer;

        scheduleResize();

        return () => {
            if (resizeRafRef.current !== null) {
                view.cancelAnimationFrame(resizeRafRef.current);
                resizeRafRef.current = null;
            }
            observer.disconnect();
            if (resizeObserverRef.current === observer) {
                resizeObserverRef.current = null;
            }
        };
    }, [props.id, isPopout]);

    useEffect(() => {
        if (isPopout) {
            return;
        }

        const wrapperEl = wrapperRef.current;
        const view = wrapperEl?.ownerDocument?.defaultView || window;
        const candidates = [view?.[props.id], window[props.id]];
        const target = candidates.find((candidate) => candidate && typeof candidate.divResized === 'function');

        if (!target) {
            return;
        }

        try {
            if (props.maximized === props.id) {
                target.divResized('+h', props.canvasLength);
            } else if (props.maximized) {
                target.divResized('-h', props.canvasLength);
            } else {
                target.divResized();
            }
        } catch (error) {
            console.log(error);
        }
    }, [props.maximized, props.canvasLength, props.id, isPopout]);

    useEffect(() => {
        return () => {
            const popoutWindow = popoutWindowRef.current;
            if (popoutCloseHandlerRef.current) {
                popoutCloseHandlerRef.current();
            }
            if (popoutWindow && !popoutWindow.closed) {
                popoutWindow.close();
            }
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
                resizeObserverRef.current = null;
            }
            if (resizeRafRef.current !== null) {
                const view = wrapperRef.current?.ownerDocument?.defaultView || window;
                view.cancelAnimationFrame(resizeRafRef.current);
                resizeRafRef.current = null;
            }
        };
    }, []);

    const maxClicked = () => {
        const currentlyMaximized = props.maximized === props.id;
        props.onMaximize(props.id);
        try {
            const ownerView = wrapperRef.current?.ownerDocument?.defaultView || window;
            const target = ownerView?.[props.id] || window[props.id];
            target?.divResized(currentlyMaximized ? "-h" : "+h", props.canvasLength);
        } catch (error) {
            console.log(error);
        }
    };

    const handlePopoutClick = () => {
        if (isPopout) {
            const popoutWindow = popoutWindowRef.current;
            if (popoutCloseHandlerRef.current) {
                popoutCloseHandlerRef.current();
            }
            if (popoutWindow && !popoutWindow.closed) {
                popoutWindow.close();
            }
            return;
        }

        const newWindow = window.open('', `${props.id}-popout`, 'width=900,height=600');
        if (!newWindow) {
            console.warn('Pop-out window was blocked by the browser.');
            return;
        }

        newWindow.document.write(`<!doctype html><html><head><title>${props.id} - Canvas</title></head><body><div class="popout-root"></div></body></html>`);
        newWindow.document.close();

        try {
            const head = newWindow.document.head;
            document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
                head.appendChild(node.cloneNode(true));
            });
        } catch (error) {
            console.log('Unable to copy styles to pop-out window:', error);
        }

        const styleTag = newWindow.document.createElement('style');
        styleTag.textContent = `
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; color: #eee; }
            body { display: flex; }
            .popout-root { display: flex; flex-direction: column; flex: 1 1 auto; overflow: hidden; }
        `;
        newWindow.document.head.appendChild(styleTag);

        const popoutRoot = newWindow.document.querySelector('.popout-root');
        if (!popoutRoot) {
            newWindow.close();
            return;
        }

        const wrapperEl = wrapperRef.current;
        if (!wrapperEl) {
            newWindow.close();
            return;
        }

        const parentNode = wrapperEl.parentNode;
        if (!parentNode) {
            newWindow.close();
            return;
        }

        const placeholder = document.createElement('span');
        placeholder.className = 'canvas-popout-placeholder';
        placeholder.style.display = 'none';
        parentNode.replaceChild(placeholder, wrapperEl);
        placeholderRef.current = { node: placeholder, parent: parentNode };

        popoutRoot.appendChild(wrapperEl);
        popoutWindowRef.current = newWindow;
        setIsPopout(true);

        try {
            const mainRegistry = window.__creativitasCanvasRegistry;
            const instance = mainRegistry?.[props.id];
            if (instance) {
                if (!newWindow.__creativitasCanvasRegistry) {
                    Object.defineProperty(newWindow, '__creativitasCanvasRegistry', {
                        value: {},
                        configurable: true,
                        enumerable: false,
                        writable: true,
                    });
                }
                newWindow.__creativitasCanvasRegistry[props.id] = instance;
            }
        } catch (error) {
            console.log(error);
        }

        const handleWindowClose = () => {
            const placeholderEntry = placeholderRef.current;
            const wrapperNode = wrapperRef.current;
            if (placeholderEntry && wrapperNode) {
                const { node, parent } = placeholderEntry;
                if (node.parentNode === parent) {
                    parent.replaceChild(wrapperNode, node);
                } else {
                    parent.appendChild(wrapperNode);
                }
            }
            placeholderRef.current = null;
            setIsPopout(false);

            const popoutWin = popoutWindowRef.current;
            if (popoutWin) {
                popoutWin.removeEventListener('beforeunload', handleWindowClose);
                popoutWin.removeEventListener('unload', handleWindowClose);
            }
            popoutWindowRef.current = null;
            popoutCloseHandlerRef.current = null;

            try {
                const instance = window.__creativitasCanvasRegistry?.[props.id];
                if (instance && wrapperRef.current?.ownerDocument?.defaultView === window) {
                    window.__creativitasCanvasRegistry[props.id] = instance;
                }
                if (popoutWin?.__creativitasCanvasRegistry && Object.prototype.hasOwnProperty.call(popoutWin.__creativitasCanvasRegistry, props.id)) {
                    delete popoutWin.__creativitasCanvasRegistry[props.id];
                }
            } catch (error) {
                console.log(error);
            }

            setTimeout(() => {
                try {
                    window[props.id].divResized();
                } catch (error) {
                    console.log(error);
                }
            }, 0);
        };

        popoutCloseHandlerRef.current = handleWindowClose;
        newWindow.addEventListener('beforeunload', handleWindowClose);
        newWindow.addEventListener('unload', handleWindowClose);
        newWindow.focus();

        setTimeout(() => {
            try {
                window[props.id].divResized();
            } catch (error) {
                console.log(error);
            }
        }, 100);
    };

    const isMaximized = props.maximized === props.id;
    const css = props.maximized && !isMaximized ? 'minimize' : "p5-container";

    return (
        <span className={css} ref={wrapperRef}>
            <span className="span-container" >
                <span id="controls">
                    {props.canvasLength > 1 &&
                        <button className="button-container" onClick={maxClicked}>
                            {isMaximized ? '-' : '+'}
                        </button>
                    }
                </span>
                {/* <button
                    className="button-container"
                    onClick={handlePopoutClick}
                    title={isPopout ? 'Return canvas to main window' : 'Open canvas in pop-out window'}
                >
                    {isPopout ? 'Pop-in' : 'Pop-out'}
                </button> */}
            </span>
            <div id={props.id} className='canvas-container'></div>
        </span>
    );

}

export default Canvas;