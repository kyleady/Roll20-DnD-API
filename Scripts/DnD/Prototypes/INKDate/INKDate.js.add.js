INKDate.prototype.add = function(input, options) {
  options = options || {};
  let days = 0;
  if (typeof input === 'string') days = INKDate.parseTimeDiff(input);
  if (typeof input === 'number') days = input;
  if(options.subtract) days *= -1;
  this.Day += days;
  this.normalizeDate();
}
