INKExp.totalXP = (options) => {
  options = options || {};
  let totalXP = 0;
  for(let room of INKExp.Rooms) {
    totalXP += INKExp.totalRoomXP(room, options);
  }

  return totalXP;
}
