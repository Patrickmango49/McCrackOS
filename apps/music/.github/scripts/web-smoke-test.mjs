import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve('web');
const videoId = 'dQw4w9WgXcQ';
const mockSong = {
  videoId,
  title: 'Smoke Test Song',
  uploaderName: 'Test Artist',
  thumbnail: 'https://artwork.test/apple-artwork.jpg',
  duration: 180,
  url: `https://www.youtube.com/watch?v=${videoId}`
};
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!target.startsWith(root + path.sep) && target !== root) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(target, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));
let browser;
const failures = [];
try {
  browser = await chromium.launch({ headless: true });
  for (const [file, viewport] of [
    ['index.html', { width: 1280, height: 800 }],
    ['mobile.html', { width: 390, height: 844 }],
    ['standalone.html', { width: 1280, height: 800 }]
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(`${file}: page error: ${error.message}`));

    await page.route('https://pipedapi.adminforge.de/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([mockSong]) }));
    for (const host of ['pipedapi.leptons.xyz', 'pipedapi.kavin.rocks']) {
      await page.route(`https://${host}/**`, route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    }
    await page.route(/https:\/\/(inv\.nadeko\.net|invidious\.nerdvpn\.de|yt\.chocolatemoo53\.com|invidious\.tiekoetter\.com)\/.*/, route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('https://itunes.apple.com/search?*', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ results: [{ trackName: 'Smoke Test Song', artistName: 'Test Artist', artworkUrl100: 'https://artwork.test/apple-artwork.jpg' }] })
    }));
    await page.route('https://artwork.test/**', route => route.abort());
    await page.route('https://i.ytimg.com/**', route => route.fulfill({
      status: 200, contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#36d7ff"/></svg>'
    }));
    await page.route('https://www.youtube.com/iframe_api', route => route.fulfill({
      status: 200, contentType: 'application/javascript',
      body: `window.YT={PlayerState:{UNSTARTED:-1,ENDED:0,PLAYING:1,PAUSED:2},Player:function(id,config){this.setVolume=function(){};this.loadVideoById=function(){};this.pauseVideo=function(){};this.playVideo=function(){};this.getPlayerState=function(){return 2};this.getCurrentTime=function(){return 0};this.getDuration=function(){return 180};this.seekTo=function(){};setTimeout(()=>config.events.onReady({target:this}),10)}};setTimeout(()=>window.onYouTubeIframeAPIReady&&window.onYouTubeIframeAPIReady(),0);`
    }));
    await page.route('https://lrclib.net/**', route => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));

    await page.goto(`http://127.0.0.1:4173/${file}`);
    if (file === 'standalone.html') {
      assert.equal(await page.locator('link[rel="stylesheet"]').count(), 0, 'standalone: styles are embedded');
      assert.equal(await page.locator('script[src]').count(), 0, 'standalone: scripts are embedded');
      assert.equal(await page.locator('a[target="_blank"]').count(), 0, 'standalone: links do not spawn new tabs');
    }
    await page.locator('#settings-button').click();
    assert.equal(await page.locator('#settings-dialog').evaluate(el => el.open), true, `${file}: settings opens`);
    await page.locator('[data-accent="#4d8dff"]').click();
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()), '#4d8dff', `${file}: accent setting changes`);
    await page.locator('[data-appearance="light"]').click();
    assert.equal(await page.locator('body').evaluate(el => el.classList.contains('light')), true, `${file}: appearance setting changes`);
    await page.locator('#reset-customization').click();
    await page.locator('#close-settings').click();
    assert.equal(await page.locator('#settings-dialog').evaluate(el => el.open), false, `${file}: settings closes`);

    await page.locator('#search-input').fill('Smoke Test');
    await page.locator('#search-input').press('Enter');
    await page.locator('.song-card').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(() => {
      const img = document.querySelector('.song-card .song-art img');
      return img && img.src.includes('i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    }, null, { timeout: 10000 });
    await page.locator('.song-card .card-play').first().click();
    await page.waitForFunction(() => {
      const img = document.querySelector('#current-art img');
      return img && img.src.includes('i.ytimg.com/vi/dQw4w9WgXcQ/');
    }, null, { timeout: 10000 });

    await page.locator('#current-art').click();
    const dialog = page.locator('#now-playing-dialog');
    await dialog.waitFor({ state: 'visible' });
    for (const id of ['#cover-mode', '#video-mode', '#lyrics-button', '#close-expanded']) {
      const control = page.locator(id);
      const box = await control.boundingBox();
      assert.ok(box && box.width > 0 && box.height > 0, `${file}: ${id} is visible`);
      assert.ok(box.x >= -2 && box.y >= -2 && box.x + box.width <= viewport.width + 2 && box.y + box.height <= viewport.height + 2, `${file}: ${id} fits viewport; box=${JSON.stringify(box)} viewport=${JSON.stringify(viewport)}`);
    }
    await page.locator('#video-mode').click();
    assert.equal(await dialog.evaluate(el => el.classList.contains('video-mode')), true, `${file}: video mode button works`);
    await page.locator('#cover-mode').click();
    assert.equal(await dialog.evaluate(el => el.classList.contains('cover-mode')), true, `${file}: artwork mode button works`);
    await page.locator('#lyrics-button').click();
    assert.equal(await dialog.evaluate(el => el.classList.contains('lyrics-mode')), true, `${file}: lyrics button works`);
    await page.locator('#close-inline-lyrics').click();
    assert.equal(await dialog.evaluate(el => el.classList.contains('cover-mode')), true, `${file}: return from lyrics works`);
    await page.locator('#close-expanded').click();
    assert.equal(await dialog.evaluate(el => el.open), false, `${file}: fullscreen X closes player`);

    if (failures.length) throw new Error(failures.join('\n'));
    console.log(`PASS ${file} (${viewport.width}x${viewport.height}): settings, player mode buttons, lyrics, close X, artwork fallback`);
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
