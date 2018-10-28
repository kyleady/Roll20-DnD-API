INKDate.prototype.normalizeDate = function() {
  const monthsInAYear = INKDate.months().length;
  let isNormalized = false;
  while(!isNormalized) {
    if(this.Month < 0) {
      this.Year--;
      this.Month += monthsInAYear;
      continue;
    }

    if(this.Month >= monthsInAYear) {
      this.Year++;
      this.Month -= monthsInAYear;
      continue;
    }

    if(this.Day <= 0) {
      this.Month--;
      this.Day += this.daysInTheMonth();
      continue;
    }

    if(this.Day > this.daysInTheMonth()) {
      this.Day -= this.daysInTheMonth();
      this.Month++;
      continue;
    }

    isNormalized = true;
  }
}
