import React, { useEffect, useState } from 'react';
import { useLocation, BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Editor from './Editor.js';
import Navbar from './Navbar.js';
import BlogHome from './Pages/BlogHome.js';
import BlogPost from './Pages/BlogPost.js';
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
    'Theory','Sequencing','Debugging','Arpeggiator', 'Breakbeats!', 'Effects','SequencingParams', 'Temperaments','MIDI','FreqRatios','SamplerRatio', 'MarkovChain', 'Euclid','Expr'
  ];
  const assignmentFiles = [
    'Sequencing Basics', 'Subtractive Synthesis', 'Grids1', 'MarkovChains' //,'Working with MIDI Notes', 'Triggering Envelopes',
    //'Finale', 'Intro to Creativitas', 'Sequencing Basics', 'Subtractive Synthesis', 'Working with MIDI Notes', 'Triggering Envelopes', 'Exercises Day 2', 'Robin Sensors', 'The Barre'
    //'Assignment July 21','Assignment July 22', 'Assignments July 23', 'Sequencing Basics', 'The Barre', 'The Barre 2', 'Promenade Finale', 'Piano Simpler'
    //'Chord Object', 'Promenade', 'Promenade pt. 2', 'The Wand', 'The Barre', 'Sequencing Basics', 'Assignment Jul 15',
    //'Piano Simpler'
    //'Grids1', 'Comp5', 'Comp6',  'SamplePlayer', 'Comp7', 'Algorithms', 'Comp8', 'Comp9'
  ];

  const referenceFiles = [
    // 'DrumSampler', 'Rumble', 'Simpler',
     'Twinkle', 'Daisy', 'DrumSampler', 'Player', 'Rumble', 'Simpler', 'FM','Oscilloscope', 'Spectroscope','Spectrogram'
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
        if (!introRes.ok) throw new Error('Intro file is required');

        let [starterCodeRes, descriptionRes] = await Promise.all([
          fetch(`${process.env.PUBLIC_URL}/${folder}/${fileName}/StarterCode.js`),
          fetch(`${process.env.PUBLIC_URL}/${folder}/${fileName}/Description.txt`),
        ]);

        let intro = await introRes.text();
        intro = marked(intro);

        let starterCode;
        if (starterCodeRes.ok) {
          const text = await starterCodeRes.text();
          starterCode = text.trim().startsWith('<') ? undefined : text;
        }

        let description = descriptionRes.ok ? await descriptionRes.text() : undefined;
        description = description ? marked(description) : undefined;

        //console.log(starterCode)
        // starterCode = ''
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
    }


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
        <Route path="/blog" element={<BlogHome />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/TableOfContents" element={<TableOfContents assignments={assignments} examples={examples} references={references} setPage={setPage} />} />
        {Object.entries(assignments).map(([title, props]) => (
          <Route key={title} path={`/${title}`} element={<Template key={title} page={title} title={title} intro={props.intro} starterCode={props.starterCode} description={props.description} canvases={props.canvases} />} />
        ))}
        {Object.entries(examples).map(([title, props]) => (
          <Route key={title} path={`/${title}`} element={<Template key={title} page={title} title={title} intro={props.intro} starterCode={props.starterCode} description={props.description} canvases={props.canvases} />} />
        ))}
        {Object.entries(references).map(([title, props]) => (
          <Route key={title} path={`/${title}`} element={<Template key={title} page={title} title={title} intro={props.intro} starterCode={props.starterCode} description={props.description} canvases={props.canvases} />} />
        ))}
        {Object.entries(sandboxes).map(([title, props]) => (
        <Route key={title} path={`/${title}`} element={<Sandbox page={title} title={title} canvases={props.canvases} />} />
        ))}
      </Routes>
    </div>
  );
}
export default App;
