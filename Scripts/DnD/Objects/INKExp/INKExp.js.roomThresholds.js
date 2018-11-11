INKExp.roomThresholds = () => {
  const players = INKExp.fetchPlayers();
  const thresholds = [
    [25,    50,   75,   100],   //level 1
    [50,    100,  150,  200],   //level 2
    [75,    150,  225,  400],   //level 3
    [125,   250,  375,  500],   //level 4
    [250,   500,  750,  1100],  //level 5
    [300,   600,  900,  1400],  //level 6
    [350,   750,  1100, 1700],  //level 7
    [450,   900,  1400, 2100],  //level 8
    [550,   1100, 1600, 2400],  //level 9
    [600,   1200, 1900, 2800],  //level 10
    [800,   1600, 2400, 3600],  //level 11
    [1000,  2000, 3000, 4500],  //level 12
    [1100,  2200, 3400, 5100],  //level 13
    [1250,  2500, 3800, 5700],  //level 14
    [1400,  2800, 4300, 6400],  //level 15
    [1600,  3200, 4800, 7200],  //level 16
    [2000,  3900, 5900, 8800],  //level 17
    [2100,  4200, 6300, 9500],  //level 18
    [2400,  4900, 7300, 10900], //level 19
    [2800,  5700, 8500, 12700], //level 20
  ];

  const playerThresholds = [];
  for(let player of players) playerThresholds.push(thresholds[player - 1]);
  const roomThresholds = [0, 0, 0, 0];
  for(let i = 0; i < roomThresholds.length; i++) {
    for(let playerThreshold of playerThresholds) {
      if(!playerThreshold) continue;
      roomThresholds[i] += playerThreshold[i];
    }
  }

  return roomThresholds;
}
