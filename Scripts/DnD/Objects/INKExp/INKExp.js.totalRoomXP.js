INKExp.totalRoomXP = (room, options) => {
  options = options || {};
  let totalXP = 0;
  for(let xp of room) {
    totalXP += xp;
  }

  if(options.adjusted) totalXP *= INKExp.adjustedMultiplier(room);
  return totalXP;
}
