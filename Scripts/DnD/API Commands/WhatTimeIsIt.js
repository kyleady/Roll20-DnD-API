const INKGetTheDate = (matches, msg) => {
  const date = new INKDate();
  whisper(`It is now ${date.toString()}.`, { speakingTo: msg.playerid });
}

const INKSetTheDate = (matches, msg) => {
  const subtract = matches[1] === '-';
  const timeDiff = matches[2];
  const date = new INKDate();
  date.add(timeDiff, { subtract });
  date.save();
  announce(`It is now ${date.toString()}.`);
}

on('ready', () => {
  CentralInput.addCMD(/^!\s*(?:time|date)\s*\??\s*$/i, INKGetTheDate, true);
  CentralInput.addCMD(/^!\s*(?:time|date)\s*(\+|-)\s*=?\s*((?:\d+\s*(?:days?|months?|years?)\s*,?\s*)+)$/i, INKSetTheDate);
});
