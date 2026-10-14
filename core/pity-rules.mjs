export const rulesFor=pool=>Array.isArray(pool.pities)?pool.pities.filter(p=>p.enabled):pool.pity?.enabled?[{...pool.pity,id:pool.id,name:pool.name}]:[];
export const ruleCounter=(rule,counters)=>typeof counters==='object'?(counters[rule.id]??rule.start):rule.start;
export function ruleProbabilities(pool,counters={}) {
  const sum=pool.children.reduce((n,c)=>n+c.weight,0),base=pool.children.map(c=>c.weight/sum),rules=rulesFor(pool);
  const hard=rules.find(r=>ruleCounter(r,counters)+1>=r.hard);
  if(hard)return pool.children.map(c=>c.id===hard.target?1:0);
  // Boosted targets reserve probability in priority order; unreserved outcomes
  // share the remainder in proportion to their original weights.
  const boosts=new Map();
  for(const r of rules){
    const i=pool.children.findIndex(c=>c.id===r.target),roll=ruleCounter(r,counters)+1;
    if(r.soft>0&&roll>=r.soft){const wanted=Math.min(1,base[i]+(roll-r.soft+1)*r.step);if(wanted>base[i])boosts.set(i,Math.max(boosts.get(i)||0,wanted));}
  }
  if(!boosts.size)return base;
  const out=base.map(()=>0);let remaining=1;
  for(const [i,wanted] of boosts){out[i]=Math.min(remaining,wanted);remaining=Math.max(0,remaining-out[i]);}
  const rest=base.reduce((n,b,i)=>n+(boosts.has(i)?0:b),0);
  if(rest>0)base.forEach((b,i)=>{if(!boosts.has(i))out[i]=remaining*b/rest;});
  return out;
}
export function ruleTransition(pool,r,counters,childId,policy={},ps=ruleProbabilities(pool,counters)) {
  const old=ruleCounter(r,counters),due=old+1>=r.hard,hit=childId===r.target,hard=due&&hit,reset=hit&&(due||policy.onTarget!==false);
  const i=pool.children.findIndex(c=>c.id===r.target),base=pool.children[i].weight/pool.children.reduce((n,c)=>n+c.weight,0);
  const forced=rulesFor(pool).some(rule=>ruleCounter(rule,counters)+1>=rule.hard);
  const soft=!forced&&r.soft>0&&old+1>=r.soft&&r.step>0&&ps[i]>base;
  return {after:reset?0:Math.min(old+1,r.hard-1),flags:(hard?1:0)|(soft?2:0)|(hit?4:0)|(reset?8:0)|(due&&!hit?16:0)};
}
export function allRuleEntries(config) {
  const entries=[];
  function visit(n){for(const rule of rulesFor(n))entries.push({id:rule.id,rule,pool:n,name:n===config.root?`${config.name} · ${rule.name||'Pity'}`:n.name});n.children?.forEach(visit);}
  visit(config.root);return entries;
}
const cache=new Map();
export function multiEffective(pool,policy={}) {
  const active=rulesFor(pool);
  if(active.length<=1){
    const sum=pool.children.reduce((n,c)=>n+c.weight,0),base=pool.children.map(c=>c.weight/sum);
    if(!active.length)return base;
    const r=active[0],idx=pool.children.findIndex(c=>c.id===r.target);let survival=1,mean=0,hits=0;
    for(let k=0;k<r.hard;k++){const p=ruleProbabilities(pool,{[r.id]:k})[idx];mean+=survival;hits+=survival*p;if(k+1===r.hard||policy.onTarget!==false)survival*=1-p;}
    const rate=hits/mean;return base.map((b,i)=>i===idx?rate:base[idx]===1?0:b*(1-rate)/(1-base[idx]));
  }
  const signature=JSON.stringify([pool.children.map(c=>[c.id,c.weight]),pool.pities,policy]);
  if(cache.has(signature))return cache.get(signature);
  const rules=rulesFor(pool),unknown=pool.children.map(()=>NaN),nodes=[],index=new Map();let operations=0;
  function add(state){const key=state.join(',');if(index.has(key))return index.get(key);if(nodes.length>=4096)throw Error('limit');const i=nodes.length;index.set(key,i);nodes.push({state});return i;}
  let answer=unknown;
  try{
    add(rules.map(r=>r.start));
    for(let i=0;i<nodes.length;i++){
      const node=nodes[i],cs=Object.fromEntries(rules.map((r,j)=>[r.id,node.state[j]]));node.ps=ruleProbabilities(pool,cs);node.edges=[];
      pool.children.forEach((c,j)=>{if(node.ps[j]>0)node.edges.push([add(rules.map(r=>ruleTransition(pool,r,cs,c.id,policy,node.ps).after)),node.ps[j]]);});
    }
    let dist=new Float64Array(nodes.length);dist[0]=1;
    for(let iteration=0;iteration<20000;iteration++){
      const next=new Float64Array(nodes.length);
      for(let i=0;i<nodes.length;i++)if(dist[i]){next[i]+=dist[i]/2;for(const [j,p] of nodes[i].edges){if(++operations>8000000)throw Error('limit');next[j]+=dist[i]*p/2;}}
      let error=0;for(let i=0;i<dist.length;i++)error+=Math.abs(next[i]-dist[i]);dist=next;
      if(error<1e-12){answer=pool.children.map((_,j)=>nodes.reduce((sum,n,i)=>sum+dist[i]*n.ps[j],0));break;}
    }
  }catch{}
  if(cache.size>50)cache.clear();cache.set(signature,answer);return answer;
}
