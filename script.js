const calendarGrid = document.querySelector('.calendar-grid');
const headerMonth = document.querySelector('.calendar-header span');
const prevBtn = document.querySelector('.calendar-header button:first-child');
const nextBtn = document.querySelector('.calendar-header button:last-child');
const searchInput = document.getElementById('search-input');
const searchMode = document.getElementById('search-mode');
const clearBtn = document.getElementById('clear-btn');
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

document.addEventListener('DOMContentLoaded', () => {
  holidays = getDynamicHolidays(currentDate.getFullYear());

  fetch('events.json')
    .then(res => res.json())
    .then(eventData => {
      events = eventData;
      console.log('イベント配列 =',events);
      activeCategories = [
        'anniversary', 'birthday', 'memorial', 'visiting', 'formation',
        'holiday', 'zadankai', 'meeting', 'event', 'support', 'campaign'
      ];
      renderCalendar();
    });

  categorySelect.addEventListener('change', () => {
    const mode = categorySelect.value;
    if (mode === 'anniversary') {
      activeCategories = ['anniversary'];
    } else if (mode === 'active') {
      activeCategories = ['zadankai', 'meeting', 'event', 'support', 'campaign'];
    } else {
      activeCategories = [
        'anniversary', 'birthday', 'memorial', 'visiting', 'formation',
        'holiday', 'zadankai', 'meeting', 'event', 'support', 'campaign'
      ];
    }
    renderCalendar(searchInput.value.trim().toLowerCase(), searchMode.value);
  });
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

  if (event.everyYear && typeof event.date === 'string' && event.date.length === 5) {
    const [mm, dd] = event.date.split('-').map(Number);
    start = new Date(y, mm - 1, dd);
    end = new Date(start);
  } else {
    start = event.start ? new Date(event.start) : new Date(event.date);
    end = event.end ? new Date(event.end) : new Date(start);
  }

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.warn('Invalid start/end:', event.title, event.date);
    return false;
  }

  end.setDate(end.getDate() - 1);
  return target >= start && target <= end;
}
  

function renderCalendar(searchTerm = '', mode = 'title') {
  calendarGrid.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

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

    console.log(
  '----',
  '日付:', year, month + 1, day,
  'inRangeで通ったイベント:', events.filter(ev => inRange(ev, year, month, day)).map(ev => ev.title)
);

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

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
    const inCat = activeCategories.includes(ev.category);
    const inDate = inRange(ev, year, month, day);
    const match = target.includes(searchTerm);

    if (inCat && inDate && match) {
      console.log('表示対象イベント:', ev.title);
    }

    return inCat && inDate && match;
  });
} catch (e) {
  console.error('イベント処理中にエラー:', e);
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

    if (eventList.length > 0 && searchTerm) {
      cell.classList.add('highlight');
    }

    calendarGrid.appendChild(cell);
  }
}

prevBtn.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  holidays = getDynamicHolidays(currentDate.getFullYear());
  renderCalendar(searchInput.value.trim().toLowerCase(), searchMode.value);
};

nextBtn.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  holidays = getDynamicHolidays(currentDate.getFullYear());
  renderCalendar(searchInput.value.trim().toLowerCase(), searchMode.value);
};

modalClose.onclick = () => {
  modal.style.display = 'none';
  modalBackdrop.style.display = 'none';
};

modalBackdrop.onclick = modalClose;
