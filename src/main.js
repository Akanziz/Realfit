import './style.css';
import { fields, patterns } from './pattern.js';
import { createViewer } from './viewer.js';

const get = id => document.getElementById(id);
const measurements = Object.fromEntries(fields.map(([key, , value]) => [key, value]));
let viewer;
try {
  viewer = createViewer(get('scene'));
} catch (error) {
  console.error(error);
  get('viewer-error').hidden = false;
  get('pose').disabled = true;
  get('reset').disabled = true;
}

function update() {
  const size = document.querySelector('input[name=size]:checked').value;
  const pattern = patterns[size];
  get('view-label').textContent = pattern ? 'STRAIGHT DENIM · W' + size : 'BODY ONLY';
  viewer?.update(measurements, pattern);
  const room = get('room');
  room.replaceChildren();
  if (!pattern) {
    const message = document.createElement('dd');
    message.textContent = 'Select a jean size to see garment room.';
    room.append(message);
    return;
  }
  for (const [key, label] of fields) {
    if (key === 'inseam') continue;
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const value = document.createElement('dd');
    const difference = Math.round((pattern[key] - measurements[key]) * 10) / 10;
    term.textContent = label;
    value.textContent = (difference > 0 ? '+' : '') + difference.toFixed(1) + ' in';
    row.append(term, value);
    room.append(row);
  }
}

for (const [key, title, value, min, max] of fields) {
  const label = document.createElement('label');
  label.textContent = title;
  const input = document.createElement('input');
  Object.assign(input, { type: 'number', name: key, min, max, step: '0.1', value, required: true });
  input.addEventListener('input', () => {
    if (input.validity.valid) {
      measurements[key] = input.valueAsNumber;
      update();
    }
  });
  input.addEventListener('change', () => {
    if (!input.validity.valid) {
      input.reportValidity();
    }
  });
  label.append(input);
  get('fields').append(label);
}
get('measurements').addEventListener('submit', event => event.preventDefault());
document.querySelectorAll('input[name=size]').forEach(input => input.addEventListener('change', update));
get('reset').addEventListener('click', () => viewer?.reset());
get('pose').addEventListener('click', event => {
  const button = event.currentTarget;
  const bent = button.getAttribute('aria-pressed') === 'false';
  button.setAttribute('aria-pressed', String(bent));
  button.textContent = bent ? 'Stand straight' : 'Bend knees';
  viewer?.setBent(bent);
});
update();
