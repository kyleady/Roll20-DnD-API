const INKDamage = (matches, msg) => {
  const includeCrit = /crit|critical/i.test(matches[1]);
  const damageType = matches[2].toUpperCase() || '';
  eachCharacter(msg, (character, graphic) => {
    const bar = 'bar1';
    const currentHealth = Number(graphic.get(`${bar}_value`));
    const maxHealth = Number(graphic.get(`${bar}_max`)) || 1;
    if(currentHealth !== 0 && !currentHealth) return whisper(`${graphic.get('name')} does not have a numeric health value.`);
    let totalDmg = state.INK_DATA.dmg || 0;
    if(includeCrit) totalDmg += state.INK_DATA.crit || 0;
    graphic.set(`${bar}_value`, currentHealth - totalDmg);
    const percent = Math.round(totalDmg * 100 / maxHealth);
    damageFx(graphic, damageType)
    whisper(`${graphic.get('name')}: ${percent}%`);
  });
}

const INKDamageQuery = (matches, msg, options) => {
  options = options || {};
  const totalDmg = state.INK_DATA.dmg || 0;
  const totalCrit = state.INK_DATA.crit || 0;
  whisper(`Dmg: ${totalDmg}, Crit: ${totalCrit}`, { speakingTo: msg.playerid, gmEcho: options.gmEcho });
}

const INKDamageModifier = (matches, msg) => {
  const type = /(crit|critical)/i.test(matches[1]) ? 'crit' : 'dam';
  const operator = matches[2];
  const value = Number(matches[3]);

  const old_value = state.INK_DATA[type] || 0;
  if(operator == '+') {
    const new_value = old_value + value;
  } else if(operator == '-') {
    const new_value = old_value - value;
  } else if(operator == '*') {
    const new_value = old_value * value;
  } else if(operator == '/') {
    const new_value = old_value / value;
  } else if(operator == '') {
    const new_value = value;
  }

  state.INK_DATA[type] = Math.round(new_value);
  INKDamageQuery(matches, msg, { gmEcho: true });
}

on('ready', () => {
  CentralInput.addCMD(/^!\s*(dmg|dam|damage|attack|crit|critical)\s*(I|X|R|E|)\s*$/i, INKDamage, true);
  CentralInput.addCMD(/^!\s*(dmg|dam|damage|attack|crit|critical)\s*\?\s*$/i, INKDamageQuery, true);
  CentralInput.addCMD(/^!\s*(dmg|dam|damage|attack|crit|critical)\s*(\+|-|\*|\/|)\s*=?\s*(\d+.?\d*)\s*$/, INKDamageModifier, true)
});
