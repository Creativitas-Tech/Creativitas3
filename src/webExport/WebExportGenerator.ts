/**
 * Main web export generator that combines all components to generate HTML content
 */
import { generateHTMLTemplate } from './components/htmlTemplate.ts';

/**
 * Generates HTML content for web export with the user's code
 * @param userCode The user's code to include in the export
 * @returns The complete HTML content for the web export
 */
async function webExportHTMLContentGenerator(userCode: string): Promise<string> {
    // Generate the complete HTML template by calling the refactored function
    // All other necessary code generation is handled internally by generateHTMLTemplate
    const htmlContent = await generateHTMLTemplate(userCode);

    return htmlContent;
}

export default webExportHTMLContentGenerator;
