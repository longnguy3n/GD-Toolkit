import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate,analyze,effective,expectedPity,probabilities,pityFlags,validate} from '../core/engine.mjs';
import {pityAtRoll} from '../core/pity-log.mjs';
const near=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const config=(weight=0)=>({version:1,name:'Pity test',rng:'custom',seed:123,root:{id:'root',name:'Root',weight:1,children:[{id:'a',name:'A',weight},{id:'b',name:'B',weight:1-weight}],pity:{enabled:true,target:'a',hard:3,soft:0,step:0,start:0}}});

test('hard pity logs and exact rewards continue after the requested copy count',()=>{
  const c=config(),s=simulate(c,9),a=analyze(c,'a',1,9,9);
  assert.deepEqual(s.sequence,['b','b','a','b','b','a','b','b','a']);
  assert.equal(s.pitySummary.hardTriggers,3);assert.equal(s.pitySummary.hardPulls,3);
  assert.deepEqual(s.pityLog.pools[0].after,[1,2,0,1,2,0,1,2,0]);
  assert.deepEqual([1,2,3].map(n=>pityAtRoll(s,n)[0].remaining),[2,1,3]);
  assert.ok(pityAtRoll(s,3)[0].hard);assert.ok(pityAtRoll(s,3)[0].reset);
  near(a.pity.hardTriggers,3);near(a.pity.targetHits,3);near(a.pity.rate,1/3);near(a.rates.base,0);
});
test('natural-hit reset can be disabled independently of hard reset',()=>{
  const c=config(1);c.pityReset={onTarget:false,onHard:true};
  const s=simulate(c,7);assert.equal(s.counts.a,7);assert.equal(s.pitySummary.hardTriggers,2);
  assert.deepEqual(s.pityLog.pools[0].after,[1,2,0,1,2,0,1]);
  const a=expectedPity(c,7,'a');near(a.hardTriggers,2);near(a.targetHits,7);
  const p=config(.2);p.pityReset=c.pityReset;near(effective(p.root,p.pityReset)[0],(.2+.2+1)/3);
  assert.throws(()=>validate({...p,pityReset:{onTarget:false,onHard:false}}),/luôn reset/);
});
test('horizon only extends quantile search; N-pull pity rewards are unchanged',()=>{
  const c=config(.1);c.pityReset={onTarget:false};
  const a=analyze(c,'a',3,4,4),b=analyze(c,'a',3,4,20);
  near(a.atLeast,b.atLeast);near(a.pity.hardTriggers,b.pity.hardTriggers);near(a.pity.rate,b.pity.rate);
  assert.equal(a.quantiles[99],null);assert.ok(b.quantiles[99]>4);
});
test('soft hits are distinguishable from hard guarantees and natural hits',()=>{
  const c=config(.2);c.root.pity.soft=2;c.root.pity.step=.3;
  assert.equal(pityFlags(c.root,0,'a'),12); // hit + reset, no boost
  assert.equal(pityFlags(c.root,1,'a'),14); // boost + hit + reset
  assert.equal(pityFlags(c.root,1,'b'),2); // boost, miss
  assert.equal(pityFlags(c.root,2,'a'),13); // hard + hit + reset
});
test('sparse log recovers counters of untouched pools and multiple hard events in one pull',()=>{
  const c=config();c.root.children[0]={id:'a',name:'Rare',weight:0,children:[{id:'x',name:'X',weight:0},{id:'y',name:'Y',weight:1}],pity:{enabled:true,target:'x',hard:2,soft:0,step:0,start:0}};
  const s=simulate(c,6);assert.deepEqual(s.pityLog.pools[1].rolls,[3,6]);
  assert.equal(pityAtRoll(s,4)[1].after,1);assert.equal(pityAtRoll(s,4)[1].visited,false);
  assert.equal(pityAtRoll(s,6).filter(p=>p.hard).length,2);
  assert.equal(s.pitySummary.hardTriggers,3);assert.equal(s.pitySummary.hardPulls,2);
  const a=expectedPity(c,6,'x');near(a.hardTriggers,3);near(a.hardPulls,2);near(a.targetHits,1);
  assert.deepEqual(pityAtRoll(JSON.parse(JSON.stringify(s)),6),pityAtRoll(s,6));
});
test('all reset policies agree with independent complete small-tree enumeration',()=>{
  for(const onTarget of [true,false]){
    const c=config(.25);c.root.pity.hard=2;c.pityReset={onTarget};
    c.root.children[0]={id:'a',name:'Rare',weight:.25,children:[{id:'x',name:'X',weight:.4},{id:'y',name:'Y',weight:.6}],pity:{enabled:true,target:'x',hard:2,soft:0,step:0,start:0}};
    let states=[{mass:1,counters:{root:0,a:0},hits:0,hard:0,hardPulls:0}];
    for(let n=0;n<5;n++){
      const out=[];
      for(const st of states){function visit(node,mass,counters,events){
        if(!node.children){out.push({mass,counters,hits:st.hits+(node.id==='x'?1:0),hard:st.hard+events,hardPulls:st.hardPulls+(events?1:0)});return;}
        const old=counters[node.id],hard=old+1===node.pity.hard,ps=probabilities(node,old);
        node.children.forEach((ch,j)=>{if(!ps[j])return;const reset=ch.id===node.pity.target&&(hard||onTarget);visit(ch,mass*ps[j],{...counters,[node.id]:reset?0:Math.min(old+1,node.pity.hard-1)},events+(hard?1:0));});
      }visit(c.root,st.mass,st.counters,0);}
      states=out;
    }
    const sum=fn=>states.reduce((n,s)=>n+s.mass*fn(s),0),r=analyze(c,'x',1,5,8);
    near(r.exact,sum(s=>s.hits===1?1:0));near(r.atLeast,sum(s=>s.hits>=1?1:0));
    near(r.pity.targetHits,sum(s=>s.hits));near(r.pity.hardTriggers,sum(s=>s.hard));near(r.pity.hardPulls,sum(s=>s.hardPulls));
  }
});
