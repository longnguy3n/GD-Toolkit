const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const GACHA_TABS=new Set(['setup','calculate','simulate','compare','players']);
const containsItem=node=>node?.children?node.children.some(containsItem):Boolean(node);
const metadata={
  setup:{group:'gacha',title:'Thiết kế gacha',accent:'gacha',eyebrow:'GACHA TOOL',description:'Thiết lập banner, kiểm tra xác suất và trải nghiệm người chơi.',guideTitle:'Bắt đầu từ cấu hình',guide:'Tạo pool và item, gán weight/tier rồi thiết lập pity và currency cho banner.',next:'calculate',nextLabel:'Tính xác suất'},
  calculate:{group:'gacha',title:'Tính toán gacha',accent:'gacha',eyebrow:'GACHA TOOL',description:'Dự báo số lượt, xác suất có đủ item và chi phí tương ứng.',guideTitle:'Chọn mục tiêu, xem dự báo',guide:'Chọn item và số bản sao cần có. Các mốc 50–99% cho biết cần bao nhiêu lượt để đạt ít nhất số lượng đó.',next:'simulate',nextLabel:'Roll thử'},
  simulate:{group:'gacha',title:'Mô phỏng gacha',accent:'gacha',eyebrow:'GACHA TOOL',description:'Theo dõi từng lượt roll, pity và toàn bộ phần thưởng nhận được.',guideTitle:'Một chuỗi gacha liên tục',guide:'Dùng để kiểm tra log item, counter pity và chi phí. Chuyển sang Người chơi để xem mức chênh lệch giữa nhiều người.',next:'players',nextLabel:'Nhiều người chơi'},
  compare:{group:'gacha',title:'So sánh banner',accent:'banner',eyebrow:'GACHA TOOL',description:'Đối chiếu xác suất, pity và chi phí trước khi chọn cấu hình.',guideTitle:'So sánh cùng một mục tiêu số lượng',guide:'Chọn từ 2 banner trong profile và chọn item mục tiêu cho từng banner. Kết quả dùng cùng số bản sao và số lượt gacha.',next:'balance',nextLabel:'Tìm thông số'},
  players:{group:'gacha',title:'Mô phỏng người chơi',accent:'người chơi',eyebrow:'GACHA TOOL',description:'Đo trải nghiệm của cả nhóm, từ người may mắn đến người chưa đạt mục tiêu.',guideTitle:'Mỗi người là một lần bắt đầu mới',guide:'Mỗi người chơi có kho đồ trống và counter ban đầu theo Setup. Xem phân bố phần thưởng, tỷ lệ đạt mục tiêu và chi phí.',next:'compare',nextLabel:'So sánh banner'},
  flow:{group:'flow',title:'Economy & Progression',accent:'Progression',eyebrow:'RESOURCE FLOW LAB',description:'Mô hình hóa tài nguyên, crafting và tiến trình trong cùng một profile.',guideTitle:'Thiết kế vòng lặp tài nguyên',guide:'Bắt đầu từ tài nguyên và nguồn thu, thêm chi tiêu hoặc chuyển đổi, rồi mô phỏng sự thay đổi theo thời gian.'},
  balance:{group:'balance',title:'Tìm thông số cân bằng',accent:'cân bằng',eyebrow:'BALANCE LAB',description:'Khảo sát các phương án để tiến gần mục tiêu thiết kế của bạn.',guideTitle:'Đặt mục tiêu → thử thông số → đối chiếu',guide:'Chọn thông số được phép thay đổi và khoảng khảo sát. Kiểm tra các phương án trước khi áp dụng vào banner.',next:'compare',nextLabel:'So sánh banner'},
  settings:{group:'settings',title:'Cài đặt chung',accent:'chung',eyebrow:'WORKSPACE SETTINGS',description:'Giao diện và nguồn random dùng chung cho mọi công cụ trong ứng dụng.'}
};

/** Display-only context. The workspace continues to own selected profiles and banners. */
export function workbenchContext(tab,doc){
  const current=metadata[tab]||metadata.setup;
  const profile=doc?.profiles?.find(p=>p.id===doc.activeProfileId)||doc?.profiles?.[0];
  const banner=profile?.banners?.find(b=>b.id===profile.activeBannerId)||profile?.banners?.[0];
  return {...current,tab:GACHA_TABS.has(tab)||metadata[tab]?tab:'setup',gacha:current.group==='gacha',profileName:profile?.name||'Profile',bannerName:banner?.config?.name||'Banner',emptyBanner:!containsItem(banner?.config?.root)};
}

export function workbenchGuide(tab,doc){
  const c=workbenchContext(tab,doc);
  // Economy has its own template chooser and guided steps directly below the context.
  if(c.group==='settings'||c.group==='flow')return '';
  const empty=c.gacha&&c.emptyBanner&&tab!=='compare';
  const title=empty?'Banner chưa có item':c.guideTitle;
  const description=empty?(tab==='setup'?'Thêm pool hoặc item trực tiếp vào banner để bắt đầu. Currency và pity nằm trong phần Thiết lập banner bên dưới.':'Thêm item trong Thiết lập trước khi tính toán hoặc chạy mô phỏng.'):c.guide;
  const next=empty?(tab==='setup'?null:'setup'):c.next;
  const label=empty?'Thêm item':c.nextLabel;
  return `<section class="workbench-guide${empty?' is-empty':''}" aria-label="Hướng dẫn ${escape(c.title)}"><span class="guide-symbol" aria-hidden="true">${empty?'＋':c.group==='flow'?'⇄':c.group==='balance'?'◎':'↳'}</span><div><strong>${escape(title)}</strong><p>${escape(description)}</p></div>${next?`<button class="small guide-next" data-action="tab" data-tab="${escape(next)}">${escape(label)} <span aria-hidden="true">→</span></button>`:''}</section>`;
}

/** Call after rendering profileBar and content; never focuses, scrolls, or mutates workspace. */
export function syncWorkbench(tab,doc,root=document){
  const c=workbenchContext(tab,doc),q=s=>root.querySelector(s);
  if(root.body)root.body.dataset.tool=c.group;
  root.querySelectorAll('.side-tool').forEach(b=>{
    const active=b.dataset.tab===(c.gacha?'setup':c.group);
    b.classList.toggle('active',active);
    if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
  root.querySelectorAll('.tabs button').forEach(b=>{
    const active=b.dataset.tab===c.tab;
    b.classList.toggle('active',active);
    b.setAttribute('aria-pressed',String(active));
  });
  for(const [selector,hidden] of [['#stats',!c.gacha],['#profile-bar',c.group==='settings'],['.tabs',!c.gacha],['.heading-actions',c.group==='settings'||c.group==='flow'],['#profile-bar .banner-child',c.group==='flow']]){
    const element=q(selector);if(element)element.hidden=hidden;
  }
  const title=q('.page-heading h1'),suffix=c.title.endsWith(c.accent);
  if(title)title.innerHTML=suffix?`${escape(c.title.slice(0,-c.accent.length))}<span>${escape(c.accent)}</span>`:escape(c.title);
  const description=q('.page-heading p');if(description)description.textContent=c.description;
  const eyebrow=q('.eyebrow');if(eyebrow)eyebrow.textContent=c.eyebrow;
  const crumb=q('.breadcrumb b');if(crumb)crumb.textContent=c.group==='gacha'?'Gacha':c.title;
  const guide=q('#workbench-guide');if(guide)guide.innerHTML=workbenchGuide(tab,doc);
}
