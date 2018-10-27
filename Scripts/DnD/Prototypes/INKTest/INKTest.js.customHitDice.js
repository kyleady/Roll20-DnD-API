INKTest.prototype.customHitDice = function() {
  let output = '&{template:simple} ';
  output += '{{rname=^{hit-dice-u}}} ';
  output += `{{mod=D@{${this.Name}|hitdie_final}+@{${this.Name}|constitution_mod}}} `;
  output += `{{r1=[[1d@{${this.Name}|hitdie_final}+@{${this.Name}|constitution_mod}]]}}`
  output += `{{normal=1}} `;
  output += `@{${this.Name}|charname_output}`;
  return output;
}
