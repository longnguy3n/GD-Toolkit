import test from 'node:test';
import assert from 'node:assert/strict';
import {validate,simulate,analyze,expectedPity,effective,preset,clone,leafRates} from '../core/engine.mjs';
import {ruleProbabilities} from '../core/pity-rules.mjs';
import {pityAtRoll} from '../core/pity-log.mjs';
import {upgradeWorkspace,validateWorkspace,profileConfig,deleteNodes,addBanner} from '../core/workspace.mjs';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const rule=(id,target,more={})=>({id,name:id,enabled:true,target,hard:2,soft:0,step:0,start:1,...more});
const config=()=>({version:3,name:'Multi',seed:42,rng:'custom',pityReset:{onTarget:true},root:{id:'r',name:'Banner',weight:1,children:[{id:'a',name:'A',weight:0},{id:'b',name:'B',weight:0},{id:'c',name:'C',weight:1}],pities:[rule('pa','a'),rule('pb','b')]}});

test('multiple hard pity: first rule wins, deferred counter stays due, then fires',()=>{
 const c=config(),r=simulate(c,4);assert.deepEqual(r.sequence,['a','b','a','b']);
 assert.equal(r.pitySummary.hardTriggers,4);assert.equal(r.pitySummary.deferred,1);
 const rows=pityAtRoll(r,1);assert.equal(rows[0].hard,true);assert.equal(rows[0].after,0);
 assert.equal(rows[1].deferred,true);assert.equal(rows[1].after,1);assert.equal(rows[1].rate,0);
 assert.equal(pityAtRoll(r,2)[1].hard,true);near(expectedPity(c,4,'b').targetHits,2);
 const a=analyze(c,'b',2,4,6);near(a.exact,1);assert.equal(a.guarantee,4);near(a.mean,4);
 c.root.pities.reverse();assert.equal(simulate(c,1).sequence[0],'b');
});
test('same target rules can complete together; high-priority H1 can starve others',()=>{
 let c=config();c.root.pities[1].target='a';let r=simulate(c,1);assert.equal(r.pitySummary.hardTriggers,2);assert.equal(r.pitySummary.hardPulls,1);
 c=config();Object.assign(c.root.pities[0],{hard:1,start:0});r=simulate(c,5);assert.equal(r.counts.a,5);assert.equal(r.pitySummary.deferred,5);
 const a=analyze(c,'b',1,5,20);assert.equal(a.guarantee,null);near(a.atLeast,0);near(effective(c.root)[1],0);
});
test('natural hits reset each matching rule only when enabled; hard always resets',()=>{
 const c=config();c.root.children[0].weight=1;c.root.children[2].weight=0;c.root.pities=[rule('pa','a',{hard:3,start:0}),rule('pb','b',{enabled:false})];
 assert.deepEqual(simulate(c,3).pityLog.pools[0].after,[0,0,0]);
 c.pityReset.onTarget=false;const r=simulate(c,3);assert.deepEqual(r.pityLog.pools[0].after,[1,2,0]);assert.equal(r.pitySummary.hardTriggers,1);
});
test('soft boosts reserve probability in order and preserve unit mass',()=>{
 const c=config();c.root.children.forEach(n=>n.weight=1);c.root.pities=[rule('pa','a',{hard:4,start:0,soft:1,step:.5}),rule('pb','b',{hard:4,start:0,soft:1,step:.5})];
 const p=ruleProbabilities(c.root);near(p[0],5/6);near(p[1],1/6);near(p[2],0);near(p.reduce((a,b)=>a+b),1);
 c.root.pities.reverse();near(ruleProbabilities(c.root)[1],5/6);
});
test('converted one-pity banner preserves legacy probabilities, simulation and analysis',()=>{
 const old=preset();Object.assign(old.root.pity,{hard:4,soft:2,start:1,step:.2});
 for(const onTarget of [true,false]){
 old.pityReset={onTarget};const c=clone(old);c.version=3;c.root.pities=[{...c.root.pity,id:'banner_rule',name:'One'}];delete c.root.pity;
 assert.deepEqual(simulate(c,2000).sequence,simulate(old,2000).sequence);
 const a=analyze(c,'featured',2,6,10),b=analyze(old,'featured',2,6,10);near(a.exact,b.exact);near(a.atLeast,b.atLeast);
 near(a.pity.hardTriggers,b.pity.hardTriggers);near(a.pity.targetHits,b.pity.targetHits);
 for(let i=0;i<3;i++)near(effective(c.root,c.pityReset)[i],effective(old.root,old.pityReset)[i]);
 }
});
test('multi-pity exact distribution agrees with independent branch enumeration',()=>{
 const c=config();c.root.children.forEach(n=>n.weight=1);c.root.pities[0].start=0;c.root.pities[1].start=0;c.root.pities[1].hard=3;
 let dist=[{p:1,a:0,b:0,k:0,hard:0,deferred:0}];
 for(let n=0;n<5;n++){
 const next=[];
 for(const s of dist){const dueA=s.a===1,dueB=s.b===2;const choices=dueA?[['a',1]]:dueB?[['b',1]]:[['a',1/3],['b',1/3],['c',1/3]];
 for(const [id,p] of choices)next.push({p:s.p*p,a:id==='a'?0:Math.min(1,s.a+1),b:id==='b'?0:Math.min(2,s.b+1),k:s.k+(id==='b'),hard:s.hard+((dueA&&id==='a')||(dueB&&id==='b')?1:0),deferred:s.deferred+(dueA&&dueB?1:0)});
 }dist=next;
 }
 const a=analyze(c,'b',2,5,8);near(a.exact,dist.reduce((n,s)=>n+(s.k===2?s.p:0),0));near(a.atLeast,dist.reduce((n,s)=>n+(s.k>=2?s.p:0),0));near(a.pity.hardTriggers,dist.reduce((n,s)=>n+s.p*s.hard,0));near(a.pity.deferred,dist.reduce((n,s)=>n+s.p*s.deferred,0));
 const sim=simulate(c,100000);for(const r of leafRates(c.root))near(sim.counts[r.id]/sim.pulls,r.real,.006);
});
test('floating-point underflow must not create a false absolute guarantee',()=>{
 const c=config();c.root.pities=[];c.root.children[0].weight=999;c.root.children[2].weight=1;
 const r=analyze(c,'a',1,2,150);assert.equal(r.guarantee,null);assert.equal(r.mean,null);
});
test('multi-pity validates IDs, priorities, versions, targets, count and placement',()=>{
 for(const mutate of [c=>c.version=2,c=>c.root.pities[1].id='pa',c=>c.root.pities[0].id='a',c=>c.root.pities[0].target='missing',c=>c.root.children[0].pities=[],c=>c.root.pities[0].start=2,c=>c.root.pities=Array.from({length:9},(_,i)=>rule('p'+i,'a'))]){const c=config();mutate(c);assert.throws(()=>validate(c));}
 validate(config());
});
test('multi-pity persists config, history v2, copies banner, and disables all deleted targets',()=>{
 const c=config(),d=upgradeWorkspace({version:1,config:c,history:[]});assert.equal(d.config.version,3);assert.equal(profileConfig(c).version,3);
 d.history.push(simulate(c,8));validateWorkspace(d);validateWorkspace(upgradeWorkspace(JSON.parse(JSON.stringify(d))));
 const copy=addBanner(d,'copy',c);assert.deepEqual(copy.config.root.pities,c.root.pities);
 const deleted=deleteNodes(c,['a','b']);assert.equal(deleted.disabledPity,2);assert.ok(deleted.config.root.pities.every(p=>!p.enabled));
 const empty=deleteNodes(c,['a','b','c']);assert.equal(empty.config.root.children.length,0);validate(empty.config,{allowEmpty:true});
 d.history[0].pityLog.pools[0].flags[0]=32;assert.throws(()=>validateWorkspace(d));
});

test('a forced hit is not misclassified as soft pity by another rule on the same target',()=>{
 const c=config();c.root.pities=[rule('pa','a'),rule('pb','a',{hard:10,start:0,soft:1,step:.1})];
 const r=simulate(c,1);assert.equal(r.pitySummary.softWins,0);assert.equal(r.poolStats.pb.targetHits,1);assert.equal(r.poolStats.pb.resets,1);assert.equal(pityAtRoll(r,1)[1].soft,false);
});
