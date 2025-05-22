# Getting Started with Creativitas

The Creativitas website was created initially as a pedagogical tool for the MIT course 21M.080 introduction to music technology. In particular, 21M.080 uses it to learn about sound synthesis and music programming using **Tone.js** and the **Web Audio API** 

Over time, the site has developed into a larger playground for exploring:
* audio programming
* interface design
* live coding syntax and practices 
* MIDI controller explorations
* collaborative web-based experiences.

Most people using the site will be interacting with it through the code box on the main page, or the code boxes on the example pages. This blog post will give a few tips for getting started that way.

But most of these blog posts will be documenting the process of developing the site itself. My goal is to create a repository of knowledge for other people to learn about my thought processes as I created this site and also to be a knowledge resource for people who are helping continue to develop the site in the future.

A lot of people have helped to contribute to their development of the Creativitas coding environment:

* Kayli Requenez
* Billal Iqbal
* Diego Yañez-Laguna
* Lark Savoldy
* Yaro Luchko
* Javier Mulero
* Artem Laptiev
* Diego Barros
* TJ Ptak

For the most part I used ChatGPT as a coding helper - but I know other people have used other AIs when working on the site.

Thanks all for your help!

-ian

---

## Using the Code Box

The Creativitas code box lets you enter JavaScript code directly into your browser. Here's how to get started:

- **Single-line execution:**  
  Press `Option + Enter` (macOS) or `Alt + Enter` (Windows/Linux) to run just the current line.

- **Multi-line block execution:**  
  Use `Option + Shift + Enter` (macOS) or `Alt + Shift + Enter` (Windows/Linux) to run a selected block of code.

**Avoid pressing the “Run” button multiple times.** Doing so may cause unexpected behavior or audio conflicts. If something stops working, the easiest fix is often to **refresh the page**.

---

## Best Practices

- **Define audio objects only once.** Creating multiple identical `Tone.Synth`, `Tone.Player`, or `Tone.Loop` objects without clearing them can cause glitches or polyphony issues.
  
- **Variables can be redefined.** If you're adjusting parameters or trying different values, feel free to reassign variables freely.

---

## Learn by Example

To get inspired or find reference material, head over to the **[Table of Contents](/TableOfContents)**. There you’ll find:

- Code snippets
- Tutorials
- Parameter reference
- Synth and sequencer examples

---

## Helpful Links

- **Tone.js GitHub**  
  https://github.com/Tonejs/Tone.js

- **Tone.js API Reference**  
  https://tonejs.github.io/docs/

- **Tone.js Source Code**  
  https://github.com/Tonejs/Tone.js

- **Creativitas GitHub Repository**  
  [https://github.com/your-org/creativitas](https://github.com/your-org/creativitas) _(Replace with actual URL if different)_

---
