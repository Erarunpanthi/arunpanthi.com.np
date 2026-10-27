/* Tiny line diff for the staging preview (no dependencies). */

function lcsMatrix(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = new Uint32Array(rows * cols);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      matrix[i * cols + j] =
        a[i] === b[j]
          ? matrix[(i + 1) * cols + j + 1] + 1
          : Math.max(matrix[(i + 1) * cols + j], matrix[i * cols + j + 1]);
    }
  }
  return { matrix, cols };
}

/**
 * Returns [{ type: 'same'|'add'|'remove', text, oldLine, newLine }].
 * Very large diffs fall back to "whole block changed".
 */
export function diffLines(oldText, newText, { maxLines = 900 } = {}) {
  const a = String(oldText ?? '').split('\n');
  const b = String(newText ?? '').split('\n');

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }

  const ops = [];
  for (let i = 0; i < start; i++) ops.push({ type: 'same', text: a[i], oldLine: i + 1, newLine: i + 1 });

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);

  if (midA.length > maxLines || midB.length > maxLines) {
    midA.forEach((line, index) => ops.push({ type: 'remove', text: line, oldLine: start + index + 1, newLine: null }));
    midB.forEach((line, index) => ops.push({ type: 'add', text: line, oldLine: null, newLine: start + index + 1 }));
  } else if (midA.length || midB.length) {
    const { matrix, cols } = lcsMatrix(midA, midB);
    let i = 0;
    let j = 0;
    while (i < midA.length && j < midB.length) {
      if (midA[i] === midB[j]) {
        ops.push({ type: 'same', text: midA[i], oldLine: start + i + 1, newLine: start + j + 1 });
        i += 1;
        j += 1;
      } else if (matrix[(i + 1) * cols + j] >= matrix[i * cols + j + 1]) {
        ops.push({ type: 'remove', text: midA[i], oldLine: start + i + 1, newLine: null });
        i += 1;
      } else {
        ops.push({ type: 'add', text: midB[j], oldLine: null, newLine: start + j + 1 });
        j += 1;
      }
    }
    while (i < midA.length) {
      ops.push({ type: 'remove', text: midA[i], oldLine: start + i + 1, newLine: null });
      i += 1;
    }
    while (j < midB.length) {
      ops.push({ type: 'add', text: midB[j], oldLine: null, newLine: start + j + 1 });
      j += 1;
    }
  }

  for (let i = endA; i < a.length; i++) {
    ops.push({
      type: 'same',
      text: a[i],
      oldLine: i + 1,
      newLine: endB + (i - endA) + 1
    });
  }
  return ops;
}

export function diffStats(ops) {
  let added = 0;
  let removed = 0;
  for (const op of ops) {
    if (op.type === 'add') added += 1;
    else if (op.type === 'remove') removed += 1;
  }
  return { added, removed, changed: added + removed };
}

/** Groups unchanged runs into single ops so previews stay compact. */
export function compactDiff(ops, { context = 3 } = {}) {
  const keep = new Set();
  ops.forEach((op, index) => {
    if (op.type === 'same') return;
    for (let i = Math.max(0, index - context); i <= Math.min(ops.length - 1, index + context); i++) keep.add(i);
  });
  const output = [];
  let skipped = 0;
  ops.forEach((op, index) => {
    if (keep.has(index)) {
      if (skipped) {
        output.push({ type: 'skip', text: `${skipped} unchanged line${skipped === 1 ? '' : 's'}` });
        skipped = 0;
      }
      output.push(op);
    } else {
      skipped += 1;
    }
  });
  if (skipped) output.push({ type: 'skip', text: `${skipped} unchanged line${skipped === 1 ? '' : 's'}` });
  return output;
}
