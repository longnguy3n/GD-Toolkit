import {clone} from './engine.mjs';
import {FLOW_LIMITS,validateFlowScenario} from './flow.mjs';

export const CANVAS_LIMITS={coordinate:100000,minZoom:.15,maxZoom:3};
const kinds=new Set(['resource','source','drain','converter']);
const defaultViewport=()=>({x:32,y:32,zoom:1});
const coordinate=n=>Number.isFinite(n)&&Math.abs(n)<=CANVAS_LIMITS.coordinate;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const nodeIds=s=>new Set([...s.resources,...s.rules].map(n=>n.id));
const edgeId=(rule,side,resource)=>`${rule}:${side}:${resource}`;

/** Old scenarios infer the role from their resource connections. New canvas
 * rules persist it explicitly so removing a crafting input never creates a
 * free source by accident. */
export function ruleKind(r){return r.kind??(r.inputs.length?r.outputs.length?'converter':'drain':'source');}
export function ruleComplete(r){
  if(r.kind===undefined)return Boolean(r.inputs.length||r.outputs.length);
  if(r.kind==='source')return r.inputs.length===0&&r.outputs.length>0;
  if(r.kind==='drain')return r.inputs.length>0&&r.outputs.length===0;
  return r.kind==='converter'&&r.inputs.length>0&&r.outputs.length>0;
}

export function validateCanvas(canvas,s){
  if(canvas===undefined)return;
  if(!object(canvas)||canvas.version!==1||!object(canvas.positions)||!object(canvas.viewport))throw Error('Dữ liệu canvas Economy không hợp lệ.');
  const ids=nodeIds(s);
  for(const [id,p] of Object.entries(canvas.positions)){
    if(!ids.has(id)||!object(p)||!coordinate(p.x)||!coordinate(p.y))throw Error('Vị trí canvas phải thuộc node đang tồn tại và nằm trong ±100.000.');
  }
  const {x,y,zoom}=canvas.viewport;
  if(!coordinate(x)||!coordinate(y)||!Number.isFinite(zoom)||zoom<CANVAS_LIMITS.minZoom||zoom>CANVAS_LIMITS.maxZoom)throw Error('Khung nhìn canvas không hợp lệ; độ phóng đại từ 15% đến 300%.');
}

export function graphEdges(s){
  return s.rules.flatMap(r=>[
    ...r.inputs.map(x=>({id:edgeId(r.id,'input',x.resource),from:x.resource,to:r.id,resource:x.resource,rule:r.id,side:'input',amount:x.amount})),
    ...r.outputs.map(x=>({id:edgeId(r.id,'output',x.resource),from:r.id,to:x.resource,resource:x.resource,rule:r.id,side:'output',amount:x.amount}))
  ]);
}

// Condense cycles before assigning columns. This also supports resource loops
// such as currency -> crafting -> currency without unstable or endless layout.
function layoutPositions(s){
  const ids=[...s.resources,...s.rules].map(n=>n.id),adj=new Map(ids.map(id=>[id,[]]));
  for(const e of graphEdges(s))adj.get(e.from)?.push(e.to);
  let cursor=0;
  const indices=new Map(),low=new Map(),stack=[],stacked=new Set(),components=[];
  function visit(id){
    indices.set(id,cursor);low.set(id,cursor++);stack.push(id);stacked.add(id);
    for(const next of adj.get(id)){
      if(!indices.has(next)){visit(next);low.set(id,Math.min(low.get(id),low.get(next)));}
      else if(stacked.has(next))low.set(id,Math.min(low.get(id),indices.get(next)));
    }
    if(low.get(id)===indices.get(id)){
      const members=[];let next;
      do{next=stack.pop();stacked.delete(next);members.push(next);}while(next!==id);
      members.sort((a,b)=>ids.indexOf(a)-ids.indexOf(b));components.push(members);
    }
  }
  ids.forEach(id=>{if(!indices.has(id))visit(id);});
  const componentOf=new Map();components.forEach((members,i)=>members.forEach(id=>componentOf.set(id,i)));
  const incoming=components.map(()=>new Set());
  for(const e of graphEdges(s)){const a=componentOf.get(e.from),b=componentOf.get(e.to);if(a!==b)incoming[b].add(a);}
  const ranks=new Map();
  const rank=i=>{if(!ranks.has(i))ranks.set(i,Math.max(0,...[...incoming[i]].map(parent=>rank(parent)+1)));return ranks.get(i);};
  components.forEach((_,i)=>rank(i));
  const rows=new Map(),positions={};
  for(const id of ids){const column=ranks.get(componentOf.get(id)),row=rows.get(column)||0;positions[id]={x:80+column*300,y:80+row*190};rows.set(column,row+1);}
  return positions;
}

export function graphNodes(s){
  const defaults=layoutPositions(s),position=id=>s.canvas&&Object.hasOwn(s.canvas.positions,id)?s.canvas.positions[id]:defaults[id];
  return [
    ...s.resources.map(r=>({id:r.id,kind:'resource',...position(r.id),data:r,complete:true})),
    ...s.rules.map(r=>({id:r.id,kind:ruleKind(r),...position(r.id),data:r,complete:ruleComplete(r)}))
  ];
}

function ensureCanvas(s){
  if(!s.canvas)s.canvas={version:1,positions:layoutPositions(s),viewport:defaultViewport()};
  else for(const n of graphNodes(s))s.canvas.positions[n.id]={x:n.x,y:n.y};
  return s.canvas;
}
function mutate(s,fn){validateFlowScenario(s);const next=clone(s);ensureCanvas(next);fn(next);validateFlowScenario(next);return next;}
function requireNode(s,id){const r=s.resources.find(n=>n.id===id);if(r)return {kind:'resource',data:r};const rule=s.rules.find(n=>n.id===id);if(rule)return {kind:ruleKind(rule),data:rule};throw Error('Node Economy không tồn tại.');}
function requireEdge(s,id){const edge=graphEdges(s).find(e=>e.id===id);if(!edge)throw Error('Kết nối Economy không tồn tại.');return edge;}
function requireAmount(amount){if(!Number.isFinite(amount)||amount<=0||amount>1e9)throw Error('Số lượng trên kết nối phải lớn hơn 0 và tối đa 1 tỷ.');}
function pinKind(rule){if(rule.kind===undefined)rule.kind=ruleKind(rule);}

export function addGraphNode(s,kind,{x=0,y=0,name}={}){
  if(!kinds.has(kind))throw Error('Loại node Economy không hợp lệ.');
  if(!coordinate(x)||!coordinate(y))throw Error('Vị trí node phải nằm trong ±100.000.');
  return mutate(s,n=>{
    const id=crypto.randomUUID();
    if(kind==='resource'){
      if(n.resources.length>=FLOW_LIMITS.resources)throw Error('Tối đa 20 tài nguyên trong một kịch bản.');
      n.resources.push({id,name:name??'Tài nguyên mới',initial:0,capacity:null});
    }else{
      if(n.rules.length>=FLOW_LIMITS.rules)throw Error('Tối đa 40 quy tắc trong một kịch bản.');
      n.rules.push({id,kind,name:name??({source:'Nguồn thu mới',drain:'Tiêu hao mới',converter:'Crafting mới'}[kind]),enabled:true,inputs:[],outputs:[],every:1,start:1,probability:1,delay:0,repeat:true,condition:null});
    }
    n.canvas.positions[id]={x,y};
  });
}
export function moveGraphNodes(s,positions){
  if(!object(positions))throw Error('Danh sách vị trí node không hợp lệ.');
  return mutate(s,n=>{const ids=nodeIds(n);for(const [id,p] of Object.entries(positions)){if(!ids.has(id)||!object(p)||!coordinate(p.x)||!coordinate(p.y))throw Error('Vị trí node không hợp lệ.');n.canvas.positions[id]={x:p.x,y:p.y};}});
}
export function setGraphViewport(s,viewport){return mutate(s,n=>{if(!object(viewport))throw Error('Khung nhìn canvas không hợp lệ.');n.canvas.viewport={x:viewport.x,y:viewport.y,zoom:viewport.zoom};});}
export function connectGraph(s,fromId,toId,amount=1){
  requireAmount(amount);
  return mutate(s,n=>{
    const from=requireNode(n,fromId),to=requireNode(n,toId);
    if((from.kind==='resource')===(to.kind==='resource'))throw Error('Hãy nối tài nguyên với một nguồn thu, tiêu hao hoặc crafting.');
    const input=from.kind==='resource',r=input?to:from,resource=input?fromId:toId;
    if(input&&r.kind==='source')throw Error('Nguồn thu chỉ có đầu ra.');
    if(!input&&r.kind==='drain')throw Error('Tiêu hao chỉ có đầu vào.');
    const side=input?'inputs':'outputs';
    if(r.data[side].some(x=>x.resource===resource))throw Error('Kết nối này đã tồn tại; chọn đường nối để sửa số lượng.');
    pinKind(r.data);r.data[side].push({resource,amount});
  });
}
export function updateGraphEdge(s,id,amount){requireAmount(amount);return mutate(s,n=>{const e=requireEdge(n,id),r=n.rules.find(r=>r.id===e.rule);r[e.side==='input'?'inputs':'outputs'].find(x=>x.resource===e.resource).amount=amount;});}
export function disconnectGraph(s,id){return mutate(s,n=>{const e=requireEdge(n,id),r=n.rules.find(r=>r.id===e.rule);pinKind(r);const side=e.side==='input'?'inputs':'outputs';r[side]=r[side].filter(x=>x.resource!==e.resource);});}
export function deleteGraphNodes(s,ids){
  if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'))throw Error('Danh sách node cần xóa không hợp lệ.');
  return mutate(s,n=>{
    const remove=new Set(ids);for(const id of remove)requireNode(n,id);
    n.resources=n.resources.filter(r=>!remove.has(r.id));n.rules=n.rules.filter(r=>!remove.has(r.id));
    for(const r of n.rules){
      if([...r.inputs,...r.outputs].some(x=>remove.has(x.resource))){pinKind(r);r.inputs=r.inputs.filter(x=>!remove.has(x.resource));r.outputs=r.outputs.filter(x=>!remove.has(x.resource));}
      if(r.condition&&remove.has(r.condition.resource)){r.condition=null;r.enabled=false;}
    }
    n.milestones=n.milestones.filter(m=>!remove.has(m.resource));
    for(const id of remove)delete n.canvas.positions[id];
  });
}
export function autoLayoutGraph(s){return mutate(s,n=>{n.canvas.positions=layoutPositions(n);n.canvas.viewport=defaultViewport();});}
