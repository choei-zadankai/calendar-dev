// 📌 デバッグモード
const DEBUG_MODE = true; // 本番公開時は false に
if (DEBUG_MODE) console.log('script.js ロード完了☑');

// 📌 DOM 要素取得
const calendarGrid = document.querySelector('.calendar-grid');
const headerMonth = document.querySelector('.calendar-header span');
const prevBtn = document.querySelector('.calendar-header button:first-child');
const nextBtn = document.querySelector('.calendar-header button:last-child');
const modal = document.getElementById('event-modal');
const modalTitle = document.getElementById('modal-title');
const modalDetail = document.getElementById('modal-detail');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalClose = document.getElementById('modal-close');
const monthTitle = document.getElementById('calendar-month-title');
const categorySelect = document.getElementById('category-mode');

// 📌 状態変数
let currentDate = new Date();
let events = [];
let holidays = [];
let activeCategories = [];

// 📌 初期化処理
window.addEventListener('DOMContentLoaded', () => {
  if (DEBUG_MODE) console.log('DOMContentLoaded:☑');
  holidays = getDynamicHolidays(currentDate.getFullYear());

  // JSONファイル2つを読み込み
  Promise.all([
    fetch('events.json?v=1.0.1').then(res => res.json()),
    fetch('events-temporary.json?v=1.0.1').then(res => res.json())
  ])
  .then(([anniversaries, temporaries]) => {
    events = [...anniversaries, ...temporaries];
    if (DEBUG_MODE) console.log('読み込み成功 ✅:', events);
    activeCategories = [];
    renderCalendar();
  })
  .catch(err => {
    if (DEBUG_MODE) console.error('イベント読み込みエラー ✖:', err);
  });
});

// 📌 カテゴリ選択切替
categorySelect.addEventListener('change', () => {
  const mode = categorySelect.value;
  if (DEBUG_MODE) console.log('カテゴリ選択:', mode);
  switch (mode) {
    case 'none': activeCategories = []; break;
    case 'anniversary': activeCategories = ['anniversary']; break;
    case 'active': activeCategories = ['zadankai', 'meeting', 'event', 'support', 'campaign']; break;
    case 'all': activeCategories = ['anniversary', 'birthday', 'memorial', 'visiting', 'group', 'holiday', 'zadankai', 'meeting', 'event', 'support', 'campaign']; break;
  }
  renderCalendar();
});

// 📌 カレンダー描画
function renderCalendar(searchTerm = '', mode = 'title') {
  calendarGrid.innerHTML = '';
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  headerMonth.textContent = `${year}年 ${month + 1}月`;
  if (monthTitle) monthTitle.textContent = `${year}年 ${month + 1}月`;

  // 曜日ヘッダー
  ['日', '月', '火', '水', '木', '金', '土'].forEach(day => {
    const div = document.createElement('div');
    div.className = 'day-name';
    div.textContent = day;
    calendarGrid.appendChild(div);
  });

  // 空白セル
  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'day-cell';
    calendarGrid.appendChild(blank);
  }

  // 日付セル
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    const number = document.createElement('span');
    number.className = 'day-number';
    number.textContent = day;
    cell.appendChild(number);

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
      cell.classList.add('today');
    }

    // イベント取得
    let eventList;
    try {
      eventList = events.filter(ev => {
        const target = mode === 'category' ? ev.category.toLowerCase() : ev.title.toLowerCase();
        const inCat = activeCategories.length === 0 ? false : activeCategories.includes(ev.category);
        const inDate = inRange(ev, year, month, day);
        const match = target.includes(searchTerm);
        if (DEBUG_MODE) console.log('🔍 チェック:', { title: ev.title, inCat, inDate, match });
        return inDate && match && inCat;
      });
    } catch (e) {
      if (DEBUG_MODE) console.error('イベント処理中にエラー:', e);
      return;
    }

    eventList.forEach(ev => {
      const e = document.createElement('div');
      e.textContent = ev.title;
      e.className = `event category-${ev.category}`;
      e.onclick = () => {
        modalTitle.textContent = ev.title;
        modalDetail.textContent = ev.detail || '詳細情報はありません';
        modal.style.display = 'block';
        modalBackdrop.style.display = 'block';
      };
      cell.appendChild(e);
    });

    calendarGrid.appendChild(cell);
  }
}

// 📌 inRange（日付一致チェック）
function inRange(event, y, m, d) {
  const target = new Date(y, m, d);
  let start, end;
  try {
    if (event.everyYear && typeof event.date === 'string') {
      const [mm, dd] = event.date.split('-').map(Number);
      start = new Date(y, mm - 1, dd);
      end = new Date(start);
    } else if (event.date) {
      const [yyyy, mm, dd] = event.date.split('-').map(Number);
      start = new Date(yyyy, mm - 1, dd);
      end = new Date(start);
    } else {
      start = new Date(event.start);
      end = event.end ? new Date(event.end) : new Date(start);
    }
    return target >= start && target <= end;
  } catch (e) {
    if (DEBUG_MODE) console.error('inRange error:', e, event);
    return false;
  }
}

// 📌 六曜取得（暦）
function getRokuyo(date) {
  const rokuyo = ['先勝', '友引', '先負', '仏滅', '大安', '赤口'];
  const baseDate = new Date(1900, 0, 1);
  const diff = Math.floor((date - baseDate) / 86400000);
  return rokuyo[diff % 6];
}

// 📌 祝日計算（動的）
function getDynamicHolidays(year) {
  const holidays = [];

  function nthWeekday(n, weekday, month) {
    const first = new Date(year, month, 1);
    const offset = (7 + weekday - first.getDay()) % 7;
    return new Date(year, month, 1 + offset + (n - 1) * 7);
  }

  function formatDate(dateObj) {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  }

  function calcShunbun(year) {
    return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  }

  function calcShubun(year) {
    return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  }

  holidays.push({ date: `${year}-01-01`, name: "元日" });
  holidays.push({ date: formatDate(nthWeekday(2, 1, 0)), name: "成人の日" });
  holidays.push({ date: `${year}-02-11`, name: "建国記念の日" });
  if (year >= 2020) holidays.push({ date: `${year}-02-23`, name: "天皇誕生日" });
  holidays.push({ date: `${year}-03-${calcShunbun(year)}`, name: "春分の日" });
  holidays.push({ date: `${year}-04-29`, name: "昭和の日" });
  holidays.push({ date: `${year}-05-03`, name: "憲法記念日" });
  holidays.push({ date: `${year}-05-04`, name: "みどりの日" });
  holidays.push({ date: `${year}-05-05`, name: "こどもの日" });
  holidays.push({ date: formatDate(nthWeekday(3, 1, 6)), name: "海の日" });
  holidays.push({ date: formatDate(nthWeekday(3, 1, 8)), name: "敬老の日" });
  holidays.push({ date: `${year}-09-${calcShubun(year)}`, name: "秋分の日" });
  holidays.push({ date: formatDate(nthWeekday(2, 1, 9)), name: "スポーツの日" });
  holidays.push({ date: `${year}-11-03`, name: "文化の日" });
  holidays.push({ date: `${year}-11-23`, name: "勤労感謝の日" });

  // 振替休日
  const addedDates = new Set(holidays.map(h => h.date));
  holidays.forEach(h => {
    const holidayDate = new Date(h.date);
    if (holidayDate.getDay() === 0) {
      let subDate = new Date(holidayDate);
      do {
        subDate.setDate(subDate.getDate() + 1);
      } while (addedDates.has(formatDate(subDate)));
      holidays.push({ date: formatDate(subDate), name: "振替休日" });
      addedDates.add(formatDate(subDate));
    }
  });

  // 国民の休日
  holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
  for (let i = 1; i < holidays.length - 1; i++) {
    const prev = new Date(holidays[i - 1].date);
    const next = new Date(holidays[i + 1].date);
    const between = new Date(prev);
    between.setDate(prev.getDate() + 1);
    const betweenStr = formatDate(between);
    if (
      betweenStr === holidays[i].date &&
      (next - between) / 86400000 === 1 &&
      !addedDates.has(betweenStr)
    ) {
      holidays.push({ date: betweenStr, name: "国民の休日" });
      addedDates.add(betweenStr);
    }
  }

  return holidays;
}

// 📌 前月・次月ボタン
prevBtn.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  holidays = getDynamicHolidays(currentDate.getFullYear());
  renderCalendar();
};
nextBtn.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  holidays = getDynamicHolidays(currentDate.getFullYear());
  renderCalendar();
};

// 📌 モーダル操作
modalClose.onclick = () => {
  modal.style.display = 'none';
  modalBackdrop.style.display = 'none';
};
modalBackdrop.onclick = modalClose;

// 📌 ServiceWorker 登録
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('index-service-worker.js')
    .then(() => DEBUG_MODE && console.log('✅ Service Worker registered'))
    .catch(err => DEBUG_MODE && console.error('❌ Service Worker registration failed:', err));
}
