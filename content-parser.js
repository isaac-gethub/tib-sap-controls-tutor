// ============================================================================
// TIB Self-Study Content Parser — SHARED between the Word manual generator
// and the standalone console.
//
// Works in both environments without a bundler:
//   - Node (CommonJS):  const { parseBodyMarkdown } = require('./content-parser.js');
//   - Browser (script tag):  <script src="content-parser.js"></script>
//                             then use the global ContentParser.parseBodyMarkdown(...)
// ============================================================================

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ContentParser = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {

  function splitColumns(line) {
    return line.split(/ {2,}/).map(s => s.trim());
  }

  function isPipeBox(lines) {
    const content = lines.filter(l => l.trim());
    return content.length > 0 && content.every(l => l.trim().startsWith("|"));
  }

  function cleanPipeBox(lines) {
    return lines
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => l.replace(/^\|/, "").replace(/\|$/, "").trim())
      .filter(Boolean)
      .join(" ");
  }

  function isTabular(lines) {
    const content = lines.filter(l => l.trim());
    if (content.length < 2) return false;
    const withCols = content.filter(l => / {2,}/.test(l.trim()));
    return withCols.length >= Math.ceil(content.length * 0.5);
  }

  function isCaseStudyTitle(lines) {
    const content = lines.filter(l => l.trim());
    if (content.length === 0 || content.length > 4) return false;
    return /^CASE STUDY/i.test(content[0].trim()) && !isTabular(lines);
  }

  function isBulletList(lines) {
    const content = lines.filter(l => l.trim());
    if (content.length < 2) return false;
    const bulletish = content.filter(l => /^-\s+/.test(l.trim()));
    return bulletish.length >= Math.max(2, content.length * 0.4);
  }

  function isWeekOrPhaseLine(line) {
    return /^(Week \d+|Phase \d+|PHASE \d+)/.test(line.trim());
  }

  function detectColumnStarts(firstLine) {
    const starts = [0];
    const re = / {2,}(?=\S)/g;
    let m;
    while ((m = re.exec(firstLine)) !== null) {
      starts.push(m.index + m[0].length);
    }
    return starts;
  }

  function sliceAtColumns(line, starts) {
    const parts = [];
    for (let i = 0; i < starts.length; i++) {
      const start = starts[i];
      const end = i + 1 < starts.length ? starts[i + 1] : line.length;
      parts.push((line.slice(start, end) || "").trim());
    }
    return parts;
  }

  function parseTableRows(lines) {
    const nonEmpty = lines.filter(l => l.trim());
    if (nonEmpty.length === 0) return [];
    const baseIndent = Math.min(...nonEmpty.map(l => l.match(/^ */)[0].length));
    const normalized = nonEmpty.map(l => l.slice(baseIndent));

    const colStarts = detectColumnStarts(normalized[0]);
    const rows = [];
    let current = null;

    for (const raw of normalized) {
      const sliced = sliceAtColumns(raw, colStarts);
      const firstColHasText = sliced[0].length > 0;
      const looksLikeWrappedLabel = firstColHasText && colStarts.length >= 2 && sliced[1].length === 0;
      const lastColEmpty = current && colStarts.length >= 2 && sliced[sliced.length - 1].length === 0;
      if (current && (!firstColHasText || looksLikeWrappedLabel || lastColEmpty)) {
        for (let i = 0; i < sliced.length && i < current.length; i++) {
          if (sliced[i]) current[i] = (current[i] + " " + sliced[i]).trim();
        }
      } else {
        current = sliced;
        rows.push(current);
      }
    }

    const merged = [];
    for (const row of rows) {
      const nonEmptyCells = row.filter(c => c);
      if (merged.length > 0 && nonEmptyCells.length === 1 && nonEmptyCells[0] === row[0] && row[0].split(/\s+/).length <= 3) {
        merged[merged.length - 1][0] = (merged[merged.length - 1][0] + " " + row[0]).trim();
      } else {
        merged.push(row);
      }
    }
    return merged;
  }

  function parseBulletList(lines) {
    const items = [];
    let currentText = "";
    let leadIn = null;
    let started = false;
    for (const raw of lines) {
      const t = raw.trim();
      if (!t) continue;
      if (/^-\s+/.test(t)) {
        started = true;
        if (currentText) items.push(currentText.trim());
        currentText = t.replace(/^-\s+/, "");
      } else if (!started) {
        leadIn = (leadIn ? leadIn + " " : "") + t;
      } else {
        currentText += " " + t;
      }
    }
    if (currentText) items.push(currentText.trim());
    return { lead: leadIn, items };
  }

  function parseBodyMarkdown(md) {
    if (!md) return [];
    const blocks = md.split(/\n\s*\n/);
    const result = [];

    for (let idx = 0; idx < blocks.length; idx++) {
      const block = blocks[idx];
      const lines = block.split("\n");
      if (!block.trim()) continue;

      if (isPipeBox(lines)) {
        result.push({ type: "callout", text: cleanPipeBox(lines) });
      } else if (isCaseStudyTitle(lines)) {
        result.push({ type: "casestudy", text: lines.map(l => l.trim()).filter(Boolean).join(" ") });
      } else if (isTabular(lines)) {
        const groupLines = lines.slice();
        const groupFirstLine = lines.find(l => l.trim());
        let groupStarts = detectColumnStarts(groupFirstLine);
        let j = idx + 1;
        while (j < blocks.length) {
          const nextBlock = blocks[j];
          if (!nextBlock.trim()) { j++; continue; }
          const nextLines = nextBlock.split("\n");
          if (isPipeBox(nextLines) || isCaseStudyTitle(nextLines)) break;
          if (!isTabular(nextLines)) break;
          const nextFirstLine = nextLines.find(l => l.trim());
          const ownStarts = detectColumnStarts(nextFirstLine);
          const groupEmpty = sliceAtColumns(nextFirstLine, groupStarts).slice(1).filter(c => !c).length;
          const ownEmpty = sliceAtColumns(nextFirstLine, ownStarts).slice(1).filter(c => !c).length;
          if (groupEmpty > ownEmpty) break;
          groupLines.push(...nextLines);
          j++;
        }
        idx = j - 1;
        const rows = parseTableRows(groupLines);
        if (rows.length) {
          result.push({ type: "table", rows });
        }
      } else if (isBulletList(lines)) {
        const { lead, items } = parseBulletList(lines);
        result.push({ type: "bullets", lead, items });
      } else {
        const joined = block.split("\n").map(l => l.trim()).filter(Boolean).join(" ");
        if (isWeekOrPhaseLine(joined)) {
          result.push({ type: "weekphase", text: joined });
        } else {
          result.push({ type: "paragraph", text: joined });
        }
      }
    }
    return result;
  }

  return {
    parseBodyMarkdown,
    _internal: { splitColumns, isPipeBox, cleanPipeBox, isTabular, isCaseStudyTitle, isBulletList, isWeekOrPhaseLine, detectColumnStarts, sliceAtColumns, parseTableRows, parseBulletList },
  };
});
