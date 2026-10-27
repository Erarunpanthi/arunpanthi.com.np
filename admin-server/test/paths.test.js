import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extensionOf,
  isAllowedUploadName,
  isForbiddenRepoPath,
  normalizeRepoPath,
  publicUrlFor,
  slugifyFileName
} from '../lib/paths.js';

test('normalizeRepoPath accepts repository paths', () => {
  assert.equal(normalizeRepoPath('index.html'), 'index.html');
  assert.equal(normalizeRepoPath('/Psc-preparation/Test/1.1-1.html'), 'Psc-preparation/Test/1.1-1.html');
  assert.equal(normalizeRepoPath('Photos/Er.Arunpanthi.jpg'), 'Photos/Er.Arunpanthi.jpg');
  assert.equal(normalizeRepoPath('  partials/navbar.html  '), 'partials/navbar.html');
  assert.equal(normalizeRepoPath('folder\\file name.md'), 'folder/file name.md');
  assert.equal(normalizeRepoPath('नेपाल/नोट्स.html'), 'नेपाल/नोट्स.html');
});

test('normalizeRepoPath rejects traversal and unsafe paths', () => {
  for (const bad of [
    '../secrets.txt',
    'folder/../../etc/passwd',
    'folder//file.html',
    '.git/config',
    'sub/.git/hooks',
    '/',
    '',
    null,
    42,
    'a'.repeat(200) + '.html',
    'folder/\u0000file.html',
    'CON',
    'folder/aux.txt'
  ]) {
    assert.equal(normalizeRepoPath(bad), null, `expected null for ${String(bad)}`);
  }
});

test('forbidden paths protect backend internals', () => {
  assert.equal(isForbiddenRepoPath('admin-server/.env'), true);
  assert.equal(isForbiddenRepoPath('.env'), true);
  assert.equal(isForbiddenRepoPath('.git/config'), true);
  assert.equal(isForbiddenRepoPath('node_modules/x/index.js'), true);
  assert.equal(isForbiddenRepoPath('admin/index.html'), false);
  assert.equal(isForbiddenRepoPath('index.html'), false);
});

test('uploads keep their extension and become URL-safe', () => {
  assert.equal(slugifyFileName('My Photo (1).JPG'), 'My-Photo-1.jpg');
  assert.equal(slugifyFileName('परीक्षा नोट.pdf'), 'परीक्षा-नोट.pdf');
  assert.equal(slugifyFileName('???'), 'file');
  assert.equal(slugifyFileName('notes.final.v2.pdf'), 'notes.final.v2.pdf');
  assert.equal(extensionOf('Resources/Past-Questions/x.PDF'), '.pdf');
  assert.equal(isAllowedUploadName('Photos/a.png'), true);
  assert.equal(isAllowedUploadName('files/setup.exe'), false);
});

test('publicUrlFor encodes segments but keeps slashes', () => {
  assert.equal(
    publicUrlFor('https://arunpanthi.com.np/', 'Photos/Er.Arunpanthi.jpg'),
    'https://arunpanthi.com.np/Photos/Er.Arunpanthi.jpg'
  );
  assert.equal(
    publicUrlFor('https://arunpanthi.com.np', 'folder/My Photo.jpg'),
    'https://arunpanthi.com.np/folder/My%20Photo.jpg'
  );
});
