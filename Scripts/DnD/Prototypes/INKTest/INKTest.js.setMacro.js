INKTest.prototype.setMacro = function(macros, input) {
  if(this.Macro || !input) return;
  for(var macro of macros){
    if(toRegex(macro).test(input)){
      this.Macro = macro;
      break;
    }
  }
}

INKTest.prototype.setAbility = function(input) { return this.setMacro(INKTest.abilities(), input); }
INKTest.prototype.setAction = function(input) { return this.setMacro(INKTest.actions(), input); }
INKTest.prototype.setSkill = function(input) { return this.setMacro(INKTest.skills(), input); }
INKTest.prototype.setStat = function(input) { return this.setMacro(INKTest.stats(), input); }
INKTest.prototype.setSave = function(input) { return this.setMacro(INKTest.saves(), input); }
