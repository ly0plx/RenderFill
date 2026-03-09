const elementSelect = document.getElementById('element-select');
const elementContent = document.getElementById('element-content');
const elementAttributes = document.getElementById('element-attributes');
const renderButton = document.getElementById('render-button');
const undoButton = document.getElementById('undo-button');
const clearButton = document.getElementById('clear-button');
const copyButton = document.getElementById('copy-button');
const downloadButton = document.getElementById('download-button');
const resultContainer = document.getElementById('result');
const htmlCodeContainer = document.getElementById('html-code');

const history = [];

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseAttributes(raw) {
  const attributes = [];
  const regex = /([\w:-]+)\s*=\s*"([^"]*)"/g;
  let match;

  while ((match = regex.exec(raw)) !== null) {
    attributes.push({ name: match[1], value: match[2] });
  }

  return attributes;
}

function buildTag(elementType, content, rawAttributes) {
  const safeContent = escapeHtml(content);
  const attributes = parseAttributes(rawAttributes);
  const newElement = document.createElement(elementType);

  attributes.forEach(({ name, value }) => {
    newElement.setAttribute(name, value);
  });

  let htmlCode;

  if (elementType === 'input') {
    newElement.setAttribute('placeholder', content || '');
    htmlCode = `<input placeholder="${safeContent}"${rawAttributes ? ` ${rawAttributes}` : ''}>`;
    return { newElement, htmlCode };
  }

  if (elementType === 'img') {
    newElement.setAttribute('src', content || '');
    newElement.setAttribute('alt', 'Rendered image');
    htmlCode = `<img src="${safeContent}" alt="Rendered image"${rawAttributes ? ` ${rawAttributes}` : ''}>`;
    return { newElement, htmlCode };
  }

  if (elementType === 'a') {
    newElement.setAttribute('href', content || '#');
    newElement.textContent = content || 'Link';
    htmlCode = `<a href="${safeContent}"${rawAttributes ? ` ${rawAttributes}` : ''}>${safeContent || 'Link'}</a>`;
    return { newElement, htmlCode };
  }

  if (elementType === 'select') {
    newElement.innerHTML = `<option>${safeContent || 'Option'}</option>`;
    htmlCode = `<select${rawAttributes ? ` ${rawAttributes}` : ''}><option>${safeContent || 'Option'}</option></select>`;
    return { newElement, htmlCode };
  }

  if (elementType === 'hr' || elementType === 'br') {
    htmlCode = `<${elementType}${rawAttributes ? ` ${rawAttributes}` : ''}>`;
    return { newElement, htmlCode };
  }

  newElement.textContent = content;
  htmlCode = `<${elementType}${rawAttributes ? ` ${rawAttributes}` : ''}>${safeContent}</${elementType}>`;
  return { newElement, htmlCode };
}

function renderHistory() {
  htmlCodeContainer.textContent = history.map((item) => item.htmlCode).join('\n');
}

renderButton.addEventListener('click', () => {
  const selectedElement = elementSelect.value;
  const content = elementContent.value.trim();
  const attributes = elementAttributes.value.trim();

  if (!selectedElement) {
    alert('Please select an element type.');
    return;
  }

  const { newElement, htmlCode } = buildTag(selectedElement, content, attributes);
  resultContainer.appendChild(newElement);
  history.push({ htmlCode, node: newElement });
  renderHistory();
  elementContent.focus();
});

undoButton.addEventListener('click', () => {
  const latest = history.pop();

  if (!latest) {
    return;
  }

  latest.node.remove();
  renderHistory();
});

clearButton.addEventListener('click', () => {
  history.length = 0;
  resultContainer.innerHTML = '';
  htmlCodeContainer.textContent = '';
});

copyButton.addEventListener('click', async () => {
  const code = htmlCodeContainer.textContent;

  if (!code.trim()) {
    return;
  }

  await navigator.clipboard.writeText(code);
  copyButton.textContent = 'Copied!';
  setTimeout(() => {
    copyButton.textContent = 'Copy';
  }, 1200);
});

downloadButton.addEventListener('click', () => {
  const code = htmlCodeContainer.textContent;

  if (!code.trim()) {
    return;
  }

  const blob = new Blob([code], { type: 'text/html' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'renderfill-output.html';
  link.click();
  URL.revokeObjectURL(downloadUrl);
});
