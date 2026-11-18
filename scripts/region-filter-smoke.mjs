import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {matchesRegion} from '../src/locations.js';
const data=JSON.parse(fs.readFileSync('public/map-data.json','utf8'));
assert(matchesRegion('Granville Island · Vancouver','mainland'));
assert(!matchesRegion('Granville Island · Vancouver','islands'));
assert(matchesRegion('Multiple locations · Vancouver / Victoria','mainland'));
assert(matchesRegion('Multiple locations · Vancouver / Victoria','islands'));
assert(matchesRegion('Ganges · Salt Spring Island','islands'));
assert(matchesRegion('Gibsons','mainland'));
const browser=await chromium.launch({channel:'chrome',headless:true});
for(const width of [320,390,1440]){
 const page=await browser.newPage({viewport:{width,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:3000',{waitUntil:'networkidle'});
 for(const region of ['islands','mainland','all']){
  await page.locator(`[data-region="${region}"]`).click();
  assert.equal(await page.locator('#cards [data-chef]').count(),data.chefs.filter(c=>matchesRegion(c.location.city,region)).length);
 }
 await page.locator('[data-mode="picks"]').click();
 for(const region of ['islands','mainland','all']){
  await page.locator(`[data-region="${region}"]`).click();
  assert.deepEqual(await page.locator('#cards [data-place]').evaluateAll(es=>es.map(e=>e.dataset.place).sort()),data.places.filter(p=>matchesRegion(p.city,region)).map(p=>p.id).sort());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await page.locator('[data-region="islands"]').click();
 await page.locator('#cards [data-place]').first().click();
 await page.locator('#back-picks').click();
 assert.equal(await page.locator('[data-region="islands"]').getAttribute('aria-pressed'),'true');
 await page.screenshot({path:`.cache/ui/region-${width}.png`});
 assert.deepEqual(errors,[]);await page.close();
 console.log(`PASS region filters ${width}px`);
}
await browser.close();
console.log(Object.fromEntries(['all','mainland','islands'].map(r=>[r,data.places.filter(p=>matchesRegion(p.city,r)).length])));
