INQAttack = INQAttack || {};

INQAttack.rollToHit = function(){
  //calculate the base roll to hit
  INQAttack.calcToHit();
  //determine the weapon's firing mode
  INQAttack.getFiringMode();
  //make the roll to hit
  INQAttack.d100 = randomInteger(100);
  //was there a crit?
  if(INQAttack.d100 == 100){
    INQAttack.Reports.Crit = "[Critical Failure!](!This Isn't Anything Yet)";
  } else if(INQAttack.d100 == 1) {
    INQAttack.Reports.Crit = "[Critical Success!](!This Isn't Anything Yet)";
  }
  //determine the number of hits based on the roll to hit and firing mode
  INQAttack.calcHits();
  //show the roll to hit
  INQAttack.Reports.toHit = "&{template:default} ";
  INQAttack.Reports.toHit += "{{name=<strong>" + INQAttack.stat +  "</strong>: " + INQAttack.inqcharacter.Name + "}} ";
  INQAttack.Reports.toHit += "{{Successes=[[(" + INQAttack.toHit.toString() + " - (" + INQAttack.d100.toString() + ") )/10]]}} ";
  INQAttack.Reports.toHit += "{{Unnatural= [[" + INQAttack.unnaturalSuccesses.toString() + "]]}} ";
  INQAttack.Reports.toHit += "{{Hits= [[" + INQAttack.hits.toString() + "]]}}";
}

//use the players rate of fire to determine what mode the weapn is firing on
//add in all the respective bonuses for that mode
INQAttack.getFiringMode = function(){
  //if the RoF was undefined, find the lowest available setting to fire on
  _.each(["Single", "Semi", "Full"], function(RoF){
    if(INQAttack.options.RoF == undefined
    && INQAttack.inqweapon[RoF]){
      INQAttack.options.RoF = RoF;
    }
  });
  //if nothing was valid, go for single
  if(INQAttack.options.RoF == undefined){
    INQAttack.options.RoF = "Single";
  }

  //add in any modifiers for the RoF
  if(/semi/i.test(INQAttack.options.RoF)){
    INQAttack.toHit += 0;
    INQAttack.maxHits = INQAttack.inqweapon.Semi;
    INQAttack.mode = "Semi";
  } else if(/swift/i.test(INQAttack.options.RoF)){
    INQAttack.toHit += 0;
    INQAttack.maxHits = Math.max(2, Math.round(INQAttack.inqcharacter.bonus("WS")/3));
    INQAttack.mode = "Semi";
  } else if(/full/i.test(INQAttack.options.RoF)){
    if(INQAttack.inqweapon.Class != "Psychic"){
      INQAttack.toHit += -10;
    }
    INQAttack.maxHits = INQAttack.inqweapon.Full
    INQAttack.mode = "Full";
  } else if(/lightning/i.test(INQAttack.options.RoF)){
    if(INQAttack.inqweapon.Class != "Psychic"){
      INQAttack.toHit += -10;
    }
    INQAttack.maxHits = Math.max(3, Math.round(INQAttack.inqcharacter.bonus("WS")/2));
    INQAttack.mode = "Full";
  } else if(/called/i.test(INQAttack.options.RoF)){
    if(INQAttack.inqweapon.Class != "Psychic"){
      INQAttack.toHit += -20;
    }
    INQAttack.maxHits = 1;
    INQAttack.mode = "Single";
  } else { //if(/single/i.test(INQAttack.options.RoF))
    if(INQAttack.inqweapon.Class != "Psychic"){
      INQAttack.toHit += 10;
    }
    INQAttack.maxHits = 1;
    INQAttack.mode = "Single";
  }
}

INQAttack.calcToHit = function(){
  //get the stat used to hit
  INQAttack.stat = "BS"
  if(INQAttack.inqweapon.Class == "Melee"){
    INQAttack.stat = "WS";
  } else if(INQAttack.inqweapon.Class == "Psychic"){
    INQAttack.stat = INQAttack.inqweapon.FocusStat;
    //some psychic attacks have a base modifier
    INQAttack.toHit += INQAttack.inqweapon.FocusModifier;
    //psychic attacks get a bonus for the psy rating it was cast at
    INQAttack.toHit += INQAttack.PsyRating * 5;
  }
  //use the stat
  INQAttack.toHit += Number(INQAttack.inqcharacter.Attributes[INQAttack.stat]);
  INQAttack.unnaturalSuccesses += Math.ceil(Number(INQAttack.inqcharacter.Attributes["Unnatural " + INQAttack.stat])/2);
  if(INQAttack.options.Modifier && Number(INQAttack.options.Modifier)){
    INQAttack.toHit += Number(INQAttack.options.Modifier);
  }
}
//calculate the number of hits based on the
INQAttack.calcHits = function(){
  //determine the successes based on the roll
  INQAttack.successes = Math.floor((INQAttack.toHit-INQAttack.d100)/10) + INQAttack.unnaturalSuccesses;
  //calculate the number of hits based on the firing mode
  INQAttack.hits = 0;
  if(INQAttack.autoHit){
    //auto hitting weapons always hit
    INQAttack.hits = INQAttack.maxHits;
  } else if(INQAttack.toHit - INQAttack.d100 >= 0){
    INQAttack.hits = 1;
    switch(INQAttack.mode){
      case "Semi":
        INQAttack.hits += Math.floor(INQAttack.successes/2);
      break;
      case "Full":
        INQAttack.hits += INQAttack.successes
      break;
    }
    //be sure the number of hits is not over the max (and that there is a max)
    if(INQAttack.maxHits > 0 && INQAttack.hits > INQAttack.maxHits){
      INQAttack.hits = INQAttack.maxHits;
    }
  }
  //account for any hits bonuses
  INQAttack.hits *= INQAttack.hitsMultiplier;
  INQAttack.hits *= INQAttack.shotsMultiplier;
  //account for any extra ammo this may spend
  INQAttack.maxHits *= INQAttack.shotsMultiplier;
}

//a list of all the special rules that affect the toHit calculations
INQAttack.accountForHitsSpecialRules = function(){
  INQAttack.accountForStorm();
  INQAttack.accountForBlast();
  INQAttack.accountForSpray();
}