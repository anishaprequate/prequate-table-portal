// Dates written the same way on the server and in every browser. Safari and Node
// do not agree on how Intl writes a time ("7:10 am" or "7:10 AM", "at" or a
// comma), and a client component that shows a date is drawn on the server first.
// When the two differ, the page logs a mismatch error. These use fixed names and
// the local clock, so they cannot differ.
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const clockTime = (d: Date) => {
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
};

// Thu, 15 Oct, 6:10 am
export const shortSlot = (d: Date) => `${DAYS[d.getDay()].slice(0, 3)}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}, ${clockTime(d)}`;

// Thu, 15 Oct
export const shortDay = (d: Date) => `${DAYS[d.getDay()].slice(0, 3)}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;

// Thursday, 15 October
export const longDay = (d: Date) => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

// 15 October 2026
export const longDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
