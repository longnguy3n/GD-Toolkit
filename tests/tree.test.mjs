import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyBanner,preset,validate,simulate,analyze,expectedPity,leafRates} from '../core/engine.mjs';
import {treeSummary} from '../core/tree.mjs';
import {upgradeWorkspace,activeProfile,activeBanner,addBanner,addProfile,runConfig,deleteNodes} from '../core/workspace.mjs';

test('empty banners can be saved, copied and reloaded but cannot run gacha',()=>{
  const doc=upgradeWorkspace(null);
  assert.deepEqual(doc.config.root.children,[]);
  const b=addBanner(doc,'Blank');activeProfile(doc).activeBannerId=b.id;
  assert.deepEqual(doc.config.root.children,[]);
  const c=runConfig(doc);validate(c,{allowEmpty:true});
  assert.deepEqual(leafRates(c.root),[]);
  assert.throws(()=>simulate(c,1),/Banner đang trống/);
  assert.throws(()=>analyze(c,'missing',1,1,1),/Banner đang trống/);
  assert.throws(()=>expectedPity(c,1,'missing'),/Banner đang trống/);
  const copy=addBanner(doc,'Blank copy',c);assert.deepEqual(copy.config.root.children,[]);
  const p=addProfile(doc,'Blank project');assert.deepEqual(p.banners[0].config.root.children,[]);
  const restored=upgradeWorkspace(JSON.parse(JSON.stringify(doc)));
  assert.equal(activeBanner(restored).id,b.id);assert.deepEqual(restored.config.root.children,[]);
  assert.throws(()=>validate({...c,root:{...c.root,pity:{enabled:true}}},{allowEmpty:true}));
});

test('deleting every top-level pool leaves a valid empty banner and disables its pity',()=>{
  const c=preset(),r=deleteNodes(c,c.root.children.map(n=>n.id));
  assert.equal(r.removed,12);assert.equal(r.disabledPity,1);
  assert.deepEqual(r.config.root.children,[]);assert.equal(r.config.root.pity.enabled,false);
  validate(r.config,{allowEmpty:true});assert.equal(c.root.children.length,3);
});

test('whole-banner rates multiply ancestors; totals do not count intermediate pools twice',()=>{
  const c=emptyBanner();c.root.children=[
    {id:'p',name:'Pool',weight:1,children:[{id:'a',name:'A',weight:1},{id:'b',name:'B',weight:3}]},
    {id:'c',name:'C',weight:3}
  ];
  let t=treeSummary(c);
  assert.equal(t.weight,4);assert.equal(t.baseRate,1);assert.equal(t.realRate,1);
  assert.deepEqual(t.rates.get('a'),{local:.25,base:.0625,real:.0625});
  assert.equal(t.rates.get('b').base,.1875);assert.equal(t.rates.get('c').base,.75);
  c.root.pity={enabled:true,target:'p',hard:2,soft:0,step:0,start:0};
  t=treeSummary(c);assert.equal(t.rates.get('a').base,.0625);
  assert.ok(Math.abs(t.rates.get('a').real-1/7)<1e-12);
  assert.ok(Math.abs(t.realRate-1)<1e-12);
  c.root.children[1].weight=0;t=treeSummary(c);
  assert.equal(t.rates.get('c').base,0);assert.equal(t.baseRate,1);
  const empty=treeSummary(emptyBanner());
  assert.equal(empty.weight,0);assert.equal(empty.baseRate,0);assert.equal(empty.realRate,0);assert.equal(empty.rates.size,0);
});
