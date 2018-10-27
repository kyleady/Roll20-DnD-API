INKCalculateExperience = (matches, msg) => {
  let totalXP = 0;
  eachCharacter(msg, (character, graphic) => {
    const xp = Number(getAttrByName(character.id, 'npc_xp'));
    if(!xp) return whisper(`WARNING: ${character.get('name')} does not reward xp.`);
    totalXP += xp;
  });
  const numberWithCommas = (x) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  whisper(`Total Experience: ${numberWithCommas(totalXP)}`)
}

on('ready', () => {
  CentralInput.addCMD(/^!\s*total\s*xp\s*$/i, INKCalculateExperience);
});
