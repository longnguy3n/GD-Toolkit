import test from 'node:test';
import assert from 'node:assert/strict';
import {forecast} from '../core/forecast.mjs';
import {analyze,preset,clone} from '../core/engine.mjs';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const simple=(p=.25)=>({version:2,name:'Forecast',rng:'custom',seed:42,root:{id:'r',name:'Banner',weight:1,children:[{id:'a',name:'A',weight:p},{id:'b',name:'B',weight:1-p}]}});
const twoCdf=(p,n)=>1-(1-p)**n-n*p*(1-p)**(n-1);

test('automatic forecast finds first quantile beyond planned N and returns only at-least K',()=>{
 const c=simple(.001),r=forecast(c,'a',2,200);assert.equal(r.search.status,'complete');assert.ok(r.quantiles[50]>200);assert.equal('exact' in r,false);near(r.atLeast,twoCdf(.001,200));
 for(const [q,n] of Object.entries(r.quantiles)){assert.ok(twoCdf(.001,n)>=q/100-1e-10);assert.ok(twoCdf(.001,n-1)<q/100);}
 const longer=forecast(c,'a',2,10000);assert.deepEqual(longer.quantiles,r.quantiles);near(longer.atLeast,twoCdf(.001,10000));assert.equal(longer.pity.pulls,10000);
});
test('rare items automatically search beyond the former 10,000-pull limit',()=>{
 const p=.00005,r=forecast(simple(p),'a',2,100);assert.equal(r.search.status,'complete');assert.ok(r.quantiles[50]>10000);assert.ok(r.quantiles[99]>100000);assert.ok(r.curve.length<=400);
 for(const [q,n] of Object.entries(r.quantiles)){assert.ok(twoCdf(p,n)>=q/100-1e-8);assert.ok(twoCdf(p,n-1)<q/100);}
 assert.equal(r.curve.at(-1).n,r.search.examined);
});
test('automatic forecast preserves nested pity and early reset policies',()=>{
 const c=preset();Object.assign(c.root.pity,{hard:4,soft:2,step:.2,start:1});
 for(const onTarget of [true,false]){c.pityReset={onTarget};for(const copies of [1,2]){
 const r=forecast(c,'featured',copies,6),old=analyze(c,'featured',copies,6,100);near(r.atLeast,old.atLeast);assert.deepEqual(r.quantiles,old.quantiles);near(r.pity.targetHits,old.pity.targetHits);
 }}
});
test('multiple pity priority and deferred counters use the same probability model',()=>{
 const c=simple(.1);c.version=3;c.root.children.push({id:'c',name:'C',weight:1});c.root.pities=[{id:'pa',name:'A pity',enabled:true,target:'a',hard:2,soft:0,step:0,start:1},{id:'pb',name:'B pity',enabled:true,target:'b',hard:3,soft:2,step:.1,start:2}];
 for(const onTarget of [true,false]){c.pityReset={onTarget};const r=forecast(c,'b',2,5),old=analyze(c,'b',2,5,100);near(r.atLeast,old.atLeast);assert.deepEqual(r.quantiles,old.quantiles);near(r.pity.deferred,old.pity.deferred);}
});
test('all-success, zero-weight and priority-starved items are handled without fictitious milestones',()=>{
 const c=simple(1),r=forecast(c,'a',2,1);assert.deepEqual(r.quantiles,{50:2,90:2,95:2,99:2});near(r.atLeast,0);assert.equal(r.guarantee,2);
 const impossible=forecast(simple(0),'a',2,200);assert.equal(impossible.search.status,'unreachable');assert.ok(impossible.search.examined<200);assert.equal(impossible.atLeast,0);assert.equal(impossible.quantiles[50],null);
 c.version=3;c.root.pities=[{id:'pa',name:'A pity',enabled:true,target:'a',hard:1,soft:0,step:0,start:0},{id:'pb',name:'B pity',enabled:true,target:'b',hard:2,soft:0,step:0,start:1}];
 assert.equal(forecast(c,'b',1,20).search.status,'unreachable');
});
test('search limits retain planned-N probability and already discovered quantiles',()=>{
 const c=simple(.01),r=forecast(c,'a',1,5,()=>{},{maxPulls:100});assert.equal(r.search.status,'limit');assert.equal(r.quantiles[50],69);assert.equal(r.quantiles[90],null);near(r.atLeast,1-.99**5);
 const budget=forecast(c,'a',1,5,()=>{},{maxOperations:200});assert.equal(budget.search.status,'budget');assert.ok(budget.search.examined>=5);near(budget.atLeast,r.atLeast);assert.equal(budget.curve.at(-1).n,budget.search.examined);
 const early=forecast(c,'a',2,100,()=>{},{maxOperations:2});assert.equal(early.search.status,'budget');assert.equal(early.atLeast,null);assert.ok(early.pity.unavailable);
});
test('floating-point underflow never creates a guarantee; configuration stays unchanged',()=>{
 const c=simple(.999);c.version=3;c.root.pities=[];const original=clone(c),r=forecast(c,'a',1,150);assert.equal(r.guarantee,null);assert.equal(r.mean,null);assert.deepEqual(c,original);
});
