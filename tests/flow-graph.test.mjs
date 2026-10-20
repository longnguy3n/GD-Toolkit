import test from 'node:test';
import assert from 'node:assert/strict';
import {makeFlowScenario,makeFlowLab,validateFlowScenario,validateFlowLab,validateFlowOptions,simulateFlow} from '../core/flow.mjs';
import {graphNodes,graphEdges,addGraphNode,moveGraphNodes,setGraphViewport,connectGraph,updateGraphEdge,disconnectGraph,deleteGraphNodes,autoLayoutGraph,ruleComplete,validateCanvas} from '../core/flow-graph.mjs';

const copy=x=>structuredClone(x);
const lab=s=>({...makeFlowLab(),activeScenarioId:s.id,scenarios:[s]});
const inventory=(r,id)=>r.resources.find(x=>x.id===id);
const outcome=r=>({series:r.series,resources:r.resources,rules:r.rules,milestones:r.milestones,samples:r.random.samples});
function fixture(){let s=makeFlowScenario('blank');for(const kind of ['resource','resource','source','converter','drain'])s=addGraphNode(s,kind,{x:40,y:50});return s;}

test('legacy economy and crafting map to graph without changing simulation, schedule or amounts',()=>{
  for(const template of ['economy','crafting']){
    const s=makeFlowScenario(template),before=copy(s),expected=outcome(simulateFlow(s,{days:80,players:8},{seed:196}));
    let n=autoLayoutGraph(s);const edges=graphEdges(n);
    assert.equal(graphNodes(n).length,s.resources.length+s.rules.length);
    for(const e of edges){n=disconnectGraph(n,e.id);n=connectGraph(n,e.from,e.to,e.amount);}
    assert.deepEqual(outcome(simulateFlow(n,{days:80,players:8},{seed:196})),expected);
    assert.deepEqual(s,before);
    assert.deepEqual(n.rules.map(r=>({every:r.every,start:r.start,delay:r.delay,condition:r.condition,repeat:r.repeat})),s.rules.map(r=>({every:r.every,start:r.start,delay:r.delay,condition:r.condition,repeat:r.repeat})));
    assert.doesNotThrow(()=>validateFlowLab(lab(JSON.parse(JSON.stringify(n)))));
  }
});

test('empty canvas and disconnected typed drafts save, while enabled drafts cannot run',()=>{
  let s=makeFlowScenario('blank');assert.equal(s.resources.length,0);
  assert.doesNotThrow(()=>validateFlowOptions(s,{days:30,players:100},{runnable:false}));
  assert.throws(()=>validateFlowOptions(s,{days:0,players:100},{runnable:false}),/ngày/);
  assert.doesNotThrow(()=>validateFlowLab(lab(s)));assert.throws(()=>simulateFlow(s,{days:1,players:1}),/tài nguyên/);
  for(const kind of ['source','drain','converter'])s=addGraphNode(s,kind,{x:10,y:20});
  s=addGraphNode(s,'resource');assert.ok(s.rules.every(r=>!ruleComplete(r)));
  assert.doesNotThrow(()=>validateFlowLab(lab(JSON.parse(JSON.stringify(s)))));
  assert.doesNotThrow(()=>validateFlowOptions(s,{days:30,players:100},{runnable:false}));
  assert.throws(()=>simulateFlow(s,{days:1,players:1}),/Nguồn thu mới.*Tiêu hao mới.*Crafting mới/);
  s.rules.forEach(r=>r.enabled=false);const r=simulateFlow(s,{days:3,players:2});
  assert.equal(r.resources[0].mean,0);assert.ok(r.rules.every(r=>r.eligible===0));
  const legacy=copy(s);delete legacy.rules[0].kind;assert.throws(()=>validateFlowScenario(legacy),/ít nhất một/);
});

test('canvas connections retain resource flow direction and enforce typed ports without silent duplicates',()=>{
  let s=fixture();const [a,b]=s.resources.map(x=>x.id),[source,craft,drain]=s.rules.map(x=>x.id),before=copy(s);
  for(const [from,to] of [[a,b],[source,craft],[a,source],[drain,b],[a,'missing']])assert.throws(()=>connectGraph(s,from,to));
  assert.deepEqual(s,before);
  for(const amount of [0,-1,NaN,Infinity,1e9+1])assert.throws(()=>connectGraph(s,source,a,amount));
  s=connectGraph(s,source,a,4);s=connectGraph(s,a,craft,2);s=connectGraph(s,craft,b,3);s=connectGraph(s,b,drain,1);
  const snapshot=copy(s);assert.throws(()=>connectGraph(s,source,a,8),/đã tồn tại/);assert.deepEqual(s,snapshot);
  assert.ok(s.rules.every(ruleComplete));
  const r=simulateFlow(s,{days:3,players:2});assert.equal(inventory(r,a).mean,6);assert.equal(inventory(r,b).mean,6);
  const edge=graphEdges(s).find(e=>e.from===craft),updated=updateGraphEdge(s,edge.id,4);
  assert.equal(updated.rules[1].outputs[0].amount,4);assert.equal(s.rules[1].outputs[0].amount,3);
  assert.equal(inventory(simulateFlow(updated,{days:3,players:1}),b).mean,9);
  assert.throws(()=>updateGraphEdge(s,'missing',1),/không tồn tại/);assert.throws(()=>disconnectGraph(s,'missing'),/không tồn tại/);
});

test('disconnecting crafting never turns its output into a free source',()=>{
  const s=makeFlowScenario('crafting'),craft=s.rules.find(r=>r.id==='craft');
  let n=s;for(const x of craft.inputs)n=disconnectGraph(n,`${craft.id}:input:${x.resource}`);
  assert.equal(n.rules.find(r=>r.id==='craft').kind,'converter');
  assert.equal(n.rules.find(r=>r.id==='craft').outputs[0].amount,1);
  assert.throws(()=>simulateFlow(n,{days:10,players:1}),/Chế tạo kiếm/);
  n.rules.find(r=>r.id==='craft').enabled=false;
  assert.equal(inventory(simulateFlow(n,{days:10,players:1}),'sword').mean,0);
  assert.equal(craft.kind,undefined);assert.equal(craft.inputs.length,3);
});

test('deleting resources cleans amounts, goals and positions; removed unlock conditions disable the rule',()=>{
  const s=autoLayoutGraph(makeFlowScenario('crafting')),before=copy(s);
  const n=deleteGraphNodes(s,['level','sword']);
  assert.ok(!n.resources.some(r=>['level','sword'].includes(r.id)));
  assert.equal(n.milestones.length,0);assert.equal(n.canvas.positions.level,undefined);assert.equal(n.canvas.positions.sword,undefined);
  assert.equal(n.rules.find(r=>r.id==='unlock').condition,null);assert.equal(n.rules.find(r=>r.id==='unlock').enabled,false);
  assert.equal(n.rules.find(r=>r.id==='craft').kind,'converter');assert.equal(n.rules.find(r=>r.id==='craft').outputs.length,0);
  assert.equal(n.rules.length,s.rules.length);assert.doesNotThrow(()=>validateFlowScenario(n));assert.deepEqual(s,before);
  assert.throws(()=>simulateFlow(n,{days:1,players:1}),/chưa nối đủ/);
  const empty=deleteGraphNodes(n,graphNodes(n).map(x=>x.id));assert.equal(graphNodes(empty).length,0);assert.equal(graphEdges(empty).length,0);assert.deepEqual(empty.canvas.positions,{});assert.doesNotThrow(()=>validateFlowLab(lab(empty)));
  assert.throws(()=>deleteGraphNodes(s,['missing']),/không tồn tại/);
});

test('canvas view and positions round-trip independently of simulation; copied scenarios keep their layout',()=>{
  const s=autoLayoutGraph(makeFlowScenario('economy')),initial=copy(s);
  let n=moveGraphNodes(s,{currency:{x:-125.25,y:730},daily:{x:890,y:-15}});
  n=setGraphViewport(n,{x:-280,y:40,zoom:.75});
  assert.deepEqual(s,initial);assert.deepEqual(n.canvas.positions.currency,{x:-125.25,y:730});
  const duplicated=JSON.parse(JSON.stringify(n));duplicated.id=crypto.randomUUID();duplicated.name='Bản sao';
  assert.doesNotThrow(()=>validateFlowScenario(duplicated));assert.deepEqual(duplicated.canvas,n.canvas);
  assert.deepEqual(outcome(simulateFlow(n,{days:20,players:3})),outcome(simulateFlow(s,{days:20,players:3})));
  const added=addGraphNode(n,'resource',{x:200,y:400});assert.deepEqual(added.canvas.positions.currency,n.canvas.positions.currency);
  assert.throws(()=>moveGraphNodes(n,{unknown:{x:10,y:20}}),/không hợp lệ/);
  for(const p of [{x:Infinity,y:0},{x:0,y:NaN},{x:100001,y:0},null])assert.throws(()=>moveGraphNodes(n,{currency:p}));
});

test('canvas import rejects stale IDs and unsafe bounds; cycle layout is stable and finite',()=>{
  const s=autoLayoutGraph(makeFlowScenario('economy'));
  for(const mutate of [n=>n.canvas.version=2,n=>n.canvas.positions.unknown={x:0,y:0},n=>n.canvas.positions.currency.x=NaN,n=>n.canvas.positions.currency=null,n=>n.canvas.viewport.zoom=0,n=>n.canvas.viewport.zoom=3.1,n=>n.canvas.viewport.y=-100001,n=>n.canvas.positions=[]]){const n=copy(s);mutate(n);assert.throws(()=>validateFlowScenario(n));}
  assert.doesNotThrow(()=>validateCanvas(undefined,s));
  const inherited=makeFlowScenario('blank');inherited.resources.push({id:'toString',name:'Named resource',initial:0,capacity:null});inherited.canvas={version:1,positions:{},viewport:{x:0,y:0,zoom:1}};
  assert.ok(graphNodes(inherited).every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));
  const cycle=makeFlowScenario('crafting');cycle.rules.find(r=>r.id==='craft').outputs.push({resource:'ore',amount:1});
  const arranged=autoLayoutGraph(cycle),twice=autoLayoutGraph(arranged),nodes=graphNodes(arranged);
  assert.deepEqual(arranged.canvas,twice.canvas);assert.equal(new Set(nodes.map(n=>`${n.x},${n.y}`)).size,nodes.length);
  assert.ok(nodes.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));assert.doesNotThrow(()=>simulateFlow(arranged,{days:10,players:1}));
});
