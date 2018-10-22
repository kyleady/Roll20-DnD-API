INKTest.prototype.customNPCInit = function() {
  let output = '&{template:npc} ';
  output += `@{${this.Name}|npc_name_flag} `;
  output += '{{rname=^{init}}} ';
  output += `{{mod=@{${this.Name}|initiative_bonus}}} `;
  output += `{{r1=[[@{${this.Name}|d20}+@{${this.Name}|initiative_bonus}]]}} `;
  output += '{{normal=1}} ';
  output += `graphicid=${this.graphic.id} `;
  output += '{{type=Initiative}}'
  return output;
}
