import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyBanner,simulate,validate} from '../core/engine.mjs';
import {upgradeWorkspace,runConfig} from '../core/workspace.mjs';
import {pullLog,tierBadge} from '../ui/features.mjs';

test('tiers label results without changing rolls and history keeps the original tier',()=>{
  const c=emptyBanner();c.root.children=[{id:'item',name:'Sword',weight:1,tier:'SSR'}];
  const doc=upgradeWorkspace({version:1,config:c,history:[]});
  const r=simulate(runConfig(doc),3);doc.history.push(r);
  assert.match(pullLog(r,0,3),/Tier: SSR/);
  doc.config.root.children[0].tier='UR';
  assert.deepEqual(simulate(runConfig(doc),3).sequence,r.sequence);
  assert.equal(r.config.root.children[0].tier,'SSR');
  const restored=upgradeWorkspace(JSON.parse(JSON.stringify(doc)));
  assert.equal(restored.config.root.children[0].tier,'UR');
  assert.equal(restored.history[0].config.root.children[0].tier,'SSR');
  delete c.root.children[0].tier;assert.match(pullLog(simulate(c,1),0,1),/Chưa gán tier/);
});

test('custom tiers are bounded and safely displayed',()=>{
  const c=emptyBanner();c.root.children=[{id:'item',name:'Sword',weight:1,tier:'<SSR & 5★>'}];
  validate(c);assert.equal(tierBadge(c.root.children[0].tier),'<span class="badge item-tier">Tier: &lt;SSR &amp; 5★&gt;</span>');
  for(const tier of [4,{},'x'.repeat(41)]){c.root.children[0].tier=tier;assert.throws(()=>validate(c),/Tier/);}
});
