const rates = { USD: 6.746, CNY: 1, EUR: 7.783, GBP: 9.11, JPY: 0.042, HKD: 0.86, TWD: 0.209, CAD: 4.843 };
let liveRates = { ...rates };
const symbols = { USD: '$', CNY: '¥', EUR: '€', GBP: '£', JPY: '¥', HKD: 'HK$', TWD: 'NT$', CAD: 'C$' };

const $ = (id) => document.getElementById(id);
const fields = ['renewalAmount', 'currency', 'exchangeRate', 'tradeDate', 'expiryDate', 'preciseTime', 'priceInput', 'pushFee', 'pushBearer', 'escrowEnabled', 'escrowRate', 'escrowBearer'];
const state = { periodDays: 365, priceMode: 'seller' };
let toastTimer;

function applyTheme(mode) {
  if (mode === 'light' || mode === 'dark') document.documentElement.dataset.theme = mode;
  else delete document.documentElement.dataset.theme;
  const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = mode === 'dark' || (mode === 'system' && systemDark);
  document.querySelector('meta[name="theme-color"]').content = isDark ? '#000000' : '#f5f5f7';
  try { localStorage.setItem('worth-theme', mode); } catch (error) { console.warn('Theme preference was not saved:', error); }
  $('themeMode').value = mode;
}

function savedTheme() {
  try { return localStorage.getItem('worth-theme') || 'system'; }
  catch { return 'system'; }
}

function localDateString(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function setDefaultDates() {
  const today = new Date();
  const expiry = new Date(today);
  expiry.setFullYear(expiry.getFullYear() + 1);
  $('tradeDate').value = localDateString(today);
  $('expiryDate').value = localDateString(expiry);
}

function setResetDates() {
  const today = localDateString(new Date());
  $('tradeDate').value = today;
  $('expiryDate').value = today;
}

function number(id) {
  const value = Number.parseFloat($(id).value);
  return Number.isFinite(value) ? value : 0;
}

function money(value) {
  const safe = Number.isFinite(value) ? value : 0;
  return `¥${safe.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function allocation(amount, bearer) {
  if (bearer === 'buyer') return { buyer: amount, seller: 0 };
  if (bearer === 'seller') return { buyer: 0, seller: amount };
  return { buyer: amount / 2, seller: amount / 2 };
}

function getDays() {
  const startValue = $('tradeDate').value;
  const endValue = $('expiryDate').value;
  const start = new Date(startValue.includes('T') ? startValue : `${startValue}T00:00:00`);
  const end = new Date(endValue.includes('T') ? endValue : `${endValue}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const raw = (end - start) / 86400000;
  return Math.max(0, $('preciseTime').checked ? raw : Math.ceil(raw));
}

function calculate() {
  const renewal = Math.max(0, number('renewalAmount'));
  const rate = Math.max(0, number('exchangeRate'));
  const days = getDays();
  const dailyOriginal = state.periodDays ? renewal / state.periodDays : 0;
  const remainingOriginal = dailyOriginal * days;
  const baseValue = remainingOriginal * rate;
  const input = number('priceInput');
  const sellerPrice = Math.max(0, state.priceMode === 'seller' ? input : baseValue + input);
  const premium = sellerPrice - baseValue;
  const premiumRatio = baseValue > 0 ? premium / baseValue * 100 : 0;

  const push = allocation(Math.max(0, number('pushFee')), $('pushBearer').value);
  const escrowRate = Math.min(100, Math.max(0, number('escrowRate')));
  const escrowAmount = $('escrowEnabled').checked ? sellerPrice * escrowRate / 100 : 0;
  const escrow = allocation(escrowAmount, $('escrowBearer').value);
  const buyerFees = push.buyer + escrow.buyer;
  const sellerFees = push.seller + escrow.seller;
  const buyerTotal = sellerPrice + buyerFees;
  const sellerNet = sellerPrice - sellerFees;

  $('remainingValue').textContent = baseValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  $('originalValue').textContent = `≈ ${symbols[$('currency').value]}${remainingOriginal.toFixed(2)} ${$('currency').value}`;
  $('remainingDays').textContent = `${days.toFixed($('preciseTime').checked ? 1 : 0)} 天`;
  $('officialDaily').textContent = money(dailyOriginal * rate);
  $('premiumValue').textContent = money(premium);
  $('premiumRatio').textContent = `${premiumRatio >= 0 ? '+' : ''}${premiumRatio.toFixed(1)}%`;
  $('premiumValue').classList.toggle('negative', premium < 0);
  $('premiumRatio').classList.toggle('negative', premium < 0);
  $('sellerPrice').textContent = money(sellerPrice);
  $('buyerFees').textContent = money(buyerFees);
  $('sellerFees').textContent = money(sellerFees);
  $('buyerTotal').textContent = money(buyerTotal);
  $('sellerNet').textContent = money(sellerNet);

  return { renewal, rate, days, baseValue, remainingOriginal, sellerPrice, premium, premiumRatio, escrowRate, escrowAmount, buyerFees, sellerFees, buyerTotal, sellerNet };
}

function selectPeriod(button) {
  document.querySelectorAll('#periodOptions button').forEach((item) => item.classList.toggle('active', item === button));
  state.periodDays = Number(button.dataset.days);
  calculate();
}

function selectMode(button) {
  const current = calculate();
  document.querySelectorAll('#priceMode button').forEach((item) => item.classList.toggle('active', item === button));
  state.priceMode = button.dataset.mode;
  $('priceLabel').textContent = state.priceMode === 'seller' ? '实付卖家' : '卖家溢价';
  $('priceInput').value = state.priceMode === 'seller' ? current.sellerPrice.toFixed(2) : current.premium.toFixed(2);
  calculate();
}

function togglePrecision() {
  const precise = $('preciseTime').checked;
  $('dateGrid').classList.toggle('precise', precise);
  ['tradeDate', 'expiryDate'].forEach((id) => {
    const input = $(id);
    const value = input.value;
    input.type = precise ? 'datetime-local' : 'date';
    input.value = precise ? (value.includes('T') ? value : `${value}T00:00`) : value.slice(0, 10);
  });
}

async function refreshRates() {
  $('rateStatus').textContent = '正在获取实时汇率…';
  $('refreshRate').disabled = true;
  try {
    const response = await fetch('/api/rates', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.rates || !data.rates.CNY) throw new Error('汇率响应无效');
    liveRates = data.rates;
    const currency = $('currency').value;
    $('exchangeRate').value = Number(liveRates[currency] || rates[currency]).toFixed(currency === 'JPY' ? 4 : 3);
    const updated = data.updated ? new Date(data.updated).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '今日';
    $('rateStatus').textContent = `ExchangeRate-API · ${updated} 更新`;
    calculate();
  } catch (error) {
    $('rateStatus').textContent = '暂用内置汇率 · 可手动修改';
    console.warn('Exchange rate update failed:', error);
  } finally {
    $('refreshRate').disabled = false;
  }
}

function showToast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 1800);
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(message);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    showToast(message);
  }
}

function summary() {
  const r = calculate();
  return [
    '服务器交易结算摘要',
    `续费：${symbols[$('currency').value]}${r.renewal.toFixed(2)} / ${state.periodDays} 天`,
    `有效期：${$('tradeDate').value} → ${$('expiryDate').value}（剩余 ${r.days.toFixed(1)} 天）`,
    `剩余价值：${money(r.baseValue)}`,
    `成交价格：${money(r.sellerPrice)}`,
    `溢价/折价：${money(r.premium)}（${r.premiumRatio.toFixed(1)}%）`,
    ...($('escrowEnabled').checked ? [`中介服务费：${r.escrowRate.toFixed(1)}%（${money(r.escrowAmount)}）`] : []),
    `买家最终支出：${money(r.buyerTotal)}`,
    `卖家实际到账：${money(r.sellerNet)}`,
    '— Worth 服务器剩余价值计算器'
  ].join('\n');
}

function shareUrl() {
  const params = new URLSearchParams();
  fields.forEach((id) => {
    const element = $(id);
    params.set(id, element.type === 'checkbox' ? (element.checked ? '1' : '0') : element.value);
  });
  params.set('period', state.periodDays);
  params.set('mode', state.priceMode);
  return `${location.origin}${location.pathname}?${params}`;
}

function restoreFromUrl() {
  const params = new URLSearchParams(location.search);
  if (!params.size) return;
  if (params.has('preciseTime')) {
    $('preciseTime').checked = params.get('preciseTime') === '1';
    togglePrecision();
  }
  fields.forEach((id) => {
    if (!params.has(id)) return;
    const element = $(id);
    if (element.type === 'checkbox') element.checked = params.get(id) === '1';
    else element.value = params.get(id);
  });
  const period = params.get('period');
  const periodButton = document.querySelector(`#periodOptions button[data-days="${period}"]`);
  if (periodButton) selectPeriod(periodButton);
  const mode = params.get('mode');
  const modeButton = document.querySelector(`#priceMode button[data-mode="${mode}"]`);
  if (modeButton) selectMode(modeButton);
}

fields.forEach((id) => $(id).addEventListener('input', () => {
  if (id === 'currency') {
    $('exchangeRate').value = liveRates[$('currency').value] || rates[$('currency').value];
    $('currencySymbol').textContent = symbols[$('currency').value];
  }
  if (id === 'preciseTime') togglePrecision();
  if (id === 'escrowEnabled') $('escrowOptions').classList.toggle('is-hidden', !$('escrowEnabled').checked);
  calculate();
}));

document.querySelectorAll('#periodOptions button').forEach((button) => button.addEventListener('click', () => selectPeriod(button)));
document.querySelectorAll('#priceMode button').forEach((button) => button.addEventListener('click', () => selectMode(button)));
$('copyButton').addEventListener('click', () => copyText(summary(), '结算摘要已复制'));
$('shareButton').addEventListener('click', () => copyText(shareUrl(), '分享链接已复制'));
$('refreshRate').addEventListener('click', refreshRates);
$('themeMode').addEventListener('change', (event) => applyTheme(event.target.value));
$('resetButton').addEventListener('click', () => {
  $('calculator').reset();
  $('renewalAmount').value = '0';
  $('exchangeRate').value = '0';
  $('priceInput').value = '0';
  $('pushFee').value = '0';
  $('escrowRate').value = '0';
  togglePrecision();
  setResetDates();
  selectPeriod(document.querySelector('#periodOptions button[data-days="365"]'));
  state.priceMode = 'seller';
  document.querySelectorAll('#priceMode button').forEach((button) => button.classList.toggle('active', button.dataset.mode === 'seller'));
  $('priceLabel').textContent = '实付卖家';
  $('currencySymbol').textContent = '$';
  $('escrowOptions').classList.add('is-hidden');
  history.replaceState(null, '', location.pathname);
  calculate();
  showToast('已全部清零');
});

setDefaultDates();
applyTheme(savedTheme());
const themeMedia = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
const syncSystemTheme = () => { if ($('themeMode').value === 'system') applyTheme('system'); };
if (themeMedia) {
  if (themeMedia.addEventListener) themeMedia.addEventListener('change', syncSystemTheme);
  else themeMedia.addListener(syncSystemTheme);
}
restoreFromUrl();
togglePrecision();
$('escrowOptions').classList.toggle('is-hidden', !$('escrowEnabled').checked);
calculate();
refreshRates();
