on('chat:message', function(msg) {
  const isADamageRoll = msg.content.match(/{{damage=1}}/)
  if(!isADamageRoll) return;

  const re = '{{(globaldamage|)(|dmg|crit)(\\d+)=\\$\\[\\[(\\d+)\\]\\]}}';
  const dmgMatches = msg.content.match(RegExp(re, 'g')) || [];
  const indexes = {
    crit: {},
    dmg: {},
  };

  dmgMatches.forEach((dmgMatch) => {
    indexMatches = dmgMatch.match(RegExp(re));
    if(!indexMatches[1] && !indexMatches[2]) return;
    const indexType = indexMatches[2] || 'dmg';
    const typeIndex = indexMatches[3];
    const inlineIndex = indexMatches[4];
    indexes[indexType][typeIndex] = inlineIndex;
  });

  let totalDmg = 0;
  Object.keys(indexes.dmg).forEach((index) => {
    const dmgIndex = indexes.dmg[index];
    const inlineroll = msg.inlinerolls[dmgIndex];
    totalDmg += inlineroll.results.total;
  });

  let totalCrit = 0;
  Object.keys(indexes.crit).forEach((index) => {
    const critIndex = indexes.crit[index];
    const inlineroll = msg.inlinerolls[critIndex];
    totalCrit += inlineroll.results.total;
  });

  state.INK_DATA.dmg = totalDmg;
  state.INK_DATA.crit = totalCrit;

  whisper(`Dmg: ${totalDmg}, Crit: ${totalCrit}`);
});
