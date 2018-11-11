INKExp.displayReport = () => {
  const totalXP = INKExp.totalXP();
  const players = INKExp.fetchPlayers().length || 1;
  const xpEarned = Math.round(totalXP/players);
  const date = new INKDate().toString({ capitalizeThe: true });
  let output = '&{template:default} ';
  output += `{{name=<strong>XP Report</strong>: ${date}}} `;
  output += `{{XP Earned=${totalXP} / ${players} = ${xpEarned}}} `;
  output += `{{Daily=${INKExp.dailyPercent()}}} `;
  for(let i = 0; i < INKExp.Rooms.length; i++) {
    output += `{{Encounter ${i+1}=${INKExp.roomPercent(i)}}} `;
  }

  whisper(output);
}
