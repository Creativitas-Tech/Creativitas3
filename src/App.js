import React, { useEffect, useState } from 'react';
import { useLocation, BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Editor from './Editor.js';
import Navbar from './Navbar.js';
import Template from './Pages/Template.js';
import Sandbox from './Pages/Sandbox.js';
import TableOfContents from './Pages/TableOfContents.js';
import { marked } from 'marked'; //markdown parser for documentation

function App() {
  const location = useLocation();
  const initialPage = location.pathname.substring(1);
  const [page, setPage] = useState(initialPage || 'Home');
  const [assignments, setAssignments] = useState({});
  const [examples, setExamples] = useState({});
  const [references, setReferences] = useState({});
  const [sandboxes, setSandboxes] = useState({});
  const [markdownContent, setMarkdownContent] = useState("");

  const exampleFiles = [
    'DrumSampler', 
    //'SequencingParams', 'Temperaments','MIDI','FreqRatios','SamplerRatio', 'MarkovChain'
  ];
  const assignmentFiles = [
    'Assignment 1', 'Twinkle'
    //'Grids1', 'Comp5', 'Comp6',  'SamplePlayer', 'Comp7', 'Algorithms', 'Comp8', 'Comp9'
  ];
  const referenceFiles = [
    // 'DrumSampler', 'Rumble', 'Simpler', 
     'Oscilloscope', 'Spectroscope'
  ];

  const homeStarterCode = `/*
  Alt(option)-Enter: Evaluate Line
  Alt(option)-Shift-Enter: Evaluate Block
*/`;


  useEffect(() => {
    const importFiles = async (files, folder) => {
      const fetchedAssignments = {};

      for (const fileName of files) {
        try {
          const introRes = await fetch(`${process.env.PUBLIC_URL}/${folder}/${fileName}/Intro.txt`);
          const starterCodeRes = await fetch(`${process.env.PUBLIC_URL}/${folder}/${fileName}/StarterCode.js`);
          const descriptionRes = await fetch(`${process.env.PUBLIC_URL}/${folder}/${fileName}/Description.txt`);

          if (!introRes.ok || !starterCodeRes.ok || !descriptionRes.ok) {
            throw new Error('Fetching files failed');
          }

          let intro = await introRes.text();
          intro = marked(intro);
          const starterCode = await starterCodeRes.text();
          let description = await descriptionRes.text();
          description = marked(description);

          fetchedAssignments[fileName] = {
            intro,
            starterCode,
            description,
            canvases: ['Canvas'],
          };
        } catch (error) {
          console.error(`Error importing ${fileName}:`, error);
        }
      }
      return fetchedAssignments;
    };

    const loadSandbox = async (sandboxCount) => {
      const fetchedSandboxes = {};

      for (let i = 0; i < sandboxCount; i++) {
          const sandboxId = `sandbox${String.fromCharCode(65 + i)}`; // Convert i to corresponding alphabet letter (A, B, C, ...)
          fetchedSandboxes[sandboxId] = {
              canvases: ["Canvas"], // Add any other default properties if needed
          };
      }

      return fetchedSandboxes;
    };

    (async () => {
      const assignments = await importFiles(assignmentFiles, 'assignments');
      const examples = await importFiles(exampleFiles, 'examples');
      const references = await importFiles(referenceFiles, 'references');
      const sandboxCount = 10; // Change this to the desired number of sandbox pages
      const sandboxes = await loadSandbox(sandboxCount);
      setAssignments(assignments);
      setExamples(examples);
      setReferences(references);
      setSandboxes(sandboxes)
      //console.log(references);
    })();
  }, []);

  return (
    <div className="outer-container">
      <Navbar page={page} setPage={setPage} />
      <Routes>
        <Route path="/" element={<Editor page={page} starterCode={homeStarterCode} canvases={["Canvas"]} />} />
        <Route path="/TableOfContents" element={<TableOfContents assignments={assignments} examples={examples} references={references} setPage={setPage} />} />
        {Object.entries(assignments).map(([title, props]) => (
          <Route key={title} path={`/${title}`} element={<Template page={title} title={title} intro={props.intro} starterCode={props.starterCode} description={props.description} canvases={props.canvases} />} />
        ))}
        {Object.entries(examples).map(([title, props]) => (
          <Route key={title} path={`/${title}`} element={<Template page={title} title={title} intro={props.intro} starterCode={props.starterCode} description={props.description} canvases={props.canvases} />} />
        ))}
        {Object.entries(references).map(([title, props]) => (
          <Route key={title} path={`/${title}`} element={<Template page={title} title={title} intro={props.intro} starterCode={props.starterCode} description={props.description} canvases={props.canvases} />} />
        ))}
        {Object.entries(sandboxes).map(([title, props]) => (
        <Route key={title} path={`/${title}`} element={<Sandbox page={title} title={title} canvases={props.canvases} />} />
        ))}
      </Routes>
    </div>
  );
}
export default App;



