INKTurns.prototype.higherInit = function(newTurn, turn){
  //does the turn we are inserting (newTurn) have greater initiative than the currently examined turn (turn)?
  if(Number(newTurn.pr) > Number(turn.pr)){
    return true;
  //is their initiative the same?
  } else if(Number(newTurn.pr) == Number(turn.pr)){
    //be sure the tokens represent characters
    var challengerAg = undefined;
    var championAg = undefined;
    var challengerCharacter = undefined;
    var championCharacter = undefined;
    var challengerID = newTurn.id;
    var championID = turn.id;
    if(challengerID != undefined && championID != undefined){
      challengerAg = attributeValue('initiative_bonus', {graphicid: challengerID, alert: false});
      championAg = attributeValue('initiative_bonus', {graphicid: championID, alert: false});
    }

    if(championAg != undefined && challengerAg != undefined){
      //if the challenger has greater agility (or == and rolling a 2 on a D2)
      if(challengerAg > championAg
      || challengerAg == championAg && randomInteger(2) == 1){
        return true;
      }
    }
  }

  //if it has not returned true yet, return false
  return false;
}
