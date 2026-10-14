import {clone,findNode,walk,validate} from './engine.mjs';

export function duplicatePool(config,id,name) {
  const next=clone(config),source=findNode(next.root,id);
  if(!source?.children||id===next.root.id)throw Error('Chọn một pool con để nhân bản.');
  if(typeof name!=='string'||!name.trim()||name.trim().length>120)throw Error('Tên pool phải có 1–120 ký tự.');
  let parent;walk(next.root,n=>{if(n.children?.some(c=>c.id===id))parent=n;});
  const copy=clone(source),ids=new Map();
  walk(copy,n=>{const old=n.id;n.id=crypto.randomUUID();ids.set(old,n.id);});
  walk(copy,n=>{if(n.pity?.target)n.pity.target=ids.get(n.pity.target);});
  copy.name=name.trim();parent.children.splice(parent.children.indexOf(source)+1,0,copy);
  validate(next,{allowEmpty:true});return {config:next,id:copy.id};
}

export function parseItems(text,{weight=1,tier=''}={}) {
  if(typeof text!=='string'||text.length>100000)throw Error('Danh sách tối đa 100.000 ký tự.');
  const number=value=>Number(String(value).trim().replace(',','.'));
  const items=[];
  for(const [index,line] of text.split(/\r\n|\n|\r/).entries()){
    if(!line.trim())continue;
    const columns=line.split('\t').map(s=>s.trim()),name=columns[0];
    if(columns.length>3)throw Error(`Dòng ${index+1}: chỉ dùng 3 cột Tên, Weight, Tier.`);
    if(!name||name.length>120)throw Error(`Dòng ${index+1}: tên phải có 1–120 ký tự.`);
    const raw=columns[1]||String(weight),w=number(raw),t=columns.length===3?columns[2]:String(tier).trim();
    if(!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(raw)||!Number.isFinite(w)||w<0||w>1e9)throw Error(`Dòng ${index+1}: weight phải từ 0 đến 1 tỷ, ví dụ 1 hoặc 0,5.`);
    if(t.length>40)throw Error(`Dòng ${index+1}: tier tối đa 40 ký tự.`);
    items.push({name,weight:w,tier:t});
    if(items.length>199)throw Error('Mỗi lần nhập tối đa 199 item; toàn banner tối đa 200 node.');
  }
  if(!items.length)throw Error('Nhập ít nhất một tên item.');
  return items;
}

export function appendItems(config,parentId,items) {
  const next=clone(config),parent=findNode(next.root,parentId);
  if(!parent?.children)throw Error('Không tìm thấy pool/banner nhận item.');
  if(!Array.isArray(items)||!items.length)throw Error('Nhập ít nhất một item.');
  const added=items.map(item=>({id:crypto.randomUUID(),name:item.name,weight:item.weight,tier:item.tier}));
  parent.children.push(...added);validate(next,{allowEmpty:true});
  return {config:next,ids:added.map(n=>n.id)};
}

export function editNodes(config,ids,patch) {
  const next=clone(config),chosen=new Set(ids);
  if(!chosen.size||chosen.has(next.root.id))throw Error('Chọn item/pool cần chỉnh sửa.');
  const nodes=[...chosen].map(id=>findNode(next.root,id));
  if(nodes.some(n=>!n))throw Error('Một mục đã chọn không còn tồn tại.');
  if(!patch||!Object.keys(patch).length||Object.keys(patch).some(k=>!['weight','tier'].includes(k)))throw Error('Chỉ chỉnh chung weight hoặc tier.');
  if('tier' in patch&&typeof patch.tier!=='string')throw Error('Tier phải là tên dạng chữ.');
  if('tier' in patch&&!nodes.some(n=>!n.children))throw Error('Tier chỉ áp dụng cho item cuối cùng.');
  for(const n of nodes){
    if('weight' in patch)n.weight=patch.weight;
    if('tier' in patch&&!n.children)n.tier=patch.tier.trim();
  }
  validate(next,{allowEmpty:true});return next;
}
