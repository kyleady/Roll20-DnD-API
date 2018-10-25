const INKAddAbility = (matches, msg, group, action) => {
  const index = Number(matches[1]) - 1;
  const nickname = matches[2].trim();
  eachCharacter(msg, (character, graphic) => {
    const name = character.get('name');
    createObj('ability', {
      _characterid: character.id,
      name: nickname,
      action: `%{${name}|repeating_${group}_$${index}_${action}}`,
      istokenaction: true,
    });
    whisper(`Added ${nickname} to ${name}.`, { speakingTo: msg.playerid });
  });
}

const INKAddPCWeapon = (matches, msg) => INKAddAbility(matches, msg, 'attack', 'attack');
const INKAddPCTool = (matches, msg) => INKAddAbility(matches, msg, 'tool', 'tool');
const INKAddPCTrait = (matches, msg) => INKAddAbility(matches, msg, 'traits', 'output');
const INKAddPCProficiency = (matches, msg) => INKAddAbility(matches, msg, 'proficiencies', 'output');
const INKAddPCSpell = (matches, msg) => {
  const level = matches[1].toLowerCase();
  matches.shift();
  return INKAddAbility(matches, msg, `spell-${level}`, 'spell')
}

on('ready', () => {
  CentralInput.addCMD(/^!\s*Add\s*(?:|lvl?|level)\s*(cantrip|[1-9])\s*Spell\s*(\d+)\s*As\s+(.*)$/i, INKAddPCSpell, true);
  CentralInput.addCMD(/^!\s*Add\s*Weapon\s*(\d+)\s*As\s+(.*)$/i, INKAddPCWeapon, true);
  CentralInput.addCMD(/^!\s*Add\s*Tool\s*(\d+)\s*As\s+(.*)$/i, INKAddPCTool, true);
  CentralInput.addCMD(/^!\s*Add\s*Proficiency\s*(\d+)\s*As\s+(.*)$/i, INKAddPCProficiency, true);
  CentralInput.addCMD(/^!\s*Add\s*Trait\s*(\d+)\s*As\s+(.*)$/i, INKAddPCTrait, true);
});
