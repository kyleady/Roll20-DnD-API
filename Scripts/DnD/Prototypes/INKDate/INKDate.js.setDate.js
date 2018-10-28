INKDate.prototype.setDate = function({ year, month, day }) {
  this.Year = Number(year);
  this.Month = Number(month);
  this.Day = Number(day);
  this.normalizeDate();
}
