import {clone,validate,findNode,walk,targetPath} from './engine.mjs';
import {machine} from './multi-pity.mjs';
import {allRuleEntries,ruleProbabilities} from './pity-rules.mjs';

export const BALANCE_MAX_SAMPLES=31;
export const BALANCE_CANDIDATE_OPERATIONS=1000000;
const fingerprint=config=>JSON.stringify(config);
const limited=()=>Object.assign(Error('Vượt giới hạn trạng thái tính toán.'),{code:'PITY_LIMIT'});

// Finite, evenly spaced parameter sweep. The best row is the best evaluated
// sample, never a claim about a global optimum between samples.
export function balanceParameters(config){
  const out=[];
  walk(config.root,(node,path)=>{if(path.length)out.push({key:'weight:'+node.id,kind:'weight',nodeId:node.id,label:'Weight · '+path.slice(1).map(p=>p.name).concat(node.name).join(' / '),current:node.weight,min:0,max:1e9});});
  for(const {pool,rule,name} of allRuleEntries(config))out.push({key:'hard:'+pool.id+':'+rule.id,kind:'hard',poolId:pool.id,ruleId:rule.id,label:'Hard pity · '+name,current:rule.hard,min:Math.max(1,rule.start+1,rule.soft),max:1000});
  return out;
}
function resolveParameter(config,parameter){
  if(!parameter||typeof parameter!=='object')throw Error('Chọn weight hoặc hard pity cần cân bằng.');
  const found=balanceParameters(config).find(p=>p.kind===parameter.kind&&(p.kind==='weight'?p.nodeId===parameter.nodeId:p.poolId===parameter.poolId&&p.ruleId===parameter.ruleId));
  if(!found)throw Error('Thông số cần cân bằng không còn tồn tại.');return found;
}
export function balanceConfig(config,parameter,value){
  const p=resolveParameter(config,parameter),next=clone(config);
  if(!Number.isFinite(value)||value<p.min||value>p.max||(p.kind==='hard'&&!Number.isInteger(value)))throw Error('Giá trị ngoài khoảng hợp lệ của thông số.');
  if(p.kind==='weight')findNode(next.root,p.nodeId).weight=value;
  else {const pool=findNode(next.root,p.poolId),rule=Array.isArray(pool.pities)?pool.pities.find(r=>r.id===p.ruleId):pool.pity;rule.hard=value;}
  validate(next);return next;
}
export function validateBalanceOptions(config,options){
  validate(config);
  if(!options||!targetPath(config.root,options.target))throw Error('Chọn item cuối cùng làm mục tiêu.');
  if(!Number.isInteger(options.copies)||options.copies<1||options.copies>50)throw Error('Số bản sao tối thiểu từ 1 đến 50.');
  if(!Number.isInteger(options.pulls)||options.pulls<1||options.pulls>10000)throw Error('Số lượt gacha từ 1 đến 10.000.');
  if(!Number.isFinite(options.desired)||options.desired<0||options.desired>1)throw Error('Xác suất mục tiêu từ 0% đến 100%.');
  const parameter=resolveParameter(config,options.parameter);
  if(!Number.isFinite(options.min)||!Number.isFinite(options.max)||options.min<parameter.min||options.max>parameter.max||options.min>options.max||(parameter.kind==='hard'&&(!Number.isInteger(options.min)||!Number.isInteger(options.max))))throw Error(`Khoảng thử phải nằm trong ${parameter.min}–${parameter.max}${parameter.kind==='hard'?' lượt; giữ nguyên soft pity và counter hiện tại':''}.`);
  if(!Number.isInteger(options.samples)||options.samples<2||options.samples>BALANCE_MAX_SAMPLES)throw Error('Thử từ 2 đến 31 giá trị.');
  if(options.maxOperations!==undefined&&(!Number.isInteger(options.maxOperations)||options.maxOperations<1||options.maxOperations>BALANCE_CANDIDATE_OPERATIONS))throw Error('Ngân sách tính toán không hợp lệ.');
  return parameter;
}
function ratesAtStart(config,target){
  let base=1,next=1;
  for(const {pool,child} of targetPath(config.root,target)){
    base*=child.weight/pool.children.reduce((sum,n)=>sum+n.weight,0);
    next*=ruleProbabilities(pool)[pool.children.indexOf(child)];
  }
  return {base,next};
}

// The same transition machine as Calculate/Simulate, but stop exactly at N.
// No far-future quantiles or stationary-distribution calculation per candidate.
export function balanceProbability(config,target,copies,pulls,maxOperations=BALANCE_CANDIDATE_OPERATIONS){
  validate(config);
  if(!targetPath(config.root,target)||!Number.isInteger(copies)||copies<1||copies>50||!Number.isInteger(pulls)||pulls<1||pulls>10000||!Number.isInteger(maxOperations)||maxOperations<1||maxOperations>BALANCE_CANDIDATE_OPERATIONS)throw Error('Thông số tính xác suất không hợp lệ.');
  const rates=ratesAtStart(config,target);
  if(copies>pulls)return {probability:0,status:'complete',examined:pulls,rates};
  const m=machine(config,maxOperations);let reached=0,examined=0,everHit=false;
  let dist=new Map([['0|'+m.initial.join(','),{state:m.initial,count:0,mass:1}]]);
  for(let n=1;n<=pulls;n++){
    const next=new Map(),priorCache=m.cache.size;let gained=0;
    try{
      for(const entry of dist.values())for(const edge of m.edges(entry.state)){
        m.limit();const hit=edge.leaf===target;everHit||=hit;
        const count=entry.count+(hit?1:0),mass=entry.mass*edge.mass;
        if(count>=copies){gained+=mass;continue;}
        const key=count+'|'+edge.key,old=next.get(key);
        if(old)old.mass+=mass;else next.set(key,{state:edge.state,count,mass});
        if(next.size>100000)throw limited();
      }
    }catch(error){if(error.code!=='PITY_LIMIT')throw error;return {probability:null,status:'budget',examined,lowerBound:reached,rates};}
    dist=next;reached=Math.min(1,reached+gained);examined=n;
    if(!dist.size)return {probability:1,status:'complete',examined,rates};
    if(!everHit&&priorCache===m.cache.size&&[...m.cache.values()].every(edges=>edges.every(e=>m.cache.has(e.key))))return {probability:0,status:'unreachable',examined,rates};
  }
  return {probability:reached,status:'complete',examined,rates};
}
export function balanceBanner(config,options,onProgress=()=>{}){
  const parameter=validateBalanceOptions(config,options),before=clone(config),maxOperations=options.maxOperations??BALANCE_CANDIDATE_OPERATIONS;
  const values=[...new Set(Array.from({length:options.samples},(_,i)=>{
    const value=options.min+(options.max-options.min)*i/(options.samples-1);
    return parameter.kind==='hard'?Math.round(value):Number(value.toPrecision(12));
  }))];
  const evaluate=value=>{
    try{const candidate=balanceConfig(before,parameter,value),answer=balanceProbability(candidate,options.target,options.copies,options.pulls,maxOperations);return {value,...answer,error:answer.probability===null?null:Math.abs(answer.probability-options.desired)};}
    catch(error){return {value,status:'invalid',probability:null,error:null,reason:error.message};}
  };
  const baseline=evaluate(parameter.current),rows=[];onProgress({done:1,total:values.length+1});
  for(const value of values){rows.push(evaluate(value));onProgress({done:rows.length+1,total:values.length+1});}
  const ranking=rows.map((row,index)=>({row,index})).filter(({row})=>row.probability!==null).sort((a,b)=>a.row.error-b.row.error||Math.abs(a.row.value-parameter.current)-Math.abs(b.row.value-parameter.current)||a.row.value-b.row.value).map(({index})=>index);
  return {version:1,id:crypto.randomUUID(),createdAt:new Date().toISOString(),config:before,fingerprint:fingerprint(before),options:clone(options),parameter,baseline,rows,ranking,bestIndex:ranking[0]??null,evaluated:ranking.length};
}
export function balanceMatches(config,result,context={}){
  return !!result&&result.fingerprint===fingerprint(config)&&result.options.profileId===context.profileId&&result.options.bannerId===context.bannerId;
}
export function applyBalanceCandidate(config,result,index,context={}){
  if(!balanceMatches(config,result,context))throw Error('Banner đã thay đổi. Chạy cân bằng lại trước khi áp dụng.');
  if(!Number.isInteger(index)||!result.rows[index]||result.rows[index].probability===null)throw Error('Chọn một phương án đã tính xong để áp dụng.');
  return balanceConfig(config,result.parameter,result.rows[index].value);
}
