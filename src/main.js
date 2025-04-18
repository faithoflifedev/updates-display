import './style.css';
import Alpine from 'alpinejs';
import { Temporal } from 'temporal-polyfill';

Alpine.directive('time', (el, { expression }, { evaluateLater, effect }) => {
  let getValue = evaluateLater(expression);

  // This will ensure the directive reacts to changes in the value
  effect(_ => {
    getValue(value => {
      try {
        let time = value instanceof Temporal.PlainTime
          ? value
          : Temporal.PlainTime.from(value);

        // Update the text content of the element
        el.textContent = time.toLocaleString(undefined, { timeStyle: "short" });
      } catch (err) {
        console.warn(`x-time: Invalid time value`, value);
        el.textContent = 'Invalid Time';
      }
    });
  });
});

Alpine.directive('date', (el, { expression }, { evaluateLater, effect }) => {
  let getValue = evaluateLater(expression);

  // This will ensure the directive reacts to changes in the value
  effect(_ => {
    getValue(value => {
      try {
        let date = value instanceof Temporal.PlainDate
          ? value
          : Temporal.PlainDate.from(value);

        // Update the text content of the element
        el.textContent = date.toLocaleString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
      } catch (err) {
        console.warn(`x-date: Invalid date value`, value);
        el.textContent = 'Invalid Date';
      }
    });
  });
});

function toPlainTime(time12hr) {
  // Normalize input by making it uppercase and removing dots
  time12hr = time12hr.replace(/\./g, "").toUpperCase();

  // Extract hours, minutes, and AM/PM
  let match = time12hr.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/);
  if (!match) throw new Error("Invalid time format");

  let [_, hours, minutes, period] = match;
  hours = Number(hours);
  minutes = Number(minutes);

  // Convert to 24-hour format
  if (period === "PM" && hours < 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }

  // Create Temporal.PlainTime and return as a 24-hour string
  return new Temporal.PlainTime(hours, minutes);
}

async function fetchData(file) {
  const response = await fetch(`/data/${file}.json`);
  const json = await response.json();

  return json;
}

const data = await fetchData('2025');

Alpine.store('core', {
  salaats: data.salaat,
  jumuah: data.jumuah,
  currentTime: Temporal.Now.plainTimeISO(),
  targetTime: Temporal.Now.plainTimeISO(),
  currentDate: Temporal.Now.plainDateISO(),

  updateCurrentTime() {
    const now = Temporal.Now.plainTimeISO();
    this.currentTime = now;
    // console.log('now', now.toLocaleString());
  },

  updateCurrentDate() {
    this.currentDate = Temporal.Now.plainDateISO();
  },

  getSalaatTimes() {
    const salaats = this.salaats.at(this.currentDate.dayOfYear - 1);

    const events = [
      { prayer: 'Fajr', time: toPlainTime(salaats[1]), iqama: toPlainTime(salaats[2]), duration: null, shortest: false },
      { prayer: 'Dhuhr', time: toPlainTime(salaats[4]), iqama: toPlainTime(salaats[5]), duration: null, shortest: false },
      { prayer: 'Asr', time: toPlainTime(salaats[6]), iqama: toPlainTime(salaats[7]), duration: null, shortest: false },
      { prayer: 'Maghrib', time: toPlainTime(salaats[8]), iqama: toPlainTime(salaats[9]), duration: null, shortest: false },
      { prayer: 'Isha', time: toPlainTime(salaats[10]), iqama: toPlainTime(salaats[11]), duration: null, shortest: false },
    ].map(event => ({
      ...event,
      duration: this.currentTime.until(event.time, { smallestUnit: 'seconds' })
    }));

    const positive = events.filter(event => event.duration.total('seconds') > 0);
    const upcoming = Math.min(...positive.map(event => event.duration.total('seconds')));

    const complete = events.map(event => ({
      ...event,
      shortest: event.duration.total('seconds') === upcoming
    }));

    this.targetTime = complete.find(event => event.shortest === true).iqama;

    return complete;
  },

  getSunTimes() {
    const salaats = this.salaats.at(this.currentDate.dayOfYear - 1);

    return [
      { event: 'sunrise', time: toPlainTime(salaats[3]) },
      { event: 'sunset', time: toPlainTime(salaats[11]) },
    ];
  },

  getLocalTime() {
    return this.currentTime;
  },

  getLocalDate() {
    return Temporal.Now.plainDateISO();
  },

  getIslamicDate() {
    const islamicMonths = [
      "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
      "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
      "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
    ];

    const date = Temporal.Now.plainDateISO().withCalendar("islamic");
    const islamicMonthIndex = date.month - 1;

    return `${date.day} ${islamicMonths[islamicMonthIndex]} ${date.year} AH`;
  },

  getIqamaTime() {
    const diff = this.currentTime.until(this.targetTime);

    const hours = String(diff.hours).padStart(2, '0');
    const minutes = String(diff.minutes).padStart(2, '0');

    return `${hours}:${minutes}`;
  },

  getJumuahTimes() {
    const jumuah = this.jumuah;

    const events = [
      { prayer: 'First Prayer', time: toPlainTime(jumuah.first), duration: null, shortest: false },
      { prayer: 'Second Prayer', time: toPlainTime(jumuah.second), duration: null, shortest: false },
      { prayer: 'Third Prayer', time: toPlainTime(jumuah.third), duration: null, shortest: false },
    ].map(event => ({
      ...event,
      duration: this.currentTime.until(event.time, { smallestUnit: 'seconds' })
    }));

    const positive = events.filter(event => event.duration.total('seconds') > 0);
    const upcoming = Math.min(...positive.map(event => event.duration.total('seconds')));

    return events.map(event => ({
      ...event,
      shortest: event.duration.total('seconds') === upcoming
    }));

  }
});

async function ping(url, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      signal: controller.signal,
    });

    console.log('response', response);

    clearTimeout(timer);
    return response.ok; // If no error is thrown, assume it's reachable
  } catch (error) {
    console.warn('ping error:', error);
    return false;
  }
}

Alpine.store('iframe', {
  SLIDES_URL: 'https://docs.google.com/presentation/d/e/2PACX-1vTXnOGF_4143WvbDNBk17mu_YwGjBQA8ykB7DV-tbamYPv-Wh8YaUIuTupz0SImTzm9dAoFkdP_jxCW/pubembed?start=true&loop=true&delayms=2000',
  ALT_URL: 'alt.html',

  url: null,
  error: false,

  async init() {
    await this.updateUrl();
  },

  async updateUrl() {
    const isReachable = await ping(this.SLIDES_URL);
    console.log('reachable', isReachable);

    if (isReachable) {
      this.url = this.SLIDES_URL;
      this.error = false;
    } else {
      this.url = this.ALT_URL;
      this.error = true;
    }

    this.error = true;
  },

  getUrl() {
    return this.url;
  },

  getError() {
    return this.error;
  },
});

const SECOND = 1_000;
const MINUTE = 60_000;
const HOUR = 3_600_000;

setInterval(() => {
  Alpine.store('core').updateCurrentTime();
}, SECOND);

setInterval(() => {
  Alpine.store('core').updateCurrentDate();
}, HOUR);

setInterval(async () => {
  await Alpine.store('iframe').updateUrl();
}, MINUTE);


window.Alpine = Alpine;
Alpine.start();
