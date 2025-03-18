// Direct require for better control of exactly what's imported
const TimingObject = require('timing-object');
const TimingProvider = require('timing-provider');

// Export directly - these will be exposed to window by webpack
export { TimingObject, TimingProvider };
