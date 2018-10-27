INKTest.prototype.custom = function(macro) {
  const customOutputs = {
     "npc_str": this.customNPCAbility,
     "npc_dex": this.customNPCAbility,
     "npc_con": this.customNPCAbility,
     "npc_int": this.customNPCAbility,
     "npc_wis": this.customNPCAbility,
     "npc_cha": this.customNPCAbility,
     "npc_str_save": this.customNPCSave,
     "npc_dex_save": this.customNPCSave,
     "npc_con_save": this.customNPCSave,
     "npc_int_save": this.customNPCSave,
     "npc_wis_save": this.customNPCSave,
     "npc_cha_save": this.customNPCSave,
     "npc_init": this.customNPCInit,
     "npc_hit_dice": this.customMacroNotAvailable,
     "npc_death_save": this.customMacroNotAvailable,
     "initiative": this.customInit,
     "hit_dice": this.customHitDice,
     "death_save": this.customDeathSave,
  };

  return customOutputs[macro];
}

INKTest.prototype.customMacroNotAvailable = function(macro) {
  return `${this.Name} does not have a(n) ${macro} Macro.`;
};
