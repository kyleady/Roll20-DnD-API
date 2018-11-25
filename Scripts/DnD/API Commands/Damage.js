const INKDamage = (matches, msg) => {
  const includeCrit = matches[1] != '';
  eachCharacter(msg, (character, graphic) => {
    const bar = 'bar1';
    const currentHealth = Number(graphic.get(`${bar}_value`));
    const maxHealth = Number(graphic.get(`${bar}_max`)) || 1;
    if(currentHealth !== 0 && !currentHealth) return whisper(`${graphic.get('name')} does not have a numeric health value.`);
    let totalDmg = state.INK_DATA.dmg || 0;
    if(includeCrit) totalDmg += state.INK_DATA.crit || 0;
    graphic.set(`${bar}_value`, currentHealth - totalDmg);
    const percent = Math.round(totalDmg * 100 / maxHealth);
    whisper(`${graphic.get('name')}: ${percent}%`);
  });
}

const INKDamageQuery = (matches, msg) => {
  const totalDmg = state.INK_DATA.dmg || 0;
  const totalCrit = state.INK_DATA.crit || 0;
  whisper(`Dmg: ${totalDmg}, Crit: ${totalCrit}`);
}

on('ready', () => {
  CentralInput.addCMD(/^!\s*dmg\s*(|crit|critical)\s*$/i, INKDamage);
  CentralInput.addCMD(/^!\s*dmg\s*\?\s*$/i, INKDamageQuery);
});
