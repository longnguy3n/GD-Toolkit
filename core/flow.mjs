import {customRandom,unityEmulated,validateTape,clone} from './engine.mjs';
import {validateCanvas,ruleComplete} from './flow-graph.mjs';

export const FLOW_LIMITS={scenarios:12,resources:20,rules:40,milestones:12,history:6,operations:3000000};
const uid=()=>crypto.randomUUID();
const finite=(n,max=1e12)=>Number.isFinite(n)&&n>=0&&n<=max;
const validId=s=>typeof s==='string'&&/^[-\w]{1,80}$/.test(s)&&!['__proto__','constructor','prototype'].includes(s);
const validName=s=>typeof s==='string'&&s.trim().length>0&&s.length<=80;
const enough=(balance,required)=>balance>=required||balance>0&&balance+Number.EPSILON*Math.max(Math.abs(balance),Math.abs(required))*8>=required;
const near=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(Math.abs(a),Math.abs(b),Number.MIN_VALUE);
const resource=(id,name,initial=0,capacity=null)=>({id,name,initial,capacity});
const amount=(resource,amount)=>({resource,amount});
const rule=(id,name,inputs,outputs,extra={})=>({id,name,enabled:true,inputs,outputs,every:1,start:1,probability:1,delay:0,repeat:true,condition:null,...extra});

export function makeFlowScenario(template='economy',economy={currency:'Gem',balance:0,perPull:160}){
  if(template==='blank')return {id:uid(),name:'Kịch bản mới',resources:[],rules:[],milestones:[]};
  if(template==='crafting')return {id:uid(),name:'Crafting & progression',resources:[resource('ore','Quặng',5),resource('coin','Vàng',100),resource('xp','XP'),resource('level','Cấp độ'),resource('blueprint','Bản vẽ'),resource('sword','Kiếm')],rules:[
    rule('mine','Khai thác quặng',[],[amount('ore',3)],{probability:.8}),
    rule('quest','Nhiệm vụ mỗi ngày',[],[amount('coin',50),amount('xp',20)]),
    rule('level-up','Lên cấp',[amount('xp',100)],[amount('level',1)]),
    rule('unlock','Mở khóa bản vẽ',[],[amount('blueprint',1)],{repeat:false,condition:{resource:'level',atLeast:1}}),
    rule('craft','Chế tạo kiếm',[amount('ore',10),amount('coin',200),amount('blueprint',1)],[amount('sword',1)],{delay:2})
  ],milestones:[{id:'first-sword',name:'Nhận kiếm đầu tiên',resource:'sword',amount:1},{id:'level-five',name:'Đạt cấp 5',resource:'level',amount:5}]};
  return {id:uid(),name:'Economy → ngân sách gacha',resources:[resource('currency',economy.currency,economy.balance),resource('coin','Vàng'),resource('energy','Năng lượng',20,100),resource('pulls','Lượt gacha đã chi')],rules:[
    rule('daily','Quà đăng nhập',[],[amount('currency',60)]),
    rule('energy-recovery','Hồi năng lượng',[],[amount('energy',50)]),
    rule('mission','Nhiệm vụ',[amount('energy',10)],[amount('coin',100)]),
    rule('spend','Chi currency cho 1 lượt',[amount('currency',economy.perPull)],[amount('pulls',1)])
  ],milestones:[{id:'ten-pulls',name:'Chi đủ 10 lượt gacha',resource:'pulls',amount:10}],note:`Giá 1 lượt được sao chép từ banner lúc tạo mẫu: ${economy.perPull} ${economy.currency}. Đây là mô hình ngân sách, không roll item/pity. Mỗi quy tắc chạy tối đa một lần/ngày.`};
}
export function makeFlowLab(){return {version:1,activeScenarioId:null,scenarios:[],history:[]};}
export function validateFlowScenario(s){
  if(!s||!validId(s.id)||!validName(s.name)||s.note!==undefined&&(typeof s.note!=='string'||s.note.length>1000))throw Error('Tên kịch bản cần 1–80 ký tự.');
  if(!Array.isArray(s.resources)||s.resources.length>FLOW_LIMITS.resources)throw Error('Kịch bản hỗ trợ tối đa 20 tài nguyên.');
  if(!Array.isArray(s.rules)||s.rules.length>FLOW_LIMITS.rules||!Array.isArray(s.milestones)||s.milestones.length>FLOW_LIMITS.milestones)throw Error('Tối đa 40 quy tắc và 12 mục tiêu trong một kịch bản.');
  const ids=new Set(),check=x=>{if(!x||!validId(x.id)||ids.has(x.id)||!validName(x.name))throw Error('Tên hoặc ID của thành phần economy không hợp lệ.');ids.add(x.id);};
  for(const r of s.resources){check(r);if(!finite(r.initial)||r.capacity!==null&&(!finite(r.capacity)||r.initial>r.capacity))throw Error('Tồn đầu phải không âm và không vượt sức chứa; tối đa 1.000 tỷ.');}
  const refs=new Set(s.resources.map(r=>r.id));
  const checkAmounts=xs=>{if(!Array.isArray(xs)||xs.length>20||new Set(xs.map(x=>x?.resource)).size!==xs.length)throw Error('Mỗi tài nguyên chỉ xuất hiện một lần trong mỗi vế của quy tắc.');for(const x of xs)if(!x||!refs.has(x.resource)||!finite(x.amount,1e9)||x.amount===0)throw Error('Số lượng phải lớn hơn 0, tối đa 1 tỷ và dùng tài nguyên đang tồn tại.');};
  for(const r of s.rules){check(r);checkAmounts(r.inputs);checkAmounts(r.outputs);if(r.kind!==undefined&&!['source','drain','converter'].includes(r.kind))throw Error('Loại quy tắc Economy không hợp lệ.');if(r.kind==='source'&&r.inputs.length||r.kind==='drain'&&r.outputs.length)throw Error('Nguồn thu chỉ có đầu ra; tiêu hao chỉ có đầu vào.');if(r.kind===undefined&&!r.inputs.length&&!r.outputs.length)throw Error('Quy tắc cần ít nhất một tài nguyên vào hoặc ra.');if(typeof r.enabled!=='boolean'||typeof r.repeat!=='boolean'||!Number.isInteger(r.every)||r.every<1||r.every>3650||!Number.isInteger(r.start)||r.start<1||r.start>3650||!Number.isInteger(r.delay)||r.delay<0||r.delay>3650||!finite(r.probability,1))throw Error('Lịch chạy, độ trễ hoặc xác suất quy tắc không hợp lệ.');if(r.condition!==null&&(!r.condition||!refs.has(r.condition.resource)||!finite(r.condition.atLeast)))throw Error('Điều kiện mở khóa không hợp lệ.');}
  for(const m of s.milestones){check(m);if(!refs.has(m.resource)||!finite(m.amount)||m.amount===0)throw Error('Mục tiêu cần tài nguyên đang tồn tại và số lượng lớn hơn 0.');}
  validateCanvas(s.canvas,s);return s;
}
export function validateFlowOptions(s,o,{runnable=true}={}){
  validateFlowScenario(s);
  if(runnable&&!s.resources.length)throw Error('Thêm ít nhất một tài nguyên trước khi chạy mô phỏng.');
  const drafts=s.rules.filter(r=>r.enabled&&!ruleComplete(r));
  if(runnable&&drafts.length)throw Error(`Quy tắc chưa nối đủ tài nguyên: ${drafts.map(r=>r.name).join(', ')}. Nguồn thu cần đầu ra; tiêu hao cần đầu vào; crafting cần cả hai. Hãy nối đủ hoặc tắt quy tắc trước khi chạy.`);
  if(!o||!Number.isInteger(o.days)||o.days<1||o.days>3650||!Number.isInteger(o.players)||o.players<1||o.players>2000)throw Error('Mô phỏng 1–3.650 ngày và 1–2.000 người chơi.');
  if(o.days*o.players*Math.max(1,s.rules.length,s.resources.length)>FLOW_LIMITS.operations)throw Error('Kịch bản quá lớn: ngày × người chơi × số tài nguyên/quy tắc lớn nhất không vượt 3 triệu. Hãy giảm số ngày hoặc người chơi.');
  return o;
}
function validateResult(r){
  if(!r||r.version!==1||!validId(r.id)||!Number.isFinite(Date.parse(r.createdAt)))throw Error('Lịch sử economy không hợp lệ.');
  validateFlowOptions(r.scenario,r.options);
  const ids=r.scenario.resources.map(x=>x.id);
  if(!Array.isArray(r.series)||r.series.length>182||!r.series.length||!Array.isArray(r.resources)||r.resources.length!==ids.length||!Array.isArray(r.rules)||r.rules.length!==r.scenario.rules.length||!Array.isArray(r.milestones)||r.milestones.length!==r.scenario.milestones.length)throw Error('Dữ liệu kết quả economy không hợp lệ.');
  const exactIds=(xs,expected)=>new Set(xs.map(x=>x.id)).size===expected.length&&xs.every(x=>expected.includes(x.id));
  if(!exactIds(r.resources,ids)||!exactIds(r.rules,r.scenario.rules.map(x=>x.id))||!exactIds(r.milestones,r.scenario.milestones.map(x=>x.id)))throw Error('Thành phần trong lịch sử economy bị trùng hoặc thiếu.');
  if(r.series[0].day!==0||r.series.at(-1).day!==r.options.days)throw Error('Biểu đồ economy thiếu ngày đầu/cuối.');
  for(let i=0;i<r.series.length;i++){const p=r.series[i];if(!Number.isInteger(p.day)||p.day<0||p.day>r.options.days||i&&p.day<=r.series[i-1].day||!p.balances||ids.some(id=>!finite(p.balances[id],1e15)))throw Error('Biểu đồ economy không hợp lệ.');}
  for(const x of r.resources){const source=r.scenario.resources.find(y=>y.id===x.id);if(!source||x.name!==source.name||x.initial!==source.initial||['initial','mean','min','max','inflow','outflow','wasted','pending'].some(k=>!finite(x[k],1e15))||x.min>x.mean&&!near(x.min,x.mean)||x.mean>x.max&&!near(x.mean,x.max)||!near(x.initial+x.inflow,x.mean+x.outflow)||!near(r.series[0].balances[x.id],x.initial)||!near(r.series.at(-1).balances[x.id],x.mean))throw Error('Thống kê tài nguyên không hợp lệ.');}
  for(const x of r.rules)if(!r.scenario.rules.some(y=>y.id===x.id)||!validName(x.name)||['executions','insufficient','condition','chanceMiss','eligible'].some(k=>!Number.isInteger(x[k])||x[k]<0||x[k]>r.options.players*r.options.days))throw Error('Thống kê quy tắc không hợp lệ.');
  for(const x of r.milestones)if(!r.scenario.milestones.some(y=>y.id===x.id)||!validName(x.name)||!Number.isInteger(x.reached)||x.reached<0||x.reached>r.options.players||!finite(x.rate,1)||x.meanDay!==null&&!finite(x.meanDay,r.options.days)||![50,90,95,99].every(q=>x.quantiles?.[q]===null||Number.isInteger(x.quantiles?.[q])&&x.quantiles[q]>=0&&x.quantiles[q]<=r.options.days))throw Error('Thống kê mục tiêu không hợp lệ.');
  for(const x of r.rules)if(x.name!==r.scenario.rules.find(y=>y.id===x.id).name||x.executions+x.insufficient+x.condition+x.chanceMiss!==x.eligible)throw Error('Tổng trạng thái quy tắc không khớp.');
  for(const x of r.milestones){const source=r.scenario.milestones.find(y=>y.id===x.id);if(x.name!==source.name||x.resource!==source.resource||x.amount!==source.amount||x.rate!==x.reached/r.options.players||(x.reached===0)!==(x.meanDay===null)||[50,90,95,99].some(q=>(x.reached>=Math.ceil(r.options.players*q/100))!==(x.quantiles[q]!==null)))throw Error('Thống kê mục tiêu không khớp.');}
  if(!r.random||!['custom','unity-emulated','unity'].includes(r.random.rng)||!Number.isInteger(r.random.seed)||r.random.seed<0||r.random.seed>4294967295||!Number.isInteger(r.random.samples)||r.random.samples<0||r.random.samples>FLOW_LIMITS.operations)throw Error('Random engine của lịch sử economy không hợp lệ.');
  if(!Array.isArray(r.diagnostics)||r.diagnostics.length>100||r.diagnostics.some(x=>typeof x!=='string'||x.length>500))throw Error('Chẩn đoán economy không hợp lệ.');
  return r;
}
export function validateFlowLab(lab){
  if(!lab||lab.version!==1||!Array.isArray(lab.scenarios)||lab.scenarios.length>FLOW_LIMITS.scenarios||!Array.isArray(lab.history)||lab.history.length>FLOW_LIMITS.history)throw Error('Economy Lab hỗ trợ tối đa 12 kịch bản và 6 lịch sử mỗi profile.');
  if(new Set(lab.scenarios.map(s=>s?.id)).size!==lab.scenarios.length||new Set(lab.history.map(s=>s?.id)).size!==lab.history.length)throw Error('ID Economy Lab không được trùng.');
  lab.scenarios.forEach(validateFlowScenario);lab.history.forEach(validateResult);
  if(lab.scenarios.length?!lab.scenarios.some(s=>s.id===lab.activeScenarioId):lab.activeScenarioId!==null)throw Error('Kịch bản Economy đang chọn không tồn tại.');
  return lab;
}

/** Deliver pending outputs at the start of a day, then evaluate rules in order.
 * Each eligible rule may execute once; inputs are paid atomically before output.
 * An unsuccessful chance roll pays nothing. Delays are independent deliveries,
 * not a queue. Every player begins with the configured inventory; RNG is continuous.
 */
export function simulateFlow(scenario,options,{rng='custom',seed=42,tape}={},onProgress=()=>{}){
  validateFlowOptions(scenario,options);
  if(!['custom','unity-emulated','unity'].includes(rng)||!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Random engine hoặc seed không hợp lệ.');
  if(rng==='unity')validateTape(tape);
  let samples=0;const base=rng==='custom'?customRandom(seed):unityEmulated(seed);
  const random=()=>{if(rng!=='unity'){samples++;return base();}if(samples>=tape.values.length)throw Error('Đã dùng hết mẫu Unity; kết quả Economy chưa được lưu.');return Math.min(tape.values[samples++],1-Number.EPSILON);};
  const {days,players}=options,rs=scenario.resources,rules=scenario.rules,ms=scenario.milestones;
  const resourceIndex=new Map(rs.map((r,i)=>[r.id,i]));
  const compiled=rules.map(r=>({...r,inputs:r.inputs.map(x=>[resourceIndex.get(x.resource),x.amount]),outputs:r.outputs.map(x=>[resourceIndex.get(x.resource),x.amount]),condition:r.condition?[resourceIndex.get(r.condition.resource),r.condition.atLeast]:null}));
  const totals=rs.map(r=>({id:r.id,name:r.name,initial:r.initial,mean:0,min:Infinity,max:0,inflow:0,outflow:0,wasted:0,pending:0}));
  const stats=rules.map(r=>({id:r.id,name:r.name,executions:0,insufficient:0,condition:0,chanceMiss:0,eligible:0}));
  const stride=Math.ceil(days/180),sampleDays=[0,...Array.from({length:days},(_,i)=>i+1).filter(d=>d%stride===0||d===days)],series=sampleDays.map(day=>({day,balances:Object.fromEntries(rs.map(r=>[r.id,0]))})),seriesIndex=new Map(sampleDays.map((d,i)=>[d,i]));
  const hits=ms.map(()=>[]),milestoneIndices=ms.map(m=>resourceIndex.get(m.resource));
  let done=0;const total=players*days;
  for(let p=0;p<players;p++){
    const balances=rs.map(r=>r.initial),pending=new Map(),finished=new Set(),reached=ms.map(()=>false);
    const checkMilestones=day=>ms.forEach((m,i)=>{if(!reached[i]&&enough(balances[milestoneIndices[i]],m.amount)){reached[i]=true;hits[i].push(day);}});
    const grant=(i,quantity)=>{const room=rs[i].capacity===null?Infinity:Math.max(0,rs[i].capacity-balances[i]),accepted=Math.min(room,quantity);balances[i]+=accepted;totals[i].inflow+=accepted;totals[i].wasted+=quantity-accepted;if(balances[i]>1e15)throw Error('Tồn tài nguyên vượt giới hạn 1 triệu tỷ; giảm lượng cấp hoặc thời gian mô phỏng.');};
    const record=day=>{const index=seriesIndex.get(day);if(index!==undefined)rs.forEach((r,i)=>series[index].balances[r.id]+=balances[i]/players);};
    checkMilestones(0);record(0);
    for(let day=1;day<=days;day++){
      for(const [i,n] of pending.get(day)||[])grant(i,n);pending.delete(day);checkMilestones(day);
      for(let index=0;index<compiled.length;index++){
        const r=compiled[index],stat=stats[index];
        if(!r.enabled||finished.has(index)||day<r.start||(day-r.start)%r.every!==0)continue;
        stat.eligible++;
        if(r.condition&&!enough(balances[r.condition[0]],r.condition[1])){stat.condition++;continue;}
        if(r.inputs.some(([i,n])=>!enough(balances[i],n))){stat.insufficient++;continue;}
        if(r.probability===0||r.probability<1&&random()>=r.probability){stat.chanceMiss++;continue;}
        for(const [i,n] of r.inputs){balances[i]=Math.max(0,balances[i]-n);totals[i].outflow+=n;}
        if(r.delay){const target=day+r.delay;if(!pending.has(target))pending.set(target,[]);pending.get(target).push(...r.outputs);}else for(const [i,n] of r.outputs)grant(i,n);
        stat.executions++;if(!r.repeat)finished.add(index);checkMilestones(day);
      }
      record(day);done++;if(done%1000===0)onProgress(done/total);
    }
    for(const outputs of pending.values())for(const [i,n] of outputs)totals[i].pending+=n;
    totals.forEach((r,i)=>{r.mean+=balances[i]/players;r.min=Math.min(r.min,balances[i]);r.max=Math.max(r.max,balances[i]);});
  }
  totals.forEach(r=>{for(const key of ['inflow','outflow','wasted','pending'])r[key]/=players;});
  const milestones=ms.map((m,i)=>{const sorted=hits[i].sort((a,b)=>a-b);return {...clone(m),reached:sorted.length,rate:sorted.length/players,meanDay:sorted.length?sorted.reduce((a,b)=>a+b,0)/sorted.length:null,quantiles:Object.fromEntries([50,90,95,99].map(q=>[q,sorted[Math.ceil(players*q/100)-1]??null]))};});
  const diagnostics=[];
  for(const r of stats)if(r.insufficient)diagnostics.push(`${r.name}: thiếu nguyên liệu ở ${(r.insufficient/players).toLocaleString('vi-VN',{maximumFractionDigits:2})} lần/người chơi.`);
  for(const r of totals){if(r.wasted)diagnostics.push(`${r.name}: trung bình ${r.wasted.toLocaleString('vi-VN',{maximumFractionDigits:2})} bị mất vì đầy kho.`);if(r.pending)diagnostics.push(`${r.name}: trung bình ${r.pending.toLocaleString('vi-VN',{maximumFractionDigits:2})} còn chờ giao sau ngày cuối.`);}
  if(rules.some(r=>!r.enabled))diagnostics.push('Một số quy tắc đang tắt và không tham gia mô phỏng.');
  if(!rules.length)diagnostics.push('Kịch bản chưa có quy tắc; tồn kho giữ nguyên.');
  onProgress(1);
  return {version:1,id:uid(),createdAt:new Date().toISOString(),scenario:clone(scenario),options:clone(options),random:{rng,seed,samples,unityVersion:rng==='unity'?tape.unityVersion:null},series,resources:totals,rules:stats,milestones,diagnostics};
}

export function flowCsv(result){
  validateResult(result);const cell=x=>'"'+String(x).replaceAll('"','""')+'"';
  const label=x=>/^\s*[=+@-]/.test(x)?"'"+x:x;
  return [['Ngày',...result.scenario.resources.map(r=>label(r.name))],...result.series.map(p=>[p.day,...result.scenario.resources.map(r=>p.balances[r.id])])].map(row=>row.map(cell).join(',')).join('\r\n');
}
