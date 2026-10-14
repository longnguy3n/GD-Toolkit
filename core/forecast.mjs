import {validate,probabilities,nextCounter,targetPath,waitingSummary,leafRates,expectedPity} from './engine.mjs';
import {machine as bannerMachine} from './multi-pity.mjs';
export const FORECAST_MAX_PULLS=1000000;
const budgetError=()=>Object.assign(Error('Đã chạm giới hạn tính toán tự động. Các mốc chưa tìm được không có nghĩa là không thể đạt.'),{code:'PITY_LIMIT'});

// Single-pity pools only need counters on the target's ancestor path. Multi-pity
// banners use the full machine because competing priorities affect the outcome.
function pathMachine(config,path,maxOperations){
  const initial=path.map(({pool})=>pool.pity?.enabled?pool.pity.start:0),cache=new Map();let operations=0,branches=0;
  function limit(){if(++operations>maxOperations||cache.size>50000||branches>250000)throw budgetError();}
  function edges(state){const key=state.join(',');if(cache.has(key))return cache.get(key);const out=[];
    function add(next,mass,hit){branches++;out.push({state:next,key:next.join(','),mass,hit});}
    function visit(depth,mass,next){limit();if(depth===path.length){add(next,mass,true);return;}
      const {pool,child}=path[depth],ps=probabilities(pool,state[depth]);
      pool.children.forEach((c,j)=>{if(ps[j]===0)return;const updated=next.slice();updated[depth]=nextCounter(pool,state[depth],c.id,config.pityReset);
        if(c.id===child.id)visit(depth+1,mass*ps[j],updated);else add(updated,mass*ps[j],false);
      });
    }
    visit(0,1,state);cache.set(key,out);return out;
  }
  return {initial,edges,limit,cache};
}

// Absorb once K copies have been acquired. No exact-K bucket is needed, and
// searching quantiles continues beyond the user's planned N without restarting.
export function forecast(config,id,copies,pulls,onProgress=()=>{},options={}){
  validate(config);
  if(!Number.isInteger(copies)||copies<1||copies>50)throw Error('Số bản sao từ 1 đến 50.');
  if(!Number.isInteger(pulls)||pulls<1||pulls>10000)throw Error('Số lượt dự định quay từ 1–10.000.');
  const maxPulls=options.maxPulls??FORECAST_MAX_PULLS,maxOperations=options.maxOperations??40000000;
  if(!Number.isInteger(maxPulls)||maxPulls<pulls||maxPulls>FORECAST_MAX_PULLS||!Number.isInteger(maxOperations)||maxOperations<1||maxOperations>40000000)throw Error('Giới hạn dự báo không hợp lệ.');
  const path=targetPath(config.root,id);if(!path)throw Error('Hãy chọn một item cuối cùng.');
  const multi=Array.isArray(config.root.pities),m=multi?bannerMachine(config,maxOperations):pathMachine(config,path,maxOperations);
  const quantiles={50:null,90:null,95:null,99:null};let curve=[{n:0,p:0}];
  let dist=new Map([['0|'+m.initial.join(','),{state:m.initial,count:0,mass:1}]]),reached=0,atLeast=null,examined=0,lowerMean=0,guarantee=null,status='limit',everHit=false;
  const sample=(n,p)=>{if(curve.at(-1).n!==n)curve.push({n,p});if(curve.length>400)curve=curve.filter((_,i)=>i%2===0||i===curve.length-1);};
  for(let n=1;n<=maxPulls;n++){
    let survival=0;for(const e of dist.values())survival+=e.mass;
    const next=new Map();let gained=0;const priorCache=m.cache.size;
    try{
      for(const e of dist.values())for(const edge of m.edges(e.state)){
        m.limit();const hit=multi?edge.leaf===id:edge.hit;everHit||=hit;
        const count=e.count+(hit?1:0),mass=e.mass*edge.mass;
        if(count>=copies){gained+=mass;continue;}
        const key=count+'|'+edge.key,old=next.get(key);if(old)old.mass+=mass;else next.set(key,{state:edge.state,count,mass});
        // Keep zero-mass support states too: numerical underflow is not proof
        // that a finite absolute guarantee exists.
        if(next.size>250000)throw budgetError();
      }
    }catch(e){if(e.code!=='PITY_LIMIT')throw e;status='budget';break;}
    dist=next;lowerMean+=survival;reached=Math.min(1,reached+gained);examined=n;
    if(!dist.size&&guarantee===null)guarantee=n;
    let newMilestone=false;
    for(const q of Object.keys(quantiles))if(quantiles[q]===null&&reached>=Number(q)/100-1e-12){quantiles[q]=n;newMilestone=true;}
    if(n===pulls)atLeast=reached;
    if(n%10===0||n===pulls||newMilestone)sample(n,reached);
    if(n%50===0)onProgress({examined:n});
    if(!everHit&&priorCache===m.cache.size&&[...m.cache.values()].every(edges=>edges.every(e=>m.cache.has(e.key)))){status='unreachable';atLeast=0;break;}
    if(n>=pulls&&quantiles[99]!==null){status='complete';break;}
  }
  sample(examined,reached);
  const waiting=multi?{mean:null,guarantee}:waitingSummary(path,copies);
  if(multi||config.pityReset?.onTarget===false)waiting.mean=guarantee!==null?lowerMean:null;
  let pity;
  if(atLeast===null)pity={unavailable:'Chưa tính xong thống kê tại số lượt dự định do giới hạn tài nguyên. Có thể dùng Simulate để kiểm chứng.'};
  else try{pity=expectedPity(config,pulls,id);}catch(e){if(e.code!=='PITY_LIMIT')throw e;pity={unavailable:e.message};}
  return {id,copies,pulls,atLeast,quantiles,curve,search:{status,examined,maxPulls},...waiting,lowerMean,tail:Math.max(0,1-reached),rates:leafRates(config.root,config.pityReset).find(r=>r.id===id),pity};
}
