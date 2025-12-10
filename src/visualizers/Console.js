// consoleManager.js

let consoleDiv = null;

export function initConsole(parentElement) {

  if (consoleDiv) return consoleDiv; // already created

  const div = document.createElement('div');
  div.className = 'app-console';
  div.style.fontFamily = 'monospace';
  div.style.whiteSpace = 'pre-wrap';
  div.style.overflowY = 'auto';
  div.style.maxHeight = '200px';
  div.style.borderTop = '1px solid #444';
  div.style.padding = '4px';
  div.style.background = '#111';
  div.style.color = '#eee';

  parentElement = document.getElementById('Canvas');
  parentElement.appendChild(div);
  consoleDiv = div;
  return consoleDiv;
}

export function deinitConsole() {
  if (!consoleDiv) return;

  const parent = consoleDiv.parentNode;
  if (parent) parent.removeChild(consoleDiv);
  consoleDiv = null;
}

export function hasConsole() {
  // also handles the case where the parent was removed externally
  if (!consoleDiv) return false;
  if (!document.body.contains(consoleDiv)) {
    consoleDiv = null;
    return false;
  }
  return true;
}

export function consoleWrite(msg) {
  if (!hasConsole()) return;

  const line = document.createElement('div');
  line.textContent = String(msg);
  consoleDiv.appendChild(line);
  consoleDiv.scrollTop = consoleDiv.scrollHeight;
}