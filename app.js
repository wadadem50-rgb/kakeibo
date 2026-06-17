'use strict';

/* ===== カテゴリ初期値 ===== */
const DEFAULT_CATEGORIES = {
  expense: ['食費', '日用品', '交通', '住居', '光熱費', '通信', '娯楽', '医療', '衣服', '交際費'],
  income:  ['給与', '副収入', 'その他'],
};

/* ===== IndexedDB ===== */
const DB_NAME = 'kakeibo';
const DB_VERSION = 1;
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('entries')) {
        const s = d.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date', { unique: false });
      }
      if (!d.objectStoreNames.contains('categories')) {
        d.createObjectStore('categories', { keyPath: 'name' });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

function tx(store, mode) {
  return db.transaction(store, mode).objectStore(store);
}
function reqPromise(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function addEntry(entry) { return reqPromise(tx('entries', 'readwrite').add(entry)); }
async function deleteEntry(id) { return reqPromise(tx('entries', 'readwrite').delete(id)); }
async function getAllEntries() { return reqPromise(tx('entries', 'readonly').getAll()); }
async function addCustomCategory(name, type) {
  return reqPromise(tx('categories', 'readwrite').put({ name, type }));
}
async function getCustomCategories() { return reqPromise(tx('categories', 'readonly').getAll()); }

/* ===== 状態 ===== */
let currentType = 'expense';
let listMonth = new Date();   // 一覧の表示月
let sumMonth = new Date();    // サマリーの表示月

/* ===== ユーティリティ ===== */
const $ = (sel) => document.querySelector(sel);
const yen = (n) => '¥' + Math.round(n).toLocaleString('ja-JP');
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ym = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const monthLabel = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月`;

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 1600);
}

/* ===== カテゴリ表示 ===== */
async function refreshCategorySelect() {
  const custom = await getCustomCategories();
  const sel = $('#f-category');
  const list = [...DEFAULT_CATEGORIES[currentType]];
  custom.filter((c) => c.type === currentType).forEach((c) => {
    if (!list.includes(c.name)) list.push(c.name);
  });
  sel.innerHTML = list.map((c) => `<option value="${c}">${c}</option>`).join('');
}

/* ===== 入力フォーム ===== */
function initForm() {
  $('#f-date').value = ymd(new Date());

  $('#f-type').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    currentType = btn.dataset.type;
    document.querySelectorAll('#f-type .seg-btn').forEach((b) =>
      b.classList.toggle('active', b === btn));
    refreshCategorySelect();
  });

  $('#entry-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number($('#f-amount').value);
    if (!amount || amount <= 0) { toast('金額を入力してください'); return; }

    const newCat = $('#f-category-new').value.trim();
    const category = newCat || $('#f-category').value;
    if (!category) { toast('カテゴリを選んでください'); return; }

    const entry = {
      date: $('#f-date').value,
      amount,
      type: currentType,
      category,
      memo: $('#f-memo').value.trim(),
      createdAt: Date.now(),
    };
    await addEntry(entry);

    if (newCat) { await addCustomCategory(newCat, currentType); await refreshCategorySelect(); }

    // 入力欄リセット（日付・区分は維持＝連続入力しやすい）
    $('#f-amount').value = '';
    $('#f-memo').value = '';
    $('#f-category-new').value = '';
    $('#f-category').value = category;

    toast('記録しました');
  });
}

/* ===== 月フィルタ ===== */
function entriesOfMonth(entries, d) {
  const key = ym(d);
  return entries
    .filter((e) => e.date && e.date.slice(0, 7) === key)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
}

/* ===== 一覧 ===== */
async function renderList() {
  $('#list-month').textContent = monthLabel(listMonth);
  const all = await getAllEntries();
  const items = entriesOfMonth(all, listMonth);
  const c = $('#list-container');

  if (items.length === 0) { c.innerHTML = '<div class="empty">記録がありません</div>'; return; }

  const byDay = {};
  items.forEach((e) => { (byDay[e.date] = byDay[e.date] || []).push(e); });

  c.innerHTML = Object.keys(byDay).sort().reverse().map((day) => {
    const rows = byDay[day].map((e) => `
      <div class="item">
        <div class="grow">
          <div class="cat">${escapeHtml(e.category)}</div>
          ${e.memo ? `<div class="memo">${escapeHtml(e.memo)}</div>` : ''}
        </div>
        <div class="amount ${e.type}">${e.type === 'expense' ? '-' : '+'}${yen(e.amount)}</div>
        <button class="del" data-id="${e.id}" aria-label="削除">×</button>
      </div>`).join('');
    return `<div class="day-group"><div class="day-head">${dayLabel(day)}</div>${rows}</div>`;
  }).join('');

  c.querySelectorAll('.del').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('この記録を削除しますか？')) return;
    await deleteEntry(Number(b.dataset.id));
    await renderList();
    toast('削除しました');
  }));
}

function dayLabel(day) {
  const d = new Date(day + 'T00:00:00');
  const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}（${w}）`;
}

/* ===== サマリー ===== */
async function renderSummary() {
  $('#sum-month').textContent = monthLabel(sumMonth);
  const all = await getAllEntries();
  const items = entriesOfMonth(all, sumMonth);

  let income = 0, expense = 0;
  const byCat = {};
  items.forEach((e) => {
    if (e.type === 'income') income += e.amount;
    else { expense += e.amount; byCat[e.category] = (byCat[e.category] || 0) + e.amount; }
  });

  $('#sum-income').textContent = yen(income);
  $('#sum-expense').textContent = yen(expense);
  $('#sum-balance').textContent = yen(income - expense);

  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const max = cats.length ? cats[0][1] : 0;
  const bd = $('#sum-breakdown');
  bd.innerHTML = cats.length === 0
    ? '<div class="empty">支出の記録がありません</div>'
    : cats.map(([cat, amt]) => `
      <div class="bd-row">
        <div class="bd-cat">${escapeHtml(cat)}</div>
        <div class="bar-wrap"><div class="bar" style="width:${max ? (amt / max * 100) : 0}%"></div></div>
        <div class="bd-amt">${yen(amt)}</div>
      </div>`).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ===== 月切替 ===== */
function shiftMonth(d, delta) { return new Date(d.getFullYear(), d.getMonth() + delta, 1); }

/* ===== タブ切替 ===== */
function showView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  $(`#view-${name}`).classList.add('active');
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
  if (name === 'list') renderList();
  if (name === 'summary') renderSummary();
}

/* ===== 起動 ===== */
async function main() {
  await openDB();
  await refreshCategorySelect();
  initForm();

  document.querySelectorAll('.tab').forEach((t) =>
    t.addEventListener('click', () => showView(t.dataset.view)));

  $('#list-prev').addEventListener('click', () => { listMonth = shiftMonth(listMonth, -1); renderList(); });
  $('#list-next').addEventListener('click', () => { listMonth = shiftMonth(listMonth, 1); renderList(); });
  $('#sum-prev').addEventListener('click', () => { sumMonth = shiftMonth(sumMonth, -1); renderSummary(); });
  $('#sum-next').addEventListener('click', () => { sumMonth = shiftMonth(sumMonth, 1); renderSummary(); });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

main();
