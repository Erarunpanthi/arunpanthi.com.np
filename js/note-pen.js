/* Lightweight, non-destructive freehand annotations for individual note pages. */
(function () {
  'use strict';
  var surface = document.querySelector('.syllabus-wrapper');
  if (!surface) return;

  var svgNS = 'http://www.w3.org/2000/svg';
  var layer = document.createElementNS(svgNS, 'svg');
  layer.setAttribute('class', 'note-pen-layer');
  layer.setAttribute('aria-hidden', 'true');
  surface.classList.add('note-pen-surface');
  surface.appendChild(layer);

  var toolbar = document.createElement('div');
  toolbar.className = 'note-pen-toolbar';
  toolbar.innerHTML = '<div class="note-pen-panel" id="note-pen-panel" hidden>' +
    '<div class="note-pen-heading">Annotate this note</div>' +
    '<div class="note-pen-row"><span class="note-pen-label">Colour</span>' +
    '<button type="button" class="note-pen-color" style="--pen-color:#e63246" data-color="#e63246" aria-label="Red" aria-pressed="true"></button>' +
    '<button type="button" class="note-pen-color" style="--pen-color:#2563eb" data-color="#2563eb" aria-label="Blue" aria-pressed="false"></button>' +
    '<button type="button" class="note-pen-color" style="--pen-color:#198754" data-color="#198754" aria-label="Green" aria-pressed="false"></button>' +
    '<button type="button" class="note-pen-color" style="--pen-color:#202124" data-color="#202124" aria-label="Black" aria-pressed="false"></button>' +
    '<button type="button" class="note-pen-color" style="--pen-color:#a12bc4" data-color="#a12bc4" aria-label="Purple" aria-pressed="false"></button></div>' +
    '<div class="note-pen-row"><label class="note-pen-label" for="note-pen-size">Size</label><input id="note-pen-size" type="range" min="1" max="12" value="3"><output for="note-pen-size">3 px</output></div>' +
    '<div class="note-pen-row"><button type="button" class="note-pen-action" data-mode="pen" aria-pressed="true">Pen</button>' +
    '<button type="button" class="note-pen-action" data-mode="eraser" aria-pressed="false">Eraser</button>' +
    '<button type="button" class="note-pen-action" data-undo disabled>Undo</button></div>' +
    '<p class="note-pen-help">Draw over the unchanged note with a mouse, pen or one finger. Scroll with the mouse wheel or two fingers. Eraser removes whole strokes. Close the tool to use links. Marks last until you leave or reload this page.</p></div>' +
    '<button type="button" class="note-pen-toggle" aria-expanded="false" aria-controls="note-pen-panel">✎ <span>Pen</span></button>';
  document.body.appendChild(toolbar);

  var panel = toolbar.querySelector('.note-pen-panel');
  var toggle = toolbar.querySelector('.note-pen-toggle');
  var size = toolbar.querySelector('#note-pen-size');
  var output = toolbar.querySelector('output');
  var undo = toolbar.querySelector('[data-undo]');
  var colors = toolbar.querySelectorAll('[data-color]');
  var modes = toolbar.querySelectorAll('[data-mode]');
  var color = '#e63246';
  var mode = 'pen';
  var strokes = [];
  var history = [];
  var active = null;
  var nextId = 0;
  var touches = new Map();
  var scrolling = false;

  function updateUndo() { undo.disabled = history.length === 0; }
  function setMode(value) {
    mode = value;
    modes.forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.mode === mode)); });
  }
  toggle.addEventListener('click', function () {
    var opening = panel.hidden;
    if (active) finish();
    touches.clear();
    scrolling = false;
    panel.hidden = !opening;
    toggle.setAttribute('aria-expanded', String(opening));
    toggle.querySelector('span').textContent = opening ? 'Done' : 'Pen';
    layer.classList.toggle('is-drawing', opening);
  });
  colors.forEach(function (button) {
    button.addEventListener('click', function () {
      color = button.dataset.color;
      colors.forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); });
      setMode('pen');
    });
  });
  modes.forEach(function (button) { button.addEventListener('click', function () { setMode(button.dataset.mode); }); });
  size.addEventListener('input', function () { output.textContent = size.value + ' px'; });

  function point(event) {
    var rect = layer.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function render(stroke) {
    var points = stroke.points;
    // A tiny segment makes a single tap visible with a round line cap.
    var d = 'M ' + points[0].x + ' ' + points[0].y;
    if (points.length === 1) d += ' l 0.01 0';
    else for (var i = 1; i < points.length; i++) d += ' L ' + points[i].x + ' ' + points[i].y;
    stroke.element.setAttribute('d', d);
  }
  function makeStroke(p) {
    var element = document.createElementNS(svgNS, 'path');
    element.setAttribute('fill', 'none');
    element.setAttribute('stroke', color);
    element.setAttribute('stroke-width', size.value);
    element.setAttribute('stroke-linecap', 'round');
    element.setAttribute('stroke-linejoin', 'round');
    var stroke = { id: nextId++, points: [p], width: Number(size.value), element: element };
    render(stroke);
    layer.appendChild(element);
    return stroke;
  }
  function distanceToSegment(p, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var length = dx * dx + dy * dy;
    var t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }
  function eraseAt(p) {
    strokes.slice().forEach(function (stroke) {
      var points = stroke.points;
      var radius = Math.max(10, Number(size.value) * 2) + stroke.width / 2;
      var hit = points.length === 1 && distanceToSegment(p, points[0], points[0]) <= radius;
      for (var i = 1; !hit && i < points.length; i++) hit = distanceToSegment(p, points[i - 1], points[i]) <= radius;
      if (hit) {
        strokes.splice(strokes.indexOf(stroke), 1);
        stroke.element.remove();
        active.removed.push(stroke);
      }
    });
  }
  function eraseBetween(a, b) {
    var distance = Math.hypot(b.x - a.x, b.y - a.y);
    var steps = Math.max(1, Math.ceil(distance / 5));
    for (var i = 1; i <= steps; i++) eraseAt({ x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps });
  }
  function finish() {
    if (!active) return;
    if (active.mode === 'pen') {
      strokes.push(active.stroke);
      history.push({ type: 'draw', stroke: active.stroke });
    } else if (active.removed.length) history.push({ type: 'erase', strokes: active.removed });
    active = null;
    updateUndo();
  }
  // When a second finger lands, discard the accidental start of a stroke (or
  // restore any erased strokes) and use the two fingers to scroll instead.
  function cancelActive() {
    if (!active) return;
    if (active.mode === 'pen') active.stroke.element.remove();
    else {
      strokes = strokes.concat(active.removed).sort(function (a, b) { return a.id - b.id; });
      strokes.forEach(function (stroke) { layer.appendChild(stroke.element); });
    }
    active = null;
  }
  layer.addEventListener('pointerdown', function (event) {
    if (event.pointerType === 'touch') {
      event.preventDefault();
      touches.set(event.pointerId, event.clientY);
      layer.setPointerCapture(event.pointerId);
      if (touches.size >= 2) {
        if (!scrolling) cancelActive();
        scrolling = true;
        return;
      }
      if (scrolling) return;
    }
    if (active || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    var p = point(event);
    active = { pointerId: event.pointerId, mode: mode, last: p, removed: [] };
    layer.setPointerCapture(event.pointerId);
    if (mode === 'pen') active.stroke = makeStroke(p);
    else eraseAt(p);
  });
  layer.addEventListener('pointermove', function (event) {
    if (event.pointerType === 'touch' && touches.has(event.pointerId)) {
      var previousY = touches.get(event.pointerId);
      touches.set(event.pointerId, event.clientY);
      if (scrolling) {
        event.preventDefault();
        // Each finger contributes half the motion; keep the remaining finger
        // inert after one lifts so it cannot leave an unintended mark.
        if (touches.size >= 2) window.scrollBy({ top: (previousY - event.clientY) / touches.size, behavior: 'instant' });
        return;
      }
    }
    if (!active || event.pointerId !== active.pointerId) return;
    event.preventDefault();
    var p = point(event);
    if (active.mode === 'pen') { active.stroke.points.push(p); render(active.stroke); }
    else eraseBetween(active.last, p);
    active.last = p;
  });
  function endPointer(event) {
    if (active && event.pointerId === active.pointerId) finish();
    if (event.pointerType === 'touch') {
      touches.delete(event.pointerId);
      if (!touches.size) scrolling = false;
    }
  }
  layer.addEventListener('pointerup', endPointer);
  layer.addEventListener('pointercancel', endPointer);
  layer.addEventListener('lostpointercapture', endPointer);
  undo.addEventListener('click', function () {
    if (active) finish();
    var action = history.pop();
    if (!action) return;
    if (action.type === 'draw') {
      var index = strokes.indexOf(action.stroke);
      if (index !== -1) strokes.splice(index, 1);
      action.stroke.element.remove();
    } else {
      strokes = strokes.concat(action.strokes).sort(function (a, b) { return a.id - b.id; });
      strokes.forEach(function (stroke) { layer.appendChild(stroke.element); });
    }
    updateUndo();
  });
}());
