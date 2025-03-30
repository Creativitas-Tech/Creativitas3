/**
 * TimingModalDialog.js - Provides UI components for timing strategy initialization
 * 
 * This module handles the creation and management of modal dialogs for timing strategy
 * initialization, particularly for the Timing Object which requires async initialization.
 */

/**
 * Creates and displays a modal dialog for timing initialization
 * @param {string} title - The title of the modal dialog
 * @param {string} message - The message to display in the dialog
 * @returns {Object} - An object with methods to control the dialog
 */
export function createTimingInitModal(title, message) {
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'timing-modal-container';
    modalContainer.style.position = 'fixed';
    modalContainer.style.top = '0';
    modalContainer.style.left = '0';
    modalContainer.style.width = '100%';
    modalContainer.style.height = '100%';
    modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modalContainer.style.display = 'flex';
    modalContainer.style.justifyContent = 'center';
    modalContainer.style.alignItems = 'center';
    modalContainer.style.zIndex = '1000';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'timing-modal-content';
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '5px';
    modalContent.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    modalContent.style.width = '400px';
    modalContent.style.textAlign = 'center';
    modalContent.style.color = '#000000';  // Default text color for all content
    
    // Create title
    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    titleElement.style.marginTop = '0';
    titleElement.style.color = '#000000';  // Black text for better visibility
    
    // Create message
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messageElement.style.color = '#000000';  // Black text for better visibility
    
    // Create spinner
    const spinner = document.createElement('div');
    spinner.className = 'timing-spinner';
    spinner.style.border = '4px solid #f3f3f3';
    spinner.style.borderTop = '4px solid #3498db';
    spinner.style.borderRadius = '50%';
    spinner.style.width = '30px';
    spinner.style.height = '30px';
    spinner.style.animation = 'timing-spin 2s linear infinite';
    spinner.style.margin = '20px auto';
    
    // Add keyframes for spinner animation
    if (!document.getElementById('timing-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'timing-spinner-style';
        style.textContent = '@keyframes timing-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }
    
    // Assemble modal
    modalContent.appendChild(titleElement);
    modalContent.appendChild(messageElement);
    modalContent.appendChild(spinner);
    modalContainer.appendChild(modalContent);
    
    // Add to document
    document.body.appendChild(modalContainer);
    
    // Methods to control the modal
    function close() {
        if (document.body.contains(modalContainer)) {
            document.body.removeChild(modalContainer);
        }
    }
    
    return {
        close,
        modalContainer
    };
}

/**
 * Handles the initialization of a timing strategy with a modal dialog
 * @param {Function} initFunction - Function that returns a Promise for initialization
 * @param {Function} onComplete - Callback for successful initialization
 * @param {Function} onError - Callback for when initialization fails
 * @param {string} strategyName - Name of the strategy being initialized
 * @returns {Promise} - Promise that resolves when initialization completes or rejects on error
 */
export async function handleTimingInitialization(initFunction, onComplete, onError, strategyName = 'Timing Object') {
    // Create modal dialog
    const modal = createTimingInitModal(
        `Initializing ${strategyName}`,
        `Please wait while the ${strategyName} is being initialized. This may take a few seconds...`
    );
    
    try {
        // Run the initialization function
        const result = await initFunction();
        
        // If we get here, initialization completed successfully
        modal.close();
        if (onComplete) onComplete(result);
        return result;
    } catch (error) {
        // Clean up modal
        modal.close();
        
        // Handle error
        console.error(`Error initializing ${strategyName}:`, error);
        alert(`Failed to initialize ${strategyName}: ${error.message}`);
        if (onError) onError(error);
        return null;
    }
}
