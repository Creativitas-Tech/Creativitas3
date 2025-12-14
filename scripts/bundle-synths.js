// WARNING: THIS SCRIPT IS NOT BEING USED, BUT CAN BE A FALLBACK
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');
require('../src/Editor-Initalizer.js');

async function bundleSynthDependencies() {
    const processedFiles = new Set();
    const dependencies = new Map();

    // Paths to ignore (i.e any duplicate declarations, experimental stuff that should not be included)
    const ignorePaths = [
        "synths/Sequencer.js",
    ]

    const coreFiles = [
        'AsciiKeyboard.js',
        //'./AsciiKeyboard.js',
        'CollabHub.js',
        'Midi.js',
        'p5Elements.js',
        'p5Library.js',
        'p5Themes.js',
        'TheoryModule.js',
        'TimingManager.js',
        './midi/MidiKeyboard2.js',
        './nexus/Button.js',
        './nexus/Dial.js',
        './nexus/NexusElement.js',
        './nexus/NumberBox.js',
        './nexus/parentNexus.js',
        './nexus/RadioButton.js',
        './nexus/Slider.js',
        './nexus/Switch.js'
    ]

    const srcDir = path.join(__dirname, '..', 'src');
    const ignoreFullPaths = ignorePaths.map(p => path.join(srcDir, p));
    const synthsDir = path.join(srcDir, 'synths');
    const visualizersDir = path.join(srcDir, 'visualizers');
    const webExportsDir = path.join(srcDir, 'WebExports');

    // any paths that should be ignored just marked as processed
    ignoreFullPaths.forEach(p => processedFiles.add(p));

    async function processFile(filePath, isOptional = false) {
        if (processedFiles.has(filePath)) return;

        try {
            let content;
            try {
                content = await fsp.readFile(filePath, 'utf8');
            } catch (error) {
                if (error.code === 'ENOENT' && isOptional) {
                    return;
                }
                throw error;
            }
            processedFiles.add(filePath);

            // Skip non-JavaScript/JSON files
            if (!filePath.endsWith('.js') && !filePath.endsWith('.json')) {
                return;
            }

            // Handle JSON files
            // The idea is that these files probably don't have other imports,
            // and they don't need any processing besides making it available to the bundle
            if (filePath.endsWith('.json')) {
                const varName = path.basename(filePath, '.json');
                dependencies.set(filePath, `window.${varName} = ${content};`);
                return;
            }

            const ast = acorn.parse(content, {
                sourceType: 'module',
                ecmaVersion: 'latest'
            });

            // Find all imports
            walk.simple(ast, {
                ImportDeclaration(node) {
                    const importPath = node.source.value;
                    // Skip external imports
                    // This includes Tone, for example, and should be handled as a special case
                    if (!importPath.startsWith('.')) return;

                    const resolvedPath = path.resolve(path.dirname(filePath), importPath);
                    let fullPath = resolvedPath;

                    // Try different extensions if path does not include the extension
                    // TODO: Assert that we don't have a .js and .json with the same name
                    if (!fullPath.endsWith('.js') && !fullPath.endsWith('.json')) {
                        if (fs.existsSync(fullPath + '.js')) {
                            fullPath += '.js';
                        } else if (fs.existsSync(fullPath + '.json')) {
                            fullPath += '.json';
                        }
                    }

                    processFile(fullPath, true);
                }
            });

            dependencies.set(filePath, content);
        } catch (error) {
            if (!isOptional) {
                console.error(`Error processing ${filePath}:`, error);
            }
        }
    }

    // Process core files first
    const coreFilePaths = [];
    for (const coreFile of coreFiles) {
        coreFilePaths.push(path.join(srcDir, coreFile));
    }

    for (const filePath of coreFilePaths) {
        if (fs.existsSync(filePath)) {
            await processFile(filePath);
        }
    }

    // Get all required
    const required_files = await fsp.readdir(webExportsDir);
    for (const file of required_files) {
        await processFile(path.join(webExportsDir, file));
    }

    // Get all synth files
    const files = await fsp.readdir(synthsDir);
    for (const file of files) {
        if (file.endsWith('.js')) {
            await processFile(path.join(synthsDir, file));
        }
    }

    // Get all visualizer files
    const visualizers = await fsp.readdir(visualizersDir);
    for (const file of visualizers) {
        if (file.endsWith('.js')) {
            await processFile(path.join(visualizersDir, file));
        }
    }

    // Sort dependencies topologically
    const sortedCode = [];
    const visited = new Set();

    function visit(filePath) {
        if (visited.has(filePath)) return;
        visited.add(filePath);

        const content = dependencies.get(filePath);
        if (!content) return;

        // JSON files don't need dependency resolution
        if (!filePath.endsWith('.json')) {
            try {
                const ast = acorn.parse(content, {
                    sourceType: 'module',
                    ecmaVersion: 'latest'
                });

                walk.simple(ast, {
                    ImportDeclaration(node) {
                        const importPath = node.source.value;
                        if (!importPath.startsWith('.')) return;

                        const resolvedPath = path.resolve(path.dirname(filePath), importPath);
                        let fullPath = resolvedPath;

                        // Try different extensions
                        if (!fullPath.endsWith('.js') && !fullPath.endsWith('.json')) {
                            if (fs.existsSync(fullPath + '.js')) {
                                fullPath += '.js';
                            } else if (fs.existsSync(fullPath + '.json')) {
                                fullPath += '.json';
                            }
                        }

                        visit(fullPath);
                    }
                });
            } catch (error) {
                console.error(`Error parsing ${filePath}:`, error);
                return;
            }
        }

        // Process the content to make it work in browser
        let processedContent = content;
        if (filePath.endsWith('.json')) {
            processedContent = `${content};`;
        } else {
            processedContent = content
                // Remove import statements
                .replace(/(?:import\s+.*?|{[^}]*}|\*\s+as\s+\w+)\s+from\s+['"].*?['"]/gs, '')
                // Remove export statements
                .replace(/export\s+(default\s+)?/g, '')
                // Add window assignments for classes
                .replace(/class\s+(\w+)/, (match, className) => {
                    return `class ${className}`;
                });
        }

        sortedCode.push(processedContent);
    }

    for (const [filePath] of dependencies) {
        visit(filePath);
    }

    // Write the bundled code to both locations
    // Having the js helps us see if there are any syntax errors ahead of time
    const outputPath = path.join(__dirname, '..', 'src', 'generated', 'synth-bundle.js');
    const publicPath = path.join(__dirname, '..', 'public', 'synth-bundle.txt');

    await fsp.mkdir(path.dirname(outputPath), { recursive: true });
    await fsp.writeFile(outputPath, sortedCode.join('\n\n'));
    await fsp.writeFile(publicPath, sortedCode.join('\n\n'));

    console.log(`Bundled synth code written to ${outputPath} and ${publicPath}`);
}

bundleSynthDependencies().catch(console.error);
