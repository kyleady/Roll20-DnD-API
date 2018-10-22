INKTest.prototype.setCharacter = function(character, graphic) {
  this.Name = graphic.get('name');
  this.isNPC = Number(getAttrByName(character.id, 'npc'));
  this.character = character;
  this.graphic = graphic;
}
