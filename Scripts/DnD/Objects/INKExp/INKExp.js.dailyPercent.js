INKExp.dailyPercent = () => {
  let dailyXP = 0;
  const players = INKExp.fetchPlayers();
  for(let player of players) dailyXP += INKExp.dailyXP(player);
  const percent = INKExp.totalXP({ adjusted: true }) * 100 / dailyXP;
  return `${Math.round(percent)}%`;
}
