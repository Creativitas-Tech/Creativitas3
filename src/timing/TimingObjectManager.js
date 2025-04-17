import { TimingObject } from 'timing-object';
import { TimingProvider } from 'timing-provider';
import * as Tone from 'tone';

class TimingObjectManager {
    constructor() {
        this.timingObject = null;
        this.intervalId = null;
        this.shouldBeUsed = false;
    }

    async initialize(providerId = 'AspCEtTZLHqHgw3KfHav') {
        if (this.timingObject) {
            return Promise.resolve(this);
        }

        return new Promise((resolve) => {
            this.timingObject = new TimingObject(new TimingProvider(providerId));

            const resolveWhenOpen = () => {
                this.timingObject.removeEventListener('readystatechange', resolveWhenOpen);

                if (this.timingObject.readyState === 'open') {
                    resolve(this);
                }
            };

            this.timingObject.addEventListener('readystatechange', resolveWhenOpen);
        });
    }

    setShouldUse() {
        this.shouldBeUsed = true;

        // Set up event listeners only when we decide to use the timing manager
        if (this.timingObject && this.timingObject.readyState === 'open') {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        this.timingObject.addEventListener('change', () => {
            if (!this.shouldBeUsed) return;
            const { velocity } = this.timingObject.query();

            if (velocity === 0) {
                this.stopTimer();
            } else {
                if (this.intervalId === null) {
                    this.startTimer();
                } else {
                    this.restartTimer();
                }
            }
        });
    }

    translateVector({ acceleration, position, timestamp, velocity }) {
        if (acceleration !== 0) {
            throw new Error('Acceleration other than zero is not supported.');
        }

        return {
            position: position + velocity * (performance.now() / 1000 - timestamp),
            velocity
        };
    }

    convertBpmToVelocity(value) {
        return value / 60;
    }

    updateTransport() {
        if (!this.shouldBeUsed) return;

        const { position, velocity } = this.translateVector(this.timingObject.query());

        let currentTransportSeconds = Tone.getTransport().seconds;
        let expectedTransportSeconds = position / velocity;
        let absSecondsDifference = Math.abs(expectedTransportSeconds - currentTransportSeconds);
        if (velocity !== 0 && absSecondsDifference > 0.01) {
            Tone.getTransport().seconds = expectedTransportSeconds;
            Tone.getTransport().bpm.value = velocity * 60;
        }
    }

    startTimer() {
        if (!this.shouldBeUsed) return;

        if (Tone.getTransport().state === 'stopped') {
            Tone.getTransport().start();
        }

        this.updateTransport();
        this.intervalId = setInterval(() => this.updateTransport(), 500);
    }

    stopTimer(stopTransport = true) {
        if (!this.shouldBeUsed) return;

        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (stopTransport) {
            Tone.getTransport().stop();
        }
    }

    restartTimer() {
        if (!this.shouldBeUsed) return;

        this.stopTimer();
        this.startTimer();
    }

    updateVelocity(bpm) {
        if (!this.shouldBeUsed) return Promise.resolve();

        return this.timingObject.update({
            velocity: this.convertBpmToVelocity(bpm)
        });
    }

    isMoving() {
        const { velocity } = this.timingObject.query();
        return velocity !== 0;
    }
}

export const timingObjectManager = new TimingObjectManager();
export default TimingObjectManager;
