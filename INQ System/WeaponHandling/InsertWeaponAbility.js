//be sure the inqattack object exists before we start working with it
INQAttack = INQAttack || {};

//adds a !useWeapon ability for the weapon to the character
//checks if the character already has the weapon ability

//if the character already has the ability but the weapon doesn't use a clip,
//don't add an extra one

//if the character already has the ability and the weapon has a clip, the
//function will alter the new ability so it can keep track of its ammo separately.
INQAttack.insertWeaponAbility = function(inqweapon, character, quantity, ammoNames){
  //create a list of all of the weapon abilities this character has
  var abilityNames = [];
  var abilityObjs = findObjs({_type: "ability", characterid: character.id});
  _.each(abilityObjs, function(abilityObj){
    //is this a weapon ability generated by INQAttack?
    var matches = abilityObj.get("action").match(/^!useWeapon ([^\{\}]+)(\{.*\})$/);
    if(matches){
      //get the weapon name
      INQAttack.weaponname = matches[1];
      INQAttack.options = new Hash(matches[2].replace(/\?\{[^\{\}]+\}/g,""));
      if(INQAttack.options.Name){
        abilityNames.push(INQAttack.options.Name);
      } else {
        abilityNames.push(INQAttack.weaponname);
      }
    }
  });
  //find a name for the new weapon ability
  var Name = inqweapon.Name;
  var counter = 1;
  do {
    var nameIsUnique = true;
    _.each(abilityNames, function(abilityName){
      if(Name == abilityName){
        nameIsUnique = false;
        //remove the old counter, if it was there
        if(counter > 1){
          Name = Name.replace(RegExp(" " + counter.toString() + "$"), "");
        }
        //add the new counter
        counter++;
        Name += " " + counter.toString();
      }
    });
  } while(!nameIsUnique);
  //create the base options Hash for the weapon ability
  var options = new Hash();
  if(quantity){
    options.Clip = quantity;
  }
  //only overwrite the name if it isn't the name of the weapon
  if(counter > 1){
    options.Name = Name;
  }
  //if we never uped the counter -> weapon is unique
  //or if the non-unique weapon tracks ammo
  if(counter == 1 || inqweapon.Clip || quantity){
    //add the weapon
    createObj("ability", {
      characterid: character.id,
      name: Name,
      action: inqweapon.toAbility(INQAttack.inqcharacter, ammoNames, options),
      istokenaction: true
    });
  }
}