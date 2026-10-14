import {clone,walk,customRandom,unityEmulated,validateTape,leafRates} from './engine.mjs';
import {rulesFor,ruleProbabilities,ruleTransition,allRuleEntries} from './pity-rules.mjs';

export function machine(config,maxOperations=40000000){
  const entries=allRuleEntries(config),positions=new Map(entries.map((e,i)=>[e.id,i])),initial=entries.map(e=>e.rule.start),cache=new Map();let operations=0,branches=0;
  function limit(){if(++operations>maxOperations||cache.size>50000||branches>250000){const e=Error('Nhiều pity vượt giới hạn tính chính xác: 50.000 trạng thái / 250.000 nhánh / 40 triệu bước. Giảm độ phức tạp hoặc dùng Simulate.');e.code='PITY_LIMIT';throw e;}}
  function edges(state){const key=state.join(',');if(cache.has(key))return cache.get(key);const out=[];
    const counters=Object.fromEntries(entries.map((e,i)=>[e.id,state[i]]));
    function visit(node,mass,next,events){limit();if(!node.children){branches++;out.push({state:next,key:next.join(','),mass,leaf:node.id,events});return;}
      const ps=ruleProbabilities(node,counters);
      node.children.forEach((c,j)=>{if(ps[j]===0)return;const updated=next.slice(),log=events.slice();
        for(const r of rulesFor(node)){const i=positions.get(r.id),t=ruleTransition(node,r,counters,c.id,config.pityReset,ps);updated[i]=t.after;log.push([i,t.flags]);}
        visit(c,mass*ps[j],updated,log);
      });
    }visit(config.root,1,state,[]);cache.set(key,out);return out;
  }
  return {entries,initial,edges,limit,cache};
}
const stat=()=>({visits:0,hardHits:0,softVisits:0,softWins:0,targetHits:0,resets:0,deferred:0});
function addEvent(s,flags,mass=1){s.visits+=mass;if(flags&1)s.hardHits+=mass;if(flags&2)s.softVisits+=mass;if((flags&6)===6)s.softWins+=mass;if(flags&4)s.targetHits+=mass;if(flags&8)s.resets+=mass;if(flags&16)s.deferred+=mass;}

export function simulateMulti(config,pulls,{tape,onProgress=()=>{}}={}) {
  if(!Number.isInteger(pulls)||pulls<1||pulls>1000000)throw Error('Mô phỏng từ 1 đến 1.000.000 lượt.');
  let used=0;const rng=config.rng==='custom'?customRandom(config.seed):config.rng==='unity-emulated'?unityEmulated(config.seed):(()=>{validateTape(tape);return ()=>{if(used>=tape.values.length)throw Error('Đã dùng hết mẫu Unity.');return Math.min(tape.values[used++],1-Number.EPSILON);};})();
  const entries=allRuleEntries(config),counters={},poolStats={},counts={},sequence=[],logs=new Map(),pitySummary={hardTriggers:0,hardPulls:0,softWins:0,resets:0,deferred:0};
  for(const e of entries){counters[e.id]=e.rule.start;poolStats[e.id]={...stat(),name:e.name};logs.set(e.id,{id:e.id,rolls:[],after:[],flags:[]});}
  walk(config.root,n=>{if(!n.children)counts[n.id]=0;});
  for(let roll=1;roll<=pulls;roll++){
    let node=config.root,hard=false;
    while(node.children){const ps=ruleProbabilities(node,counters),draw=rng();let sum=0,j=ps.findLastIndex(p=>p>0);for(let i=0;i<ps.length;i++){sum+=ps[i];if(draw<sum){j=i;break;}}
      const child=node.children[j],updates=rulesFor(node).map(r=>[r,ruleTransition(node,r,counters,child.id,config.pityReset,ps)]);
      for(const [r,t] of updates){counters[r.id]=t.after;addEvent(poolStats[r.id],t.flags);const log=logs.get(r.id);log.rolls.push(roll);log.after.push(t.after);log.flags.push(t.flags);
        if(t.flags&1){pitySummary.hardTriggers++;hard=true;}if((t.flags&6)===6)pitySummary.softWins++;if(t.flags&8)pitySummary.resets++;if(t.flags&16)pitySummary.deferred++;
      }node=child;
    }counts[node.id]++;sequence.push(node.id);if(hard)pitySummary.hardPulls++;if(roll%10000===0)onProgress(roll/pulls);
  }
  return {id:crypto.randomUUID(),createdAt:new Date().toISOString(),config:clone(config),pulls,counts,sequence,counters,poolStats,pityLog:{version:2,pools:[...logs.values()]},pitySummary,randomSamples:used||null,unity:tape&&config.rng==='unity'?{version:tape.unityVersion,seed:tape.seed,samples:tape.values.length}:null};
}

export function expectedMulti(config,pulls,targetId){
  if(!Number.isInteger(pulls)||pulls<1||pulls>10000)throw Error('Số lượt tính pity từ 1–10.000.');
  const target=leafRates(config.root,config.pityReset).find(n=>n.id===targetId);if(!target)throw Error('Không tìm thấy item mục tiêu.');
  const m=machine(config),stats=m.entries.map(e=>({...stat(),id:e.id,name:e.name}));let targetHits=0,hardPulls=0;
  let dist=new Map([[m.initial.join(','),{state:m.initial,mass:1}]]);
  for(let n=0;n<pulls;n++){const next=new Map();for(const entry of dist.values())for(const edge of m.edges(entry.state)){m.limit();const mass=entry.mass*edge.mass;let hard=false;if(edge.leaf===targetId)targetHits+=mass;
    for(const [i,flags] of edge.events){addEvent(stats[i],flags,mass);if(flags&1)hard=true;}if(hard)hardPulls+=mass;
    const old=next.get(edge.key);if(old)old.mass+=mass;else next.set(edge.key,{state:edge.state,mass});
  }dist=next;}
  return {pools:stats,hardTriggers:stats.reduce((n,s)=>n+s.hardHits,0),hardPulls,softWins:stats.reduce((n,s)=>n+s.softWins,0),deferred:stats.reduce((n,s)=>n+s.deferred,0),targetHits,rate:targetHits/pulls,withoutPity:target.base,pulls};
}

export function analyzeMulti(config,id,copies,pulls,horizon,onProgress=()=>{}){
  if(!Number.isInteger(copies)||copies<1||copies>50)throw Error('Số bản sao từ 1 đến 50.');
  if(!Number.isInteger(pulls)||pulls<1||pulls>10000||!Number.isInteger(horizon)||horizon<pulls||horizon>10000)throw Error('Số lượt/horizon phải từ 1–10.000 và horizon ≥ số lượt.');
  const rates=leafRates(config.root,config.pityReset).find(n=>n.id===id);if(!rates)throw Error('Hãy chọn một item cuối cùng.');
  const m=machine(config);let dist=new Map([['0|'+m.initial.join(','),{state:m.initial,count:0,mass:1}]]),overflow=0,snapshot,lowerMean=0,guarantee=null,maxCdf=0;
  const curve=[{n:0,p:0}],quantiles={50:null,90:null,95:null,99:null};
  for(let n=1;n<=horizon;n++){
    for(const e of dist.values())if(e.count<copies)lowerMean+=e.mass;
    const next=new Map();
    for(const e of dist.values())for(const edge of m.edges(e.state)){m.limit();const count=e.count+(edge.leaf===id?1:0),mass=e.mass*edge.mass;if(count>copies){overflow+=mass;continue;}
      const key=count+'|'+edge.key,old=next.get(key);if(old)old.mass+=mass;else next.set(key,{state:edge.state,count,mass});
      if(next.size>250000)throw Error('Tính nhiều pity vượt 250.000 trạng thái và số bản sao. Giảm số bản sao/horizon hoặc dùng Simulate.');
    }
    dist=next;let exact=0,survives=false;for(const e of dist.values()){if(e.count===copies)exact+=e.mass;else survives=true;}
    maxCdf=Math.min(1,overflow+exact);if(!survives&&guarantee===null)guarantee=n;
    for(const q of Object.keys(quantiles))if(quantiles[q]===null&&maxCdf>=Number(q)/100-1e-12)quantiles[q]=n;
    if(n===pulls)snapshot={atLeast:maxCdf,exact:Math.min(1,exact)};
    if(n%Math.max(1,Math.floor(horizon/180))===0||n===pulls||n===horizon)curve.push({n,p:maxCdf});if(n%50===0)onProgress(n/horizon);
  }
  let pity;try{pity=expectedMulti(config,pulls,id);}catch(e){if(e.code!=='PITY_LIMIT')throw e;pity={unavailable:e.message};}
  return {id,copies,pulls,horizon,...snapshot,mean:guarantee===null?null:lowerMean,guarantee,quantiles,curve,lowerMean,tail:Math.max(0,1-maxCdf),states:m.cache.size*(copies+1),rates,pity,multi:true};
}
