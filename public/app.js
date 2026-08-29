const fallbackRates = { USD: 6.74, CNY: 1, EUR: 7.86, GBP: 9.1, JPY: .045, KRW: .0049, AUD: 4.43, CAD: 4.86, SGD: 5.24, HKD: .86 };
const currencySymbols = { USD: '$', CNY: '¥', EUR: '€', GBP: '£', JPY: '¥', KRW: '₩', AUD: 'A$', CAD: 'C$', SGD: 'S$', HKD: 'HK$' };
let rates = { ...fallbackRates };
let lastResult = null;
let toastTimer;

const $ = (id) => document.getElementById(id);
const localDate = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const amount = (value) => Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function applyTheme(mode) {
  if (mode === 'light' || mode === 'dark') document.documentElement.dataset.theme = mode;
  else delete document.documentElement.dataset.theme;
  const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme:dark)').matches);
  document.querySelector('meta[name="theme-color"]').content = dark ? '#0c1017' : '#f6f8fb';
  $('themeMode').value = mode;
  try { localStorage.setItem('worth-theme', mode); } catch {}
}

function savedTheme() {
  try { return localStorage.getItem('worth-theme') || 'system'; } catch { return 'system'; }
}

function setDates() {
  const today = new Date();
  const expiry = new Date(today);
  expiry.setMonth(expiry.getMonth() + 1);
  $('transactionDate').value = localDate(today);
  $('expirationDate').value = localDate(expiry);
  $('expirationDate').min = localDate(today);
}

function validate() {
  const renewal = Number.parseFloat($('renewalPrice').value);
  const transaction = $('transactionDate').value;
  const expiration = $('expirationDate').value;
  let message = '';
  if (!Number.isFinite(renewal) || renewal <= 0) message = '请输入大于 0 的续费金额';
  else if (renewal >= 100000000) message = '续费金额需小于 1 亿元';
  else if (!expiration) message = '请选择到期日期';
  else if (!transaction) message = '请选择交易日期';
  else if (transaction > expiration) message = '交易日期不能晚于到期日期';
  $('formError').textContent = message;
  return !message;
}

function calculate() {
  if (!validate()) return false;
  const renewal = Number.parseFloat($('renewalPrice').value);
  const currency = $('currency').value;
  const rate = Number(rates[currency] || fallbackRates[currency]);
  const cycleDays = Number($('paymentCycle').value);
  const transaction = new Date(`${$('transactionDate').value}T00:00:00`);
  const expiration = new Date(`${$('expirationDate').value}T00:00:00`);
  const remainingDays = Math.max(0, Math.ceil((expiration - transaction) / 86400000));
  const totalValue = renewal * rate;
  const remainingValue = totalValue * remainingDays / cycleDays;
  const symbol = currencySymbols[currency];

  lastResult = { renewal, currency, rate, cycleDays, remainingDays, totalValue, remainingValue, transaction: $('transactionDate').value, expiration: $('expirationDate').value };
  $('resultTransaction').textContent = lastResult.transaction;
  $('resultExpiration').textContent = lastResult.expiration;
  $('remainingValue').textContent = amount(remainingValue);
  $('totalValue').textContent = amount(totalValue);
  $('remainingDays').textContent = `${remainingDays} 天`;
  $('renewalSummary').textContent = `${symbol}${amount(renewal)} ${currency}`;
  $('rateSummary').textContent = rate.toFixed(currency === 'JPY' || currency === 'KRW' ? 4 : 2);
  $('emptyResult').hidden = true;
  $('resultContent').hidden = false;
  return true;
}

function markdown() {
  const r = lastResult;
  return [
    '## VPS 剩余价值计算结果',
    '',
    `- 交易日期：${r.transaction}`,
    `- 到期日期：${r.expiration}`,
    `- 剩余天数：${r.remainingDays} 天`,
    `- 续费金额：${currencySymbols[r.currency]}${amount(r.renewal)} ${r.currency}`,
    `- 兑人民币汇率：${r.rate}`,
    `- 总价值：¥${amount(r.totalValue)}`,
    `- **剩余价值：¥${amount(r.remainingValue)}**`,
    '',
    '> 由 Worth VPS 剩余价值计算器生成'
  ].join('\n');
}

async function copyResult() {
  try { await navigator.clipboard.writeText(markdown()); }
  catch {
    const area = document.createElement('textarea');
    area.value = markdown();
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  showToast('Markdown 结果已复制');
}

function showToast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 1800);
}

async function loadRates() {
  try {
    const response = await fetch('/api/rates', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(String(response.status));
    const payload = await response.json();
    rates = { ...rates, ...payload.rates };
  } catch (error) { console.warn('Using fallback exchange rates:', error); }
  $('rateBadge').textContent = `1 USD = ${Number(rates.USD).toFixed(2)} CNY`;
  if ($('autoCalculate').checked && $('renewalPrice').value) calculate();
}

$('valueForm').addEventListener('submit', (event) => { event.preventDefault(); calculate(); });
['renewalPrice', 'currency', 'paymentCycle', 'expirationDate', 'transactionDate'].forEach((id) => {
  $(id).addEventListener('input', () => { if ($('autoCalculate').checked && $('renewalPrice').value) calculate(); });
});
$('expirationDate').addEventListener('change', () => { $('transactionDate').max = $('expirationDate').value; });
$('copyResult').addEventListener('click', copyResult);
$('themeMode').addEventListener('change', (event) => applyTheme(event.target.value));
const colorScheme = matchMedia('(prefers-color-scheme:dark)');
const syncTheme = () => { if ($('themeMode').value === 'system') applyTheme('system'); };
if (colorScheme.addEventListener) colorScheme.addEventListener('change', syncTheme); else colorScheme.addListener(syncTheme);

setDates();
$('transactionDate').max = $('expirationDate').value;
applyTheme(savedTheme());
loadRates();
