INKTest.prototype.customNPCAbility = function(macro) {
  switch(macro) {
    case 'npc_str':
      ability = 'strength';
      break;
    case 'npc_dex':
      ability = 'dexterity';
      break;
    case 'npc_con':
      ability = 'constitution';
      break;
    case 'npc_int':
      ability = 'intelligence';
      break;
    case 'npc_wis':
      ability = 'wisdom';
      break;
    case 'npc_cha':
      ability = 'charisma';
      break;
  }

  let output = '&{template:npc} ';
  output += `@{${this.Name}|npc_name_flag} `;
  output += `{{rname=^{${ability}}}} `;
  output += `{{mod=[[@{${this.Name}|${ability}_mod}]]}} `;
  output += `{{r1=[[@{${this.Name}|d20}+@{${this.Name}|${ability}_mod}]]}} `;
  output += `@{${this.Name}|rtype}+@{${this.Name}|${ability}_mod}]]}} `;
  output += `{{type=Ability}}`;
  return output;
}
