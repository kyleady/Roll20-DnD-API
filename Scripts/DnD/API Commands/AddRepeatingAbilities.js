on('ready', () => {
  CentralInput.addCMD(/^!\s*add\s*attack\s*button\s+(.+)$/i, (matches, msg) => {
    addRepeatingButton(matches, msg,
      '!add attack button $',
      'repeating_attack_$$_atkname',
      'repeating_attack_$$_attack'
    )
  });

  CentralInput.addCMD(/^!\s*add\s*tool\s*button\s+(.+)$/i, (matches, msg) => {
    addRepeatingButton(matches, msg,
      '!add tool button $',
      'repeating_tool_$$_toolname',
      'repeating_tool_$$_tool'
    )
  });

  CentralInput.addCMD(/^!\s*add\s*trait\s*button\s+(.+)$/i, (matches, msg) => {
    addRepeatingButton(matches, msg,
      '!add trait button $',
      'repeating_traits_$$_name',
      'repeating_traits_$$_output'
    )
  });

  CentralInput.addCMD(/^!\s*add\s*proficiency\s*button\s+(.+)$/i, (matches, msg) => {
    addRepeatingButton(matches, msg,
      '!add proficiency button $',
      'repeating_proficiencies_$$_name',
      'repeating_proficiencies_$$_output'
    )
  });

  CentralInput.addCMD(/^!\s*add\s*(?:|lvl?|level)\s*(cantrip|[1-9])\s*spell\s*button\s+(.+)$/i, (matches, msg) => {
    const level = matches[1].toLowerCase();
    matches.shift();
    addRepeatingButton(matches, msg,
      `!add ${level} spell button $`,
      `repeating_spell-${level}_$$_spellname`,
      `repeating_spell-${level}_$$_spell`
    )
  });
});
