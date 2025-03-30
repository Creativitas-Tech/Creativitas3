/**
 * CSS styles for the exported web application
 */

export const exportStyles = `
    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
    canvas { display: block; margin-bottom: 10px; }
    .canvas-container { margin-bottom: 20px; }
    .span-container {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .invisible-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
    }
    .icon {
        height: 24px;
        transition: opacity 0.1s ease;
    }
    .active {
        opacity: 1;
    }
    .inactive {
        opacity: 0.5;
    }
    #notes-display {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: 8px;
        overflow-x: auto;
        white-space: nowrap;
        max-width: 70vw;
    }
    .note-pill {
        background-color: #f0f0f0;
        border-radius: 12px;
        padding: 4px 8px;
        font-size: 12px;
    }
    #volumeWarning {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: black;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 1002; /* Above controls */
    }
`;
