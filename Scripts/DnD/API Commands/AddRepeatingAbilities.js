on('ready', () => {
  CentralInput.addCMD(/^!\s*add\s*attack\s*button\s*for\s+(.+)$/i, (matches, msg) => {
    addRepeatingButton(matches, msg,
      '!add attack button for $',
      'repeating_attack_$$_atkname',
      'repeating_attack_$$_attack'
    )
  }, true);

  CentralInput.addCMD(/^!\s*add\s*tool\s*button\s*for\s+(.+)$/i, (matches, msg) => {
    addRepeatingButton(matches, msg,
      '!add tool button for $',
      'repeating_tool_$$_toolname',
      'repeating_tool_$$_tool'
    )
  }, true);

  CentralInput.addCMD(/^!\s*add\s*trait\s*button\s*for\s+(.+)$/i, (matches, msg) => {
    addRepeatingButton(matches, msg,
      '!add trait button for $',
      'repeating_traits_$$_name',
      'repeating_traits_$$_output'
    )
  }, true);

  CentralInput.addCMD(/^!\s*add\s*proficiency\s*button\s*for\s+(.+)$/i, (matches, msg) => {
    addRepeatingButton(matches, msg,
      '!add proficiency button for $',
      'repeating_proficiencies_$$_name',
      'repeating_proficiencies_$$_output'
    )
  }, true);

  CentralInput.addCMD(/^!\s*add\s*(?:|lvl?|level)\s*(cantrip|[1-9])\s*(?:|spell)\s*button\s*for\s+(.+)$/i, (matches, msg) => {
    const level = matches[1].toLowerCase();
    matches.shift();
    addRepeatingButton(matches, msg,
      `!add ${level} spell button for $`,
      `repeating_spell-${level}_$$_spellname`,
      `repeating_spell-${level}_$$_spell`
    )
  }, true);
});
