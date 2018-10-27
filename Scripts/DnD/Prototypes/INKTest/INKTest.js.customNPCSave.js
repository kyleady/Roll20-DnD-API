INKTest.prototype.customNPCSave = function(macro) {
  let ability = '';
  switch(macro) {
    case 'npc_str_save':
      ability = 'strength';
      break;
    case 'npc_dex_save':
      ability = 'dexterity';
      break;
    case 'npc_con_save':
      ability = 'constitution';
      break;
    case 'npc_int_save':
      ability = 'intelligence';
      break;
    case 'npc_wis_save':
      ability = 'wisdom';
      break;
    case 'npc_cha_save':
      ability = 'charisma';
      break;
  }

  let output = '&{template:npc} ';
  output += `@{${this.Name}|npc_name_flag} `;
  output += `{{rname=^{${ability}-save}}} `;
  output += `{{mod=[[@{${this.Name}|${macro}}]]}} `;
  output += `{{r1=[[@{${this.Name}|d20}+@{${this.Name}|${macro}}]]}} `;
  output += `@{${this.Name}|rtype}+@{${this.Name}|${macro}}]]}} `;
  output += `{{type=Save}}`;
  return output;
}
