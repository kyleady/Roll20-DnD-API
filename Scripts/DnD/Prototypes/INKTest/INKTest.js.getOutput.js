INKTest.prototype.getOutput = function() {
  if(this.isNPC && this.Macro.CustomNPC) return this.custom();
  if(!this.isNPC && this.Macro.Custom) return this.custom();
  return `%{${this.Name}|${this.getMacro()}}`;
}
