const DEBUG_MODE = true;  //完成したら「false」にする
if(DEBUG_MODE){
console.log('script.js ロード完了☑');
}

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

let currentDate = new Date();
let events = [];
let holidays = [];
let activeCategories = [];
let scrollY = 0;

document.addEventListener('DOMContentLoaded', () => {
  if (DEBUG_MODE) {
    console.log('DOMContentLoaded:☑');
  }

  holidays = getDynamicHolidays(currentDate.getFullYear());

  Promise.all([
    fetch('events.json?v=1.0.1').then(res => res.json()),
    fetch('events-temporary.json?v=1.0.1').then(res => res.json())
  ])
  .then(([anniversaries, temporaries]) => {
    events = [...anniversaries, ...temporaries];

    if (DEBUG_MODE) {
      console.log('events.json ☑ + temporary ☑ 読み込み成功:', events);
    }

    activeCategories = [];
    renderCalendar();
  })
  .catch(err => {
    if (DEBUG_MODE) {
      console.error('イベント読み込み ✖:', err);
    }
  });
});
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) {
  searchBtn.onclick = () => {
    alert('準備中');
    renderCalendar();
  };
}

 categorySelect.addEventListener('change', () => {
  const mode = categorySelect.value;
  if (DEBUG_MODE) console.log('カテゴリ選択:', mode);

  switch (mode) {
    case 'none':
      activeCategories = [];
      break;
    case 'anniversary':
      activeCategories = ['anniversary'];
      break;
    case 'active':
      activeCategories = ['zadankai', 'meeting', 'event', 'support', 'campaign'];
      break;
    case 'all':
      activeCategories = ['anniversary', 'birthday', 'memorial', 'visiting', 'group',
        'holiday', 'zadankai', 'meeting', 'event', 'support', 'campaign'];
      break;
  }

  renderCalendar();
});
  

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

function getRokuyo(date) {
  const rokuyo = ['先勝', '友引', '先負', '仏滅', '大安', '赤口'];
  const baseDate = new Date(1900, 0, 1);
  const diff = Math.floor((date - baseDate) / 86400000);
  return rokuyo[diff % 6];
}

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

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      if (DEBUG_MODE) {
        console.warn('⚠️ Invalid Date in event:', event.title, event.date || event.start);
      }
      return false;
    }

    return target >= start && target <= end;
  } catch (e) {
    if (DEBUG_MODE) {
      console.error('inRange error:', e, event);
    }
    return false;
  }
}
  

function renderCalendar(searchTerm = '', mode = 'title') {
  calendarGrid.innerHTML = '';
  if (DEBUG_MODE) {
  console.log('現在のカテゴリ設定:', activeCategories);
}

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const monthText = `${year}年 ${month + 1}月`;
  headerMonth.textContent = monthText;
  if (monthTitle) monthTitle.textContent = monthText;

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  dayNames.forEach(day => {
    const div = document.createElement('div');
    div.className = 'day-name';
    div.textContent = day;
    calendarGrid.appendChild(div);
  });

  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'day-cell';
    calendarGrid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';

    const number = document.createElement('span');
    number.className = 'day-number';
    number.textContent = day;
    cell.appendChild(number);

     if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
    cell.classList.add('today');
  }


 if(DEBUG_MODE){
    console.log( '----','日付:', year, month + 1, day,
                'inRangeで通ったイベント:', events.filter(ev => inRange(ev, year, month, day)).map(ev => ev.title)
      );
 }

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  if (activeCategories.length > 0) {
  cell.onclick = () => {
    const thisDate = new Date(year, month, day);
    const dateStr = `${year}年${month + 1}月${day}日 (${['日','月','火','水','木','金','土'][thisDate.getDay()]})`;
    modalTitle.textContent = dateStr;

    const todaysEvents = events.filter(ev => {
      return activeCategories.includes(ev.category) && inRange(ev, year, month, day);
    });

    if (todaysEvents.length === 0) {
      modalDetail.innerHTML = '<p>この日に表示するイベントはありません</p>';
    } else {
      modalDetail.innerHTML = todaysEvents.map(ev => `
     <div class="modal-item">
   　 <strong class="modal-item-title">${ev.title}</strong>
   　 <div class="modal-item-detail">${ev.detail || '詳細なし'}</div>
  　  <span class="modal-category-label category-${ev.category}">
     　　 ${getCategoryLabel(ev.category)}
   　 </span>
　 　 </div>
      `).join('');
    }

    openModal();
  };
}

    const rokuyoLabel = document.createElement('div');
    rokuyoLabel.textContent = getRokuyo(new Date(year, month, day));
    rokuyoLabel.style.fontSize = '0.8rem';
    rokuyoLabel.style.color = '#999';
    cell.appendChild(rokuyoLabel);

    const holiday = holidays.find(h => h.date === dateStr);
    if (holiday) {
      const holidayLabel = document.createElement('div');
      holidayLabel.textContent = holiday.name;
      holidayLabel.className = 'holiday-label';
      if (holiday.name === '振替休日') holidayLabel.classList.add('holiday-substitute');
      else if (holiday.name === '国民の休日') holidayLabel.classList.add('holiday-citizens');
      else holidayLabel.classList.add('holiday-normal');
      cell.appendChild(holidayLabel);
    }

let eventList;
try {
  eventList = events.filter(ev => {
  const target = mode === 'category' ? ev.category.toLowerCase() : ev.title.toLowerCase();
  const inCat = activeCategories.length === 0 ? false : activeCategories.includes(ev.category);
  const inDate = inRange(ev, year, month, day);
  const match = target.includes(searchTerm);

  if (DEBUG_MODE) {
    console.log('🔍 チェック中: ', {
      title: ev.title,
      date: ev.date,
      inCat,
      inDate,
      match
    });
  }

  return inDate && match && inCat;
});
} catch (e) {
  if(DEBUG_MODE){
  console.error('イベント処理中にエラー✖:', e);
  } else {
    alert('何らかのエラーが発生しました。ページを再読み込みしてください');
  }
}

    eventList.forEach(ev => {
      const e = document.createElement('div');
      e.textContent = ev.title;
      e.className = `event category-${ev.category}`;
      e.onclick = () => {
        modalTitle.textContent = ev.title;
        modalDetail.textContent = ev.detail || '詳細情報はありません';
        openModal();
      };
      cell.appendChild(e);
    });

    if (eventList.length > 0 && searchTerm) {
      cell.classList.add('highlight');
    }

    calendarGrid.appendChild(cell);
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('index-service-worker.js')
    .then(() => {
      if (DEBUG_MODE) console.log('✅ Service Worker registered');
    })
    .catch(err => {
      if (DEBUG_MODE) console.error('❌ Service Worker registration failed:', err);
    });
}

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

function getCategoryLabel(cat) {
  const labels = {
    anniversary: '重要な記念日',
    birthday: '誕生日',
    memorial: '命日',
    visiting: '訪問日',
    group: '結成日',
    holiday: '記念日',
    zadankai: '座談会',
    meeting: '協議会',
    event: 'イベント',
    support: '支援週間',
    campaign: 'その他週間'
  };
  return labels[cat] || cat;
}

async function forceDeleteCache() {
  const keys = await caches.keys();
  console.log('[DEBUG] キャッシュ一覧:', keys);

  await Promise.all(keys.map(async key => {
    const result = await caches.delete(key);
    console.log(`削除対象: ${key} → ${result ? '✅成功' : '❌失敗'}`);
  }));

  alert('すべてのキャッシュを削除しました（強制モード）');
}
 
async function forceDeleteCacheAndSW() {
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map(reg => reg.unregister()));
  alert('キャッシュとService Worker削除完了！リロードします');
  location.reload();
}

window.addEventListener('load', () => {
  const modalCloseBtn = document.getElementById('modal-close');
  const modalBackdrop = document.getElementById('modal-backdrop');

  console.log('[DEBUG] modal-close =', modalCloseBtn); // ← これで取れてるか確認！

  if (modalCloseBtn && modalBackdrop) {
    modalCloseBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);
    console.log('[DEBUG] イベント閉じる登録成功 ✅');
  } else {
    console.warn('[DEBUG] modal-close または modal-backdrop が見つからない ❌');
  }

window.addEventListener('load', () => {
  const modalClose = document.getElementById('modal-close');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const clearBtn = document.getElementById('clear-cache-btn');
  const confirmModal = document.getElementById('confirm-modal'); // ← 修正済み
  const yesBtn = document.getElementById('confirm-yes');
  const noBtn = document.getElementById('confirm-no');

  // 🔘 イベントモーダル閉じる処理
  if (modalClose && modalBackdrop) {
    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);
    console.log('[DEBUG] イベントモーダル: 閉じる登録 ✅');
  } else {
    console.warn('[DEBUG] イベントモーダル: 要素が見つかりません ❌');
  }

  // 🔘 キャッシュクリア確認モーダル処理
  if (clearBtn && confirmModal && yesBtn && noBtn) {
    clearBtn.addEventListener('click', () => {
      console.log('[DEBUG] キャッシュクリアボタン押された');
      confirmModal.style.display = 'block';
      document.body.classList.add('modal-open');
    });

    yesBtn.addEventListener('click', async () => {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
        alert('キャッシュを削除しました。ページをリロードします');
        location.reload();
      }
    });

    noBtn.addEventListener('click', () => {
      confirmModal.style.display = 'none';
      document.body.classList.remove('modal-open');
    });
  } else {
    console.warn('[DEBUG] キャッシュ確認モーダル: 要素不足 ❌');
  }
});

});

