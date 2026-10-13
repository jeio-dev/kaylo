'use strict';

// Shared visibility rules; fences and HTML comments are examples, not records.
function visibleMarkdown(text) {
  let fence = null;
  let comment = false;
  return text.split(/\r?\n/).map(line => {
    if (fence) {
      const closing = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (closing && closing[1][0] === fence[0] && closing[1].length >= fence.length) fence = null;
      return '';
    }
    // Recognize raw openings before scanning comments: their info strings are
    // fence content too. An opening inside an existing comment stays ignored.
    const opening = !comment && line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (opening && (opening[1][0] !== '`' || !opening[2].includes('`'))) {
      fence = opening[1];
      return '';
    }
    let visible = '';
    let rest = line;
    while (rest.length) {
      const delimiter = comment ? '-->' : '<!--';
      const offset = rest.indexOf(delimiter);
      if (offset < 0) { if (!comment) visible += rest; break; }
      if (!comment) visible += rest.slice(0, offset);
      rest = rest.slice(offset + delimiter.length);
      comment = !comment;
    }
    return visible;
  }).join('\n');
}

module.exports = { visibleMarkdown };
