//get the initiative roll of a turn already in the turn order
INKTurns.prototype.getInit = function(graphicid){
  for(var i = 0; i < this.turnorder.length; i++){
    if(graphicid == this.turnorder[i].id) return Number(this.turnorder[i].pr);
  }
}
