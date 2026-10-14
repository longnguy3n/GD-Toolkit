import {validateEconomy} from './economy.mjs';
export const VERSION = 1;
export const clone = x => structuredClone(x);
export function preset() {
  return {version:1,name:'Character Event · 90 pity',rng:'custom',seed:2026,root:{id:'root',name:'Character banner',weight:1,children:[
    {id:'legend',name:'5★ · Legendary',weight:6,children:[
      {id:'featured',name:'Astra · Featured',weight:50},
      {id:'standard',name:'Standard characters',weight:50,children:[
        {id:'lyra',name:'Lyra',weight:1},{id:'orion',name:'Orion',weight:1},{id:'nova',name:'Nova',weight:1}
      ]}
    ],pity:{enabled:true,target:'featured',hard:2,soft:0,step:0,start:0}},
    {id:'epic',name:'4★ · Epic',weight:51,children:[{id:'sword',name:'Moonblade',weight:1},{id:'bow',name:'Windbow',weight:1}]},
    {id:'common',name:'3★ · Common',weight:943,children:[{id:'dust',name:'Stardust',weight:3},{id:'shard',name:'Crystal shard',weight:1}]}
  ],pity:{enabled:true,target:'legend',hard:90,soft:74,step:0.06,start:0}}};
}
export function walk(root, fn, path=[]) {fn(root,path); for(const child of root.children||[]) walk(child,fn,[...path,root]);}
export function findNode(root,id) {let result; walk(root,n=>{if(n.id===id) result=n;}); return result;}
export function leaves(root) {let out=[];walk(root,(n,path)=>{if(!n.children)out.push({...n,path:path.map(p=>p.name).concat(n.name).join(' / ')});});return out;}
export function validate(config) {
  if(!config || config.version!==1 || !config.root)throw Error('Định dạng cấu hình không được hỗ trợ.');
  if(typeof config.name!=='string'||config.name.length>120)throw Error('Tên cấu hình tối đa 120 ký tự.');
  if(!['custom','unity-emulated','unity'].includes(config.rng))throw Error('Nguồn random không hợp lệ.');
  if(config.economy!==undefined)validateEconomy(config.economy);
  if(!Number.isInteger(config.seed)||config.seed<0||config.seed>4294967295)throw Error('Seed phải là số nguyên từ 0 đến 4.294.967.295.');
  let ids=new Set(), count=0;
  function visit(n,depth) {
    if(++count>200||depth>8)throw Error('Tối đa 200 node và 8 tầng pool.');
    if(!n || typeof n.id!=='string'||!/^[-\w]{1,80}$/.test(n.id)||['__proto__','constructor','prototype'].includes(n.id)||ids.has(n.id))throw Error('ID item không hợp lệ hoặc trùng nhau.');
    ids.add(n.id);
    if(typeof n.name!=='string'||!n.name.trim()||n.name.length>120)throw Error('Tên item phải có 1–120 ký tự.');
    if(!Number.isFinite(n.weight)||n.weight<0||n.weight>1e9)throw Error('Weight phải từ 0 đến 1 tỷ.');
    if(n.children!==undefined) {
      if(!Array.isArray(n.children)||!n.children.length)throw Error(`Pool “${n.name}” cần ít nhất một item.`);
      n.children.forEach(c=>visit(c,depth+1));
      if(!(n.children.reduce((s,c)=>s+c.weight,0)>0))throw Error(`Tổng weight của “${n.name}” phải lớn hơn 0.`);
      let p=n.pity;
      if(p?.enabled) {
        if(!n.children.some(c=>c.id===p.target))throw Error(`Chọn item được pity trong “${n.name}”.`);
        if(!Number.isInteger(p.hard)||p.hard<1||p.hard>1000)throw Error('Hard pity phải từ 1–1.000.');
        if(!Number.isInteger(p.soft)||p.soft<0||p.soft>p.hard)throw Error('Soft pity phải từ 0 đến hard pity; 0 = tắt.');
        if(!Number.isFinite(p.step)||p.step<0||p.step>1)throw Error('Mức tăng soft pity phải từ 0–100 điểm %.');
        if(!Number.isInteger(p.start)||p.start<0||p.start>=p.hard)throw Error('Pity hiện tại phải từ 0 đến hard pity − 1.');
      }
    } else if(n.pity?.enabled)throw Error('Chỉ pool mới được cấu hình pity.');
  }
  visit(config.root,0);
  if(!config.root.children)throw Error('Node gốc phải là pool.');
  return config;
}
export function probabilities(pool,counter=0) {
  let sum=pool.children.reduce((s,c)=>s+c.weight,0), out=pool.children.map(c=>c.weight/sum), p=pool.pity;
  if(!p?.enabled)return out;
  let i=pool.children.findIndex(c=>c.id===p.target), base=out[i], roll=counter+1;
  let rate=roll>=p.hard?1:Math.min(1,base+(p.soft>0&&roll>=p.soft?(roll-p.soft+1)*p.step:0));
  return out.map((x,j)=>j===i?rate:base===1?0:x*(1-rate)/(1-base));
}
export function nextCounter(pool,counter,childId) {return !pool.pity?.enabled||childId===pool.pity.target?0:Math.min(counter+1,pool.pity.hard-1);}
export function effective(pool) {
  let sum=pool.children.reduce((s,c)=>s+c.weight,0), base=pool.children.map(c=>c.weight/sum);
  if(!pool.pity?.enabled)return base;
  let idx=pool.children.findIndex(c=>c.id===pool.pity.target), survival=1, mean=0;
  for(let k=0;k<pool.pity.hard;k++){mean+=survival;survival*=1-probabilities(pool,k)[idx];}
  let rate=1/mean;
  return base.map((b,i)=>i===idx?rate:base[idx]===1?0:b*(1-rate)/(1-base[idx]));
}
export function leafRates(root) {
  const result=[];
  function rec(node,base,real,next,path) {
    if(!node.children){result.push({id:node.id,name:node.name,path:[...path,node.name].join(' / '),base,real,next});return;}
    let sum=node.children.reduce((s,c)=>s+c.weight,0), rates=effective(node), ps=probabilities(node,node.pity?.enabled?node.pity.start:0);
    node.children.forEach((c,i)=>rec(c,base*c.weight/sum,real*rates[i],next*ps[i],[...path,node.name]));
  }
  rec(root,1,1,1,[]);return result;
}
// xoshiro128** 1.1 by Blackman & Vigna (public domain), with a documented 32-bit seed mixer.
export function customRandom(seed) {
  let x=seed>>>0;
  function mix(){x=(x+0x9e3779b9)>>>0;let z=x;z=Math.imul(z^(z>>>16),0x21f0aaad);z=Math.imul(z^(z>>>15),0x735a2d97);return (z^(z>>>15))>>>0;}
  return xoshiroState([mix(),mix(),mix(),mix()]);
}
export function xoshiroState(state) {
  let s=Uint32Array.from(state);const rot=(x,k)=>(x<<k)|(x>>>(32-k));
  if(s.length!==4||!s.some(x=>x))throw Error('Trạng thái RNG không hợp lệ.');
  return ()=>{const r=Math.imul(rot(Math.imul(s[1],5),7),9)>>>0,t=s[1]<<9;s[2]^=s[0];s[3]^=s[1];s[1]^=s[2];s[0]^=s[3];s[2]^=t;s[3]=rot(s[3],11);return r/4294967296;};
}
export function validateTape(tape) {
  if(tape?.source!=='UnityEngine.Random.value'||typeof tape.unityVersion!=='string'||!Array.isArray(tape.values)||!tape.values.length||tape.values.length>3000000||tape.values.some(v=>!Number.isFinite(v)||v<0||v>1))throw Error('File Unity RNG không hợp lệ (tối đa 3 triệu mẫu, giá trị 0–1).');
  return tape;
}
// Unity documents the Xorshift128 family, but does not specify InitState/float mapping.
// This simulation uses a stated seed expansion and [0,1) mapping, not binary Unity parity.
export function unityEmulated(seed) {
  const mixer=customRandom(seed);return xorshiftState(Array.from({length:4},()=>Math.floor(mixer()*4294967296)));
}
export function xorshiftState(state) {
  let s=Uint32Array.from(state);
  if(s.length!==4||!s.some(x=>x))throw Error('Trạng thái RNG không hợp lệ.');
  return ()=>{let t=s[0]^(s[0]<<11);s[0]=s[1];s[1]=s[2];s[2]=s[3];s[3]=(s[3]^(s[3]>>>19)^t^(t>>>8))>>>0;return s[3]/4294967296;};
}
export function simulate(config,pulls,{tape,onProgress=()=>{}}={}) {
  validate(config);
  if(!Number.isInteger(pulls)||pulls<1||pulls>1000000)throw Error('Mô phỏng từ 1 đến 1.000.000 lượt.');
  let used=0, rng=config.rng==='custom'?customRandom(config.seed):config.rng==='unity-emulated'?unityEmulated(config.seed):(()=>{validateTape(tape);return ()=>{if(used>=tape.values.length)throw Error('Đã dùng hết mẫu Unity. Xuất file nhiều mẫu hơn; lượt chạy này chưa được lưu.');return Math.min(tape.values[used++],1-Number.EPSILON);};})();
  const counters={},counts={},sequence=[],poolStats={};
  walk(config.root,n=>{if(n.children){counters[n.id]=n.pity?.enabled?n.pity.start:0;poolStats[n.id]={visits:0,hardHits:0};}else counts[n.id]=0;});
  for(let roll=0;roll<pulls;roll++) {
    let node=config.root;
    while(node.children) {
      const ps=probabilities(node,counters[node.id]);let draw=rng(),cum=0,index=ps.findLastIndex(p=>p>0);
      for(let j=0;j<ps.length;j++){cum+=ps[j];if(draw<cum){index=j;break;}}
      poolStats[node.id].visits++;if(node.pity?.enabled&&counters[node.id]+1>=node.pity.hard)poolStats[node.id].hardHits++;
      const child=node.children[index];counters[node.id]=nextCounter(node,counters[node.id],child.id);node=child;
    }
    counts[node.id]++;sequence.push(node.id);
    if(roll%10000===0)onProgress(roll/pulls);
  }
  return {id:globalThis.crypto.randomUUID(),createdAt:new Date().toISOString(),config:clone(config),pulls,counts,sequence,counters,poolStats,randomSamples:used||null,unity:tape&&config.rng==='unity'?{version:tape.unityVersion,seed:tape.seed,samples:tape.values.length}:null};
}
function targetPath(root,id,path=[]) {
  if(root.id===id&&!root.children)return path;
  for(const c of root.children||[]){let p=targetPath(c,id,[...path,{pool:root,child:c}]);if(p)return p;}
}
function waitingSummary(path,copies) {
  let first=1,repeat=1,bound=1,repeatBound=1;
  for(const {pool,child} of [...path].reverse()) {
    const idx=pool.children.indexOf(child),p=pool.pity,base=child.weight/pool.children.reduce((s,c)=>s+c.weight,0);
    if(p?.enabled&&p.target!==child.id)return {mean:null,guarantee:null};
    let wait,reset,limit;
    if(p?.enabled){
      const meanFrom=start=>{let survival=1,total=0;for(let k=start;k<p.hard;k++){total+=survival;survival*=1-probabilities(pool,k)[idx];}return total;};
      wait=meanFrom(p.start);reset=meanFrom(0);
      limit=Array.from({length:p.hard},(_,k)=>k).find(k=>probabilities(pool,k)[idx]===1)+1;
    }else {wait=reset=base===0?Infinity:1/base;limit=base===1?1:Infinity;}
    first=wait+(first===1?0:(first-1)*reset);repeat*=reset;
    bound=Number.isFinite(bound)&&Number.isFinite(limit)?Math.max(1,limit-(p?.enabled?p.start:0))+(bound-1)*limit:Infinity;
    repeatBound*=limit;
  }
  const mean=first+(copies===1?0:(copies-1)*repeat),guarantee=bound+(copies===1?0:(copies-1)*repeatBound);
  return {mean:Number.isFinite(mean)?mean:null,guarantee:Number.isFinite(guarantee)?guarantee:null};
}
// Only counters on the selected leaf's ancestor path affect its marginal distribution.
// Other pools retain their own counters during simulation but are irrelevant to this calculation.
export function analyze(config,id,copies,pulls,horizon=2000,onProgress=()=>{}) {
  validate(config);
  if(!Number.isInteger(copies)||copies<1||copies>50)throw Error('Số bản sao từ 1 đến 50.');
  if(!Number.isInteger(pulls)||pulls<1||pulls>10000||!Number.isInteger(horizon)||horizon<pulls||horizon>10000)throw Error('Số lượt/horizon phải từ 1–10.000 và horizon ≥ số lượt.');
  const path=targetPath(config.root,id);if(!path)throw Error('Hãy chọn một item cuối cùng.');
  const multipliers=[];let stateSize=1;
  path.forEach(({pool})=>{multipliers.push(stateSize);stateSize*=pool.pity?.enabled?pool.pity.hard:1;});
  if(stateSize*(copies+1)>250000)throw Error('Cấu hình vượt 250.000 trạng thái tính chính xác. Giảm pity/số bản sao hoặc dùng Simulate.');
  let transitions=new Map(),operations=0;
  const decode=s=>path.map(({pool},i)=>Math.floor(s/multipliers[i])%(pool.pity?.enabled?pool.pity.hard:1));
  const encode=cs=>cs.reduce((s,c,i)=>s+c*multipliers[i],0);
  function edges(state) {
    if(transitions.has(state))return transitions.get(state);
    const cs=decode(state), out=[];
    function visit(depth,prob,next) {
      if(depth===path.length){out.push({state:encode(next),hit:1,p:prob});return;}
      const {pool,child}=path[depth],ps=probabilities(pool,cs[depth]);
      pool.children.forEach((c,j)=>{if(ps[j]===0)return;const updated=next.slice();updated[depth]=nextCounter(pool,cs[depth],c.id);if(c.id===child.id)visit(depth+1,prob*ps[j],updated);else out.push({state:encode(updated),hit:0,p:prob*ps[j]});});
    }
    visit(0,1,cs);transitions.set(state,out);return out;
  }
  const initial=encode(path.map(({pool})=>pool.pity?.enabled?pool.pity.start:0));
  let dist=new Map([[initial,1]]),overflow=0,snapshot,lowerMean=0,curve=[{n:0,p:0}],quantiles={50:null,90:null,95:null,99:null},maxCdf=0;
  for(let n=1;n<=horizon;n++) {
    let survival=0;for(const [key,v] of dist)if(Math.floor(key/stateSize)<copies)survival+=v;
    lowerMean+=survival;
    const next=new Map();
    for(const [key,mass] of dist) {
      const count=Math.floor(key/stateSize),state=key%stateSize;
      for(const t of edges(state)) {
        if(++operations>40000000)throw Error('Tính toán vượt ngân sách 40 triệu bước. Giảm horizon/số bản sao hoặc dùng Simulate.');
        const count2=count+t.hit;
        if(count2>copies){overflow+=mass*t.p;continue;}
        const key2=count2*stateSize+t.state;next.set(key2,(next.get(key2)||0)+mass*t.p);
      }
    }
    dist=next;let exact=0;for(const [key,v] of dist)if(Math.floor(key/stateSize)===copies)exact+=v;
    maxCdf=Math.min(1,overflow+exact);
    for(const q of Object.keys(quantiles))if(quantiles[q]===null&&maxCdf>=Number(q)/100-1e-12)quantiles[q]=n;
    if(n===pulls)snapshot={atLeast:maxCdf,exact:Math.min(1,exact)};
    if(n%Math.max(1,Math.floor(horizon/180))===0||n===pulls||n===horizon)curve.push({n,p:maxCdf});
    if(n%50===0)onProgress(n/horizon);
  }
  return {id,copies,pulls,horizon,...snapshot,...waitingSummary(path,copies),quantiles,curve,lowerMean,tail:Math.max(0,1-maxCdf),states:stateSize*(copies+1),rates:leafRates(config.root).find(r=>r.id===id)};
}
export function hardPityRate(base,hard) {
  if(!Number.isFinite(base)||base<0||base>1||!Number.isInteger(hard)||hard<1||hard>10000)throw Error('Rate phải từ 0–100%; hard pity từ 1–10.000.');
  return base===0?1/hard:base===1?1:base/(-Math.expm1(hard*Math.log1p(-base)));
}
export function suggestHardPity(base,target) {
  if(!Number.isFinite(target)||target<=0||target>1)throw Error('Rate thực mong muốn phải lớn hơn 0 và ≤100%.');
  let best=1,error=Infinity;
  for(let h=1;h<=10000;h++){const e=Math.abs(hardPityRate(base,h)-target);if(e<error){error=e;best=h;}}
  return {hard:best,rate:hardPityRate(base,best),error,limited:target<=base||target<hardPityRate(base,10000)};
}
