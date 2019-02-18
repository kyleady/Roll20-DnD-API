const INKClearMonsterSight = (matches, msg) => {
  const player = getObj('player', msg.playerid);
  monsters = filterObjs((obj) => {
    if(obj.get('_type') != 'graphic') return false;
    if(obj.get('_pageid') != player.get('_lastpage')) return false;
    if(obj.get('represents') == '') return false;
    if(obj.get('controlledby')) return false;
    if(obj.get('light_otherplayers')) return false;
    return true;
  });

  for (let monster of monsters) {
    monster.set({
      light_radius: "",
      light_dimradius: "",
      light_hassight: false,
      light_angle: "360",
      light_losangle: "360",
      light_multiplier: "1",
      adv_fow_view_distance: ""
    })
  }

  whisper("Useless monster light removed.")
}
on('ready', () => {
  CentralInput.addCMD(/^!\s*CLEAR\s*MONSTER\s*SIGHT\s*$/i, INKClearMonsterSight)
});
