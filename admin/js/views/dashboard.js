import {
  h,
  icon,
  pageHead,
  statCard,
  badge,
  timeAgo,
  notice
} from '../ui.js';
import {
  state,
  treeFiles,
  htmlPages,
  stagedCount,
  siteUrl,
  repoLabel,
  branchName,
  publishDefault
} from '../store.js';
import * as api from '../api.js';
import { parseCaTests } from '../lib/ca-tests.js';
import { adToBs, formatBsEn, keyOf } from '../lib/bs-date.js';

function firstName(user) {
  const name = user.name || user.login || 'there';
  return name.split(/\s+/)[0];
}

function isImage(path) {
  return /\.(png|jpe?g|webp|gif|svg|avif|ico|bmp)$/i.test(path);
}

function practiceTests() {
  const dir = state.config.paths.practiceTestDir;
  return treeFiles().filter((file) => file.path.startsWith(dir + '/') && /\.html?$/i.test(file.path) && !/index\.html$/i.test(file.path));
}

function quickAction(iconName, title, description, onClick) {
  return h(
    'button',
    { class: 'quick-action', type: 'button', onClick },
    h('span', { class: 'qa-icon' }, icon(iconName, 19)),
    h('span', null, h('strong', null, title), h('span', null, description))
  );
}

function commitRow(commit) {
  return h(
    'div',
    { class: 'timeline-item' },
    h('span', { class: 'timeline-dot' }, icon('branch', 14)),
    h(
      'div',
      { class: 'timeline-body' },
      h('strong', { title: commit.message }, commit.message || '(no message)'),
      h(
        'span',
        null,
        `${commit.author?.name || commit.author?.login || 'Unknown'} · ${timeAgo(commit.author?.date)} · ${commit.shortSha}`
      )
    ),
    h(
      'a',
      { class: 'icon-btn', href: commit.htmlUrl, target: '_blank', rel: 'noopener', title: 'Open on GitHub' },
      icon('external', 15)
    )
  );
}

export async function render(root, ctx) {
  const user = state.user || {};
  const repo = state.health?.repo || state.config.repo;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const files = treeFiles();
  const pages = htmlPages();
  const images = files.filter((file) => isImage(file.path));
  const tests = practiceTests();
  const pending = stagedCount();

  root.append(
    pageHead(`${greeting}, ${firstName(user)}`, 'Here is what is happening on your website.', [
      h('button', { class: 'btn', type: 'button', onClick: () => ctx.navigate('current-affairs') }, icon('calendar', 16), 'Weekly test'),
      h('button', { class: 'btn btn-primary', type: 'button', onClick: () => ctx.navigate('uploads') }, icon('upload', 16), 'Upload files')
    ])
  );

  if (state.health?.dryRun) {
    root.append(notice(h('div', null, h('strong', null, 'Dry run mode is on. '), 'Publishing is simulated so you can explore safely.'), 'warn', 'alert'));
    root.append(h('div', { style: 'height:10px' }));
  }
  if (pending) {
    root.append(
      h(
        'div',
        { class: 'notice brand', style: 'margin-bottom:16px' },
        icon('send', 18),
        h(
          'div',
          { class: 'row-between grow' },
          h('span', null, h('strong', null, `${pending} change${pending === 1 ? '' : 's'} waiting. `), 'Review the diff, then publish when you are ready.'),
          h('button', { class: 'btn btn-sm', type: 'button', onClick: () => ctx.openPublish() }, 'Publish now', icon('arrow-right', 14))
        )
      )
    );
  }

  const caCard = statCard({ label: 'Weekly CA sets', value: '…', sub: 'Loading question bank', iconName: 'calendar' });
  const commitCard = statCard({ label: 'Last publish', value: '…', sub: 'Loading history', iconName: 'clock' });

  const stats = h(
    'div',
    { class: 'stats-grid' },
    statCard({
      label: 'Pending changes',
      value: String(pending),
      sub: pending ? 'Ready to publish' : 'All caught up',
      iconName: 'send'
    }),
    statCard({ label: 'HTML pages', value: String(pages.length), sub: 'Public pages in the repo', iconName: 'file-text' }),
    statCard({ label: 'Practice tests', value: String(tests.length), sub: 'Timed sets', iconName: 'book' }),
    caCard,
    statCard({ label: 'Images', value: String(images.length), sub: 'Photos and illustrations', iconName: 'image' }),
    commitCard
  );
  root.append(stats);
  root.append(h('div', { style: 'height:20px' }));

  root.append(
    h(
      'div',
      { class: 'stack' },
      h(
        'section',
        { class: 'card' },
        h('div', { class: 'card-head' }, h('h3', { class: 'panel-title' }, icon('sparkles', 17), 'Quick actions')),
        h(
          'div',
          { class: 'card-body' },
          h(
            'div',
            { class: 'quick-grid' },
            quickAction('calendar', 'New weekly test', 'Wednesday current affairs set', () => ctx.navigate('current-affairs')),
            quickAction('book', 'New practice test', 'Create a timed subject set', () => ctx.navigate('practice-tests')),
            quickAction('upload', 'Upload files', 'Images, PDFs and documents', () => ctx.navigate('uploads')),
            quickAction('edit', 'Edit page text', 'Headings and paragraphs', () => ctx.navigate('pages', { path: 'index.html' })),
            quickAction('search', 'Improve SEO', 'Titles, descriptions, previews', () => ctx.navigate('seo')),
            quickAction('layers', 'Navigation', 'Navbar, social and footer', () => ctx.navigate('navigation'))
          )
        )
      ),
      h(
        'div',
        { class: 'split-lines', style: 'display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,0.85fr);gap:16px;align-items:start' },
        h(
          'section',
          { class: 'card' },
          h(
            'div',
            { class: 'card-head' },
            h('h3', { class: 'panel-title' }, icon('clock', 17), 'Recent changes'),
            h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onClick: () => ctx.navigate('history') }, 'All history', icon('arrow-right', 14))
          ),
          h('div', { class: 'card-body' }, h('div', { class: 'timeline', id: 'recent-commits' }, h('div', { class: 'muted small' }, 'Loading recent commits…')))
        ),
        h(
          'div',
          { class: 'stack' },
          h(
            'section',
            { class: 'card' },
            h('div', { class: 'card-head' }, h('h3', { class: 'panel-title' }, icon('server', 17), 'Site & deployment')),
            h(
              'div',
              { class: 'card-body stack-sm' },
              h('div', { class: 'kv' }, h('span', null, 'Repository'), h('span', { class: 'mono' }, repoLabel())),
              h('div', { class: 'kv' }, h('span', null, 'Branch'), h('span', { class: 'mono' }, branchName())),
              h('div', { class: 'kv' }, h('span', null, 'Publish mode'), h('span', null, publishDefault() === 'pr' ? 'Pull request' : 'Direct commit')),
              h('div', { class: 'kv' }, h('span', null, 'Pages'), h('span', { id: 'pages-status' }, 'Checking…')),
              h('div', { class: 'kv' }, h('span', null, 'Website'), h('a', { href: siteUrl(), target: '_blank', rel: 'noopener' }, siteUrl().replace(/^https?:\/\//, ''), icon('external', 12))),
              h(
                'div',
                { class: 'row-wrap', style: 'margin-top:6px' },
                h('a', { class: 'btn btn-sm', href: `https://github.com/${repo.owner}/${repo.name}`, target: '_blank', rel: 'noopener' }, icon('external', 14), 'Repository'),
                h('button', { class: 'btn btn-sm', type: 'button', onClick: () => ctx.navigate('settings') }, icon('settings', 14), 'Settings')
              )
            )
          ),
          h(
            'section',
            { class: 'card' },
            h('div', { class: 'card-head' }, h('h3', { class: 'panel-title' }, icon('check-circle', 17), 'Checks')),
            h('div', { class: 'card-body stack-sm', id: 'checks-body' }, h('div', { class: 'muted small' }, 'Running checks…'))
          )
        )
      ),
      h(
        'section',
        { class: 'card' },
        h('div', { class: 'card-head' }, h('h3', { class: 'panel-title' }, icon('info', 17), 'How the admin panel works')),
        h(
          'div',
          { class: 'card-body' },
          h(
            'div',
            { class: 'quick-grid' },
            h('div', null, h('strong', { class: 'small' }, '1 · Edit'), h('p', { class: 'small muted' }, 'Change anything — text, tests, images, code. Every edit becomes a draft.')),
            h('div', null, h('strong', { class: 'small' }, '2 · Review'), h('p', { class: 'small muted' }, 'Open Pending changes to see a line-by-line diff of exactly what will be published.')),
            h('div', null, h('strong', { class: 'small' }, '3 · Publish'), h('p', { class: 'small muted' }, 'One click commits to GitHub. Pages rebuilds the site automatically in about a minute.')),
            h('div', null, h('strong', { class: 'small' }, 'Safety net'), h('p', { class: 'small muted' }, 'Prefer review? Flip publish mode to a pull request and merge it when ready.'))
          )
        )
      )
    )
  );

  /* ---------------- async data ---------------- */

  const commitsBox = root.querySelector('#recent-commits');
  const pagesStatus = root.querySelector('#pages-status');
  const checksBody = root.querySelector('#checks-body');

  api
    .getCommits({ perPage: 6 })
    .then((data) => {
      const commits = data.commits || [];
      if (!commits.length) {
        commitsBox.replaceChildren(h('div', { class: 'muted small' }, 'No commits yet.'));
        return;
      }
      commitsBox.replaceChildren(...commits.map(commitRow));
      const last = commits[0];
      commitCard.querySelector('.stat-value').textContent = last.shortSha;
      commitCard.querySelector('.stat-sub').textContent = timeAgo(last.author?.date);
    })
    .catch((error) => {
      commitsBox.replaceChildren(h('div', { class: 'notice warn' }, icon('alert', 16), error.message));
      commitCard.querySelector('.stat-value').textContent = '—';
      commitCard.querySelector('.stat-sub').textContent = 'History unavailable';
    });

  api
    .getPagesStatus()
    .then((status) => {
      if (!status.available) {
        pagesStatus.replaceChildren(badge('Not exposed', ''));
        return;
      }
      pagesStatus.replaceChildren(
        badge(status.status === 'built' ? 'Built' : status.status || 'Unknown', status.status === 'built' ? 'brand' : 'warn')
      );
    })
    .catch(() => pagesStatus.replaceChildren(badge('Unknown', '')));

  const checks = [];
  checks.push({
    tone: 'ok',
    icon: 'check-circle',
    text: `Connected to ${repoLabel()} · ${files.length} files`
  });
  if (pending) checks.push({ tone: 'warn', icon: 'send', text: `${pending} unpublished change${pending === 1 ? '' : 's'}` });
  else checks.push({ tone: 'ok', icon: 'check', text: 'No unpublished changes' });

  api
    .fileText(state.config.paths.currentAffairs)
    .then((file) => {
      const parsed = parseCaTests(file.text);
      const dates = Object.keys(parsed.tests).sort();
      const latest = dates[dates.length - 1];
      caCard.querySelector('.stat-value').textContent = String(dates.length);
      caCard.querySelector('.stat-sub').textContent = latest ? `Latest: ${formatBsEn({ year: +latest.slice(0, 4), month: +latest.slice(5, 7), day: +latest.slice(8, 10) })}` : 'No sets yet';

      const today = new Date();
      const lastWednesday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      while (lastWednesday.getDay() !== 3) lastWednesday.setDate(lastWednesday.getDate() - 1);
      const bs = adToBs(lastWednesday);
      const key = bs ? keyOf(bs) : null;
      if (key && !parsed.tests[key]) {
        checks.push({
          tone: 'warn',
          icon: 'calendar',
          text: `This Wednesday's current affairs set (${formatBsEn(bs)}) is not written yet`
        });
      } else if (key) {
        checks.push({ tone: 'ok', icon: 'calendar', text: `This week's current affairs set is ready` });
      }
      const errors = parsed.issues.filter((issue) => issue.level === 'error');
      checks.push(
        errors.length
          ? { tone: 'warn', icon: 'alert', text: `${errors.length} question-bank issue${errors.length === 1 ? '' : 's'}` }
          : { tone: 'ok', icon: 'check', text: 'Question bank validates cleanly' }
      );
      renderChecks();
    })
    .catch(() => {
      caCard.querySelector('.stat-value').textContent = '—';
      caCard.querySelector('.stat-sub').textContent = 'Could not load tests.js';
      checks.push({ tone: 'warn', icon: 'alert', text: 'Could not read the current affairs file' });
      renderChecks();
    });

  function renderChecks() {
    checksBody.replaceChildren(
      ...checks.map((check) =>
        h(
          'div',
          { class: 'row', style: 'align-items:flex-start' },
          h('span', { style: `color:${check.tone === 'ok' ? 'var(--brand-2)' : 'var(--warn)'};display:inline-flex;margin-top:1px` }, icon(check.icon, 15)),
          h('span', { class: 'small' }, check.text)
        )
      )
    );
  }
  renderChecks();
}
