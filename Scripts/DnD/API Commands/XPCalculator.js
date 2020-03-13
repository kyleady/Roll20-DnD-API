INKExpLevelsSet = (matches, msg) => {
  const level = Number(matches[1]);
  if(level <= 0 || level > 20) return whisper('ERROR: Only accepting levels 1-20.')
  const players = INKExp.fetchPlayers();
  if(players.length <= 0) return whisper('ERROR: Add players first. [!xp players = 1,1,1](!xp players = 1,1,1)');
  for(let i = 0; i < players.length; i++) {
    players[i] = level;
  }

  INKExpLevelsQuery();
}

INKExpLevelsQuery = (matches, msg) => {
  const players = INKExp.fetchPlayers();
  whisper(`Player Levels: ${players.join(', ')}`);
}

INKExpPlayersSet = (matches, msg) => {
  const newPlayers = matches[1].match(/\d+/g).map(number => Number(number));
  const players = INKExp.fetchPlayers();
  players.splice(0, players.length, ...newPlayers);
  INKExpLevelsQuery();
}

INKExpAdd = (matches, msg) => {
  let room = [];
  eachCharacter(msg, (character, graphic) => {
    const xp_text = getAttrByName(character.id, 'npc_xp');
    const xp_matches = xp_text.match(/\d+/);
    if(xp_matches) {
      const xp = Number(xp_matches[0]);
      room.push(xp);
    }
  });

  if(room.length <= 0) whisper('WARNING: 0 xp.');
  INKExp.Rooms.push(room);
  INKExp.displayReport();
}

INKExpReset = (matches, msg) => {
  INKExp.Rooms = [];
  whisper('Experience rooms reset.');
}

INKExpSave = (matches, msg) => {
  eachCharacter(msg, (character, graphic) => {
    var localAttributes = new LocalAttributes(graphic);
    localAttributes.set("xpForMultipleRooms", JSON.stringify(INKExp.Rooms));
    whisper(`XP for ${INKExp.Rooms.length} Rooms saved on ${graphic.get("name")}.`);
  }, {onlyOneCharacter: true, defaultCharacter: false, characterRequired: false});
}

INKExpLoad = (matches, msg) => {
  eachCharacter(msg, (character, graphic) => {
    var localAttributes = new LocalAttributes(graphic);
    var xpForMultipleRooms = carefulParse(localAttributes.get("xpForMultipleRooms"));
    if(xpForMultipleRooms) INKExp.Rooms = xpForMultipleRooms;
    INKExp.displayReport()
  }, {onlyOneCharacter: true, defaultCharacter: false, characterRequired: false});
}

on('ready', () => {
  CentralInput.addCMD(/^!\s*xp\s*levels\s*=\s*(\d+)\s*$/i, INKExpLevelsSet);
  CentralInput.addCMD(/^!\s*xp\s*levels\s*\?\s*$/i, INKExpLevelsQuery);
  CentralInput.addCMD(/^!\s*xp\s*players\s*?\s*=\s*((?:\d+\s*,?\s*)+)$/i, INKExpPlayersSet);
  CentralInput.addCMD(/^!\s*xp\s*\?\s*$/i, INKExp.displayReport);
  CentralInput.addCMD(/^!\s*xp\s*reset\s*$/i, INKExpReset);
  CentralInput.addCMD(/^!\s*xp\s*(\+|add)\s*$/i, INKExpAdd);
  CentralInput.addCMD(/^!\s*xp\s*load\s*$/i, INKExpLoad);
  CentralInput.addCMD(/^!\s*xp\s*save\s*$/i, INKExpSave);
});
