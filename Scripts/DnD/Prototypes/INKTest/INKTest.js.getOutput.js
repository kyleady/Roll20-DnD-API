INKTest.prototype.getOutput = function() {
  const macro = this.getMacro();
  const customOutput = this.custom(macro);
  if(customOutput) return customOutput.call(this, macro);
  return `%{${this.Name}|${macro}}`;
}
