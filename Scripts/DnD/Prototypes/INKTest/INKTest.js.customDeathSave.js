INKTest.prototype.customDeathSave = function() {
  let output = `&{template:simple} `;
  output += `{{rname=^{death-save-u}}} `;
  output += `{{mod=@{${this.Name}|death_save_bonus}}} `;
  output += `{{r1=[[@{d20}+@{${this.Name}|death_save_bonus}@{${this.Name}|globalsavingthrowbonus}]]}} `;
  output += `{{normal=1}} `;
  output += `{{global=@{${this.Name}|global_save_mod}}} `;
  output += `@{${this.Name}|charname_output} `;
  return output;
}
