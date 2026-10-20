import {esc,rngName} from './features.mjs';

const fmt=n=>Number(n).toLocaleString('vi-VN');

export function updatePanel(s){
  const percent=Math.max(0,Math.min(100,Number(s.percent)||0));
  const labels={idle:'Sẵn sàng',checking:'Đang kiểm tra',available:'Có bản mới',downloading:'Đang tải',ready:'Sẵn sàng cài đặt',current:'Đã cập nhật',installing:'Đang cài đặt',unsupported:'Bản phát triển',error:'Cần thử lại'};
  const messages={
    idle:'Kiểm tra bản phát hành Windows mới nhất trên GitHub.',
    checking:'Đang kiểm tra GitHub Releases…',
    available:`Phiên bản ${s.version} đã sẵn sàng. Tải về để cập nhật ứng dụng.`,
    downloading:`Đang tải phiên bản ${s.version} · ${Math.round(percent)}%`,
    ready:`Phiên bản ${s.version} đã tải xong. Ứng dụng sẽ lưu dữ liệu, tự cài đặt im lặng rồi mở lại.`,
    current:'Bạn đang sử dụng phiên bản mới nhất.',
    installing:'Đang lưu dữ liệu và đóng ứng dụng để cài bản mới…',
    unsupported:'Cập nhật trực tiếp khả dụng trong bản Windows đã đóng gói. Bạn có thể tải bộ cài từ GitHub Releases.',
    error:s.error||'Không thể kiểm tra cập nhật. Vui lòng thử lại.'
  };
  return `<div class="panel-head"><div><h2>Cập nhật ứng dụng</h2><p>Luôn sẵn sàng cho phiên bản tiếp theo.</p></div><span class="badge update-status" data-update-status="${esc(s.status)}">${esc(labels[s.status]||labels.idle)}</span></div>
    <div class="panel-body"><div class="update-version"><span>Phiên bản hiện tại</span><strong>v${esc(s.currentVersion)}</strong></div>
    <p class="update-message ${s.status==='error'?'error':''}" role="status">${esc(messages[s.status]||messages.idle)}</p>
    ${s.status==='downloading'?`<div class="progress" role="progressbar" aria-label="Tiến độ tải cập nhật" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent)}"><div style="width:${percent}%"></div></div>`:''}
    ${s.error&&s.status!=='error'?`<div class="error">${esc(s.error)}</div>`:''}
    <div class="actions settings-update-actions">${['idle','current','error'].includes(s.status)?'<button class="primary" data-action="update-check">Kiểm tra ngay</button>':''}${s.status==='available'?'<button class="primary" data-action="update-download">Tải bản mới</button>':''}${s.status==='ready'?'<button class="primary" data-action="update-install">Cài và mở lại</button>':''}<button data-action="update-releases">Xem GitHub Releases ↗</button></div>
    <p class="update-repo">Nguồn: longnguy3n/GD-Toolkit · GitHub Releases.<br>Tự kiểm tra khi mở app; tải và cài khi bạn chọn. Cấu hình, lịch sử và giao diện được giữ nguyên.</p></div>`;
}

function appearance(s){
  return `<section class="panel settings-panel" id="settings-appearance"><div class="panel-head"><div><h2>Giao diện</h2><p>Một không gian làm việc theo cách bạn thích.</p></div></div><div class="panel-body">
    <div class="theme-previews" aria-hidden="true">${['light','dark'].map(theme=>`<div class="theme-preview ${theme} ${s.theme===theme?'selected':''}"><div class="theme-preview-window"><i></i><div><b></b><span></span><span></span></div></div><strong>${theme==='light'?'Sáng':'Tối'}${s.theme===theme?' · Đang dùng':''}</strong></div>`).join('')}</div>
    <label>Chế độ hiển thị<select data-setting="theme" aria-label="Chế độ giao diện"><option value="light" ${s.theme==='light'?'selected':''}>Sáng</option><option value="dark" ${s.theme==='dark'?'selected':''}>Tối</option></select></label><p class="rng-details">Áp dụng cho toàn bộ ứng dụng và lưu cho lần mở tiếp theo.</p></div></section>`;
}

function random(s,tape){
  return `<section class="panel settings-panel" id="settings-random"><div class="panel-head"><div><h2>Random engine</h2><p>Nguồn random dùng chung cho mọi công cụ và banner.</p></div></div><div class="panel-body"><div class="radio-cards">${['custom','unity-emulated','unity'].map(mode=>`<button class="radio-card ${s.rng===mode?'active':''}" data-action="rng" data-value="${mode}" aria-pressed="${s.rng===mode}"><strong>${rngName(mode)}</strong><small>${mode==='custom'?'RNG khác Unity · có seed':mode==='unity-emulated'?'Chạy ngay · không cần Unity':'Nhập Random.value từ Unity'}</small></button>`).join('')}</div>
    ${s.rng!=='unity'?`<p class="rng-details">${s.rng==='custom'?'xoshiro128** 1.1. Cùng seed, cấu hình và số lượt cho cùng kết quả.':'Giả lập họ thuật toán Xorshift128 mà Unity sử dụng. Seed và cách chuyển số thực của bản giả lập được định nghĩa riêng; không bảo đảm trùng chuỗi Unity InitState. Muốn đối chiếu chính xác, chọn Unity · mẫu thực.'}</p><div class="config-line"><label>Seed chung · uint32<input data-setting="seed" type="number" min="0" max="4294967295" value="${s.seed}"></label><button data-action="new-seed">↻ Seed mới</button></div>`:`<div class="rng-details"><p>Nhập chuỗi Random.value được xuất trực tiếp từ Unity. Mỗi pool được ghé dùng một mẫu; mỗi lần mô phỏng đọc lại từ đầu. Hết mẫu sẽ báo lỗi, không tự lặp.</p><div class="actions"><button data-action="unity-script">↧ Script Unity</button><button data-action="unity-import">↥ Nhập RNG JSON</button></div>${tape?`<strong>${fmt(tape.values.length)} mẫu · Unity ${esc(tape.unityVersion)} · seed ${esc(tape.seed)}</strong>`:'Chưa có mẫu. Lưu script vào Assets/Editor, mở Tools → GD Toolkit → Export Random rồi nhập JSON.'}<p>Mẫu chỉ giữ trong phiên này. Nếu chưa có Unity, chọn chế độ giả lập để chạy ngay.</p></div>`}
    <div class="note inspector-note">Random engine chỉ thay chuỗi mô phỏng. Calculate dùng mô hình xác suất độc lập đều và không phụ thuộc seed. Mỗi lần mô phỏng khởi tạo lại seed; không nối chuỗi RNG giữa các banner.</div></div></section>`;
}

export function settingsPage(doc,tape,state){
  return `<div class="settings-layout"><div class="settings-overview">${appearance(doc.settings)}<section class="panel settings-panel" id="settings-updates">${updatePanel(state)}</section></div>${random(doc.settings,tape)}
    <section class="panel settings-panel" id="settings-data"><div class="panel-head"><div><h2>Dữ liệu & sao lưu</h2><p>Toàn bộ dự án của bạn được lưu trên máy.</p></div></div><div class="panel-body"><div class="workspace-backup"><div><h3>Sao lưu toàn bộ workspace</h3><p>Lưu tất cả profile, banner, kịch bản Economy và lịch sử trong một file JSON. Khôi phục sẽ thay workspace đang dùng.</p></div><div class="actions"><button class="primary" data-action="workspace-export">Xuất bản sao JSON</button><button data-action="workspace-import">Khôi phục bản sao</button><button data-action="open-data">Mở thư mục dữ liệu ↗</button></div></div></div></section></div>`;
}
