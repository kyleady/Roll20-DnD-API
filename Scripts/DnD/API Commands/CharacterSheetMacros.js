const INKCharacterSheetMacros = (matches, msg) => {
  const isWhisper = matches[1];
  const inktest = new INKTest({ macro: matches[2] });
  if(!inktest.Macro) return whisper('Unable to find MACRO', { gmEcho: true, speakingTo: msg.playerid });
  eachCharacter(msg, (character, graphic) => {
    inktest.setCharacter(character, graphic);
    inktest.display(isWhisper, msg.playerid);
  });
};

on('ready', () => {
  const macros = [].concat(INKTest.abilities(), INKTest.actions(), INKTest.saves(), INKTest.skills());
  const macroRegExps = macros.map(macro => toRegex(macro, { str: true }));
  const macro = '(' + macroRegExps.join('|') + ')\\s*$';
  const isWhisper = '\\s*(gm|)\\s*';

  CentralInput.addCMD(RegExp('^!' + isWhisper + macro, 'i'), INKCharacterSheetMacros, true);
});
