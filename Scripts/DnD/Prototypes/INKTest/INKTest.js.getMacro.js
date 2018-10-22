INKTest.prototype.getMacro = function() {
  if(!this.Macro) return '';
  if(this.isNPC && this.Macro.NPCName) return this.Macro.NPCName;
  return this.Macro.Name;
}
