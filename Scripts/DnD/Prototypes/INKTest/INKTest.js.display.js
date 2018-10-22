INKTest.prototype.display = function(isWhisper, playerid) {
  if(!this.Name) return whisper('INKTest: Invalid Character');
  const output = this.getOutput();
  if(isWhisper || this.isNPC) {
    whisper(output, { speakingAs: 'player|' + playerid });
    if(!playerIsGM(playerid)) {
      whisper('Rolled ' + this.getMacro() + ' for the DM.', { speakingTo: playerid });
    }
  } else {
    announce(output, { speakingAs: 'player|' + playerid });
  }
}
