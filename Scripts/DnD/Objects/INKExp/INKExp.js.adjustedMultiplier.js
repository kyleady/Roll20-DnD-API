INKExp.adjustedMultiplier = (room) => {
  const multipliers = [
    0.5,  //1 monster IF LARGE PARTY
    1,    //1 monsters
    1.5,  //2 monsters
    2,    //3-6 monsters
    2.5,  //7-10 monsters
    3,    //11-14 monsters
    4,    //15+ monsters
    5,    //15+ monsters IF SMALL PARTY
  ];

  let playerModifier = 0;
  const numberOfPlayers = INKExp.fetchPlayers().length;
  if(numberOfPlayers < 3) {
    playerModifier = -1;
  } else if (numberOfPlayers > 5) {
    playerModifier = 1;
  }

  let index = 0;
  const monsters = room.length;
  if(monsters == 1) {
    index = 1;
  } else if(monsters <= 2) {
    index = 2;
  } else if(monsters <= 6) {
    index = 3;
  } else if(monsters <= 10) {
    index = 4;
  } else if(monsters <= 14) {
    index = 5;
  } else {
    index = 6;
  }

  return multipliers[index + playerModifier];
}
