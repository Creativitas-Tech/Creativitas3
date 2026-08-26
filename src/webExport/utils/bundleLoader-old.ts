/**
 * Utility functions for loading bundled packages
 */

/**
 * Fetches the bundled timing packages
 * @returns Promise containing the bundled timing packages as text
 */
export async function getBundledTimingPackages(): Promise<string> {
    try {
        const response = await fetch('/creativitas/timing-bundle.min.js');
        if (!response.ok) throw new Error('Failed to load timing bundle');
        return await response.text();
    } catch (error) {
        console.error('Error loading timing packages:', error);
        return '// Failed to load timing packages';
    }
}

/**
 * Fetches the bundled synth code
 * @returns Promise containing the bundled synth code as text
 */
export async function getBundledSynthCode(): Promise<string> {
    try {
        
        const response = await fetch('/creativitas/synth-bundle.min.js');
        if (!response.ok) throw new Error('Failed to load synth bundle');
        return await response.text();
    } catch (error) {
        console.error('Error loading synth bundle:', error);
        return '// Failed to load synth bundle';
    }
}
