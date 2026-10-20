import test from 'node:test';
import assert from 'node:assert/strict';
import {balanceBanner,balanceProbability,balanceParameters,balanceConfig,balanceMatches,applyBalanceCandidate,validateBalanceOptions} from '../core/balance.mjs';
import {clone,preset} from '../core/engine.mjs';
import {forecast} from '../core/forecast.mjs';
import {upgradeWorkspace,runConfig,activeBanner} from '../core/workspace.mjs';
import {balanceState,syncBalance,balancePage,balanceChange,balanceAction} from '../ui/balance-lab.mjs';

const config=(weight=1)=>({version:2,name:'Balance test',rng:'custom',seed:42,root:{id:'root',name:'Banner',weight:1,children:[{id:'target',name:'Target',weight},{id:'other',name:'Other',weight:1}]}});
const options={target:'target',copies:1,pulls:1,desired:.75,parameter:{kind:'weight',nodeId:'target'},min:1,max:9,samples:9,profileId:'profile',bannerId:'banner'};
const context={profileId:'profile',bannerId:'banner'};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} ≠ ${b}`);

test('finite weight sweep finds a known target and preserves source config',()=>{
  const c=config(),original=clone(c),progress=[],r=balanceBanner(c,options,p=>progress.push(p));
  close(r.baseline.probability,.5);assert.equal(r.rows[r.bestIndex].value,3);close(r.rows[r.bestIndex].probability,.75);
  assert.equal(r.rows.length,9);assert.equal(r.evaluated,9);assert.deepEqual(c,original);assert.deepEqual(progress.at(-1),{done:10,total:10});
  const next=applyBalanceCandidate(c,r,r.bestIndex,context);assert.equal(next.root.children[0].weight,3);assert.deepEqual(c,original);assert.equal(next.root.children[1].weight,1);
});
test('planned probability counts at least K, matches binomial, and stops at N',()=>{
  const c=config(1/9),r=balanceProbability(c,'target',2,10);
  close(r.probability,1-.9**10-10*.1*.9**9);assert.equal(r.examined,10);assert.equal(r.status,'complete');close(r.rates.base,.1);close(r.rates.next,.1);
  assert.equal(balanceProbability(c,'target',3,2).probability,0);
});
test('hard-pity sweep retains soft/counter/reset state and uses only legal intervals',()=>{
  const c=config(0);c.root.pity={enabled:true,target:'target',hard:5,soft:2,step:0,start:2};c.pityReset={onTarget:false};
  const p=balanceParameters(c).find(p=>p.kind==='hard');assert.equal(p.min,3);
  const r=balanceBanner(c,{...options,parameter:p,min:3,max:6,samples:7,pulls:2,desired:1});
  assert.equal(r.rows.length,4);assert.equal(r.rows[r.bestIndex].value,4);assert.equal(r.rows[r.bestIndex].probability,1);
  const next=applyBalanceCandidate(c,r,r.bestIndex,context);assert.deepEqual(next.root.pity,{...c.root.pity,hard:4});assert.deepEqual(next.pityReset,c.pityReset);
  assert.throws(()=>balanceConfig(c,p,2),/khoảng hợp lệ/);assert.throws(()=>balanceBanner(c,{...options,parameter:p,min:2,max:6}),/Khoảng thử/);
});
test('planned evaluator matches Calculate for nested pity, reset modes and all copy counts',()=>{
  const c=preset();Object.assign(c.root.pity,{hard:4,soft:3,step:.15,start:1});
  for(const onTarget of [true,false])for(const target of ['featured','lyra','sword','dust'])for(const copies of [1,2,3]){
    c.pityReset={onTarget};const n=7,a=balanceProbability(c,target,copies,n),b=forecast(c,target,copies,n,()=>{},{maxPulls:n});
    assert.equal(a.status,'complete');close(a.probability,b.atLeast);close(a.rates.base,b.rates.base);close(a.rates.next,b.rates.next);
  }
});
test('ordered competing pity and zero-weight reachable targets agree with Calculate',()=>{
  const c=config(0);c.version=3;c.root.pities=[{id:'p1',name:'Other first',enabled:true,target:'other',hard:3,soft:0,step:0,start:2},{id:'p2',name:'Target deferred',enabled:true,target:'target',hard:3,soft:0,step:0,start:2}];
  for(const onTarget of [true,false])for(const copies of [1,2,3])for(const pulls of [1,2,4,9]){
    c.pityReset={onTarget};const a=balanceProbability(c,'target',copies,pulls),b=forecast(c,'target',copies,pulls,()=>{},{maxPulls:pulls});close(a.probability,b.atLeast);
  }
  assert.equal(balanceProbability(c,'target',1,1).probability,0);assert.equal(balanceProbability(c,'target',1,2).probability,1);
});
test('unreachable and invalid candidates are distinct from budget-limited results',()=>{
  assert.equal(balanceProbability(config(0),'target',1,10).status,'unreachable');
  const r=balanceBanner(config(),{...options,maxOperations:1});assert.equal(r.bestIndex,null);assert.equal(r.evaluated,0);assert.ok(r.rows.every(row=>row.status==='budget'&&row.probability===null));
  const c=config();c.root.children.pop();const invalid=balanceBanner(c,{...options,min:0,max:1,samples:2});assert.equal(invalid.rows[0].status,'invalid');assert.equal(invalid.rows[0].probability,null);assert.equal(invalid.rows[1].probability,1);
  assert.throws(()=>applyBalanceCandidate(c,invalid,0,context),/tính xong/);
});
test('bounded sweep validates all inputs and allows a single repeated endpoint',()=>{
  for(const patch of [{samples:32},{samples:1},{samples:2.5},{pulls:10001},{copies:51},{desired:1.1},{desired:NaN},{min:-1},{min:10,max:1},{max:1e9+1},{target:'root'},{parameter:{kind:'weight',nodeId:'root'}},{maxOperations:1000001}])assert.throws(()=>validateBalanceOptions(config(),{...options,...patch}));
  const r=balanceBanner(config(),{...options,min:3,max:3,samples:31});assert.equal(r.rows.length,1);assert.equal(r.rows[0].value,3);
});
test('applying preview rejects edited configs, switched banners, and invalid row indices',()=>{
  const c=config(),r=balanceBanner(c,options);assert.equal(balanceMatches(c,r,context),true);
  const changed=clone(c);changed.root.children[1].weight=2;
  assert.throws(()=>applyBalanceCandidate(changed,r,0,context),/đã thay đổi/);
  assert.throws(()=>applyBalanceCandidate(c,r,0,{...context,bannerId:'other'}),/đã thay đổi/);
  assert.throws(()=>applyBalanceCandidate(c,r,0,{...context,profileId:'other'}),/đã thay đổi/);
  for(const index of [-1,.5,999])assert.throws(()=>applyBalanceCandidate(c,r,index,context),/tính xong/);
});
test('UI changes stop pending work, requests contain snapshot IDs, and changed config discards preview',async()=>{
  const doc=upgradeWorkspace({version:1,config:config(),history:[]});syncBalance(doc);let stopped=0,request;
  const ctx={doc,render:()=>{},stopWorker:()=>stopped++,runWorker:(type,args)=>{request={type,args};}};
  assert.equal(await balanceChange({dataset:{balanceField:'pulls'},value:'1'},ctx),true);assert.equal(stopped,1);
  await balanceChange({dataset:{balanceField:'desired'},value:'75'},ctx);
  await balanceAction('balance-run',{dataset:{}},ctx);assert.equal(request.type,'balance');assert.equal(request.args[1].desired,.75);assert.equal(request.args[1].profileId,doc.activeProfileId);assert.equal(request.args[1].bannerId,activeBanner(doc).id);
  balanceState.result=balanceBanner(...request.args);assert.match(balancePage(doc,'',''),/data-action="balance-apply"/);
  assert.equal(balanceMatches(runConfig(doc),balanceState.result,{profileId:doc.activeProfileId,bannerId:activeBanner(doc).id}),true);
  doc.config.root.children[0].weight=7;syncBalance(doc);assert.equal(balanceState.result,null);
});
