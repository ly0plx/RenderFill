const elementSelect = document.getElementById('element-select');
const elementContent = document.getElementById('element-content');
const elementAttributes = document.getElementById('element-attributes');
const templateSelect = document.getElementById('template-select');
const useTemplateButton = document.getElementById('use-template-button');
const renderButton = document.getElementById('render-button');
const undoButton = document.getElementById('undo-button');
const clearButton = document.getElementById('clear-button');
const saveButton = document.getElementById('save-button');
const loadButton = document.getElementById('load-button');
const resetStorageButton = document.getElementById('reset-storage-button');
const copyButton = document.getElementById('copy-button');
const downloadButton = document.getElementById('download-button');
const resultContainer = document.getElementById('result');
const htmlCodeContainer = document.getElementById('html-code');
const statusNode = document.getElementById('status');
const statElements = document.getElementById('stat-elements');
const statLines = document.getElementById('stat-lines');
const statBytes = document.getElementById('stat-bytes');

const STORAGE_KEY = 'renderfill-project-v2';
const history = [];

const templateMap = {
  hero: [
    { type: 'h1', content: 'Your hero title', attributes: 'class="hero-title"' },
    { type: 'p', content: 'A concise hero description.', attributes: 'class="hero-subtitle"' }
  ],
  cta: [
    { type: 'a', content: 'https://example.com', attributes: 'class="btn btn-primary" target="_blank" rel="noreferrer"' }
  ],
  list: [
    { type: 'ul', content: '', attributes: 'class="feature-list"' },
    { type: 'li', content: 'First item', attributes: '' },
    { type: 'li', content: 'Second item', attributes: '' }
  ],
  table: [
    { type: 'table', content: '', attributes: 'class="data-table"' },
    { type: 'tr', content: '', attributes: '' },
    { type: 'th', content: 'Name', attributes: '' },
    { type: 'th', content: 'Value', attributes: '' }
  ]
};

function setStatus(message, type = 'info') {
  statusNode.textContent = message;
  statusNode.className = `status-${type}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

function parseAttributes(raw) {
  const attributes = [];
  const regex = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match;

  while ((match = regex.exec(raw)) !== null) {
    const name = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attributes.push({ name, value });
  }

  return attributes;
}

function normalizeAttributeString(raw) {
  const attrs = parseAttributes(raw);
  if (!attrs.length) {
    return '';
  }

  return attrs.map(({ name, value }) => `${name}="${escapeAttribute(value)}"`).join(' ');
}

function isLikelyUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:', 'data:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function buildTag(elementType, content, rawAttributes) {
  const safeContent = escapeHtml(content);
  const normalizedAttributes = normalizeAttributeString(rawAttributes);
  const attributes = parseAttributes(rawAttributes);
  const newElement = document.createElement(elementType);

  attributes.forEach(({ name, value }) => {
    newElement.setAttribute(name, value);
  });

  const attrsChunk = normalizedAttributes ? ` ${normalizedAttributes}` : '';

  if (elementType === 'input') {
    newElement.setAttribute('placeholder', content || '');
    return {
      newElement,
      htmlCode: `<input placeholder="${escapeAttribute(content || '')}"${attrsChunk}>`
    };
  }

  if (elementType === 'img') {
    const imgSrc = content || '';
    if (imgSrc && !isLikelyUrl(imgSrc)) {
      throw new Error('Image content must be a valid http(s) or data URL.');
    }

    newElement.setAttribute('src', imgSrc);
    newElement.setAttribute('alt', 'Rendered image');
    return {
      newElement,
      htmlCode: `<img src="${escapeAttribute(imgSrc)}" alt="Rendered image"${attrsChunk}>`
    };
  }

  if (elementType === 'a') {
    const href = content || '#';
    if (href !== '#' && !isLikelyUrl(href)) {
      throw new Error('Link content must be a valid URL (http/https/data).');
    }

    newElement.setAttribute('href', href);
    newElement.textContent = content || 'Link';
    return {
      newElement,
      htmlCode: `<a href="${escapeAttribute(href)}"${attrsChunk}>${safeContent || 'Link'}</a>`
    };
  }

  if (elementType === 'select') {
    newElement.innerHTML = `<option>${safeContent || 'Option'}</option>`;
    return {
      newElement,
      htmlCode: `<select${attrsChunk}><option>${safeContent || 'Option'}</option></select>`
    };
  }

  if (elementType === 'hr' || elementType === 'br') {
    return { newElement, htmlCode: `<${elementType}${attrsChunk}>` };
  }

  newElement.textContent = content;
  return {
    newElement,
    htmlCode: `<${elementType}${attrsChunk}>${safeContent}</${elementType}>`
  };
}

function updateStats() {
  const code = htmlCodeContainer.textContent;
  const lines = code ? code.split('\n').filter(Boolean).length : 0;
  statElements.textContent = String(history.length);
  statLines.textContent = String(lines);
  statBytes.textContent = String(new TextEncoder().encode(code).length);
}

function renderHistory() {
  htmlCodeContainer.textContent = history.map((item) => item.htmlCode).join('\n');
  updateStats();
}

function appendElement(type, content, attributes) {
  const { newElement, htmlCode } = buildTag(type, content, attributes);
  resultContainer.appendChild(newElement);
  history.push({ type, content, attributes, htmlCode, node: newElement });
  renderHistory();
}

function clearCanvas() {
  history.length = 0;
  resultContainer.innerHTML = '';
  htmlCodeContainer.textContent = '';
  updateStats();
}

function saveProject() {
  const payload = history.map(({ type, content, attributes }) => ({ type, content, attributes }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  setStatus('Project saved to local storage.', 'success');
}

function loadProject() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    setStatus('No saved project found.', 'warn');
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    setStatus('Saved project is corrupted.', 'error');
    return;
  }

  clearCanvas();
  parsed.forEach((entry) => {
    appendElement(entry.type, entry.content || '', entry.attributes || '');
  });
  setStatus(`Loaded ${parsed.length} saved item(s).`, 'success');
}

renderButton.addEventListener('click', () => {
  const selectedElement = elementSelect.value;
  const content = elementContent.value.trim();
  const attributes = elementAttributes.value.trim();

  if (!selectedElement) {
    setStatus('Please select an element type.', 'warn');
    return;
  }

  try {
    appendElement(selectedElement, content, attributes);
    setStatus(`Rendered <${selectedElement}> successfully.`, 'success');
    elementContent.focus();
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

useTemplateButton.addEventListener('click', () => {
  const templateName = templateSelect.value;
  if (!templateName || !templateMap[templateName]) {
    setStatus('Pick a template first.', 'warn');
    return;
  }

  try {
    templateMap[templateName].forEach((entry) => {
      appendElement(entry.type, entry.content, entry.attributes);
    });
    setStatus(`Applied ${templateName} template.`, 'success');
  } catch (error) {
    setStatus(`Template failed: ${error.message}`, 'error');
  }
});

undoButton.addEventListener('click', () => {
  const latest = history.pop();
  if (!latest) {
    setStatus('Nothing to undo.', 'warn');
    return;
  }

  latest.node.remove();
  renderHistory();
  setStatus(`Undid <${latest.type}>.`, 'success');
});

clearButton.addEventListener('click', () => {
  clearCanvas();
  setStatus('Canvas cleared.', 'success');
});

saveButton.addEventListener('click', saveProject);
loadButton.addEventListener('click', loadProject);

resetStorageButton.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  setStatus('Saved project deleted.', 'success');
});

copyButton.addEventListener('click', async () => {
  const code = htmlCodeContainer.textContent;
  if (!code.trim()) {
    setStatus('Nothing to copy yet.', 'warn');
    return;
  }

  try {
    await navigator.clipboard.writeText(code);
    setStatus('Copied HTML to clipboard.', 'success');
  } catch {
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = code;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand('copy');
    tempTextArea.remove();
    setStatus('Copied HTML using fallback.', 'success');
  }
});

downloadButton.addEventListener('click', () => {
  const code = htmlCodeContainer.textContent;
  if (!code.trim()) {
    setStatus('Nothing to download yet.', 'warn');
    return;
  }

  const blob = new Blob([code], { type: 'text/html' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'renderfill-output.html';
  link.click();
  URL.revokeObjectURL(downloadUrl);
  setStatus('Downloaded renderfill-output.html.', 'success');
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    renderButton.click();
  }
});

updateStats();
setStatus('Ready. Start rendering!', 'info');
