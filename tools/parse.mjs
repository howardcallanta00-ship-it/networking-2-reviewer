// Parse ITExamAnswers.net CCNA 2 v7 MHTML saves into site/data/questions.json
// and extract embedded exhibit images into site/img/.
//
// Usage: node tools/parse.mjs <file.mhtml> [<file.mhtml> ...]
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { readMhtml } from './mhtml.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const IMG_DIR = join(SITE, 'img');
mkdirSync(IMG_DIR, { recursive: true });
mkdirSync(join(SITE, 'data'), { recursive: true });

const GROUPS = [
  { id: 'm1-4', range: 'Modules 1–4', name: 'Switching Concepts, VLANs, and InterVLAN Routing', match: /modules-1-4/ },
  { id: 'm5-6', range: 'Modules 5–6', name: 'Redundant Networks', match: /modules-5-6/ },
  { id: 'm7-9', range: 'Modules 7–9', name: 'Available and Reliable Networks', match: /modules-7-9/ },
  { id: 'm10-13', range: 'Modules 10–13', name: 'L2 Security and WLANs', match: /modules-10-13/ },
  { id: 'm14-16', range: 'Modules 14–16', name: 'Routing Concepts and Configuration', match: /modules-14-16/ },
];

const CHOOSE = { two: 2, three: 3, four: 4, five: 5 };
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };

// A line that looks like router/switch CLI (prompt or a config command).
const CLI_RE = /^(\S+(\(config[^)]*\))?[#>]\s*\S|interface\s|int\s|ip\s|ipv6\s|no\s|switchport|show\s|vlan\s|router\s|network\s|hostname|enable\b|line\s|password|login|spanning-tree|channel-group|encapsulation|description|shutdown|exit|end\b|access-list|service\s|banner|crypto|username|transport|default-router|dns-server|logging|clock|copy\s|ping\s|traceroute|duplex|speed|mdix|standby|wlan|radius|aaa\s|dot1x|snmp|ntp|domain-name|mls|lldp|cdp|S\d|R\d)/;
// Routing-table / show-command output lines.
const OUT_RE = /^(Gateway of last resort|Codes:|[CSLORDBEI]\*?(\s+(L1|L2|IA|E1|E2|EX))?\s+\S*\d|\S+ is (variably |variously )?subnetted|\d+\.\d+\.\d+\.\d+\/\d+ is|\[\d+\/\d+\] via|Interface\s+IP-Address|Vlan\d|Fa\d|Gi\d|Port\s|VLAN\s+Name|---)/;

function cleanLines(text) {
  return text
    .replace(/ /g, ' ')
    .split('\n')
    .map(l => l.replace(/[ \t]+/g, ' ').trim())
    .filter(l => l !== '')
    .join('\n')
    .trim();
}

// Text of a cheerio node, turning <br> and block boundaries into newlines.
function textOf($, el) {
  const c = $(el).clone();
  c.find('br').replaceWith('\n');
  c.find('p, div, li').each((_, e) => { $(e).append('\n'); });
  c.find('.ca-copy-btn, button, svg').remove();
  return cleanLines(c.text());
}

function looksLikeCode(text) {
  const lines = text.split('\n').filter(Boolean);
  if (lines.length === 1) {
    const l = lines[0];
    return (CLI_RE.test(l) || OUT_RE.test(l)) && l.length < 90 && !/[?.]$/.test(l) && !/^(Refer|Which|What|How|Why|When)\b/.test(l);
  }
  const cli = lines.filter(l => CLI_RE.test(l) || OUT_RE.test(l)).length;
  return cli / lines.length >= 0.6;
}

function mergeCode(blocks) {
  const out = [];
  for (const b of blocks) {
    const prev = out[out.length - 1];
    if (b.type === 'code' && prev && prev.type === 'code') prev.text += '\n' + b.text;
    else out.push(b);
  }
  return out;
}

function parseExplanation($, box) {
  const text = textOf($, box).replace(/^Explanation:\s*/i, '');
  const m = text.match(/^(?:Topic|Section)s?\s*([\d.]+(?:\s*[,&]\s*[\d.]+)*)\s*\n?/i);
  return { topic: m ? m[1].replace(/\s+/g, '') : null, text: cleanLines(m ? text.slice(m[0].length) : text) };
}

const report = [];
const all = [];
const imageStats = { embedded: 0, missing: 0 };

for (const file of process.argv.slice(2)) {
  const { html, url, resources } = readMhtml(file);
  const group = GROUPS.find(g => g.match.test(url));
  if (!group) { console.error('Unknown page', url); continue; }

  const $ = load(html);
  const root = $('.thecontent').first();
  root.find('.fs-iai, [data-freestar-ad], script, style, ins, iframe, noscript, .ca-copy-btn, .wp-caption-text, figcaption, .cbc-code-bar, button').remove();
  const content = root.html();

  // Find question starts: <strong>N. ... (or <b>) with N increasing.
  // The source skips a number now and then, so allow small gaps.
  const starts = [];
  const re = /<(?:strong|b)>\s*(\d+)\.\s/g;
  let m, last = 0;
  while ((m = re.exec(content))) {
    const n = Number(m[1]);
    if (n > last && n <= last + 3) { starts.push({ n, at: m.index }); last = n; }
  }

  starts.forEach((s, i) => {
    const chunk = content.slice(s.at, i + 1 < starts.length ? starts[i + 1].at : undefined);
    const $c = load('<div id="r">' + chunk + '</div>');
    const r = $c('#r');
    const id = `${group.id}-q${s.n}`;

    const qStrong = r.find('strong, b').first();
    let question = textOf($c, qStrong).replace(/^\d+\.\s*/, '');
    qStrong.remove();

    const boxes = r.find('.message_box');
    let explanation = null;
    if (boxes.length) {
      explanation = parseExplanation($c, boxes.first());
      boxes.remove();
    }

    // Walk remaining nodes in order.
    const blocks = [];
    let buf = '';
    let red = false;
    const flush = () => {
      const t = cleanLines(buf);
      if (t) blocks.push({ type: 'text', text: t, red });
      buf = ''; red = false;
    };
    const walk = (node) => {
      if (node.type === 'text') { buf += node.data; return; }
      if (node.type !== 'tag') return;
      const tag = node.name;
      if (tag === 'br') { buf += '\n'; return; }
      if (tag === 'img') {
        flush();
        const src = $c(node).attr('data-src') || $c(node).attr('data-lazy-src') || $c(node).attr('src');
        if (src && /wp-content\/uploads/.test(src)) blocks.push({ type: 'img', src });
        return;
      }
      if (tag === 'ul' || tag === 'ol') {
        flush();
        const items = $c(node).children('li').map((_, li) => ({
          text: textOf($c, li),
          correct: $c(li).hasClass('correct_answer') || $c(li).find('[style*="ff0000"]').length > 0,
        })).get();
        blocks.push({ type: 'list', items });
        return;
      }
      if (tag === 'pre') { flush(); blocks.push({ type: 'code', text: cleanLines($c(node).text()) }); return; }
      if (tag === 'table') {
        flush();
        const rows = $c(node).find('tr').map((_, tr) => [$c(tr).find('td,th').map((_, td) => textOf($c, td)).get()]).get();
        blocks.push({ type: 'table', rows });
        return;
      }
      const block = /^(p|div|h\d|figure|blockquote|section)$/.test(tag);
      if (block) flush();
      if (tag === 'p' && $c(node).find('[style*="ff0000"]').length) {
        red = $c(node).find('[style*="ff0000"]').map((_, e) => textOf($c, e)).get();
      }
      for (const ch of node.children || []) walk(ch);
      if (block) flush();
    };
    for (const ch of r.get(0).children) walk(ch);
    flush();

    // Drop page clutter: Packet Tracer download widgets and copy labels.
    for (let j = blocks.length - 1; j >= 0; j--) {
      const b = blocks[j];
      if (b.type !== 'text') continue;
      if (/^\d+ file\(s\)\s+[\d.,]+\s*[KMG]B$/i.test(b.text)) {
        blocks.splice(j, 1);
        const prev = blocks[j - 1];
        if (prev && prev.type === 'text' && !/[?.:]$/.test(prev.text)) blocks.splice(j - 1, 1);
      } else if (/^(Download|Copy)$/i.test(b.text)) blocks.splice(j, 1);
    }

    let optIdx = blocks.findIndex(b => b.type === 'list' && b.items.length >= 2);
    let options = optIdx >= 0 ? blocks[optIdx].items : [];
    let before = optIdx >= 0 ? blocks.slice(0, optIdx) : blocks;
    let after = optIdx >= 0 ? blocks.slice(optIdx + 1) : [];
    // Fallback: options written as separate paragraphs, the answer in red.
    if (optIdx < 0 && blocks.some(b => b.type === 'text' && b.red)) {
      const first = blocks.findIndex(b => b.type === 'text');
      let last = first;
      while (last + 1 < blocks.length && blocks[last + 1].type === 'text') last++;
      const run = blocks.slice(first, last + 1);
      if (run.length === 1 && run[0].text.includes('\n')) {
        // All options in one paragraph, one per line, the answer line in red.
        const redLines = run[0].red || [];
        options = run[0].text.split('\n').map(l => ({ text: l, correct: redLines.includes(l) }));
      } else {
        options = run.map(b => ({ text: b.text, correct: !!b.red }));
      }
      before = blocks.slice(0, first);
      after = blocks.slice(last + 1);
    }
    for (const b of [...before, ...after]) delete b.red;

    // Images -> files
    const toImage = (b, k) => {
      const res = resources.get(b.src);
      if (res && EXT[res.type]) {
        const name = `${id}-${k}.${EXT[res.type]}`;
        writeFileSync(join(IMG_DIR, name), res.buf);
        imageStats.embedded++;
        return { src: `img/${name}` };
      }
      imageStats.missing++;
      return { src: null, remote: b.src };
    };
    let k = 0;
    const stem = mergeCode(before.map(b => {
      if (b.type === 'img') return { type: 'img', ...toImage(b, ++k) };
      if (b.type === 'text' && looksLikeCode(b.text)) return { type: 'code', text: b.text };
      return b;
    }));
    const extra = after.map(b => (b.type === 'img' ? { type: 'img', ...toImage(b, ++k) } : b));

    // Some routing-table questions start with the first output line in bold,
    // and the real question comes after the table: move it back into place.
    if (OUT_RE.test(question)) {
      const qi = stem.findIndex(b => b.type === 'text' && /\?$/.test(b.text));
      if (qi >= 0) {
        const code = stem.find(b => b.type === 'code');
        if (code) code.text = question + '\n' + code.text;
        else stem.unshift({ type: 'code', text: question });
        question = stem.splice(qi, 1)[0].text;
      }
    }

    const choose = (question.match(/\(Choose (two|three|four|five)\.?\)/i) || [])[1];
    const correctCount = options.filter(o => o.correct).length;
    let kind = 'single';
    if (options.length === 0) kind = /match|drag|order|place/i.test(question) ? 'match' : 'statement';
    else if (correctCount === 0 && /order|sequence|place the/i.test(question)) kind = 'order';
    else if (choose || correctCount > 1) kind = 'multi';

    const q = {
      id, group: group.id, num: s.n, kind, question,
      stem, options, extra,
      choose: choose ? CHOOSE[choose.toLowerCase()] : (kind === 'multi' ? correctCount : kind === 'single' ? 1 : 0),
      topic: explanation?.topic ?? null,
      original: explanation?.text ?? null,
      source: url,
    };
    all.push(q);

    const issues = [];
    if (kind === 'single' && correctCount !== 1) issues.push(`single-answer question has ${correctCount} marked correct`);
    if (kind === 'multi' && correctCount !== q.choose) issues.push(`asks for ${q.choose} but ${correctCount} marked correct`);
    if (kind === 'match' && !extra.concat(stem).some(b => b.type === 'img')) issues.push('matching question without answer image');
    if (kind === 'statement') issues.push('no options (shown as a fact to review)');
    if (!explanation || !explanation.text) issues.push('no explanation text');
    if ([...stem, ...extra].some(b => b.type === 'img' && !b.src)) issues.push('image not saved in MHTML');
    if (issues.length) report.push(`${id}: ${issues.join('; ')}`);
  });
  console.log(`${group.id}: ${starts.length} questions`);
}

const groups = GROUPS.map(({ match, ...g }) => ({
  ...g,
  source: all.find(q => q.group === g.id)?.source ?? null,
  count: all.filter(q => q.group === g.id).length,
}));

// Merge improved explanations if present.
// Rewritten explanations live in site/data/explain/<group>.json, keyed by question id.
const expl = {};
for (const g of GROUPS) {
  const p = join(SITE, 'data', 'explain', `${g.id}.json`);
  if (existsSync(p)) Object.assign(expl, JSON.parse(readFileSync(p, 'utf8')));
}
for (const q of all) if (expl[q.id]) q.explain = expl[q.id];
const missingExpl = all.filter(q => !q.explain).length;

writeFileSync(join(SITE, 'data', 'questions.json'), JSON.stringify({ generated: new Date().toISOString(), groups, questions: all }, null, 1));
writeFileSync(join(ROOT, 'tools', 'parse-report.txt'), report.join('\n') + '\n');
console.log(`total ${all.length}; images embedded ${imageStats.embedded}, missing ${imageStats.missing}; improved explanations missing ${missingExpl}`);
console.log(`${report.length} questions flagged — see tools/parse-report.txt`);
