function INKTest(options) {
  if(typeof options != 'object') options = {};
  this.Macro = false;
  this.Name = false;
  
  this.setAbility(options.macro);
  this.setSkill(options.macro);
  this.setAction(options.macro);
  this.setSave(options.macro);
}
