INKDate.prototype.daysInTheMonth = function(options) {
  options = options || {};
  let { month, year } = options;
  if(typeof year !== 'number') year = this.Year;
  if(typeof month !== 'number') month = this.Month;
  const monthsInAYear = INKDate.months().length;
  while(month < 0) {
    year--;
    month += monthsInAYear;
  }

  while(month >= monthsInAYear) {
    year++;
    month -= monthsInAYear;
  }

  const isLeapYear = year % 4 === 0;
  const monthObj = INKDate.months()[month];
  if(!isLeapYear) return monthObj.Days;
  if(monthObj.LeapYearDays !== undefined) return monthObj.LeapYearDays;
  return monthObj.Days;
}
