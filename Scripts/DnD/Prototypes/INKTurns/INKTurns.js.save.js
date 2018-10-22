//save the turn order in the Campaign
INKTurns.prototype.save = function(){
  Campaign().set("turnorder", JSON.stringify(this.turnorder));
}
