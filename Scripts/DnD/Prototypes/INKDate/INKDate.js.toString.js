INKDate.prototype.toString = function(options) {
  options = options || {};
  const { capitalizeThe } = options;
  this.normalizeDate();
  const month = INKDate.months()[this.Month].Name;
  const day = this.daySuffix();
  let output = '';
  const the = capitalizeThe ? 'The' : `the`;
  if(this.daysInTheMonth() > 1) output += `${the} ${day} of `;
  output += `${month}, `;
  if(this.Year > 0) {
    output += `${this.Year} ${INKDate.positiveYearSuffix}`
  } else {
    output += `${1 - this.Year} ${INKDate.negativeYearSuffix}`
  }

  return output;
}
