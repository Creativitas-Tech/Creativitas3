/**
 * midiDisplay.js
 * A library of visual handlers for MIDI inputs.
 */

export const Displays = {
    // Basic logging
    Terminal: (val, num) => {
        console.log(`%c MIDI CC ${num} | Value: ${val}`, "color: #00ff00");
    },

    // Example: A simple CSS-based level bar
    // Assumes you have an element with ID "meter-10" etc.
    LevelBar: (val, num) => {
        const el = document.getElementById(`meter-${num}`);
        if (el) el.style.height = `${(val / 127) * 100}%`;
    },

    // Example: Note trigger visualizer
    Flash: (vel, num, device, state) => {
        const el = document.getElementById(`pad-${num}`);
        if (!el) return;
        el.style.backgroundColor = state === "on" ? `rgba(255,0,0,${vel/127})` : "black";
    }
};