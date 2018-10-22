INKTest.prototype.customInit = function() {
  let output = '&{template:simple} ';
  output += '{{rname=^{init-u}}} ';
  output += `{{mod=@{${this.Name}|initiative_bonus}}} `;
  output += `{{r1=[[@{${this.Name}|initiative_style}+@{${this.Name}|initiative_bonus}@{${this.Name}|pbd_safe}]]}} `;
  output += '{{normal=1}} ';
  output += `graphicid=${this.graphic.id} `
  output += `@{${this.Name}|charname_output}`;
  return output;
}
