INKDate.prototype.toString = function(options) {
  options = options || {};
  const { capitalizeThe } = options;
  this.normalizeDate();
  const month = INKDate.months()[this.Month].Name;
  const day = this.daySuffix();
  let output = '';
  const the = capitalizeThe ? 'The' : `the`;
  if(this.daysInTheMonth() > 1) output += `${the} ${day} of `;
  output += `${month}, ${this.Year} DR`;
  return output;
}
