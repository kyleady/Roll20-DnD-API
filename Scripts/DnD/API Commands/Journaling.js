const INKJournaling = (matches, msg) => {
  const subtract = matches[1] === '-';
  const timeDiff = matches[2];
  const content = matches[3];
  const date = new INKDate();
  date.add(timeDiff, { subtract });
  const modified_date = date.toString({ capitalizeThe: true });
  const journalEntry = `<b>${modified_date}</b>: ${content}`;
  const addEntry = (obj, prop) => obj.get(prop, (notes) => {
    if(notes === 'null') notes = '';
    //If no delay is added then
    //RangeError: Maximum call stack size exceeded
    setTimeout(() => obj.set(prop, `${notes}<br>${journalEntry}`), 10);
    whisper(`<b>${getLink(obj)}</b> has been updated.`, { speakingTo: msg.playerid, gmEcho: true });
  });

  eachCharacter(msg, (character, graphic) => {
    if(playerIsGM(msg.playerid)) return addEntry(character, 'gmnotes');

    const isDefaultCharacter = character.get('controlledby') === msg.playerid;
    if(isDefaultCharacter) {
      const title = `The Journal of ${character.get('name')}`;
      let journal = findObjs({ _type: 'handout', name: title })[0];
      if(!journal) journal = createObj('handout', { name: title, inplayerjournals: msg.playerid });
      return addEntry(journal, 'notes');
    }

    const viewers = character.get('inplayerjournals').split(',');
    const isVisible = viewers.includes('all') || viewers.includes(msg.playerid);
    if(isVisible) return addEntry(character, 'bio');

    const notesTitle = `Notes on ${character.get('name')}`;
    let publicNotes = findObjs({ _type: 'handout', name: notesTitle})[0];
    if(!publicNotes) publicNotes = createObj('handout', { name: notesTitle, inplayerjournals: 'all' });
    return addEntry(publicNotes, 'notes');
  });
}

on('ready', () => {
  CentralInput.addCMD(/^!\s*journal\s*(\+|-)\s*=?\s*((?:\d+\s*(?:days?|months?|years?)\s*,?\s*)+)(.*)$/i, INKJournaling, true);
  CentralInput.addCMD(/^!\s*journal()()((?!\s*(?:\+|-)\s*=?).*)$/i, INKJournaling, true);
});
