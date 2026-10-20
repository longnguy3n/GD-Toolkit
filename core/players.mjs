import {validate,clone,leaves,customRandom,unityEmulated,validateTape} from './engine.mjs';
import {allRuleEntries,rulesFor,ruleProbabilities,ruleTransition} from './pity-rules.mjs';
import {validateEconomy} from './economy.mjs';
export const MAX_PLAYER_PULLS=2000000;
export function validatePlayerOptions(config,{target,copies,players,pulls}){
  validate(config);
  if(!leaves(config.root).some(n=>n.id===target))throw Error('Hãy chọn item cuối cùng cho mục tiêu.');
  for(const [value,max,label] of [[copies,50,'Số bản sao'],[players,10000,'Số người chơi'],[pulls,10000,'Lượt mỗi người']])if(!Number.isInteger(value)||value<1||value>max)throw Error(`${label} phải từ 1 đến ${max.toLocaleString('vi-VN')}.`);
  if(players*pulls>MAX_PLAYER_PULLS)throw Error('Tối đa 2.000.000 lượt cho cả nhóm. Hãy giảm số người hoặc lượt mỗi người.');
}
export function summarizePlayers(rows,copies){
  const histogram=new Map(),times=[];let hits=0,hardTriggers=0,hardPulls=0;
  for(const row of rows){histogram.set(row.copies,(histogram.get(row.copies)||0)+1);hits+=row.copies;hardTriggers+=row.hardTriggers;hardPulls+=row.hardPulls;if(row.firstHit!==null)times.push(row.firstHit);}
  times.sort((a,b)=>a-b);const sorted=rows.map(r=>r.copies).sort((a,b)=>a-b),n=rows.length;
  const quantiles=Object.fromEntries([50,90,95,99].map(q=>[q,times[Math.ceil(n*q/100)-1]??null]));
  return {successes:rows.filter(r=>r.copies>=copies).length,rate:times.length/n,meanCopies:hits/n,medianCopies:(sorted[Math.floor((n-1)/2)]+sorted[Math.floor(n/2)])/2,minCopies:sorted[0],maxCopies:sorted.at(-1),hardTriggers,hardPulls,quantiles,meanFirstHit:times.length?times.reduce((a,b)=>a+b,0)/times.length:null,histogram:[...histogram].sort((a,b)=>a[0]-b[0]).map(([copies,players])=>({copies,players}))};
}
export function simulatePlayers(config,options,{tape,onProgress=()=>{}}={}){
  validatePlayerOptions(config,options);const {target,copies,players,pulls}=options;
  let used=0;
  // One seeded stream per experiment. Never rewind the stream for each player:
  // their counters/inventory reset, but their random samples must differ.
  let random=config.rng==='custom'?customRandom(config.seed):config.rng==='unity-emulated'?unityEmulated(config.seed):null;
  if(!random){validateTape(tape);random=()=>{if(used>=tape.values.length)throw Error('Đã dùng hết mẫu Unity. Xuất thêm mẫu; kết quả chưa hoàn tất sẽ không được lưu.');return Math.min(tape.values[used++],1-Number.EPSILON);};}
  const entries=allRuleEntries(config),counts=Object.fromEntries(leaves(config.root).map(n=>[n.id,0])),ruleStats=entries.map(e=>({id:e.id,name:e.name,hardTriggers:0,deferred:0})),ruleIndex=new Map(ruleStats.map(s=>[s.id,s]));
  const rows=[];let completed=0;
  for(let player=0;player<players;player++){
    const counters=Object.fromEntries(entries.map(e=>[e.id,e.rule.start])),row={copies:0,firstHit:null,hardTriggers:0,hardPulls:0};
    for(let roll=1;roll<=pulls;roll++){
      let node=config.root,hard=false;
      while(node.children){
        const ps=ruleProbabilities(node,counters),draw=random();let sum=0,index=ps.findLastIndex(p=>p>0);
        for(let j=0;j<ps.length;j++){sum+=ps[j];if(draw<sum){index=j;break;}}
        const child=node.children[index];
        // Evaluate all rules using the pre-roll counters before applying updates.
        const updates=rulesFor(node).map(r=>[r,ruleTransition(node,r,counters,child.id,config.pityReset,ps)]);
        for(const [r,t] of updates){counters[r.id]=t.after;const s=ruleIndex.get(r.id);if(t.flags&1){row.hardTriggers++;s.hardTriggers++;hard=true;}if(t.flags&16)s.deferred++;}
        node=child;
      }
      counts[node.id]++;if(node.id===target){row.copies++;if(row.copies===copies)row.firstHit=roll;}
      if(hard)row.hardPulls++;
      if(++completed%5000===0)onProgress(completed/(players*pulls));
    }
    rows.push(row);
  }
  onProgress(1);
  return {version:1,id:crypto.randomUUID(),createdAt:new Date().toISOString(),config:clone(config),options:clone(options),rows,counts,ruleStats,summary:summarizePlayers(rows,copies),randomSamples:config.rng==='unity'?used:null,unity:config.rng==='unity'?{version:tape.unityVersion,seed:tape.seed}:null};
}
export function validatePlayerHistory(h){
  if(!h||h.version!==1||typeof h.id!=='string'||!/^[-\w]{1,80}$/.test(h.id)||typeof h.createdAt!=='string'||!Number.isFinite(Date.parse(h.createdAt)))throw Error('Lịch sử Players không hợp lệ.');
  validatePlayerOptions(h.config,h.options||{});
  validateEconomy(h.config.economy);
  if(!Array.isArray(h.rows)||h.rows.length!==h.options.players)throw Error('Lịch sử Players thiếu người chơi.');
  const {pulls,copies}=h.options,integer=(v,max)=>Number.isInteger(v)&&v>=0&&v<=max;
  for(const r of h.rows)if(!r||!integer(r.copies,pulls)||!integer(r.hardTriggers,pulls*208)||!integer(r.hardPulls,pulls)||(r.firstHit===null?r.copies>=copies:!Number.isInteger(r.firstHit)||r.firstHit<copies||r.firstHit>pulls||r.copies<copies))throw Error('Kết quả người chơi không hợp lệ.');
  const ids=leaves(h.config.root).map(n=>n.id),total=h.options.players*pulls;
  if(!h.counts||Object.keys(h.counts).length!==ids.length||ids.some(id=>!Object.hasOwn(h.counts,id)||!integer(h.counts[id],total))||Object.values(h.counts).reduce((a,b)=>a+b,0)!==total||h.counts[h.options.target]!==h.rows.reduce((n,r)=>n+r.copies,0))throw Error('Tổng item Players không hợp lệ.');
  const entries=allRuleEntries(h.config);
  if(!Array.isArray(h.ruleStats)||h.ruleStats.length!==entries.length||h.ruleStats.some((s,i)=>s.id!==entries[i].id||typeof s.name!=='string'||s.name.length>300||!integer(s.hardTriggers,total)||!integer(s.deferred,total)))throw Error('Thống kê pity Players không hợp lệ.');
  if(h.rows.some(r=>r.hardPulls>r.hardTriggers)||h.rows.reduce((n,r)=>n+r.hardTriggers,0)!==h.ruleStats.reduce((n,r)=>n+r.hardTriggers,0))throw Error('Tổng pity Players không khớp.');
  if(JSON.stringify(h.summary)!==JSON.stringify(summarizePlayers(h.rows,copies)))throw Error('Tổng kết Players không khớp.');
  return h;
}
