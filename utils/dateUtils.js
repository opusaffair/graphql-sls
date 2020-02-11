var { DateTime } = require("luxon");

async function renderFormattedDateRange(
  startNEO4J,
  endNEO4J,
  timeZone,
  withYear = true,
  longMonth = false,
  showTime = true
) {
  let start = DateTime.fromISO(startNEO4J.slice(0, 16), {
    zone: timeZone
  });

  console.log(startNEO4J);
  let end = DateTime.fromISO(endNEO4J.slice(0, 16), {
    zone: timeZone
  });
  let startFormat = { day: "numeric" };
  let endFormat = { day: "numeric" };
  let monthFormat = longMonth ? "long" : "short";
  let formattedDateRange;
  if (start.year != end.year) {
    startFormat.month = endFormat.month = monthFormat;
    if (withYear) startFormat.year = endFormat.year = "numeric";
    formattedDateRange = `${start.toLocaleString(
      startFormat
    )}—${end.toLocaleString(endFormat)}`;
  } else if (start.month != end.month) {
    startFormat.month = endFormat.month = monthFormat;
    if (withYear) endFormat.year = "numeric";
    formattedDateRange = `${start.toLocaleString(
      startFormat
    )}—${end.toLocaleString(endFormat)}`;
  } else if (start.day != end.day) {
    startFormat.month = monthFormat;
    endFormat.month = "short";
    if (withYear) endFormat.year = "numeric";
    formattedDateRange = `${start.toLocaleString(
      startFormat
    )}—${end.toLocaleString(endFormat).slice(4)}`;
  } else {
    if (withYear) startFormat.year = "numeric";
    startFormat.month = monthFormat;
    if (showTime) {
      startFormat.hour = "numeric";
      startFormat.minute = "numeric";
    }
    formattedDateRange = `${start.toLocaleString(startFormat)}`;
  }
  return formattedDateRange;
}

module.exports = { renderFormattedDateRange };
