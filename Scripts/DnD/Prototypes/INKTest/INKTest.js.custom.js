INKTest.prototype.custom = function() {
  if(this.isNPC) {
    if(this.Macro.Name.includes('save')) return this.customNPCSave();
    if(this.Macro.Name === 'initiative') return this.customNPCInit();
    return this.customNPCAbility();
  }
  if(this.Macro.Name === 'initiative') return this.customInit();
  return 'Unknown Custom INKTest';
}
