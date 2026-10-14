import {findNode,walk} from '../core/engine.mjs';
import {parseItems,appendItems} from '../core/editing.mjs';
import {esc} from './features.mjs';

export function bulkItemsDialog(config,parentId,{text='',weight=1,tier=''}={}) {
  const parent=findNode(config.root,parentId);
  if(!parent?.children)throw Error('Không tìm thấy vị trí nhập item.');
  const destination=parentId===config.root.id?'banner “'+config.name+'”':'pool “'+parent.name+'”';
  const d=document.querySelector('#dialog');let count=0;walk(config.root,()=>count++);
  d.classList.add('bulk-dialog');
  d.innerHTML=`<form method="dialog"><h2>Nhập nhiều item</h2><p>Thêm vào ${esc(destination)} · còn ${200-count} chỗ trong banner.</p><label>Danh sách · mỗi dòng một item<textarea name="items" rows="7" maxlength="100000" autofocus placeholder="Kiếm lửa&#10;Cung băng&#10;Khiên đá">${esc(text)}</textarea></label><small>Dán danh sách tên, hoặc 3 cột từ bảng tính: Tên → Weight → Tier (phân cách bằng Tab, không có dòng tiêu đề). Bỏ qua dòng trống; tên trùng vẫn tạo item riêng.</small><div class="form-grid"><label>Weight mặc định<input name="weight" type="number" min="0" max="1000000000" step="any" value="${esc(weight)}" required></label><label>Tier mặc định<input name="tier" maxlength="40" value="${esc(tier)}" placeholder="Ví dụ: SSR"></label></div><div class="bulk-preview" aria-live="polite"></div><div class="actions"><button value="cancel" formnovalidate>Hủy</button><button class="primary" value="ok">Tạo item</button></div></form>`;
  const form=d.querySelector('form'),preview=d.querySelector('.bulk-preview'),submit=d.querySelector('.primary');let result;
  function update(){
    try{
      const fields=Object.fromEntries(new FormData(form));
      const items=parseItems(fields.items,{weight:fields.weight,tier:fields.tier});
      result=appendItems(config,parentId,items);
      preview.innerHTML=`<strong>Sẽ tạo ${items.length} item</strong><div class="table-wrap"><table><thead><tr><th>TÊN</th><th>WEIGHT</th><th>TIER</th></tr></thead><tbody>${items.map(n=>`<tr><td>${esc(n.name)}</td><td>${esc(n.weight)}</td><td>${esc(n.tier||'Chưa gán tier')}</td></tr>`).join('')}</tbody></table></div>`;
      submit.disabled=false;submit.textContent=`Tạo ${items.length} item`;
    }catch(e){result=null;preview.innerHTML=`<p class="error">${esc(e.message)}</p>`;submit.disabled=true;submit.textContent='Tạo item';}
  }
  form.addEventListener('input',update);
  form.addEventListener('submit',e=>{if(e.submitter?.value==='ok'){update();if(!result)e.preventDefault();}});
  update();d.returnValue='cancel';d.showModal();
  return new Promise(resolve=>{d.onclose=()=>{d.classList.remove('bulk-dialog');resolve(d.returnValue==='ok'?result:null);};});
}
