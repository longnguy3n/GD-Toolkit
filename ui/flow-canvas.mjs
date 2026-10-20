import {clone} from '../core/engine.mjs';
import {validateFlowScenario} from '../core/flow.mjs';
import {graphNodes,graphEdges,addGraphNode,moveGraphNodes,setGraphViewport,connectGraph,updateGraphEdge,disconnectGraph,deleteGraphNodes,autoLayoutGraph} from '../core/flow-graph.mjs';
import {esc} from './features.mjs';
import {captureView} from './view-state.mjs';

const W=220,H=132,MIN_ZOOM=.15,MAX_ZOOM=3;
const sessions=new Map();
const kinds={resource:{name:'Tài nguyên',icon:'◉',help:'Kho chứa, tồn đầu và sức chứa'},source:{name:'Nguồn thu',icon:'＋',help:'Tạo và cấp tài nguyên'},drain:{name:'Tiêu hao',icon:'−',help:'Tiêu thụ tài nguyên'},converter:{name:'Crafting',icon:'◇',help:'Đổi nguyên liệu thành đầu ra'}};
const fmt=n=>Number(n).toLocaleString('vi-VN',{maximumFractionDigits:3});
const bound=(v,min,max)=>Math.min(max,Math.max(min,v));
const fingerprint=s=>JSON.stringify({...s,canvas:s.canvas?{...s.canvas,viewport:undefined}:undefined});
const input=(key,value,extra='')=>`<input data-gc-field="${key}" type="number" value="${value}" ${extra}>`;
const btn=(command,label,extra='')=>`<button type="button" data-gc-command="${command}" ${extra}>${label}</button>`;
const nodePort=(node,side)=>`<button type="button" class="gc-port gc-port-${side}" data-gc-port="${side}" data-gc-node-id="${esc(node.id)}" title="${side==='out'?'Nối đầu ra':'Nối đầu vào'} · ${esc(node.data.name)}" aria-label="${side==='out'?'Đầu ra':'Đầu vào'} ${esc(node.data.name)}"><span></span></button>`;
const paletteButton=(kind,compact=false)=>`<button type="button" class="gc-palette-item" draggable="true" data-gc-create="${kind}" title="${kinds[kind].help} · bấm để thêm hoặc kéo vào sơ đồ"><span class="gc-kind-icon gc-${kind}">${kinds[kind].icon}</span><span>${kinds[kind].name}${compact?'':`<small>${kinds[kind].help}</small>`}</span></button>`;

/** The canvas operates directly on the same resources/rules as the list editor. */
export function canvasPage(s){
  return `<section class="gc-editor" data-gc-editor data-scenario-id="${esc(s.id)}" aria-label="Sơ đồ Economy & Progression">
    <div class="gc-toolbar"><div class="gc-palette" role="group" aria-label="Thêm node">${Object.keys(kinds).map(k=>paletteButton(k,true)).join('')}</div><div class="gc-toolbar-actions">${btn('undo','↶','aria-label="Hoàn tác (Ctrl+Z)" title="Hoàn tác · Ctrl+Z"')}${btn('redo','↷','aria-label="Làm lại (Ctrl+Shift+Z)" title="Làm lại · Ctrl+Shift+Z"')}<span class="gc-toolbar-divider"></span>${btn('layout','Sắp xếp','title="Sắp xếp lại các node theo dòng tài nguyên"')}${btn('fit','Vừa màn hình','title="Hiển thị toàn bộ sơ đồ · F"')}${btn('expand','⛶','aria-label="Mở rộng canvas" title="Mở rộng canvas"')}</div></div>
    <div class="gc-workarea"><div class="gc-viewport" data-gc-viewport tabindex="0" role="group" aria-label="Canvas: kéo node để di chuyển; nối cổng vào và ra; Space và kéo để di chuyển khung nhìn; Delete để xóa lựa chọn">
      <div class="gc-stage" data-gc-stage><svg class="gc-edges" data-gc-edges aria-label="Các kết nối tài nguyên"></svg><div data-gc-nodes></div></div>
      <div class="gc-canvas-status" data-gc-status aria-live="polite"></div>
      <div class="gc-zoom-controls">${btn('zoom-out','−','aria-label="Thu nhỏ"')}<button type="button" data-gc-command="zoom-reset" data-gc-zoom-label title="Về 100%">100%</button>${btn('zoom-in','＋','aria-label="Phóng to"')}</div>
      <div class="gc-canvas-help"><span>Space + kéo: di chuyển</span><span>Cuộn: thu / phóng</span><span>Shift + bấm: chọn nhiều</span></div>
    </div><aside class="gc-inspector" data-gc-inspector data-scroll-key="economy-canvas-inspector" aria-label="Thuộc tính node và kết nối"></aside></div>
    <div class="gc-footer"><span data-gc-summary></span><span>Nối từ cổng ra <b>● → ●</b> đến cổng vào · tài nguyên ↔ quy tắc</span></div>
  </section>`;
}

export function resetCanvasState(){sessions.clear();}

export function mountCanvas(root,ctx){
  const host=root.matches?.('[data-gc-editor]')?root:root.querySelector('[data-gc-editor]');
  if(!host)return()=>{};
  const key=ctx.key||ctx.getScenario().id;
  if(!sessions.has(key))sessions.set(key,{selected:new Set(),edge:null,undo:[],redo:[],view:null,link:null,signature:null,expanded:false});
  const state=sessions.get(key),viewport=host.querySelector('[data-gc-viewport]'),stage=host.querySelector('[data-gc-stage]'),svg=host.querySelector('[data-gc-edges]'),nodesEl=host.querySelector('[data-gc-nodes]'),inspector=host.querySelector('[data-gc-inspector]');
  const abort=new AbortController(),options={signal:abort.signal};
  let disposed=false,drag=null,space=false,wheelTimer=null,persisting=false,localPositions=null;
  const scenario=()=>ctx.getScenario();
  const baseView=()=>scenario().canvas?.viewport||{x:32,y:32,zoom:1};
  const signature=fingerprint(scenario());
  if(state.signature!==null&&state.signature!==signature){state.undo=[];state.redo=[];state.view=null;state.selected.clear();state.edge=null;}
  state.signature=signature;
  if(!state.view)state.view={...baseView()};
  state.link=null;
  const notify=message=>ctx.toast?.(message);
  const point=e=>{const rect=viewport.getBoundingClientRect();return{x:(e.clientX-rect.left-state.view.x)/state.view.zoom,y:(e.clientY-rect.top-state.view.y)/state.view.zoom};};
  const nodes=()=>graphNodes(scenario()).map(n=>localPositions?.[n.id]?{...n,...localPositions[n.id]}:n);
  const selectedNode=()=>state.selected.size===1?nodes().find(n=>state.selected.has(n.id)):null;

  async function commit(next,{record=true,selection,edge}={}){
    try{
      const before=clone(scenario());
      next=setGraphViewport(next,state.view);
      validateFlowScenario(next);
      if(JSON.stringify(next)===JSON.stringify(before))return;
      if(record){state.undo.push({scenario:before,selected:[...state.selected],edge:state.edge});if(state.undo.length>30)state.undo.shift();state.redo=[];}
      if(selection)state.selected=new Set(selection);
      if(edge!==undefined)state.edge=edge;
      state.link=null;
      state.signature=fingerprint(next);
      state.refocus=document.activeElement===viewport||document.activeElement?.matches('[data-gc-node]');
      await ctx.commit(next);
    }catch(error){state.signature=fingerprint(scenario());notify(error.message);if(!disposed)draw();}
  }
  async function saveViewport(){
    clearTimeout(wheelTimer);wheelTimer=null;
    if(disposed)return;
    if(persisting){wheelTimer=setTimeout(()=>void saveViewport(),320);return;}
    try{const view={...state.view};if(JSON.stringify(view)===JSON.stringify(baseView()))return;persisting=true;if(ctx.persistViewport){const saving=ctx.persistViewport(view);state.signature=fingerprint(scenario());await saving;}else await commit(setGraphViewport(scenario(),view),{record:false});}catch(error){notify(error.message);}finally{persisting=false;}
  }
  function paintView(){
    const {x,y,zoom}=state.view;
    stage.style.transform=`translate(${x}px,${y}px) scale(${zoom})`;
    viewport.style.backgroundSize=`${24*zoom}px ${24*zoom}px`;
    viewport.style.backgroundPosition=`${x}px ${y}px`;
    host.querySelector('[data-gc-zoom-label]').textContent=`${Math.round(zoom*100)}%`;
  }
  function zoomAt(value,clientX,clientY){
    const rect=viewport.getBoundingClientRect(),px=clientX??rect.left+rect.width/2,py=clientY??rect.top+rect.height/2,p=point({clientX:px,clientY:py}),z=bound(value,MIN_ZOOM,MAX_ZOOM);
    state.view={x:bound(px-rect.left-p.x*z,-100000,100000),y:bound(py-rect.top-p.y*z,-100000,100000),zoom:z};paintView();
  }
  function fit(subject){
    const ns=subject?graphNodes(subject):nodes(),rect=viewport.getBoundingClientRect();
    if(!ns.length){state.view={x:32,y:32,zoom:1};paintView();return;}
    const minX=Math.min(...ns.map(n=>n.x)),minY=Math.min(...ns.map(n=>n.y)),maxX=Math.max(...ns.map(n=>n.x+W)),maxY=Math.max(...ns.map(n=>n.y+H)),z=bound(Math.min((rect.width-96)/(maxX-minX),(rect.height-112)/(maxY-minY),1),MIN_ZOOM,MAX_ZOOM);
    state.view={x:bound((rect.width-(maxX-minX)*z)/2-minX*z,-100000,100000),y:bound(Math.min(64,(rect.height-(maxY-minY)*z)/2)-minY*z,-100000,100000),zoom:z};paintView();
  }
  function edgeGeometry(edge,ns=nodes()){
    const from=ns.find(n=>n.id===edge.from),to=ns.find(n=>n.id===edge.to);if(!from||!to)return null;
    const start={x:from.x+W,y:from.y+H/2},end={x:to.x,y:to.y+H/2},d=Math.max(64,Math.abs(end.x-start.x)*.46);
    return {path:`M ${start.x} ${start.y} C ${start.x+d} ${start.y} ${end.x-d} ${end.y} ${end.x} ${end.y}`,x:(start.x+end.x)/2,y:(start.y+end.y)/2};
  }
  function drawEdges(){
    const ns=nodes();
    svg.innerHTML=`<defs><marker id="gc-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M 1 1 L 7 4 L 1 7" fill="none" stroke="context-stroke" stroke-width="1.5"/></marker></defs>`+graphEdges(scenario()).map(e=>{
      const g=edgeGeometry(e,ns);if(!g)return'';
      return `<g class="gc-edge ${state.edge===e.id?'selected':''}" data-gc-edge="${esc(e.id)}" role="button" tabindex="0" aria-label="${esc(ns.find(n=>n.id===e.from)?.data.name)} đến ${esc(ns.find(n=>n.id===e.to)?.data.name)}, số lượng ${fmt(e.amount)}"><path class="gc-edge-hit" d="${g.path}"/><path class="gc-edge-line" d="${g.path}" marker-end="url(#gc-arrow)"/><g class="gc-edge-label" transform="translate(${g.x} ${g.y})"><rect x="-29" y="-12" width="58" height="24" rx="8"/><text text-anchor="middle" dominant-baseline="central">${fmt(e.amount)}</text></g></g>`;
    }).join('');
    if(state.link){const n=ns.find(n=>n.id===state.link.node);if(n){const from={x:n.x+(state.link.side==='out'?W:0),y:n.y+H/2},to=state.link.point||from,d=Math.max(50,Math.abs(to.x-from.x)*.4),sign=state.link.side==='out'?1:-1;svg.insertAdjacentHTML('beforeend',`<path class="gc-link-preview" d="M ${from.x} ${from.y} C ${from.x+d*sign} ${from.y} ${to.x-d*sign} ${to.y} ${to.x} ${to.y}"/>`);}}
  }
  function drawNodes(){
    nodesEl.innerHTML=nodes().map(n=>{
      const r=n.data,kind=kinds[n.kind],order=n.kind==='resource'?null:scenario().rules.findIndex(x=>x.id===n.id)+1;
      return `<article class="gc-node gc-${n.kind} ${state.selected.has(n.id)?'selected':''} ${n.complete?'':'incomplete'} ${r.enabled===false?'disabled':''}" data-gc-node="${esc(n.id)}" tabindex="0" role="button" aria-label="${kind.name}: ${esc(r.name)}" aria-pressed="${state.selected.has(n.id)}" style="left:${n.x}px;top:${n.y}px">
      ${n.kind==='source'?'':nodePort(n,'in')}<div class="gc-node-heading"><span class="gc-kind-icon">${kind.icon}</span><span>${kind.name}</span>${order?`<span class="gc-node-order" title="Thứ tự chạy trong ngày">${order}</span>`:''}</div><strong class="gc-node-name" title="${esc(r.name)}">${esc(r.name)}</strong><div class="gc-node-meta">${n.kind==='resource'?`<span>Tồn đầu <b>${fmt(r.initial)}</b></span><small>${r.capacity===null?'Không giới hạn kho':`Sức chứa ${fmt(r.capacity)}`}</small>`:`<span>${r.enabled===false?'Đang tắt':n.complete?`${fmt(r.probability*100)}% · ${r.repeat?`mỗi ${r.every} ngày`:'một lần'}`:'Chưa nối đủ cổng'}</span><small>${r.delay?`Chờ ${r.delay} ngày`:r.condition?'Có điều kiện mở khóa':`Bắt đầu ngày ${r.start}`}</small>`}</div>${n.kind==='drain'?'':nodePort(n,'out')}</article>`;
    }).join('');
  }
  function connectedList(node){
    const edges=graphEdges(scenario()).filter(e=>e.from===node.id||e.to===node.id),ns=nodes();
    return `<div class="gc-property-section"><div class="gc-property-heading">Kết nối <span>${edges.length}</span></div>${edges.map(e=>`<button type="button" class="gc-connection-row" data-gc-select-edge="${esc(e.id)}"><span>${e.from===node.id?'→':'←'} ${esc(ns.find(n=>n.id===(e.from===node.id?e.to:e.from))?.data.name||'')}</span><b>${fmt(e.amount)}</b></button>`).join('')||'<p class="gc-subtle">Chưa có kết nối. Kéo từ một cổng sang cổng khác, hoặc bấm lần lượt hai cổng.</p>'}</div>`;
  }
  function renderInspector(){
    const ns=nodes(),edge=graphEdges(scenario()).find(e=>e.id===state.edge),n=selectedNode();
    if(edge){
      inspector.innerHTML=`<div class="gc-inspector-title"><span class="eyebrow">KẾT NỐI TÀI NGUYÊN</span><h3>Định lượng dòng chảy</h3><p>Mỗi lần quy tắc thực thi thành công.</p></div><div class="gc-property-section"><div class="gc-edge-description"><span>${esc(ns.find(n=>n.id===edge.from)?.data.name)}</span><b>↓</b><span>${esc(ns.find(n=>n.id===edge.to)?.data.name)}</span></div><label>Số lượng${input('edge-amount',edge.amount,'min="0.000001" max="1000000000" step="any"')}</label><p class="gc-subtle">${edge.side==='input'?'Quy tắc phải có đủ mọi nguyên liệu trước khi chạy; chỉ trừ khi thành công.':'Đầu ra được giao theo độ trễ của quy tắc; phần vượt sức chứa bị mất.'}</p>${btn('disconnect','Xóa kết nối','class="danger gc-wide"')}</div>`;return;
    }
    if(state.selected.size>1){inspector.innerHTML=`<div class="gc-inspector-title"><span class="eyebrow">LỰA CHỌN</span><h3>${state.selected.size} node đang chọn</h3><p>Kéo một node để di chuyển toàn bộ nhóm.</p></div><div class="gc-property-section">${ns.filter(x=>state.selected.has(x.id)).map(x=>`<div class="gc-selection-row"><span class="gc-kind-icon gc-${x.kind}">${kinds[x.kind].icon}</span>${esc(x.data.name)}</div>`).join('')}${btn('delete','Xóa các node đã chọn','class="danger gc-wide"')}<p class="gc-subtle">Xóa cả kết nối và mục tiêu tham chiếu đến tài nguyên đã chọn. Có thể hoàn tác bằng Ctrl+Z.</p></div>`;return;}
    if(!n){
      const drafts=ns.filter(x=>!x.complete);
      inspector.innerHTML=`<div class="gc-inspector-title"><span class="eyebrow">THIẾT KẾ TRỰC TIẾP</span><h3>Một sơ đồ, cùng dữ liệu</h3><p>Tạo node, nối tài nguyên và chỉnh quy tắc ngay tại đây.</p></div><div class="gc-property-section gc-onboarding"><div><b>1</b><p><strong>Đặt các thành phần</strong><span>Kéo từ thanh công cụ vào canvas, hoặc bấm để thêm.</span></p></div><div><b>2</b><p><strong>Nối các cổng</strong><span>Nguồn thu → tài nguyên → crafting hoặc tiêu hao.</span></p></div><div><b>3</b><p><strong>Chỉnh lượng & lịch chạy</strong><span>Chọn đường nối để nhập số lượng. Chọn node để sửa thuộc tính.</span></p></div></div>${drafts.length?`<div class="gc-property-section gc-diagnostics"><div class="gc-property-heading">Cần hoàn thiện <span>${drafts.length}</span></div>${drafts.map(x=>`<button type="button" data-gc-select-node="${esc(x.id)}"><span>!</span><div>${esc(x.data.name)}<small>${x.kind==='source'?'Nối đầu ra với tài nguyên':x.kind==='drain'?'Nối tài nguyên vào đầu vào':'Cần tài nguyên vào và đầu ra'}</small></div></button>`).join('')}</div>`:`<div class="gc-property-section"><p class="gc-ready">${ns.length?'✓ Các node đã sẵn sàng kết nối':'Thêm một tài nguyên để bắt đầu.'}</p><p class="gc-subtle">Số trên node là thứ tự quy tắc chạy trong ngày. Kéo node chỉ thay đổi bố cục.</p></div>`}`;return;
    }
    const r=n.data,resource=n.kind==='resource';
    inspector.innerHTML=`<div class="gc-inspector-title"><span class="eyebrow">${kinds[n.kind].name.toLocaleUpperCase('vi-VN')}</span><h3>${esc(r.name)}</h3>${!n.complete?'<p class="gc-warning">Nối đủ tài nguyên để quy tắc có thể chạy.</p>':''}</div><div class="gc-property-section" data-gc-property-node="${esc(n.id)}"><label>Tên hiển thị<input data-gc-field="name" value="${esc(r.name)}" maxlength="80"></label>${resource?`<label>Tồn đầu / người${input('initial',r.initial,'min="0" max="1000000000000" step="any"')}</label><label>Sức chứa${input('capacity',r.capacity??'','min="0" max="1000000000000" step="any" placeholder="Không giới hạn"')}</label><p class="gc-subtle">Để trống sức chứa nếu kho không có giới hạn.</p>`:`<label>Loại quy tắc<select data-gc-field="kind">${['source','drain','converter'].map(k=>`<option value="${k}" ${n.kind===k?'selected':''}>${kinds[k].name}</option>`).join('')}</select></label><div class="gc-order-editor"><span>Thứ tự trong ngày <b>${scenario().rules.findIndex(x=>x.id===n.id)+1}</b></span>${btn('order-up','↑',`aria-label="Đưa quy tắc lên" ${scenario().rules[0]?.id===n.id?'disabled':''}`)}${btn('order-down','↓',`aria-label="Đưa quy tắc xuống" ${scenario().rules.at(-1)?.id===n.id?'disabled':''}`)}</div><label class="gc-check"><input type="checkbox" data-gc-field="enabled" ${r.enabled?'checked':''}>Bật quy tắc</label><label class="gc-check"><input type="checkbox" data-gc-field="repeat" ${r.repeat?'checked':''}>Lặp lại theo lịch</label><div class="gc-property-grid"><label>Ngày bắt đầu${input('start',r.start,'min="1" max="3650" step="1"')}</label><label>Lặp mỗi (ngày)${input('every',r.every,'min="1" max="3650" step="1"')}</label><label>Xác suất (%)${input('probability',r.probability*100,'min="0" max="100" step="any"')}</label><label>Chờ giao (ngày)${input('delay',r.delay,'min="0" max="3650" step="1"')}</label></div><label>Điều kiện mở khóa<select data-gc-field="condition-resource"><option value="">Không có điều kiện</option>${scenario().resources.map(x=>`<option value="${esc(x.id)}" ${r.condition?.resource===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>${r.condition?`<label>Phải có ít nhất${input('condition-amount',r.condition.atLeast,'min="0" max="1000000000000" step="any"')}</label>`:''}<p class="gc-subtle">Mỗi quy tắc chạy tối đa một lần/ngày đủ điều kiện. Tắt lặp lại: ngừng sau lần thành công đầu tiên.</p>`}</div>${connectedList(n)}<div class="gc-property-section">${btn('delete',`Xóa ${kinds[n.kind].name.toLocaleLowerCase('vi-VN')}`,'class="danger gc-wide"')}${resource?'<p class="gc-subtle">Gỡ các kết nối và mục tiêu; các quy tắc dùng tài nguyên này làm điều kiện sẽ bị tắt. Có thể hoàn tác.</p>':''}</div>`;
  }
  function status(){
    const ns=nodes(),missing=ns.filter(n=>!n.complete).length;
    host.querySelector('[data-gc-status]').innerHTML=state.link?'<span class="gc-status-pill linking">Chọn cổng đối diện để nối · Esc để hủy</span>':missing?`<span class="gc-status-pill warning">${missing} quy tắc chưa nối đủ · vẫn tự động lưu</span>`:'';
    host.querySelector('[data-gc-summary]').textContent=`${scenario().resources.length} tài nguyên · ${scenario().rules.length} quy tắc · ${graphEdges(scenario()).length} kết nối`;
    host.querySelector('[data-gc-command="undo"]').disabled=!state.undo.length;
    host.querySelector('[data-gc-command="redo"]').disabled=!state.redo.length;
    host.classList.toggle('gc-expanded',state.expanded);
    host.querySelector('[data-gc-command="expand"]').setAttribute('aria-label',state.expanded?'Thu gọn canvas':'Mở rộng canvas');
    host.querySelector('[data-gc-command="expand"]').title=state.expanded?'Thu gọn canvas':'Mở rộng canvas';
    for(const el of host.querySelectorAll('[data-gc-create]'))el.disabled=el.dataset.gcCreate==='resource'?scenario().resources.length>=20:scenario().rules.length>=40;
    viewport.classList.toggle('gc-connecting',!!state.link);
  }
  function draw(){
    const before=captureView(host);
    const ids=new Set(nodes().map(n=>n.id));state.selected=new Set([...state.selected].filter(id=>ids.has(id)));
    if(!graphEdges(scenario()).some(e=>e.id===state.edge))state.edge=null;
    drawNodes();drawEdges();paintView();renderInspector();status();before.restore();
  }
  function selection(id,shift=false){
    if(shift){if(state.selected.has(id))state.selected.delete(id);else state.selected.add(id);}else state.selected=new Set([id]);
    state.edge=null;draw();
  }
  function selectEdge(id){state.edge=id;state.selected.clear();state.link=null;draw();}
  function focusViewport(){viewport.focus({preventScroll:true});}
  async function makeNode(kind,pos){
    try{
      const rect=viewport.getBoundingClientRect(),p=pos||point({clientX:rect.left+rect.width/2-W*state.view.zoom/2,clientY:rect.top+rect.height/2-H*state.view.zoom/2}),offset=pos?0:(nodes().length%4)*20,next=addGraphNode(scenario(),kind,{x:bound(p.x+offset,-100000,100000),y:bound(p.y+offset,-100000,100000)}),id=(kind==='resource'?next.resources:next.rules).at(-1).id;
      await commit(next,{selection:[id],edge:null});
    }catch(e){notify(e.message);}
  }
  async function completeLink(port){
    if(!state.link)return;
    const target={node:port.dataset.gcNodeId,side:port.dataset.gcPort},start=state.link;
    if(start.node===target.node&&start.side===target.side){state.link=null;drawEdges();status();return;}
    if(start.side===target.side){notify('Hãy nối cổng ra với cổng vào.');return;}
    try{
      const from=start.side==='out'?start.node:target.node,to=start.side==='in'?start.node:target.node,next=connectGraph(scenario(),from,to),newEdge=graphEdges(next).find(e=>e.from===from&&e.to===to);
      await commit(next,{selection:[],edge:newEdge?.id||null});
    }catch(error){notify(error.message);state.link=null;drawEdges();status();}
  }
  async function removeSelection(){
    if(state.edge){await commit(disconnectGraph(scenario(),state.edge),{edge:null});return;}
    if(state.selected.size)await commit(deleteGraphNodes(scenario(),[...state.selected]),{selection:[],edge:null});
  }
  async function history(redo=false){
    const source=redo?state.redo:state.undo,destination=redo?state.undo:state.redo;if(!source.length)return;
    const entry=source.pop(),previous=entry.scenario;destination.push({scenario:clone(scenario()),selected:[...state.selected],edge:state.edge});state.view={...(previous.canvas?.viewport||baseView())};await commit(previous,{record:false,selection:entry.selected,edge:entry.edge});
  }
  async function command(name){
    try{
      if(name==='zoom-in'||name==='zoom-out'){zoomAt(state.view.zoom*(name==='zoom-in'?1.2:1/1.2));await saveViewport();}
      else if(name==='zoom-reset'){zoomAt(1);await saveViewport();}
      else if(name==='fit'){fit();await saveViewport();}
      else if(name==='expand'){state.expanded=!state.expanded;status();fit();await saveViewport();}
      else if(name==='layout'){const next=autoLayoutGraph(scenario());fit(next);await commit(next);}
      else if(name==='undo'||name==='redo')await history(name==='redo');
      else if(name==='delete'||name==='disconnect')await removeSelection();
      else if(name==='order-up'||name==='order-down'){const n=selectedNode();if(!n||n.kind==='resource')return;const next=clone(scenario()),i=next.rules.findIndex(r=>r.id===n.id),j=i+(name==='order-up'?-1:1);if(j<0||j>=next.rules.length)return;[next.rules[i],next.rules[j]]=[next.rules[j],next.rules[i]];await commit(next);}
    }catch(error){notify(error.message);}
  }
  host.addEventListener('click',e=>{
    const create=e.target.closest('[data-gc-create]');if(create){void makeNode(create.dataset.gcCreate);return;}
    const c=e.target.closest('[data-gc-command]');if(c){void command(c.dataset.gcCommand);return;}
    const edge=e.target.closest('[data-gc-select-edge]');if(edge){selectEdge(edge.dataset.gcSelectEdge);return;}
    const node=e.target.closest('[data-gc-select-node]');if(node){selection(node.dataset.gcSelectNode);return;}
    const port=e.target.closest('[data-gc-port]');if(port&&e.detail===0){if(state.link)void completeLink(port);else{state.link={node:port.dataset.gcNodeId,side:port.dataset.gcPort};drawEdges();status();}}
  },options);
  host.addEventListener('change',async e=>{
    const field=e.target.dataset.gcField;if(!field)return;
    try{
      if(field==='edge-amount'){if(state.edge)await commit(updateGraphEdge(scenario(),state.edge,Number(e.target.value)));return;}
      const n=selectedNode();if(!n)return;
      const next=clone(scenario()),r=(n.kind==='resource'?next.resources:next.rules).find(x=>x.id===n.id),value=e.target.value;
      if(field==='kind'){if(value==='source'&&r.inputs.length||value==='drain'&&r.outputs.length)throw Error('Loại mới không hỗ trợ một số kết nối hiện tại. Hãy xóa các kết nối đó trước khi đổi loại.');r.kind=value;}
      else if(field==='name')r.name=value.trim();
      else if(field==='condition-resource')r.condition=value?{resource:value,atLeast:r.condition?.atLeast??1}:null;
      else if(field==='condition-amount')r.condition.atLeast=Number(value);
      else if(field==='enabled'||field==='repeat')r[field]=e.target.checked;
      else r[field]=field==='capacity'&&value===''?null:field==='probability'?Number(value)/100:Number(value);
      await commit(next);
    }catch(error){notify(error.message);if(!disposed)draw();}
  },options);
  viewport.addEventListener('pointerdown',e=>{
    if(e.button!==0&&e.button!==1)return;
    if(drag&&drag.pointer!==e.pointerId)return;
    if(e.target.closest('[data-gc-command]'))return;
    const port=e.target.closest('[data-gc-port]'),node=e.target.closest('[data-gc-node]'),edge=e.target.closest('[data-gc-edge]');
    focusViewport();e.preventDefault();
    if(e.button===1||space){drag={type:'pan',startX:e.clientX,startY:e.clientY,view:{...state.view},pointer:e.pointerId};viewport.classList.add('gc-panning');viewport.setPointerCapture(e.pointerId);return;}
    if(port){
      if(state.link){void completeLink(port);return;}
      state.link={node:port.dataset.gcNodeId,side:port.dataset.gcPort,point:point(e)};drag={type:'link',startX:e.clientX,startY:e.clientY,pointer:e.pointerId,moved:false};viewport.setPointerCapture(e.pointerId);drawEdges();status();return;
    }
    if(node){
      state.link=null;
      const id=node.dataset.gcNode;
      if(e.shiftKey){selection(id,true);return;}
      if(!state.selected.has(id))selection(id);else{state.edge=null;renderInspector();}
      const start=point(e);drag={type:'nodes',start,positions:Object.fromEntries(nodes().filter(n=>state.selected.has(n.id)).map(n=>[n.id,{x:n.x,y:n.y}])),pointer:e.pointerId,moved:false};viewport.setPointerCapture(e.pointerId);return;
    }
    if(edge){selectEdge(edge.dataset.gcEdge);return;}
    if(state.link){state.link=null;drawEdges();status();return;}
    state.selected.clear();state.edge=null;draw();
    drag={type:'pan',startX:e.clientX,startY:e.clientY,view:{...state.view},pointer:e.pointerId};viewport.setPointerCapture(e.pointerId);viewport.classList.add('gc-panning');
  },options);
  viewport.addEventListener('pointermove',e=>{
    if(drag&&drag.pointer!==e.pointerId)return;
    if(!drag){if(state.link){state.link.point=point(e);drawEdges();}return;}
    if(drag.type==='pan'){state.view={...drag.view,x:bound(drag.view.x+e.clientX-drag.startX,-100000,100000),y:bound(drag.view.y+e.clientY-drag.startY,-100000,100000)};paintView();}
    else if(drag.type==='link'){drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>4;if(state.link){state.link.point=point(e);drawEdges();}}
    else if(drag.type==='nodes'){const p=point(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;drag.moved ||= Math.hypot(dx,dy)>3/state.view.zoom;if(!drag.moved)return;localPositions=Object.fromEntries(Object.entries(drag.positions).map(([id,pos])=>[id,{x:bound(pos.x+dx,-100000,100000),y:bound(pos.y+dy,-100000,100000)}]));for(const el of nodesEl.querySelectorAll('[data-gc-node]')){const pos=localPositions[el.dataset.gcNode];if(pos){el.style.left=`${pos.x}px`;el.style.top=`${pos.y}px`;}}drawEdges();}
  },options);
  viewport.addEventListener('pointerup',e=>{
    if(!drag||drag.pointer!==e.pointerId)return;const action=drag;drag=null;viewport.classList.remove('gc-panning');if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
    if(action.type==='pan'){void saveViewport();return;}
    if(action.type==='nodes'){const positions=localPositions;localPositions=null;if(action.moved&&positions)void commit(moveGraphNodes(scenario(),positions));return;}
    if(action.type==='link'&&action.moved){const port=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-gc-port]');if(port&&host.contains(port))void completeLink(port);else{state.link=null;drawEdges();status();}}
  },options);
  function cancelPointer(){if(drag?.type==='pan')state.view={...drag.view};drag=null;localPositions=null;state.link=null;viewport.classList.remove('gc-panning');draw();}
  viewport.addEventListener('pointercancel',cancelPointer,options);
  viewport.addEventListener('lostpointercapture',()=>{if(drag)cancelPointer();},options);
  viewport.addEventListener('wheel',e=>{e.preventDefault();zoomAt(state.view.zoom*Math.exp(-bound(e.deltaY,-120,120)*.002),e.clientX,e.clientY);clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>void saveViewport(),320);},{...options,passive:false});
  host.addEventListener('dragstart',e=>{const el=e.target.closest('[data-gc-create]');if(!el)return;e.dataTransfer.setData('application/x-gd-economy-node',el.dataset.gcCreate);e.dataTransfer.effectAllowed='copy';},options);
  viewport.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('application/x-gd-economy-node')){e.preventDefault();e.dataTransfer.dropEffect='copy';viewport.classList.add('gc-drop-target');}},options);
  viewport.addEventListener('dragleave',e=>{if(!viewport.contains(e.relatedTarget))viewport.classList.remove('gc-drop-target');},options);
  viewport.addEventListener('drop',e=>{viewport.classList.remove('gc-drop-target');const kind=e.dataTransfer.getData('application/x-gd-economy-node');if(!kinds[kind])return;e.preventDefault();void makeNode(kind,point(e));},options);
  host.addEventListener('keydown',e=>{
    if(e.target.matches('input,textarea,select')||e.target.isContentEditable)return;
    const mod=e.ctrlKey||e.metaKey;
    if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();void history(e.shiftKey);return;}
    if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();void history(true);return;}
    if(e.key==='Escape'){if(!state.link&&!state.selected.size&&!state.edge)state.expanded=false;state.link=null;state.selected.clear();state.edge=null;draw();return;}
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();void command('delete');return;}
    if(e.code==='Space'&&e.target===viewport){e.preventDefault();space=true;viewport.classList.add('gc-space');return;}
    if(e.target.closest('[data-gc-port]'))return;
    if(e.target.closest('[data-gc-node]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selection(e.target.closest('[data-gc-node]').dataset.gcNode,e.shiftKey);focusViewport();return;}
    if(e.target.closest('[data-gc-edge]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectEdge(e.target.closest('[data-gc-edge]').dataset.gcEdge);focusViewport();return;}
    if(e.target===viewport){if(mod&&e.key.toLowerCase()==='a'){e.preventDefault();state.selected=new Set(nodes().map(n=>n.id));state.edge=null;draw();}else if(e.key.toLowerCase()==='f'){e.preventDefault();void command('fit');}else if(e.key==='+'||e.key==='='){e.preventDefault();void command('zoom-in');}else if(e.key==='-'){e.preventDefault();void command('zoom-out');}}
  },options);
  window.addEventListener('keyup',e=>{if(e.code==='Space'){space=false;viewport.classList.remove('gc-space');}},options);
  window.addEventListener('blur',()=>{space=false;viewport.classList.remove('gc-space');if(drag)cancelPointer();},options);
  draw();
  if(state.refocus){focusViewport();state.refocus=false;}
  // Existing scenarios get a readable initial viewport, without changing simulation data.
  if(!scenario().canvas?.viewport&&nodes().length>1&&!state.undo.length){fit();}
  return()=>{if(wheelTimer&&ctx.persistViewport){clearTimeout(wheelTimer);wheelTimer=null;void ctx.persistViewport({...state.view}).catch(error=>notify(error.message));}disposed=true;abort.abort();clearTimeout(wheelTimer);localPositions=null;drag=null;state.link=null;};
}
