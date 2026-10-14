import test from 'node:test';
import assert from 'node:assert/strict';
import {preset,simulate,clone,xorshiftState,unityEmulated,leafRates} from '../core/engine.mjs';
import {upgradeWorkspace,validateWorkspace,activeProfile,activeBanner,runConfig,addProfile,removeProfile,addBanner,removeBanner,deleteNodes} from '../core/workspace.mjs';
import {costs,validateEconomy} from '../core/economy.mjs';

test('v1 migration preserves config, theme, actual Unity mode and history snapshots',()=>{
  const config=preset(),history=[simulate(config,50)];config.rng='unity';
  const original={version:1,config,history,settings:{theme:'light'}},before=clone(original);
  const d=upgradeWorkspace(original);
  assert.equal(d.version,3);assert.equal(d.settings.rng,'unity');assert.equal(d.settings.theme,'light');
  assert.deepEqual(d.config.root,config.root);assert.equal(d.history[0].config.rng,'custom');
  assert.equal(d.history[0].profileId,d.activeProfileId);assert.deepEqual(original,before);
  const persisted=JSON.parse(JSON.stringify(d));assert.equal(persisted.config,undefined);
  assert.equal(persisted.profiles[0].banners[0].config.rng,undefined);
  assert.deepEqual(runConfig(upgradeWorkspace(persisted)),runConfig(d));
  const unnamed=clone(original);unnamed.config.name='';
  assert.equal(upgradeWorkspace(unnamed).config.name,''); // v0.2 permitted this value.
});
test('banners isolate trees, economy and collapsed pools; RNG is global',()=>{
  const d=upgradeWorkspace({version:1,config:preset(),history:[]}),first=activeBanner(d),p=addBanner(d,'Weapon banner',d.config);
  activeProfile(d).activeBannerId=p.id;d.config.root.children[0].weight=99;d.config.economy.balance=1600;p.collapsed=['root','standard'];
  assert.equal(first.config.root.children[0].weight,6);assert.equal(first.config.economy.balance,0);assert.deepEqual(first.collapsed,[]);
  d.settings.rng='unity-emulated';d.settings.seed=9;
  const r=simulate(runConfig(d),100);d.history.push({...r,bannerId:p.id,profileId:d.activeProfileId});
  removeBanner(d,p.id);assert.equal(activeBanner(d).id,first.id);assert.equal(runConfig(d).rng,'unity-emulated');
  assert.equal(d.history[0].config.economy.balance,1600);assert.equal(d.history[0].config.seed,9);
  assert.throws(()=>removeBanner(d,first.id),/ít nhất/);validateWorkspace(d);
});
test('bulk deletion deduplicates parent/descendant, disables affected pity and is atomic',()=>{
  const c=preset(),original=clone(c),d=deleteNodes(c,['legend','featured','epic']);
  assert.equal(d.removed,9);assert.equal(d.disabledPity,1);assert.equal(d.config.root.pity.enabled,false);
  assert.equal(leafRates(d.config.root).length,2);assert.deepEqual(c,original);
  for(const ids of [['root'],['featured','standard']]){
    assert.throws(()=>deleteNodes(c,ids));assert.deepEqual(c,original);
  }
});
test('currency costs distinguish gross value, top up and affordable whole pulls',()=>{
  const e={currency:'Gem',money:'VND',perPull:160,balance:1600,unitPrice:250};
  assert.deepEqual(costs(e,20),{currency:3200,total:800000,shortfall:1600,topUp:400000,affordable:10});
  assert.equal(costs(e,5).topUp,0);assert.equal(costs(e,5.5).currency,880);
  assert.equal(costs({...e,perPull:.1,balance:.3},3).affordable,3);
  assert.equal(costs({...e,perPull:160,balance:1599.999},3).affordable,9);
  assert.throws(()=>validateEconomy({...e,perPull:0}));assert.throws(()=>validateEconomy({...e,unitPrice:-1}));
  assert.throws(()=>validateEconomy({...e,perPull:1e-320}));
  assert.throws(()=>costs(e,NaN));
});
test('Unity-like xorshift reference recurrence and deterministic usable seeds',()=>{
  const vector=xorshiftState([1,2,3,4]);assert.deepEqual(Array.from({length:4},()=>vector()*4294967296),[2061,6175,4,8224]);
  for(const seed of [0,1,2026,4294967295]){
    const a=unityEmulated(seed),b=unityEmulated(seed),values=Array.from({length:1000},()=>a());
    assert.deepEqual(values,Array.from({length:1000},()=>b()));assert.ok(values.every(x=>x>=0&&x<1));assert.ok(new Set(values).size>990);
  }
  const c={...preset(),rng:'unity-emulated'},a=simulate(c,10000),b=simulate(c,10000);
  assert.deepEqual(a.sequence,b.sequence);assert.equal(Object.values(a.counts).reduce((a,b)=>a+b,0),10000);
  assert.equal(a.unity,null);assert.notDeepEqual(a.sequence,simulate({...c,rng:'custom'},10000).sequence);
});
test('corrupt workspaces and global settings cannot be silently accepted',()=>{
  const d=upgradeWorkspace({version:1,config:preset(),history:[]});
  for(const mutate of [x=>x.activeProfileId='missing',x=>x.settings.seed=-1,x=>x.settings.rng='fake',x=>x.profiles.push(clone(x.profiles[0])),x=>x.profiles[0].banners[0].config.economy.balance=NaN]){
    const invalid=clone(d);mutate(invalid);assert.throws(()=>upgradeWorkspace(invalid));
  }
});
test('v2 migration groups all old banners into one profile and preserves history identities',()=>{
  const c=preset(),h=simulate(c,5);
  const old={version:2,settings:{theme:'light',rng:'custom',seed:42},activeProfileId:'weapon',profiles:[{id:'character',config:c,collapsed:['legend']},{id:'weapon',config:{...clone(c),name:'Weapon'},collapsed:['root']}],history:[{...h,profileId:'character'}]};
  const d=upgradeWorkspace(old);
  assert.equal(d.profiles.length,1);assert.equal(activeProfile(d).banners.length,2);
  assert.equal(activeBanner(d).id,'weapon');assert.deepEqual(activeBanner(d).collapsed,['root']);
  assert.equal(d.history[0].bannerId,'character');assert.equal(d.history[0].profileId,d.activeProfileId);
  assert.deepEqual(d.history[0].sequence,h.sequence);assert.equal(d.settings.seed,42);
  assert.equal(old.version,2);assert.equal(old.profiles[0].config.pityReset,undefined);
});
test('profiles contain independent banners; duplicating a profile deep-copies every banner',()=>{
  const d=upgradeWorkspace({version:1,config:preset(),history:[]}),first=activeProfile(d);addBanner(d,'Second banner');
  first.banners[1].config.economy.balance=987;
  const copy=addProfile(d,'Project B',first);
  assert.equal(copy.banners.length,2);assert.notEqual(copy.banners[0].id,first.banners[0].id);
  assert.equal(copy.banners[1].config.economy.balance,987);
  d.activeProfileId=copy.id;d.config.root.children[0].weight=44;
  assert.equal(first.banners[0].config.root.children[0].weight,6);
  const h={...simulate(runConfig(d),5),profileId:copy.id,bannerId:activeBanner(d).id};d.history.push(h);
  removeProfile(d,copy.id);assert.equal(d.activeProfileId,first.id);assert.equal(d.history[0].id,h.id);
  assert.throws(()=>removeProfile(d,first.id));validateWorkspace(d);
});
test('pity logs survive persistence and corrupt counters are rejected',()=>{
  const d=upgradeWorkspace({version:1,config:preset(),history:[]});d.history.push(simulate(runConfig(d),30));
  assert.deepEqual(upgradeWorkspace(JSON.parse(JSON.stringify(d))).history[0].pityLog,d.history[0].pityLog);
  d.history[0].pityLog.pools[0].after[0]=99999;assert.throws(()=>validateWorkspace(d),/Counter/);
});
