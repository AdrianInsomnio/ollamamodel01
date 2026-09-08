/** Return UTC instants delimiting today in an IANA timezone. */
const getDayBounds = (timezone = 'America/Montevideo') => {
  const now = new Date();
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).map((part) => [part.type, part.value]));
  const utcForLocalDate = (year, month, day) => {
    const localDateAsUtc = Date.UTC(year, month - 1, day);
    const localParts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(localDateAsUtc)).map((part) => [part.type, part.value]));
    const representedUtc = Date.UTC(Number(localParts.year), Number(localParts.month) - 1,
      Number(localParts.day), Number(localParts.hour), Number(localParts.minute), Number(localParts.second));
    return new Date(localDateAsUtc - (representedUtc - localDateAsUtc));
  };
  const year = Number(parts.year), month = Number(parts.month), day = Number(parts.day);
  const startOfDay = utcForLocalDate(year, month, day);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  const endOfDay = utcForLocalDate(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate());
  return { startOfDay, endOfDay };
};
const getClinicDayBounds = (clinic) => getDayBounds(clinic?.timezone || 'America/Montevideo');
module.exports = { getDayBounds, getClinicDayBounds };
