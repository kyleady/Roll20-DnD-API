INKExp.roomPercent = (roomIndex) => {
  const room = INKExp.Rooms[roomIndex];
  let roomXP = INKExp.totalRoomXP(room, { adjusted: true });
  const [easy, medium, hard, deadly] = INKExp.roomThresholds();
  if(roomXP >= deadly) {
    const deadlyPercent = (roomXP * 100) / deadly;
    return `Deadly(+${Math.round(deadlyPercent - 100)}%)`;
  } else if(roomXP >= hard) {
    const hardPercent = ((roomXP - hard) * 100) / (deadly - hard);
    return `Hard(+${Math.round(hardPercent)}%)`;
  } else if(roomXP >= medium) {
    const mediumPercent = ((roomXP - medium) * 100) / (hard - medium);
    return `Medium(+${Math.round(mediumPercent)}%)`;
  } else if(roomXP >= easy) {
    const easyPercent = ((roomXP - easy) * 100) / (medium - easy);
    return `Easy(+${Math.round(easyPercent)}%)`;
  } else {
    const laughablePercent = (roomXP * 100) / easy;
    return `Laughable(+${Math.round(laughablePercent)}%)`;
  }
}
