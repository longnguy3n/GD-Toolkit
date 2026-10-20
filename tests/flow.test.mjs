import test from 'node:test';
import assert from 'node:assert/strict';
import {makeFlowLab,makeFlowScenario,simulateFlow,validateFlowLab,validateFlowScenario,validateFlowOptions,flowCsv} from '../core/flow.mjs';
const clone=x=>structuredClone(x);
const scenario=()=>({id:'scenario',name:'Test',resources:[{id:'coin',name:'Coin',initial:0,capacity:null},{id:'item',name:'Item',initial:0,capacity:null}],rules:[],milestones:[]});
const rule=(id,inputs,outputs,extra={})=>({id,name:id,enabled:true,inputs,outputs,start:1,every:1,delay:0,repeat:true,probability:1,condition:null,...extra});
const a=(resource,amount)=>({resource,amount});
const inventory=(result,id)=>result.resources.find(r=>r.id===id);
const save=result=>({version:1,activeScenarioId:result.scenario.id,scenarios:[result.scenario],history:[result]});

test('ordered daily sources and converters conserve resource; every player begins independently',()=>{
 const s=scenario();s.resources[0].initial=5;s.rules=[rule('income',[],[a('coin',10)]),rule('craft',[a('coin',6)],[a('item',1)])];
 const before=clone(s),r=simulateFlow(s,{days:3,players:8});
 assert.equal(inventory(r,'coin').mean,17);assert.equal(inventory(r,'item').mean,3);assert.equal(inventory(r,'coin').inflow,30);assert.equal(inventory(r,'coin').outflow,18);assert.equal(r.rules[1].executions,24);assert.deepEqual(s,before);assert.doesNotThrow(()=>validateFlowLab(save(r)));
 const reverse=clone(s);reverse.resources[0].initial=0;reverse.rules.reverse();assert.equal(inventory(simulateFlow(reverse,{days:3,players:1}),'item').mean,2);
});
test('crafting pays all ingredients atomically and delayed deliveries occur at start of due day',()=>{
 const s=scenario();s.rules=[rule('income',[],[a('coin',3)]),rule('craft',[a('coin',6)],[a('item',1)],{delay:2})];s.milestones=[{id:'first',name:'First',resource:'item',amount:1}];
 const r=simulateFlow(s,{days:5,players:1});assert.equal(inventory(r,'item').mean,1);assert.equal(inventory(r,'item').pending,1);assert.equal(inventory(r,'coin').mean,3);assert.equal(r.milestones[0].quantiles[99],4);assert.equal(r.rules[1].insufficient,3);
 assert.doesNotThrow(()=>validateFlowLab(save(r)));
 const blocked=scenario();blocked.resources[0].initial=10;blocked.rules=[rule('blocked',[a('coin',5),a('item',1)],[a('coin',100)])];assert.equal(inventory(simulateFlow(blocked,{days:1,players:1}),'coin').mean,10);
});
test('capacity spill, once-only unlocks, schedules, and day-zero goals have explicit semantics',()=>{
 const s=scenario();s.resources[0].initial=5;s.resources[0].capacity=8;s.rules=[rule('income',[],[a('coin',10)],{start:2,every:2}),rule('unlock',[],[a('item',1)],{repeat:false,condition:{resource:'coin',atLeast:8}})];s.milestones=[{id:'initial',name:'Initial',resource:'coin',amount:5},{id:'unlocked',name:'Unlocked',resource:'item',amount:1}];
 const r=simulateFlow(s,{days:5,players:2});assert.equal(inventory(r,'coin').mean,8);assert.equal(inventory(r,'coin').wasted,17);assert.equal(inventory(r,'item').mean,1);assert.equal(r.rules[0].executions,4);assert.equal(r.rules[1].condition,2);assert.equal(r.milestones[0].quantiles[99],0);assert.equal(r.milestones[1].quantiles[50],2);assert.doesNotThrow(()=>validateFlowLab(save(r)));
});
test('seeded probability gates are reproducible and continuous across independent players',()=>{
 const s=scenario();s.rules=[rule('chance',[],[a('item',1)],{probability:.3})];s.milestones=[{id:'goal',name:'Goal',resource:'item',amount:2}];
 for(const rng of ['custom','unity-emulated']){const a=simulateFlow(s,{days:10,players:1000},{rng,seed:123}),b=simulateFlow(s,{days:10,players:1000},{rng,seed:123});assert.deepEqual(a.resources,b.resources);assert.deepEqual(a.milestones,b.milestones);assert.ok(Math.abs(inventory(a,'item').mean-3)<.12);assert.ok(inventory(a,'item').max>inventory(a,'item').min);assert.doesNotThrow(()=>validateFlowLab(save(a)));}
});
test('Unity tape gates, zero chance, censored thresholds and exhaustion are correct',()=>{
 const s=scenario();s.rules=[rule('chance',[],[a('item',1)],{probability:.5}),rule('zero',[],[a('coin',1)],{probability:0})];s.milestones=[{id:'goal',name:'Goal',resource:'item',amount:1}];const tape={source:'UnityEngine.Random.value',unityVersion:'test',values:[.1,.9,.2,.8]};
 const r=simulateFlow(s,{days:1,players:4},{rng:'unity',seed:42,tape});assert.equal(r.milestones[0].rate,.5);assert.equal(r.milestones[0].quantiles[50],1);assert.equal(r.milestones[0].quantiles[90],null);assert.equal(r.random.samples,4);assert.equal(inventory(r,'coin').mean,0);assert.equal(r.rules[1].chanceMiss,4);assert.throws(()=>simulateFlow(s,{days:2,players:4},{rng:'unity',seed:42,tape}),/hết mẫu/);
});
test('decimal thresholds unlock on their mathematical day, but zero cannot pay tiny positive costs',()=>{
 const s=scenario();s.rules=[rule('tenths',[],[a('coin',.1)]),rule('unlocked',[],[a('item',1)],{repeat:false,condition:{resource:'coin',atLeast:.8}})];s.milestones=[{id:'decimal',name:'Decimal',resource:'coin',amount:.8}];
 const r=simulateFlow(s,{days:8,players:1});assert.equal(r.milestones[0].quantiles[99],8);assert.equal(inventory(r,'item').mean,1);
 const z=scenario();z.rules=[rule('tiny',[a('coin',1e-20)],[a('item',1)]),rule('tinycondition',[],[a('item',1)],{condition:{resource:'coin',atLeast:1e-20}})];z.milestones=[{id:'tinygoal',name:'Tiny',resource:'coin',amount:1e-20}];const zero=simulateFlow(z,{days:1,players:1});assert.equal(inventory(zero,'item').mean,0);assert.equal(zero.milestones[0].reached,0);
});
test('templates and empty scenarios validate; bounds and dangling or duplicate references reject',()=>{
 for(const template of ['blank','economy','crafting']){const s=makeFlowScenario(template);assert.doesNotThrow(()=>validateFlowScenario(s));if(template==='blank'){assert.equal(s.resources.length,0);assert.throws(()=>simulateFlow(s,{days:30,players:100}),/tài nguyên/);}else assert.doesNotThrow(()=>validateFlowLab(save(simulateFlow(s,{days:30,players:100}))));}
 assert.doesNotThrow(()=>validateFlowLab(makeFlowLab()));
 const s=scenario();assert.throws(()=>validateFlowOptions(s,{days:3650,players:2000}),/quá lớn/);assert.throws(()=>validateFlowOptions(s,{days:1.5,players:1}));s.rules=[rule('bad',[],[a('missing',1)])];assert.throws(()=>validateFlowScenario(s));s.rules=[rule('bad',[a('coin',1),a('coin',1)],[a('item',1)])];assert.throws(()=>validateFlowScenario(s),/một lần/);s.rules=[];s.resources[0].id='__proto__';assert.throws(()=>validateFlowScenario(s));
});
test('history rejects corruption and CSV is bounded, escaped, and formula-safe',()=>{
 const s=scenario();s.resources[0].name='=danger,"name"';s.rules=[rule('source',[],[a('coin',1)])];s.milestones=[{id:'goal',name:'Goal',resource:'coin',amount:1}];const r=simulateFlow(s,{days:3650,players:1});assert.ok(r.series.length<=182);assert.doesNotThrow(()=>validateFlowLab(save(r)));
 for(const corrupt of [x=>x.resources[1].id=x.resources[0].id,x=>x.resources[0].mean++,x=>x.milestones[0].rate=.1,x=>x.rules[0].executions--,x=>x.series[0].day=1,x=>x.resources[0].name='wrong',x=>x.series[1].balances.coin=NaN]){const bad=clone(r);corrupt(bad);assert.throws(()=>validateFlowLab(save(bad)));}
 const csv=flowCsv(r);assert.ok(csv.startsWith('"Ngày","\'=danger,""name"""'));assert.equal(csv.charCodeAt(0),34);assert.equal(csv.split('\r\n').length,r.series.length+1);
});
