export const defaultEconomy = () => ({currency:'Gem',perPull:160,balance:0,unitPrice:0,money:'VND'});
export function validateEconomy(e) {
  if(!e||!['currency','money'].every(k=>typeof e[k]==='string'&&e[k].trim()&&e[k].length<=40))throw Error('Tên currency và đơn vị tiền phải có 1–40 ký tự.');
  for(const k of ['perPull','balance','unitPrice'])if(!Number.isFinite(e[k])||e[k]<0||e[k]>1e12)throw Error('Giá trị currency/giá tiền phải từ 0 đến 1.000 tỷ.');
  if(e.perPull<0.000001)throw Error('Currency mỗi lượt phải ít nhất 0,000001.');
  return e;
}
export function costs(e,pulls) {
  validateEconomy(e);
  if(!Number.isFinite(pulls)||pulls<0)throw Error('Số lượt tính chi phí không hợp lệ.');
  const currency=pulls*e.perPull,shortfall=Math.max(0,currency-e.balance);
  const ratio=e.balance/e.perPull,nearest=Math.round(ratio);
  const affordable=Math.abs(ratio-nearest)<=Number.EPSILON*Math.max(1,ratio)*4?nearest:Math.floor(ratio);
  return {currency,total:currency*e.unitPrice,shortfall,topUp:shortfall*e.unitPrice,affordable};
}
