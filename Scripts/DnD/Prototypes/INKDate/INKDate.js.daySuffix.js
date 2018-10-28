INKDate.prototype.daySuffix = function(day) {
  if(typeof day !== 'number') day = this.Day;
  absDay = Math.abs(day);
  if(absDay >= 4 && absDay <= 20) return `${day}th`;
  switch(absDay % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}
