INKDate.parseTimeDiff = (timeDiffs) => {
  const matches = timeDiffs.match(/(\d+)\s*(day|month|year)/gi);
  let totalDays = 0;
  matches.forEach((timeDiff) => {
    let [, value, type] = timeDiff.match(/(\d+)\s*(day|month|year)/i);
    value = Number(value);
    switch(type) {
      case 'day': return totalDays += value;
      case 'month': return totalDays += value * INKDate.typicalDaysInAMonth;
      case 'year': return totalDays += value * INKDate.typicalDaysInAYear;
    }
  });

  return totalDays;
}
