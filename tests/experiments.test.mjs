import test from 'node:test';
import assert from 'node:assert/strict';
import {simulatePlayers,validatePlayerHistory,summarizePlayers} from '../core/players.mjs';
import {compareBanners} from '../core/compare.mjs';
import {preset,clone,simulate,customRandom} from '../core/engine.mjs';
import {defaultEconomy} from '../core/economy.mjs';
import {upgradeWorkspace,validateWorkspace} from '../core/workspace.mjs';
const config=(p=.25)=>({version:2,name:'Test',rng:'custom',seed:42,economy:defaultEconomy(),root:{id:'r',name:'Banner',weight:1,children:[{id:'a',name:'Target',weight:p},{id:'b',name:'Other',weight:1-p}]}});
const opts={target:'a',copies:1,players:100,pulls:20};
test('each player resets pity and inventory to Setup, not the previous player',()=>{
 const c=config(0);c.root.pity={enabled:true,target:'a',hard:3,soft:0,step:0,start:2};const before=clone(c),r=simulatePlayers(c,{...opts,copies:2,players:10,pulls:5});
 assert.ok(r.rows.every(x=>x.copies===2&&x.firstHit===4&&x.hardTriggers===2));assert.equal(r.summary.hardTriggers,20);assert.equal(r.counts.a,20);assert.equal(r.counts.b,30);assert.deepEqual(c,before);assert.equal(r.summary.quantiles[99],4);
});
test('a continuous seeded stream is reproducible without cloning identical players',()=>{
 for(const rng of ['custom','unity-emulated']){const c=config();c.rng=rng;const a=simulatePlayers(c,opts),b=simulatePlayers(c,opts);assert.deepEqual(a.rows,b.rows);assert.ok(new Set(a.rows.map(r=>r.copies)).size>1);assert.equal(Object.values(a.counts).reduce((a,b)=>a+b),2000);}
});
test('population estimates agree with independent binomial probability and mean',()=>{
 const r=simulatePlayers(config(.1),{...opts,copies:2,players:10000,pulls:10});const expected=1-.9**10-10*.1*.9**9;
 assert.ok(Math.abs(r.summary.rate-expected)<.015);assert.ok(Math.abs(r.summary.meanCopies-1)<.04);assert.equal(r.summary.histogram.reduce((a,b)=>a+b.players,0),10000);
});
test('Unity tape continues across players and nested multi-pity matches existing simulator',()=>{
 const c=preset();c.rng='unity';c.version=3;c.root.pities=[{...c.root.pity,id:'p1',name:'Legend',hard:3,soft:2,step:.2,start:1},{id:'p2',name:'Epic',enabled:true,target:'epic',hard:2,soft:0,step:0,start:1}];delete c.root.pity;
 const rng=customRandom(987),values=Array.from({length:2000},rng),tape={source:'UnityEngine.Random.value',unityVersion:'QA',values};
 for(const onTarget of [true,false]){c.pityReset={onTarget};const r=simulatePlayers(c,{target:'featured',copies:2,players:8,pulls:12},{tape});let used=0;
 for(const row of r.rows){const one=simulate(c,12,{tape:{...tape,values:values.slice(used)}});used+=one.randomSamples;let n=0,first=null;one.sequence.forEach((id,i)=>{if(id==='featured'&&++n===2)first=i+1;});assert.equal(row.copies,one.counts.featured);assert.equal(row.firstHit,first);assert.equal(row.hardTriggers,one.pitySummary.hardTriggers);assert.equal(row.hardPulls,one.pitySummary.hardPulls);}
 assert.equal(r.randomSamples,used);}
 assert.throws(()=>simulatePlayers(c,{target:'featured',copies:2,players:8,pulls:12},{tape:{...tape,values:[.5]}}),/hết mẫu/);
});
test('empirical milestones include unsuccessful players, not just successful subset',()=>{
 const rows=[{copies:1,firstHit:2,hardTriggers:0,hardPulls:0},{copies:1,firstHit:3,hardTriggers:0,hardPulls:0},{copies:0,firstHit:null,hardTriggers:0,hardPulls:0},{copies:0,firstHit:null,hardTriggers:0,hardPulls:0}];
 const s=summarizePlayers(rows,1);assert.equal(s.quantiles[50],3);assert.equal(s.quantiles[90],null);assert.equal(s.meanFirstHit,2.5);assert.equal(s.medianCopies,.5);
 const zero=simulatePlayers(config(0),opts);assert.equal(zero.summary.rate,0);assert.equal(zero.summary.meanFirstHit,null);assert.ok(Object.values(zero.summary.quantiles).every(n=>n===null));
});
test('bounded work and invalid population inputs are rejected',()=>{
 for(const patch of [{players:10001},{pulls:10001},{players:10000,pulls:10000},{copies:0},{target:'missing'},{players:1.5}])assert.throws(()=>simulatePlayers(config(),{...opts,...patch}));
});
test('Players history persists snapshots and rejects inconsistent/corrupt records',()=>{
 const c=config(),r=simulatePlayers(c,opts),d=upgradeWorkspace({version:1,config:c,history:[]});d.playerHistory=[r];const restored=upgradeWorkspace(JSON.parse(JSON.stringify(d)));assert.deepEqual(restored.playerHistory[0].summary,r.summary);validatePlayerHistory(r);
 d.config.root.children[0].name='Changed';assert.equal(r.config.root.children[0].name,'Target');
 const bad=clone(r);bad.summary.rate=123;assert.throws(()=>validatePlayerHistory(bad));
 const corrupt=clone(r);corrupt.rows[0].firstHit=-1;assert.throws(()=>validatePlayerHistory(corrupt));
 d.playerHistory=[r,r];assert.throws(()=>validateWorkspace(d));
});
test('comparison selects a target per banner and preserves economy snapshots',()=>{
 const a=config(.1),b=config(.5);b.root.children[0].id='different';b.economy.perPull=10;b.economy.money='USD';
 const r=compareBanners([{bannerId:'one',target:'a',config:a},{bannerId:'two',target:'different',config:b}],1,10);
 assert.ok(Math.abs(r.rows[0].result.atLeast-(1-.9**10))<1e-10);assert.ok(r.rows[1].result.atLeast>r.rows[0].result.atLeast);assert.ok(r.rows[1].result.quantiles[90]<r.rows[0].result.quantiles[90]);assert.equal(r.rows[1].config.economy.money,'USD');
 b.economy.money='VND';assert.equal(r.rows[1].config.economy.money,'USD');
});
test('comparison rejects missing targets and duplicate banners; unreachable results remain explicit',()=>{
 const a={bannerId:'one',target:'a',config:config(0)},b={bannerId:'two',target:'b',config:config(0)};
 assert.throws(()=>compareBanners([a],1,5));assert.throws(()=>compareBanners([a,a],1,5));assert.throws(()=>compareBanners([a,{...b,target:'bad'}],1,5));
 const r=compareBanners([a,b],1,5);assert.equal(r.rows[0].result.search.status,'unreachable');assert.equal(r.rows[1].result.atLeast,1);
});
