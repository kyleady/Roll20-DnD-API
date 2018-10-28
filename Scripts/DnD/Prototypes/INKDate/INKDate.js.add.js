INKDate.prototype.add = function(input) {
  let days = 0;
  if (typeof input === 'string') days = INKDate.parseTimeDiff(input);
  if (typeof input === 'number') days = input;
  this.Day += days;
  this.normalizeDate();
}
