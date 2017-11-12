
//publicly makes a cohesion test
function cohesionHandler(matches,msg){
  //find the party attribute
  var cohesionObjs = findObjs({
    _type: "attribute",
    name: "Cohesion"
  }) || [];
  //are there no cohesion attributes anywhere?
  if(cohesionObjs.length <= 0){
    //no stat to work with. alert the gm and player
    return whisper("There is nothing in the campaign with a(n) " + "Cohesion" + " Attribute.", {speakingTo: msg.playerid, gmEcho: true});
  //were there too many cohesion attributes?
  } else if(cohesionObjs.length >= 2){
    //warn the gm, but continue forward
    whisper("There were multiple " + "Cohesion" + " attributes. Using the first one found. A log has been posted in the terminal.")
    log("Cohesion" + " Attributes")
    log(cohesionObjs)
  }

  //make a cohesion test
  sendChat("player|" + msg.playerid, "/r D10<" + cohesionObjs[0].get("current") + " Cohesion Test");
}

//waits until CentralInput has been initialized
on("ready",function(){
  //Lets anyone make a cohesion test
  CentralInput.addCMD(/^!\s*cohesion\s*$/i, cohesionHandler, true);

  //Lets players freely view and edit cohesion with modifiers
  var re = makeAttributeHandlerRegex('cohesion');
  CentralInput.addCMD(re, function(matches,msg){
    matches[2] = "Cohesion";
    attributeHandler(matches,msg,{partyStat: true});
  }, true);
});
//lets players use and view their fate points
//matches[0] is the same as msg.content
function fateHandler(matches,msg){
  //work through each selected character
  eachCharacter(msg, function(character, graphic){
      var Fate = attributeValue("Fate",{characterid: character.id, graphicid: graphic.id});
      var name = character.get("name");

      //exit if the character does not have Fate Points
      if(Fate == undefined){
        //while exiting, tell the user which character did not have a Fate Attribute
        return whisper(name + " does not have a Fate Attribute!", {speakingTo: msg.playerid, gmEcho: true});
      }

      //be sure the player has enough fate points to spend
      if(Fate < 1){
        return whisper(name + " does not have enough Fate to spend.", {speakingTo: msg.playerid});
      } else {
        //announce that the player is spending a fate point
        announce(name + " spends a Fate Point!");
        //reduce the number of fate points by one
        attributeValue("Fate", {setTo: Fate - 1, characterid: character.id, graphicid: graphic.id});
        //report what remains
        var finalReport = name + " has [[" + Fate + "-1]] Fate Point";
        if(Fate-1 != 1){
          finalReport += "s";
        }
        whisper(finalReport + " left.", {speakingTo: msg.playerid});
      }
  });
}

//adds the commands after CentralInput has been initialized
on("ready",function(){
  //lets the user quickly spend one fate point (as long as they have fate points
  //to spend)
  CentralInput.addCMD(/^!\s*fate\s*$/i,fateHandler,true);
});
/*
medic command to heal a character up to their highest healing, while recording
how high they healed to. With these rules you can be healed as many times as you
want, but each time you record how high you healed up to. After that, you can
only heal up to that point until you receive proper care.
*/
 function medic(matches, msg){
  //get the number of wounds to be healed
  var Healing = Number(matches[1]);
  //be sure the number is valid
  if(!Healing){
      return whisper("Invalid amount to be healed.")
  }

  eachCharacter(msg, function(character, graphic){
    //the red bar is used to represent the characters wounds
    //it may or may not be linked to the wounds attribute, that is not important
    var Wounds = {
      current: Number(graphic.get("bar3_value")),
      max: Number(graphic.get("bar3_max"))
    }
    //if the wounds were not properly defined, then this is not a character
    if(Wounds.current == NaN || Wounds.max == NaN){
      return whisper(character.get("name") + " has no wounds.");
    }
    //add the current Wounds to the healing done
    var NewWounds = Wounds.current + Healing;
    //find the Max Healing attribute
    var MaxHealing = attributeValue("Max Healing", {graphicid: graphic.id, characterid: character.id, alert: false});
    //does the Max Healing attribute exist?
    if(MaxHealing != undefined) {
      //turn the max healing into a number
      MaxHealing = Number(MaxHealing);
      //be sure max healing is a valid number
      if(MaxHealing != NaN && MaxHealing > 0){
        //are the wounds more than the max healing allowed?
        if(NewWounds > MaxHealing){
          //reduce the new healed wounds to the cap
          NewWounds = MaxHealing;
        }
      }
    }
    //are the wounds more than the max wounds?
    if(NewWounds > Wounds.max){
      //reduce the new healed wounds to the cap
      NewWounds = Wounds.max;
    }
    //create/edit the Max Healing attribute and set it to the NewWounds
    attributeValue("Max Healing", {setTo: NewWounds, graphicid: graphic.id, characterid: character.id, alert: false});
    //set the max healing attribute's max value equal to its current value (if it exists!)
    //if a character has their max healing attribute set to its max value for some reason,
    //we don't want it to be some old value that we forgot about
    var MaxHealingobjs = findObjs({
      name: "Max Healing",
      _characterid: character.id,
      _type: "attribute"
    });
    if(MaxHealingobjs && MaxHealingobjs.length > 0){
      MaxHealingobjs[0].set("max", MaxHealingobjs[0].get("current"));
    }

    //now that all the healing has been done, set the character's wounds wounds equal to the NewWounds
    graphic.set("bar3_value", NewWounds);
    //report the total healing
    announce(character.get("name") + " has been healed to [[" + NewWounds.toString() + "]]/" + Wounds.max.toString() + " Wounds.");
  });
}

//adds the commands after CentralInput has been initialized
on("ready", function() {
  //Lets players use medicae on other characters while keeping track of the
  //healing done.
  CentralInput.addCMD(/^!\s*medic\s*(\d+)\s*$/i, medic, true);
});
function painSuppress(matches, msg) {
  var text = matches[1];
  if(msg.selected == undefined || msg.selected == []){
    if(playerIsGM(msg.playerid)){
      whisper('Please carefully select who is using pain suppressants.', {speakingTo: msg.playerid});
      return;
    }
  }
  eachCharacter(msg, function(character, graphic){
    var clip = attributeValue('Ammo - Pain Suppressant', {graphicid: graphic.id, alert: false});
    if (clip == undefined) clip = attributeValue('Ammo - Pain Suppressant', {setTo: 6, graphicid: graphic.id, alert: false, max: true});
    clip = Number(clip);
    if(clip <= 0) return whisper('Not enough pain suppressants.', {speakingTo: msg.playerid});
    clip--;
    var maxClip = attributeValue('Ammo - Pain Suppressant', {graphicid: graphic.id, alert: false, max: true});
    var clip = attributeValue('Ammo - Pain Suppressant', {setTo: clip, graphicid: graphic.id, alert: false});
    whisper(graphic.get('name') + ' has [[' + clip + ']]/' + maxClip + ' pain suppressants left.', {speakingTo: msg.playerid});
    addCounter(['', graphic.get('name') + '(' + text + ')', randomInteger(10).toString()], msg);
  });
}

on('ready', function(){
  CentralInput.addCMD(/^!\s*pain\s*suppress\s*(.+)\s*$/i, painSuppress, true);
});
//allows a player to reload a weapon of theirs
  //matches[1] is the weapon to be reloaded
function reloadWeapon(matches, msg){
  //save the input variables
  var ammoPhrase = "Ammo - " + matches[1];
  eachCharacter(msg, function(character, graphic){
    if(ammoPhrase == 'Ammo - all') {
      var localAttributes = new LocalAttributes(graphic);
      for(var prop in localAttributes.Attributes) {
        if(/^Ammo - /.test(prop)) localAttributes.remove(prop);
      }

      var clips = matchingObjs('attribute', ['Ammo - '], function(obj){
        return obj.get('_characterid') == character.id;
      });

      _.each(clips, function(clip){
        clip.remove();
      });

      return whisper(getLink(character) + ' has reloaded every clip.', {speakingTo: msg.playerid, gmEcho: true});
    }

    //get a list of all of the ammo attribute names that match
    var ammoNames = matchingAttrNames(graphic.id, ammoPhrase);
    //warn the player that that clip does not exist yet if nothing was found
    if(ammoNames.length <= 0){
      return whisper("A clip for *" + ammoPhrase.replace(/^Ammo - /, "") + "* does not exist yet.");
    }
    //determine which clip the player wants to reload before proceeding
    if(ammoNames.length >= 2){
      whisper("Which clip did you want to reload?");
      _.each(ammoNames, function(ammo){
        //use the clip's exact name
        var name = ammo.replace(/^Ammo - /, "");
        var suggestion = "reload " + name;
        //the suggested command must be encoded before it is placed inside the button
        suggestion = "!{URIFixed}" + encodeURIFixed(suggestion);
        whisper("[" + name + "](" + suggestion  + ")", {speakingTo: msg.playerid});
      });
      return;
    }
    //the clip the player wants has been made clear
    //use the stat handler to show the reload
    var fakeMsg = {
      playerid: msg.playerid,
      selected: [graphic]
    };
    attributeHandler(["","",ammoNames[0],"=","","max"], fakeMsg);
  });
}

on("ready", function(){
  CentralInput.addCMD(/!\s*reload\s+(\S.*)$/i, reloadWeapon, true);
});
//allows players to roll against a skill they may or may not have
  //matches[1] - skill name
  //matches[2] - skill subgroup
  //matches[3] - modifiers
  //matches[4] - alternate characteristic
function skillHandler(matches, msg){
  //store the input variables
  var toGM = matches[1];
  var skill = matches[2];
  var modifierMatches = matches[3].match(/(\+|-)\s*(\d+)([\sa-z]*)/gi);
  var modifiers = [];
  if(modifierMatches){
    for(var modifierMatch of modifierMatches){
      var details = modifierMatch.match(/(\+|-)\s*(\d+)([\sa-z]*)/i);
      modifiers.push({Value: details[1] + details[2], Name: details[3].trim()});
    }
  }
  log('modifiers');
  log(modifiers);

  var characteristic = matches[4];
  var inqtest = new INQTest({skill: skill, characteristic: characteristic});
  eachCharacter(msg, function(character, graphic){
    var isNPC = false;
    new INQCharacter(character, graphic, function(inqcharacter){
      var isNPC = inqcharacter.controlledby == '';
      inqtest.Modifiers = [];
      inqtest.addModifier(modifiers);
      inqtest.getStats(inqcharacter);
      inqtest.getSkillModifier(inqcharacter);
      inqtest.display(msg.playerid, inqcharacter.Name, toGM || isNPC);
    });
  });
}

on('ready', function(){
  var regex = '^!\\s*';
  regex += '(gm|)\\s*';
  var skills = INQTest.skills();
  regex += '((?:'
  for(var skill of skills){
    regex += toRegex(skill, {str: true}) + '|';
  }
  regex = regex.replace(/\|\s*$/, '');
  regex += ')';
  regex += '(?:\\([^\\(\\)]+\\))?\\s*';
  regex += ')';
  regex += '((?:(?:\\+|-)\\s*(?:\\d+)[\\sa-z]*,?\\s*)*)\\s*';
  regex += '(?:\\|\\s*';
  regex += '(';
  var characteristics = INQTest.characteristics();
  for(var characteristic of characteristics){
    regex += toRegex(characteristic, {str: true}) + '|';
  }
  regex = regex.replace(/\|\s*$/, '');
  regex += ')';
  regex += '\\s*)?\\s*';
  regex += '$';

  CentralInput.addCMD(RegExp(regex, 'i'), skillHandler, true);
});
//resets every stat of the selected characters to its maximum (creates an
//exception for Fatigue as it resets to 0).
function statReset(matches,msg){
    //prepare a record of everyone who was reset
  var resetAnnounce = "The following characters were reset: ";

  eachCharacter(msg, function(character, graphic){
    //create a list of all of the attributes this character has
    attribList = findObjs({
      _type: "attribute",
      _characterid: character.id
    });

    //work with every attribute the character has
    _.each(attribList,function(attrib){
      attrib.set("current",attrib.get("max"));
    });

    //reset each graphic bar
    for(var bar = 1; bar <= 3; bar++){
      graphic.set("bar" + bar.toString() + "_value", graphic.get("bar" + bar.toString() + "_max"));
    }

    //clear all status markers
    graphic.set("statusmarkers", "");

    //remove any local attributes or notes
    graphic.set("gmnotes", "");

    //add the character to the list of characters that were reset
    resetAnnounce += graphic.get("name") + ", ";
  });
  //report to the gm all of the characters that were reset
  //remove the last comma
  whisper(resetAnnounce.substring(0,resetAnnounce.lastIndexOf(",")));
}

//waits for CentralInput to be initialized
on("ready",function(){
  //resets the attributes and status markets of every selected token (or every
  //token on the map)
  CentralInput.addCMD(/^!\s*(?:(?:everything|all)\s*=\s*max|reset\s*(?:tokens?|all)?)\s*$/i,statReset);
});
//rolls a D100 against the designated stat and outputs the number of successes
//takes into account corresponding unnatural bonuses
//negative success equals the number of failures

//matches[0] is the same as msg.content
//matches[1] is either 'gm' or null
//matches[2] is that name of the stat being rolled (it won't always be capitalized properly) and is null if no modifier is included
//matches[3] is the list of modifiers
function statRoll(matches, msg){
  var toGM = matches[1] && matches[1].toLowerCase() == 'gm';
  var characteristic = matches[2];
  var modifierMatches = matches[3].match(/(\+|-)\s*(\d+)([\sa-z]*)/gi);
  var modifiers = [];
  if(modifierMatches){
    for(var modifierMatch of modifierMatches){
      var details = modifierMatch.match(/(\+|-)\s*(\d+)([\sa-z]*)/i);
      modifiers.push({Value: details[1] + details[2], Name: details[3].trim()});
    }
  }

  var inqtest = new INQTest({characteristic: characteristic, modifier: modifiers});
  eachCharacter(msg, function(character, graphic){
    var isNPC = false;
    new INQCharacter(character, graphic, function(inqcharacter){
      var isNPC = inqcharacter.controlledby == '';
      inqtest.getStats(inqcharacter);
      inqtest.display(msg.playerid, inqcharacter.Name, toGM || isNPC);
    });
  });
}

//trims down and properly capitalizes any alternate stat names that the user
//enters
function getProperStatName(statName){
  var isUnnatural = /^unnatural /i.test(statName);
  if(isUnnatural){
    statName = statName.replace(/^unnatural /i,'');
  }
  switch(statName.toLowerCase()){
    case 'pr': case 'pe':
      //replace pr with Per (due to conflicts with PsyRating(PR))
      statName = 'Per';
      break;
    case 'psy rating':
      statName = 'PR';
      break;
    case 'ws': case 'bs':
      //capitalize every letter
      statName = statName.toUpperCase();
      break;
    case 'int': case 'in':
      statName = 'It';
      break;
    case 'fel':
      statName = 'Fe';
      break;
    case 'cor':
      statName = 'Corruption';
      break;
    case 'dam':
      statName = 'Damage';
      break;
    case 'pen':
      statName = 'Penetration';
      break;
    case 'prim':
      statName = 'Primitive';
      break;
    case 'fell':
      statName = 'Felling';
      break;
    case 'damtype':
      statName = 'DamageType';
      break;
    default:
      //most Attributes begin each word with a capital letter (also known as TitleCase)
      statName = statName.toTitleCase();
  }
  statName = statName.replace(/^armour(?:_|\s*)(\w\w?)$/i, function(match, p1){
    return 'Armour_' + p1.toUpperCase();
  });
  if(isUnnatural){
    statName = 'Unnatural ' + statName;
  }
  return statName;
}

//returns barX, if the given stat is represented by barX on a token
//if it isn't represented by any bar, it returns undefined
function defaultToTokenBars(name){
  switch(name.toTitleCase()){
    case 'Fatigue':
    case 'Population':
    case 'Tactical Speed':
      return 'bar1';
    case 'Fate':
    case 'Morale':
    case 'Aerial Speed':
      return 'bar2';
    case 'Wounds':
    case 'Structural Integrity':
    case 'Hull':
      return 'bar3';
  }
  return undefined;
}

//adds the commands after CentralInput has been initialized
on('ready', function() {
  var rollableStats = INQTest.characteristics();
  var rollRegex = '^!\\s*(gm)?\\s*';
  rollRegex += '(';
  for(var rollableStat of rollableStats){
    rollRegex += toRegex(rollableStat, {str: true}) + '|';
  }
  rollRegex = rollRegex.replace(/\|\s*$/, '');
  rollRegex += ')';
  rollRegex += '((?:(?:\\+|-)\\s*(?:\\d+)[\\sa-z]*,?\\s*)*)\\s*$';
  var rollRe = new RegExp(rollRegex, 'i');
  CentralInput.addCMD(rollRe, statRoll, true);

  //lets the user quickly view their stats with modifiers
  var inqStats = ['WS', 'BS', 'S', 'T', 'Ag', 'I(?:n|t|nt)', 'Wp', 'P(?:r|e|er)', 'Fel?', 'Cor', 'Corruption', 'Wounds', 'Structural Integrity'];
  var inqLocations = ['H', 'RA', 'LA', 'B', 'RL', 'LR', 'F', 'S', 'R', 'P', 'A'];
  var inqAttributes = ['Psy Rating', 'Fate', 'Insanity', 'Renown', 'Crew', 'Fatigue', 'Population', 'Morale', 'Hull', 'Void Shields', 'Turret', 'Manoeuvrability', 'Detection', 'Tactical Speed', 'Aerial Speed'];
  var inqUnnatural = 'Unnatural (?:';
  for(var inqStat of inqStats){
    inqAttributes.push(inqStat);
    inqUnnatural += inqStat + '|';
  }
  inqUnnatural = inqUnnatural.replace(/|$/,'');
  inqUnnatural += ')';
  inqAttributes.push(inqUnnatural);
  var inqArmour = 'Armour_(?:';
  for(var inqLocation of inqLocations){
    inqArmour += inqLocation + '|';
  }
  inqArmour = inqArmour.replace(/|$/,'');
  inqArmour += ')';
  inqAttributes.push(inqArmour);
  var re = makeAttributeHandlerRegex(inqAttributes);
  CentralInput.addCMD(re, function(matches,msg){
    matches[2] = getProperStatName(matches[2]);
    var tokenBar = defaultToTokenBars(matches[2]);
    attributeHandler(matches,msg,{bar: tokenBar});
  },true);

  var profitFactorRe = makeAttributeHandlerRegex('Profit Factor');
  CentralInput.addCMD(profitFactorRe, function(matches,msg){
    matches[2] = 'Profit Factor';
    attributeHandler(matches,msg,{partyStat: true});
  }, true);
});
//damages every selected character according to the stored damage variables
function applyDamage (matches,msg){
  //get the attack details
  //quit if one of the details was not found
  if(INQAttack.getAttack() == undefined){return;}
  //apply the damage to every selected character
  eachCharacter(msg, function(character, graphic){
    //record the target
    INQAttack.character = character;
    //allow targets to use temporary variables from the graphic
    INQAttack.graphic = graphic;

    //record the target type
    INQAttack.targetType = characterType(character);

    //FUTURE WORK: determine if the target is wearing Primitive Armour
    //This isn't a priority as I have never encountered an enemy with Primitive
    //Armour

    //reset the damage
    var damage = Number(INQAttack.Dam.get("current"));
    log("damage: " + damage)

    //be sure the damage type matches the targetType
    if(!INQAttack.appropriateDamageType()){return;}

    //reduce the damage by the target's Armour
    damage = INQAttack.applyArmour(damage);

    //reduce the damage by the target's Toughness Bonus
    damage = INQAttack.applyToughness(damage);

    //a capital H in bar2 alerts the system that this graphic is a horde
    if(graphic.get("bar2_value") == "H"){
      damage = INQAttack.hordeDamage(damage);
      log('horde damage: ' + damage)
    }


    //be sure that the final result is a number
    damage = Number(damage);
    if(damage == undefined || damage == NaN){
      return whisper(graphic.get("name") + ": Damage undefined.");
    }

    //apply the damage to the graphic's bar3_value. If bar3 is linked to a
    //character sheet's wounds, the wounds will be immediately updated as well
    var remainingWounds = Number(graphic.get("bar3_value")) - damage;

    //report any crits
    remainingWounds = INQAttack.calcCrit(remainingWounds);

    //record the damage
    graphic.set("bar3_value", remainingWounds);
    if(damage > 0){
      damageFx(graphic, attributeValue('DamageType'));
    }

    //Reroll Location after each hit
    if(INQAttack.targetType == "character"){
      saveHitLocation(randomInteger(100));
    } else if (INQAttack.targetType == 'starship') {
      var population = graphic.get('bar1_value');
      var populationDef = attributeValue('Armour_Population', {graphicid: INQAttack.graphic.id, alert: false}) || 0;
      var populationDamage = damage - populationDef;
      if(populationDamage < 0) populationDamage = 0;
      population -= populationDamage;
      if(population < 0) population = 0;
      graphic.set('bar1_value', population);

      var morale = graphic.get('bar2_value');
      var moraleDef = attributeValue('Armour_Morale', {graphicid: INQAttack.graphic.id, alert: false}) || 0;
      var moraleDamage = damage - moraleDef;
      if(moraleDamage < 0) moraleDamage = 0;
      morale -= moraleDamage;
      if(morale < 0) morale = 0;
      graphic.set('bar2_value', morale);
    }

    //report an exact amount to the gm
    whisper(graphic.get("name") + " took " + damage + " damage.");
    //report an estimate to everyone
    announce(graphic.get("name") + ": [[" +  Math.round(damage * 100 / graphic.get("bar3_max")) + "]]% lost.");
  });
  //reset starship damage
  //starship damage is a running tally and needs to be reset when used
  if (INQAttack.DamType.get("current").toUpperCase() == "S") INQAttack.Dam.set("current", 0);
}

//waits until CentralInput has been initialized
on("ready",function(){
  //Lets the gm apply the saved damage to multiple characters
  CentralInput.addCMD(/^!\s*(?:dam(?:age)?|attack)\s*$/i,applyDamage);
});
//resets all the damage variables to their maximum values (the attack before any
//modifications)
function attackReset(matches,msg){
  //get the damage details obj
  var details = damDetails();
  //quit if one of the details was not found
  if(details == undefined) return;
  //reset the damage variables to their maximums
  for(var k in details) details[k].set("current", details[k].get("max"));
  //report the resut
  attackShow();
}

on('ready', function(){
  //Lets the gm reset an attack back to how it was first detected, before
  //modifications
  CentralInput.addCMD(/^!\s*attack\s*=\s*max$/i, attackReset);
});
function applyCover(matches,msg){
  var details = damDetails();
  if(details == undefined){return;}
  var cover = Number(matches[1]) || 0;
  var primitiveCover = matches[2] != '' || false;
  var dam = Number(details.Dam.get('current'));
  var pen = Number(details.Pen.get('current'));
  var primitiveAttack = Number(details.Prim.get('current'));

  var coverMultiplier = 1;
  if(primitiveCover){
    coverMultiplier /= 2;
  }

  if(primitiveAttack){
    coverMultiplier *= 2;
  }

  pen -= ( cover * coverMultiplier / 2);
  if (pen <= 0) {
    dam += pen * 2;
    pen = 0;
    if(dam <= 0) dam = 0;
  }

  details.Dam.set('current', Math.floor(dam));
  details.Pen.set('current', Math.floor(pen));
  whisper('Dam: ' + details.Dam.get('current') + ', Pen: ' + details.Pen.get('current'));
}

on('ready',function(){
  CentralInput.addCMD(/^!\s*cover\s*(\d+)\s*(|p|prim|primitive)\s*$/i, applyCover);
});
//a function that privately whispers a link to the relavant crit table
//matches[0] is the same as msg.content
//matches[1] is the type of critical hit table: vehicle, starship, impact, etc
//matches[2] is the location: head, body, legs, arm
function getCritLink(matches, msg, options){
  // be sure the options exists
  options = options || {};
  //default the options
  if(options.show == undefined) options.show = true;
  //what is the type of damage being used? Or is the target not a character?
  var damageType = matches[1].toLowerCase();
  //what is the hit location
  var hitLocation = matches[2];

  if(damageType == ''){
    var DamTypeObj = findObjs({ _type: 'attribute', name: 'DamageType' })[0];
    if(DamTypeObj == undefined){
      whisper("There is no Damage Type attribute in the campaign.", {speakingTo: msg.playerid, gmEcho: true});
      return critLink;
    }
    damageType = DamTypeObj.get("current").toLowerCase();
  }

  if(hitLocation == ""){
    //retrieve the hit location attributes in the campaign
    onesLocObj = findObjs({ _type: 'attribute', name: "OnesLocation"})[0];
    tensLocObj = findObjs({ _type: 'attribute', name: "TensLocation"})[0];
    //be sure they were found
    var successfulLoad = true;
    if(onesLocObj == undefined){
      successfulLoad = false;
      whisper("No attribute named OnesLocation was found anywhere in the campaign. Damage was not recorded.");
    }
    if(tensLocObj == undefined){
      successfulLoad = false;
      whisper("No attribute named TensLocation was found anywhere in the campaign. Damage was not recorded.");
    }
    if(successfulLoad){
      if(damageType[0] == "v"){
        switch(Number(onesLocObj.get("current"))){
          case 1: case 2:
            damageType = "Motive Systems";
          break;
          case 7: case 8:
            damageType = "Weapon";
          break;
          case 9: case 0:
            damageType = "Turret";
          break;
          default:
            damageType = "Hull";
          break;
        }
      } else {
        hitLocation = getHitLocation(tensLocObj.get("current"), onesLocObj.get("current"));
      }
    }
  }

  //determine table type based on user input
  switch (damageType){
    case "v": case "vehicle":
      damageType = "Vehicle";
    break;
    case "s": case "starship":
      damageType = "Starship";
    break;
    case "i": case "impact":
      damageType = "Impact";
    break;
    case "r": case "rending":
      damageType = "Rending";
    break;
    case "e": case "energy":
      damageType = "Energy";
    break;
    case "x": case "explosive":
      damageType = "Explosive";
    break;
  }

  //determine hit location based on user input
  if(/^(h|head)$/i.test(hitLocation)){
    hitLocation = "Head";
  } else if(/^((|l|r)\s*a|(|left|right)\s*arms?)$/i.test(hitLocation)){
    hitLocation = "Arm";
  } else if(/^(b|body)$/i.test(hitLocation)){
    hitLocation = "Body";
  } else if(/^((|l|r)\s*l|(|left|right)\s*legs?)$/i.test(hitLocation)){
    hitLocation = "Leg";
  } else if(/^motive\s*(systems)?$/i.test(hitLocation)){
    damageType = "Motive Systems";
    hitLocation = "";
  } else if(/^hull$/i.test(hitLocation)){
    damageType = "Hull";
    hitLocation = "";
  } else if(/^weapon$/i.test(hitLocation)){
    damageType = "Weapon";
    hitLocation = "";
  } else if(/^turret$/i.test(hitLocation)){
    damageType = "Turret";
    hitLocation = "";
  }

  if(damageType == 'Starship') hitLocation = '';
  //get the link to the Crit table
  var critTitle = damageType + " Critical Effects";
  if(hitLocation){
    critTitle += " - " + hitLocation;
  }
  var critLink = getLink(critTitle);

  //report the link
  if(options["show"]){
    //now that damage type and location have been determined, return the link to
    //the gm
    whisper("**Critical Hit**: " + critLink, {speakingTo: msg.playerid});
  }

  //return the crit link for use in other functions
  return critLink;
}

//waits until CentralInput has been initialized
on("ready",function(){
  //Lets anyone get a quick link to critical effects table based on user input
  //or based on the damage type and hit location stored in the damage variables
  CentralInput.addCMD(/^!\s*crit\s*\?\s*(|v|vehicle|s|starship|i|impact|e|energy|r|rending|x|explosive)\s*(|h|head|(?:|l|r)\s*(?:a|l)|(?:|left|right)\s*(?:arm|leg)s?|b|body|motive(?: systems)?|hull|weapon|turret)\s*$/i,getCritLink,true);
});
//used throughout DamageCatcher.js to whisper the full attack variables in a
//compact whisper
//matches[0] is the same as msg.content
//matches[1] is a flag for (|max)
function attackShow(matches,msg){
  //get the damage details obj
  var details = damDetails();
  //quit if one of the details was not found
  if(details == undefined){
    return;
  }

  if(matches && matches[1] && matches[1].toLowerCase() == "max"){
    matches[1] = "max";
  } else {
    matches = [];
    matches[1] = "current";
  }
  //starship damage only cares about the straight damage and if there is any
  //penetration at all
  if(details.DamType.get(matches[1]).toLowerCase() == "s"){
    if(details.Pen.get(matches[1])){
      whisper("Dam: [[" + details.Dam.get(matches[1]) + "]] Starship, Pen: true");
    } else {
      whisper("Dam: [[" + details.Dam.get(matches[1]) + "]] Starship, Pen: false");
    }
  //output normal damage
  } else {
    var output = "Dam: [[" + details.Dam.get(matches[1]) + "]] " + details.DamType.get(matches[1]);
    output += ", Pen: [[" +  details.Pen.get(matches[1]) + "]]";
    output += ", Felling: [[" + details.Fell.get(matches[1]) + "]]";
    output += ", Hits: [[" + details.Hits.get(matches[1]) + "]]";
    if(Number(details.Prim.get(matches[1]))) {
      whisper( output + ", Primitive");
    } else {
      whisper(output);
    }
  }
}

//waits until CentralInput has been initialized
on("ready",function(){
  //Lets gm  view and edit damage variables with modifiers
  CentralInput.addCMD(/^!\s*(|max)\s*(dam|damage|pen|penetration|hits|fell|felling|prim|primitive)\s*(\?\s*\+|\?\s*-|\?\s*\*|\?\s*\/|=|\+\s*=|-\s*=|\*\s*=|\/\s*=)\s*(|\+|-)\s*(\d+|current|max|\$\[\[0\]\])\s*$/i, function(matches,msg){
    matches[2] = getProperStatName(matches[2]);
    attributeHandler(matches,msg,{partyStat: true});
  });
  //Lets gm view damage variables without modifiers
  CentralInput.addCMD(/^!\s*(|max)\s*(dam|damage|pen|penetration|hits|damtype|damage type|fell|felling|prim|primitive)\s*(\?)()()\s*$/i, function(matches,msg){
    matches[2] = getProperStatName(matches[2]);
    attributeHandler(matches,msg,{partyStat: true});
  });
  //Lets the gm set the damage type
  CentralInput.addCMD(/^!\s*(|max)\s*(damtype|damage type)\s*(=)\s*()(i|r|e|x|s)\s*$/i, function(matches,msg){
    matches[2] = 'DamageType';
    matches[5] = matches[5].toUpperCase();
    attributeHandler(matches,msg,{partyStat: true});
  });
  //Lets the gm view the attack variables in a susinct format
  CentralInput.addCMD(/^!\s*(|max)\s*attack\s*\?\s*$/i,attackShow);
});
//toggles whether or not each selected graphic is frenzied and modifies their
//stats accordingly using the attributeHandler function
function getFrenzied(matches,msg){
  //are we frenzying everyone we have selected?
  frenzyTokens = matches[1].toLowerCase() != "un"
  //we will be editting the current stat of characters only
  matches[1] = "";
  //be prepared to reverse all stat modifications if we are unfrenzying tokens
  if(frenzyTokens){
    matches[4] = "";
  } else {
    matches [4] = "-";
  }

  //make a list of the characters that will have their attributes modified
  toBeModified = [];

  //check each selected character to see if they
  eachCharacter(msg, function(character, graphic){
    //start by assuming we will not be modifying this
    //if we are un-frenzying the token, be sure it was already frenzied
    if(!frenzyTokens && graphic.get("status_red")){
      graphic.set("status_red",false);
      whisper(graphic.get("name") + " is no longer frenzied.", {speakingTo: msg.playerid, gmEcho: true});
      //add this character to the list of characters to have their stats modified
      toBeModified.push(graphic);
    //if we are frenzying the token, be sure it wasn't already frenzied
    } else if(frenzyTokens && !graphic.get("status_red")) {
      graphic.set("status_red",true);
      whisper(graphic.get("name") + " is frenzied!", {speakingTo: msg.playerid, gmEcho: true});
      //add this character to the list of characters to have their stats modified
      toBeModified.push(graphic);
    }
  });

  //alert the gm if nothing will happen
  if(toBeModified.length <= 0){
    if(frenzyTokens) {
      whisper("No tokens were frenzied.", {speakingTo: msg.playerid, gmEcho: true});
    } else {
      whisper("No tokens were unfrenzied", {speakingTo: msg.playerid, gmEcho: true});
    }
    return;
  }

  //modify the attributes of all the tokens that had their frenzy status changed

  //limit the selected tokens to only those that
  msg.selected = toBeModified;

  //increased stats
  matches[2] = "WS";
  matches[3] = "+=";
  matches[5] = "10";
  attributeHandler(matches, msg, {show: false});
  matches[2] = "S";
  attributeHandler(matches, msg, {show: false});
  matches[2] = "T";
  attributeHandler(matches, msg, {show: false});
  matches[2] = "Wp";
  attributeHandler(matches, msg, {show: false});

  //decreased stats
  matches[2] = "BS";
  matches[3] = "-=";
  matches[5] = "20";
  attributeHandler(matches, msg, {show: false});
  matches[2] = "It";
  attributeHandler(matches, msg, {show: false});
}

//adds the commands after CentralInput has been initialized
on("ready", function() {
  //Lets players make characters frenzied
  CentralInput.addCMD(/^!\s*(un|)Frenzy\s*$/i,getFrenzied,true);
});
//a function which accepts input to override the targeted location of a creature, vehicle, or starship
//matches[0] is the same as msg.content
//matches[1] is the indicator for left or right (l|r|left|right)
//matches[2] is the abriviation or full name of the desired location
function hitlocationHandler(matches,msg){
  //load up the hit location attributes
  onesLocObj = findObjs({_type: "attribute", name: "OnesLocation"})[0];
  tensLocObj = findObjs({_type: "attribute", name: "TensLocation"})[0];

  //are they defined?
  var objsAreDefined = true;
  if(onesLocObj == undefined){
    whisper("The OnesLocation attribute was not found anywhere in the campaign.");
    objsAreDefined = false;
  }
  if(tensLocObj == undefined){
    whisper("The TensLocation attribute was not found anywhere in the campaign.");
    objsAreDefined = false;
  }
  //if at least one of the objects was not found, exit
  if(!objsAreDefined) return;
  var targeting = "";
  //did the user specify left or right?
  switch(matches[1].toLowerCase()){
    case "l": case "left":
      tensLocObj.set("current","1");
      targeting = "Left ";
    break;
    case "r": case "right":
      tensLocObj.set("current","0");
      targeting = "Right ";
    break;
  }

  //store the specified side numerically
  switch(matches[2].toLowerCase()){
    //characters
    case "h": case "head":
      onesLocObj.set("current","0");
      targeting = "Head";
    break;
    case "a": case "arm":
      onesLocObj.set("current","8");
      targeting += "Arm";
    break;
    case "b": case "body":
      onesLocObj.set("current","4");
      targeting = "Body";
    break;
    case "l": case "leg":
      onesLocObj.set("current","1");
      targeting += "Leg";
    break;

    //vehicle and starship armour facings
    case "front": case "f": case "fore":
      tensLocObj.set('current', "0");
      targeting = "Front";
    break;
    case "side": case "s":
      tensLocObj.set('current', "-1");
      targeting = "Side";
    break;
    case "starboard":
      tensLocObj.set('current', "-1");
      targeting = "starboard";
    break;
    case "rear": case "r": case "aft":
      tensLocObj.set('current', "-2");
      targeting = "Rear";
    break;
    case "port": case "p":
      tensLocObj.set('current', "-3");
      targeting = "Port";
    break;

    //vehicle hit locations
    case "motive": case "motive systems":
      onesLocObj.set('current', "1");
      targeting = "Motive Systems";
    break;
    case "hull":
      onesLocObj.set('current', "3");
      targeting = "Hull";
    break;
    case "weapon":
      onesLocObj.set('current', "7");
      targeting = "Weapon";
    break;
    case "turret":
      onesLocObj.set('current', "9");
      targeting = "Turret";
    break;
  }

  //report to the gm what we are now targeting
  whisper("Targeting: " + targeting);
}

on('ready', function(){
  //Lets the gm specify the hit location
  CentralInput.addCMD(/^!\s*target\s*=\s*(|l|r|left|right)\s*(h|head|a|arm|b|body|l|leg|f|front|s|side|starboard|p|port|r|rear|aft|hull|weapon|turret|motive(?: systems)?)\s*$/i, hitlocationHandler);
});
function hordeKill(matches, msg){
  if(msg.selected == undefined || msg.selected.length <= 0){
    return whisper("Please select a token.");
  }

  if(matches[1]){
    var toKill = Number(matches[1]);
    var useHits = false;
  } else {
    var toKill = Number(attributeValue("Hits"));
    var useHits = true;
  }

  _.each(msg.selected, function(obj){
    var graphic = getObj("graphic", obj._id);
    //be sure the graphic exists
    if(graphic == undefined) {
      log("graphic undefined")
      log(obj)
      return whisper("graphic undefined");
    }
    if(toKill > 0 && graphic.get("status_dead") == false){
      toKill--;
      graphic.set("status_dead", true);
      damageFx(graphic, attributeValue('DamageType'));
    }
  });
  if(useHits){
    attributeValue("Hits", {setTo: toKill});
  }

  if(toKill > 0){
    var suggestedCMD = "!hordeDam"
    if(!useHits){
      suggestedCMD +=  toKill;
    }
    whisper("Not enough creatures to kill. Could not kill [" + toKill + "](" + suggestedCMD + ").");
  } else {
    whisper("Creatures killed.");
  }
}

on("ready", function(){
  CentralInput.addCMD(/^!\s*horde\s*dam(?:age)?\s*(\d*)\s*$/i, hordeKill);
});
//a function which rolls initiative for every selected character. Once rolled it
//adds the character to the roll20 turn tracker. If the character is already
//listed on the turn tracker, they will be replaced. Character and vehicle
//initiative is determined by Agility. Starship initiative is determined by
//Detection. Currently, initiativeHandler reads the associated Character Sheets
//of the tokens and accounts for
  //Lightning Reflexes
  //Paranoia

//matches[0] is the same as mgs.content
//matches[1] is the text operator "=", "+=", "?", "?/", etc
//matches[2] is the sign of the modifier
//matches[3] is the absolute value of the modifier

//secondAttempt is a flag showing that this function has been attempted once
//  before, so as to prevent an infinite loop

//The reason this function attempts to run a second time is due to an issue with
//the roll20 api. When attempting to read the notes/bio or gmnotes of a handout
//or character sheet, it will always return an empty string on the first
//attempt. In the past I just asked the user to  Again". However, this
//work around will have the function silently attempt to read the notes
//a second time. If this second attempt does not work, it will warn the user.
function initiativeHandler(matches,msg,secondAttempt){
  //get the Roll20 turn order
  var turns = new INQTurns();

  var operator = matches[1];
  var modifier = matches[2] + matches[3];

  var Promises = [];


  //work through each selected character
  eachCharacter(msg, function(character, graphic){
    //diverge based on the type of text operator specified
    //  Includes "?": Just a query and does not roll anything or edit the
    //    turn order.
    //  Includes "=": Edit's the token's previous initiative roll, if no
    //    previous roll is saved within the turn order, just make a new roll
    //    and edit that one.
    //  Otherwise: Make a new initiative roll for the character. If they
    //    already exist in the turn order, replace their previous roll. also
    //    adds in any listed modifiers.
    //is the user just making a querry?
    if(operator.indexOf("?") != -1){
      //find the initiative bonus of the character
      calcInitBonus(character, graphic, function(initBonus){
        //warn the user and exit if the bonus does not exist
        if(initBonus == undefined){
          return whisper(graphic.get("name") + " did not have an Ag or Detection attribute. Initiative was not rolled.", {speakingTo: msg.playerid, gmEcho: true});
        }

        //modify the Initiative Bonus based on the text operator
        initBonus = numModifier.calc(initBonus, operator, modifier);

        //report the initiative bonus for the character to just the user
        //exit out now that you have made this report
        whisper(graphic.get("name") + "\'s Initiative: " + initBonus + " + D10", {speakingTo: msg.playerid});
      });

      return;
    }

    //is the gm trying to directly edit a previous initiative roll?
    Promises.push(
      new Promise(function(resolve){
        var init = {Bonus: undefined, roll: 0};
        if(operator == "="){
          init.Bonus = Number(modifier);
        } else if(operator.indexOf("=") != -1){
          //get the initiative of the previous roll to edit, or find that it doesn't exist
          init.Bonus = turns.getInit(graphic.id);
          if(init.Bonus != undefined){
            //calculate the modified initiative
            init.roll = numModifier.calc(init.Bonus, operator, modifier) - init.Bonus;
          }
        }

        //roll initiative with modifiers
        if(init.Bonus == undefined){
          //otherwise calculate the bonus as normal.
          calcInitBonus(character, graphic, function(initBonus){
            if (initBonus != undefined) {
              //randomize the roll
              init.roll = randomInteger(10);
              //see how to modify the initBonus
              init.Bonus = numModifier.calc(initBonus, operator, modifier);
            }

            whisper(graphic.get('name') + ' rolls a [[(' + init.roll.toString() + ')+' + init.Bonus.toString() + ']] for Initiative.',
              {speakingTo: character.get('inplayerjournals').split(','), gmEcho: true});
            //add the turn
            turns.addTurn(graphic, init.Bonus + init.roll);
            resolve();
          });
          return;
        }

        whisper(graphic.get('name') + ' rolls a [[(' + init.roll.toString() + ')+' + init.Bonus.toString() + ']] for Initiative.',
          {speakingTo: character.get('inplayerjournals').split(','), gmEcho: true});
        //add the turn
        turns.addTurn(graphic, init.Bonus + init.roll);
        resolve();
      })
    );
  });

  Promise.all(Promises).catch(function(e){log(e)});
  Promise.all(Promises).then(function(){
    turns.save();
  });
}

//adds the commands after CentralInput has been initialized
on("ready",function(){
  //matches[0] is the same as msg.content
  //matches[1] is the text operator "=", "+=", "?", "?/", etc
  //matches[2] is the sign of the modifier
  //matches[3] is the absolute value of the modifier

  //lets the user quickly view their initiative bonus with modifiers
  CentralInput.addCMD(/^!\s*init(?:iative)?\s*(\?\+|\?-|\?\*|\?\/)\s*(|\+|-)\s*(\d+)\s*$/i,initiativeHandler,true);
  //same as above, except this is a querry without any modifiers
  CentralInput.addCMD(/^!\s*init(?:iative)?\s*(\?)()()$/i,initiativeHandler,true);

  //similar to above, but allows the gm to roll and edit initiative with modifiers
  CentralInput.addCMD(/^!\s*init(?:iative)?\s*(\+|-|\*|\/|=|\+=|-=|\*=|\/=)\s*(|\+|-)\s*(\d+)\s*$/i,initiativeHandler);
  //similar to above, but allows the gm to roll and edit initiative without modifiers
  CentralInput.addCMD(/^!\s*init(?:iative)?\s*()()()$/i,initiativeHandler);
  //allow the gm to clear the turn tracker
  CentralInput.addCMD(/^!\s*init(?:iative)?\s+(clear|reset)$/i, function(){
    Campaign().set("turnorder", "");
    whisper("Initiative cleared.")
  });
});
//a function which converts the numer of successes into a number of Hits
//if a number of hits is not specified, it will default to the number of
//successes saved in the last roll. The number will be negative as the number
//of Hits is 1 by default. This function converts that negative number into
//a positive number by the Full Auto formula.
function fullautoConverter(matches,msg){
  //record the number of hits
  var HitsObj = findObjs({ _type: 'attribute', name: "Hits" })[0];
  //besure there is a Hits Attribute to work with
  if(HitsObj == undefined){
    return whisper("No attribute named Hits was found anywhere in the campaign.");
  }

  //did the user specify a number of Successes?
  if(matches[1] != ""){
    var Hits = Number(matches[1]) + 1;
  //otherwise, default to the numer of succeses recorded from the last roll to
  //hit
  } else {
    //check if the stored number of successes has already been converted
    if(HitsObj.get("current") > 0){
      return whisper("Number of successes has already been converted into " + HitsObj.get("current") + " hits. Aborting.");
    }
    //convert the number of successes into hits
    var Hits = (-1) * HitsObj.get("current");
  }

  //Round the number of hits, just in case
  Hits = Math.round(Hits);

  //Save the number of hits.
  HitsObj.set("current",Hits);

  //Report the number of hits
  whisper("Hits: " + HitsObj.get("current"));
}

//a function which converts the numer of successes into a number of Hits
//if a number of hits is not specified, it will default to the number of
//successes saved in the last roll. The number will be negative as the number
//of Hits is 1 by default. This function converts that negative number into
//a positive number by the Semi Auto formula.
function semiautoConverter(matches,msg){
  //record the number of hits
  var HitsObj = findObjs({ _type: 'attribute', name: "Hits" })[0];
  //besure there is a Hits Attribute to work with
  if(HitsObj == undefined){
    return whisper("No attribute named Hits was found anywhere in the campaign.");
  }

  //did the user specify a number of Successes?
  if(matches[1] != ""){
    var Hits = Math.floor(Number(matches[1]) / 2) + 1;
  //otherwise, default to the numer of succeses recorded from the last roll to
  //hit
  } else {
    //check if the stored number of successes has already been converted
    if(HitsObj.get("current") > 0){
      return whisper("Number of successes has already been converted into " + HitsObj.get("current") + " hits. Aborting.");
    }
    //convert the number of successes into hits
    var Hits = Math.floor( ((-1) * Number(HitsObj.get("current")) - 1) / 2 ) + 1;
  }

  //Round the number of hits, just in case
  Hits = Math.round(Hits);

  //Save the number of hits.
  HitsObj.set("current",Hits);

  //Report the number of hits
  whisper("Hits: " + HitsObj.get("current"));
}

//waits until CentralInput has been initialized
on("ready",function(){
  //Lets the gm convert the number of successes into Hits, as per the Full Auto formula
  CentralInput.addCMD(/^!\s*full\s*(?:auto)?\s*=?\s*(\d*)\s*$/i,fullautoConverter);
  //Lets the gm convert the number of successes into Hits, as per the Semi Auto formula
  CentralInput.addCMD(/^!\s*semi\s*(?:auto)?\s*=?\s*(\d*)\s*$/i,semiautoConverter);
});
//applies status markers for the various starship critical hits based on user
//input
//matches[0] is the same as msg.content
//matches[1] is number rolled on the crit table or a short name for the critical
//  effect
//matches[2] is the sign of the number of times to apply the crit
//matches[3] is the number of times to apply the crit (by default this is one)
function applyCrit(matches,msg){
  //record the name of the critical effect
  var critName = matches[1].toLowerCase();
  //default to applying this crit once
  if(matches[3] == undefined || matches[3] == "" ){
    critQty = 1;
  } else {
    critQty = Number(matches[2] + matches[3]);
  }

  //apply the crit effect to every selected token
  eachCharacter(msg, function(character, graphic){
    //which status marker corresponds to the critical effect?
    var statMarker = "";
    var effectName = "[Error]";
    switch(critName){
      case "depressurized": case "1":
        statMarker = "status_edge-crack";
        effectName = "Component Depressurized"
      break;
      case "damaged": case "2":
        statMarker = "status_spanner";
        effectName = "Component Damaged"
      break;
      case "sensors": case "3":
        statMarker = "status_bleeding-eye";
        effectName = "Sensors Damaged"
      break;
      case "thrusters": case "4":
        statMarker = "status_cobweb";
        effectName = "Thrusters Damaged"
      break;
      case "fire": case "5":
        statMarker = "status_half-haze";
        effectName = "Fire!"
      break;
      case "engines": case "6":
        statMarker = "status_snail";
        effectName = "Engine Damaged"
      break;
      case "unpowered": case "7":
        statMarker = "status_lightning-helix";
        effectName = "Component Unpowered"
      break;
    }

    //what is the number marker on this badge?
    var degeneracy = graphic.get(statMarker);
    if(typeof degeneracy == 'string') {
      degeneracy = Number(degeneracy);
    } else {
      degeneracy = (degeneracy) ? 1 : 0;
    }
    //add the input
    degeneracy += critQty;
    //are there still any badges?
    if(degeneracy > 0){
      //update the badge
      graphic.set(statMarker,degeneracy.toString());
    } else {
      //remove the badge
      graphic.set(statMarker,false);
    }
    //report which crit was applied and how many times it was applied
    whisper(graphic.get("name") + ": " + effectName + " (" + critQty + ")");
  });
}

//waits until CentralInput has been initialized
on("ready",function(){
  //Lets the gm quickly mark starships with status markers to remember
  CentralInput.addCMD(/^!\s*crit\s*\+\s*=\s*([1-7]|depressurized|damaged|sensors|thrusters|fire|engines|unpowered)\s*(?:\s*(|\+|-)\s*(\d+))?\s*$/i,applyCrit);
  CentralInput.addCMD(/^!\s*crit\s*\-\s*=\s*([1-7]|depressurized|damaged|sensors|thrusters|fire|engines|unpowered)\s*(?:\s*(|\+|-)\s*(\d+))?\s*$/i,function(matches,msg){
    //switch the sign of the quantity
    if(matches[2] == "-"){
      matches[2] = "";
    } else {
      matches[2] = "-";
      //specify a quantity if none is given
      if(!matches[3]){
        matches[3] = "1";
      }
    }
    applyCrit(matches,msg);
  });
});
function useWeapon (matches, msg) {
  //clean out any of the previous details
  INQAttack.clean();
  //get the options
  INQAttack.options = carefulParse(matches[2]) || {};
  //save the weapon name
  INQAttack.weaponname = matches[1];
  //save the message for use elsewhere
  INQAttack.msg = msg;
  //if nothing was selected and the player is the gm, auto hit with no roll
  if(INQAttack.msg.selected == undefined || INQAttack.msg.selected == []){
    if(playerIsGM(INQAttack.msg.playerid)){
      INQAttack.msg.selected = [{_type: "unique"}];
    }
  }
  //repeat for each character selected
  eachCharacter(INQAttack.msg, function(character, graphic){
    //allow the loop to skip over future iterations if something went wrong
    if(INQAttack.break){return;}
    //reset the report
    INQAttack.Reports = {};
    //prepare attack variables for each character's attack
    INQAttack.prepareVariables();
    //detail the character (or make a dummy character)
    var characterPromise = new Promise(function(resolve){
      INQAttack.detailTheCharacter(character, graphic, function(){
        resolve();
      });
    });
    var weaponPromise = new Promise(function(resolve){
      INQAttack.detailTheWeapon(function(valid){
        resolve(valid);
      });
    });
    Promise.all([characterPromise, weaponPromise]).catch(function(e){log(e)});
    Promise.all([characterPromise, weaponPromise]).then(function(valid){
      if(valid.includes(false)) return;
      if(character != undefined){
        //roll to hit
        INQAttack.rollToHit();
        //use up the ammo for the attack
        //cancel this attack if there isn't enough ammo
        if(!INQAttack.expendAmmunition()){return;}
      }

      //check if the weapon jammed
      INQAttack.checkJammed();
      //only show the damage if the attack hit
      if(INQAttack.hits == 0){
        //offer reroll
        INQAttack.offerReroll();
      } else {
        //roll damage
        INQAttack.rollDamage();
      }
      //report the results
      INQAttack.deliverReport();
    });
  });
}

on("ready", function(){
  var regex = "^!\\s*use\\s*weapon";
  regex += "\\s+(\\S[^\\{\\}]*)"
  regex += "(\\{.*\\})$"
  var re = RegExp(regex, "i");
  CentralInput.addCMD(re, useWeapon, true);
});
//allows the GM to add the details and attributes of a character to a vehicle,
//to function as the default pilot
//matches[1] - used to find the pilot to add
function addPilot(matches, msg){
  var pilotPhrase = matches[1];
  var pilotKeywords = pilotPhrase.split(' ');

  //if nothing was selected, ask the GM to select someone
  if(msg.selected == undefined || msg.selected.length <= 0){
    return whisper("Please select a vehicle to take the pilot.");
  }

  //find the pilot specified
  var pilotResults = matchingObjs("character", pilotKeywords);

  //rage quit if no maps were found
  if(pilotResults.length <= 0){
    return whisper("No matching pilots were found.");
  }

  //see if we can trim down the results to just exact matches
  pilotResults = trimToPerfectMatches(pilotResults, pilotPhrase);

  //if there are still too many pilot results, make the user specify
  if(pilotResults.length >= 2){
    //let the gm know that multiple maps were found
    whisper("Which pilot did you mean?");
    //give a suggestion for each possible pilot match
    _.each(pilotResults, function(pilot){
      var suggestion = "addPilot " + pilot.get("name");
      suggestion = "!{URIFixed}" + encodeURIFixed(suggestion);
      whisper("[" + pilot.get("name") + "](" + suggestion  + ")");
    });
    //stop here, we must wait for the user to specify
    return;
  }

  //copy the pilot's Attributes
  var pilotAttributes = [];
  var attributes = findObjs({
    _type: "attribute",
    _characterid: pilotResults[0].id
  });
  _.each(attributes, function(attribute){
    var attributeCopy = {
      name: attribute.get("name"),
      value: attribute.get("max")
    };
    pilotAttributes.push(attributeCopy);
  });

  //add the single pilot to each selected roll20 character(vehicle)
  eachCharacter(msg, function(vehicle, graphic){
    var vehicleAttributes = findObjs({
      _type: 'attribute',
      _characterid: vehicle.id
    });

    var skipThisCharacter = false;

    _.each(vehicleAttributes, function(vehicleAttribute){
      _.each(pilotAttributes, function(pilotAttribute){
        if(vehicleAttribute.get('name') == pilotAttribute.name) {
          skipThisCharacter = true;
        }
      });
    });

    if(skipThisCharacter) return whisper('This vehicle already has a pilot.');

    //add each of the pilot attributes
    _.each(pilotAttributes, function(attribute){
      createObj('attribute', {
        name: attribute.name,
        current: attribute.value,
        max: attribute.value,
        _characterid: vehicle.id
      });
    });

    //alert the gm of the success
    whisper("The pilot, " + pilotResults[0].get("name") + ", was added to " + vehicle.get("name") + ".");
  });
}

//waits until CentralInput has been initialized
on("ready", function(){
  CentralInput.addCMD(/^!\s*add\s*pilot\s+(.+)$/i, addPilot);
});
//be sure the inqattack object exists before we start working with it
var INQAttack = INQAttack || {};

//gives the listed weapon to the character, adding it to their character sheet
//and adding a token action to the character
//you can specify the special ammunition options for the weapon
  //matches[1] - weapon to give to the characters
  //matches[2] - list of special Ammunition
  //matches[3] - the clip size of the weapon. If it didn't already have a clip,
               //it will make the assumption that it is the quantity of
               //consumable items and add the note on the player sheet.
 function addWeapon(matches, msg){
  //if nothing was selected and the player is the gm, quit
  if(msg.selected == undefined || msg.selected == []){
    if(playerIsGM(msg.playerid)){
      whisper("Please carefully select who we are giving these weapns to.", {speakingTo: msg.playerid});
      return;
    }
  }
  //save the variables
  var name = matches[1];
  if(matches[2]){
    var ammoStr = matches[2];
    var ammoNames = matches[2].split(",");
  }
  if(matches[3]){
    var quantity =matches[3];
  }
  //search for the weapon first
  var weapons = matchingObjs("handout", name.split(" "));
  //try to trim down to exact weapon matches
  weapons = trimToPerfectMatches(weapons, name);
  //did none of the weapons match?
  if(weapons.length <= 0){
    whisper("*" + name + "* was not found.", {speakingTo: msg.playerid});
    return false;
  }
  //are there too many weapons?
  if(weapons.length >= 2){
    whisper("Which weapon did you intend to add?", {speakingTo: msg.playerid});
    _.each(weapons, function(weapon){
      //use the weapon's exact name
      var suggestion = "addweapon " + weapon.get("name");
      if(ammoStr){
        suggestion += "(" + ammoStr + ")";
      }
      //the suggested command must be encoded before it is placed inside the button
      suggestion = "!{URIFixed}" + encodeURIFixed(suggestion);
      whisper("[" + weapon.get("name") + "](" + suggestion  + ")", {speakingTo: msg.playerid});
    });
    //don't continue unless you are certain what the user wants
    return false;
  }
  var myPromise = new Promise(function(resolve){
    var inqweapon = new INQWeapon(weapons[0], function(){
      resolve(inqweapon);
    });
  });
  myPromise.catch(function(e){log(e)});
  myPromise.then(function(inqweapon){
    //was there any ammo to load?
    if(ammoStr){
      //get the exact name of every clip
      for(var i = 0; i < ammoNames.length; i++){
        //if the ammo name is empty, just use the unmodified weapon
        if(ammoNames[i] == ""){continue;}
        //search for the ammo
        var clips = matchingObjs("handout", ammoNames[i].split(" "));
        //try to trim down to exact ammo matches
        clips = trimToPerfectMatches(clips, ammoNames[i]);
        //did none of the weapons match?
        if(clips.length <= 0){
          whisper("*" + ammoNames[i] + "* was not found.", {speakingTo: msg.playerid});
          return false;
        }
        //are there too many weapons?
        if(clips.length >= 2){
          whisper("Which Special Ammunition did you intend to add?", {speakingTo: msg.playerid});
          _.each(clips, function(clip){
            //specify the exact ammo name
            ammoNames[i] = clip.get("name");
            //construct the suggested command (without the !)
            var suggestion = "addweapon " + name + "(" + ammoNames.toString() + ")";
            //the suggested command must be encoded before it is placed inside the button
            suggestion = "!{URIFixed}" + encodeURIFixed(suggestion);
            whisper("[" + clip.get("name") + "](" + suggestion  + ")", {speakingTo: msg.playerid});
          });
          //something went wrong
          return false;
        }
        //be sure the name is exactly correct
        ammoNames[i] = clips[0].get("name");
      }
    }
    //only weapons that have a clip of 0 are assumed to be consumable
    //weapons that have an alternate clip size do not need a note on the character bio
    if(quantity != undefined && inqweapon.Clip == 0){
      var quantityNote = quantity;
    }
    //add this weapon to each of the selected characters
    eachCharacter(msg, function(character, graphic){
      var characterPromise = new Promise(function(resolve){
        //parse the character
        new INQCharacter(character, graphic, function(inqcharacter){
          resolve(inqcharacter);
        });
      });
      characterPromise.catch(function(e){log(e)});
      characterPromise.then(function(inqcharacter){
        //only add an ability if it isn't gear
        if(inqweapon.Class != "Gear"){
          //add the token action to the character
          insertWeaponAbility(inqweapon, character, quantity, ammoNames, inqcharacter);
        } else {
          whisper("Add Weapon is not prepared to create an Ability for Gear.", {speakingTo: msg.playerid, gmEcho: true});
        }
        //report the success
        whisper("*" + inqcharacter.toLink() + "* has been given a(n) *" + inqweapon.toLink() + "*", {speakingTo: msg.playerid, gmEcho: true});
      });
    });
  });
}

on("ready", function(){
  var regex = "^!\\s*add\\s*weapon";
  regex += "\\s+(\\S[^\\(\\)\\[\\]]*)";
  regex += "(?:";
  regex += "\\(([^\\(\\)]+)\\)";
  regex += ")?";
  regex += "(?:";
  regex += "\\[\\s*x\\s*(\\d+)\\s*\\]";
  regex += ")?";
  regex += "\\s*$";
  var re = RegExp(regex, "i");
  CentralInput.addCMD(re, addWeapon, true);
});
function lastWatchWave (matches, msg) {
  var Troops = Number(matches[1]);
  var Elite = 0;
  var Master = 0;
  var Chance = matches[2] || 4;
  Chance = Number(Chance);
  var MasterPotential = Math.floor(Troops / 16);
  for (var i = 0; i < MasterPotential; i++) {
    if (randomInteger(10) >= 4) {
      Troops -= 16;
      Master++;
    }
  }
  var ElitePotential = Math.floor(Troops / 4);
  for (var i = 0; i < ElitePotential; i++) {
    if (randomInteger(10) >= 4) {
      Troops -= 4;
      Elite++;
    }
  }

  var output = '';
  if (Master) output += 'Master: ' + Master + ", ";
  if (Elite) output += 'Elite: ' + Elite + ", ";
  if(Troop) output += 'Horde: ' + (Troop * 5);
  whisper(output.replace(/,$/, ''));
}

on("ready", function(){
  CentralInput.addCMD(/^!\s*last\s*watch\s*wave\s*(\d+)\s*(?:|\s*(\d+)\s*)?$/i, lastWatchWave);
});
//allows the gm to create a new roll20 character sheet that represents a brand
//new character.
//matches[1], if == player then the details of the character will be put in the bio instead of the gmnotes
//matches[2] is the type of character to make (character, vehicle, starship)
function newCharacter(matches, msg){

  var characterType = undefined;
  var character = undefined;
  //allow the new character to be player owned
  var playerOwned = /^\s*player\s*/i.test(matches[1]);

  //allow the character type to be a vehicle
  if(/^\s*vehicle\s*/i.test(matches[2])){
    characterType = "Vehicle";
    character = new INQVehicle();
  }

  //allow the character type to be a starship
  if(/^\s*star\s*ship\s*/i.test(matches[2])){
    characterType = "Starship";
    character = new INQStarship();
  }

  //by default, create a new character
  if(characterType == undefined){
    characterType = "Character";
    character = new INQCharacter();
  }

  //find a unique name for the character
  var counter = 0;
  var characterName = "New " + characterType;
  do {
   counter++;
   if(counter > 1){
     characterName = "New " + characterType + " " + counter.toString();
   }
   duplicateCharacters = findObjs({
     _type: "character",
     name: characterName
   });
 } while(duplicateCharacters.length > 0);

  //save the unique name
  character.Name = characterName;

  //turn the INQ object into a character sheet
  character.toCharacterObj(playerOwned);

  //report the success
  whisper(character.toLink() + " was created.");
}

//waits until CentralInput has been initialized
on("ready",function(){
  CentralInput.addCMD(/^!\s*new\s*(|player)\s*(character|vehicle|starship)\s*$/i,newCharacter);
});
//sets the selected token as the default token for the named character after
//detailing the token
//  matches[1] - the name of the character sheet
function setDefaultToken(matches, msg){
  //get the selected token
  if(msg.selected && msg.selected.length == 1){
    var graphic = getObj("graphic", msg.selected[0]._id);
    //be sure the graphic exists
    if(graphic == undefined) {
      return whisper("graphic undefined");
    }
  } else {
    return whisper("Please select exactly one token.");
  }
  //try to find the specified character
  var characters = matchingObjs("character", matches[1].split(' '));
  //rage quit if no characters were found
  if(characters.length <= 0){
    return whisper("No matching characters were found.");
  }
  //see if we can trim down the results to just exact matches
  characters = trimToPerfectMatches(characters, matches[1]);
  //if there are still too many pilot results, make the user specify
  if(characters.length >= 2){
    //let the gm know that multiple characters were found
    whisper("Which character did you mean?");
    //give a suggestion for each possible character match
    _.each(characters, function(character){
      var suggestion = "Give Token To " + character.get("name");
      suggestion = "!{URIFixed}" + encodeURIFixed(suggestion);
      whisper("[" + character.get("name") + "](" + suggestion  + ")");
    });
    //stop here, we must wait for the user to specify
    return;
  }

  var character = characters[0];

  //get the Fate, Fatigue, and Wounds of the character
  switch(characterType(character)){
    case "character":
      var bar1 = getAttrByName(character.id, "Fatigue", "max");
      var bar2 = getAttrByName(character.id, "Fate", "max");
      var bar3 = getAttrByName(character.id, "Wounds", "max");
    break;
    case "vehicle":
      var bar1 = getAttrByName(character.id, "Tactical Speed", "max") || 0;
      var bar2 = getAttrByName(character.id, "Aerial Speed", "max")   || 0;
      var bar3 = getAttrByName(character.id, "Structural Integrity", "max");
    break;
    case "starship":
      var bar1 = getAttrByName(character.id, "Population", "max") || 0;
      var bar2 = getAttrByName(character.id, "Morale", "max") || 0;
      var bar3 = getAttrByName(character.id, "Hull", "max");
    break;
  }


  //detail the graphic
  graphic.set("bar1_link", "");
  graphic.set("bar2_link", "");
  graphic.set("bar3_link", "");

  graphic.set("represents", character.id);
  graphic.set("name", character.get("name"));

  graphic.set("bar1_value", bar1);
  graphic.set("bar2_value", bar2);
  graphic.set("bar3_value", bar3);

  graphic.set("bar1_max", bar1);
  graphic.set("bar2_max", bar2);
  graphic.set("bar3_max", bar3);

  graphic.set("showname", true);
  graphic.set("showplayers_name", true);
  graphic.set("showplayers_bar1", true);
  graphic.set("showplayers_bar2", true);
  graphic.set("showplayers_bar3", true);
  graphic.set("showplayers_aura1", true);
  graphic.set("showplayers_aura2", true);

  setDefaultTokenForCharacter(character, graphic);

  //set the character's avatar as the token if they don't already have something
  if(character.get("avatar") == ""){
    character.set("avatar", graphic.get("imgsrc").replace("/thumb.png?", "/med.png?"));
  }

  whisper("Default Token set for *" + getLink(character.get("name")) + "*.");
}

on("ready", function(){
  CentralInput.addCMD(/^!\s*give\s*token\s*to\s+(.+)$/i, setDefaultToken);
});
//searches every message for rolls to hit and damage rolls.
on("chat:message", function(msg) {
  //if a message matches one of two types of formats, the system records the
  //Damage, Damage Type, Penetration, Primitive, and Felling of the attack.
  //The roll to hit, and thus the number of hits, are expected to be in a
  //different message.

  //Format 1
  //A whisper to the gm
  //"/w gm [name] deals [[damage]] [damagetype] Damage, [[penetration]] Pen
  //[optional list of special rules separated by commas] with a(n) [weapon]"

  //Format 2
  //Similar to above, but in a public emote
  //"/em - [name] deals [[damage]] [damagetype] Damage, [[penetration]] Pen
  //[optional list of special rules separated by commas] with a/an [weapon]"

  //Format 3
  //This roll template can be whispered or publicly shown
  //Any roll template that has a title starting with ""<strong>Damage</strong>: "
  //and its first two inline rolls are Damage and Pen

  //At least two inline rolls are expected
  if( (((msg.type == "emote") || (msg.type == "whisper" && msg.target == "gm"))
  && /deals\s*\$\[\[0\]\]\s*(impact|explosive|rending|energy|.*>I<.*|.*>X<.*|.*>R<.*|.*>E<.*)\s*damage,\s*\$\[\[1\]\]\s*(pen|penetration).*with\s+a/i.test(msg.content)
  )
  || (/^\s*{{\s*name\s*=\s*(<strong>|\*\*)\s*damage\s*(<\/strong>|\*\*):.*}}/i.test(msg.content)
  && /{{\s*(damage|dam)\s*=\s*\$\[\[0\]\]\s*}}/i.test(msg.content)
  && /{{\s*(penetration|pen)\s*=\s*\$\[\[1\]\]\s*}}/i.test(msg.content))
  && msg.inlinerolls.length >= 2) {
    //get the damage details obj
    var details = damDetails();
    //quit if one of the details was not found
    if(details == undefined){
      return;
    }
    var DamTypeObj = details.DamType;
    var DamObj = details.Dam;
    var PenObj = details.Pen;
    var FellObj = details.Fell;
    var PrimObj = details.Prim;

    //I don't know why I need to do this BUT for some reason when the message is sent by the API
    //instead of a player, the inline rolls start with a null object, and accessing a null object is dangerous
    //"with a(n) " is the generic method I have the api using. Player sent commands are expected to be more intelligent
    if(msg.inlinerolls[0] == undefined){
      var rollIndex = 1;
    } else {
      var rollIndex = 0;
    }

    //record Damage Type
    var DamageType;
    if(msg.content.indexOf(" Energy ") !== -1 || msg.content.indexOf(">E<") !== -1){
      DamageType = "E";
    } else if(msg.content.indexOf(" Rending ") !== -1 || msg.content.indexOf(">R<") !== -1){
      DamageType = "R";
    } else if(msg.content.indexOf(" Explosive ") !== -1 || msg.content.indexOf(">X<") !== -1){
      DamageType = "X";
    } else {//if(msg.content.indexOf(" Impact ") !== -1){
      DamageType = "I";
    }
    DamTypeObj.set("current",DamageType);

    //record Damage
    DamObj.set('current', msg.inlinerolls[rollIndex].results.total);

    //record the highest damage roll
    var lowest = 10
    for(var i = 0; i < msg.inlinerolls[rollIndex].results.rolls[0].results.length; i++){
      if(!msg.inlinerolls[rollIndex].results.rolls[0].results[i].d && msg.inlinerolls[rollIndex].results.rolls[0].results[i].v < lowest){
        lowest = msg.inlinerolls[rollIndex].results.rolls[0].results[i].v
      }
    }

    //record Penetration
    PenObj.set('current', msg.inlinerolls[rollIndex + 1].results.total);

    //record Felling
    var fellingIndex = msg.content.indexOf("Felling");
    //is there any Felling inside the weapon?
    if(fellingIndex >= 0){
      //find the parenthesis after Felling
      var startIndex = msg.content.indexOf("(",fellingIndex);
      var endIndex = msg.content.indexOf(")",startIndex);
      //be sure the parenthesis were both found
      if (startIndex >= 0 && endIndex >= 0 && Number(msg.content.substring(startIndex+1,endIndex))){
        //record the amount of felling
        FellObj.set('current',Number(msg.content.substring(startIndex+1,endIndex)));
      } else {
        //record zero felling
        FellObj.set('current', 0);
      }
    } else {
      //record zero felling
      FellObj.set('current', 0);
    }

    //record Primitive
    //if the weapon is Primitive and does not have the mono upgrade
    if(msg.content.indexOf("Primitive") != -1 && msg.content.indexOf("Mono") == -1) {
      //record Primitive
      PrimObj.set("current",1);
      //report to the gm that everything was found
      whisper("Dam: " + DamObj.get("current") + " " + DamTypeObj.get("current") + ", Pen: " +  PenObj.get("current") + ", Felling: " + FellObj.get("current") + ", Primitive");
    }  else {
      //record Primitive
      PrimObj.set("current",0);
      //report to the gm that everything was found
      whisper("Dam: " + DamObj.get("current") + " " + DamTypeObj.get("current") + ", Pen: " +  PenObj.get("current") + ", Felling: " + FellObj.get("current"));
    }

    //create a button to report the lowest damage roll
    var lowestButton = "[" + lowest.toString() + "]";
    lowestButton += "("
    lowestButton += "!{URIFixed}" + encodeURIFixed("Crit?");
    lowestButton += ")";
    //was this a private attack?
    if(msg.type == "whisper"){
      //report the highest roll privately
      whisper(lowestButton, {speakingAs: 'Lowest'});
    } else {
      //report the highest roll publicly
      announce(lowestButton, {speakingAs: 'Lowest'});
    }

    //save the damage variables to their maximums as well
    DamObj.set("max",DamObj.get("current"));
    DamTypeObj.set("max",DamTypeObj.get("current"));
    PenObj.set("max",PenObj.get("current"));
    FellObj.set("max",FellObj.get("current"));
    PrimObj.set("max",PrimObj.get("current"));
  }
});
/*
whenever the wounds of a character is directly healed (assuming proper healing),
then push up the Max Healing cap along with it

Note: If you have multiple tokens linked to the same character (perhaps on
different pages) this event will trigger for each token. This is fine because
this function is idempotent. It sets the Max Healing value to the New Wounds.

Warning: This will not work if you change a character's wounds from the character
sheet while there is no token in the entire campaign that has its bar3 linked
to the character's wounds. This is highly unlikely to occur in your campign but
it is worth knowing.
*/
on("change:graphic:bar3_value", function(obj, prev) {
  //be sure the token represents a character
  if(getObj("character", obj.get("represents")) == undefined){return;}
  //get the current and max wounds in number format
  var Wounds = {
    prev: Number(prev.bar3_value),
    current: Number(obj.get("bar3_value")),
    max: Number(obj.get("bar3_max"))
  }

  if(Wounds.current == NaN || Wounds.max == NaN || Wounds.prev == NaN) return;
  if(Wounds.current - Wounds.prev <= 0) return;

  //find the Max Healing attribute
  var MaxHealing = attributeValue("Max Healing", {graphicid: obj.id, alert: false});

  //be sure you found at least one Max Healing attribute
  //otherwise ignore the change
  if(MaxHealing != undefined){
    //record the Max Healing in number format
    MaxHealing = Number(MaxHealing);

    //quit if Max Healing is not a number
    if(MaxHealing == NaN) return;

    //is the new health greater than the current cap?
    if(Wounds.current > MaxHealing){
      MaxHealing = (Wounds.current > Wounds.max) ? Wounds.max : Wounds.current;
      attributeValue("Max Healing", {setTo: MaxHealing, graphicid: obj.id, alert: false});
      attributeValue("Max Healing", {setTo: MaxHealing, graphicid: obj.id, alert: false, max: true});
      whisper("Healing Cap set to " + MaxHealing + "/" + Wounds.max + ".");
    }
  }
});
//If the message was a roll to hit, record the number of Hits. The roll to hit
//must be a roll template and that roll template must have the following

//A title begining with "<strong>WS</strong>: ", "<strong>BS</strong>: ", or
//"<strong>Wp</strong>: ".
//The first inline roll must be the number of successes
//The second inline roll must be the number of unnatural successes
//There must be exactly two inline rolls
on("chat:message", function(msg){
  if(/^\s*{{\s*name\s*=\s*(<strong>|\*\*)\s*(WS|BS|Wp)\s*(<\/strong>|\*\*):.*}}/i.test(msg.content)
  && /{{\s*successes\s*=\s*\$\[\[0\]\]\s*}}/i.test(msg.content)
  && /{{\s*unnatural\s*=\s*\$\[\[1\]\]\s*}}/i.test(msg.content)
  && msg.inlinerolls.length == 2) {
    if(!msg.inlinerolls[0].results) return;
    //load up the AmmoTracker object to calculate the hit location
    saveHitLocation(msg.inlinerolls[0].results.rolls[1].results[0].v, {whisper: true});
    //if the number of successes was positive, add in Unnatural and save it
    if(msg.inlinerolls[0].results.total > 0){
      //the negative modifier keeps the total number of hits <= -1 while still
      //storing the number of hits, this is because all hits are assumed to be
      //Single Shot mode, but later commands such as (!Full and !Semi) will
      //convert these negative numbers into a positive number of hits.
      attributeValue('Hits', {setTo: (-1)*(1 + Math.floor(msg.inlinerolls[0].results.total) + Math.floor(msg.inlinerolls[1].results.total))});
    //otherwise record that there were no hits
    } else {
      attributeValue('Hits', {setTo: 0});
    }
    //check for perils of the warp
    if(/^\s*{{\s*name\s*=\s*<strong>\s*Wp\s*<\/strong>:.*}}/i.test(msg.content)){
      //was the one's place a 9?
      if((msg.inlinerolls[0].results.rolls[1].results[0].v - 10*Math.floor(msg.inlinerolls[0].results.rolls[1].results[0].v/10)) == 9){
        announce("/em makes an unexpected twist. (" + getLink("Psychic Phenomena") + ")", {speakingAs: "The warp"});
      }
    } else if(/^\s*{{\s*name\s*=\s*<strong>\s*BS\s*<\/strong>:.*}}/i.test(msg.content)){
      //was the roll >= 96?
      if(msg.inlinerolls[0].results.rolls[1].results[0].v >= 96){
        //warn the gm that the weapon jammed
        announce("/em " + getLink("Jam") + "s!" , {speakingAs: "The weapon"});
      //Full Auto and Semi Auto attacks jam on a 94+. Warn the gm just in case
      //this is one of them.
      } else if(msg.inlinerolls[0].results.rolls[1].results[0].v >= 94){
        //warn the gm that the weapon may have jammed
        announce("/em " + getLink("Jam") + "s!", {speakingAs: "The Full/Semi Auto weapon"});
      } else if(msg.inlinerolls[0].results.rolls[1].results[0].v >= 91){
        //warn the gm that the weapon may have jammed
        announce("/em " + getLink("Overheats") + "!", {speakingAs: "The weapon"});
      }
    }
  }
});
//Watches for starship attack damage. It records the damage and penetration
//of the starship attack. The message must have the form of a roll template.
//The title must start with "<strong>Damage<strong>:"
//The first entry must be Damage with an inline roll
//The second entry must be the type of weapon used: Macro, Lance, Torpedo,Nova, Bomber
on("chat:message", function(msg) {
  if(/^\s*{{\s*name\s*=\s*(<strong>|\*\*)\s*damage\s*(<\/strong>|\*\*):.*}}\s*{{\s*(damage|dam)\s*=\s*\$\[\[0\]\]\s*}}\s*{{\s*type\s*=\s*(macro|nova|torpedo|lance|bomber)\s*}}/i.test(msg.content)
  && msg.inlinerolls.length >= 1) {
    //I don't know why I need to do this BUT for some reason when the message is sent by the API
    //instead of a player, the inline rolls start with a null object, and accessing a null object is dangerous
    //"with a(n) " is the generic method I have the api using. Player sent commands are expected to be more intelligent
    var rollIndex = 0;
    if(msg.inlinerolls[rollIndex] == undefined){
        rollIndex++;
    }
    //get the damage details obj
    var details = damDetails();
    //quit if one of the details was not found
    if(details == undefined){
      return;
    }
    var DamTypeObj = details.DamType;
    var DamObj = details.Dam;
    var PenObj = details.Pen;
    var FellObj = details.Fell;
    var PrimObj = details.Prim;

    //prepare to numically modifify the old damage
    starshipDamage = Number(DamObj.get("current"));

    //was the last attack a starship attack?
    if(DamTypeObj.get('current') != "S"){
        //we are now making this starship damage
        DamTypeObj.set('current', "S");
        //the new damage is just saved without regard for any of the old damage
        starshipDamage = msg.inlinerolls[rollIndex].results.total;
    } else {
        //add the new damage to the old damage
        starshipDamage += msg.inlinerolls[rollIndex].results.total;
    }

    //record the total Damage
    DamObj.set('current', starshipDamage);

    //record Penetration
    //is the weapon a lance or a nova weapon?
    if(msg.content.toLowerCase().indexOf("lance") != -1 || msg.content.toLowerCase().indexOf("nova") != -1){
      PenObj.set('current', 1);
      whisper("Dam: " + DamObj.get("current") + ", Pen: true");
    } else {
      PenObj.set('current', 0);
      whisper("Dam: " + DamObj.get("current") + ", Pen: false");
    }

    //record the attack to max as well
    DamObj.set('max',DamObj.get("current"));
    DamTypeObj.set('max',DamTypeObj.get("current"));
    PenObj.set('max',PenObj.get("current"));
  }
});
//used inside initiativeHandler() multiple times, this calculates the bonus
//added to the D10 when rolling Initiative for the character/starship
function calcInitBonus(charObj, graphicObj, initCallback){
  charObj = charObj || {};
  graphicObj = graphicObj || {};
  //if this character sheet has Detection, then it is a starship
  if(findObjs({
    _type: "attribute",
    name: "Detection",
    _characterid: charObj.id
  })[0] != undefined){
    //report the detection bonus for starships
    var Detection = Number(attributeValue("Detection", {characterid: charObj.id, graphicid: graphicObj.id}));
    var DetectionBonus = Math.floor(Detection/10);
    if(typeof initCallback == 'function') initCallback(DetectionBonus);
  //if this character sheet has Ag, then it rolls initiative like normal.
  } else if(
    findObjs({
      _type: "attribute",
      name: "Ag",
      _characterid: charObj.id
    })[0] != undefined
  ) {
    //load up all the notes on the character
    new INQCharacter(charObj, graphicObj, function(inqcharacter){
      var Agility = Number(attributeValue("Ag", {characterid: charObj.id, graphicid: graphicObj.id}));
      //add the agility bonus and unnatural agility
      var initiativeBonus = Math.floor(Agility/10);
      //only add the Unnatural Ag attribute, if it exists
      var UnnaturalAgility = Number(attributeValue("Unnatural Ag", {characterid: charObj.id, graphicid: graphicObj.id}));
      if(UnnaturalAgility){
        initiativeBonus += UnnaturalAgility;
      }

      //does this character have lightning reflexes?
      if(inqcharacter.has("Lightning Reflexes", "Talents")){
          //double their Agility Bonus
          initiativeBonus *= 2;
      }

      //is this character paranoid?
      if(inqcharacter.has("Paranoia", "Talents")){
          //add two to the final result
          initiativeBonus += 2;
      }

      if(typeof initCallback == 'function') initCallback(initiativeBonus);
    });
  //neither Ag nor Detection were found. Warn the gm and exit.
  } else {
    whisper( graphicObj.get("name") + " did not have an Ag or Detection attribute. Initiative was not rolled.");
    if(typeof initCallback == 'function') initCallback();
  }
}
//get the type of character.
//currently supported: character, vehicle, starship
function characterType(character){
  //if the target has Structural Integrity, they are a vehicle
  if(findObjs({_type: "attribute", _characterid: character.id, name: "Structural Integrity"}).length > 0){
    return "vehicle";
  //if the target has Hull, they are a starship
  } else if(findObjs({_type: "attribute", _characterid: character.id, name: "Hull"}).length > 0) {
    return "starship";
  //by default the character is assumed to be a normal character
  } else {
    return "character";
  }
}
function damageFx(graphic, damageType){
  if(graphic == undefined || graphic.get("_type") != "graphic"){return;}
  var x = graphic.get("left");
  var y = graphic.get("top");
  var pageid = graphic.get("_pageid");
  var size = 0.5;
  switch(damageType){
    case "X": case "S":
      var fx = {
        "maxParticles": 100,
      	"size": 35,
      	"sizeRandom": 15,
      	"lifeSpan": 10,
      	"lifeSpanRandom": 3,
      	"speed": 3,
      	"angle": 0,
      	"emissionRate": 12,
        "duration": 5,
        "startColour":		[220, 35, 0, 1],
        "startColourRandom":	[62, 0, 0, 0.25],
        "endColour":		[220, 35, 0, 0],
        "endColourRandom":	[60, 60, 60, 0]
      }
    break;
    case "E":
      var fx = {
        "maxParticles": 100,
        "size": 35,
        "sizeRandom": 15,
        "lifeSpan": 10,
        "lifeSpanRandom": 3,
        "speed": 3,
        "angle": 0,
        "emissionRate": 12,
        "duration": 5,
        "startColour":		[90, 90, 175, 1],
        "startColourRandom":	[0, 0, 0, 0.25],
        "endColour":		[125, 125, 255, 0],
        "endColourRandom":	[0, 0, 0, 0]
      }
    break;
    default:
      var fx = {
        "maxParticles": 750,
      	"size": 15,
      	"sizeRandom": 7,
      	"lifeSpan": 20,
      	"lifeSpanRandom": 5,
      	"emissionRate": 3,
      	"speed": 7,
      	"speedRandom": 2,
      	"gravity": { "x": 0.01, "y": 0.5 },
      	"angle": randomInteger(360)-1,
      	"angleRandom": 20,
      	"duration": 10,
        "startColour":		[175, 0, 0, 1],
        "startColourRandom":	[20, 0, 0, 0],
        "endColour":		[175, 0, 0, 0],
        "endColourRandom":	[20, 0, 0, 0]
      }
    break;
  }
  spawnFxWithDefinition(x, y, fx, pageid);
}
function damDetails() {
  //load up all of the damage variables, wherever they may be
  var details = {};
  details.DamType = findObjs({ _type: 'attribute', name: 'DamageType' })[0];
  details.Dam     = findObjs({ _type: 'attribute', name: "Damage" })[0];
  details.Pen     = findObjs({ _type: 'attribute', name: "Penetration" })[0];
  details.Fell    = findObjs({ _type: 'attribute', name: "Felling" })[0];
  details.Prim    = findObjs({ _type: 'attribute', name: "Primitive" })[0];
  details.Hits    = findObjs({ _type: 'attribute', name: "Hits"})[0];
  details.OnesLoc = findObjs({ _type: 'attribute', name: "OnesLocation"})[0];
  details.TensLoc = findObjs({ _type: 'attribute', name: "TensLocation"})[0];

  //be sure every variable was successfully loaded
  var successfulLoad = true;
  //warn the gm for each attribute that was not found
  if(details.DamType == undefined){
    successfulLoad = false;
    whisper("No attribute named Damage Type was found anywhere in the campaign. Damage was not recorded.");
  }
  if(details.Dam == undefined){
    successfulLoad = false;
    whisper("No attribute named Damage was found anywhere in the campaign. Damage was not recorded.");
  }
  if(details.Pen == undefined){
    successfulLoad = false;
    whisper("No attribute named Penetration was found anywhere in the campaign. Damage was not recorded.");
  }
  if(details.Fell == undefined){
    successfulLoad = false;
    whisper("No attribute named Felling was found anywhere in the campaign. Damage was not recorded.");
  }
  if(details.Prim == undefined){
    successfulLoad = false;
    whisper("No attribute named Primitive was found anywhere in the campaign. Damage was not recorded.");
  }
  if(details.Hits == undefined){
    successfulLoad = false;
    whisper("No attribute named Hits was found anywhere in the campaign. Damage was not recorded.");
  }
  if(details.OnesLoc == undefined){
    successfulLoad = false;
    whisper("No attribute named OnesLocation was found anywhere in the campaign. Damage was not recorded.");
  }
  if(details.TensLoc == undefined){
    successfulLoad = false;
    whisper("No attribute named TensLocation was found anywhere in the campaign. Damage was not recorded.");
  }
  //if just one was missing, don't return anything.
  if(successfulLoad == false){
    return;
  } else {
    //otherwise return everything
    return details;
  }

}
//get the armor of the target at the location where the attack hit
function getHitLocation(tensLoc, onesLoc, targetType){
  var hitLocation = "";
  targetType = targetType || "character";
  switch(targetType){
    case "character":
      switch(onesLoc){
        case "0": case "10":
          hitLocation = "H"
        break;
        case "9": case "8":
          if(tensLoc % 2 == 0){
            hitLocation = "RA";
          } else {
            hitLocation = "LA";
          }
        break;
        case "3": case "2": case "1":
          if(tensLoc % 2 == 0){
            hitLocation = "RL";
          } else {
            hitLocation = "LL";
          }
        break;
        default: //case "4": case "5": case "6": case "7":
          hitLocation = "B";
        break;
      }
    break;
    case "vehicle":
      switch(tensLoc){
        case "-1":
          hitLocation = "S"
        break;
        case "-2":
          hitLocation = "R"
        break;
        default: //case "0":
          hitLocation = "F";
        break;
      }
    break;
    case "starship":
      switch(tensLoc){
        case "-1":
          hitLocation = "S"
        break;
        case "-3":
          hitLocation = "P"
        break;
        case "-2":
          hitLocation = "A"
        break;
        default: //case "0":
          hitLocation = "F";
        break;
      }
    break;
  }

  //return the location name
  return hitLocation;
}
//adds a !useWeapon ability for the weapon to the character
//checks if the character already has the weapon ability

//if the character already has the ability but the weapon doesn't use a clip,
//don't add an extra one

//if the character already has the ability and the weapon has a clip, the
//function will alter the new ability so it can keep track of its ammo separately.
insertWeaponAbility = function(inqweapon, character, quantity, ammoNames, inqcharacter){
  //create a list of all of the weapon abilities this character has
  var abilityNames = [];
  var abilityObjs = findObjs({_type: 'ability', _characterid: character.id});
  _.each(abilityObjs, function(abilityObj){
    //is this a weapon ability generated by INQAttack?
    var matches = abilityObj.get('action').match(/^!useWeapon ([^\{\}]+)(\{.*\})$/);
    if(matches){
      //get the weapon name
      var weaponname = matches[1];
      var options = carefulParse(matches[2].replace(/\?\{[^\{\}]+\}/g, ''))  || {};
      if(options.Name){
        abilityNames.push(options.Name);
      } else {
        abilityNames.push(weaponname);
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
          Name = Name.replace(RegExp(' ' + counter.toString() + '$'), '');
        }
        //add the new counter
        counter++;
        Name += ' ' + counter.toString();
      }
    });
  } while(!nameIsUnique);
  var options = {};
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
    createObj('ability', {
      _characterid: character.id,
      name: Name,
      action: inqweapon.toAbility(inqcharacter, options, ammoNames),
      istokenaction: true
    });
  }
}
//take the given roll and calculate the location
function saveHitLocation(roll, options){
  if(typeof options != 'object') options = {};
  //calculate Tens Location
  var tens = Math.floor(roll/10);
  //calculate Ones Location
  var ones = roll - 10 * tens;
  //load up the TensLocation variable to save the result in
  var attribObj = findObjs({ _type: 'attribute', name: "TensLocation" })[0];
  attribObj.set("current",tens);
  //load up the OnesLocation variable to save the result in
  var attribObj = findObjs({ _type: 'attribute', name: "OnesLocation" })[0];
  attribObj.set("current",ones);
  //where did you hit?
  var Location = "";
  switch(ones){
    case 10: case 0: Location = "Head"; break;
    case 9: case 8:
      switch(tens % 2){
        case 0: Location = "Right "; break;
        case 1: Location = "Left "; break;
      } Location += "Arm"; break;
    case 4: case 5: case 6: case 7: Location = "Body"; break;
    case 3: case 2: case 1:
      switch(tens % 2){
        case 0: Location = "Right "; break;
        case 1: Location = "Left "; break;
      } Location += "Leg"; break;
  }
  //send the total Damage at a 1 second delay
  if (options.whisper) {
    setTimeout(function(location){whisper(location, {speakingAs: 'Location'})}, 100, Location);
  } else {
    setTimeout(function(location){announce(location, {speakingAs: 'Location'})}, 100, Location);
  }
}
INQAttack = INQAttack || {};
//a list of all the special rules that affect the damage calculation
INQAttack.accountForDamageSpecialRules = function(){
  INQAttack.accountForAccurate();
  INQAttack.accountForProven();
  INQAttack.accountForTearingFleshRender();
  INQAttack.accountForForce();
  INQAttack.accountForCrushingBlowMightyShot();
  INQAttack.accountForHammerBlow();
  INQAttack.accountForDamage();
  INQAttack.accountForPen();
  INQAttack.accountForType();
  INQAttack.accountForLance();
  INQAttack.accountForRazorSharp();
}
INQAttack = INQAttack || {};
//a list of all the special rules that affect the toHit calculations
INQAttack.accountForHitsSpecialRules = function(){
  INQAttack.accountForMaximal();
  INQAttack.accountForStorm();
  INQAttack.accountForBlast();
  INQAttack.accountForSpray();
  INQAttack.accountForTwinLinked();
  INQAttack.accountForDevastating();
}
INQAttack = INQAttack || {};
INQAttack.calcAmmo = function(){
  //if the attacker was making a careful shot, don't expend ammo on a near hit
  if(/called/i.test(INQAttack.options.RoF)
  && INQAttack.toHit - INQAttack.d100 <   0
  && INQAttack.toHit - INQAttack.d100 > -30){
    INQAttack.options.freeShot = true;
  }
  //determine how many shots were fired
  if(INQAttack.options.freeShot){
    INQAttack.shotsFired = 0;
  }

  INQAttack.shotsFired *= INQAttack.shotsMultiplier;
}
INQAttack = INQAttack || {};
//determine the effective psy rating of the character
INQAttack.calcEffectivePsyRating = function(){
  //reset the psy rating for each selected character
  INQAttack.PsyRating = undefined;
  //allow the options to superceed the character's psy rating
  if(INQAttack.options.EffectivePR){
    INQAttack.PsyRating = Number(INQAttack.options.EffectivePR);
  }
  //if no effective psy rating is set, default to the character's psy rating
  if(INQAttack.PsyRating == undefined
  && INQAttack.inqcharacter != undefined){
    INQAttack.PsyRating = INQAttack.inqcharacter.Attributes.PR;
  }
  //if the psy rating still has no set value, just default to 0
  if(INQAttack.PsyRating == undefined){
    INQAttack.PsyRating = 0;
  }
}
INQAttack = INQAttack || {};
//calculate the number of hits based on the
INQAttack.calcHits = function(){
  //account for any extra ammo this may spend
  INQAttack.maxHits *= INQAttack.maxHitsMultiplier;
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
      case "Full":
        INQAttack.hits += INQAttack.successes
      break;
      default: //"Semi"
        INQAttack.hits += Math.floor(INQAttack.successes/2);
      break;
    }
    //be sure the number of hits is not over the max (and that there is a max)
    if(INQAttack.maxHits > 0 && INQAttack.hits > INQAttack.maxHits){
      INQAttack.hits = INQAttack.maxHits;
    }
  }
  //account for any hits bonuses
  INQAttack.hits *= INQAttack.hitsMultiplier;
}
INQAttack = INQAttack || {};
INQAttack.calcHordeDamage = function(){
  INQAttack.accountForDevastating();
  //adds to the horde multiplier, instead of multipliying, do this last
  INQAttack.accountForHordeDmg();
  INQAttack.hits *= INQAttack.hordeDamageMultiplier;
  INQAttack.hits += INQAttack.hordeDamage;
}
INQAttack = INQAttack || {};
INQAttack.calcToHit = function(){
  //get the stat used to hit
  INQAttack.stat = "BS"
  if(INQAttack.inqweapon.Class == "Melee"){
    INQAttack.stat = "WS";
  } else if(INQAttack.inqweapon.Class == "Psychic"){
    //not all psychic attacks use Willpower
    INQAttack.stat = INQAttack.inqweapon.FocusStat;
    //some psychic attacks are based off of a skill
    INQAttack.toHit += INQAttack.skillBonus();
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
//be sure the inqattack object exists before we start working with it
INQAttack = INQAttack || {};

INQAttack.checkJammed = function(){
  var JamsAt = 101;
  var JamResult = "Jam";
  if(INQAttack.inqweapon.has("Overheats")){
    JamsAt = 91;
    JamResult = "Overheats";
  } else if(INQAttack.inqweapon.has("Unreliable")){
    JamsAt = 91;
  } else if(INQAttack.inqweapon.has("Reliable")){
    JamsAt = 100;
  } else if(INQAttack.stat == "BS"){
    if(INQAttack.mode == "Single"){
      JamsAt = 96;
    } else {
      JamsAt = 94;
    }
  }
  if(INQAttack.d100 >= JamsAt){
    var jamReport =  getLink(INQAttack.inqweapon.Name) + " **" + getLink(JamResult) + "**";
    if(!/s$/.test(JamResult)){
      jamReport += "s";
    }
    announce("/em " + jamReport + "!", "The");
    INQAttack.hits = 0;
  }
}
INQAttack = INQAttack || {};
//delete every property but leave all of the functions untouched
INQAttack.clean = function(){
  for(var k in INQAttack){
    if(typeof INQAttack[k] != 'function'){
      delete INQAttack[k];
    }
  }
}
INQAttack = INQAttack || {};

//let the given options temporarily overwrite the details of the weapon
INQAttack.customizeWeapon = function(){
  for(var label in INQAttack.inqweapon){
    //only work with labels that options has
    if(INQAttack.options[label] != undefined){
      //if label -> array, don't overwrite just add each item on as a link
      if(Array.isArray(INQAttack.inqweapon[label])){
        _.each(INQAttack.options[label].split(","), function(element){
          if(element.trim() != ""){
            INQAttack.inqweapon[label].push(new INQLink(element.trim()));
          }
        });
        //check if the value we are overwriting is a number
      } else if(typeof INQAttack.inqweapon[label] == 'number'){
        INQAttack.inqweapon[label] = Number(INQAttack.options[label]);
      } else {
        //otherwise simply overwrite the label
        INQAttack.inqweapon[label] = INQAttack.options[label];
      }
    }
  }

  if(typeof INQAttack.inqweapon.Special == 'string'){
    INQAttack.inqweapon.Special = _.map(INQAttack.inqweapon.split(","), function(rule){
      return new INQLink(rule);
    });
  }
}
INQAttack = INQAttack || {};
//calculate the damage formula
INQAttack.damageFormula = function(){
  var formula = "";
  //write the roll down
  if(INQAttack.inqweapon.DiceNumber != 0){
    //if the dice are multiplied by a number other than one
    INQAttack.inqweapon.DiceNumber *= INQAttack.inqweapon.DiceMultiplier;
    formula += INQAttack.inqweapon.DiceNumber.toString();
    formula += "d";
    formula += INQAttack.inqweapon.DiceType.toString();
    //if there is a reroll number, add that in
    if(INQAttack.inqweapon.rerollBelow){
      formula += "ro<" + INQAttack.inqweapon.rerollBelow.toString();
    }
    //if there are any keep dice, add them
    if(INQAttack.inqweapon.keepDice){
      formula += "k" + INQAttack.inqweapon.keepDice.toString();
    }
  }
  //add in the base damage
  if(INQAttack.inqweapon.DamageBase != 0){
    formula += "+";
    formula += INQAttack.inqweapon.DamageBase.toString();
  }
  //return the damage formula
  return formula;
}
INQAttack = INQAttack || {};
//display all of the results from the current attack
INQAttack.deliverReport = function(){
  //auto hitting weapons do not roll to hit
  if(INQAttack.autoHit){
    INQAttack.Reports.toHit = undefined;
  }
  //deliver each report
  _.each(["Weapon", "toHit", "Crit", "Damage"], function(report){
    if(INQAttack.Reports[report]){
      //is this a private or public roll?
      if(INQAttack.inqcharacter.controlledby == ""
      || INQAttack.options.whisper){
        //only whisper the report to the gm
        whisper(INQAttack.Reports[report]);
      } else {
        //make the character publicly roll
        announce(INQAttack.Reports[report]);
      }
    }
  });
  //record the results of the attack
  if(INQAttack.hits) INQAttack.recordAttack();
  //if a player whispered this to the gm, let the player know it was successful
  if(INQAttack.inqcharacter.controlledby == ""
  || INQAttack.options.whisper){
    if(!playerIsGM(INQAttack.msg.playerid)){
      whisper("Damage rolled.", {speakingTo: INQAttack.msg.playerid});
    }
  }
}
//be sure the inqattack object exists before we start working with it
INQAttack = INQAttack || {};
INQAttack.detailTheCharacter = function(character, graphic, callback){
  INQAttack.inqcharacter = undefined;
  var myPromise = new Promise(function(resolve){
    if(character && characterType(character) != 'character' && !playerIsGM(INQAttack.msg.playerid)){
      var pilot = defaultCharacter(INQAttack.msg.playerid);
      if(pilot != undefined){
        INQAttack.inqcharacter = new INQCharacter(pilot, undefined, function(){
          INQAttack.inqcharacter.ObjID = character.id;
          INQAttack.inqcharacter.GraphicID = graphic.id;
          resolve();
        });
        return;
      }
    }
    resolve();
  });
  myPromise.catch(function(e){log(e)});
  myPromise.then(function(){
    if(INQAttack.inqcharacter == undefined){
      INQAttack.inqcharacter = new INQCharacter(character, graphic, function(){
        callback();
      });
    } else {
      callback();
    }
  });
}
//be sure the inqattack object exists before we start working with it
INQAttack = INQAttack || {};
//completely detail the weapon using ammo and character
//returns true if nothing went wrong
//returns false if something went wrong
INQAttack.detailTheWeapon = function(callback){
  var weaponPromise = new Promise(function(resolve){
    //get the weapon base
    INQAttack.getWeapon(function(valid){
      resolve(valid);
    });
  });
  weaponPromise.catch(function(e){log(e)});
  weaponPromise.then(function(valid){
    var ammoPromise = new Promise(function(resolve){
      if(!valid) return resolve(false);
      //add in the special ammo
      INQAttack.getSpecialAmmo(function(validAmmo){
        resolve(validAmmo);
      });
    });
    ammoPromise.catch(function(e){log(e)});
    ammoPromise.then(function(validAmmo){
      if(validAmmo) {
        //overwrite any detail with user options
        INQAttack.customizeWeapon();
        //apply the special rules that affect the toHit roll
        INQAttack.accountForHitsSpecialRules();
        //apply the special rules that affect the damage roll
        INQAttack.accountForDamageSpecialRules();
        //determine the character's effective psy rating
        INQAttack.calcEffectivePsyRating();
        //apply that psy rating to the weapon
        INQAttack.inqweapon.setPR(INQAttack.PsyRating);
        //apply the strength bonus of the character to the weapon
        INQAttack.inqweapon.setSB(INQAttack.inqcharacter.bonus("S"));
      }
      //the weapon was fully customized
      if(typeof callback == 'function'){
        callback(validAmmo);
      }
    });
  });
}
INQAttack = INQAttack || {};

//try to spend ammo when making the shot
INQAttack.expendAmmunition = function(){
  INQAttack.calcAmmo();
  //be sure this weapon uses ammunition
  if(INQAttack.inqweapon.Clip > 0){
    if(!INQAttack.recordAmmo()){return false;}
  }
  INQAttack.reportAmmo();
  //we made it this far, nothing went wrong
  return true;
}
INQAttack = INQAttack || {};
//use the players rate of fire to determine what mode the weapn is firing on
//add in all the respective bonuses for that mode
INQAttack.getFiringMode = function(){
  //if the RoF was undefined, find the lowest available setting to fire on
  _.each(["Single", "Semi", "Full"], function(RoF){
    if(INQAttack.options.RoF == undefined
    && INQAttack.inqweapon[RoF]){
      INQAttack.options.RoF = RoF;
      if(RoF != "Single"){
        INQAttack.options.RoF += "(" + INQAttack.inqweapon[RoF] + ")";
      }
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
  } else if(/all\s*out/i.test(INQAttack.options.RoF)){
    if(INQAttack.inqweapon.Class != "Psychic"){
      INQAttack.toHit += 30;
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

  INQAttack.shotsFired = INQAttack.maxHits;
}
INQAttack = INQAttack || {};
//find the special ammunition
INQAttack.getSpecialAmmo = function(callback){
  //be sure the user was actually looking for special ammo
  if(!INQAttack.options.Ammo){
    //there was nothing to do so nothing went wrong
    if(typeof callback == 'function') callback(true);
    return true;
  }
  //is this a custom ammo type?
  if(INQAttack.options.customAmmo){
    //record the name of the special ammo inside a weapon object
    INQAttack.inqammo = new INQWeapon();
    INQAttack.inqammo.Name = INQAttack.options.Ammo
    //exit out with everything being fine
    if(typeof callback == 'function') callback(true);
    return true;
  }
  //search for the ammo
  var clips = matchingObjs("handout", INQAttack.options.Ammo.split(" "));
  //try to trim down to exact ammo matches
  clips = trimToPerfectMatches(clips, INQAttack.options.Ammo);
  //did none of the weapons match?
  if(clips.length <= 0){
    whisper("*" + INQAttack.options.Ammo + "* was not found.", {speakingTo: INQAttack.msg.playerid, gmEcho: true});
    if(typeof callback == 'function') callback(false);
    return false;
  }
  //are there too many weapons?
  if(clips.length >= 2){
    whisper("Which Special Ammunition did you intend to fire?", {speakingTo: INQAttack.msg.playerid})
    _.each(clips, function(clip){
      //specify the exact ammo name
      INQAttack.options.Ammo = clip.get("name");
      //construct the suggested command (without the !)
      var suggestion = "useweapon " + INQAttack.weaponname + JSON.stringify(INQAttack.options);
      //the suggested command must be encoded before it is placed inside the button
      suggestion = "!{URIFixed}" + encodeURIFixed(suggestion);
      whisper("[" + clip.get("name") + "](" + suggestion  + ")", {speakingTo: INQAttack.msg.playerid});
    });
    //something went wrong
    if(typeof callback == 'function') callback(false);
    return false;
  }
  //modify the weapon with the clip
  INQAttack.useAmmo(clips[0], function(){
    callback(true);
  });
  //nothing went wrong
  return true;
}
INQAttack = INQAttack || {};
//find the weapon
INQAttack.getWeapon = function(callback){
  //is this a custom weapon?
  if(INQAttack.options.custom){
    INQAttack.inqweapon = new INQWeapon();
    if(typeof callback == 'function') callback(true);
    return true;
  //or are its stats found in the library?
  } else {
    //search for the weapon
    var weapons = matchingObjs("handout", INQAttack.weaponname.split(" "));
    //try to trim down to exact weapon matches
    weapons = trimToPerfectMatches(weapons, INQAttack.weaponname);
    //did none of the weapons match?
    if(weapons.length <= 0){
      whisper("*" + INQAttack.weaponname + "* was not found.", {speakingTo: INQAttack.msg.playerid, gmEcho: true});
      if(typeof callback == 'function') callback(false);
      return false;
    }
    //are there too many weapons?
    if(weapons.length >= 2){
      whisper("Which weapon did you intend to fire?", {speakingTo: INQAttack.msg.playerid});
      _.each(weapons, function(weapon){
        //use the weapon's exact name
        var suggestion = "useweapon " + weapon.get("name") + JSON.stringify(INQAttack.options);
        //the suggested command must be encoded before it is placed inside the button
        suggestion = "!{URIFixed}" + encodeURIFixed(suggestion);
        whisper("[" + weapon.get("name") + "](" + suggestion  + ")", {speakingTo: INQAttack.msg.playerid});
      });
      //don't continue unless you are certain what the user wants
      if(typeof callback == 'function') callback(false);
      return false;
    }

    INQAttack.inqweapon = new INQWeapon(weapons[0], function(){
      if(typeof callback == 'function') callback(true);
    });

    //detail the one and only weapon that was found
    return true;
  }
}
INQAttack = INQAttack || {};
//the attack missed, offer a reroll
INQAttack.offerReroll = function(){
  //the reroll will not use up any ammo
  INQAttack.options.freeShot = "true";
  //offer a reroll instead of rolling the damage
  var attack = "useweapon " + INQAttack.weaponname + JSON.stringify(INQAttack.options);
  //encode the attack
  attack = "!{URIFixed}" + encodeURIFixed(attack);
  //offer it as a button to the player
  setTimeout(whisper, 100, "[Reroll](" + attack + ")", {speakingTo: INQAttack.msg.playerid});
}
INQAttack = INQAttack || {};
//calculate the penetration formula
INQAttack.penetrationFormula = function(){
  var formula = "";
  if(INQAttack.penSuccessesMultiplier){
    formula += "(";
  }
  if(INQAttack.penDoubleAt && INQAttack.successes >= INQAttack.penDoubleAt){
    formula += "(";
  }
  if(INQAttack.inqweapon.PenDiceNumber > 0 && INQAttack.inqweapon.PenDiceType > 0){
    formula += INQAttack.inqweapon.PenDiceNumber + "d" + INQAttack.inqweapon.PenDicType;
  }
  formula += "+" + INQAttack.inqweapon.Penetration;
  if(INQAttack.penSuccessesMultiplier){
    var penMultiplier = 1;
    penMultiplier += INQAttack.successes;
    penMultiplier *= INQAttack.penSuccessesMultiplier
    formula += ")*";
    formula += penMultiplier;
  }
  if(INQAttack.penDoubleAt && INQAttack.successes >= INQAttack.penDoubleAt){
    formula += ")*2"
  }
  return formula;
}
INQAttack = INQAttack || {};
//prepare attack variables for each attack
INQAttack.prepareVariables = function(){
  INQAttack.toHit = 0;
  INQAttack.unnaturalSuccesses = 0;
  INQAttack.shotsMultiplier = 1;
  INQAttack.hitsMultiplier = 1;
  INQAttack.maxHitsMultiplier = 1;
  INQAttack.hordeDamage = 0;
  INQAttack.hordeDamageMultiplier = 1;

}
INQAttack = INQAttack || {};
INQAttack.recordAmmo = function(){
  //use the name of the weapon to construct the name of the ammo
  var AmmoName = "Ammo - " + INQAttack.inqweapon.Name;
  if(INQAttack.inqammo){
    AmmoName += " (" + INQAttack.inqammo.Name + ")";
  }
  //how much ammo is left for this weapon?
  INQAttack.AmmoLeft = attributeValue(AmmoName, {
    characterid: INQAttack.inqcharacter.ObjID,
    graphicid: INQAttack.inqcharacter.GraphicID,
    alert: false}
  );
  //check if this ammo tracker exists yet
  if(INQAttack.AmmoLeft == undefined){
    //create a brand new clip
    attributeValue(AmmoName, {
      setTo: INQAttack.inqweapon.Clip,
      characterid: INQAttack.inqcharacter.ObjID,
      graphicid: INQAttack.inqcharacter.GraphicID,
      alert: false}
    );
    //minus the shots fired from the max
    INQAttack.AmmoLeft = INQAttack.inqweapon.Clip - INQAttack.shotsFired;
  } else {
    //minus the shots fired from the clip
    INQAttack.AmmoLeft -= INQAttack.shotsFired;
  }
  //be sure you can even spend this much ammo
  if(INQAttack.AmmoLeft < 0){
    whisper("Not enough ammo to fire on " + INQAttack.options.RoF, INQAttack.msg.playerid);
    return false;
  }
  //record the resulting clip
  attributeValue(AmmoName, {
    setTo: INQAttack.AmmoLeft,
    characterid: INQAttack.inqcharacter.ObjID,
    graphicid: INQAttack.inqcharacter.GraphicID,
    alert: false}
  );

  return true;
}
INQAttack = INQAttack || {};
//record the details of the attack
INQAttack.recordAttack = function(){
  //report the hit location and save the hit location
  if(INQAttack.d100 != undefined){
    saveHitLocation(INQAttack.d100, {whisper: INQAttack.inqcharacter.controlledby == "" || INQAttack.options.whisper});
  }
  if(INQAttack.hits != undefined){
    //save the number of hits achieved
    var hitsObj = findObjs({ type: 'attribute', name: "Hits" })[0];
    if(hitsObj == undefined){
      return whisper("No attribute named Hits was found anywhere in the campaign.");
    }
    hitsObj.set("current", INQAttack.hits);
    hitsObj.set("max", INQAttack.hits);
  }
}
INQAttack = INQAttack || {};
INQAttack.reportAmmo = function(){
  //write a report on the weapon
  INQAttack.Reports.Weapon = "";
  INQAttack.Reports.Weapon += "<br><strong>Weapon</strong>: " + INQAttack.inqweapon.toLink();
  if(INQAttack.inqammo){
    INQAttack.Reports.Weapon += "<br><strong>Ammo</strong>: " + INQAttack.inqammo.toLink();
  }
  INQAttack.Reports.Weapon += "<br><strong>Mode</strong>: " + INQAttack.options.RoF.toTitleCase();
  if(INQAttack.inqweapon.Class == "Psychic"){
    INQAttack.Reports.Weapon += "<br><strong>Psy Rating</strong>: " + INQAttack.PsyRating.toString();
    INQAttack.Reports.Weapon += "<br><strong>" + getLink("Psychic Phenomena") + "</strong>: [Roll](!find Psychic Phenomena&#13;/r d100)";
  }
  if(INQAttack.AmmoLeft != undefined){
    INQAttack.Reports.Weapon += "<br><strong>Ammo</strong>: " + INQAttack.AmmoLeft + "/" + INQAttack.inqweapon.Clip;
  }
}
//be sure the inqattack object exists before we start working with it
INQAttack = INQAttack || {};
//report the damage roll
INQAttack.rollDamage = function(){
  //be sure the weapon has a damage roll
  if(INQAttack.inqweapon.DiceNumber == 0){
    return;
  }
  //begin constructing the damage report
  INQAttack.Reports.Damage = "&{template:default} {{name=<strong>Damage</strong>: " + INQAttack.inqweapon.Name + "}} ";
  //calculate the damage
  INQAttack.Reports.Damage +=  "{{Damage= [[" + INQAttack.damageFormula() + "]]}} ";
  //note the damage type
  if(typeof INQAttack.inqweapon.DamageType == 'string'){
    var DamageType = getLink(INQAttack.inqweapon.DamageType);
  } else {
    var DamageType = INQAttack.inqweapon.DamageType.toNote();
  }
  INQAttack.Reports.Damage +=  "{{Type=  " + DamageType + "}} ";
  //calculate the penetration
  INQAttack.Reports.Damage +=  "{{Pen=  [[" + INQAttack.penetrationFormula() + "]]}} ";
  //add on any special notes
  INQAttack.Reports.Damage += "{{Notes= " + INQAttack.weaponNotes() + "}}";

  INQAttack.calcHordeDamage();
}
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
  if(INQAttack.inqweapon.FocusSkill){
    INQAttack.Reports.toHit += "{{Skill=" + getLink(INQAttack.inqweapon.FocusSkill) + "}} ";
  }
  INQAttack.Reports.toHit += "{{Successes=[[(" + INQAttack.toHit.toString() + " - (" + INQAttack.d100.toString() + ") )/10]]}} ";
  INQAttack.Reports.toHit += "{{Unnatural= [[" + INQAttack.unnaturalSuccesses.toString() + "]]}} ";
  INQAttack.Reports.toHit += "{{Hits= [[" + INQAttack.hits.toString() + "]]}}";
}
INQAttack = INQAttack || {};
INQAttack.skillBonus = function(){
  var bonus = 0;
  //is there a skill to search for?
  if(INQAttack.inqweapon.FocusSkill){
    //check the character for the skill
    var skill = INQAttack.inqcharacter.has(INQAttack.inqweapon.FocusSkill, "Skills");
    if(!skill){
      bonus = -20;
    } else if(skill.length > 0){
      //did the user provide a subgroup?
      if(INQAttack.inqweapon.FocusSkillGroup){
        //does the character have the given subgroup?
        var regex = "^\\s*";
        regex += INQAttack.inqweapon.FocusSkillGroup.replace(/(-|\s+)/g,"(-|\\s+)");
        regex += "\\s*$";
        var re = RegExp(regex, "i");
        var matchingSubgroup = false;
        var subgroupModifier = -20;
        _.each(skill, function(subgroup){
          if(re.test(subgroup.Name) || /^\s*all\s*$/i.test(subgroup.Name)){
            //overwrite the subgroup's modifier if it is better
            if(subgroup.Bonus > subgroupModifier){
              subgroupModifier = subgroup.Bonus;
            }
          }
        });
        //if the character does not have a matching subgroup, give them a flat -20 modifier
        bonus = subgroupModifier;
      } else {
        whisper("Psychic Power did not provide a skill group.", {speakingTo: INQAttack.msg.playerid, gmEcho: true});
        bonus = -20;
      }
    //the skill was found, and there is no need to match subgroups
    } else {
      //the skill was not found
      bonus = skill.Bonus;
    }
  }
  return bonus;
}
//be sure the inqattack object exists before we start working with it
INQAttack = INQAttack || {};

//accurate increases the damage of the weapon by D10 for each success rolled, up
//to 2. It will not decrease the damage if there are failures.
//accurate only works when the weapon is making a single shot
INQAttack.accountForAccurate = function(){
  if(INQAttack.mode == "Single"
  && INQAttack.inqweapon.has("Accurate")){
    INQAttack.inqweapon.DiceNumber += Math.max(Math.min(INQAttack.successes,2),0);
  }
}

//proven rerolls damage < the given number
//roll20 treats < as <= so the value must be decreased by one
INQAttack.accountForProven = function(){
  var proven = INQAttack.inqweapon.has("Proven");
  if(proven){
    //by default, reroll all 1's
    INQAttack.inqweapon.rerollBelow = 1;
    //find the proven value
    _.each(proven, function(value){
      if(Number(value.Name)){
        INQAttack.inqweapon.rerollBelow = Number(value.Name)-1;
      }
    });
  }
}

//tearing rolls one extra damage die, discarding the lowest
//flesh render rolls another die beyond that, discarding the next lowest
INQAttack.accountForTearingFleshRender = function(){
  if(INQAttack.inqweapon.has("Tearing")){
    INQAttack.inqweapon.keepDice = INQAttack.inqweapon.DiceNumber;
    INQAttack.inqweapon.DiceNumber++;
    if(INQAttack.inqcharacter.has("Flesh Render", "Talents")){
      INQAttack.inqweapon.DiceNumber++;
    }
  }
}

//crushing blow give +2 damage to melee attacks
//mighty shot gives +2 damage to ranged attacks
INQAttack.accountForCrushingBlowMightyShot = function(){
  if(INQAttack.inqweapon.Class == "Melee"
  && INQAttack.inqcharacter.has("Crushing Blow", "Talents")){
    INQAttack.inqweapon.DamageBase += 2;
  } else if(INQAttack.inqweapon.Class != "Psychic"
  && INQAttack.inqcharacter.has("Mighty Shot", "Talents")){
    INQAttack.inqweapon.DamageBase += 2;
  }
}

//force weapons add the user's Psy Rating to their Damage and Penetration
INQAttack.accountForForce = function(){
  if(INQAttack.inqweapon.has("Force")){
    INQAttack.inqweapon.DamageBase  += INQAttack.inqcharacter.Attributes.PR;
    INQAttack.inqweapon.Penetration += INQAttack.inqcharacter.Attributes.PR;
  }
}

//storm weapons double the max hits and double the hits per success
//however, they also double the ammo expended
INQAttack.accountForStorm = function(){
  if(INQAttack.inqweapon.has("Storm")){
    INQAttack.shotsMultiplier *= 2;
    INQAttack.hitsMultiplier *= 2;
  }
}

//blast weapons multiply the horde damage by a given number
INQAttack.accountForBlast = function(){
  var blast = INQAttack.inqweapon.has("Blast");
  if(blast){
    //find the proven value
    _.each(blast, function(value){
      if(Number(value.Name)){
        INQAttack.hordeDamageMultiplier *= Number(value.Name);
      }
    });
  }
}

//spray weapons multiply the horde damage by (Range/4) + D5
//spray weapons do not roll to hit
INQAttack.accountForSpray = function(){
  if(INQAttack.inqweapon.has("Spray")){
    INQAttack.hordeDamageMultiplier *= Math.ceil(INQAttack.inqweapon.Range/4) + randomInteger(5);
    if(INQAttack.inqweapon.Class != "Psychic"){
      INQAttack.autoHit = true;
    }
  }
}

//devastating weapons add to the total horde damage
INQAttack.accountForDevastating = function(){
  var devastating = INQAttack.inqweapon.has("Devastating");
  if(devastating){
    //find the proven value
    _.each(devastating, function(value){
      if(Number(value.Name)){
        INQAttack.hordeDamage += Number(value.Name);
      }
    });
  }
}

//Twin-linked weapons have +20 to hit
//Twin-linked weapons can hit twice as much
//Twin-linked, single shots can hit twice if they roll 2+ successes
INQAttack.accountForTwinLinked = function(){
  if(INQAttack.inqweapon.has("Twin-linked")){
    INQAttack.toHit += 20;
    INQAttack.shotsMultiplier *= 2;
    INQAttack.maxHitsMultiplier *= 2;
  }
}

//Crushing blow + All Out Attack => Pen += StrB/2
//Crushing blow + All Out Attack => Concussive(2)
INQAttack.accountForHammerBlow = function(){
  if(INQAttack.inqcharacter == undefined){return;}
  if(/all\s*out/i.test(INQAttack.options.RoF)
  && INQAttack.inqcharacter.has("Hammer Blow", "Talents")){
    INQAttack.inqweapon.Penetration += Math.ceil(INQAttack.inqcharacter.bonus("S")/2);
    var concussive2 = new INQLink("Concussive(2)");
    INQAttack.inqweapon.Special.push(concussive2);
  }
}

//Lance Weapons multiply their Pen by their to Hit Successes + 1
INQAttack.accountForLance = function(){
  if(INQAttack.inqweapon.has("Lance")){
    INQAttack.penSuccessesMultiplier = 1;
  }
}

//Razorsharp weapons double their pen if they earn two or more successes
INQAttack.accountForRazorSharp = function(){
  if(INQAttack.inqweapon.has("Razor Sharp")){
    INQAttack.penDoubleAt = 2;
  }
}

//Maximal Weapons can fire on Maximal
//uses 3x the ammo
//increases range by 1/3
//increases damage dice by 1/2
//increases base damage by 1/4
//increases penetration multiplier by 1/5
//increases blast quality by 1/2
//grants the recharge quality
INQAttack.accountForMaximal = function(){
  if(INQAttack.inqweapon.has("Use Maximal")){
    INQAttack.shotsMultiplier *= 3;
    INQAttack.inqweapon.Range       += Math.round(INQAttack.inqweapon.Range / 3);
    INQAttack.inqweapon.DiceNumber  += Math.round(INQAttack.inqweapon.DiceNumber / 2);
    INQAttack.inqweapon.DamageBase  += Math.round(INQAttack.inqweapon.DamageBase / 4);
    INQAttack.inqweapon.Penetration += Math.round(INQAttack.inqweapon.Penetration / 5);
    var recharge = new INQLink("Recharge");
    INQAttack.inqweapon.Special.push(recharge);
    //remove the useMaximal special rule from the displayed abilities
    var maximal = -1;
    for(var i = 0; i < INQAttack.inqweapon.Special.length; i++){
      if(INQAttack.inqweapon.Special[i].Name == "Use Maximal"){
        INQAttack.inqweapon.Special.splice(i, 1);
        i--
      } else if(INQAttack.inqweapon.Special[i].Name == "Blast"){
        for(var j = 0; j < INQAttack.inqweapon.Special[i].Groups.length; j++){
          if(Number(INQAttack.inqweapon.Special[i].Groups[j])){
            INQAttack.inqweapon.Special[i].Groups[j] = Number(INQAttack.inqweapon.Special[i].Groups[j]);
            INQAttack.inqweapon.Special[i].Groups[j] += Math.round(INQAttack.inqweapon.Special[i].Groups[j] / 2);
          }
        }
      }
    }
  } else {
    //remove the maximal special rule from the displayed abilities
    var maximal = -1;
    for(var i = 0; i < INQAttack.inqweapon.Special.length; i++){
      if(INQAttack.inqweapon.Special[i].Name == "Maximal"){
        INQAttack.inqweapon.Special.splice(i, 1);
        i--
      }
    }
  }
}

INQAttack.accountForHordeDmg = function(){
  var hordeDmg = INQAttack.inqweapon.has("HordeDmg");
  if(hordeDmg){
    //find the proven value
    _.each(hordeDmg, function(value){
      if(Number(value.Name)){
        INQAttack.hordeDamageMultiplier += Number(value.Name);
      }
    });
  }
}

//special ammunition will explicitly note stat modifications
//apply damage modifications
INQAttack.accountForDamage = function(){
  var dam = INQAttack.inqweapon.has("Dam") || [];
  var damage = INQAttack.inqweapon.has("Damage") || [];
  dam = dam.concat(damage);
  _.each(dam, function(value){
    if(/^\s*(|\+|-)\s*\d+\s*$/.test(value.Name)){
      INQAttack.inqweapon.DamageBase += Number(value.Name);
    }
  });
}

//special ammunition will explicitly note stat modifications
//apply penetration modifications
INQAttack.accountForPen = function(){
  var pen = INQAttack.inqweapon.has("Pen") || [];
  var penetration = INQAttack.inqweapon.has("Penetration") || [];
  pen = pen.concat(penetration);
  _.each(pen, function(value){
    if(/^\s*(|\+|-)\s*\d+\s*$/.test(value.Name)){
      INQAttack.inqweapon.Penetration += Number(value.Name);
    } else if(/^\s*=\s*\d+\s*$/.test(value.Name)){
      INQAttack.inqweapon.Penetration = Number(value.Name.replace("=", ""));
    }
  });
}

//special ammunition will explicitly note stat modifications
//apply damage TYPE modifications
INQAttack.accountForType = function(){
  var type = INQAttack.inqweapon.has("DamageType");
  if(type){
    _.each(type, function(value){
      INQAttack.inqweapon.DamageType = new INQLink(value.Name.replace('=',''));
    });
  }
}
INQAttack = INQAttack || {};
//parse the special ammo and use it to customize the inqweaon
INQAttack.useAmmo = function(ammo, callback){
  var myPromise = new Promise(function(resolve){
    //parse the special ammunition
    INQAttack.inqammo = new INQWeapon(ammo, function(){
      resolve();
    });
  });
  myPromise.catch(function(e){log(e)});
  myPromise.then(function(){
    //only add the special rules of the ammo to the inqweapon, we want every
    //modification to be highly visible to the player
    for(var k in INQAttack.inqammo){
      if(k == "Name" || k == "ObjID" || k == "ObjType" || k == "DamageType"){continue;}
      if(INQAttack.inqammo[k] == INQAttack.inqammo.__proto__[k]){continue;}
      if(Array.isArray(INQAttack.inqammo[k])){
        INQAttack.inqweapon[k] = INQAttack.inqweapon[k].concat(INQAttack.inqammo[k]);
      } else {
        INQAttack.inqweapon[k] = INQAttack.inqammo[k];
      }
    }

    if(typeof callback == 'function'){
      callback(inqcharacter);
    }
  });
}
INQAttack = INQAttack || {};
//make a list of all of the weapon special abilities
INQAttack.weaponNotes = function(){
  var notes = "";
  _.each(INQAttack.inqweapon.Special, function(rule){
    notes += rule.toNote() + ", ";
  });
  //remove the last comma
  return notes.replace(/,\s*$/, "");
}
INQAttack = INQAttack || {};
//reduce the attack's damage by the armour of the target
INQAttack.applyArmour = function(damage){

  //find the hit location
  var hitLocation = getHitLocation(INQAttack.TensLoc.get("current"), INQAttack.OnesLoc.get("current"), INQAttack.targetType);
  log("Hit Location: " + hitLocation)
  //get the armor of the target
  var armour = attributeValue("Armour_" + hitLocation, {characterid: INQAttack.character.id, graphicid: INQAttack.graphic.id});
  log("Armour: " + armour)

  //turn armour into a valid number
  if(!armour){
    armour = 0;
  } else {
    armour = Number(armour);
  }

  //is the attack primitive?
  if(Number(INQAttack.Prim.get("current")) > 0){
    log("Primitive Attack")
    //the armour is twice as protective against primitive attacks
    armour *= 2;
  }

  //is the armour primitive?
  if(INQAttack.primArmour){
    log("Primitive Armour")
    //the primitive armour is half as effective
    armour /= 2;
  }

  //round the armour
  armour = Math.round(armour);

  //is the target a spaceship?
  if(INQAttack.targetType == "starship"){
    //starship weapons either have no penetration, or infinite penetration
    if(Number(INQAttack.Pen.get("current")) > 0){
      armour = 0;
    }
  }else {
    //all other targets treat penetration normally
    log("Penetration: " + INQAttack.Pen.get("current"))
    armour -= INQAttack.Pen.get("current");
    //be sure the penetration doesn't overshoot the armour
    if(armour < 0){
      armour = 0;
    }
    log("Armour after Pen: " + armour)
  }

  //apply the armour to the damage
  damage -= armour;

  //be sure the damage isn't negative
  if(damage < 0){
    damage = 0;
  }

  log("Damage after Armour: " + damage)

  //report the reduced damage
  return damage;
}
INQAttack = INQAttack || {};
//reduce the damage by the target's toughness
INQAttack.applyToughness = function(damage){
  if(INQAttack.targetType == "character"){
    //get the target's toughness
    var Toughness = attributeValue("T", {characterid: INQAttack.character.id, graphicid: INQAttack.graphic.id});
    //be sure that the Toughness was found
    if(Toughness){
      Toughness = Number(Toughness);
      //reduce the damage by the base T Bonus of the character
      log("T Bonus: " + Math.floor(Toughness/10))
      damage -= Math.floor(Toughness/10);
    }
    log("Felling: " + Number(INQAttack.Fell.get("current")))

    //get the target's toughness
    var UnnaturalToughness = attributeValue("Unnatural T", {characterid: INQAttack.character.id, graphicid: INQAttack.graphic.id});
    //be sure that the Toughness was found
    if(UnnaturalToughness){
      log("Unnatural Toughness: " + UnnaturalToughness)
      UnnaturalToughness = Number(UnnaturalToughness) - Number(INQAttack.Fell.get("current"));
      //reduce the damage by the base T Bonus of the character
      if(UnnaturalToughness > 0){
        damage -= UnnaturalToughness;
      }
    }
  }
  //be sure the total damage is positive
  if(damage < 0){damage = 0;}

  log("Damage after Toughness: " + damage)

  //report the reduced damage
  return damage;
}
//define the attack object
INQAttack = INQAttack || {};
//warn the gm of any damage type that should not be applied to a character type
INQAttack.appropriateDamageType = function(){
  if(INQAttack.targetType == "starship" && INQAttack.DamType.get("current").toUpperCase() != "S"){
    whisper(INQAttack.graphic.get("name") + ": Using non-starship damage on a starship. Aborting. [Correct This](!damage type = s)");
    return false;
  } else if(INQAttack.targetType != "starship" && INQAttack.DamType.get("current").toUpperCase() == "S"){
    whisper(INQAttack.graphic.get("name") + ": Using starship damage on a non-starship. Aborting. [Correct This](!damage type = i)");
    return false;
  }
  //no warning to hand out
  return true;
}
INQAttack = INQAttack || {};
INQAttack.calcCrit = function(remainingWounds){
  //Has the token taken critical damage?
  if(remainingWounds < 0){
    //strings to contain the details of which crit table to refer to
    var critLocation = "";
    var critType = "";
    //calculate the critical effect that should be applied
    var critEffect =  (-1) * remainingWounds;
    switch(INQAttack.targetType){
      case "character":
        //Load up the Wounds and Unnatural Wounds attributes. Warn the gm if
        //they are not found.
        var WBonus = 1;
        var Wounds = attributeValue("Wounds", {characterid: INQAttack.character.id, graphicid: INQAttack.graphic.id});
        if(Wounds != undefined){
          //Calculate the Wounds Bonus of the Character
          Wounds = Number(Wounds);
          WBonus = Math.floor(Wounds/10);
        }

        var UnnaturalWounds = attributeValue("Unnatural Wounds", {characterid: INQAttack.character.id, graphicid: INQAttack.graphic.id});
        if(UnnaturalWounds != undefined){
          //Add in Unnatural Wounds to the Wounds Bonus
          UnnaturalWounds = Number(UnnaturalWounds);
          WBonus += UnnaturalWounds;
        }
        //At minimum, the Wounds Bonus is one.
        Math.max(WBonus,1);
        //Calculate the resulting Critical Effect
        critEffect = Math.ceil(critEffect/WBonus);
        //record the crit type
        critType = INQAttack.DamType.get("current");
        critLocation = getHitLocation(INQAttack.TensLoc.get("current"), INQAttack.OnesLoc.get("current"));
      break;
      case "vehicle":
        //Load up the Structural Integrity and Unnatural Structural Integrity
        //Attributes. Warn the gm if they are not found.
        var SIBonus = 1;
        var StrucInt = attributeValue("Structural Integrity", {characterid: INQAttack.character.id, graphicid: INQAttack.graphic.id});
        if(StrucInt != undefined){
          //Calculate the Structural Integrity Bonus of the Vehicle
          StrucInt = Number(StrucInt);
          SIBonus = Math.floor(StrucInt/10);
        }
        var UnnaturalStrucInt = attributeValue("Unnatural Structural Integrity", {characterid: INQAttack.character.id, graphicid: INQAttack.graphic.id});
        if(UnnaturalStrucInt != undefined){
          //Add in any Unnatural Structural Integrity to the Bonus
          UnnaturalStrucInt = Number(UnnaturalStrucInt);
          SIBonus += UnnaturalStrucInt;
        }
        //At minimum, the SIBonus is one.
        Math.max(SIBonus,1);
        //Calculate the resulting Critical Effect
        critEffect = Math.ceil(critEffect/SIBonus);
        //record the crit type
        critType = "v";
      break;
      case "starship":
        //The critcal effect for starships is not modified
        //However, starships never record critical damage
        remainingWounds = 0;
        //record the hit type
        critType = "s"
      break;
    }
    //report the critical effect to the gm
    whisper("**" + INQAttack.character.get("name") + "**: " + getCritLink(["", critType, critLocation], INQAttack.msg, {show: false}) + "(" + critEffect + ")");
  }
  //return any critical damage that remains on the character (or how much health
  //they have left before they start taking critical damage)
  return remainingWounds;
}
INQAttack = INQAttack || {};
//record the details of the attack into the object
INQAttack.getAttack = function(){
    //get the damage details obj
    var details = damDetails();

    //quit if one of the details was not found
    if(details == undefined){return;}

    //record the attack details for use elsewhere in the object
    INQAttack.DamType = details.DamType;
    INQAttack.Dam     = details.Dam;
    INQAttack.Pen     = details.Pen;
    INQAttack.Prim    = details.Prim;
    INQAttack.Fell    = details.Fell;
    INQAttack.Hits    = details.Hits;
    INQAttack.OnesLoc = details.OnesLoc;
    INQAttack.TensLoc = details.TensLoc;

    //return that reading the details was successful
    return true;
}
INQAttack = INQAttack || {};
INQAttack.hordeDamage = function(damage){
  //if the damage is non-zero, overwrite the damage with the number of Hits
  //(gm's can add bonus horde damage beforehand by modifying the number of
  //hits. This is will leave the damage unaffected on other tokens.)
  if(damage > 0){
    //at base it is the number of hits
    damage = INQAttack.Hits.get("current");
    //explosive damage deals one extra point of horde damage
    if(INQAttack.DamType.get("current").toUpperCase() == "X") damage++;
    //FUTURE WORK: add devastating damage to the magnitude damage
  }

  //return the magnitude damage
  return damage;
}
//the prototype for characters
function INQCharacter(character, graphic, callback){
  //object details
  this.controlledby = "";
  this.ObjType = "character";

  //default character movement
  this.Movement = {};
  this.Movement.Half = 1;
  this.Movement.Full = 2;
  this.Movement.Charge = 3;
  this.Movement.Run = 6;

  //default character skills and items
  this.List = {};
  this.List["Psychic Powers"] = [];
  this.List.Weapons           = [];
  this.List.Gear              = [];
  this.List.Talents           = [];
  this.List.Traits            = [];
  this.List.Skills            = [];

  //any rules that aren't listed elsewhere
  this.SpecialRules  = [];

  //default character sheet attributes
  this.Attributes = {};

  this.Attributes.WS = 0;
  this.Attributes.BS = 0;
  this.Attributes.S =  0;
  this.Attributes.T = 0;
  this.Attributes.Ag = 0;
  this.Attributes.Wp = 0;
  this.Attributes.It = 0;
  this.Attributes.Per = 0;
  this.Attributes.Fe = 0;

  this.Attributes["Unnatural WS"] = 0;
  this.Attributes["Unnatural BS"] = 0;
  this.Attributes["Unnatural S"] =  0;
  this.Attributes["Unnatural T"] = 0;
  this.Attributes["Unnatural Ag"] = 0;
  this.Attributes["Unnatural Wp"] = 0;
  this.Attributes["Unnatural It"] = 0;
  this.Attributes["Unnatural Per"] = 0;
  this.Attributes["Unnatural Fe"] = 0;

  this.Attributes.Wounds = 1;
  this.Attributes["Unnatural Wounds"] = 0;
  this.Attributes.Fatigue = 0;

  this.Attributes.Armour_H = 0;
  this.Attributes.Armour_RA = 0;
  this.Attributes.Armour_LA = 0;
  this.Attributes.Armour_B  = 0;
  this.Attributes.Armour_RL = 0;
  this.Attributes.Armour_LL = 0;

  this.Attributes.PR = 0;

  this.Attributes.Fate = 0;
  this.Attributes.Corruption = 0;
  this.Attributes["Unnatural Corruption"] = 0;
  this.Attributes.Insanity = 0;
  this.Attributes.Renown = 0;

  //allow the user to immediately parse a character in the constructor
  var inqcharacter = this;
  var myPromise = new Promise(function(resolve){
    if(character != undefined){
      if(typeof character == "string"){
        Object.setPrototypeOf(inqcharacter, new INQCharacterImportParser());
        inqcharacter.parse(character);
        resolve(inqcharacter);
      } else {
        Object.setPrototypeOf(inqcharacter, new INQCharacterParser());
        inqcharacter.parse(character, graphic, function(){
          resolve(inqcharacter);
        });
      }
    } else {
      resolve(inqcharacter);
    }
  });

  myPromise.catch(function(e){log(e)});
  myPromise.then(function(inqcharacter){
    if(character != undefined){
      Object.setPrototypeOf(inqcharacter, new INQCharacter());
    }

    if(typeof callback == 'function'){
      callback(inqcharacter);
    }
  });
}

INQCharacter.prototype = new INQObject();
INQCharacter.prototype.constructor = INQCharacter;
INQCharacter.prototype.bonus = function(stat){
  var bonus;
  if(this.Attributes[stat]) bonus = Math.floor(this.Attributes[stat]/10);
  if(this.Attributes['Unnatural ' + stat]) bonus += this.Attributes['Unnatural ' + stat];
  return bonus;
}
INQCharacter.prototype.getCharacterBio = function(){
  //create the gmnotes of the character
  var gmnotes = '';

  //Movement
  //present movement in the form of a table
  var table = [[], []];
  for(var move in this.Movement){
    table[0].push(move);
    table[1].push(this.Movement[move]);
  }

  gmnotes += this.getTable(table);

  //display every list
  for(var list in this.List){
    //starting with the name of the list
    gmnotes += "<br>";
    gmnotes += "<u><strong>" + list + "</strong></u>";
    gmnotes += "<br>";
    //make a note for each item in the list
    _.each(this.List[list], function(item){
      gmnotes += item.toNote() + "<br>";
    });
  }

  //tack on any Special Rules
  _.each(this.SpecialRules, function(rule){
    gmnotes += "<br>";
    gmnotes += "<strong>" + rule.Name + "</strong>: ";
    gmnotes += rule.Rule;
    gmnotes += "<br>";
  });

  return gmnotes;
}
INQCharacter.prototype.getTable = function(rows, boldFirstRow){
  var output = '';
  if(boldFirstRow || boldFirstRow == undefined){
    for(var i = 0; i < rows[0].length; i++) {
      rows[0][i] = '<strong>' + rows[0][i] + '</strong>';
    }
  }

  output += '<table><tbody>';
  for(var row of rows){
    output += '<tr>';
    for(var element of row){
      output += '<td>';
      output += element;
      output += '</td>';
    }

    output += '</tr>';
  }

  output += '</tbody></table>';
  return output;
}
//check if the character has an inqlink with the given name
//and within the given list
//if there are no subgroups for the inqlink, just return {Bonus}
//if there are, return the inqlink's subgroups with a bonus for each
//if nothing was found, return undefined
INQCharacter.prototype.has = function(ability, list){
  if(list == undefined){
    whisper("Which List are you searching?");
    return undefined;
  }
  var info = [];
  _.each(this.List[list], function(rule){
    if(rule.Name == ability){
      //does the found skill have subgroups?
      var newRules = [];
      if(rule.Groups.length > 0){
        //the inklink has subgroups and each will need their own bonus
        _.each(rule.Groups, function(subgroups){
          _.each(subgroups.split(/\s*,\s*/), function(subgroup){
            newRules.push({
              Name:  subgroup,
              Bonus: rule.Bonus
            });
          });
        });
      } else {
        //the inqlink does not have subgroups
        newRules.push({
          Name: 'all',
          Bonus: rule.Bonus
        });
      }
      _.each(newRules, function(newRule){
        _.each(info, function(oldRule){
          if(newRule.Name == oldRule.Name){
            if(newRule.Bonus > oldRule.Bonus) oldRule.Bonus = newRule.Bonus;
            newRule.Repeat = true;
          }
        });
        if(!newRule.Repeat) info.push(newRule);
      });
    }
  });
  var highestAll = -99999;
  _.each(info, function(oldRule){
    if(oldRule.Name == 'all' && oldRule.Bonus > highestAll) highestAll = oldRule.Bonus;
  });
  _.each(info, function(oldRule){
    if(highestAll > oldRule.Bonus) oldRule.Bonus = highestAll;
  });


  if(info.length == 1 && info[0].Name == 'all') return {Bonus: info[0].Bonus};
  if(info.length == 0) return undefined;
  return info;
}
INQCharacter.prototype.removeChildren = function(characterid){
  var oldAttributes = findObjs({
    _characterid: characterid,
    _type: 'attribute'
  });
  _.each(oldAttributes, function(attr){
    attr.remove();
  });
  var oldAbilities = findObjs({
    _characterid: characterid,
    _type: 'ability'
  });
  _.each(oldAbilities, function(ability){
    ability.remove();
  });
}
//create a character object from the prototype
INQCharacter.prototype.toCharacterObj = function(isPlayer, characterid){
  //get the character
  var character = undefined;
  if(characterid) character = getObj("character", characterid);
  if(!character) character = createObj("character", {});
  this.removeChildren(character.id);

  this.ObjID = character.id;
  character.set('name', this.Name);
  character.set('controlledby', this.controlledby);
  var notes = this.getCharacterBio();
  var workingWith = (isPlayer || this.controlledby) ? 'bio' : 'gmnotes';
  character.set(workingWith, notes);
  for(var name in this.Attributes){
    createObj('attribute', {
      name: name,
      _characterid: this.ObjID,
      current: this.Attributes[name],
      max: this.Attributes[name]
    });
  }

  var customWeapon = {custom: true};
  for(var list in this.List){
    for(var item of this.List[list]){
      if(item.toAbility){
        createObj("ability", {
          name: item.Name,
          _characterid: this.ObjID,
          istokenaction: true,
          action: item.toAbility(this, undefined, customWeapon)
        });
      }
    }
  }

  return character;
}
function INQCharacterImportParser(){
  this.StatNames = ["WS", "BS", "S", "T", "Ag", "It", "Per", "Wp", "Fe"];
}

INQCharacterImportParser.prototype = Object.create(INQCharacter.prototype);
INQCharacterImportParser.prototype.constructor = INQCharacterImportParser;
//Dark Heresy records the total characteristic values, while I need to know
//just the Unnatural characteristics
INQCharacterImportParser.prototype.adjustBonus = function(){
  for(var stat of this.StatNames){
    if(this.Attributes["Unnatural " + stat] > 0){
      this.Attributes["Unnatural " + stat] -= Math.floor(this.Attributes[stat]/10);
    }
  }
}
//Dark Heresy records the total damage for weapons in their Damage Base
//including Str Bonus for Melee Weapons and talents
INQCharacterImportParser.prototype.adjustWeapons = function(){
  for(var i = 0; i < this.List.Weapons.length; i++){
    var weapon = this.List.Weapons[i];
    if(weapon.Class == "Melee"){
      weapon.DamageBase -= this.bonus("S");
      if(weapon.has("Fist")){
        weapon.DamageBase -= this.bonus("S");
      }
      if(this.has("Crushing Blow", "Talents")){
        weapon.DamageBase -= 2;
      }
    } else if(this.has("Mighty Shot", "Talents")){
      weapon.DamageBase -= 2;
    }
    weapon.Name = weapon.Name.toTitleCase();
  }
}
//While Dark Heresy typically lists T Bonus, I want to be sure I get Fatigue right
//further, Fate Points are listed as a Trait: Touched by the Fates.
INQCharacterImportParser.prototype.calcAttributes = function(){
  this.Attributes.Fatigue = this.bonus("T");
  var fate = this.has("Touched by the Fates", "Traits");
  if(fate){
    if(fate.length){
      this.Attributes.Fate = fate[0].Name;
    } else {
      this.Attributes.Fate = fate.Bonus;
    }
  }
}
INQCharacterImportParser.prototype.interpretBonus = function(line){
  //save every number found
  var bonus = line.match(/(\d+|[—–-])/g);
  //correlate the numbers with the named stats
  for(var i = 0; i < this.StatNames.length; i++){
    //default to "0" when no number is given for a stat
    if(Number(bonus[i])){
      this.Attributes["Unnatural " + this.StatNames[i]] = Number(bonus[i]);
    } else {
      this.Attributes["Unnatural " + this.StatNames[i]] = 0;
    }
  }
}
INQCharacterImportParser.prototype.interpretCharacteristics = function(line){
  //save every number found
  var stat = line.match(/(\d+|–\s*–|[—-])/g);
  //correlate the numbers with the named stats
  for(var i = 0; i < this.StatNames.length; i++){
    //default to "0" when no number is given for a stat
    if(Number(stat[i])){
      this.Attributes[this.StatNames[i]] = Number(stat[i]);
    } else {
      this.Attributes[this.StatNames[i]] = 0;
    }
  }
}
INQCharacterImportParser.prototype.interpretUnlabeled = function(unlabeled){
  //search unlabled content for unnaturals and characteristics
  var addedLines = 0;
  for(var i = 0; i < unlabeled.length; i++){
    //only accept lines that are purely numbers, spaces, and parenthesies
    if(unlabeled[i].match(/^[—–-\s\d\(\)]+$/)){
      //are we free to fill out the unnaturals?
      if(addedLines == 0){
        this.interpretBonus(unlabeled[i]);
      //are we free to fill out the characteristics?
      } else if(addedLines == 1) {
        this.interpretCharacteristics(unlabeled[i]);
      } else {
        whisper("Too many numical lines. Stats and Unnatural Stats are likely inaccurate.");
      }
      //a numerical line has been interpreted
      addedLines++;
    }
  };

  //if only one numerical line was added, assume the only one added was the statline
  if(addedLines == 1){
    this.switchBonusOut();
  }
}
INQCharacterImportParser.prototype.parse = function(text){
  var parser = new INQImportParser(this);
  parser.getList(/^\s*skills\s*$/i, ["List", "Skills"]);
  parser.getList(/^\s*talents\s*$/i, ["List", "Talents"]);
  parser.getList(/^\s*traits\s*$/i, ["List", "Traits"]);
  parser.getList(/^\s*gear\s*$/i, ["List", "Gear"]);
  parser.getList(/^\s*psychic\s+powers\s*$/i, ["List", "Psychic Powers"]);
  parser.getNumber(/^\s*move(ment)?\s*$/i, ["Movement", ["Half", "Full", "Charge", "Run"]]);
  parser.getNumber(/^\s*wounds\s*$/i, ["Attributes", "Wounds"]);
  parser.getNothing(/^\s*total\s+TB\s*$/i);
  parser.getWeapons(/^\s*weapons\s*$/i, ["List", "Weapons"]);
  parser.getArmour(/^\s*armour\s*$/i, ["Attributes", {
    Armour_H:  /\s*head\s*/i,
    Armour_RA: /\s*arms\s*/i,
    Armour_LA: /\s*arms\s*/i,
    Armour_B:  /\s*body\s*/i,
    Armour_RL: /\s*legs\s*/i,
    Armour_LL: /\s*legs\s*/i
  }]);
  var unlabeled = parser.parse(text);

  this.interpretUnlabeled(unlabeled);
  //do final adjustments
  this.adjustBonus();
  this.adjustWeapons();
  this.calcAttributes();
}
INQCharacterImportParser.prototype.switchBonusOut = function(){
  for(var stat of this.StatNames){
    this.Attributes[stat] = this.Attributes["Unnatural " + stat];
    this.Attributes["Unnatural " + stat] = 0;
  }
}
//takes the character object and turns it into the INQCharacter Prototype
function INQCharacterParser(){
  //the text that will be parsed
  this.Text = "";
}

INQCharacterParser.prototype = Object.create(INQCharacter.prototype);
INQCharacterParser.prototype.constructor = INQCharacterParser;
//the full parsing of the character
INQCharacterParser.prototype.parse = function(character, graphic, callback){
  var inqcharacterparser = this;
  var myPromise = new Promise(function(resolve){
    new INQParser(character, function(parser){
      inqcharacterparser.Content = parser;
      resolve(parser);
    });
  });

  myPromise.catch(function(e){log(e)});
  myPromise.then(function(parser){
    inqcharacterparser.Name = character.get("name");
    inqcharacterparser.ObjID = character.id;
    inqcharacterparser.ObjType = character.get("_type");

    if(graphic) inqcharacterparser.GraphicID = graphic.id;

    inqcharacterparser.controlledby = character.get("controlledby");

    inqcharacterparser.parseLists();
    inqcharacterparser.parseMovement();
    inqcharacterparser.parseSpecialRules();
    inqcharacterparser.parseAttributes(graphic);
    if(typeof callback == 'function'){
      callback(inqcharacterparser);
    }
  });
}
//saves every attribute the character has
INQCharacterParser.prototype.parseAttributes = function(graphic){
  //start with the character sheet attributes
  var attributes = findObjs({
    _type: 'attribute',
    _characterid: this.ObjID
  });
  for(var attr of attributes){
    this.Attributes[attr.get('name')] = Number(attr.get('current'));
  }
  //when working with a generic enemy's current stats, we need to check for temporary values
  //generic enemies are those who represent a character, yet none of their stats are linked
  if(graphic != undefined
  && graphic.get('bar1_link') == ''
  && graphic.get('bar2_link') == ''
  && graphic.get('bar3_link') == ''){
    var localAttributes = new LocalAttributes(graphic);
    for(var attr in localAttributes.Attributes){
      this.Attributes[attr] = Number(localAttributes.Attributes[attr]);
    }
  }
}
//take apart this.Text to find all of the lists
//currently it assumes that weapons will be in the form of a link
INQCharacterParser.prototype.parseLists = function(){
  //empty the previous lists
  var Lists = {};
  //work through the parsed lists
  _.each(this.Content.Lists, function(list){
    var name = list.Name;
    //be sure the list name is recognized and in the standard format
    if(/weapon/i.test(name)){
      name = "Weapons";
    } else if(/skill/i.test(name)){
      name = "Skills";
    } else if(/talent/i.test(name)){
      name = "Talents";
    } else if(/trait/i.test(name)){
      name = "Traits";
    } else if(/gear/i.test(name)){
      name = "Gear";
    } else if(/psychic\s*power/i.test(name)){
      name = "Psychic Powers";
    } else {
      //quit if the name is not approved
      return false;
    }
    //save the name of the list
    Lists[name] = Lists[name] || [];
    _.each(list.Content, function(item){
      //make the assumption that each item is a link (or just a simple phrase)
      var inqitem = new INQLink(item);
      //only add the item if it was succesfully parsed
      if(inqitem.Name && inqitem.Name != ""){
        Lists[name].push(inqitem);
      }
    });
  });
  this.List = Lists;
}
//parse out the movement of the character
//assumes movement will be in the form of a table and in a specific order
INQCharacterParser.prototype.parseMovement = function(){
  var Movement = {};
  //search the parsed tables for movement
  _.each(this.Content.Tables, function(table){
    //be sure the name doesn't exist or that it's about movement
    if(/Move/i.test(table.Name) || table.Name == ""){
      _.each(table.Content, function(column){
        //be sure the column is the expected length of 2. Label + value
        if(column.length == 2){
          //trim out any bold tags
          column[0] = column[0].replace(/<\/?(?:strong|em)>/g, "");
          Movement[column[0]] = column[1];
        }
      });
    }
  });
  this.Movement = Movement;
}
//saves any notes on the character
INQCharacterParser.prototype.parseSpecialRules = function(){
  this.SpecialRules = this.Content.Rules;
}
function INQFormula(text){
  this.reset();
  if(typeof text == 'string') this.parse(text);
  this.valueOf = this.toNote;
}
INQFormula.prototype.adjustForSBPR = function(options){
  if(typeof options != 'object') options = {};
  options.PR = options.PR || 0;
  options.SB = options.SB || 0;
  options.PR = Number(options.PR);
  options.SB = Number(options.SB);

  var adjusted = {};

  adjusted.modifier = this.Modifier;
  if(this.Modifier_PR) adjusted.modifier *= options.PR;
  if(this.Modifier_SB) adjusted.modifier *= options.SB;

  adjusted.multiplier = this.Multiplier;
  if(this.Multiplier_PR) adjusted.multiplier *= options.PR;
  if(this.Multiplier_SB) adjusted.multiplier *= options.SB;

  adjusted.dicenumber = this.DiceNumber;
  if(this.DiceNumber_PR) adjusted.dicenumber *= options.PR;
  if(this.DiceNumber_SB) adjusted.dicenumber *= options.SB;

  return adjusted;
}
INQFormula.prototype.onlyZero = function(){
  if(this.Multiplier == 0) return true;
  if(this.DiceNumber == 0 && this.Modifier == 0) return true;
  if(this.DiceType == 1 && this.DiceNumber * -1 == this.Modifier
    && this.DiceNumber_PR == this.Modifier_PR && this.DiceNumber_SB == this.Modifier_SB) return true;
  return false;
}
INQFormula.prototype.parse = function(text){
  this.reset();
  var re = new RegExp('^' + INQFormula.regex() + '$', 'i');
  text = text.replace(/(–|—)/g, '-');
  var matches = text.match(re);
  if(matches){
    var Multiplier = matches[1];
    var DiceNumber = matches[2];
    var DiceType = matches[3];
    var Modifier = matches[4];

    if(Multiplier){
      Multiplier = Multiplier.replace(/[\sx]/gi, '');
      if(/PR/i.test(Multiplier)) {
        this.Multiplier_PR = true;
        Multiplier = Multiplier.replace(/PR/gi, '');
      }
      if(/SB/i.test(Multiplier)) {
        this.Multiplier_SB = true;
        Multiplier = Multiplier.replace(/SB/gi, '');
      }

      if(!/\d/.test(Multiplier)) Multiplier += '1';
      this.Multiplier = Number(Multiplier);
    }
    if(DiceType){
      if(/PR/i.test(DiceNumber)) {
        this.DiceNumber_PR = true;
        DiceNumber = DiceNumber.replace(/PR/gi, '');
      }
      if(/SB/i.test(DiceNumber)) {
        this.DiceNumber_SB = true;
        DiceNumber = DiceNumber.replace(/SB/gi, '');
      }

      if(!/\d/.test(DiceNumber)) DiceNumber += '1';
      this.DiceNumber = Number(DiceNumber);
      this.DiceType = Number(DiceType);
    }
    if(Modifier){
      Modifier = Modifier.replace(/[\sx]/gi, '');
      if(/PR/i.test(Modifier)) {
        this.Modifier_PR = true;
        Modifier = Modifier.replace(/PR/gi, '');
      }
      if(/SB/i.test(Modifier)) {
        this.Modifier_SB = true;
        Modifier = Modifier.replace(/SB/gi, '');
      }

      if(!/\d/.test(Modifier)) Modifier += '1';
      this.Modifier = Number(Modifier);
    }
  } else {
    whisper('Invalid INQFormula');
    log('Invalid INQFormula');
    log(text);
  }
}
INQFormula.regex = function(options){
  if(typeof options != 'object') options = {};
  if(options.requireDice == undefined) options.requireDice = false;
  var regex = '\\s*';
  regex += '((?:\\d*\\s*x?\\s*(?:PR|SB)|\\d+)\\s*x\\s*)?';
  regex += '\\(?';
  regex += '(?:(\\d*(?:PR|SB|))\\s*D\\s*(\\d+))';
  if(!options.requireDice) regex += '?';
  regex += '(\\s*(?:\\+|-|–|—|)\\s*(?:\\d*\\s*x?\\s*(?:PR|SB)|\\d+))?';
  regex += '\\)?';
  regex += '\\s*';
  return regex;
}
INQFormula.prototype.reset = function(){
  this.Multiplier = 1;
  this.Multiplier_PR = false;
  this.Multiplier_SB = false;

  this.DiceNumber = 0;
  this.DiceNumber_PR = false;
  this.DiceNumber_SB = false;

  this.DiceType = 10;

  this.Modifier = 0;
  this.Modifier_PR = false;
  this.Modifier_SB = false;
}
INQFormula.prototype.roll = function(options){
  var adjusted = this.adjustForSBPR(options);
  var output = 0;
  for(var i = 0; i < adjusted.dicenumber; i++){
    output += randomInteger(this.DiceType);
  }

  output += adjusted.modifier;
  output *= adjusted.multiplier;
  return output;
}
INQFormula.prototype.toInline = function(options){
  if(typeof options != 'object') options = {};
  options.dicerule = options.dicerule || '';
  var adjusted = this.adjustForSBPR(options);
  var formula = '[[';
  formula += adjusted.multiplier;
  formula += ' * (';
  if(adjusted.dicenumber < 0) {
    formula += adjusted.modifier;
  }
  if(adjusted.dicenumber) {
    formula += adjusted.dicenumber;
    formula += 'D';
    formula += this.DiceType;
    formula += options.dicerule;
  }
  if(adjusted.dicenumber >= 0){
    if(adjusted.modifier >= 0) formula += ' + ';
    formula += adjusted.modifier;
  }
  formula += ')';
  formula += ']]';
  return formula;
}
INQFormula.prototype.toNote = function(){
  if(this.onlyZero()) return '0';
  var multiplier = '' + this.Multiplier;
  var dicenumber = '' + this.DiceNumber;
  var modifier   = '' + this.Modifier;

  if(this.Multiplier_PR) multiplier += 'PR';
  if(this.Multiplier_SB) multiplier += 'SB';
  multiplier = multiplier.replace(/^(\D*)1(\D+)$/, '$1$2');

  if(this.DiceNumber_PR) dicenumber += 'PR';
  if(this.DiceNumber_SB) dicenumber += 'SB';
  dicenumber = dicenumber.replace(/^(\D*)1(\D+)$/, '$1$2');

  if(this.Modifier_PR) modifier += 'PR';
  if(this.Modifier_SB) modifier += 'SB';
  modifier = modifier.replace(/^(\D*)1(\D+)$/, '$1$2');

  var note = '';
  var diceAndModifier = dicenumber != '0' && modifier != '0';
  if(multiplier != '1'){
    note += multiplier + ' x ';
    if(diceAndModifier) note += '(';
  }

  if(dicenumber != '0'){
    if(dicenumber != '1') note += dicenumber;
    note += 'D';
    note += this.DiceType;
  }

  if(diceAndModifier){
    if(this.Modifier >= 0){
      note += ' + ';
    } else {
      modifier = modifier.replace('-', ' - ');
    }
  }
  if(modifier != '0') note += modifier;
  if(multiplier != '1' && diceAndModifier) note += ')';

  return note;
}
//the prototype for Skills, Gear, Talents, etc anything that has a link
function INQLink(text){
  //the details of the skill
  this.Bonus = 0;
  this.Quantity = 0;
  this.Groups = [];

  //allow the user to immediately parse a link in the constructor
  if(text != undefined){
    Object.setPrototypeOf(this, new INQLinkParser());
    this.parse(text);
    Object.setPrototypeOf(this, new INQLink());
  }

  this.valueOf = this.toNote;
}

INQLink.prototype = new INQObject();
INQLink.prototype.constructor = INQLink;
//display the handout as a link with details
INQLink.prototype.toNote = function(justText){
  var output = "";
  //do we already know the link?
  if(this.ObjID != "" || justText){
    output += this.toLink();
  } else {
    output += getLink(this.Name);
  }
  _.each(this.Groups,function(group){
    output += "(" + group + ")";
  });
  if(this.Quantity > 0){
    output += "(x" + this.Quantity.toString() + ")";
  }
  if(this.Bonus > 0){
    output += "+" + this.Bonus.toString();
  } else if (this.Bonus < 0) {
    output += "–" + Math.abs(this.Bonus).toString();
  }
  return output;
}
//takes the text of a link (and its adjacent notes) and stores them within an object
function INQLinkParser(){}

INQLinkParser.prototype = new INQLink();
INQLinkParser.prototype.constructor = INQLinkParser;
//take text and turn it into an INQLink
INQLinkParser.prototype.parse = function(text){
  var re = RegExp("^" + INQLinkParser.regex() + "$", "");
  var matches = text.match(re);
  if(matches){
    if(matches[1]){
      this.Name = matches[1].trim();
    }
    //parse out each group
    if(matches[2]){
      var regex = "\\(([^x\\(\\)][^\\(\\)]*)\\)";
      re = RegExp(regex, "g");
      var groups = matches[2].match(re);
      re = RegExp(regex, "");
      this.Groups = _.map(groups, function(group){
        groupMatches = group.match(re);
        return groupMatches[1];
      });
    }
    if(matches[3]){
      this.Quantity = Number(matches[3]);
    }
    if(matches[4] && matches[5]){
      this.Bonus = Number(matches[4].replace('–', '-') + matches[5]);
    }
  } else {
    whisper('Invalid INQLink');
    log('Invalid INQLink');
    log(text);
  }
}
//save the regex for the link and its adjoining notes
INQLinkParser.regex = function(){
  var regex = "\\s*(?:<a href=\"http:\\//journal\\.roll20\\.net\\/handout\\/[-\\w\\d]+\">)?"
  regex += "([^+<>\\(\\),; –-][^+<>;\\(\\)–]*)";
  regex += "(?:<\\/a>)?";
  regex += "\\s*((?:\\([^x\\(\\)][^\\(\\)]*\\))*)"
  regex += "\\s*(?:\\(\\s*x\\s*(\\d+)\\))?";
  regex += "\\s*(?:(\\+|-|–)\\s*(\\d+))?\\s*";

  return regex;
}
//the prototype for characters
function INQObject(){

  //Object details
  this.ObjType = "handout";
  this.ObjID = "";
  this.Name = "";

  //turns the prototype into an html hyperlink
  this.toLink = function(quantity){
    var output = "";
    //only return a link if it will go somewhere
    if(this.ObjID != ""){
      output = "<a href=\"http://journal.roll20.net/" + this.ObjType + "/" + this.ObjID + "\">" + this.Name + "</a>";
    } else {
      output = this.Name;
    }
    if(quantity != undefined){
      output += "(x" + quantity + ")";
    }
    return output;
  }
}
function INQImportParser(targetObj){
  this.target = targetObj;
  this.Patterns = [];
  this.UnlabledPatterns = [];
}
INQImportParser.prototype.getArmour = function(regex, property){
  this.Patterns.push({regex: regex, property: property, interpret: this.interpretArmour});
}
INQImportParser.prototype.getContent = function(regex, property){
  this.Patterns.push({regex: regex, property: property, interpret: this.interpretContent});
}
INQImportParser.prototype.getList = function(regex, property){
  this.Patterns.push({regex: regex, property: property, interpret: this.interpretList});
}
INQImportParser.prototype.getNothing = function(regex, property){
  this.Patterns.push({regex: regex, property: property, interpret: undefined});
}
INQImportParser.prototype.getNumber = function(regex, property){
  this.Patterns.push({regex: regex, property: property, interpret: this.interpretNumber});
}
INQImportParser.prototype.getUnlabled = function(regex, property){
  this.UnlabledPatterns.push({regex: regex, property: property});
}
INQImportParser.prototype.getWeapons = function(regex, property){
  this.Patterns.push({regex: regex, property: property, interpret: this.interpretWeapons});
}
INQImportParser.prototype.interpretArmour = function(content, properties){
  //all the details about the locations are contained in the last property
  var locations = properties.pop();
  //parse out each location with its armour value
  var matches = content.match(/\d*[\sa-z]{2,}\d*/gi);
  //step through each parsed location
  for(var i = 0; i < matches.length; i++){
    //step through each location
    for(var k in locations){
      if(locations[k].test(matches[i])){
        var number = matches[i].match(/\d+/);
        this.saveProperty(number[0], properties.concat(k));
      }
      if(/all/i.test(matches[i])){
        var number = matches[i].match(/\d+/);
        this.saveProperty(number[0], properties.concat(k));
      }
    }
  }
}
INQImportParser.prototype.interpretContent = function(content, properties){
  var inqlink = new INQLink(content);
  this.saveProperty(inqlink, properties);
}
INQImportParser.prototype.interpretLabeled = function(labeledLines){
  for(var line of labeledLines){
    line.content = line.content.replace(/\.\s*$/, '');
    var matched = false;
    for(var pattern of this.Patterns){
      if(pattern.regex.test(line.label)){
        matched = true;
        if(pattern.interpret){
          pattern.interpret.call(this, line.content, pattern.property);
        }
      }
    }
    if(!matched) this.SpecialRules.push({Name: line.label, Rule: line.content.trim()});
  }
}
INQImportParser.prototype.interpretList = function(content, properties){
  var List = [];
  //remove any occurance of a grammatical 'and' in the list
  content = content.replace(/,\s+and\s+/g, ', ');
  //replace commas that are outside parenthesies with semicolon
  var parenthesiesDepth = 0;
  content = content.split('');
  for(var i = 0; i < content.length; i++){
    if(content[i] == "("){
      parenthesiesDepth++;
    } else if(content[i] == ")"){
      parenthesiesDepth--;
    } else if(content[i] == "," && parenthesiesDepth <= 0){
      content[i] = ";";
    }
  }
  content = content.join('');
  //clean out any skill characteristic suggestions
  content = content.replace(/\((?:WS|BS|S|T|Ag|Per|WP|Int|Fel)\)/g, '');
  //create a pattern for items in the list
  var itemregex = new RegExp(INQLinkParser.regex(),'g');
  //create a list of all the items
  var itemList = content.match(itemregex);
  //break up each item into its parts and save those parts
  _.each(itemList, function(item){
    var inqlink = new INQLink(item);
    List.push(inqlink);
  });
  this.saveProperty(List, properties);
}
INQImportParser.prototype.interpretNumber = function(content, properties){
  var matches = content.match(/(?:\+\s*|-\s*|)\d+/g);
  if(!matches){return;}
  if(matches.length == 1){
    this.saveProperty(matches[0], properties);
  } else {
    this.saveProperty(matches, properties);
  }
}
INQImportParser.prototype.interpretWeapons = function(content, properties){
  var List = [];
  //replace parenthesies that are inside parenthesies with square brackets
  var parenthesiesDepth = 0;
  content = content.split('');
  for(var i = 0; i < content.length; i++){
    if(content[i] == '('){
      if(parenthesiesDepth > 0) content[i] = '[';
      parenthesiesDepth++;
    } else if(content[i] == ')'){
      parenthesiesDepth--;
      if(parenthesiesDepth > 0) content[i] = ']';
    }
  }
  content = content.join('');
  //separate each weapon out
  var re = RegExp(INQLinkParser.regex(), 'gi');
  var weaponMatches = content.match(re);
  //parse the weapons
  re = RegExp(INQLinkParser.regex(), 'i');
  for(var i = 0; i < weaponMatches.length; i++){
    var weapon = new INQWeapon(weaponMatches[i]);
    weapon.Name = weapon.Name.replace(/(?:^| )or /, '').replace(',', '');
    weapon.Name = weapon.Name.toTitleCase();
    List.push(weapon);
  }
  this.saveProperty(List, properties);
}
INQImportParser.prototype.parse = function(text){
  //split the input by line
  var lines = text.split(/\s*<br>\s*/);
  //disect each line into label and content (by the colon)
  var labeled = [];
  var unlabeled = [];
  this.SpecialRules = [];
  _.each(lines,function(line){
    if(line.match(/:/g)){
      //disect the content by label
      var label = line.substring(0,line.indexOf(":"));
      var content = line.substring(line.indexOf(":")+1);
      labeled.push({label: label, content: content});
    } else {
      //this line is not labeled
      //check if we can add this to the last labeled line
      if(labeled.length > 0){
        //attach this to the last bit of content
        labeled[labeled.length-1].content += " " + line;
      } else {
        //there is no label to attach this content to
        unlabeled.push(line);
      }
    }
  });

  //interpret the lines
  this.interpretLabeled(labeled);
  this.saveProperty(this.SpecialRules, "SpecialRules");
  return unlabeled;
}
INQImportParser.prototype.saveProperty = function(content, properties){
  if(!Array.isArray(properties)){
    properties = [properties];
  }
  var propertyTarget = this.target;
  for(var i = 0; i < properties.length-1; i++){
    propertyTarget = propertyTarget[properties[i]];
  }
  if(Array.isArray(properties[properties.length-1])){
    for(var i = 0; i < properties[properties.length-1].length && i < content.length; i++){
      propertyTarget[properties[properties.length-1][i]] = content[i];
    }
  } else {
    propertyTarget[properties[properties.length-1]] = content;
  }
}
//a prototype the will parse handouts and character sheets for use by other prototypes
function INQParser(object, mainCallback){
  //the text that will be parsed
  this.Text = "";

  //allow the user to specify the object to parse in the constructor
  var parser = this;
  var parserPromise = new Promise(function(resolve){
    if(object != undefined){
      parser.objectToText(object, function(){
        resolve();
      });
    } else {
      resolve();
    }
  });

  parserPromise.catch(function(e){log(e)});
  parserPromise.then(function(){
    if(object != undefined) parser.parse();
    if(typeof mainCallback == 'function') mainCallback(parser);
  });
}
//if there was no place for this line, add it as misc content
INQParser.prototype.addMisc = function(line){
  this.Misc.push({
    Name:    "",
    Content: line
  })
}
//add misc content to the current list (if it exists)
INQParser.prototype.addToList = function(line){
  //be sure there is a list to add to
  if(this.newList != undefined){
    this.newList.Content.push(line);
    //this line was accepted
    return true;
  }
  return false;
}
INQParser.prototype.balanceTags = function(Lines){
  var tags = [];
  tags.push({Opener: '<a href="https?://[^\\s>]*">', Closer: '</a>'});
  tags.push({Opener: '<strong>', Closer: '</strong>'});
  tags.push({Opener: '<em>', Closer: '</em>'});
  tags.push({Opener: '<u>', Closer: '</u>'});
  _.each(tags, function(tag){
    var openers = [];
    var closers = [];
    var j, subLine, text, jshift;
    for(var i = 0; i < Lines.length; i++) {
      subLine = Lines[i];
      jshift = 0;
      while(true) {
        j = subLine.search(RegExp(tag.Opener));
        if(j == -1) break;
        text = subLine.match(RegExp(tag.Opener))[0];
        subLine = subLine.substring(j + text.length);
        openers.push({text: text, j: j + jshift, i: i});
        jshift += j + text.length;
      }

      subLine = Lines[i];
      jshift = 0;
      while(true) {
        j = subLine.search(RegExp(tag.Closer));
        if(j == -1) break;
        text = subLine.match(RegExp(tag.Closer))[0];
        subLine = subLine.substring(j + text.length);
        closers.push({text: text, j: j + jshift, i: i});
        jshift += j + text.length;
      }
    }

    for(var opener of openers){
      for(var closer of closers){
        if(!closer.opener && (opener.i < closer.i || (opener.i == closer.i && opener.j < closer.j))){
          opener.closer = closer;
          closer.opener = opener;
          break;
        }
      }
    }

    for(var opener of openers){
      if(!opener.closer || /^((<[^<>]+>|\s+))*$/.test(Lines[opener.i].substring(opener.j))){
        opener.removed = true;
        Lines[opener.i] = Lines[opener.i].substring(0, opener.j)
          + Lines[opener.i].substring(opener.j).replace(RegExp(tag.Opener), '');
      }
    }

    for(var closer of closers){
      if(!closer.opener || /^((<[^<>]+>|\s+))*$/.test(Lines[closer.i].substring(0, closer.j))){
        closer.removed = true;
        Lines[closer.i] = Lines[closer.i].substring(0, closer.j)
          + Lines[closer.i].substring(closer.j).replace(RegExp(tag.Closer), '');
      }
    }

    for(var opener of openers){
      if(opener.closer && opener.i != opener.closer.i){
        for(var i = opener.i; i <= opener.closer.i; i++){
          if(i == opener.i && opener.removed) continue;
          if(i == opener.closer.i && opener.closer.removed) continue;
          if(i != opener.i) Lines[i] = opener.text + Lines[i];
          if(i != opener.closer.i) Lines[i] = Lines[i] + opener.closer.text;
        }
      }
    }

  });

  return Lines;
}
//complete the old list and save it, preparing for a new list
INQParser.prototype.completeOldList = function(){
  if(this.newList != undefined){
    this.Lists.push(this.newList);
    this.newList = undefined;
  }
}
//extract the text out of an object
INQParser.prototype.objectToText = function(obj, callback){
  var parser = this;
  var toTextPromise = new Promise(function(resolve){
    switch(obj.get("_type")){
      case 'handout':
        obj.get('notes', function(notes){resolve({notes: notes});});
        break;
      case 'character':
        obj.get('bio', function(bio){resolve({notes: bio});});
        break;
    }
  });

  toTextPromise.catch(function(e){log(e)});
  toTextPromise.then(function(Notes){
    return new Promise(function(resolve){
      obj.get('gmnotes', function(gmnotes){
        Notes.gmnotes = gmnotes;
        resolve(Notes);
      });
    });
  }).then(function(Notes){
    //be sure a null result was not given
    if(Notes.notes == 'null'){
      Notes.notes = '';
    }
    if(Notes.gmnotes == 'null'){
      Notes.gmnotes = '';
    }
    //save the result
    parser.Text = Notes.notes + "<br>" + Notes.gmnotes;
    if(typeof callback == 'function') callback(parser);
  }).catch(function(e){log(e)});
}
INQParser.prototype.parse = function(){
  //empty out any old content
  this.Tables = [];
  this.Rules  = [];
  this.Lists  = [];
  this.Misc   = [];

  //break the text up by lines
  var Lines = this.Text.split(/(?:<br>|\n|<\/?ul>|<\/?div>|<\/?li>)/);
  Lines = this.balanceTags(Lines);
  for(var i = 0; i < Lines.length; i++){
    this.parseLine(Lines[i]);
  }
  //finish off any in-progress lists
  this.completeOldList();
}
//if this is the beginning of a new list, start a new list
INQParser.prototype.parseBeginningOfList = function(line){
  var re = /^\s*(?:<(?:strong|em|u)>)+([^:]+?)(?:<\/(?:strong|em|u)>)+\s*$/;
  var matches = line.match(re);
  if(matches){
    //tidy up the last list first
    this.completeOldList();
    //start the new list
    this.newList = {
      Name: matches[1],
      Content: []
    }
    //this line has been properly parsed
    return true;
  }
  return false;
}
//disect a single line
INQParser.prototype.parseLine = function(line){
  //be sure there is a line to work with
  if(!line) return;
  line = this.replaceInnerParentheses(line);
  //try each way of parsing the line and quit when it is successful
  if(this.parseRule(line)){return;}
  if(this.parseTable(line)){return;}
  if(this.parseBeginningOfList(line)){return;}
  if(this.addToList(line)){return;}
  //if nothing fits, add the line to the misc content
  this.addMisc(line);
}
//if this line is a rule, save it
INQParser.prototype.parseRule = function(line){
  var re = /^\s*(?:<(?:strong|em|u)>)+(.+?)(?:<\/(?:strong|em|u)>)+\s*:\s*(.+)$/;
  var matches = line.match(re);
  if(matches){
    //finish off any in-progress lists
    this.completeOldList();
    //add the rule
    this.Rules.push({
      Name:    matches[1],
      Content: matches[2]
    });
    //this line has been properly parsed
    return true;
  }
  return false;
}
//if this line is a table, save it
INQParser.prototype.parseTable = function(line){
  var re = /^\s*(?:<(?:strong|em|u)>)*(.*?)(?:<(?:strong|em|u)>)*\s*<table>(.*)<\/table>\s*$/;
  var matches = line.match(re);
  if(matches){
    //finish off any in-progress lists
    this.completeOldList();
    //store the content of the tables here
    var table = [];
    //break the table into rows
    re = /<tr>(.*?)<\/tr>/g
    var rows = matches[2].match(re);
    if(rows == null){rows = [];}
    for(var i = 0; i < rows.length; i++){
      //break each row into cells, while maintaining the overall structure
      re = /<td>(.*?)<\/td>/g
      var cells = rows[i].match(re);
      if(cells == null){cells = [];}
      for(var j = 0; j < cells.length; j++){
        //trim down each cell to just the content
        cells[j] = cells[j].replace(/<\/?td>/g, "");
        //be sure a column exists for the content
        table[j] = table[j] || [];
        //save the content
        table[j][i] = cells[j];
      }
    }
    //the table has been disected, save it
    this.Tables.push({
      Name:    matches[1],
      Content: table
    });
    //the line was properly parsed
    return true;
  }
  return false;
}
INQParser.prototype.replaceInnerParentheses = function(line){
  var parenthesiesDepth = 0;
  line = line.split('');
  for(var i = 0; i < line.length; i++){
    if(line[i] == '('){
      if(parenthesiesDepth > 0) line[i] = '[';
      parenthesiesDepth++;
    } else if(line[i] == ')'){
      parenthesiesDepth--;
      if(parenthesiesDepth > 0) line[i] = ']';
    }
  }
  return line.join('');
}
//the prototype for characters
function INQStarship(){
  //object details
  this.controlledby = "";
  this.ObjType = "character";

  //default character bio details
  this.Details = {};
  this.Details.Hull =       "Raider";
  this.Details.Class =      "?";
  this.Details.Dimentions = "?";
  this.Details.Mass =       "?";
  this.Details.Crew =       "?";
  this.Details.Accel =      "?";

  this.Speed = 0;
  this.WeaponCapacity = "";

  //default character skills and items
  this.List = {};
  this.List["Essential Components"] = [];
  this.List["Supplemental Components"] = [];
  this.List["Weapon Components"] = [];

  //any rules that aren't listed elsewhere
  this.SpecialRules  = [];

  //default character sheet attributes
  this.Attributes = {};

  this.Attributes.Population = 100;
  this.Attributes.Morale = 100;
  this.Attributes.Hull = 1;
  this.Attributes.VoidShields = 0;

  this.Attributes.Armour_F = 0;
  this.Attributes.Armour_P = 0;
  this.Attributes.Armour_S = 0;
  this.Attributes.Armour_A = 0;

  this.Attributes.Turret = 1;
  this.Attributes.Crew = 10;
  this.Attributes.Manoeuvrability = 0;
  this.Attributes.Detection = 0;
}

INQStarship.prototype = new INQCharacter();
INQStarship.prototype.constructor = INQStarship;
INQStarship.prototype.getCharacterBio = function(){
  //create the gmnotes of the character
  var gmnotes = "";

  //write down the vehicle details
  for(var k in this.Details){
    gmnotes += "<i>" + k + ": " + this.Details[k] + "</i><br>";
  }

  gmnotes += "<br>";

  gmnotes += "<strong>Speed</strong>: ";
  gmnotes += this.Speed;
  gmnotes += "<br>";

  gmnotes += "<strong>Weapon Capacity</strong>: ";
  gmnotes += this.WeaponCapacity;
  gmnotes += "<br>";

  //display every list
  for(var list in this.List){
    //starting with the name of the list
    gmnotes += "<br>";
    gmnotes += "<u><strong>" + list + "</strong></u>";
    gmnotes += "<br>";
    //make a note for each item in the list
    _.each(this.List[list], function(item){
      gmnotes += item.toNote() + "<br>";
    });
  }

  //tack on any Special Rules
  _.each(this.SpecialRules, function(rule){
    gmnotes += "<br>";
    gmnotes += "<strong>" + rule.Name + "</strong>: ";
    gmnotes += rule.Rule;
    gmnotes += "<br>";
  });

  return gmnotes;
}
function INQTest(options){
  if(typeof options != 'object') options = {};
  this.Modifiers = [];

  this.Characteristic = '';
  this.PartyStat = false;
  this.Skill = '';
  this.Subgroup = '';

  this.Die = -1;
  this.Successes = -1;
  this.Failures = -1;

  this.Stat = undefined;
  this.Unnatural = undefined;

  this.setSubgroup(options.skill);
  this.setSkill(options.skill);
  this.setCharacteristic(options.characteristic);
  this.addModifier(options.modifier);
  this.getStats(options.inqcharacter);
  this.getSkillModifier(options.inqcharacter);
}
INQTest.prototype.addModifier = function(modifiers){
  if(!modifiers) return;
  if(typeof modifiers == 'string') modifiers = Number(modifiers);
  if(typeof modifiers == 'number') this.Modifiers.push({Name: 'Other', Value: modifiers});
  if(Array.isArray(modifiers)) {
    for(var modifier of modifiers) {
      this.addModifier(modifier);
    }
    return;
  }
  if(typeof modifiers == 'object'){
    if(!modifiers.Name) modifiers.Name = 'Other';
    if(typeof modifiers.Value == 'string') modifiers.Value = Number(modifiers.Value);
    if(!modifiers.Value) return;
    this.Modifiers.push(modifiers);
  }
}
INQTest.characteristics = function(){
  return [
    {Name: 'WS',  Alternates: ['Weapon Skill']},
    {Name: 'BS',  Alternates: ['Ballistic Skill']},
    {Name: 'S',   Alternates: ['Strength']},
    {Name: 'T',   Alternates: ['Toughness']},
    {Name: 'Ag',  Alternates: ['Agility']},
    {Name: 'It',  Alternates: ['Inteligence', 'Int']},
    {Name: 'Wp',  Alternates: ['Willpower']},
    {Name: 'Per', Alternates: ['Perception', 'Pr']},
    {Name: 'Fe',  Alternates: ['Fellowship', 'Fel']},
    {Name: 'Corruption',  Alternates: ['Cor']},
    {Name: 'Insanity'},
    {Name: 'Renown'},
    {Name: 'Morale'},
    {Name: 'Crew'},
    {Name: 'Profit Factor', Alternates: ['PF'], PartyStat: true}
  ];
}
INQTest.prototype.display = function(playerid, name, gm){
  var output = '';
  var skillName = getLink(this.Skill);
  if(this.Subgroup) skillName += '(' + this.Subgroup + ')';
  if(gm){
    output += '/w gm ';
    if(!playerIsGM(playerid)) {
      var testName;
      if(skillName){
        testName = skillName + '(' + this.Characteristic + ')';
      } else {
        testName = this.Characteristic;
      }

      whisper('Rolling ' + testName + ' for the GM.', {speakingTo: playerid});
    }
  }

  output += '&{template:default} ';
  output += '{{name=<strong>' + this.Characteristic + '</strong>';
  if(name) output += ': ' + name;
  output += '}} ';
  if(skillName) output += '{{Skill=' + skillName + '}}';
  var formula = new INQFormula('D100');
  formula.DiceNumber = -1;
  formula.Modifier = this.Stat;
  for(var modifier of this.Modifiers) formula.Modifier += modifier.Value;
  formula.Multiplier = 0.1;
  var inline = formula.toInline();
  if(this.Die > 0) inline = inline.replace('1D100', '(' + this.Die + ')');
  output += '{{Successes=' + inline + '}} ';
  if(this.Unnatural >= 0) output += '{{Unnatural=[[ceil((' + this.Unnatural + ')/2)]]}} ';
  if(this.Modifiers.length) {
    output += '{{Modifiers=';
    for(var modifier of this.Modifiers){
      output += modifier.Name + '(';
      if(modifier.Value > 0) output += '+';
      output += modifier.Value + '), ';
    }
    output = output.replace(/,\s*$/, '');
    output += '}}';
  }

  announce(output, {speakingAs: 'player|' + playerid});
}
INQTest.prototype.getSkillModifier = function(inqcharacter){
  if(!this.Skill || !inqcharacter) return;
  var modifier = -20;
  var skill = inqcharacter.has(this.Skill, 'Skills');
  if(skill){
    if(skill.length > 0){
      if(this.Subgroup){
        var re = toRegex(this.Subgroup);
        _.each(skill, function(subgroup){
          if(re.test(subgroup.Name) || /\s*all\s*/.test(subgroup.Name)){
            if(subgroup.Bonus > modifier) modifier = subgroup.Bonus;
          }
        });
      } else {
        return whisper('Please specify a subgroup for *' + getLink(this.Skill) + '*');
      }
    } else {
      modifier = skill.Bonus;
    }
  }

  this.addModifier({Name: 'Skill', Value: modifier});
}
INQTest.prototype.getStats = function(inqcharacter){
  if(!this.Characteristic || !inqcharacter) return;
  if(!this.PartyStat){
    this.Stat = inqcharacter.Attributes[this.Characteristic];
    this.Unnatural = inqcharacter.Attributes['Unnatural ' + this.Characteristic];
  } else {
    this.Stat = attributeValue(this.Characteristic);
    this.Unnatural = attributeValue('Unnatural ' + this.Characteristic, {alert: false});
  }
}
INQTest.prototype.roll = function(){
  this.Die = randomInteger(100);
  var total = 0;
  for(var modifier of this.Modifiers){
    total += modifier.Value;
  }
  var test = this.Stat + total - this.Die;
  this.Successes = Math.floor(Math.abs(test)/10);
  this.Successes += Math.ceil(this.Unnatural/2);
  if(test < 0) {
    this.Failures = this.Successes;
    this.Successes = -1;
  } else {
    this.Failures = -1;
  }

  return this.Successes;
}
INQTest.prototype.setCharacteristic = function(input){
  if(!input) return false;
  var characteristics = INQTest.characteristics();
  for(var characteristic of characteristics){
    if(toRegex(characteristic).test(input)){
      this.Characteristic = characteristic.Name
      this.PartyStat = characteristic.PartyStat;
      return true;
    }
  }

  return false;
}
INQTest.prototype.setSkill = function(input){
  if(!input) return false;
  input = input.replace(/\(.*\)/, '');
  if(this.setCharacteristic(input)) return true;
  var skills = INQTest.skills();
  for(var skill of skills){
    if(toRegex(skill).test(input)){
      this.Skill = skill.Name;
      this.Characteristic = skill.DefaultStat;
      return true;
    }
  }

  return false;
}
INQTest.prototype.setSubgroup = function(input){
  if(!input) return false;
  var matches = input.match(/\(([^\)]+)\)/);
  if(matches) {
    this.Subgroup = matches[1];
    return true;
  } else {
    return false;
  }
}
INQTest.skills = function(){
  return [
    {Name: 'Acrobatics',      DefaultStat: 'Ag'},
    {Name: 'Athletics',       DefaultStat: 'S'},
    {Name: 'Awareness',       DefaultStat: 'Per'},
    {Name: 'Barter',          DefaultStat: 'Fe'},
    {Name: 'Blather',         DefaultStat: 'Fe'},
    {Name: 'Carouse',         DefaultStat: 'T'},
    {Name: 'Charm',           DefaultStat: 'Fe'},
    {Name: 'Chem-Use',        DefaultStat: 'It'},
    {Name: 'Ciphers',         DefaultStat: 'It'},
    {Name: 'Climb',           DefaultStat: 'S'},
    {Name: 'Commerce',        DefaultStat: 'Fe'},
    {Name: 'Command',         DefaultStat: 'Fe'},
    {Name: 'Common Lore',     DefaultStat: 'It'},
    {Name: 'Concealment',     DefaultStat: 'Ag'},
    {Name: 'Contortionist',   DefaultStat: 'Ag'},
    {Name: 'Deceive',         DefaultStat: 'Fe'},
    {Name: 'Demolition',      DefaultStat: 'It'},
    {Name: 'Disguise',        DefaultStat: 'It'},
    {Name: 'Dodge',           DefaultStat: 'Ag'},
    {Name: 'Drive',           DefaultStat: 'Ag'},
    {Name: 'Evaluate',        DefaultStat: 'It'},
    {Name: 'Forbidden Lore',  DefaultStat: 'It'},
    {Name: 'Gamble',          DefaultStat: 'It'},
    {Name: 'Inquiry',         DefaultStat: 'Fe'},
    {Name: 'Interrogation',   DefaultStat: 'It'},
    {Name: 'Intimidate',      DefaultStat: 'S'},
    {Name: 'Invocation',      DefaultStat: 'Wp'},
    {Name: 'Literacy',        DefaultStat: 'It'},
    {Name: 'Logic',           DefaultStat: 'It'},
    {Name: 'Medicae',         DefaultStat: 'It'},
    {Name: 'Navigation',      DefaultStat: 'It'},
    {Name: 'Performer',       DefaultStat: 'Fe'},
    {Name: 'Pilot',           DefaultStat: 'Ag'},
    {Name: 'Psyniscience',    DefaultStat: 'Per'},
    {Name: 'Scholastic Lore', DefaultStat: 'It'},
    {Name: 'Scrutiny',        DefaultStat: 'Per'},
    {Name: 'Search',          DefaultStat: 'Per'},
    {Name: 'Secret Tongue',   DefaultStat: 'It'},
    {Name: 'Security',        DefaultStat: 'It'},
    {Name: 'Shadowing',       DefaultStat: 'Ag'},
    {Name: 'Silent Move',     DefaultStat: 'Ag'},
    {Name: 'Sleight of Hand', DefaultStat: 'Ag'},
    {Name: 'Speak Language',  DefaultStat: 'It'},
    {Name: 'Survival',        DefaultStat: 'It'},
    {Name: 'Swim',            DefaultStat: 'S'},
    {Name: 'Tactics',         DefaultStat: 'It'},
    {Name: 'Tech-Use',        DefaultStat: 'It'},
    {Name: 'Tracking',        DefaultStat: 'It'},
    {Name: 'Trade',           DefaultStat: 'Ag'},
    {Name: 'Wrangling',       DefaultStat: 'Fe'}
  ];
}
function INQTurns(){
  //get the JSON string of the turn order and make it into an array
  if(!Campaign().get("turnorder")){
    //We check to make sure that the turnorder isn't just an empty string first. If it is treat it like an empty array.
    this.turnorder = [];
  } else {
    //otherwise turn the turn order into an array
    this.turnorder = carefulParse(Campaign().get("turnorder")) || {};
  }
}

//add or replace a turn
INQTurns.prototype.addTurn = function(graphic, initiative, custom){
  var turnobj = this.toTurnObj(graphic, initiative, custom);
  //delete any previous instances of this character
  this.removeTurn(turnobj.id);
  //be sure the turns are properly ordered
  if(this.isDescending()){
    //determine where a new turn starts
    var startIndex = this.largestIndex();
    //if the array is empty, just add the turn
    if(startIndex == undefined){
      return this.turnorder.push(turnobj);
    }
    var turnAdded = false;
    for(var i = startIndex; i < this.turnorder.length; i++){
      if(this.higherInit(turnobj, this.turnorder[i])){
        //insert the turn here
        this.turnorder.splice(i, 0, turnobj);
        turnAdded = true;
        break;
      }
    }

    if(!turnAdded){
      for(var i = 0; i < startIndex; i++){
        if(this.higherInit(turnobj, this.turnorder[i])){
          //insert the turn here
          this.turnorder.splice(i, 0, turnobj);
          turnAdded = true;
          break;
        }
      }
    }
    if(!turnAdded){
      if(startIndex == 0){
        this.turnorder.push(turnobj);
      } else {
        this.turnorder.splice(startIndex, 0, turnobj);
      }
    }
  } else {
    //just add the turn on the end
    this.turnorder.push(turnobj);
  }
}
//get the initiative roll of a turn already in the turn order
INQTurns.prototype.getInit = function(graphicid){
  for(var i = 0; i < this.turnorder.length; i++){
    if(graphicid == this.turnorder[i].id) return Number(this.turnorder[i].pr);
  }
}
INQTurns.prototype.higherInit = function(newTurn, turn){
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
    //only load up the Ag/Detection if the characters exist
    if(challengerID != undefined && championID != undefined){
      challengerAg = attributeValue('Ag', {graphicid: challengerID, alert: false});
      championAg = attributeValue('Ag', {graphicid: championID, alert: false});
      //the character may not have an Agility attribute, try Detection
      if(challengerAg == undefined) challengerAg = attributeValue('Detection', {graphicid: challengerID});
      if(championAg == undefined) championAg = attributeValue('Detection', {graphicid: championID});
    }

    //if actual values were found for Ag/Detection for both of them, compare the two
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
INQTurns.prototype.isDescending = function(){
  var prev = undefined;
  var first = undefined;
  var LargestIndex = this.largestIndex();
  for(var i = 0; i < this.turnorder.length; i++){
    if(!(prev == undefined || Number(this.turnorder[i].pr) <= prev || i == LargestIndex)) return false;
    if(first == undefined) first = Number(this.turnorder[i].pr);
    prev = Number(this.turnorder[i].pr);
  }

  return (LargestIndex == 0 || first <= prev || this.turnorder.length == 0);
}
INQTurns.prototype.largestIndex = function(){
  var result = undefined;
  var largest = undefined;

  for(var i = 0; i < this.turnorder.length; i++){
    if(largest == undefined || Number(this.turnorder[i].pr) > largest){
      largest = Number(this.turnorder[i].pr);
      result = i;
    }
  }

  return result;
}
INQTurns.prototype.removeTurn = function(graphicid){
  //step through the turn order and delete any previous initiative rolls
  for(var i = 0; i < this.turnorder.length; i++){
    //has this token already been included?
    if(graphicid == this.turnorder[i].id){
      //remove this entry
      this.turnorder.splice(i, 1);
      //the array has shrunken, take a step back
      i--;
    }
  }
}
//save the turn order in the Campaign
INQTurns.prototype.save = function(){
  Campaign().set("turnorder", JSON.stringify(this.turnorder));
}
//creates a turn object for the listed graphic and initiative roll
INQTurns.prototype.toTurnObj = function(graphic, initiative, custom){
  //create a turn object
  var turnObj = {};
  turnObj.custom = custom || '';
  turnObj.id = graphic.id;
  turnObj.pr = initiative + '';
  turnObj._pageid = graphic.get("_pageid");
  return turnObj;
}
//the prototype for characters
function INQVehicle(vehicle, graphic, callback){
  //object details
  this.controlledby = "";
  this.ObjType = "character";

  //default character bio details
  this.Bio = {};
  this.Bio.Type = "Ground Vehicle";
  this.Bio["Tactical Speed"] = "0 m";
  this.Bio["Cruising Speed"] = "0 kph";
  this.Bio.Size = "Massive";
  this.Bio.Crew = "Driver";
  this.Bio["Carry Capacity"] = "-";
  this.Bio.Renown = '';
  this.Bio.Availability = '';

  //default character skills and items
  this.List = {};
  this.List.Weapons = [];
  this.List["Vehicle Traits"] = [];

  //any rules that aren't listed elsewhere
  this.SpecialRules  = [];

  //default character sheet attributes
  this.Attributes = {};

  this.Attributes["Structural Integrity"] = 1;
  this.Attributes["Unnatural Structural Integrity"] = 0;
  this.Attributes["Tactical Speed"] = 0;
  this.Attributes["Aerial Speed"] = 0;

  this.Attributes.Armour_F = 0;
  this.Attributes.Armour_S = 0;
  this.Attributes.Armour_R = 0;

  this.Attributes.Manoeuvrability = 0;

  //allow the user to immediately parse a character in the constructor
  var inqvehicle = this;
  var myPromise = new Promise(function(resolve){
    if(vehicle != undefined){
      if(typeof vehicle == "string"){
        Object.setPrototypeOf(inqvehicle, new INQVehicleImportParser());
        inqvehicle.parse(vehicle);
        resolve(inqvehicle);
      } else {
        Object.setPrototypeOf(inqvehicle, new INQVehicleParser());
        inqvehicle.parse(vehicle, graphic, function(){
          resolve(inqvehicle);
        });
      }
    } else {
      resolve(inqvehicle);
    }
  });

  myPromise.catch(function(e){log(e)});
  myPromise.then(function(inqvehicle){
    if(typeof vehicle != 'undefined'){
      Object.setPrototypeOf(inqvehicle, new INQVehicle());
    }

    if(typeof callback == 'function'){
      callback(inqvehicle);
    }
  });
}

INQVehicle.prototype = new INQCharacter();
INQVehicle.prototype.constructor = INQVehicle;
//create a character object from the prototype
INQVehicle.prototype.getCharacterBio = function(){
  //create the gmnotes of the character
  var gmnotes = "";

  //write down the vehicle details
  for(var k in this.Bio){
    if(this.Bio[k] == '') continue;
    gmnotes += "<strong>" + k + "</strong>: ";
    gmnotes += this.Bio[k] + "<br>";
  }

  //display every list
  for(var list in this.List){
    //starting with the name of the list
    gmnotes += "<br>";
    gmnotes += "<u><strong>" + list + "</strong></u>";
    gmnotes += "<br>";
    //make a note for each item in the list
    _.each(this.List[list], function(item){
      gmnotes += item + "<br>";
    });
  }

  //tack on any Special Rules
  _.each(this.SpecialRules, function(rule){
    gmnotes += "<br>";
    gmnotes += "<strong>" + rule.Name + "</strong>: ";
    gmnotes += rule.Rule;
    gmnotes += "<br>";
  });

  return gmnotes;
}
function INQVehicleImportParser(){}

INQVehicleImportParser.prototype = Object.create(INQVehicle.prototype);
INQVehicleImportParser.prototype.constructor = INQVehicleImportParser;
INQVehicleImportParser.prototype.getSpeeds = function(){
  var speed = this.Bio['Tactical Speed'] + '';
  var matches = speed.match(/(\d+)\s*m/);
  if(matches){
    this.Attributes['Tactical Speed'] = Number(matches[1]);
  }
  matches = speed.match(/(\d+)\s*(?:<[^>]+>)?AUs/);
  if(matches){
    this.Attributes['Aerial Speed'] = Number(matches[1]);
  }
}
INQVehicleImportParser.prototype.parse = function(text){
  var parser = new INQImportParser(this);
  parser.getContent(/^\s*type\s*$/i, ["Bio", "Type"]);
  parser.getContent(/^\s*tactical\s+speed\s*$/i, ["Bio", "Tactical Speed"]);
  parser.getContent(/^\s*cruising\s+speed\s*$/i, ["Bio", "Cruising Speed"]);
  parser.getContent(/^\s*size\s*$/i, ["Bio", "Size"]);
  parser.getContent(/^\s*crew\s*$/i, ["Bio", "Crew"]);
  parser.getNumber(/^\s*manoeuvrability\s*$/i, ["Attributes", "Manoeuvrability"]);
  parser.getNumber(/^\s*structural\s+integrity\s*$/i, ["Attributes", "Structural Integrity"]);
  parser.getContent(/^\s*carry(ing)?\s+capacity\s*$/i, ["Bio", "Carry Capacity"]);
  parser.getContent(/^\s*renown\s*$/i, ["Bio", "Renown"]);
  parser.getContent(/^\s*availability\s*$/i, ["Bio", "Availability"]);
  parser.getList(/^\s*vehicle\s+traits\s*$/i, ["List", "Vehicle Traits"]);
  parser.getWeapons(/^\s*weapons\s*$/i, ["List", "Weapons"]);
  parser.getArmour(/^\s*armour\s*$/i, ["Attributes", {
    Armour_F: /\s*front\s*/i,
    Armour_S: /\s*side\s*/i,
    Armour_R: /\s*rear\s*/i
  }]);
  parser.parse(text);

  this.getSpeeds();
}
//takes the character object and turns it into the INQCharacter Prototype
function INQVehicleParser(){
  //the text that will be parsed
  this.Text = "";
}

INQVehicleParser.prototype = Object.create(INQVehicle.prototype);
INQVehicleParser.prototype.constructor = INQVehicleParser;
//the full parsing of the character
INQVehicleParser.prototype.parse = function(character, graphic, callback){
  var parser = this;
  var myPromise = new Promise(function(resolve){
    parser.Content = new INQParser(character, function(){
      resolve(parser);
    });
  });

  myPromise.catch(function(e){log(e)});
  myPromise.then(function(parser){
    parser.Name = character.get("name");
    parser.ObjID = character.id;
    parser.ObjType = character.get("_type");

    if(graphic) parser.GraphicID = graphic.id;

    parser.controlledby = character.get("controlledby");

    parser.parseLists();
    parser.parseLabels();
    parser.parseAttributes(graphic);
    if(typeof callback == 'function'){
      callback(parser);
    }
  });
}
//saves every attribute the character has
INQVehicleParser.prototype.parseAttributes = function(graphic){
  //start with the character sheet attributes
  var attributes = findObjs({
    _type: 'attribute',
    _characterid: this.ObjID
  });
  for(var attr of attributes){
    this.Attributes[attr.get('name')] = Number(attr.get('current'));
  }
  //when working with a generic enemy's current stats, we need to check for temporary values
  //generic enemies are those who represent a character, yet none of their stats are linked
  if(graphic != undefined
  && graphic.get('bar1_link') == ''
  && graphic.get('bar2_link') == ''
  && graphic.get('bar3_link') == ''){
    //roll20 stores token gmnotes in URI component
    var localAttributes = new LocalAttributes(graphic);
    for(var k in localAttributes.Attributes){
      this.Attributes[k] = Number(localAttributes.Attributes[k]);
    }
  }
}
//saves any notes on the character
INQVehicleParser.prototype.parseLabels = function(){
  for(var i = 0; i < this.Content.Rules.length; i++){
    var label = this.Content.Rules[i].Name.trim();
    var content = this.Content.Rules[i].Content.trim();
    if(/^\s*type\s*$/i.test(label)){
      this.Bio.Type = new INQLink(content);
    } else if(/^\s*tactical\s+speed\s*$/i.test(label)){
      this.Bio['Tactical Speed'] = content;
    } else if(/^\s*cruising\s+speed\s*$/i.test(label)){
      this.Bio['Cruising Speed'] = content;
    } else if(/^\s*size\s*$/i.test(label)){
      this.Bio.Size = content;
    } else if(/^\s*crew\s*$/i.test(label)){
      this.Bio.Crew = content;
    } else if(/^\s*carry(ing)?\s+capacity\s*$/i.test(label)){
      this.Bio['Carry Capacity'] = content;
    } else if(/^\s*renown\s*$/i.test(label)){
      this.Bio.Renown = content;
    } else if(/^\s*availability\s*$/i.test(label)){
      this.Bio.Availability = content;
    } else {
      this.SpecialRules.push({Name: label, Rule: content});
    }
  }
}
//take apart this.Text to find all of the lists
//currently it assumes that weapons will be in the form of a link
INQVehicleParser.prototype.parseLists = function(){
  //empty the previous lists
  var Lists = {};
  //work through the parsed lists
  _.each(this.Content.Lists, function(list){
    var name = list.Name;
    //be sure the list name is recognized and in the standard format
    if(/weapon/i.test(name)){
      name = "Weapons";
    } else if(/trait/i.test(name)){
      name = "Vehicle Traits";
    } else {
      //quit if the name is not approved
      return false;
    }
    //save the name of the list
    Lists[name] = Lists[name] || [];
    _.each(list.Content, function(item){
      //make the assumption that each item is a link (or just a simple phrase)
      var inqitem = new INQLink(item);
      //only add the item if it was succesfully parsed
      if(inqitem.Name && inqitem.Name != ""){
        Lists[name].push(inqitem);
      }
    });
  });
  this.List = Lists;
}
//the prototype for weapons
function INQWeapon(weapon, callback){
  //default weapon stats
  this.Class              = 'Melee';
  this.Range              = new INQFormula('0');

  this.Single             = true;
  this.Semi               = new INQFormula('0');
  this.Full               = new INQFormula('0');

  this.Damage             = new INQFormula('0');
  this.DamageType         = new INQLink('I');

  this.Penetration        = new INQFormula('0');

  this.Clip               = 0;
  this.Reload             = -1;
  this.Special            = [];
  this.Weight             = 0;

  this.Requisition        = -1;
  this.Renown             = '';
  this.Availability       = '';

  this.FocusModifier      = 0;
  this.FocusTest          = 'Wp';
  this.Opposed            = false;

  //allow the user to immediately parse a weapon in the constructor
  var inqweapon = this;
  var myPromise = new Promise(function(resolve){
    if(weapon != undefined){
      if(typeof weapon == 'string'){
        Object.setPrototypeOf(inqweapon, new INQWeaponNoteParser());
        inqweapon.parse(weapon);
        resolve(inqweapon);
      } else {
        Object.setPrototypeOf(inqweapon, new INQWeaponParser());
        inqweapon.parse(weapon, function(){
          resolve(inqweapon);
        });
      }
    } else {
      resolve(inqweapon);
    }
  });

  myPromise.catch(function(e){log(e)});
  myPromise.then(function(){
    if(weapon != undefined) Object.setPrototypeOf(inqweapon, new INQWeapon());
    if(typeof callback == 'function') callback(inqweapon);
  });

  this.valueOf = this.toNote;
};

INQWeapon.prototype = new INQObject();
INQWeapon.prototype.constructor = INQWeapon;
//check if the weapon has an inqlink with the given name
//if there are no subgroups for the inqlink, just return {Bonus}
//if there are, return the inqlink's subgroups with a bonus for each
//if nothing was found, return undefined
INQWeapon.prototype.has = function(ability){
  var info = undefined;
  _.each(this.Special, function(rule){
    if(rule.Name == ability){
      //if we have not found the rule yet
      if(info == undefined){
        //does the found skill have subgroups?
        if(rule.Groups.length > 0){
          //the inklink has subgroups and each will need their own bonus
          info = [];
          _.each(rule.Groups, function(subgroup){
            info.push({
              Name:  subgroup,
              Bonus: rule.Bonus
            });
          });
        } else {
          //the inqlink does not have subgroups
          info = {
            Bonus: rule.Bonus
          };
        }
      //if the rule already has been found
      //AND the rule has subgroups
      //AND the previously found rule had subgroups
      } else if(rule.Groups.length > 0 && info.length > 0){
        //add the new found subgroups in with their own bonuses
        _.each(rule.Groups, function(){
          info.push({
            Name:  subgroup,
            Bonus: rule.Bonus
          });
        });
      }
    }
  });
  return info;
}
INQWeapon.prototype.set = function(properties){
  for(var prop in properties){
    if(this[prop] != undefined){
      if(Array.isArray(this[prop])){
        var items = properties[prop].split(',');
        for(var item of items){
          if(/^\s*$/.test(item)) continue;
          this[prop].push(new INQLink(item.trim()));
        }
      } else if(typeof this[prop] == 'object'){
        this[prop] = new this[prop].constructor(properties[prop]);
      } else {
        this[prop] = properties[prop];
      }
    }
  }
}
INQWeapon.prototype.toAbility = function(inqcharacter, options, ammo){
  if(typeof options != 'object') options = {};
  this.set(options);
  var output = '!useWeapon ';
  output += this.Name;
  if(!this.has('Spray') || this.Class == 'Psychic'){
    options.Modifier = '?{Modifier|0}';
    var rates = [];
    if(this.Single || (this.Semi.onlyZero() && this.Full.onlyZero())){
      rates.push('Single');
      if(this.Class != 'Psychic'){
        rates.push('Called Shot');
        if(this.Class == 'Melee') rates.push('All Out Attack');
      }
    }

    if(!this.Semi.onlyZero()) rates.push('Semi Auto(' + this.Semi + ')');
    if(!this.Full.onlyZero()) rates.push('Full Auto(' + this.Full + ')');
    if(inqcharacter && this.Class == 'Melee'){
      if(inqcharacter.has('Swift Attack', 'Talents')) rates.push('Swift Attack');
      if(inqcharacter.has('Lightning Attack', 'Talents')) rates.push('Lightning Attack');
    }

    if(rates.length > 1){
      options.RoF = '?{Rate of Fire|';
      _.each(rates, function(rate){
        options.RoF += rate + '|';
      });
      options.RoF = options.RoF.replace(/\|$/,'');
      options.RoF += '}';
    } else if(rates.length == 1){
      options.RoF = rates[0];
    }
  }

  if(inqcharacter && this.Class == 'Psychic') {
    options.EffectivePR = '?{Effective PsyRating|@{' + inqcharacter.Name + '|PR}}';
  }

  if(ammo){
    if(ammo.length == 1){
      options.Ammo = ammo[0];
    } else if (ammo.length > 1){
      options.Ammo = '?{Special Ammunition|'
      _.each(ammo, function(choice){
        options.Ammo += choice + '|'
      });
      options.Ammo = options.Ammo.replace(/\|$/,'');
      options.Ammo += '}';
    }
  }

  if(options.custom) options.custom = this.toNote(true);

  if(this.has('Maximal')){
    if(!options.Special){
      options.Special = '';
    } else {
      options.Special += ', ';
    }
    options.Special += '?{Fire on Maximal?|Use Maximal|}';
  }

  output += JSON.stringify(options);
  return output;
}
//turns the weapon prototype into text for an NPC's notes
INQWeapon.prototype.toNote = function(justText){
  var output = '';
  output += this.Name;
  output += ' (';
  output += this.Class + '; ';
  if(!this.Range.onlyZero()) output += this.Range + 'm; ';
  if(this.Class != 'Melee' && (this.Single || !this.Semi.onlyZero() || !this.Full.onlyZero())){
    output += (this.Single) ? 'S' : '-';
    output += '/';
    output += (!this.Semi.onlyZero()) ? this.Semi : '-';
    output += '/';
    output += (!this.Full.onlyZero()) ? this.Full : '-';
    output += '; ';
  }

  output += this.Damage + ' ' + this.DamageType.toNote(justText) + '; ';
  output += 'Pen ' + this.Penetration + '; ';
  if(this.Clip) output += 'Clip ' + this.Clip + '; ';
  if(this.Reload == 0){
    output += 'Reload Free; ';
  } else if(this.Reload == 0.5){
    output += 'Reload Half; ';
  } else if(this.Reload == 1){
    output += 'Reload Full; ';
  } else if(this.Reload > 1) {
    output += 'Reload ' + this.Reload + ' Full; ';
  }

  _.each(this.Special, function(rule){
    output += rule.toNote(justText) + ', ';
  });

  output = output.replace(/(;|,)\s*$/, '');
  output += ')';
  return output;
}
//takes the a weapon note from a character sheet and turns it into the INQWeapon Prototype
function INQWeaponNoteParser(){}

INQWeaponNoteParser.prototype = Object.create(INQWeapon.prototype);
INQWeaponNoteParser.prototype.constructor = INQWeaponNoteParser;
INQWeaponNoteParser.prototype.parse = function(text){
  var inqlink = new INQLink(text);
  this.Name = inqlink.Name.trim();
  var details = [];
  _.each(inqlink.Groups, function(group){
    _.each(group.split(/\s*(?:;|,)\s*/), function(detail){
      details.push(detail);
    });
  });
  this.parseDetails(details);
}
INQWeaponNoteParser.prototype.parseClass = function(detail){
  this.Class = detail.toTitleCase();
}
INQWeaponNoteParser.prototype.parseClip = function(detail){
  var matches = detail.match(/^Clip\s*(\d*)(|-|–|—)$/i);
  if(matches[1]) this.Clip = Number(matches[1]);
  if(matches[2]) this.Clip = 0;
}
INQWeaponNoteParser.prototype.parseDamage = function(content){
  var damage;
  var damagetype = content.replace(RegExp(INQFormula.regex(), 'i'), function(match){
    damage = match;
    return '';
  });

  if(/^\s*$/.test(damagetype)) damagetype = 'I';
  this.Damage = new INQFormula(damage);
  this.DamageType = new INQLink(damagetype);
}
INQWeaponNoteParser.prototype.parseDetails = function(details){
  var rangeRe = new RegExp('^' + INQFormula.regex() + 'k?m$', 'i');
  var rofRe = new RegExp('^(S|-|–|—)/(' + INQFormula.regex() + '|-|–|—)/(' + INQFormula.regex() + '|-|–|—)$', 'i');
  var damageRe = new RegExp('^' + INQFormula.regex({requireDice: true}) + '(' + INQLinkParser.regex() + ')?' + '$', 'i');
  var penRe = new RegExp('^Pen(etration)?:?' + INQFormula.regex() + '$', 'i');
  for(var i = 0; i < details.length; i++){
    var detail = details[i].trim();
    if(detail == '') continue;
    if(/^(melee|pistol|basic|heavy|psychic)$/i.test(detail)){
      this.parseClass(detail);
    } else if(rangeRe.test(detail)){
      this.parseRange(detail);
    } else if(rofRe.test(detail)){
      this.parseRoF(detail);
    } else if(damageRe.test(detail)) {
      this.parseDamage(detail);
    } else if(penRe.test(detail)){
      this.parsePenetration(detail);
    } else if(/^Clip\s*(\d+|-|–|—)\s*$/i.test(detail)) {
      this.parseClip(detail);
    } else if(/^(?:Reload|Rld):?\s*(-|–|—|Free|Half|(\d*)\s*Full)$/i.test(detail)) {
      this.parseReload(detail);
    } else {
      this.Special.push(new INQLink(detail.trim().replace('[', '(').replace(']', ')')));
    }
  }
}
INQWeaponNoteParser.prototype.parsePenetration = function(detail){
  detail = detail.replace(/^Pen(etration)?:?/i, '');
  this.Penetration = new INQFormula(detail);
}
INQWeaponNoteParser.prototype.parseRange = function(detail){
  var kilo = /km/i.test(detail);
  detail = detail.replace(/k?m/i, '');
  this.Range = new INQFormula(detail);
  if(kilo) this.Range.Multiplier *= 1000;
}
INQWeaponNoteParser.prototype.parseReload = function(detail){
  var ReloadMatches = detail.match(/^(?:Reload|Rld):?\s*(\d*)\s*(-|–|—|Free|Half|Full)$/i);
  switch(ReloadMatches[2].toTitleCase()){
    case 'Free':
      this.Reload = 0;
    break;
    case 'Half':
      this.Reload = 0.5;
    break;
    case 'Full':
      this.Reload = 1;
    break;
    default:
      this.Reload = -1;
  }
  if(ReloadMatches[1] != ""){
    this.Reload *= Number(ReloadMatches[1]);
  }
}
INQWeaponNoteParser.prototype.parseRoF = function(detail){
  var Rates = detail.match(/[^\/]+/g);
  var rateRe = new RegExp('^' + INQFormula.regex() + '$', 'i');
  this.Single = Rates[0] == 'S';
  if(rateRe.test(Rates[1])) this.Semi = new INQFormula(Rates[1]);
  if(rateRe.test(Rates[2])) this.Full = new INQFormula(Rates[2]);
  if(this.Class == 'Melee') this.Class = 'Basic';
}
//takes the handout object of a weapon and turns it into the INQWeapon Prototype
function INQWeaponParser(){}

INQWeaponParser.prototype = Object.create(INQWeapon.prototype);
INQWeaponParser.prototype.constructor = INQWeaponParser;
//use all of the above parsing functions to transform text into the INQWeapon prototype
INQWeaponParser.prototype.parse = function(obj, callback){
  var parser = this;
  var myPromise = new Promise(function(resolve){
    parser.Content = new INQParser(obj, function(){
      resolve(parser);
    });
  });

  myPromise.catch(function(e){log(e)});
  myPromise.then(function(inqweapon){
    //save the non-text details of the handout
    parser.Name = obj.get("name");
    parser.ObjID = obj.id;
    parser.ObjType = obj.get("_type");

    //parse all the rules of the weapon based on the rule name
    for(var i = 0; i < parser.Content.Rules.length; i++){
      var name = parser.Content.Rules[i].Name;
      var content = parser.Content.Rules[i].Content;
      if(/class/i.test(name)){
        parser.parseClass(content);
      } else if(/^\s*range\s*$/i.test(name)){
        parser.parseRange(content);
      } else if(/^\s*(rof|rate\s+of\s+fire)\s*$/i.test(name)){
        parser.parseRoF(content);
      } else if(/^\s*dam(age)?\s*$/i.test(name)){
        parser.parseDamage(content);
      } else if(/^\s*pen(etration)?\s*$/i.test(name)){
        parser.parsePenetration(content);
      } else if(/^\s*clip\s*$/i.test(name)){
        parser.parseClip(content);
      } else if(/^\s*reload\s*$/i.test(name)){
        parser.parseReload(content);
      } else if(/^\s*special\s*(rules)?\s*$/i.test(name)){
        parser.parseSpecialRules(content);
      } else if(/^\s*weight\s*$/i.test(name)){
        parser.parseWeight(content);
      } else if(/^\s*req(uisition)?\s*$/i.test(name)){
        parser.parseRequisition(content);
      } else if(/^\s*renown/i.test(name)){
        parser.parseRenown(content);
      } else if(/^\s*availability/i.test(name)){
        parser.parseAvailability(content);
      } else if(/^\s*focus\s*power\s*$/i.test(name)){
        parser.parseFocusPower(content);
      } else if(/^\s*Opposed\s*$/i.test(name)){
        parser.parseOpposed(content);
      }
    }
    //if the weapon still has no damage and it isn't a psychic power, it is gear
    if(parser.Damage.onlyZero() && parser.Class != "Psychic"){
      parser.Class = "Gear";
    }
    delete parser.Content;
    if(typeof callback == 'function'){
      callback(parser);
    }
  });
}
INQWeaponParser.prototype.parseAvailability = function(content){
  var availabilities = [
    'Ubiquitous',
    'Abundant',
    'Plentiful',
    'Common',
    'Average',
    'Scarce',
    'Rare',
    'Very\\s+Rare',
    'Extremely\\s+Rare',
    'Near\\s+Unique',
    'Unique'
  ];
  var regex = '^\\s*(';
  for(var availability of availabilities){
    regex += availability + '|';
  }
  regex = regex.replace(/\|\s*$/, '');
  regex += ')\\s*$';
  var re = new RegExp(regex, 'i');
  var matches = content.match(re);
  if(matches){
    this.Availability = matches[1].trim().replace(/\s+/g, ' ').toTitleCase();
  } else {
    whisper('Invalid Availability');
    log('Invalid Availability');
    log(content);
  }
}
INQWeaponParser.prototype.parseClass = function(content){
  var matches = content.match(/^\s*(melee|pistol|basic|heavy|thrown|psychic|gear)\s*$/i);
  if(matches){
    this.Class = matches[1].toTitleCase();
  } else {
    whisper('Invalid Class');
    log('Invalid Class');
    log(content);
  }
}
INQWeaponParser.prototype.parseClip = function(content){
  var matches = content.match(/^\s*(\d*)(|-|–|—)\s*$/);
  if(matches){
    if(matches[1]){
      this.Clip = Number(matches[1]);
    } else {
      this.Clip = 0;
    }

  } else {
    whisper('Invalid Clip');
    log('Invalid Clip');
    log(content);
  }
}
INQWeaponParser.prototype.parseDamage = function(content){
  var damage;
  var damagetype = content.replace(RegExp(INQFormula.regex(), 'i'), function(match){
    damage = match;
    return '';
  });

  if(/^\s*$/.test(damagetype)) damagetype = 'I';
  this.Damage = new INQFormula(damage);
  this.DamageType = new INQLink(damagetype);

  if(!this.DamageType.Name) {
    whisper('Invalid Damage Type');
    log('Invalid Damage Type');
    log(damagetype);
  }
  if(this.Damage.onlyZero()) {
    whisper('Invalid Damage');
    log('Invalid Damage');
    log(damage);
  }
}
INQWeaponParser.prototype.parseFocusPower = function(content){
  var regex = '^\\s*'
  regex += '(Opposed|)\\s*'
  regex += '\\((\\+|-|–|—)\\s*(\\d+)\\)\\s*';
  regex += '(\\D+)';
  regex += '\\s+Test\\s*$'
  var re = RegExp(regex, 'i');
  var matches = content.match(re);
  if(matches){
    this.Class = 'Psychic';
    if(matches[1]){
      this.Opposed = true;
    }
    this.FocusModifier = Number(matches[2].replace(/–|—/,'-') + matches[3]);
    this.FocusTest = matches[4].trim().replace(/\s+/g, ' ').toTitleCase();
  } else {
    whisper('Invalid Focus Power');
    log('Invalid Focus Power');
    log(content);
  }
}
INQWeaponParser.prototype.parseOpposed = function(content){
  var matches = content.match(/^\s*(Yes|No)\s*$/i);
  if(matches){
    this.Opposed = matches[1].toLowerCase() == 'yes';
    this.Class = 'Psychic';
  } else {
    whisper('Invalid Opposed');
    log('Invalid Opposed');
    log(content);
  }
}
INQWeaponParser.prototype.parsePenetration = function(content){
  this.Penetration = new INQFormula(content);
}
INQWeaponParser.prototype.parseRange = function(content){
  var kilo = /km/i.test(content);
  content = content.replace(/k?m/i, '');
  this.Range = new INQFormula(content);
  if(kilo) this.Range.Multiplier *= 1000;
}
INQWeaponParser.prototype.parseReload = function(content){
  var matches = content.match(/^\s*(\d*)\s*(Free|Half|Full|-|–|—)(\s*Actions?)?\s*$/i);
  if(matches){
    switch(matches[2].toTitleCase()){
      case 'Free':
        this.Reload = 0;
      break;
      case 'Half':
        this.Reload = 0.5;
      break;
      case 'Full':
        this.Reload = 1;
      break;
      default:
        this.Reload = -1;
    }
    if(matches[1]){
      this.Reload *= Number(matches[1]);
    }
  } else {
    whisper('Invalid Reload');
    log('Invalid Reload');
    log(content);
  }
}
INQWeaponParser.prototype.parseRenown = function(content){
  var renowns = [
    '-',
    '–',
    '—',
    'Initiate',
    'Respected',
    'Distinguished',
    'Famed',
    'Hero'
  ];
  var regex = '^\\s*(';
  for(var renown of renowns){
    regex += renown + '|';
  }
  regex = regex.replace(/\|\s*$/, '');
  regex += ')\\s*$';
  var re = new RegExp(regex, 'i');
  var matches = content.match(re);
  if(matches){
    if(/(-|–|—)/.test(matches[1])){
      this.Renown = 'Initiate';
    } else {
      this.Renown = matches[1].toTitleCase();
    }
  } else {
    whisper('Invalid Renown');
    log('Invalid Renown');
    log(content);
  }
}
INQWeaponParser.prototype.parseRequisition = function(content){
  var matches = content.match(/^\s*(\d*)(|-|–|—)\s*$/);
  if(matches){
    if(matches[1]) this.Requisition = Number(matches[1]);
    if(matches[2]) this.Requisition = -1;
  } else {
    whisper('Invalid Requisition');
    log('Invalid Requisition');
    log(content);
  }
}
INQWeaponParser.prototype.parseRoF = function(content){
  var Rates = content.match(/[^\/]+/g);
  if(!Rates || Rates.length != 3) {
    whisper('Invalid RoF');
    log('Invalid RoF');
    return log(content);
  }
  var rateRe = new RegExp('^' + INQFormula.regex() + '$', 'i');
  this.Single = Rates[0] == 'S';
  if(rateRe.test(Rates[1])) this.Semi = new INQFormula(Rates[1]);
  if(rateRe.test(Rates[2])) this.Full = new INQFormula(Rates[2]);
  if(!this.Single && this.Semi.onlyZero() && this.Full.onlyZero()) {
    whisper('Invalid RoF');
    log('Invalid RoF');
    return log(content);
  }
  if(this.Class == 'Melee') this.Class = 'Basic';
}
INQWeaponParser.prototype.parseSpecialRules = function(content){
  var regex = '^\\s*(?:-|–|—|((?:' + INQLinkParser.regex() + ',)*' + INQLinkParser.regex()  + '))$';
  var re = new RegExp(regex, 'i');
  var matches = content.match(re);
  if(matches){
    if(matches[1]){
      this.Special = _.map(matches[1].split(','), function(rule){
        return new INQLink(rule);
      });
    }
  } else {
    whisper('Invalid Special Rules');
    log('Invalid Special Rules');
    log(content);
  }
}
INQWeaponParser.prototype.parseWeight = function(content){
  var matches = content.match(/^\s*(\d*)(?:\.(\d+))?\s*(?:kg)?s?(|-|–|—)\s*$/i);
  if(matches){
    this.Weight = 0;
    if(matches[1]) this.Weight = Number(matches[1]);
    if(matches[2]){
      var fraction = Number(matches[2]);
      while(fraction >= 1) fraction /= 10;
      this.Weight += fraction;
    }
  } else {
    whisper('Invalid Weight');
    log('Invalid Weight');
    log(content);
  }
}
function addCounter(matches, msg) {
  var name = matches[1];
  var turns = matches[2];
  var turnorder = Campaign().get('turnorder');
  if(turnorder) {
    turnorder = carefulParse(turnorder);
  } else {
    turnorder = [];
  }
  turnorder.unshift({
    id: '-1',
    pr: turns,
    custom: name.trim(),
    formula: '-1'
  });
  Campaign().set('turnorder', JSON.stringify(turnorder));
}

on('ready', function(){
  CentralInput.addCMD(/^!\s*add\s*counter\s*(.+\D)\s*(\d+)$/i, addCounter);
});
function attributeHandler(matches,msg,options){
  if(typeof options != 'object') options = {};
  if(options['show'] == undefined) options['show'] = true;
  var workingWith = (matches[1].toLowerCase() == 'max') ? 'max' : 'current';
  var statName = matches[2];
  var operator = matches[3].replace('/\s/g','');
  var sign = matches[4] || '';
  var modifier = matches[5] || '';
  if(options['partyStat']) msg.selected = [{_type: 'unique'}];
  eachCharacter(msg, function(character, graphic){
    graphic = graphic || {};
    character = character || {};
    var attribute = {
      current: attributeValue(statName, {graphicid: graphic.id, max: false, bar: options['bar']}),
      max: attributeValue(statName, {graphicid: graphic.id, max: true, alert: false, bar: options['bar']})
    };
    var name = (options.partyStat) ? '' : character.get('name');
    if (attribute.current == undefined) {
      if (operator  == '=') {
        attribute.current = '-';
      } else {
        return;
      }
    };
    if(attribute.max == undefined){
      if(modifier == 'max' && operator == '='){
        attributeValue(statName, {graphicid: graphic.id, delete: true, alert: false, bar: options['bar']});
        return whisper(statName + ' has been reset.', {speakingTo: msg.playerid, gmEcho: true});
      } else if(workingWith == 'max' || modifier == 'max') {
        return whisper('Local attributes do not have maximums to work with.', {speakingTo: msg.playerid, gmEcho: true});
      } else {
        attribute.max = '-';
      }
    }

    var modifiedAttribute = modifyAttribute(attribute, {
      workingWith: workingWith,
      operator: operator,
      sign: sign,
      modifier: modifier,
      inlinerolls: msg.inlinerolls
    });
    if(!modifiedAttribute) return;
    if(operator.indexOf('?') != -1) {
      if(options['show'] == false) return;
      whisper(name + attributeTable(statName, modifiedAttribute), {speakingTo: msg.playerid});
    } else if(operator.indexOf('=') != -1) {
      attributeValue(statName, {setTo: modifiedAttribute[workingWith], graphicid: graphic.id, max: workingWith, bar: options['bar']});
      if(options['show'] == false) return;
      var output = attributeTable(statName, attribute);
      output += attributeTable('|</caption><caption>V', modifiedAttribute, 'Yellow');
      if(options['partyStat']){
        var players = canViewAttribute(statName, {alert: false});
        whisper(name + output, {speakingTo: players, gmEcho: true});
      } else {
        whisper(name + output, {speakingTo: msg.playerid, gmEcho: true});
      }
    }
  });
}

function correctAttributeName(name){
  return name.trim();
}

function makeAttributeHandlerRegex(yourAttributes){
  var regex = "!\\s*";
  if(typeof yourAttributes == 'string'){
    yourAttributes = [yourAttributes];
  }
  if(yourAttributes == undefined){
    regex += "attr\\s+";
    regex += "(max|)\\s*";
    regex += "(\\S[^-\\+=/\\?\\*]*)\\s*";
  } else if(Array.isArray(yourAttributes)){
    regex += "(|max)\\s*";
    regex += "("
    for(var yourAttribute of yourAttributes){
      regex += yourAttribute + "|";
    }
    regex = regex.replace(/\|$/, "");
    regex += ")";
  } else {
    whisper('Invalid yourAttributes');
    log('Invalid yourAttributes');
    log(yourAttributes);
    return;
  }
  regex += "\\s*" + numModifier.regexStr();
  regex += "\\s*(|\\d+\\.?\\d*|max|current|\\$\\[\\[\\d\\]\\])";
  regex += "\\s*$";
  return RegExp(regex, "i");
};

on("ready", function(){
  var re = makeAttributeHandlerRegex();
  CentralInput.addCMD(re, function(matches, msg){
    matches[2] = correctAttributeName(matches[2]);
    attributeHandler(matches, msg);
  }, true);
});
function journalSearch(matches, msg){
  var keywords = matches[1].toLowerCase().split(' ');
  var searchResults = matchingObjs(['handout', 'character'], keywords, function(obj){
    if(playerIsGM(msg.playerid)) return true;
    var permissions = obj.get('inplayerjournals').split(',');
    return permissions.indexOf('all') != -1 || permissions.indexOf(msg.playerid) != -1
  });

  LinkList[msg.playerid] = [];
  for(var i = 0; i < searchResults.length; i++){
    LinkList[msg.playerid].push((LinkList[msg.playerid].length + 1).toString() + '. ' +
    getLink(searchResults[i].get('name'), 'http://journal.roll20.net/' + searchResults[i].get('_type') + '/' + searchResults[i].id));
  }

  moreSearch([], msg);
}

function moreSearch(matches, msg){
  if(!LinkList[msg.playerid] || !LinkList[msg.playerid].length) return whisper('No results.', {speakingTo: msg.playerid});
  for(var i = 1; i <= 5 && LinkList[msg.playerid].length; i++){
    whisper(LinkList[msg.playerid][0], {speakingTo: msg.playerid});
    LinkList[msg.playerid].shift();
  }

  if(LinkList[msg.playerid].length){
    whisper(LinkList[msg.playerid].length.toString() + ' [More](!More) search results.', {speakingTo: msg.playerid});
  }
}

on('ready',function(){
  LinkList = [];
  CentralInput.addCMD(/^!\s*find\s+(\S.*)$/i,journalSearch,true);
  CentralInput.addCMD(/^!\s*more\s*$/i,moreSearch,true);
});
function returnPlayers(matches, msg){
  var playerPages = Campaign().get('playerspecificpages');
  if(!playerPages) return whisper('There are no players to return from their player specific pages.');
  var playersToReturn = [];
  for(var player in playerPages){
    playersToReturn.push(player);
  }

  var playerPhrase = matches[1] || '';
  var playerKeywords = playerPhrase.split(' ');

  var playerResults = matchingObjs(['player'], playerKeywords);
  var characterResults = matchingObjs(['character'], playerKeywords, function(obj){
    var owners = obj.get('controlledby').split(',')
    return !(owners.length != 1 || owners[0] == 'all' || playerIsGM(owners[0]))
  });

  _.each(characterResults, function(character){
    var newPlayerID = true;
    var playerID = character.get('controlledby');
    for(var i = 0; i < playerResults.length; i++){
      if(playerResults[i].id == playerID){
        newPlayerID = false;
        break;
      }
    }
    if(newPlayerID){
      playerResults.push(getObj('player', playerID));
    }
  });

  if(!playerResults.length && playerPhrase) return whisper('No matching players were found.');

  playerResults = trimToPerfectMatches(playerResults, playerPhrase);

  var returningPlayers = [];
  _.each(playerResults, function(player){
    if(playersToReturn.indexOf(player.id) != -1){
      returningPlayers.push(player);
    } else {
      whisper('*' + player.get('_displayname') + '* is not on a player specific page.');
    }
  });

  if(playerResults.length >= 2){
    whisper('Which player did you mean?');
    _.each(playerResults, function(player){
      var suggestion = player.get('_displayname');
      whisper('[' + suggestion + '](!return ' + suggestion + ')');
    });
    return;
  }

  playerPhrase.trim();
  if(playerPhrase == ''){
    _.each(playersToReturn, function(playerid){
      returningPlayers.push(getObj('player', playerid));
    });
  }

  _.each(returningPlayers, function(player){
    delete playerPages[player.id];
    whisper('*' + player.get('_displayname') + '* has returned to the main party.');
  });

  if(_.isEmpty(playerPages)){
    Campaign().set('playerspecificpages', false);
  } else {
    Campaign().set('playerspecificpages', playerPages);
  }
}

on('ready',function(){
  CentralInput.addCMD(/^!\s*return(?:\s([^\|\[\]]+))?$/i, returnPlayers);
});
function sendToPage(matches,msg){
  var mapPhrase    = matches[1] || '';
  var playerPhrase = matches[2] || '';
  var mapKeywords    = mapPhrase.split(' ');
  var playerKeywords = playerPhrase.split(' ');
  var mapResults    = matchingObjs('page', mapKeywords);
  var playerResults = matchingObjs('player', playerKeywords);
  var characterResults = matchingObjs('character', playerKeywords, function(obj){
    var owners = obj.get('controlledby').split(',')
    return !(owners.length != 1 || owners[0] == '' || owners[0] == 'all' || playerIsGM(owners[0]))
  });

  _.each(characterResults, function(character){
    var newPlayerID = true;
    var playerID = character.get('controlledby');
    for(var i = 0; i < playerResults.length; i++){
      if(playerResults[i].id == playerID){
        newPlayerID = false;
        break;
      }
    }

    if(newPlayerID){
      playerResults.push(getObj('player', playerID));
    }
  });

  if(!mapResults.length) return whisper('No matching maps were found.');
  if(!playerResults.length && playerPhrase) return whisper('No matching players were found.');
  mapResults = trimToPerfectMatches(mapResults, playerPhrase);
  playerResults = trimToPerfectMatches(playerResults, playerPhrase);
  if(mapResults.length >= 2){
    whisper('Which map did you mean?');
    var playerSearch = '';
    if(playerResults.length == 1){
      playerSearch = '|' + playerResults[0].get('_displayname');
    } else if(playerResults.length > 1){
      playerSearch = '|' + playerPhrase;
    }

    _.each(mapResults, function(map){
      var suggestion = map.get('name') + playerSearch;
      whisper('[' + suggestion + '](!sendTo ' + suggestion + ')');
    });

    return;
  }

  if(playerResults.length >= 2){
    whisper('Which player did you mean?');
    var mapSearch = mapResults[0].get('name');
    _.each(playerResults, function(player){
      var suggestion = mapSearch + '|' + player.get('_displayname');
      whisper('[' + suggestion + '](!sendTo ' + suggestion + ')');
    });
    return;
  }

  if(!playerResults.length){
    Campaign().set('playerpageid', mapResults[0].id);
    whisper('The party has been moved to *' + mapResults[0].get('name') + '*');
  } else {
    var playerPages = Campaign().get('playerspecificpages');
    playerPages = playerPages || {};
    _.each(playerResults, function(player){
      playerPages[player.id] = mapResults[0].id;
      whisper('*' + player.get('_displayname') + '* was moved to *' + mapResults[0].get('name') + '*');
    });
    Campaign().set('playerspecificpages', playerPages);
  }
}

on('ready',function(){
  CentralInput.addCMD(/^!\s*send\s*to\s([^\|\[\]]+)\s*(?:\|\s*([^\|\[\]]+)\s*)?$/i,sendToPage);
});
function where(matches, msg){
  var output = '';
  if(Campaign().get('playerpageid')){
    var page = getObj('page', Campaign().get('playerpageid'));
    output = '<strong>Party</strong>: ' + page.get('name');
  } else {
    output = 'Player Page has not been set.';
  }

  if(Campaign().get('playerspecificpages')){
    for(var k in Campaign().get('playerspecificpages')){
      var player = getObj('player', k);
      var page = getObj('page', Campaign().get('playerspecificpages')[k]);
      output += '<br>';
      output += '<strong>' + player.get('_displayname') + '</strong>: ';
      output += page.get('name');
    }
  }

  whisper(output);
}

on('ready', function(){
  CentralInput.addCMD(/^!\s*where\s*\?\s*$/i, where);
});
function announce(content, options){
  if(typeof options != 'object') options = {};
  var speakingAs = options.speakingAs || 'INQ';
  var callback = options.callback || null;
  if(options.noarchive == undefined) options.noarchive = true;
  if(!content) return whisper('announce() attempted to send an empty message.');
  sendChat(speakingAs, content, callback, options);
}
function attributeTable(name, attribute, options){
  if(typeof options != 'object') options = {};
  if(options['color'] == undefined) options['color'] = '00E518';
  var attrTable = '<table border = \"2\" width = \"100%\">';
  attrTable += '<caption>' + name + '</caption>';
  attrTable += '<tr bgcolor = \"' + options['color'] + '\"><th>Current</th><th>Max</th></tr>';
  attrTable += '<tr bgcolor = \"White\"><td>' + attribute.current + '</td><td>' + attribute.max + '</td></tr>';
  attrTable += '</table>';
  return attrTable;
}
function attributeValue(name, options){
  if(typeof options != 'object') options = false;
  options = options || {};
  if(options['alert'] == undefined) options['alert'] = true;
  if(!options['max'] || options['max'] == 'current'){
    var workingWith = 'current';
  } else {
    var workingWith = 'max';
  }

  if(options['graphicid']){
    var graphic = getObj('graphic',options['graphicid']);
    if(!graphic){
      if(options['alert']) whisper('Graphic ' + options['graphicid'] + ' does not exist.');
      return undefined;
    }

    if(options['bar']){
      if(workingWith == 'current') workingWith = 'value';
      if(options['setTo']) graphic.set(options['bar'] + '_' + workingWith, options['setTo']);
      var barValue = graphic.get(options['bar'] + '_' + workingWith) || 0;
      return barValue;
    }

    if(workingWith == 'current'
    && graphic.get('bar1_link') == ''
    && graphic.get('bar2_link') == ''
    && graphic.get('bar3_link') == ''){
      var localAttributes = new LocalAttributes(graphic);
      if(options['setTo'] != undefined) {
        localAttributes.set(name, options['setTo']);
      }

      if(options['delete']){
        localAttributes.remove(name);
        if(options['alert']) whisper(name + ' has been deleted.');
        return true;
      }

      if(localAttributes.get(name) != undefined){
        return localAttributes.get(name);
      }
    }

    options['characterid'] = graphic.get('represents');
  }

  var attribute = getAttribute(name, options);
  if(!attribute) {
    if(options['setTo'] != undefined){
      var character = getObj('character', options['characterid']);
      if(!character) return;
      var attribute = createObj('attribute', {
        name: name,
        current: options['setTo'],
        max: options['setTo'],
        _characterid: character.id
      });
      return attribute.get(workingWith);
    }

    return;
  }
  if(options['setTo'] != undefined) attribute.set(workingWith, options['setTo']);
  return attribute.get(workingWith);
}
function carefulParse(str) {
  var obj = undefined;
  try {
    return JSON.parse(str);
  } catch(e) {
    setTimeout(whisper, 200, 'JSON failed to parse. See the log for details.');
    log('failed to parse');
    log(str);
    log(e);
  }
}
function defaultCharacter(playerid){
  var candidateCharacters = findObjs({
    _type: 'character',
    controlledby: playerid
  });
  if(candidateCharacters && candidateCharacters.length == 1){
    return candidateCharacters[0];
  } else if(!candidateCharacters || candidateCharacters.length <= 0) {
    var player = getObj('player', playerid);
    var playername = '[' + playerid + ']';
    if(player) playername = player.get('_displayname');
    whisper('No default character candidates were found for ' + playername + '.');
  } else {
    var player = getObj('player', playerid);
    var playername = '[' + playerid + ']';
    if(player) playername = player.get('_displayname');
    whisper('Too many default character candidates were found for ' + playername + '. Please refer to the api output console for a full listing of those characters');
    log('Too many default character candidates for '  + playername + '.');
    for(var i = 0; i < candidateCharacters.length; i++){
      log('(' + (i+1) + '/' + candidateCharacters.length + ') ' + candidateCharacters[i].get('name'))
    }
  }
}
function eachCharacter(msg, givenFunction){
  if(msg.selected == undefined || msg.selected.length <= 0){
    if(playerIsGM(msg.playerid)){
      var gm = getObj('player', msg.playerid)
      var pageid = gm.get('_lastpage') || Campaign().get('playerpageid');
      msg.selected = findObjs({
        _pageid: pageid,
        _type: 'graphic',
        _subtype: 'token',
        isdrawing: false,
        layer: 'objects'
      });
    } else {
      msg.selected = [defaultCharacter(msg.playerid)];
      if(msg.selected[0] == undefined){return;}
    }
  }

  _.each(msg.selected, function(obj){
    if(obj._type == 'graphic'){
      var graphic = getObj('graphic', obj._id);
      if(graphic == undefined) {
        log('graphic undefined')
        log(obj)
        return whisper('graphic undefined', {speakingTo: msg.playerid, gmEcho: true});
      }

      var character = getObj('character', graphic.get('represents'))
      if(character == undefined){
        log('character undefined')
        log(graphic)
        return whisper('character undefined', {speakingTo: msg.playerid, gmEcho: true});
      }
    } else if(obj._type == 'unique'){
      var graphic = undefined;
      var character = undefined;
    } else if(typeof obj.get === 'function' && obj.get('_type') == 'character') {
      var character = obj;
      var graphics = [];
      if(Campaign().get('playerspecificpages') && Campaign().get('playerspecificpages')[msg.playerid]){
        graphics = findObjs({
          _pageid: Campaign().get('playerspecificpages')[msg.playerid],
          _type: 'graphic',
          represents: character.id
        }) || [];
      }

      if(graphics[0] == undefined){
        graphics = findObjs({
          _pageid: Campaign().get('playerpageid'),
          _type: 'graphic',
          represents: character.id
        }) || [];
      }

      if(graphics[0] == undefined){
        graphics = findObjs({
          _type: 'graphic',
          represents: character.id
        }) || [];
      }

      if(graphics[0] == undefined){
        return whisper(character.get('name') + ' does not have a token on any map in the entire campaign.',
         {speakingTo: msg.playerid, gmEcho: true});
      }

      var graphic = graphics[0];
    } else if(typeof obj.get === 'function' && obj.get('_type') == 'graphic') {
      var graphic = obj;
      var character = getObj('character', graphic.get('represents'));
      if(character == undefined){
        log('character undefined')
        log(graphic)
        return whisper('character undefined', {speakingTo: msg.playerid, gmEcho: true});
      }
    } else {
      log('Selected is neither a graphic nor a character.')
      log(obj)
      return whisper('Selected is neither a graphic nor a character.', {speakingTo: msg.playerid, gmEcho: true});
    }

    givenFunction(character, graphic);
  });
}
function getAttribute(name, options) {
  if(typeof options != 'object') options = false;
  options = options || {};
  if(options['alert'] == undefined) options['alert'] = true;
  if(options['graphicid']) {
    var graphic = getObj('graphic', options['graphicid']);
    if(graphic == undefined){
      if(options['alert']) whisper('Graphic ' + options['graphicid'] + ' does not exist.');
      return undefined;
    }

    options['characterid'] = graphic.get('represents');
  }

  if(options['characterid']){
    var character = getObj('character', options['characterid']);
    if(character == undefined) {
      if(options['alert']) whisper('Character ' + options['characterid'] + ' does not exist.');
      return undefined;
    }

    var attributes = findObjs({
      _type: 'attribute',
      _characterid: options['characterid'],
      name: name
    });
    if(!attributes || attributes.length <= 0){
      if(options['setTo'] == undefined){
        if(options['alert']) whisper(character.get('name') + ' does not have a(n) ' + name + ' Attribute.');
        return undefined;
      }
    } else if(attributes.length >= 2){
      if(options['alert']) whisper('There were multiple ' + name + ' attributes owned by ' + character.get('name')
       + '. Using the first one found. A log has been posted in the terminal.');
      log(character.get('name') + '\'s ' + name + ' Attributes');
      _.each(attributes, function(attribute){ log(attribute)});
    }
  } else {
    var attributes = findObjs({
      _type: 'attribute',
      name: name
    });
    if(!attributes || attributes.length <= 0){
      if(options['alert']) whisper('There is nothing in the campaign with a(n) ' + name + ' Attribute.');
      return undefined;
    } else if(attributes.length >= 2){
      if(options['alert']) whisper('There were multiple ' + name + ' attributes. Using the first one found. A log has been posted in the terminal.');
      log(name + ' Attributes')
      _.each(attributes, function(attribute){ log(attribute)});
    }
  }

  return attributes[0];
}
function getLink (Name, Link){
  Link = Link || '';
  if(typeof Name == 'object' && Name.get) {
    return '<a href=\"http://journal.roll20.net/' + Name.get('_type') + '/' + Name.id + '\">' + Name.get('name') + '</a>';
  }
  if(Link == ''){
    var Handouts = findObjs({ _type: 'handout', name: Name });
    var objs = filterObjs(function(obj) {
      if(obj.get('_type') == 'handout' || obj.get('_type') == 'character'){
        var regex = Name;
        regex = regex.replace(/[\.\+\*\[\]\(\)\{\}\^\$\?]/g, function(match){return '\\' + match});
        regex = regex.replace(/\s*(-|–|\s)\s*/, '\\s*(-|–|\\s)\\s*');
        regex = regex.replace(/s?$/, 's?');
        regex = '^' + regex + '$';
        var re = RegExp(regex, 'i');
        return re.test(obj.get('name'));
      } else {
        return false;
      }
    });
    objs = trimToPerfectMatches(objs, Name);
    if(objs.length > 0){
      return '<a href=\"http://journal.roll20.net/' + objs[0].get('_type') + '/' + objs[0].id + '\">' + objs[0].get('name') + '</a>';
    } else {
        return Name;
    }
  } else {
    return '<a href=\"' + Link + '\">' + Name + '</a>';
  }
}
function matchingAttrNames(graphicid, phrase){
  var matches = [];
  var graphic = getObj('graphic', graphicid);
  if(!graphic) return whisper('Graphic ' + graphicid + ' does not exist.');
  var characterid = graphic.get('represents');
  var character = getObj('character',characterid);
  if(!character) return whisper('Character ' + characterid + ' does not exist.');
  var keywords = phrase.split(' ');
  for(var i = 0; i < keywords.length; i++) {
    if(keywords[i] == ''){
      keywords.splice(i, 1);
      i--;
    }
  }

  if(!keywords.length) return [];
  for(var i = 0; i < keywords.length; i++){
    keywords[i] = keywords[i].toLowerCase();
  }

  var matchingAttrs = matchingObjs('attribute', keywords, function(attr){
    return attr.get('_characterid') == character.id;
  });

  _.each(matchingAttrs, function(attr){
    matches.push(attr.get('name'));
  });

  var localAttributes = new LocalAttributes(graphic);
  for(var attr in localAttributes.Attributes){
    var matching = true;
    var name = attr.toLowerCase();
    for(var i = 0; i < keywords.length; i++){
      if(name.indexOf(keywords[i]) == -1){
        matching = false;
        break;
      }
    }

    if(matching) matches.push(attr);
  }

  for(var i = 0; i < matches.length; i++){
    if(matches[i] == phrase){
      matches = [phrase];
      break;
    }
  }

  return matches;
}
function matchingObjs(types, keywords, additionalCriteria){
  if(typeof types == 'string') types = [types];
  for(var i = 0; i < keywords.length; i++){
    if(keywords[i] == ''){
      keywords.splice(i,1);
      i--;
    }
  }

  if(!keywords.length) return [];
  for(var i = 0; i < keywords.length; i++){
    keywords[i] = keywords[i].toLowerCase();
  }

  return filterObjs(function(obj){
    if(types.indexOf(obj.get('_type')) == -1) return false;
    if(obj.get('_type') == 'player'){
      var name = obj.get('_displayname');
    } else {
      var name = obj.get('name');
    }

    name = name.toLowerCase();
    for(var i = 0; i < keywords.length; i++){
      if(name.indexOf(keywords[i]) == -1) return false;
    }
    if(typeof additionalCriteria == 'function'){
      return additionalCriteria(obj);
    } else {
      return true;
    }
  });
}
function modifyAttribute(attribute, options) {
  if (typeof options != 'object' ) options = {};
  if(options.workingWith != 'max') options.workingWith = 'current';
  if(!options.sign) options.sign = '';
  if(typeof options.modifier == 'number') options.modifier = options.modifier.toString();

  if(attribute.get) {
    attribute = {
      current: attribute.get('current'),
      max: attribute.get('max')
    };
  }

  if(/\$\[\[\d+\]\]/.test(options.modifier)){
    var inlineMatch = options.modifier.match(/\$\[\[(\d+)\]\]/);
    if(inlineMatch && inlineMatch[1]){
      var inlineIndex = Number(inlineMatch[1]);
    }
    if(inlineIndex != undefined && options.inlinerolls && options.inlinerolls[inlineIndex]
    && options.inlinerolls[inlineIndex].results
    && options.inlinerolls[inlineIndex].results.total != undefined){
      options.modifier = options.inlinerolls[inlineIndex].results.total.toString();
    } else {
      log('Invalid Inline')
      log(options.inlinerolls);
      return whisper('Invalid Inline');
    }
  }

  switch(options.modifier.toLowerCase()){
    case 'max':
      options.modifier = attribute.max;
      break;
    case 'current':
      options.modifier = attribute.current;
      break;
  }

  var modifiedAttribute = {
    current: attribute.current,
    max: attribute.max
  };

  modifiedAttribute[options.workingWith] = numModifier.calc(
    attribute[options.workingWith],
    options.operator,
    options.sign + options.modifier
  );

  return modifiedAttribute;
}
function toRegex(obj, options){
  if(typeof options != 'object') options = {};
  if(typeof obj == 'string') obj = {Name: obj};
  var pattern = '';
  if(obj.Alternates) pattern += '(?:';
  pattern += obj.Name.replace(/[- ]/g, '(?:\\s*|-)');
  if(obj.Alternates){
      pattern += '|';
    _.each(obj.Alternates, function(alternate){
      pattern += alternate.replace(/[- ]/g, '(?:\\s*|-)');
      pattern += '|';
    });
    pattern = pattern.replace(/\|$/, '');
    pattern += ')';
  }

  if(options.str) return pattern;
  return new RegExp('^\\s*' + pattern + '\\s*$', 'i');
}
function trimToPerfectMatches(objs, phrase){
  var exactMatches = [];
  _.each(objs, function(obj){
    if(obj.get('_type') == 'player'){
      var name = obj.get('_displayname');
    } else {
      var name = obj.get('name');
    }
    if(name == phrase){
      exactMatches.push(obj);
    }
  });
  if(exactMatches.length >= 1){
    return exactMatches;
  } else {
    return objs;
  }
}
function whisper(content, options){
  if(typeof options != 'object') options = {};
  var speakingAs = options.speakingAs || 'INQ';
  if(options.noarchive == undefined) options.noarchive = true;
  if(!content) return whisper('whisper() attempted to send an empty message.');
  var new_options = {};
  for(var k in options) new_options[k] = options[k];
  delete new_options.speakingTo;
  if (Array.isArray(options.speakingTo)) {
    for(var i = 0; i < options.speakingTo.length; i++){
      if(options.speakingTo[i] == '') {
        options.speakingTo.splice(i, 1);
        i--;
      }
    }
    if (options.speakingTo.indexOf('all') != -1) return announce(content, new_options);
    if (options.gmEcho) {
      var gmIncluded = false;
      _.each(options.speakingTo, function(target) {
        if (playerIsGM(target)) gmIncluded = true;
      });
      if(!gmIncluded) whisper(content, new_options);
      delete options.gmEcho;
    }

    _.each(options.speakingTo, function(target) {
      new_options.speakingTo = target;
      whisper(content, new_options);
    });
    return;
  }

  if(options.speakingTo == 'all') {
    return announce(content, new_options);
  } else if(options.speakingTo) {
    if(getObj('player', options.speakingTo)){
      if(options.gmEcho && !playerIsGM(options.speakingTo)) whisper(content, new_options);
      return sendChat(speakingAs, '/w \"' + getObj('player',options.speakingTo).get('_displayname') + '\" ' + content, options.callback, options );
    } else {
      return whisper('The playerid ' + JSON.stringify(options.speakingTo) + ' was not recognized and the following msg failed to be delivered: ' + content);
    }
  } else {
    return sendChat(speakingAs, '/w gm ' + content, options.callback, options);
  }
}
function canViewAttribute(name, options){
  if(typeof options != 'object') options = false;
  options = options || {};
  var attribute = getAttribute(name, options);
  if(!attribute) return;
  var character = getObj('character', attribute.get('_characterid'));
  return viewerList = character.get('inplayerjournals').split(',');
}
var CentralInput = {};
CentralInput.Commands = [];
CentralInput.addCMD = function(cmdregex, cmdaction, cmdpublic){
  if(cmdregex == undefined){return whisper('A command with no regex could not be included in CentralInput.js.');}
  if(cmdregex == undefined){return whisper('A command with no function could not be included in CentralInput.js.');}
  cmdpublic = cmdpublic || false;
  var Command = {cmdRegex: cmdregex, cmdAction:cmdaction, cmdPublic: cmdpublic};
  this.Commands.push(Command);
}

CentralInput.input = function(msg){
  var inputRecognized = false;
  if(msg.content.indexOf('!{URIFixed}') == 0){
    msg.content = msg.content.replace('{URIFixed}','');
    msg.content = decodeURIComponent(msg.content);
  }
  for(var i = 0; i < this.Commands.length; i++){
    if(this.Commands[i].cmdRegex.test(msg.content)
    && (this.Commands[i].cmdPublic || playerIsGM(msg.playerid)) ){
      inputRecognized = true;
      this.Commands[i].cmdAction(msg.content.match(this.Commands[i].cmdRegex), msg);
    }
  }

  if(!inputRecognized){
    whisper('The command ' + msg.content + ' was not recognized. See ' + getLink('!help') + ' for a list of commands.', {speakingTo: msg.playerid});
  }
}

on('chat:message', function(msg) {
  if(msg.type == 'api' && msg.playerid && getObj('player', msg.playerid)){
    CentralInput.input(msg);
  }
});

function encodeURIFixed(str){
  return encodeURIComponent(str).replace(/['()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}
var numModifier = {};
numModifier.calc = function(stat, operator, modifier){
  if(operator.indexOf('+') != -1){
    stat = Number(stat) + Number(modifier);
    return Math.round(stat);
  } else if(operator.indexOf('-') != -1){
    stat = Number(stat) - Number(modifier);
    return Math.round(stat);
  } else if(operator.indexOf('*') != -1){
    stat = Number(stat) * Number(modifier);
    return Math.round(stat);
  } else if(operator.indexOf('/') != -1){
    stat = Number(stat) / Number(modifier);
    return Math.round(stat);
  } else if(operator.indexOf('=') != -1){
    return modifier;
  } else {
    return stat;
  }
}

numModifier.regexStr = function(){
  return '(\\?\\s*\\+|\\?\\s*-|\\?\\s*\\*|\\?\\s*\\/|\\?|=|\\+\\s*=|-\\s*=|\\*\\s*=|\\/\\s*=)\s*(|\\+|-)'
}
function LocalAttributes(graphic) {
  this.graphic = graphic;
  this.gmnotes = decodeURIComponent(graphic.get('gmnotes'));
  this.gmnotes = this.gmnotes.replace(/<br>/g, '\n');
  this.Attributes = {};
  if(/[^\{\}]*(\{.*\})[^\{\}]*/.test(this.gmnotes)){
    this.Attributes = this.gmnotes.replace(/[^\{\}]*(\{.*\})[^\{\}]*/, '$1');
    this.Attributes = carefulParse(this.Attributes) || {};
  }

  this.get = function(attribute) {
    return this.Attributes[attribute];
  }

  this.set = function(attribute, value) {
    var newValue = this.Attributes[attribute] = value;
    this.save();
    return newValue;
  }

  this.remove = function(attribute) {
    delete this.Attributes[attribute];
    this.save();
  }

  this.save = function() {
    if(/[^\{\}]*(\{.*\})[^\{\}]*/.test(this.gmnotes)){
      this.gmnotes = this.gmnotes.replace(/[^\{\}]*(\{.*\})[^\{\}]*/, JSON.stringify(this.Attributes));
    } else {
      this.gmnotes = this.gmnotes + '<br>' + JSON.stringify(this.Attributes);
    }

    this.gmnotes = encodeURIComponent(this.gmnotes);
    this.graphic.set('gmnotes', this.gmnotes);
  }
}
String.prototype.toTitleCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};
//defines an aging object so that its existence can be quickly assessed
Aging = {}

//returns a characteristic modifier for being old
Aging.modifier = function(characterid){
  //what is the age of the character in years
  var aging = Number(getAttrByName(characterid,"Age").substring(0,getAttrByName(characterid,"Age").indexOf(" years")));
  //aging shouldn't take affect until the age of 25
  aging -= 25;
  //reduce the effects of aging by any potions of youth, etc
  aging -= Number(getAttrByName(characterid, "Juvenat"));
  //reduce the effects of aging by any corruption
  aging -= Number(getAttrByName(characterid, "Corruption")) + Number(getAttrByName(characterid, "Unnatural Corruption"))*10;
  //be sure the penalties don't turn into bonuses
  //and be prepared to account for a character that does not age
  if(aging < 0 || !aging){aging = 0;}

  //return the resulting penalty
  return aging;
}
function Calendar(day,month,year) {
    //what is the curret Day/Month/Year
    this.Day = Number(day) || 1;
    this.Month = Number(month) || 0;
    this.Year = Number(year) || 40000;

    //what are the static limits on the days and months?
    this.DaysInAMonth = 35;
    //what are the names of the months?
    this.MonthNames = ["Terra", "El\'Jonson", "Jaghatai", "Russ", "Dorn", "Sanguinius", "Manus", "Gulliman", "Vulkan", "Corax"];

    //converts a series of numbers into a text date
    this.dateToText = function(day,month,year){
        if(day == null){
            day = this.Day;
        }
        if(month == null){
            month = this.Month;
        }
        if(year == null){
            year = this.Year
        }

        //create an output to show the date, starting with the numerical day
        var output = day.toString();
        //add a suffix based on the one's digit
        //however, all the teens are weird and get th
        if(Math.floor(day/10) == 1){
            output += "th";
        } else {
            //get the suffix based on the one's digit
            switch(day - Math.floor(day/10)*10){
                case 1:
                    output += "st";
                break;
                case 2:
                    output += "nd";
                break;
                case 3:
                    output += "rd";
                break;
                default:
                    output += "th"
                break;
            }
        }

        //add the month
        output += " of " + this.MonthNames[month];

        //add the year
        output += ", in the year " + year.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        //report the date in text form
        return output;
    }

    //display the current date to the player
    this.show = function(pretext, who){
      //if no pretext was specified, default to nothing
      pretext = pretext || "";
      //create an output to show the date, starting with the numerical day
      var output = pretext + this.dateToText() + ".";
      //if we are not reporting back to a specific person, then report back to everyone
      if(who == null){
          sendChat("System", output)
      } else {
          //report the date privatly to the inquirer
          whisper(output, {speakingTo: who})
      }
    }

    //increases the calendar date based on string input
    this.advance = function(input){
        //step through the input and disect it by the space " "
        var breakIndex = 0;
        var pieces = [];
        while(true) {
            //find the next space
            breakIndex = input.indexOf(" ");
            if(breakIndex == -1){
                //could not find a space
                //save the last bit if it is worth anything
                if(input != ""){
                    pieces.push(input);
                }
                //we are done. abort.
                break;
            } else {
                //save the piece (only if there is something to save)
                if(breakIndex != 0){
                    pieces.push(input.substring(0,breakIndex));
                }
                //remove the piece and the 1 character space from the main input
                input = input.substring(breakIndex+1);
            }
        }
        //return the current day,month,year, and the change in days
        var output = {};
        output["days"] = 0;
        //record the time in years that is passing
        var years = 0;
        //step through each submitted piece
        for(i = 1; i < pieces.length; i++){
            //search for the labels: day week month year
            //add the appropriate number to the calendar
            switch(pieces[i].toLowerCase()){
                case "day": case "days":
                    if(Number(pieces[i-1])){
                        this.Day += Number(pieces[i-1]);
                        output["days"] += Number(pieces[i-1]);
                    }
                break;
                case "week": case "weeks":
                    if(Number(pieces[i-1])){
                        this.Day += 7*Number(pieces[i-1]);
                        output["days"] += 7*Number(pieces[i-1]);
                    }
                break;
                case "month": case "months":
                    if(Number(pieces[i-1])){
                        this.Month += Number(pieces[i-1]);
                        output["days"] += this.DaysInAMonth*Number(pieces[i-1]);
                    }
                break;
                case "year": case "years":
                    if(Number(pieces[i-1])){
                        this.Year += Number(pieces[i-1]);
                        output["days"] += this.DaysInAMonth * this.MonthNames.length*Number(pieces[i-1]);;
                    }
                break;
                case "decade": case "decades":
                    if(Number(pieces[i-1])){
                        this.Year += 10*Number(pieces[i-1]);
                        output["days"] += this.DaysInAMonth * this.MonthNames.length*10*Number(pieces[i-1]);;
                    }
                break;
                case "century": case "centuries":
                    if(Number(pieces[i-1])){
                        this.Year += 100*Number(pieces[i-1]);
                        output["days"] += this.DaysInAMonth * this.MonthNames.length*100*Number(pieces[i-1]);;
                    }
                break;
            }
        }
        //correct the day/month/year so that none are over their maximum
        this.correct();

        output["Day"] = this.Day;
        output["Month"] = this.Month;
        output["Year"] = this.Year;
        return output;
    }

    //adjusts the calendar to meed the limits on days and months
    this.correct = function() {
        //for each chunck of MaxDays that we have, add an extra month (while subtracting that extra chunck of MaxDays)
        while(this.Day > this.DaysInAMonth){
            this.Day -= this.DaysInAMonth;
            this.Month++
        }

        //for each chunck of MaxMonths that we have, add an extra year (while subtracting that extra chunck of MaxMonths)
        while(this.Month >= this.MonthNames.length){
            this.Month -= this.MonthNames.length;
            this.Year++
        }

        //if we are in negative days, borrow from months
        while(this.Day < 0){
            this.Day += this.DaysInAMonth;
            this.Month--;
        }

        //if we are in negative months, borrow from years
        while(this.Month < 0){
            this.Month += this.MonthNames.length;
            this.Year--;
        }
    }

    //break down a text date into numbers
    this.textToNumbers = function(input){
        //the input is expected to conform to something like "14th of Mamby, 20,000,000"

        //create an output variable to save our work in
        var output = {};

        //divide the input up by spaces
        //delete any commas
        //step through the GMNotes and disect it by the space " "
        var breakIndex = 0;
        var pieces = [];
        while(true) {
            //find the next space
            breakIndex = input.indexOf(" ");
            if(breakIndex == -1){
                //could not find a space
                //save the last bit if it is worth anything
                if(input != ""){
                    pieces.push(input.replace(/,/g,""));
                }
                //we are done. abort.
                break;
            } else {
                //save the piece (only if there is something to save)
                if(breakIndex != 0 && input.substring(0,breakIndex).replace(/,/g,"") != ""){
                    //save the piece without commas
                    pieces.push(input.substring(0,breakIndex).replace(/,/g,""));

                }
                //remove the piece and the 1 character space from the main input
                input = input.substring(breakIndex+1);
            }
        }

        //step through every piece
        for(var i = 0; i < pieces.length; i++){
            //look for month names in the pieces
            //stop looking once we have found a month
            for(j = 0; output["Month"] == null && j < this.MonthNames.length; j++){
                //search for the month...
                var pat = RegExp(this.MonthNames[j],"i")
                //...inside the current piece
                if(pat.test(pieces[i])){
                    //the jth month was found. Record this.
                    output["Month"] = j;
                }
            }
            //search for a number, then convert that number
            if(Number(/\d+/.exec(pieces[i])) != NaN){
                //first attempt to put the result in the Day
                if(!output["Day"]){
                    output["Day"] = Number(/\d+/.exec(pieces[i]));
                } else if(!output["Year"]){
                    //otherwise jump to the Year
                    output["Year"] = Number(/\d+/.exec(pieces[i]));
                }
            }
                //default to Day first, then Year
        }

        //output the date object
        return output;

    }

    //finds the number of day/month/year difference from date1-date2
    //date2 will default as the current date
    this.difference = function(date1,date2){
        //is date 2 an object?
        if( !((typeof date2 === "object") && (date2 !== null)) ){
            date2 = {};
        }
        //if the day month year of date 1 is not setup, abort
        if(Number(date1["Day"]) == null
        || Number(date1["Month"]) == null
        || Number(date1["Year"]) == null){
            return "Invalid Input: ";
        }
        //if the day moth year of date2 is not setup, default to the current date
        if(date2["Day"] == null){
            date2["Day"] = this.Day;
        }
        if(date2["Month"] == null){
            date2["Month"] = this.Month;
        }
        if(date2["Year"] == null){
            date2["Year"] = this.Year;
        }

        //create an output variable to save our work in
        var output = {};
        //calculate the difference of date1 - date2
        output["Day"]   = date1["Day"]   - date2["Day"];
        output["Month"] = date1["Month"] - date2["Month"];
        output["Year"]  = date1["Year"]  - date2["Year"];
        log("date1")
        log(date1)
        log("date2")
        log(date2)
        log("output")
        log(output)

        //are there more days than a month?
        while(output["Day"] > this.DaysInAMonth){
            //reduce the number of days by the maximm number of days in a month
            output["Day"] -= this.DaysInAMonth;
            //advance the month count by one
            output["Month"]++;
        }
        //are there more months than a year?
        while(output["Month"] >= this.MonthNames.length){
            //reduce the months by the number of months in a year
            output["Month"] -= this.MonthNames.length;
            //advance the year count by one
            output["Year"]++;
        }
        //are there less than zero months?
        while(output["Day"] < 0){
            //take a month and add it to the days
            output["Day"] += this.DaysInAMonth;
            output["Month"]--;
        }
        while(output["Month"] < 0){
            //take a year and add it to the months
            output["Month"] += this.MonthNames.length;
            output["Year"]--;
        }
        log(output)
        //return the difference of time in text
        output["Text"] = "";
        //be sure the overall product is a positive number
        if(output["Year"] >= 0){
            //any number of days until date1?
            if(output["Day"] > 0){
                //output the number of days until date 1
                output["Text"] += output["Day"].toString() + " day";
                //are the days plural?
                if(output["Day"] > 1){
                    output["Text"] += "s";
                }
            }
            //any number of months until date1?
            if(output["Month"] > 0){
                //do we need a comma?
                if(output["Text"] != ""){
                    output["Text"] += ", ";
                }
                //output the number of months until date 1
                output["Text"] += output["Month"].toString() + " month";
                //are the months plural?
                if(output["Month"] > 1){
                    output["Text"] += "s";
                }
            }
            //any number of years until date1?
            if(output["Year"] > 0){
                //do we need a comma?
                if(output["Text"] != ""){
                    output["Text"] += ", ";
                }
                //output the number of years until date 1
                output["Text"] += output["Year"].toString() + " year";
                //are the years plural?
                if(output["Year"] > 1){
                    output["Text"] += "s";
                }
            }
            //if nothing has been added yet, then the difference is 0,0,0
            if(output["Text"] == ""){
                return "It is the same date today as ";
            }
            //otherwise, return the difference
            return output["Text"] + " until ";

        } else {
            output["Year"] *= -1;
            output["Month"] *= -1;
            output["Day"] *= -1;
            log(output)
            //are there less than zero months?
            while(output["Day"] < 0){
                //take a month and add it to the days
                output["Day"] += this.DaysInAMonth;
                output["Month"]--;
            }
            while(output["Month"] < 0){
                //take a year and add it to the months
                output["Month"] += this.MonthNames.length;
                output["Year"]--;
            }
            //now output the positive results

            //any number of days until date1?
            if(output["Day"] > 0){
                //output the number of days until date 1
                output["Text"] += output["Day"].toString() + " day";
                //are the days plural?
                if(output["Day"] > 1){
                    output["Text"] += "s";
                }
            }
            //any number of months until date1?
            if(output["Month"] > 0){
                //do we need a comma?
                if(output["Text"] != ""){
                    output["Text"] += ", ";
                }
                //output the number of months until date 1
                output["Text"] += output["Month"].toString() + " month";
                //are the months plural?
                if(output["Month"] > 1){
                    output["Text"] += "s";
                }
            }
            //any number of years until date1?
            if(output["Year"] > 0){
                //do we need a comma?
                if(output["Text"] != ""){
                    output["Text"] += ", ";
                }
                //output the number of years until date 1
                output["Text"] += output["Year"].toString() + " year";
                //are the years plural?
                if(output["Year"] > 1){
                    output["Text"] += "s";
                }
            }
            //if nothing has been added yet, then the difference is 0,0,0
            if(output["Text"] == ""){
                return "It is the same date today as ";
            }
            //otherwise, return the difference
            return output["Text"] + " past ";
        }

    }

    //convert input calendar text into a schedule object
    this.getSchedule = function(input){
        log("input")
        log(input)
        //start by breaking the input apart by <br>
        var breakIndex = 0;
        var pieces = [];
        while(true) {

            //find the next space
            breakIndex = input.indexOf("<br>");
            if(breakIndex == -1){
                //could not find a space
                //save the last bit if it is worth anything
                if(input != ""){
                    pieces.push(input);
                }
                //we are done. abort.
                break;
            } else {
                //save the piece
                if(breakIndex != 0){
                    //save the piece without commas
                    pieces.push(input.substring(0,breakIndex));
                }
                //remove the piece and the 1 character space from the main input
                input = input.substring(breakIndex + 4);
            }

        }

        log("pieces")
        log(pieces)
        //break the line into date and description by the :
        var output = [];

        for(ii = 0; ii < pieces.length; ii++){
            log(pieces[ii])
            //do not accept lines that do not have a : in them
            if(pieces[ii].indexOf(":") > -1){
                log(": found")
                //add a new object to the output
                output[output.length] = {};
                //add the text to the object
                output[output.length-1]["text"] = pieces[ii].substring(pieces[ii].indexOf(":") + 1);
                //ask if this date is a repeating date
                if(pieces[ii].indexOf("%") > -1 && pieces[ii].indexOf("%") < pieces[ii].indexOf(":")){
                    log(pieces[ii].substring(pieces[ii].indexOf("%") + 1,pieces[ii].indexOf(":")))
                    output[output.length-1]["repeat"] = pieces[ii].substring(pieces[ii].indexOf("%") + 1,pieces[ii].indexOf(":"));
                    output[output.length-1]["repeat"] = output[output.length-1]["repeat"].substring(0,output[output.length-1]["repeat"].indexOf("</strong>"));
                    log(output[output.length-1]["repeat"])
                    //convert the text date into a list of numbers
                    var tempDate = this.textToNumbers(pieces[ii].substring(0,pieces[ii].indexOf(" %")));

                //otherwise it is not a repeating date
                } else{
                    //convert the text date into a list of numbers
                    var tempDate = this.textToNumbers(pieces[ii].substring(0,pieces[ii].indexOf(":"))) ;
                }

                log("tempDate")
                log(tempDate)

                //add the date individually
                output[output.length-1]["Day"]   = tempDate["Day"];
                output[output.length-1]["Month"] = tempDate["Month"];
                output[output.length-1]["Year"]  = tempDate["Year"];

                log("ii")
                log(ii)
            }
            log("output")
            log(output)
        }

        //return the result
        return output;
    }

    this.scheduleToText = function(schedule){
        var output = "";
        //step through each event in the schedule
        for(var i = 0; i < schedule.length; i++){
            //make a new line for this event
            output += "<br>";
            //add the date
            output += "<strong>" + this.dateToText(schedule[i]["Day"],schedule[i]["Month"],schedule[i]["Year"]);
            //if the date is repeating, add the period length
            if(schedule[i]["repeat"]){
                output += " %" + schedule[i]["repeat"].toString();
            }
            output += "</strong>:";
            //add the description
            output += schedule[i]["text"];
            //for the ease of reading, add another break
            output += "<br>";
        }
        //return the result
        return output;
    }

    //attempts to add the event, pulling apart its description and date
    //second input allows you to denote if this event should be added to the public notes or the gmnotes
    this.addEvent = function(event,gm){
        log("addEvent")
        //try to load both the Calendar and Log Book
        var calendar =  findObjs({type: 'character', name: "Calendar"})[0];
        var logbook  =  findObjs({type: 'character', name: "Log Book"})[0];
        //attempt to load the Notes from both the calendar and logbook
        var CalendarNotes   = "";
        var LogBookNotes    = "";
        //are we workin with gmnotes or regular notes?
        if(gm){
            calendar.get('gmnotes',function(obj){
                CalendarNotes = obj;
            });
            logbook.get('gmnotes',function(obj){
                LogBookNotes = obj;
            });
        } else {
            calendar.get('bio',function(obj){
                CalendarNotes = obj;
            });
            logbook.get('bio',function(obj){
                LogBookNotes = obj;
            });
        }
        //If the notes were not properly loaded..
        //(this always happens on the first try)
        if (CalendarNotes == "" || LogBookNotes == ""){
            //rage quit and tell the user why you are rage quiting.
            //the second time we attempt this it should work
            sendChat("System","/w gm Notes are empty. Try again.");
            return false;
        }
        //chop up the incoming event into starting date, date modifier, and event description
        //event description will be at the beginning
        var EventDescription = event;
        //starting date is denoted by @
        var StartingDate     = "";
        //date modifier will be denoted by +
        var DateModifier     = "";
        //any repetition period will be denoted by %
        var RepeatPeriod = "";
        //create a list for the modifier content
        //de
        var ModifierList = [];
        ModifierList["@"] = "";
        ModifierList["+"] = "";
        ModifierList["%"] = "";

        //gather all the content for the modifier list
        for(signifier1 in ModifierList){
            //only do this if the modifier index is even present
            if(event.indexOf(signifier1) > -1){
                //gather all the content AFTER the index
                ModifierList[signifier1] = event.substring(event.indexOf(signifier1)+1)
                //trim out all the content that belongs to other modifiers
                for(signifier2 in ModifierList){
                    //be sure we are only trimming out content from OTHER modifiers
                    //and be sure the second signifier is even present within the content
                    if(signifier2 != signifier1 && ModifierList[signifier1].indexOf(signifier2) > -1){
                        //only retain the text before the second signifier
                        ModifierList[signifier1] = ModifierList[signifier1].substring(0,ModifierList[signifier1].indexOf(signifier2))
                    }
                }
                //trim off any spaces on the edges
                ModifierList[signifier1] = ModifierList[signifier1].trim();

                //check if this signifier is in the remaining Event Description
                if(EventDescription.indexOf(signifier1) > -1){
                    //trim out this content from the Event Description
                    EventDescription = EventDescription.substring(0,EventDescription.indexOf(signifier1))
                }

            }

        }
        //trim down the final Event Description
        EventDescription = EventDescription.trim();

        /*
        //record where the @ and + symbols occur
        var StartingDateIndex = event.indexOf("@");
        var DateModifierIndex = event.indexOf("+");
        //does the Starting Date Index exist and is it before the Date Modifier Index?
        if(StartingDateIndex > -1 && StartingDateIndex < DateModifierIndex){
            EventDescription = event.substring(0,StartingDateIndex).trim();
            StartingDate     = event.substring(StartingDateIndex+1,DateModifierIndex).trim();
            DateModifier     = event.substring(DateModifierIndex+1).trim();
        //does the Starting Date Index exist while the Date Modifier Index does not?
        } else if(StartingDateIndex > -1 && DateModifierIndex == -1) {
            EventDescription = event.substring(0,StartingDateIndex).trim();
            StartingDate     = event.substring(StartingDateIndex+1).trim();
        //does the Date Modifier Index exist and is it before the Starting Date Index?
        } else if(DateModifierIndex > -1 && DateModifierIndex < StartingDateIndex){
            EventDescription = event.substring(0,DateModifierIndex).trim();
            DateModifier     = event.substring(DateModifierIndex+1,StartingDateIndex).trim();
            StartingDate     = event.substring(StartingDateIndex+1).trim();
        //does the Date Modifier Index exist while the Starting Date Index does not?
        } else if(DateModifierIndex > -1 && StartingDateIndex == -1) {
            EventDescription = event.substring(0,DateModifierIndex).trim();
            DateModifier     = event.substring(DateModifierIndex+1).trim();
        } else {
            EventDescription = event.trim();
        }
        */

        log("EventDescription: " + EventDescription)
        log("DateModifier: " + ModifierList["+"])
        log("StartingDate: " + ModifierList["@"])
        log("RepeatPeriod: " + ModifierList["%"])
        //if no event description is given, default to [REDACTED]
        if(EventDescription == ""){
            EventDescription = "[REDACTED]"
        }
        log("Repeated Period: " + ModifierList["%"])
        //trim down the repeat period to just numbers
        var repeatedperiod = "";
        for(var index = 0; index < ModifierList["%"].length; index++){
            log(ModifierList["%"][index])
            //be sure the character can be converted into a number
            if(ModifierList["%"][index] != " " && Number(ModifierList["%"][index]) || Number(ModifierList["%"][index]) == 0 ){
                log("Accepted: " + Number(ModifierList["%"][index]).toString())
                //save the number
                repeatedperiod += ModifierList["%"][index];
            }
        }
        //save only the numbers within the repeatedperiod
        ModifierList["%"] = repeatedperiod;
        log("Repeated Period: " + ModifierList["%"])
        //if no starting date is given, default to the current date
        if(ModifierList["@"] == ""){
            this.Day   = getAttrByName(calendar.id,"Day");
            this.Month = getAttrByName(calendar.id,"Month");
            this.Year  = getAttrByName(calendar.id,"Year");
        } else {
            //otherwise interpret the StartingDate as a date object
            var date0 = this.textToNumbers(ModifierList["@"]);
            this.Day   = date0["Day"];
            this.Month = date0["Month"];
            this.Year  = date0["Year"];
        }

        log("Starting Day: " + this.Day)
        log("Starting Month: " + this.Month)
        log("Starting Year: " + this.Year)
        //if no date modifier is given, default to the 'from' date with no modifier at all
        //otherwise add the modifier to the starting date
        if(ModifierList["+"] != ""){
            this.advance(ModifierList["+"]);
        }
        log("Adjusted Day: " + this.Day)
        log("Adjusted Month: " + this.Month)
        log("Adjusted Year: " + this.Year)
        //if the date is <= 0 days away from the current date, we will want to add it to the Log Book instead of the Calendar
        //create an object to look at the difference between the current date and the event date
        var dateDiff = {}
        dateDiff["Day"]   = this.Day   - getAttrByName(calendar.id,"Day");
        dateDiff["Month"] = this.Month - getAttrByName(calendar.id,"Month");
        dateDiff["Year"]  = this.Year  - getAttrByName(calendar.id,"Year");
        log("dateDiff...")
        log(dateDiff)
        //make the days positive at the expense of the months
        while(dateDiff["Day"] < 0){
            dateDiff["Day"] += this.DaysInAMonth;
            dateDiff["Month"]--;
        }
        //make the months positive at the expense of the years
        while(dateDiff["Month"] < 0){
            dateDiff["Month"] += this.MonthNames.length;
            dateDiff["Year"]--;
        }
        log(dateDiff)
        //if the Year ends up negative, then we are definitely talking about an event in the past
        //also check if you are scheduling a date for today
        if(dateDiff["Year"] < 0 ||
        (dateDiff["Day"] == 0 && dateDiff["Month"] == 0 && dateDiff["Year"] == 0)){
            //chop up the events into an array of dates and event descriptions
            var schedule = this.getSchedule(LogBookNotes);
        //otherwise you are talking about a future event, put it in the calendar
        }else{
            //chop up the events into an array of dates and event descriptions
            var schedule = this.getSchedule(CalendarNotes);
        }
        log(schedule)

        //put the event in the list, but do so in chronological order
        //for ease of comparison, convert the date into # of days since 0/0/0
        var totalDays = this.Day + this.Month*this.DaysInAMonth + this.Year*this.MonthNames.length*this.DaysInAMonth;
        //create an event object that will be defined later
        var eventObj = null;
        for(var i = 0; i < schedule.length; i++){
            if(schedule[i]["Day"] + schedule[i]["Month"]*this.DaysInAMonth + schedule[i]["Year"]*this.MonthNames.length*this.DaysInAMonth
            > totalDays){
                //setup the event Object
                eventObj = {};
                //fill in all the calculated fields
                eventObj["text"]  = " " + EventDescription;
                //do we need to add a repition period?
                //the period needs to be positive
                if(ModifierList["%"] != "" && Number(ModifierList["%"]) > 0){
                    eventObj["repeat"] = Number(ModifierList["%"]);
                }
                eventObj["Day"]   = this.Day;
                eventObj["Month"] = this.Month;
                eventObj["Year"]  = this.Year;
                //insert the event object here
                schedule.splice(i,0,eventObj);
                //stop searching for a place to put this event object in, we already found it
                break;
            }
        }
        //did you make it to the end of the schedule without inserting the eventObj?
        if(eventObj == null){
            //setup the event Object
            eventObj = {};
            //fill in all the calculated fields
            eventObj["text"]  = " " + EventDescription;
            //do we need to add a repition period?
            //the period needs to be positive
            if(ModifierList["%"] != "" && Number(ModifierList["%"]) > 0){
                eventObj["repeat"] = Number(ModifierList["%"]);
            }
            eventObj["Day"]   = this.Day;
            eventObj["Month"] = this.Month;
            eventObj["Year"]  = this.Year;


            //add it to the end
            schedule.push(eventObj);
        }

        log("eventObj")
            log(eventObj)
        //recheck if we are working with the LogBook or the Calendar
        if(dateDiff["Year"] < 0 ||
        (dateDiff["Day"] == 0 && dateDiff["Month"] == 0 && dateDiff["Year"] == 0)){
            //are we working with the gmnotes or the public notes?
            if(gm){
                //update the character sheet text with the new schedule
                logbook.set("gmnotes","<u>Recorded Hidden Events</u>" + this.scheduleToText(schedule));
                sendChat("System","/w gm The " + getLink("Log Book") + " has been updated.");
            } else {
                //update the character sheet text with the new schedule
                logbook.set("bio","<u>Recorded Events</u>" + this.scheduleToText(schedule));
                sendChat("System","The " + getLink("Log Book") + " has been updated.");
            }
        //otherwise you are talking about a future event, put it in the calendar
        }else{
            //are we working with the gmnotes or the public notes?
            if(gm){
                //update the character sheet text with the new schedule
                calendar.set("gmnotes","<u>Upcoming Hidden Events</u>" + this.scheduleToText(schedule));
                sendChat("System","/w gm The " + getLink("Calendar") + " has been updated.");
            } else {
                //update the character sheet text with the new schedule
                calendar.set("bio","<u>Upcoming Events</u>" + this.scheduleToText(schedule));
                sendChat("System","The " + getLink("Calendar") + " has been updated.");
            }
        }

        //it made it to the end without error
        return true;
    }

    //when time advances, this updates the log book and calendar
    this.updateCalendar = function(){
        log("updateCalendar()")
        //try to load the Calendar
        var calendar =  findObjs({type: 'character', name: "Calendar"})[0];
        //attempt to load the Notes from both the calendar and logbook
        var CalendarNotes   = "";
        var CalendarGMNotes   = "";
        //load up the gm notes
        calendar.get('gmnotes',function(obj){
            CalendarGMNotes = obj;
        });
        //load up the bios
        calendar.get('bio',function(obj){
            CalendarNotes = obj;
        });

        //If the notes were not properly loaded..
        //(this always happens on the first try)
        if (CalendarNotes == "" || CalendarGMNotes == ""){
            //rage quit and tell the user why you are rage quiting.
            //the second time we attempt this it should work
            sendChat("System","/w gm Notes are empty.");
            return false;
        }

        log("Calendar Notes")
        log(CalendarNotes)
        log("Calendar GMNotes")
        log(CalendarGMNotes)

        //convert the calendar into a schedule object

        var schedule = this.getSchedule(CalendarNotes);

        log("schedule")
        log(schedule)

        //calculate the # of days since 0/0/0
        log(this.Day + "/" + this.Month + "/" + this.Year)
        var totalDays = this.Day + this.Month*this.DaysInAMonth + this.Year*this.DaysInAMonth*this.MonthNames.length;
        //record a list of annoucements to make
        var anouncements = [];

        //continue working with the schedule until there is nothing left to work with
        while(schedule.length > 0){
            log("schedule[0]")
            log(schedule[0])
            log("schedule[0][\"days\"]")
            log(schedule[0]["Day"] + " + " + schedule[0]["Month"]*this.DaysInAMonth + " + " + schedule[0]["Year"]*this.DaysInAMonth*this.MonthNames.length)
            log("totalDays")
            log(totalDays)
            //is the date now >= to the scheduled event?
            if(schedule[0]["Day"] + schedule[0]["Month"]*this.DaysInAMonth + schedule[0]["Year"]*this.DaysInAMonth*this.MonthNames.length
            <= totalDays){
                log("schedule[0][\"days\"] <= totalDays")
                //does this event have a repeating event?
                if(schedule[0]["repeat"] && schedule[0]["repeat"] > 0){
                    //keep checking to see if this repeating event happens again
                    var baseDays = schedule[0]["Day"] + schedule[0]["Month"]*this.DaysInAMonth + schedule[0]["Year"]*this.DaysInAMonth*this.MonthNames.length;
                    var repeatDays = 0;
                    log("Base Days: " + baseDays.toString());
                    log("Repeat Days: " + schedule[0]["repeat"].toString());
                    log("Current Days: " + totalDays.toString());
                    do{
                        //announce the repeated event
                        sendChat("Calendar","/w gm " + "<em>Since the " + this.dateToText(schedule[0]["Day"],schedule[0]["Month"],schedule[0]["Year"]) + "...</em>" + schedule[0]["text"]);
                        //move the repeating event to its next time
                        repeatDays += Number(schedule[0]["repeat"]);
                        //check if this next time has been passed by
                    }while(baseDays + repeatDays <= totalDays);
                    //ask the gm if they would like to continue this infinite cycle of reminders
                    sendChat("Calendar","/w gm [Continue Cycle](!Event ?{Description|" +  schedule[0]["text"] + "} @ " +  this.dateToText(schedule[0]["Day"],schedule[0]["Month"],schedule[0]["Year"])
                    + " +" + repeatDays.toString() + " days %" + schedule[0]["repeat"].toString() +  " days)");
                } else {
                    //announce the event
                    sendChat("Calendar","/w gm " + "<em>On the " + this.dateToText(schedule[0]["Day"],schedule[0]["Month"],schedule[0]["Year"]) + "...</em> " + schedule[0]["text"]
                    + " [Record It](!?{Public or Private?||gm}Event ?{Description|" +  schedule[0]["text"] + "} @ " +  this.dateToText(schedule[0]["Day"],schedule[0]["Month"],schedule[0]["Year"]) + ")");
                }
                //remove this event from the calendar
                schedule.shift();

            } else {
                log("schedule[0][\"days\"] > totalDays")
                //we are making the foolish assumption that the events are in chronological order
                //thus if we are already beyond the totalDays, we should never go under it again
                //stop searching
                break;
            }
        }

        //update the calendar's bio
        calendar.set("bio","<u>Upcoming Events</u>" + this.scheduleToText(schedule));

        log("===============================GM SECTION=====================================")
        //convert the hidden calendar into a schedule object
        var schedule = this.getSchedule(CalendarGMNotes);
        log("schedule")
        log(schedule)

        //continue working with the hidden schedule until there is nothing left to work with
        while(schedule.length > 0){
            //calculate the total days for this event
            //is the date now >= to the scheduled event?
            if(schedule[0]["Day"] + schedule[0]["Month"]*this.DaysInAMonth + schedule[0]["Year"]*this.DaysInAMonth*this.MonthNames.length
            <= totalDays){
                //does this event have a repeating event?
                if(schedule[0]["repeat"] && schedule[0]["repeat"] > 0){
                    //keep checking to see if this repeating event happens again
                    var baseDays = schedule[0]["Day"] + schedule[0]["Month"]*this.DaysInAMonth + schedule[0]["Year"]*this.DaysInAMonth*this.MonthNames.length;
                    var repeatDays = 0;

                    log("Base Days")
                    log(baseDays)
                    log("Repeat Days")
                    log(schedule[0]["repeat"]);
                    log("Current Days")
                    log(totalDays);
                    do{
                        //announce the repeated event
                        sendChat("Calendar","/w gm " + "<em>Since the " + this.dateToText(schedule[0]["Day"],schedule[0]["Month"],schedule[0]["Year"]) + "...</em> " + schedule[0]["text"]);
                        //move the repeating event to its next time
                        repeatDays += Number(schedule[0]["repeat"]);
                        //check if this next time has been passed by
                    }while(baseDays + repeatDays <= totalDays);
                    //ask the gm if they would like to continue this infinite cycle of reminders
                    sendChat("Calendar","/w gm [Continue Cycle](!gmEvent ?{Description|" +  schedule[0]["text"] + "} @ " +  this.dateToText(schedule[0]["Day"],schedule[0]["Month"],schedule[0]["Year"])
                    + " +" + repeatDays.toString() + " days %" + schedule[0]["repeat"].toString() + " days)");
                } else {
                    //announce the event
                    sendChat("Calendar","/w gm " + "<em>On the " + this.dateToText(schedule[0]["Day"],schedule[0]["Month"],schedule[0]["Year"]) + "...</em> " + schedule[0]["text"]
                    + " [Record It](!?{Public or Private?||gm}Event ?{Description|" +  schedule[0]["text"] + "} @ " +  this.dateToText(schedule[0]["Day"],schedule[0]["Month"],schedule[0]["Year"]) + ")");
                }
                //remove this event from the calendar
                schedule.shift();

            } else {
                //we are making the foolish assumption that the events are in chronological order
                //thus if we are already beyond the totalDays, we should never go under it again
                //stop searching
                break;
            }
        }

        //update the calendar's gmnotes
        calendar.set("gmnotes","<u>Upcoming Hidden Events</u>" + this.scheduleToText(schedule));

        //nothing bad happened
        return true;
    }



   //age a character by a number of days
    this.ageCharacters = function(delta_t){

        //get the age of every character
        dayObjs  = findObjs({ _type: "attribute", name: "Age_Days"});
        yearObjs = findObjs({ _type: "attribute", name: "Age_Years"});

        //organize the attributes by character id
        var charAges = [];
        _.each(dayObjs,function(dayObj){
          //be sure the character id has not been added yet
          for(var i = 0; i < charAges.length; i++){
            if(charAges[i].id == dayObj.get("characterid")){
              return;
            }
          }
          //add the first age_years with a matching character id
          for(var i = 0; i < yearObjs.length; i++){
            if(yearObjs[i].get("characterid") == dayObj.get("characterid")){
              charAges.push({id: yearObjs[i].get("characterid"), days: dayObj, years: yearObjs[i]});
              return;
            }
          }
        });

        //calculate the days in a year
        var daysInAYear = this.DaysInAMonth * this.MonthNames.length;

        //add the time in days to each age
        //spill over any excess days into years
        //update the characters
        _.each(charAges,function(charAge){
          var totalDays = Number(charAge.days.get("max")) + Number(delta_t);
          var totalYears = Number(charAge.years.get("max"));

          //be sure the years and days were valid
          if(totalYears == NaN){
              whisper(getObj("character",charAge.id).get("name") + "\'s Age_Years is invalid. Reseting it to 20 years.");
              totalYears = 20;
          }
          if(totalDays == NaN){
              whisper(getObj("character",charAge.id).get("name") + "\'s Age_Days is invalid. Reseting it to 20 years.");
              totalDays = 0;
          }

          //let any overflow go into years
          while(totalDays >= daysInAYear){
              totalDays -= daysInAYear;
              totalYears++;
          }

          //record the results
          charAge.days.set("current",totalDays);
          charAge.days.set("max",totalDays);
          charAge.years.set("current",totalYears);
          charAge.years.set("max",totalYears);
        });
    }
}

on("chat:message", function(msg) {
if(msg.type == "api" && msg.content.indexOf("!Time += ") == 0 && playerIsGM(msg.playerid)){
    //load the GM variables
    var storage =  findObjs({type: 'character', name: "Calendar"})[0];
    //create the Calendar Object based on the stored GM variables
    myCalendar = new Calendar(getAttrByName(storage.id,"Day"),getAttrByName(storage.id,"Month"), getAttrByName(storage.id,"Year"));
    //advance the Calendar forward by the stated time
    var currentTime = myCalendar.advance(msg.content.substring(9));
    log("Current Time Pre")
    log(currentTime)
    //update the calendar and log book based on events
    if(!myCalendar.updateCalendar()){
        //if there was an error, do not continue
        return;
    }
    log("Current Time Post")
    log(currentTime)
    //if the update was successful...
    //load up the day variable
    var attribObj = findObjs({ type: 'attribute', characterid: storage.id, name: "Day" })[0];

    //update the day
    attribObj.set("current",currentTime["Day"]);
    //load up the month variable
    var attribObj = findObjs({ type: 'attribute', characterid: storage.id, name: "Month" })[0];
    //update the month
    attribObj.set("current",currentTime["Month"]);
    //load up the year variable
    var attribObj = findObjs({ type: 'attribute', characterid: storage.id, name: "Year" })[0];
    //update the year
    attribObj.set("current",currentTime["Year"]);

    //age the player characters
    myCalendar.ageCharacters(currentTime["days"]);
    //myCalendar.AgeCharacter("Ken",currentTime["days"])

    //report the time
    myCalendar.show("<br>It is now the ", null);
    //get rid of the evidence
    delete myCalendar;

} else if(msg.type == "api" && msg.content.indexOf("!Event ") == 0 && playerIsGM(msg.playerid)){
    log(msg.content.substring(7))
    //create the Calendar Object based on the stored GM variables
    myCalendar = new Calendar();
    //add your event to the notes
    myCalendar.addEvent(msg.content.substring(7),false);
    //get rid of the evidence
    delete myCalendar;
} else if(msg.type == "api" && msg.content.indexOf("!gmEvent ") == 0 && playerIsGM(msg.playerid)){
    log(msg.content.substring(9))
    //create the Calendar Object based on the stored GM variables
    myCalendar = new Calendar();
    //add your event to the notes
    myCalendar.addEvent(msg.content.substring(9),true);
    //get rid of the evidence
    delete myCalendar;
}
});

//wait for the Central Input object to initialize
on("ready",function(){
  //Lets the user quickly learn the current date
  CentralInput.addCMD(/^!\s*time\s*\??\s*$/i,function(matches,msg){
    //load the GM variables
    var storage =  findObjs({type: 'character', name: "Calendar"})[0];
    //create the Calendar Object based on the stored GM variables
    myCalendar = new Calendar(getAttrByName(storage.id,"Day"),getAttrByName(storage.id,"Month"), getAttrByName(storage.id,"Year"));
    //report the time
    myCalendar.show("It is currently the ", msg.playerid);
    //get rid of the evidence
    delete myCalendar;
  });

  //Lets the user ask what day it will be after <x> days|weeks|etc
  CentralInput.addCMD(/^!\s*time\s*\?\s*\+\s*((?:\d+\s*(?:day|month|week|year|decade|century)s?\s*)+)$/i,function(matches,msg){
    //load the GM variables
    var storage =  findObjs({type: 'character', name: "Calendar"})[0];
    //create the Calendar Object based on the stored GM variables
    myCalendar = new Calendar(getAttrByName(storage.id,"Day"),getAttrByName(storage.id,"Month"), getAttrByName(storage.id,"Year"));
    //advance the Calendar forward by the stated time
    var currentTime = myCalendar.advance(matches[1]);
    //do not save the result!

    //report the time
    myCalendar.show("It will be the ", msg.playerid);
    //get rid of the evidence
    delete myCalendar;
  });

  //Lets the user ask how long until the given date
  CentralInput.addCMD(/^!\s*time\s*\?\s*([^\+\s].*)$/i,function(matches,msg){
    //load the GM variables
    var storage =  findObjs({type: 'character', name: "Calendar"})[0];
    //create the Calendar Object based on the stored GM variables
    myCalendar = new Calendar(getAttrByName(storage.id,"Day"),getAttrByName(storage.id,"Month"), getAttrByName(storage.id,"Year"));
    //advance the Calendar forward by the stated time
    var currentTime = myCalendar.textToNumbers(matches[1]);

    //report the time in number format
    whisper(myCalendar.difference(currentTime) + matches[1], {speakingTo: msg.playerid});
    //get rid of the evidence
    delete myCalendar;
  });


});
//create a single character importer object
charImport = {}

//save the content of the character bio
charImport.getCharacterBio = function(charName, callback){
  //create a list of charactersheets that have the given name
  this.charName = charName;
  var charList = findObjs({_type: "character", name: charName});

  //are there too few matches?
  if(charList.length <= 0){
    whisper("Character not found.");
    return false;
  //are there too many matches?
  } else if(charList.length >= 2){
    whisper("Multiple matches. Aborting. See log for details.")
    _.each(charList,function(char){
      log(char.get("name"));
    });
    return false;
  }
  //save the character object
  charImport.CharObj = charList[0];
  //otherwise try to load the Bio of the given character
  charImport.CharObj.get("bio", function(bio){
    //was the bio empty?
    if(bio == ""){
      whisper("Bio is empty.")
      if(typeof callback == 'function') callback(false);
    } else {
    //there was no problem saving the bio
      charImport.charText = bio;
      if(typeof callback == 'function') callback(true);
    }
  });
}

//convert text into character
charImport.makeCharacter = function(){
  this.character = new INQCharacter(this.charText);
  this.character.Name = this.charName;
  this.character.toCharacterObj(false, this.CharObj.id);
}

//convert text into character
charImport.makeVehicle = function(){
  this.character = new INQVehicle(this.charText);
  this.character.Name = this.charName;
  this.character.toCharacterObj(false, this.CharObj.id);
}

on("ready",function(){
  CentralInput.addCMD(/^!\s*import\s*character\s*(\S(?:.*\S)?)\s*$/i,function(matches,msg){
    charImport.getCharacterBio(matches[1], function(valid){
      if(!valid) return;
      charImport.makeCharacter();
      whisper("*" + getLink(charImport.CharObj.get("name")) + "* has been imported. Note that attributes will not be shown until the character sheet has been closed and opened again.");
    });
  });
  CentralInput.addCMD(/^!\s*import\s*vehicle\s*(\S(?:.*\S)?)\s*$/i,function(matches,msg){
    charImport.getCharacterBio(matches[1], function(valid){
      if(!valid) return;
      charImport.makeVehicle();
      whisper("*" + getLink(charImport.CharObj.get("name")) + "* has been imported. Note that attributes will not be shown until the character sheet has been closed and opened again.");
    });
  });
});
//imports a weapon from text and converts it into an ability for the selected characters

//matches[1]: weapon name
//matches[2]: weapon details
function importWeapon(matches, msg){
  //be sure at least one character is selected
  if(msg.selected == undefined || msg.selected.length != 1){
    whisper("Please select one character.");
    return;
  }
  //convert the text into an INQWeapon
  var details = matches[2].replace("(","[").replace(")","]");
  var weapon = new INQWeapon(matches[1] + "(" + details + ")");

  //give each selected character a custom weapon
  var customWeapon = {custom: true};
  eachCharacter(msg, function(character, graphic){
    new INQCharacter(character, graphic, function(inqcharacter){
      if(weapon.Class == "Melee"){
        weapon.DamageBase -= inqcharacter.bonus("S");
        if(weapon.has("Fist")){
          weapon.DamageBase -= inqcharacter.bonus("S");
        }
        if(inqcharacter.has("Crushing Blow", "Talents")){
          weapon.DamageBase -= 2;
        }
      } else if(inqcharacter.has("Mighty Shot", "Talents")){
        weapon.DamageBase -= 2;
      }
      createObj("ability", {
        characterid: character.id,
        name: weapon.Name,
        action: weapon.toAbility(inqcharacter, undefined, customWeapon),
        istokenaction: true
      });

      whisper("*" + character.get("name") + "* has been given a(n) *" + weapon.Name + "*");
    });
  });
}

on("ready", function(){
  CentralInput.addCMD(/^!\s*import\s*weapon\s+(.*?)\((.*?)\)\s*$/i, importWeapon);
});
function Sector(){
    this.Grid = [];  //create an array to hold the system objects

    //create a function to randomly make a connected blob of systems
    this.GenerateGrid = function(size){
        //reset the grid
        this.Grid = [];
        //build up the height of the grid
        for(var i = 0; i < size; i++){
            this.Grid[i] = [];
            //build up the width of the grid
            for(var j = 0; j < size; j++){
                this.Grid[i][j] = {};
                //create a list of connections
                this.Grid[i][j].X = [];
                this.Grid[i][j].Y = [];
            }
        }

        //now that the grid exists, with a list of connections ready for each system, generate connections between the systems
        //step through each system in the grid
        for(var i = 0; i < size; i++){
            for(var j = 0; j < size; j++){
                //step through each nearby system
                for(var di = -2; di <= 2; di++){
                    for(var dj = -2; dj <= 2; dj++){
                        //be sure the nearby system is within the grid
                        //also be sure we are not making a connection with ourselves
                        if(i+di >= 0 && i+di < size && j+dj >= 0 && j+dj < size && (di != 0 || dj != 0)){
                            //with this probability of a connection forming, there will be an average of 2.7 +- 1.5 connections per system
                            //if(Math.random() <= 0.03456){
                            if(Math.random() <= 0.05){
                                //be sure this is a new connection
                                //step through all of the previous connections
                                var newConnection = true;
                                for(var k = 0; k < this.Grid[i][j].X.length; k++){
                                    //are the X and Y coordinates a match?
                                    if(di == this.Grid[i][j].X[k] && dj == this.Grid[i][j].Y[k]){
                                        //this connection already exists, don't add it, and stop looking for it
                                        newConnection = false;
                                        break;
                                    }
                                }
                                //only add the connection if it is new
                                if(newConnection){
                                    //save this connection to the current system
                                    this.Grid[i][j].X.push(di);
                                    this.Grid[i][j].Y.push(dj);
                                    //save this system to the connected system
                                    this.Grid[i+di][j+dj].X.push(-di);
                                    this.Grid[i+di][j+dj].Y.push(-dj);
                                }
                            }
                        }
                    }
                }
            }
        }


        //now that the grid is randomly connected, label each connected blob
        //create a label counter
        var counter = 0;
        //step through each system
        for(var i = 0; i < size; i++){
            for(var j = 0; j < size; j++){
                //does this system not have a label already?
                if(this.Grid[i][j].label == undefined){
                    //note this as part of the next blob group
                    this.Grid[i][j].label = counter;
                    //get ready for the next blob group
                    counter++;
                }
                //mark all the connected systems as being part of this blob group
                for(var k = 0; k < this.Grid[i][j].X.length; k++){
                    //be sure the connected system isn't already labeled
                    if(this.Grid[i + this.Grid[i][j].X[k]][j + this.Grid[i][j].Y[k]].label == undefined){
                        this.Grid[i + this.Grid[i][j].X[k]][j + this.Grid[i][j].Y[k]].label = this.Grid[i][j].label;
                    //have we just connected two different blobs?
                    } else if(this.Grid[i + this.Grid[i][j].X[k]][j + this.Grid[i][j].Y[k]].label != this.Grid[i][j].label) {
                        //write over the connected blob with this current one
                        //save the connect blob
                        var tempLabel = this.Grid[i + this.Grid[i][j].X[k]][j + this.Grid[i][j].Y[k]].label;
                        //search for every system with this label in the grid
                        for(var i2 = 0; i2 < size; i2++){
                            for(var j2 = 0; j2 < size; j2++){
                                if(this.Grid[i2][j2].label == tempLabel){
                                    //and change it
                                    this.Grid[i2][j2].label = this.Grid[i][j].label
                                }
                            }
                        }
                    }
                }
            }
        }

        //now that the blobs are labeled, find the biggest blob
        //create an array to tally how big each blob is
        var tally = [];
        for(var k = 0; k < counter; k++){
            tally[k] = 0;
        }
        //tally up all the systems in each blob
        for(var i = 0; i < size; i++){
            for(var j = 0; j < size; j++){
                tally[this.Grid[i][j].label]++;
            }
        }
        //find the blob with the biggest tally (any ties will be forgotten)
        var largestTally = 0;
        for(var k = 1; k < tally.length; k++){
            if(tally[k] > tally[largestTally]){
                largestTally = k;
            }
        }

        //now that the largest blob has been found, delete the connections of all the systems within other blobs
        for(var i = 0; i < size; i++){
            for(var j = 0; j < size; j++){
                //is this not part of the largest blob?
                if(this.Grid[i][j].label != largestTally){
                    //delete all the connections of this system
                    this.Grid[i][j].X = [];
                    this.Grid[i][j].Y = [];
                }
            }
        }

        //output the number of connections each system has
        var output = "";
        for(var i = 0; i < size; i++){
            output += "|";
            for(var j = 0; j < size; j++){
                if(this.Grid[i][j].X.length == 0){
                    output += "--";
                } else if(this.Grid[i][j].X.length < 10){
                    output += " " + this.Grid[i][j].X.length;
                } else {
                    output += this.Grid[i][j].X.length;
                }
                output += ",";
            }
            output += "|";
            output += "<br>";
        }
        //find the damage catcher character sheet
        var outputWindow = findObjs({
          _type: "character",
          name: "Damage Catcher"
        })[0];

        outputWindow.set('gmnotes',output);

        sendChat("System","/w gm Largest Blob " + tally[largestTally].toString());
    }
    //create a function to build up a map of the sector, start by hiding everything in the GM Overlay so that players cannot see what is ahead
    //this map will not have any Sector info yet, it will just be a bunch of black suns connected by lines
    this.ShowGrid = function(sectorName){
        //did the user input a sector?
        if(sectorName.length <= 0 || sectorName.length == undefined){
            sectorName = "Sector Map"
        }
        //does the sector map exist yet?
        var SectorRooms = findObjs({type: "page", name: sectorName});
        var SectorRoom;
        //if not, then create the sector map
        if(SectorRooms[0] != undefined){
            SectorRoom = SectorRooms[0];
        } else {
            //if the room does not exist, make it exist
            SectorRoom = createObj("page", {name: sectorName});
        }
        //clear the room of any objects
        //find all of the objects on this page
        var SectorGraphics = findObjs({
          _pageid: SectorRoom.id,
          _type: "graphic",
        });
        //delete each found object
        _.each(SectorGraphics, function(obj) {obj.remove();});

        //size the room according to the grid size
        SectorRoom.set("width",2*this.Grid.length);
        SectorRoom.set("height",2*this.Grid.length);

        //write the width of the connection ahead of time, so that it can be easily adjusted later
        var connectionWidth = 30;

        //add any system which has > 0 connections
        for(var i = 0; i < this.Grid.length; i++){
            for(var j = 0; j < this.Grid[i].length; j++){
                if(this.Grid[i][j].X.length > 0){
                    //where will the system and all of its connections be placed?
                    this.Grid[i][j].Left = 35 + 140 * j + randomInteger(69);
                    this.Grid[i][j].Top = 35 + 140 * i + randomInteger(69);

                    //place the system at a slightly randomized position
                    var systemToken = createObj("graphic", {
                        name: "?????",
                        _pageid: SectorRoom.id,
                        imgsrc: "https://s3.amazonaws.com/files.d20.io/images/16775325/LXeJmIMRsQLKpYrQykRfmA/thumb.png?1456822071",
                        left: this.Grid[i][j].Left,
                        top: this.Grid[i][j].Top,
                        width: 35,
                        height: 35,
                        rotation: randomInteger(360)-1,
                        layer: "objects",
                        tint_color: "#20124d",
                        showname: true,
                        showplayers_name: true,
                    });
                    //record the token id
                    this.Grid[i][j].id = systemToken.id;
                }
            }
        }

        //now that all the tokens are on the map, write down the connections with the token IDs
        for(var i = 0; i < this.Grid.length; i++){
            for(var j = 0; j < this.Grid[i].length; j++){
                //only add connection notes
                if(this.Grid[i][j].X.length > 0){
                    //reset the list of warp connections and their duration
                    var warpTravel = "";
                    for(var k = 0; k < this.Grid[i][j].X.length; k++){
                        //generate a list of travel times and the direction of travel
                        //start with the duration
                        switch(randomInteger(10)){
                            case 1: case 2:
                                var connectionDuration = randomInteger(5);
                                break;
                            case 3: case 4:
                                var connectionDuration = randomInteger(5)+5;
                                break;
                            case 5: case 6:
                                var connectionDuration = randomInteger(20) + 10;
                                break;
                            case 7: case 8:
                                var connectionDuration = randomInteger(50) + 30;
                                break;
                            case 9:
                                var connectionDuration = randomInteger(110) + 80;
                                break;
                            case 10:
                                var connectionDuration = randomInteger(110) + 190;
                                break;
                        }
                        //end with the stability
                        switch(randomInteger(10)){
                            case 1: case 2: case 3:
                                warpTravel += "Stable";
                                break;
                            case 4: case 5:
                                connectionDuration *= 2;
                                warpTravel += "Indirect";
                                break;
                            case 6:
                                connectionDuration *= 2;
                                warpTravel += "Haunted";
                                break;
                            case 7:
                                connectionDuration *= 2;
                                warpTravel += "Surly";
                                break;
                            case 8:
                                connectionDuration *= 2;
                                warpTravel += "Untraceable";
                                break;
                            case 9:
                                connectionDuration *= 2;
                                warpTravel += "Lightless";
                                break;
                            case 10:
                                connectionDuration *= 3;
                                warpTravel += "Byzantine";
                                break;
                        }
                        //note the total duration
                        warpTravel += "(" + connectionDuration.toString() + ") - ";
                        //note the id of the token we are connecting to
                        warpTravel += this.Grid[i + this.Grid[i][j].X[k]][j + this.Grid[i][j].Y[k]].id;
                        //move onto the next line
                        warpTravel += "<br>";
                        //only show half the connections so they do not double up
                        if(this.Grid[i][j].Y[k] > 0 || (this.Grid[i][j].Y[k] == 0 && this.Grid[i][j].X[k] > 0)){
                            //calculate the rotation of the connection
                            var connectionRotation = 180 /Math.PI * Math.atan((this.Grid[i][j].Top - this.Grid[i+this.Grid[i][j].X[k]][j+this.Grid[i][j].Y[k]].Top)/(this.Grid[i][j].Left - this.Grid[i+this.Grid[i][j].X[k]][j+this.Grid[i][j].Y[k]].Left))
                            if(connectionRotation == NaN){
                                connectionRotation = 180;
                            }
                            createObj("graphic", {
                                isdrawing: true,
                                _pageid: SectorRoom.id,
                                imgsrc: "https://s3.amazonaws.com/files.d20.io/images/16785887/qrZMRhhOvtq9Klq_lhHDFg/thumb.png?1456866191",
                                left: (this.Grid[i][j].Left + this.Grid[i+this.Grid[i][j].X[k]][j+this.Grid[i][j].Y[k]].Left)/2,
                                top: (this.Grid[i][j].Top + this.Grid[i+this.Grid[i][j].X[k]][j+this.Grid[i][j].Y[k]].Top)/2,
                                width: Math.sqrt(Math.pow(this.Grid[i][j].Left - this.Grid[i+this.Grid[i][j].X[k]][j+this.Grid[i][j].Y[k]].Left,2) + Math.pow(this.Grid[i][j].Top - this.Grid[i+this.Grid[i][j].X[k]][j+this.Grid[i][j].Y[k]].Top,2)),
                                height: connectionWidth,
                                rotation: connectionRotation,
                                layer: "gmlayer",
                            });
                        }
                    }
                    //add the warpTravel note to the token
                    var systemToken = getObj("graphic", this.Grid[i][j].id);
                    systemToken.set("gmnotes",warpTravel);
                }
            }
        }


    }

    //attempts to create a NewSystem for a selected token on the map
    this.TokenToSystem = function(obj,content){
        //get the graphic object
        var graphic = getObj("graphic", obj._id);
        //be sure the graphic is defined
        if(graphic == undefined){
            //rage quit if the graphic is undefined
            return;
        }
        //be sure the graphic isn't just a drawing
        if(graphic.get("isdrawing")){
            //rage quit if the graphic is just a drawing
            return;
        }
        //get the system object ready
        var mySystem = new System();
        //create the system and record the output information
        var stars = mySystem.Generate(content,graphic.get("gmnotes"));
        delete mySystem;
        //add some variance to the size
        var sizeVariance = (74+randomInteger(51))/100;
        //edit the size of the token
        graphic.set("width",18*stars.StarSizes[0]*sizeVariance);
        graphic.set("height",18*stars.StarSizes[0]*sizeVariance);
        //edit the color of the token
        graphic.set("tint_color",stars.StarTypes[0]);
        //edit the name of the token
        graphic.set("name",stars.SystemName);
        //make the token represent this system
        graphic.set("represents",stars.id)
        //add any additional stars to the map
        //start at a specific angle
        var angle0 = randomInteger(360);
        for(var k = 1; k < stars.StarTypes.length; k++){
            //add some variance to the size
            var sizeVariance = (74+randomInteger(51))/100;
            createObj("graphic", {
                isdrawing: true,
                _pageid: graphic.get("_pageid"),
                imgsrc: "https://s3.amazonaws.com/files.d20.io/images/16775325/LXeJmIMRsQLKpYrQykRfmA/thumb.png?1456822071",
                left: graphic.get("left") + 35 * Math.cos(60*k + angle0),
                top: graphic.get("top") + 35 * Math.sin(60*k + angle0),
                width: 18*stars.StarSizes[k]*sizeVariance,
                height: 18*stars.StarSizes[k]*sizeVariance,
                rotation: randomInteger(360)-1,
                layer: "map",
                tint_color: stars.StarTypes[k],
            });
        }
    }

    this.UpdateConnections = function(token){
        //get the graphic
        var graphic = getObj("graphic",token._id);
        //does the graphic exist?
        if(graphic == undefined){return;}
        //is the graphic just a drawing?
        if(graphic.get("isdrawing")){return;}
        //get the associated character sheet
        var character = getObj("character",graphic.get("represents"));
        //does the character sheet exist?
        if(character == undefined){return;}
        //get the GMNotes
        var GMNotes = "";
        character.get("gmnotes",function(gmnotes){
            GMNotes = gmnotes;
        });
        //be sure we loaded the gmnotes right. This usually doesn't happen on the first try
        if(GMNotes == ""){
            sendChat("System", "/w gm " + character.get("name") + " is empty. Once more, with feeling.");
            return;
        }
        var bulletEnd = -1;
        //does the GMNotes start with information about warp routes?
        if(GMNotes.substring(0,19) == "Warp Routes<br><ul>"){
            //find the end of the bullet point group
            bulletEnd = GMNotes.indexOf("</ul>");
        }
        //create the system object
        var mySystem = new System();
        //be sure the bullet group end is found
        if(bulletEnd >= 0){
            //replace the old connections
            //start after "</ul>" finishes
            GMNotes = mySystem.WriteWarpRoutes(graphic.get("gmnotes")) + GMNotes.substring(bulletEnd+5);
        } else {
            //tack the connection onto the beginning
            GMNotes = mySystem.WriteWarpRoutes(graphic.get("gmnotes")) + GMNotes;
        }
        //record the GMNotes
        character.set("gmnotes",GMNotes);
        //alert the GM
        sendChat("System","/w gm " + graphic.get("name") + "'s connections updated.");
    }

}

on("chat:message", function(msg) {
if(msg.type == 'api' && msg.content.indexOf('!NewSector ') == 0 && playerIsGM(msg.playerid)){
    mySector = new Sector();
    mySector.GenerateGrid(Number(msg.content.substring(11)));
} else if(msg.type == 'api' && msg.content.indexOf("!ShowSector") == 0 && playerIsGM(msg.playerid)){
    mySector.ShowGrid(msg.content.substring(12));
    sendChat("System", "/w gm Sector Shown")
} else if(msg.type == 'api' && msg.content == "!TokenInfo" && playerIsGM(msg.playerid)){
    if(msg.selected){
        //find the character the token represents
        var graphic = getObj("graphic", msg.selected[0]._id);
        //be sure the graphic is valid
        if(graphic == undefined){
            sendChat(msg.who, "/em - graphic undefined.")
            return;
        }
        log("imgsrc");
        log(graphic.get("imgsrc"));
        log("left");
        log(graphic.get("left"));
        log("top");
        log(graphic.get("top"));
        log("layer");
        log(graphic.get("layer"));
    }
} else if(msg.type == "api" && msg.content.indexOf("!NewSystem") == 0 && playerIsGM(msg.playerid) && msg.selected) {
    mySector = new Sector();
    _.each(msg.selected,function(obj){
        mySector.TokenToSystem(obj,msg.content)
    });
} else if(msg.type == "api" && msg.content.indexOf("!UpdateConnections") == 0 && playerIsGM(msg.playerid) && msg.selected){
    log("connections")
    mySector = new Sector();

    _.each(msg.selected,function(obj){
        log(obj)
        mySector.UpdateConnections(obj)
    });
}
});
//constructs the System Object with all of its functions and variables
function System(){
    //Identification Numbers
    this.Sector = "K";     //the sector letter, for identification purposes
    this.SystemNumber = 1; //the system numeral, for identification purposes
    this.PlanetNumber = 1; //the planet numeral, for identification purposes
    this.MoonNumber = 1;   //the moon numeral, for identification purposes
    
    //System Features  
    this.BiosphereAtmosphere = 0; //Due to Haven, Biosphere Planets have higher atmosphere rolls
    this.HavenHabitability = 0; //Due to Haven, Planets have higher habitability rolls
    this.EmpireInhabitants = []; //the preset ruins inhabitants (who are now dead and gone)
    this.EmpireRuins = 0; //number of additional archeotech/xenos ruins in the system
    this.EmpireAbundance = 0; //increase the abundance of all Archeotech/Xenos Ruins by this amount
    this.VoidInhabitants = []; //the preset Starfarer inhabitants
    this.region = 0;             //deontes wether we are in the Inner Cauldron(0), Primary Biosphere(1), or Outer Reaches(2)
    this.InnerCauldron = 0;      //index for the InnerCauldron. Please do not modify.
    this.PrimaryBiosphere = 1;   //index for the Primary Biosphere. Please do not modify.
    this.OuterReaches = 2;       //index for the OuterReaches. Please do not modify.
    this.PlanetBounty = 0; //Due to bounty, Planets have additional Mineral Resources
    
    //Planet Creation
    this.RegionShift = 0; //Shifts the Region for planet generation
    this.OrbitalFeatures = 0; //the number of orbital features aroudn a planet
    this.ResourceReductions = 0; //reduce this many resources of a planet based on colony type
    this.ReductionDice = 0; //reduce the resources by this many D10s
    this.ReductionBase = 0; //reduce the resources by this flat amount
    this.ReductionTypes = ""; //only the resources in this list will be reduced
    this.ResourceCap = 500;  //this is the maximum amount of abundance allowed on this world.
    this.ResourceBonus = 0;  //this is a bonus to any rolls for resource abundance
    this.PlanetExoticBounty = 0; //Due to Bounty, Planets have additional Exotic Mineral Resources
    this.Wasteland = 11;  //what is the chance that the location will be a wasteland?
    this.ExtraCreatures = false; //does this planet have extra creatures?
    
    
//=================================================================================================================================
//Resource Functions
//=================================================================================================================================

    //there are many potential modifiers to the abundance of a resource, this function piles up the generic ones all in one place
    this.calculateAbundance = function (abundance,type){
        abundance = abundance || randomInteger(100);
        type = type || "";
        
        //this bonus applies universally
        abundance += this.ResourceBonus;
        
        //if this resource type is found in the list of resources to reduce
        //AND if there are still reductions to do
        if(this.ReductionTypes.indexOf(type) != -1 && this.ResourceReductions > 0){
            //one of the reductions has been used
            this.ResourceReductions--;
            //reduce the abundance by a flat amount
            abundance -= this.ReductionBase;
            //reduce the abundance by [ReductionDice] D10s
            for(var diceindex = 0; diceindex < this.ReductionDice; diceindex++){
                abundance -= randomInteger(10);
            }
            //increase the abundance by -[ReductionDice] D10s
            for(diceindex = 0; diceindex < -this.ReductionDice; diceindex++){
                abundance += randomInteger(10);
            }
        }
        
        //now that all the modifiers have been applied, be sure the abundance lies in legal means
        if(abundance > this.ResourceCap){abundance = this.ResourceCap;}
        else if(abundance < 0){abundance = 0;} //still output a 0, that way you can see when a race has totally depleted a resource
        
        //return the modified abundance
        return abundance;
    }
    
    //generates a random Mineral resource
    this.RandomMineral = function (abundance, PresetMineral){
        PresetMineral = PresetMineral || "";
        
        //apply all the standard modifiers to the abundance
        abundance = this.calculateAbundance(abundance,"Mineral");
        
        //record the abundance of the minerals in string form
        var output = abundance.toString() + " " + getLink("Abundance") + " of ";
        
        //if the mineral was not already preset, roll for one randomly
        if(PresetMineral == ""){
            switch(randomInteger(10)){
                case 1: case 2: case 3: case 4: output += "Industrial"; break;
                case 5: case 6: case 7: output += "Ornamental"; break;
                case 8: case 9: output += "Radioactive"; break;
                case 10: output += "Exotic"; break;
            }
            output += " " + getLink("Minerals");
        } else {
            output += PresetMineral;
        }
        //return the abundance and mineral in string form
        return output;
    }
    
    //generates a random Organic resource
    this.RandomOrganic = function(abundance){
        //apply the standard modifiers to the abundance of the organic compound
        abundance = this.calculateAbundance(abundance,"Organic Compound");
        //record the modified abundance in string form
        var output = abundance.toString() + " " + getLink("Abundance") + " of ";
        //roll for a random organic compound
        switch(randomInteger(10)){
            case 1: case 2:  output += "Curative"; break;
            case 3: case 4:  output += "Juvenat"; break;
            case 5: case 6:  output += "Toxic"; break;
            case 7: case 8: case 9: output += "Vivid"; break;
            case 10: output += "Exotic"; break;
        }
        output += " " + getLink("Compounds")
        //return the abundance and compound type in string form
        return output;
    } 
    
    //generates a random Xenos Ruin resource
    this.RandomRuin = function(abundance, PresetRuin){
        PresetRuin = PresetRuin || "";
        var output = "";
            
        //if abundance is == "Name" then only return the name of a random xenos ruin
        if(abundance != "Name"){
            //calculate abundance based on the preset resource type, by default, this function produces Xenos ruins
            if(PresetRuin == "Human"){
                abundance = this.calculateAbundance(abundance,"Archeotech");
            } else {
                abundance = this.calculateAbundance(abundance,"Ruin");
            }
            
            //Ruined Empire System Traits increase the abundance of Ruins and Archeotech.
            for(index = 0; index < this.EmpireAbundance; index++){
                abundance += randomInteger(10)+5;
            }
            //record the abundance in string form
            output += abundance.toString() + " " + getLink("Abundance") + " of ";
        }
        
        //if the ruin type was not already preset, randomly generate a ruin type
        if(PresetRuin == ""){
            switch(this.Sector){
                case "K": case "C":
                switch(randomInteger(10)){
                    case 1: case 2: case 3: case 4: output += "Unknown Xenos"; break;
                    case 5: case 6:  output += "Eldar"; break;
                    case 7:  output += "Egarian"; break;
                    case 8:  output += "Yu'Vath"; break;
                    case 9:  output += "Ork"; break;
                    case 10: output += "Kroot"; break;
                }
                break;
                case "J": case "O": case "H":
                switch(randomInteger(10)){
                    case 1: case 2: case 3: case 4: output += "Unknown Xenos"; break;
                    case 5: case 6:  output += "Necron"; break;
                    case 7:  output += "Eldar"; break;
                    case 8:  output += "Ghanathaar"; break;
                    case 9:  output += "Ork"; break;
                    case 10: output += "Kroot"; break;
                }
                break;
                case "S":
                    output += "Unknown Xenos";
                break;
            }
        } else if(PresetRuin == "Human") {
            //human ruins are Archeotech resources
            output += getLink("Archeotech Cache");
        } else {
            //otherwise just add the preset Xenos ruin
            output += PresetRuin;
        }
        
        //if you are not just asking for random ruin type and the ruin is not archeotech
        if(abundance != "Name" && PresetRuin != "Human"){
            //append [Ruins] to the output as the Preset Ruin is just an adjective for this noun
            output += " " + getLink("Ruins");
        }
        
        //return the final result in string form
        return output;
    }
    
//=================================================================================================================================
//Race Functions
//=================================================================================================================================

    //generates a random race depending on the area
    this.RandomRace = function (Habitable,PresetRace){
        PresetRace = PresetRace || "";
        var roll;
        var output = PresetRace;
        
        //if the race has not already been predetermined, select a random one
        if(PresetRace == ""){
            switch(this.Sector){
                case "K":
                if(Habitable){roll = randomInteger(10);} else {roll = randomInteger(7);}   
                switch(roll){
                    case 1: output = "Eldar"; break;
                    case 2: case 3: case 4: output = "Human"; break;
                    case 8: output = "Kroot"; break;
                    case 9: case 10: output = "Orks"; break;
                    case 5: output = "Rak'Gol"; break;
                    //we will generate a random xenos later, save onto the fact that this is an Unknown Race
                    case 6: case 7: 
                        PresetRace = "Unknown";
                    break;
                }
                break;
                case "C":
                if(randomInteger(2) == 1){
                    //there is a very large change that the settlement is human
                    output = "Human";
                }else{
                    if(Habitable){roll = randomInteger(10);} else {roll = randomInteger(8);}   
                    switch(roll){
                        case 1: output = "Eldar"; break;
                        case 2: case 3: case 4: case 5: case 6: output = "Human"; break;
                        case 9: output = "Kroot"; break;
                        case 10: output = "Orks"; break;
                        case 7: output = "Rak'Gol"; break;
                        //we will generate a random xenos later, save onto the fact that this is an Unknown Race
                        case 8: 
                            PresetRace = "Unknown";
                        break;
                    }
                }
                break;
                case "J":
                roll = randomInteger(10);
                switch(roll){
                    case 1: case 2: output = "Tyranid"; break;
                    case 3: output = "Daemon"; break;
                    case 4: case 5: case 6: output = "Human"; break;
                    case 7: case 8: output = "Tau"; break;
                    //we will generate a random xenos later, save onto the fact that this is an Unknown Race
                    case 9: 
                        PresetRace = "Unknown";
                    break;
                    case 10: output = "Necron"; break;
                }
                break;
                case "O":
                roll = randomInteger(10);
                switch(roll){
                    case 1: case 2: case 3: output = "Tyranid"; break;
                    case 4: case 5: case 6: output = "Necron"; break;
                    case 7: output = "Human"; break;
                    case 8: case 9: case 10: 
                        PresetRace = "Unknown";
                    break;
                }
                break;
                case "H":
                roll = randomInteger(10);
                switch(roll){
                    case 1: output = "Tyranid"; break;
                    case 2: case 3:  output = "Daemon"; break;
                    case 4: case 5: case 6: output = "Human"; break;
                    case 7: output = "Necron"; break;
                    case 8: output = "Tau"; break;
                    //we will generate a random xenos later, save onto the fact that this is an Unknown Race
                    case 9: case 10: 
                        PresetRace = "Unknown";
                    break;
                }
                break;
                case "S":
                roll = randomInteger(10);
                switch(roll){
                    case 1: output = "Human"; break;
                    case 2: output = "Necron"; break;
                    case 3: output = "Eldar"; break;
                    case 4: output = "Ork"; break;
                    case 5: output = "Kroot"; break;
                    case 6: output = "Daemon"; break;
                    case 7: output = "Tau"; break;
                    case 8: output = "Tyranid"; break;
                    //we will generate a random xenos later, save onto the fact that this is an Unknown Race
                    case 9: case 10: 
                        PresetRace = "Unknown";
                    break;
                }
                break;
            }
        }
        //if you are not just looking for a name, determine the habitation type
        //the habitation and race combination will determine how the abundances of the resources are affected
        if(Habitable != "Name"){
            output += " - ";
            switch(output){
                case "Eldar - ":
                this.ResourceReductions = 1000; //reduce this many resources of a planet based on colony type
                this.ReductionDice = -2; //reduce the resources by this many D10s
                this.ReductionBase = 0; //reduce the resources by this flat amount
                this.ReductionTypes = "Organic Compound"; //only the resources in this list will be reduced
                if(Habitable){roll = randomInteger(10);}else{roll = randomInteger(7);}
                switch(roll){
                    case 1: case 2: case 3: case 4: case 5: output += "Orbital Habitation"; break;
                    case 6: case 7: output += "Voidfarers"; break;
                    case 8: case 9: case 10: output += "Exodites"; break;
                } break;
                case "Human - ":
                if(Habitable){roll = randomInteger(10);}else{roll = randomInteger(5);}
                switch(roll){
                    case 1: case 2: output += "Advanced Industry";
                    this.ResourceReductions = 3; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 3; //reduce the resources by this many D10s
                    this.ReductionBase = 5; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                    case 3: output += "Colony";
                    this.ResourceReductions = 1000; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 1; //reduce the resources by this many D10s
                    this.ReductionBase = -5; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                    case 4: output += "Orbital Habitation"; break;
                    case 5: output += "Voidfarers";
                    this.ResourceReductions = 5; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 4; //reduce the resources by this many D10s
                    this.ReductionBase = 5; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                    case 6: case 7: output += "Basic Industry";
                    this.ResourceReductions = 5; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 2; //reduce the resources by this many D10s
                    this.ReductionBase = 5; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                    case 8: case 9: output += "Pre-Industrial";
                    this.ResourceReductions = 2; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 1; //reduce the resources by this many D10s
                    this.ReductionBase = 5; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                    case 10: output += "Primitive Clans";
                    this.ResourceReductions = 1; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 1; //reduce the resources by this many D10s
                    this.ReductionBase = 2; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                } break;
                case "Kroot - ":
                switch(randomInteger(10)){
                    case 8: case 9: case 10:output += "Colony";
                    this.ResourceReductions = 1000; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 1; //reduce the resources by this many D10s
                    this.ReductionBase = -5; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    this.ExtraCreatures = true; //does this planet have extra creatures?
                    break;
                    default: output += "Primitive Clans";
                    this.ResourceReductions = 1; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 1; //reduce the resources by this many D10s
                    this.ReductionBase = 2; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                } break;
                case "Orks - ":
                switch(randomInteger(10)){
                    case 5: output += "Colony";
                    this.ResourceReductions = randomInteger(5); //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 2; //reduce the resources by this many D10s
                    this.ReductionBase = 5; //reduce the resources by this flat amount
                    this.Wasteland = 8;  //what is the chance that the location will be a wasteland?
                    this.ReductionTypes = "Mineral, Ruin, Archeotech, Organic Compound"; //only the resources in this list will be reduced
                    break;
                    case 6: case 7: case 8: output += "Primitive Clans";
                    this.ResourceReductions = randomInteger(5)-1; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 1; //reduce the resources by this many D10s
                    this.ReductionBase = 5; //reduce the resources by this flat amount
                    this.Wasteland = 10;  //what is the chance that the location will be a wasteland?
                    this.ReductionTypes = "Mineral, Ruin, Archeotech, Organic Compound"; //only the resources in this list will be reduced
                    break;
                    case 9: case 10: output += "Voidfarers";
                    this.ResourceReductions = 1000; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 1; //reduce the resources by this many D10s
                    this.ReductionBase = 5; //reduce the resources by this flat amount
                    this.Wasteland = 4;  //what is the chance that the location will be a wasteland?
                    this.ReductionTypes = "Mineral, Ruin, Archeotech, Organic Compound"; //only the resources in this list will be reduced
                    break;
                    default: output += "Advanced Industry";
                    this.ResourceReductions = 1000; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 10; //reduce the resources by this many D10s
                    this.ReductionBase = 0; //reduce the resources by this flat amount
                    this.Wasteland = 6;  //what is the chance that the location will be a wasteland?
                    this.ReductionTypes = "Mineral, Ruin, Archeotech, Organic Compound"; //only the resources in this list will be reduced
                    break;
                } break;
                case "Rak'Gol - ":
                switch(randomInteger(5)){
                    case 1: output += "Colony";
                    this.ResourceReductions = 1000; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 1; //reduce the resources by this many D10s
                    this.ReductionBase = -5; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                    case 2: output += "Orbital Habitation"; break;
                    default: output += "Voidfarers";
                    this.ResourceReductions = 5; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 4; //reduce the resources by this many D10s
                    this.ReductionBase = 5; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                } break;
                case "Tyranid - ":
                if(Habitable){
                    if(randomInteger(2) == 1){
                        output += "Voidfarers";
                        this.ResourceReductions = 1000; //reduce this many resources of a planet based on colony type
                        this.ReductionDice = 10; //reduce the resources by this many D10s
                        this.ReductionBase = 0; //reduce the resources by this flat amount
                        this.ReductionTypes = "Mineral, Ruin, Archeotech, Organic Compound"; //only the resources in this list will be reduced
                    } else {
                        output += "Colony";
                        this.ResourceReductions = 1000; //reduce this many resources of a planet based on colony type
                        this.ReductionDice = 5; //reduce the resources by this many D10s
                        this.ReductionBase = 0; //reduce the resources by this flat amount
                        this.ReductionTypes = "Organic Compound"; //only the resources in this list will be reduced
                    }
                }else{
                    output += "Primitive Clans";
                    this.ResourceReductions = 1000; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 0; //reduce the resources by this many D10s
                    this.ReductionBase = 200; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral, Ruin, Archeotech, Organic Compound"; //only the resources in this list will be reduced
                }
                break;
                case "Necron - ": 
                switch(randomInteger(5)){
                    case 1: output += "Voidfarers";
                    this.ResourceReductions = 1000; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = -4; //reduce the resources by this many D10s
                    this.ReductionBase = 0; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral, Archeotech, Ruin"; //only the resources in this list will be reduced
                    break;
                    default: output += "Advanced Industry";
                    this.ResourceReductions = 1000; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = -10; //reduce the resources by this many D10s
                    this.ReductionBase = 0; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral, Archeotech, Ruin"; //only the resources in this list will be reduced
                    break;
                } break;    
                break;
                case "Tau - ": 
                roll = randomInteger(5);
                switch(roll){
                    case 1: output += "Orbital Habitation"; break;
                    case 2: output += "Voidfarers";
                    this.ResourceReductions = 5; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 2; //reduce the resources by this many D10s
                    this.ReductionBase = 5; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                    case 3: case 4: case 5: output += "Colony";
                    this.ResourceReductions = 1000; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 1; //reduce the resources by this many D10s
                    this.ReductionBase = -5; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                }
                break;
                case "Daemon - ":
                roll = randomInteger(5);
                switch(roll){
                    case 1: output += "Voidfarers";
                    this.ResourceReductions = 5; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = -10; //reduce the resources by this many D10s
                    this.ReductionBase = 0; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                    default: output += "Primitive Clans";
                    this.ResourceReductions = 1000; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = -5; //reduce the resources by this many D10s
                    this.ReductionBase = 0; //reduce the resources by this flat amount
                    this.ReductionTypes = "Organic Compound"; //only the resources in this list will be reduced
                    break;
                }    
                break;
                default:
                if(Habitable){roll = randomInteger(10);}else{roll = randomInteger(4);}
                switch(roll){
                    case 1: output += "Advanced Industry";
                    this.ResourceReductions = 3; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 3; //reduce the resources by this many D10s
                    this.ReductionBase = 5; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                    case 2: output += "Colony";
                    this.ResourceReductions = Infinity; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 1; //reduce the resources by this many D10s
                    this.ReductionBase = -5; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                    case 3: output += "Orbital Habitation"; break;
                    case 4: output += "Voidfarers";
                    this.ResourceReductions = 5; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 4; //reduce the resources by this many D10s
                    this.ReductionBase = 5; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                    case 5: case 6: output += "Basic Industry";
                    this.ResourceReductions = 5; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 2; //reduce the resources by this many D10s
                    this.ReductionBase = 5; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                    case 7: case 8: output += "Pre-Industrial";
                    this.ResourceReductions = 2; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 1; //reduce the resources by this many D10s
                    this.ReductionBase = 5; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                    case 9: case 10: output += "Primitive Clans";
                    this.ResourceReductions = 1; //reduce this many resources of a planet based on colony type
                    this.ReductionDice = 1; //reduce the resources by this many D10s
                    this.ReductionBase = 2; //reduce the resources by this flat amount
                    this.ReductionTypes = "Mineral"; //only the resources in this list will be reduced
                    break;
                } break;
            }
        }
        //if the unknown race has not been generated yet, generate it now
        if(PresetRace == "Unknown"){
            //is this race being stored generally?
            if(output == "" || output == "Unknown"){
                //the xenos has spread across the solar system, make it a void faring race at base
                output = this.RandomCreature("native voidfarer",this.Sector + "-" + this.SystemNumber.toString());
            } else {
                //generate xenos based on the Civilization Type (which is stored in native)
                output = this.RandomCreature("native " + output.toLowerCase(),this.Sector + "-" + this.SystemNumber.toString() + "-" + this.PlanetNumber.toString()) + output;
            }
        }
        //return the random inhabitants
        return output;
    }
    
    //roll for a random pirate fleet type to plague this system
    this.RandomPirate = function(){
        switch(this.Sector){
            case "K":
            //Kronos Pirates
            switch(randomInteger(10)){
                case 1: case 2: return "Dark Eldar"; break;
                case 3: case 4: return "Eldar"; break;
                case 5: case 6: return "Orks"; break;
                case 7: return "Chaos"; break;
                case 8: return "Renegade"; break;
                case 9: return this.RandomCreature("native voidfarer",this.Sector + "-" + this.SystemNumber.toString()); break; 
                case 10: return "Rak’Gol"; break;
            }
            break;
            case "C":
            if(randomInteger(2) == 1){
                //there is a very large change that the settlement is human
                return "Human";
            }else{
                switch(randomInteger(10)){
                    case 1: return "Eldar"; break;
                    case 2: case 3: case 4: case 5:  return "Human"; break;
                    case 6: return "Dark Eldar"; break;
                    case 7: return "Kroot"; break;
                    case 8: return "Orks"; break;
                    case 9: return "Rak'Gol"; break;
                    case 10: return this.RandomCreature("native voidfarer",this.Sector + "-" + this.SystemNumber.toString()); break;
                }
            }
            break;
            case "J":
            switch(randomInteger(10)){
                case 1: return "Eldar"; break;
                case 2: return "Dark Eldar"; break;
                case 3: case 4: case 5: case 6: return "Human"; break;
                case 7: case 8: case 9: return this.RandomCreature("native voidfarer",this.Sector + "-" + this.SystemNumber.toString()); break;
                case 10: return "Necron"; break;
            }
            break;
            case "O":
            switch(randomInteger(10)){
                case 1: return "Eldar"; break;
                case 2: return "Dark Eldar"; break;
                case 3: case 4: case 5: case 6: return "Necron"; break;
                case 7: return "Human"; break;
                case 8: case 9: case 10: return this.RandomCreature("native voidfarer",this.Sector + "-" + this.SystemNumber.toString()); break;
            }
            break; 
            case "H":
            switch(randomInteger(10)){
                case 1: return "Eldar"; break;
                case 2: return "Dark Eldar"; break;
                case 3: case 4: case 5: return "Human"; break;
                case 6: case 7: return "Necron"; break;
                case 8: case 9: case 10: return this.RandomCreature("native voidfarer",this.Sector + "-" + this.SystemNumber.toString()); break;
            }
            break; 
            case "S":
            switch(randomInteger(10)){
                case 1: return "Human"; break;
                case 2: return "Necron"; break;
                case 3: return "Eldar"; break;
                case 4: return "Ork"; break;
                case 5: return "Kroot"; break;
                case 6: return "Daemon"; break;
                case 7: return "Tau"; break;
                case 8: return "Tyranid"; break;
                case 9: case 10: return this.RandomCreature("native voidfarer",this.Sector + "-" + this.SystemNumber.toString()); break;
            }
            break;
        }        
    }

//=================================================================================================================================
//Adventure Functions
//=================================================================================================================================

    //Generates a random planetside adventure that could appear on just about any physical location
    this.RandomAdventure = function(){
        //the function will gather the information into a string
        var output = "";
        //generate a profit motive
        output += "<li><strong>Profit Motive</strong>: ";
        switch(randomInteger(10)){
            
            case 1: case 2: 
                output += "Lost Treasures - ";
                switch(randomInteger(10)){
                    case 1: case 2: output += "Lost Explorator</li>"; break;
                    case 3: case 4: output += "Cold Trade Ratlines</li>"; break;
                    case 5: case 6: case 7: output += "Martyr's Toil</li>"; break;
                    case 8: case 9: output += "Winterscale's Lost World</li>"; break;
                    case 10: output += "A Missing Dynasty</li>"; break;
                }break;
            
            case 3: case 4: //Undiscovered worlds
                output += "Undiscovered Worlds - ";
                switch(randomInteger(10)){
                    case 1: case 2: case 3: output += "Heretic Gold</li>"; break;
                    case 4: case 5: output += "Dark Secrets of the Yu'Vath</li>"; break;
                    case 6: case 7: output += "Bones of the Eldar</li>"; break;
                    case 8: case 9: output += "A Jewel Amidst the Sand</li>"; break;
                    case 10: output += "Off the Well-Tread Path</li>"; break;
                }break;
            
            case 5: case 6://Imperial Interest
                output += "Imperial Interest - ";
                switch(randomInteger(10)){
                    case 1: case 2: case 3: output += "The Green Menace</li>"; break;
                    case 4: case 5: case 6: output += "Marauders and Pirates</li>"; break;
                    case 7: case 8: output += "A Personal Errand</li>"; break;
                    case 9: case 10: output += "Echos of Gradneur</li>"; break;
                }break;
            case 7: case 8: //Mapping the Void
                output += "Mapping the Void - ";
                switch(randomInteger(10)){
                    case 1: case 2:  output += "Across the Expanse</li>"; break;
                    case 3: case 4: case 5: output += "A Better Path</li>"; break;
                    case 6: case 7: output += "Untouched by Humanity</li>"; break;
                    case 8: case 9: output += "Gifts of the Machine God</li>"; break;
                    case 10: output += "Safe Passage</li>"; break;
                }break;
            case 9: //Holy Pilgrimage
                output += "Holy Pilgrimage - ";
                switch(randomInteger(10)){
                    case 1: case 2: case 3: output += "Footsteps of Drusus</li>"; break;
                    case 4: case 5: case 6: output += "Winterscale's Resting Place</li>"; break;
                    case 7: case 8: output += "The Lost Crusade</li>"; break;
                    case 9: case 10: output += "Broken Shrine</li>"; break;
                }break;
            case 10: //Ancient Glories
                output += "Ancient Glories - ";
                switch(randomInteger(10)){
                    case 1: case 2: case 3:  output += "Colony of Man</li>"; break;
                    case 4: case 5: output += "Powder Keg</li>"; break;
                    case 6: case 7: output += "Descendants of the God Emperor</li>"; break;
                    case 8: case 9: output += "A Failed Mission</li>"; break;
                    case 10: output += "Imperial Cache</li>"; break;
                }break;
            
        }
        
        //generate an encounter site
        output += "<li><strong>Encounter Site</strong>: ";
        switch(randomInteger(10)){
            
            case 1: output += "Derelict Vessel - "; 
            switch(randomInteger(5)){
                case 1: output += "Automated Defences"; break;
                case 2: output += "Vicious Residents"; break;
                case 3: output += "Structural Decay"; break;
                case 4: output += "Ion Storm"; break;
                case 5: output += "The World Inverted"; break;
            }
            output += "</li><li><strong>Reward</strong>: ";
            switch(randomInteger(3)){
                case 1: output += "Prime Salvage"; break;
                case 2: output += "Valuable Survivors"; break;
                case 3: output += "Lost Cargo"; break;
            }break;
            case 2: output += "Death Zone - "; 
            switch(randomInteger(5)){
                case 1: output += "Sinkhole"; break;
                case 2: output += "Lingering Curses"; break;
                case 3: output += "Insane Machines"; break;
                case 4: output += "Rad Storm"; break;
                case 5: output += "Sandstorm"; break;
            }
            output += "</li><li><strong>Reward</strong>: ";
            switch(randomInteger(3)){
                case 1: output += "Rare Minerals"; break;
                case 2: output += "Ancient Plunder"; break;
                case 3: output += "New Colonies"; break;
            }break;
            case 3: output += "Lost City - "; 
            switch(randomInteger(5)){
                case 1: output += "Hostile Inhabitants"; break;
                case 2: output += "Pitfall Trap"; break;
                case 3: output += "Snare"; break;
                case 4: output += "Weapon Trap"; break;
                case 5: output += "Urban Decay"; break;
            }
            output += "</li><li><strong>Reward</strong>: ";
            switch(randomInteger(3)){
                case 1: output += "Safe Harbour"; break;
                case 2: output += "Secret Lore"; break;
                case 3: output += "Glory and Renown"; break;
            }break;
            case 4: output += "Warrens and Hollows - "; 
            switch(randomInteger(5)){
                case 1: output += "Toxic Spores"; break;
                case 2: output += "Twisting Labyrinth"; break;
                case 3: output += "Natural Snare"; break;
                case 4: output += "Digestion Pit"; break;
                case 5: output += "Bioelectric Field"; break;
            }
            output += "</li><li><strong>Reward</strong>: ";
            switch(randomInteger(3)){
                case 1: output += "Meat Locker"; break;
                case 2: output += "Purge and Cleanse"; break;
                case 3: output += "Rare Specimens"; break;
            }break;
            case 5: output += "Xenoform Biome - "; 
            switch(randomInteger(5)){
                case 1: output += "Hallucinogenic Spores"; break;
                case 2: output += "Shifting Maze"; break;
                case 3: output += "Oppressive Mind"; break;
                case 4: output += "Acid Pool"; break;
                case 5: output += "Aggressive Antibodies"; break;
            }
            output += "</li><li><strong>Reward</strong>: ";
            switch(randomInteger(2)){
                case 1: output += "Cleared for Colonization"; break;
                case 2: output += "Unnatural Interest"; break;
            }break;
            case 6: output += "Hidden Oasis - "; 
            switch(randomInteger(5)){
                case 1: output += "Native Predators"; break;
                case 2: output += "Deadly Flora"; break;
                case 3: output += "Natural Traps"; break;
                case 4: output += "Hostile Xenos"; break;
                case 5: output += "Renegade Psyker"; break;
            }
            output += "</li><li><strong>Reward</strong>: ";
            switch(randomInteger(3)){
                case 1: output += "Profitable Resources"; break;
                case 2: output += "Those That Never Leave"; break;
                case 3: output += "Trade Centre Establishment"; break;
            }break;
            case 7: output += "Cavern - "; 
            switch(randomInteger(5)){
                case 1: output += "Cave-In!"; break;
                case 2: output += "Dwellers Within"; break;
                case 3: output += "Natural Traps"; break;
                case 4: output += "Horrors from the Dark"; break;
                case 5: output += "Passages Without End"; break;
            }
            output += "</li><li><strong>Reward</strong>: ";
            switch(randomInteger(3)){
                case 1: output += "Profitable Resources"; break;
                case 2: output += "Safe Havens"; break;
                case 3: output += "Lost Relics"; break;
            }break;
            case 8: output += "Jungle - "; 
            switch(randomInteger(5)){
                case 1: output += "Apex Hunters"; break;
                case 2: output += "Dangerous Terrain"; break;
                case 3: output += "Xenos Tribes"; break;
                case 4: output += "Intense Weather"; break;
                case 5: output += "Deadly Swarms"; break;
            }
            output += "</li><li><strong>Reward</strong>: ";
            switch(randomInteger(3)){
                case 1: output += "Xenotech Cache"; break;
                case 2: output += "New Species"; break;
                case 3: output += "Lost Colony"; break;
            }break;
            case 9: output += "Chaos Scarred Region - "; 
            switch(randomInteger(5)){
                case 1: output += "Daemonic Incurions"; break;
                case 2: output += "Corrupting Terrain"; break;
                case 3: output += "Unnatural Gravities"; break;
                case 4: output += "Corrosive Air"; break;
                case 5: output += "Mutant Attack"; break;
            }
            output += "</li><li><strong>Reward</strong>: ";
            switch(randomInteger(2)){
                case 1: output += "Wonders of the Expanse"; break;
                case 2: output += "Potent Relics"; break;
            }break;
            case 10: output += "Ancient Warzone - "; 
            switch(randomInteger(5)){
                case 1: output += "Active Defences"; break;
                case 2: output += "Unexploded Munitions"; break;
                case 3: output += "Warrior of the Long Watch"; break;
                case 4: output += "Radiation Slag"; break;
                case 5: output += "Tectonic Disruptions"; break;
            }
            output += "</li><li><strong>Reward</strong>: ";
            switch(randomInteger(3)){
                case 1: output += "Weapons Cache"; break;
                case 2: output += "Relics of Battle"; break;
                case 3: output += "Unknown Archeotech"; break;
            }break;
        }
        output += "</li>";
        
        
        //Dangers
        var EncounterDangers = 1;
        while(EncounterDangers > 0){
            if(randomInteger(10) == 1){
                //This Danger needs more Danger
                EncounterDangers += 2;
            }
            else {
                output += "<li><strong>Danger</strong>: ";
                switch(randomInteger(15)){
                    case 1: output += "Strange Gravity"; break;
                    case 2: output += "Endless Night"; break;
                    case 3: output += "Enduring Day"; break;
                    case 4: output += "Baleful Stars"; break;
                    case 5: output += "Irradiated"; break;
                    case 6: output += "Temperature Extremes"; break;
                    case 7: output += "Rage of Storms"; break;
                    case 8: output += "Atmospheric Rot"; break;
                    case 9: output += "Corruptive Rain"; break;
                    case 10: output += "Layered Cloud"; break;
                    case 11: output += "Toxic Jungle"; break;
                    case 12: output += "Chemical Rivers and Lakes"; break;
                    case 13: output += "Broken Ground"; break;
                    case 14: output += "Volcanic Activity"; break;
                    case 15: output += "Warp Touched"; break;
                }
                output += "</li>";
            }
            EncounterDangers--;
        }                
        
        //Complication
        output += "<li><strong>Complication</strong>: ";
        switch(randomInteger(10)){
            case 1: output += "The Passing Storm"; break;
            case 2: output += "The Green Menace"; break;
            case 3: output += "Marked for Death"; break;
            case 4: output += "Scoundrels!"; break;
            case 5: output += "Devouring Infection"; break;
            case 6: output += "Hunter and Prey"; break;
            case 7: output += "In Shadows Cast"; break;
            case 8: output += "Tomb of the Ancients - "; 
            switch(randomInteger(4)){
                case 1: output += "Nightmare Globe"; break;
                case 2: output += "Temporal Sink"; break;
                case 3: output += "Lightning Spire"; break;
                case 4: output += "Stasis Trap"; break;
            }break;
            case 9: output += "Silence Amongst the Stars"; break;
            case 10: output += "Rak'Gol Scouts"; break;
        }
        output += "</li>";
        //return the adventure in string form
        return output;
    }
    

//=================================================================================================================================
//System Element Functions
//=================================================================================================================================

    //before we head to the planetary bodies, we need a function that creates handouts for the planets
    this.RandomPlanet = function (Moon,MaxSize){
        //if moon was not mentioned, assume it is not a moon
        Moon = Moon || false;
        //if a max size was not mentioned, assume there is no limit
        MaxSize = MaxSize || 10;

        //create temporary variables
        var output = ""; //stores the text sumary of the planet
        
        var PlanetGravity = 0;  //this function could be called as a moon and so we do not want to interrupt the host Gravity
        var Atmosphere = 0; //this varable records the atmospheric presence of the planet
        var Composition = 0; //this variable records the atmosphere composition
        var Climate = 0; //this variable records the Climate on the planet
        var Habitability = 0; //this variable records how habitable the planet is
        var TerritoryNumber = 1;//this variable labels each territory with a number
        var Size = 0; //this variable records the size of the planet, this provides an upper limit for the size of its moons
        
        var i; //a simple counter variable that can be turned into a string
        var Die;
        var k;
        
        //reset object variables
        this.ResourceBonus = 0;  //this is a bonus to any rolls for resource abundance
        this.ResourceCap = 500;
        this.ResourceReductions = 0; //reduce this many resources of a planet based on colony type
        this.ReductionDice = 0; //reduce the resources by this many D10s
        this.ReductionBase = 0; //reduce the resources by this flat amount
        this.ReductionTypes = ""; //only the resources in this list will be reduced
        this.Wasteland = 11;  //what is the chance that the location will be a wasteland?
        this.ExtraCreatures = false; //does this planet have extra creatures?
        
        //reset non-Moon object variables
        if(!Moon){
            this.MoonNumber = 1;
            this.OrbitalFeatures = 0;
            this.RegionShift = 0;
        }
        
        //Generate the Body of the Planet/Moon
        output += "<ul><li><strong>Body</strong>: ";
        
        //roll a random size for the planet
        Size = randomInteger(10);
        //be sure that the body is not larger than the host planet
        if(Size > MaxSize){Size = MaxSize;}
        
        //the size of the body applies a modifer to the roll for gravity
        //it can also alter rolls for resources
        switch(Size){
            case 1: output += "Low-Mass"; 
            PlanetGravity = -7;  
            this.ResourceCap = 40; 
            break;
            case 2: case 3: output += "Small"; 
            PlanetGravity = -5;
            break;
            case 4: output += "Small and Dense"; 
            this.ResourceBonus = 10;
            break;
            case 5: case 6: case 7: output += "Large"; break;
            case 8: output += "Large and Dense"; 
            PlanetGravity = 5;
            this.ResourceBonus = 10;
            break;
            case 9: case 10: output += "Vast"; 
            PlanetGravity = 4;
            break;
        }
        //close this bullet point
        output += "</li>";
        
        //Generate the Gravity of the Planet/Moon
        output += "<li><strong>" + getLink("Gravity") + "</strong>: ";
        PlanetGravity += randomInteger(10);
        
        //the gravity of the planet determines the number of Orbital Features, only if this Planet is not a Moon. Moons don't get their own moons
        //further the gravity provides a bonus to atmosphere rolls
        if(PlanetGravity <= 2) {
           output  += "Low";
           Atmosphere -= -2;
           if(!Moon){this.OrbitalFeatures = randomInteger(5)-3;}
        } else if(PlanetGravity >= 3 && PlanetGravity <= 8) {
           output += "Normal";
           if(!Moon){this.OrbitalFeatures = randomInteger(5)-2;}
        } else  { //if(PlanetGravity >= 9)
           output += "High";
           Atmosphere += 1;
           if(!Moon){this.OrbitalFeatures = randomInteger(5)-1;}
        }
        //close this bullet point
        output += "</li>";
        
        //Generate the Atmosphere of the Planet
        output += "<li><strong>" + getLink("Atmosphere") + "</strong>: ";
        
        //roll for the atmosphere
        Atmosphere += randomInteger(10);
        
        //haven systems have an atmosphere bonus for being in the Primary Biosphere
        if(this.region == this.PrimaryBiosphere){Atmosphere += this.BiosphereAtmosphere;}
        
        if(Atmosphere <= 1) {
            output  += "-";
        } else if(Atmosphere >= 2 && Atmosphere <= 4) {
            output += "Thin & ";
        } else if(Atmosphere >= 5 && Atmosphere <= 9) {
            output += "Moderate & ";
        } else { //if(Atmosphere >= 10)
            output += "Heavy & ";
        }
        
        //if there is an atmosphere, generate its composition
        if(Atmosphere >= 2){
            Composition += randomInteger(10);
            //haven systems have an exceptional bonus for the purity of Primary Biosphere Air quality
            if(this.region + this.RegionShift == this.PrimaryBiosphere){Composition += this.BiosphereAtmosphere + this.BiosphereAtmosphere;}
            switch(Composition) {
                case 1: output += "Deadly"; break;
                case 2: output += "Corrosive"; break;
                case 3: case 4: case 5: output += "Toxic"; break;
                case 6: case 7: output += "Tainted"; break;
                default: output += "Pure"; break;
            }
        }
        //close this bullet point
        output += "</li>";
        
        //Generate the Atmosphere of the Planet
        output += "<li><strong>" + getLink("Climate") + "</strong>: ";
        //Climate is pre determined if there is no atmosphere
        //Climite strongly affects Habitability
        if(Atmosphere <= 1) {
            if(this.region + this.RegionShift >= this.OuterReaches){
                output += "Ice World";
                Climate = 11;
            } else {
                output += "Burning World";
                Climate = 0;
            }
            Habitability = -7;
        } else {
            //roll for a random Climate
            Climate = randomInteger(10);
            //adjust the roll for the solar region
            if(this.region + this.RegionShift <= this.InnerCauldron){Climate -= 6;}
            if(this.region + this.RegionShift >= this.OuterReaches){Climate += 6;}   
            
            if(Climate <= 0) {
                output += "Burning World";
                Habitability = -7;
            } else if(Climate >= 1 && Climate <= 3) {
                output += "Hot World";
                Habitability = -2;
            } else if(Climate >= 4 && Climate <= 7) {
                output += "Temperate World";
                Habitability = 0;
            } else if(Climate >= 8 && Climate <= 10) {
                output += "Cold World";
                Habitability = -2;
            } else {
                output += "Ice World";
                Habitability = -7;
            }
        }
        //close this bullet point
        output += "</li>";
        
        //Generate the Habitability of the Planet
        output += "<li><strong>Habitability</strong>: ";
        //roll for the habitability, adding in the bonus for Haven Systems
        Habitability += randomInteger(10)+this.HavenHabitability;
        if(Habitability <= 1){
            output += "Inhospitable";
        } else if(Habitability >= 2 && Habitability <= 3 ) {
            output += "Trapped Water";
        } else if(Habitability >= 4 && Habitability <= 5 ) {
            output += "Liquid Water";
        } else if(Habitability >= 6 && Habitability <= 7 ) {
            output += "Limited Ecosystem";
        } else {
            output += "Verdant";
        }
        //end bullet point
        output += "</li>";
        
        //generate discernable landmasses, if there is water, it is more likely to have distinct landmasses
        //there is a small chance that there won't be any landmasses, thus a planet submerged in water
        if((Habitability <= 3 && randomInteger(10) >= 8)||(Habitability >= 4 && randomInteger(10) >= 4)){
            i = randomInteger(Size)+randomInteger(Size) - 2;
        }else {
            i = 1
        }
        output += "<li><strong>Landmasses</strong>: " + i.toString() + "</li>";
        
        //generate the Inhabitants of the Planet
        output += "<li><strong>Inhabitants</strong>: ";
        //the likelihood of sentient inhabitants has a 3x increase if the world is habitable
        //the likelihood of sentient inhabitants has a 3x increase if the system is owned by a void faring civilization, it will be one of the preset civilizations and it will be a civilization capable of surviving on an inhabitable world
        if(this.VoidInhabitants.length > 0 && ((Habitability >= 6 && randomInteger(10) >= 2) || (Habitability < 6 && randomInteger(10) == 8))){
            output += this.RandomRace(false,this.VoidInhabitants[randomInteger(this.VoidInhabitants.length)-1]);    
        } else if(Habitability >= 6 && randomInteger(10) >= 8) {
            output += this.RandomRace(true);
        } else if(Habitability < 6 && randomInteger(10) == 10) {
            output += this.RandomRace(false);
        } else {
            output += "-";
        }
        output += "</li>"
        
        //generate planetary mineral resources
        //the amount of resources depends on the size of the planet
        if(Size <= 4) {
            i = randomInteger(5)-2;
        } else if(Size <= 8){
            i = randomInteger(5);
        } else {
            i = randomInteger(10);
        }
        //increase the amount of distinct resources by the any System Feature Bonuses
        i += this.PlanetBounty;
        //add the random Minerals
        while(i > 0){
            output += "<li>" + this.RandomMineral() + "</li>";
            i--;
        }
        
        //generate the additional resources of the planet
        //the amount is dependant on the size of the planet
        if(Size <= 4) {
            i = randomInteger(5)-3;
        } else if(Size <= 8){
            i = randomInteger(5)-2;
        } else {
            i = randomInteger(5)-1;
        }
        while(i > 0){
            output += "<li>";
           //determine the category of this additional resources                
            switch(randomInteger(10)){
                case 5: case 6:
                output += this.RandomRuin(randomInteger(100),"Human"); //Archeotech
                break;
                case 7: case 8: 
                output += this.RandomRuin();
                break;
                case 9: case 10:
                //only rather habitable planets should house organic resources
                if(Habitability >= 6){
                    output += this.RandomOrganic();
                    break;
                }
                default:
                output += this.RandomMineral();
                break;
            }
            i--;
            output += "</li>";
        }
        
        //generate mandatory exotic bounties
        for(var i = 0; i < this.PlanetExoticBounty; i++){
            output += "<li>" + this.RandomMineral(randomInteger(100),"Exotic " + getLink("Minerals"))+ "</li>";
        }
        
        //generate mandatory extra ruins
        //for each result of Empire
        for(var i = 0; i < this.EmpireRuins; i++){
            //add D3-1 ruins to this planet
            for(k = randomInteger(3)-1; k > 0; k--){
                //add a random ruin from the available presets
                output += "<li>" + this.RandomRuin(randomInteger(100),this.EmpireInhabitants[randomInteger(this.EmpireInhabitants.length)-1]) + "</li>";
            }
        }
        
        //generate the noteworthy areas of the planet, defined as territories
        i = randomInteger(5);
        //modify the number of notable territories, based on the habitability of the planet
        if(Habitability < 6) { 
            i -= 4;
        } else if(Habitability >= 8) {
            i += 2;
        }
        
        //modify the number of territories, based on the size of the planet
        if(Size <= 4) { //small worlds
            i += -2;
        } else if(Size >= 9) { //vast worlds
            i += 3;
        }
        
        //generate at least one territory
        do{
            //label the territory
            var locationLabel = this.Sector + "-" + this.SystemNumber.toString() + "-" + this.PlanetNumber.toString(); 
            //add the Moon label if it is a moon
            if(Moon){locationLabel += "-" + this.MoonNumber.toString();}
            //add the Territory Number and move it up one
            locationLabel += "-" + TerritoryNumber.toString();
            output += "<li><strong>Territory " + locationLabel + "</strong>: ";
            TerritoryNumber++;
            
            //the types of territories available are dependant on the habitability of the planet
            if(Habitability < 4){
                Die = randomInteger(2);
            } else if(Habitability < 6) {
                Die = randomInteger(3);
            } else  {
                Die = randomInteger(5);
            }
            //save the details of the territory now and construct it afterwards
            var Territory = {}
            //get a list of traits ready
            Territory.Traits = [];
            //get a list of features ready            
            Territory.Landmarks = [];
            //has this territory been reduced to a wasteland?
            if(randomInteger(10) >= this.Wasteland){
                //autoset the territory type to wasteland
                Die = 1;
            }
            //does this territory have extra creatures?
            if(this.ExtraCreatures && randomInteger(2) == 1){
                Territory.Traits.push("Notable Species");
            }
            //determine the territory type with the Die roll
            switch(Die){
                case 1: 
                Territory.Type = "Wasteland";
                //output += "Wasteland</li><ul>";
                //die will be recycled as a counter for the number of traits on this territory
                Die = 1;
                while(Die > 0){
                    switch(randomInteger(20)){
                        case 1: case 2: case 3: case 4: //Desolate
                        Territory.Traits.push("Desolate");
                        //output += "<li>Desolate</li>";
                        break;
                        case 5: case 6: case 7: case 8: //Expansive
                        Territory.Traits.push("Expansive");
                        //output += "<li>Expansive</li>";
                        break;
                        case 9: case 10: case 11: case 12: case 13: case 14: //Extreme Temperature
                        Territory.Traits.push("Extreme Temperature");
                        //output += "<li>Extreme Temperature</li>";
                        break;
                        case 15: //Notable Species
                        Territory.Traits.push("Notable Species");
                        //output += "<li>Notable Species - " + this.RandomCreature("wasteland ") + "</li>";
                        break;
                        case 16: //Ruined
                        Territory.Traits.push("Ruined");
                        //output += "<li>Ruined</li>";
                        break;
                        case 17: case 18: case 19: //Unusual Location
                        Territory.Traits.push("Unusual Location");
                        //output += "<li>Unusual Location</li>";
                        break;
                        case 20:
                        Die += 2; //This territory has multiple traits. Roll again for this trait and again for the new trait.
                        break;
                    }
                    Die--;
                }
                break;
                case 2:
                Territory.Type = "Mountains";
                //output += "Mountains</li><ul>";
                //die will be recycled as a counter for the number of traits on this territory
                Die = 1;
                while(Die > 0){
                    switch(randomInteger(20)){
                        case 1: case 2: case 3: case 4: case 5: //Boundary
                        Territory.Traits.push("Boundary");
                        //output += "<li>Boundary</li>";
                        break;
                        case 6: case 7: case 8: case 9: case 10://Expansive
                        Territory.Traits.push("Expansive");
                        //output += "<li>Expansive</li>";
                        break;
                        case 11: case 12: case 13:  //Extreme Temperature
                        Territory.Traits.push("Extreme Temperature");
                        //output += "<li>Extreme Temperature</li>";
                        break;
                        case 14: case 15: //Foothills
                        Territory.Traits.push("Foothills");
                        //output += "<li>Foothills</li>";
                        break;
                        case 16: case 17://Notable Species
                        Territory.Traits.push("Notable Species");
                        //output += "<li>Notable Species - " + this.RandomCreature() + "</li>";
                        break;
                        case 18: case 19: //Unusual Location
                        Territory.Traits.push("Unusual Location");
                        //output += "<li>Unusual Location</li>";
                        break;
                        case 20:
                        Die += 2; //This territory has multiple traits. Roll again for this trait and again for the new trait.
                        break;
                    }
                    Die--;
                }
                break;
                case 3: 
                Territory.Type = "Swamp";
                //output += "Swamp</li><ul>";
                //die will be recycled as a counter for the number of traits on this territory
                Die = 1;
                while(Die > 0){
                    switch(randomInteger(20)){
                        case 1: case 2: //Expansive
                        Territory.Traits.push("Expansive");
                        //output += "<li>Expansive</li>";
                        break;
                        case 3: case 4: case 5: case 6: //Extreme Temperature
                        Territory.Traits.push("Extreme Temperature");
                        //output += "<li>Extreme Temperature</li>";
                        break;
                        case 7: case 8: case 9:  //Notable Species
                        Territory.Traits.push("Notable Species");
                        //output += "<li>Notable Species - " + this.RandomCreature() + "</li>";
                        break;
                        case 10: case 11: case 12: case 13: //Stagnant
                        Territory.Traits.push("Stagnant");
                        //output += "<li>Stagnant</li>";
                        break;
                        case 14: case 15://Unusual Location
                        Territory.Traits.push("Unusual Location");
                        //output += "<li>Unusual Location</li>";
                        break;
                        case 16: case 17: case 18: case 19: //Virulent
                        Territory.Traits.push("Virulent");
                        //output += "<li>Virulent</li>";
                        break;
                        case 20:
                        Die += 2; //This territory has multiple traits. Roll again for this trait and again for the new trait.
                        break;
                    }
                    Die--;
                }
                break;
                case 4: 
                Territory.Type = "Plains";
                //output += "Plains</li><ul>";
                //die will be recycled as a counter for the number of traits on this territory
                Die = 1;
                while(Die > 0){
                    switch(randomInteger(20)){
                        case 1: case 2: //Broken Ground
                        Territory.Traits.push("Broken Ground");
                        //output += "<li>Broken Ground</li>";
                        break;
                        case 3: case 4: case 5: case 6: 
                        Territory.Traits.push("Expansive");
                        //output += "<li>Expansive</li>";
                        break;
                        case 7: case 8: case 9:  //Extreme Temperature
                        Territory.Traits.push("Extreme Temperature");
                        //output += "<li>Extreme Temperature</li>";
                        break;
                        case 10: case 11: case 12: case 13: case 14: //Fertile
                        Territory.Traits.push("Fertile");
                        //output += "<li>Fertile</li>";
                        break;
                        case 15: case 16: case 17://Notable Species
                        Territory.Traits.push("Notable Species");
                        //output += "<li>Notable Species - " + this.RandomCreature() + "</li>";
                        break;
                        case 18: case 19: //Unusual Location
                        Territory.Traits.push("Plains");
                        //output += "<li>Unusual Location</li>";
                        break;
                        case 20:
                        Die += 2; //This territory has multiple traits. Roll again for this trait and again for the new trait.
                        break;
                    }
                    Die--;
                }
                break;
                case 5:
                Territory.Type = "Forest";
                //output += "Forest</li><ul>";
                //die will be recycled as a counter for the number of traits on this territory
                Die = 1;
                while(Die > 0){
                    switch(randomInteger(20)){
                        case 1:
                        Territory.Traits.push("Exotic Nature");
                        //output += "<li>Exotic Nature</li>";
                        break;
                        case 2: case 3: case 4: case 5: //Expansive
                        Territory.Traits.push("Expansive");
                        //output += "<li>Expansive</li>";
                        break;
                        case 6: case 7: case 8:  //Extreme Temperature
                        Territory.Traits.push("Extreme Temperature");
                        //output += "<li>Extreme Temperature</li>";
                        break;
                        case 9: case 10: case 11: case 12: case 13: //Notable Species
                        Territory.Traits.push("Notable Species");
                        //output += "<li>Notable Species - " + this.RandomCreature() + "</li>";
                        break;
                        case 14: case 15: case 16: //Unique Compound
                        Territory.Traits.push("Unique Compound - " + this.RandomOrganic());
                        //output += "<li>Unique Compound - " + this.RandomOrganic() + "</li>"
                        break;
                        case 17: case 18: case 19: //Unusual Location
                        Territory.Traits.push("Unusual Location");
                        //output += "<li>Unusual Location</li>";
                        break;
                        case 20:
                        Die += 2; //This territory has multiple traits. Roll again for this trait and again for the new trait.
                        break;
                    }
                    Die--;
                }
                break;
            }
            
            //add landmarks to this territory
            Die = randomInteger(5);
            //modify the number of landmarks by the Size of the planet
            //modify the number of territories, based on the size of the planet
            if(Size >= 5) { //large worlds
                Die += 2;
            } else if(Size >= 9) { //vast worlds
                Die += 3;
            }
            //add the landmarks
            while(Die > 0){
                //roll for a random landmark
                switch(randomInteger(20)){
                    case 1: case 2: case 3: case 4:
                        Territory.Landmarks.push("Canyon");
                        //output += "<li>Canyon</li>";
                    break;
                    case 5: case 6: case 7:
                        Territory.Landmarks.push("Cave Network");
                        //output += "<li>Cave Network</li>";
                    break;
                    case 8: case 9:
                        Territory.Landmarks.push("Crater");
                        //output += "<li>Crater</li>";
                    break;
                    case 10: case 11: case 12: case 13:
                        Territory.Landmarks.push("Mountain");
                        //output += "<li>Mountain</li>";
                    break;
                    case 14: case 15:
                        Territory.Landmarks.push("Volcano");
                        //output += "<li>Volcano</li>";
                    break;
                    case 16:
                    if(Habitability >= 2 && Climate >= 4) {
                        Territory.Landmarks.push("Glacier");
                        //output += "<li>Glacier</li>";
                    }else {
                        Die++;
                    }
                    break;
                    case 17:
                    if(Atmosphere >= 2) {
                        Territory.Landmarks.push("Perpetual Storm");
                        //output += "<li>Perpetial Storm</li>";
                    }else {
                        Die++;
                    }
                    break;
                    case 18:
                    if(Habitability >= 4) {
                        Territory.Landmarks.push("Inland Sea");
                        //output += "<li>Inland Sea</li>";
                    } else {
                        Die++;
                    }
                    break;
                    case 19:
                    if(Habitability >= 4) {
                        Territory.Landmarks.push("Reef");
                        //output += "<li>Reef</li>";
                    } else {
                        Die++;
                    }
                    break;
                    case 20:
                    if(Habitability >= 4) {
                        Territory.Landmarks.push("Whirlpool");
                        //output += "<li>Whirlpool</li>";
                    } else {
                        Die++;
                    }
                    break;
                }
                Die--;
            }
            //construct and output the territory
            //type
            output += Territory.Type + "</li><ul>";
            //traits
            for(territoryIndex = 0; territoryIndex < Territory.Traits.length; territoryIndex++){
                if(Territory.Traits[territoryIndex] != "Notable Species"){
                    output += "<li>" + Territory.Traits[territoryIndex] + "</li>";
                } else {
                    //this is the point of the territory object
                    //I want to take into account all the landmarks, traits, territory type, and habitability
                    //start by generating a list of possible environment adaptations
                    //every habitable planet can always support a deathworld species
                    var possibleAdaptations = ["deathworld"];
                    //what is the temperature of the planet?
                    if(Climate <= 3){
                        //the planet is exceptionally hot
                        possibleAdaptations.push("volcanic");
                    } else if (Climate >= 8){
                        //the planet is exceptionally cold
                        possibleAdaptations.push("ice");
                    } else {
                        //the planet's temperature is juuuust right
                        possibleAdaptations.push("temperate");
                    }
                    //what is the territory type?
                    if(Territory.Type == "Forest"){
                        possibleAdaptations.push("jungle");
                    } else if(Territory.Type == "Wasteland"){
                        possibleAdaptations.push("desert");
                    } else if(Territory.Type == "Swamp"){
                        possibleAdaptations.push("ocean");
                    }
                    //search through the traits
                    for(traitIndex = 0; traitIndex < Territory.Traits.length; traitIndex++){
                        if(Territory.Traits[traitIndex] == "Extreme Temperature"){
                            //what is the temperature of the planet?
                            if(Climate <= 3){
                                //the planet is already hot, but this location is even hotter 
                                possibleAdaptations.push("volcanic");
                            } else if (Climate >= 8){
                                //the planet is already cold, but this location is even colder
                                possibleAdaptations.push("ice");
                            } else if(randomInteger(2) == 1){
                                //this specific location is reasonably cold
                                possibleAdaptations.push("ice");
                            } else {
                                //this specific location is reasonably cold
                                possibleAdaptations.push("volcanic");
                            }
                        } else if(Territory.Traits[traitIndex] == "Unusual Location"){
                            possibleAdaptations.push("exotic");
                        }
                    }
                    //landmarks
                    for(landmarkIndex = 0; landmarkIndex < Territory.Landmarks.length; landmarkIndex++){
                        switch(Territory.Landmarks[landmarkIndex]){
                            case "Inland Sea": 
                            case "Reef":
                            case "Whirlpool":
                                possibleAdaptations.push("ocean");
                            break;
                            case "Volcano":
                                possibleAdaptations.push("volcanic");
                            break;
                            case "Glacier":
                                possibleAdaptations.push("ice");
                            break;
                        }
                    }
                    //is this world even habitable?
                    if(Habitability <= 1){
                        //only exotic creatures can exist here
                        possibleAdaptations = ["exotic"];
                    } else if(possibleAdaptations.length == 0){
                        possibleAdaptations[0] = "";
                    } else {
                        //select a random adaptation
                        possibleAdaptations[0] = possibleAdaptations[randomInteger(possibleAdaptations.length)-1];
                    }
                    log(possibleAdaptations)
                    //does this adaptation support a large number of plants?
                    //if it does, 1/2 chance to be a plant  
                    if(possibleAdaptations[0] == "volcanic" 
                    || possibleAdaptations[0] == "ice"
                    || possibleAdaptations[0] == "desert"
                    || randomInteger(2) == 1){
                        //create a fauna xenos
                        output += "<li>Notable Species - " + this.RandomCreature("fauna " + possibleAdaptations[0],locationLabel) + "</li>";
                    } else {
                        //create a flora xenos
                        output += "<li>Notable Species - " + this.RandomCreature("flora " + possibleAdaptations[0],locationLabel) + "</li>";
                    }
                }
            }
            //landmarks
            output += "<li><strong>Landmarks</strong></li><ul>"
            for(territoryIndex = 0; territoryIndex < Territory.Landmarks.length; territoryIndex++){
                output += "<li>" + Territory.Landmarks[territoryIndex] + "</li>";
            }
            //each territory has a chance for an adventure
            if(randomInteger(10) == 1) {
                output += this.RandomAdventure();
            }
            //close up the bullet point group for the territory
            output += "</ul></ul>";
            
            i--;
        }while(i > 0);
        
        //reset object variables
        this.ResourceBonus = 0;  //this is a bonus to any rolls for resource abundance
        this.ResourceCap = 500;
        this.ResourceReductions = 0; //reduce this many resources of a planet based on colony type
        this.ReductionDice = 0; //reduce the resources by this many D10s
        this.ReductionBase = 0; //reduce the resources by this flat amount
        this.ReductionTypes = ""; //only the resources in this list will be reduced
        this.Wasteland = 11;  //what is the chance that the location will be a wasteland?
        this.ExtraCreatures = false; //does this planet have extra creatures?
        
        //Moons cannot generate orbital features, otherwise things could get crazy
        if(!Moon){
            //be sure at least one orbital feature will have a chance at being generated
            //generate Orbital Features for the Planet
            do {
                //generate a random oribital feature, influenced by the gravity of the planet
                i = randomInteger(100);
                if(i >= 46 && i <= 60) {
                    output += "<li><strong>Large Asteroid</strong></li>";
                } else if(i >= 61 && i <= 90) {
                    output += "<li><strong>Lesser Moon</strong>: " + this.Sector + "-" + this.SystemNumber + "-" + this.PlanetNumber + "-" + this.MoonNumber + "</li>";
                    this.MoonNumber++; //another moon has been added to this body
                    i = randomInteger(100)-10;
                    if(randomInteger(2) == 2 && i > 0){
                        output += "<ul><li>" + this.RandomMineral(i) + "</li></ul>";
                    }
                    //each mini moon has a chance to house a lovely lovely adventure, but it is tiny
                    if(randomInteger(100) == 1) {
                        output += this.RandomAdventure();
                    }
                } else if(i >= 86) { 
                    output += "<li><strong>Moon</strong>: "  + this.Sector + "-" + this.SystemNumber + "-" + this.PlanetNumber + "-" + this.MoonNumber + "</li>";
                    if(this.Sector == "S"){Size = 10;} //larger objects orbitting smaller objects is one of the tammer happenings in the Screaming Vortex
                    output += this.RandomPlanet("Moon",Size);
                }
                this.OrbitalFeatures--;
            } while(this.OrbitalFeatures > 0);
        }
        
        //close bullet point group
        output += "</ul>";
        
        //do not increase the Planet Counter if this is a Moon
        //do not increase the Moon Number if this is a Planet
        if(!Moon){this.PlanetNumber++;}else{this.MoonNumber++;}
        
        //deliver the summary of the planet
        return output;
    }
    
    //Generates a list of warp connections for the system
    this.WriteWarpRoutes = function(connections){
        //create an output variable
        var textOutput = "";
        //start off with any connections to other systems
        //but only do so if there are connections to work with
        if(connections){
            //divide the list of connections into discrete pieces
            var TravelTime = []; //how long does it normally take to travel this route?
            var RouteStability = []; //what is the stability of the route?
            var DestinationID = []; //what is the ID of the token this system connects to?
            
            var piece = "";
            var pieces = [];
            //dismantle the input piece by piece
            for(var i = 0; i < connections.length; i++){
                //break up the connection input by spaces and parens
                if(connections[i] == ' ' || connections[i] == '(' || connections[i] == ')' || connections[i] == "<" || connections[i] == ">"){
                    //be sure we have something worth saving
                    if(piece != "" && piece != "-" && piece != "br"){
                        //save this piece
                        pieces.push(piece);
                    }
                    //reset the piece
                    piece = "";
                } else {
                    //otherwise we must have something worth saving
                    piece += connections[i];
                }
            }
            //save any leftover pieces
            //be sure we have something worth saving
            if(piece != "" && piece != "-" && piece != "br"){
                //save this piece
                pieces.push(piece);
            }
            //convert the pieces into into text
            textOutput += "Warp Routes<br><ul>";
            //step through the pieces we have collected
            for(var i = 0; i < pieces.length; i += 3){
                //be sure we have all three pieces to work with
                if(pieces[i+2]){
                    //start this bullet point
                    textOutput += "<li>";
                    //does the connected token represent anything?
                    var connectedGraphic = getObj('graphic',pieces[i+2]);
                    //was this graphic found and does it represent anything?
                    if(connectedGraphic && connectedGraphic.get("represents")){
                        textOutput += "<u><a href=\"http://journal.roll20.net/character/" + connectedGraphic.get("represents") + "\">" + connectedGraphic.get("name") +  "</a></u>"; 
                    } else {
                        textOutput += "?????";
                    }
                    //add the number of days this journey should take
                    textOutput += " - " + pieces[i+1] + " days";
                    //add the stability of the route
                    textOutput += " (" + pieces[i] + ")";
                    //close off this bullet point
                    textOutput += "</li>";
                }
            }
            //close off this bullet point section
            textOutput += "</ul>";
        }
        
        return textOutput;
    }
    
    //Generates the System with Planets, Territories, and Xenos. Saves it into a handout.
    this.Generate = function(input,connections){
      //default the connections input to blank
      if(connections == undefined){
          connections = "";
      }
      //create an object to output at the end of this function
      var output = {};
      //Reset these global variables
      this.Sector = "K";    //this identifies the sector the System is in
      this.SystemNumber = 1; //the system numeral, for identification purposes
      this.PlanetNumber = 1; //the planet numeral, for identification purposes
      this.MoonNumber = 1;
      //figure out which Sector this new System belongs in
      if(input.length > 11){
        this.Sector = input[11];
        this.Sector = this.Sector.toUpperCase();
        switch(this.Sector){
            case "J": //Jericho Reach ~ Replace Haven with Bountiful
            case "H": //Hadex Anomaly ~ As Jericho Reach + Replace Warp Statis with Warp Turbulence
            case "O": //Outer Reaches ~ As Jericho Reach + Replace Starefarers with Bountiful + Habitability -= 1
            case "C": //Calaxis Sector ~ Do not add any system features
            case "S": //Screaming Vortex ~ Abolish logical rules, let it get out of hand. Replace Warp Stasis with Warp Turbulence
            break;
            default: this.Sector = "K"; //Kronos Expanse ~ Increase System Features by 2
        }
      }
      
      //keep searching for New World i until you don't find it 
      
      var UniqueName = 'System ' + this.Sector + "-" + this.SystemNumber.toString();
      var OldSystems = findObjs({ type: 'character', name: UniqueName });      
      while(OldSystems.length > 0){
          this.SystemNumber++;
          UniqueName = 'System ' + this.Sector + "-" + this.SystemNumber.toString();
          OldSystems = findObjs({ type: 'character', name: UniqueName });
      }
      
    //create the handout with the unique name  
      var NewSystem = createObj("character", {
        name:  UniqueName
      });
      
    //save the character sheet id
    output.id = NewSystem.id;
    output.SystemName = UniqueName;
    //System Generation Variables
    //set up the Notes and GMNotes for the handout
    var Notes = "";
    var GMNotes = "";
    
    //general storage for numbers, both counters and random Ints
    var Die = 1;
    var i = 0; 
    var j = 0;
    
    //System Features
    var FeaturesTotal = 0; //# of Features in the system.
    var AsteroidBounty = 0; //Due to bounty, Asteroids could receive additional resources
    var PlanetMinimum = 0; // the minimum number of planets in this system
    
    //System Elements
    var AsteroidBelts = [0,0,0];    //determines the population of this element in each Solar Zone
    var AsteroidClusters = [0,0,0]; //determines the population of this element in each Solar Zone
    var DerelictStations = [0,0,0]; //determines the population of this element in each Solar Zone
    var DustClouds = [0,0,0];       //determines the population of this element in each Solar Zone
    var GasGiants = [0,0,0];        //determines the population of this element in each Solar Zone
    var GravityRiptides = [0,0,0];  //determines the population of this element in each Solar Zone
    var Planets = [0,0,0];          //determines the population of this element in each Solar Zone
    var RadiationBursts = [0,0,0];  //determines the population of this element in each Solar Zone
    var SolarFlares = [0,0,0];      //determines the population of this element in each Solar Zone
    var StarshipGraveyards = [0,0,0];//determines the population of this element in each Solar Zone
    var ResourceType;               //storage variable for the type of Resource that will be present in the element
    
    //Star Creation
    var StarsTotal = 1;         //# of Stars in the system
    var Elements = [0,0,0];     //determines the bonus number of system elements in this region. Can be negative.
    
    //Gas Giant Creation
    var Gravity = 0;  //determines the gravity of the planet
    
    ///write any warp routes down if they exist
    GMNotes += this.WriteWarpRoutes(connections);
    
    //=====System Features=====
    //The Calaxis Sector has 0 features as the remaining worlds as rather unnotable
    if(this.Sector == "C"){
        FeaturesTotal = 0;
    } else {
        GMNotes += "System Features<br><ul>";
        FeaturesTotal += randomInteger(5);
        //the Kronos Expanse has D5 features, all others have D5-2
        if(this.Sector != "K"){
            FeaturesTotal -= 2;
            if(FeaturesTotal < 1){FeaturesTotal = 1;}
        }
    }
    //The Outer Reaches are a hauntingly dead region of space - reduce the Habitability of all planets by 1
    if(this.Sector == "O"){this.HavenHabitability--;}
    //The Screaming Vortex is a nightmarish fantsay where the inanimate wakes into imagination
    if(this.Sector == "S"){this.HavenHabitability += 10;}
    //add the System Features to the GMNotes
    while(FeaturesTotal > 0){
        //start this bullet point
        GMNotes += "<li>";
        //add a random system feature to the system
        FeaturesTotal--;
        //roll for a random System Feature
        i = randomInteger(10);
        
        //Handles all the Sector specific exceptions
        //Replace Pirate Den with a biased reroll in the Outer Reaches (few Pirates have survived the creeping ruin of the Tyranids and Necrons)
        if(i == 5 && this.Sector == "O"){i = randomInteger(5);}
        //Replace Haven with Bounty in the Outer Reaches, Jericho Reach, and Hadex Anomely
        if(i == 3 && (this.Sector == "O" || this.Sector == "J" || this.Sector == "H")){i = 1;}
        //replace Warp Turbulence with a chance for Warp Stasis in the Outer Reaches
        if(i == 10 && this.Sector == "O"){i = 8 + randomInteger(2);}
        //replace Warp Stasis with a chance for Warp Turbulence in the Screaming Vortex and Hadex Anomely
        if(i == 9 && (this.Sector == "H" || this.Sector == "S")){i = 8 + randomInteger(2);}
        
        //based on what was rolled and editted, add a System Element
        switch(i) {
            case 1: GMNotes += "<strong>Bountiful</strong>: ";
            switch(randomInteger(4)){
                case 1: GMNotes += "Add one Asteroid Belt or Asteroid Cluster to any one Solar Zone."; 
                    if(randomInteger(2) == 1){AsteroidBelts[randomInteger(3)-1]++;}else{AsteroidClusters[randomInteger(3)-1]++;}
                break;
                case 2: GMNotes += "Roll an additional time on Table 1-20 Mineral Resources for each Asteroid Belt and Cluster."; 
                    AsteroidBounty++;
                break;
                case 3: GMNotes += "Roll one additional time on Table 1-20 Minderal Resources when generating Planets in this System";
                    this.PlanetBounty++;
                break;
                case 4: GMNotes += "Add one Exotic Resource to the Mineral Resources on each Planet";
                    this.PlanetExoticBounty++;
                break;
            } break;
            case 2: GMNotes += "<strong>Gravity Tides</strong>: ";
            switch(randomInteger(3)){
                case 1: GMNotes += "Add D5 " + getLink("Gravity Tides") +  " to random Solar Zones."; 
                    i = randomInteger(5);
                    while(i > 0){GravityRiptides[randomInteger(3)-1]++; i--;}                
                break;                    
                case 2: GMNotes += "The gravity wells surrounding Planets in this System churn like whirlpools, battering orbiting vessels with their fluctuations. Safely entering orbit with a voidship requires a Difficult (–10) " + getLink("Pilot") + "(Space Craft) Test, causing the loss of 1 point of Hull Integrity for every two Degrees of Failure. Small craft can enter and exit the gravity well only after the pilot passes a Very Hard (–30)" + getLink("Pilot") + "(Flyers) Test. Every full day spent in orbit requires an additional " + getLink("Pilot") + " Test"; break;
                case 3: GMNotes += "Travel between Planets within this System takes half the usual time."; break;
            } break;
            case 3: GMNotes += "<strong>Haven</strong>: "; 
            switch(randomInteger(3)){
                case 1: GMNotes += "Add one Planet to each Solar Zone."; 
                Planets[this.InnerCauldron]++; Planets[this.PrimaryBiosphere]++; Planets[this.OuterReaches]++;
                break;
                case 2: GMNotes += "Planets within the System’s Primary Biosphere receive +1 to the result of the roll on Table 1–9: Atmospheric Presence and +2 to the result of the roll on Table 1–10: Atmospheric Composition (see page 21).";
                    this.BiosphereAtmosphere++;
                break;
                case 3: GMNotes += "Planets in this System add +2 to the result of any roll they make on Table 1–12: Habitability (see page 23)."; 
                    this.HavenHabitability += 2;
                break;
            } break;
            case 4: GMNotes += "<strong>Ill-Omened</strong>: "; 
            switch(randomInteger(7)){
                case 1: GMNotes += "Any ship entering the System for the first time loses 1d5 Morale, unless one of the Explorers passes a Challenging (+0) [Charm] or [Intimidate] Test. If the nature and reputation of the System was known to the crew ahead of time, the Test difficulty and Morale loss for failure might be higher at the GM’s discretion."; break;
                case 2: GMNotes += "All Morale loss suffered within this System is increased by 1, as the crew attribute whatever misfortune they suffer to the malevolent will of their surroundings. This does not apply to Morale lost for entering a System the first time (even the most fearful voidsman’s imagination can only concoct so many horrors!)."; break;
                case 3: GMNotes += "Any " + getLink("Fear") +  " Tests made within the System are made at an additional –10 penalty."; break;
                case 4: GMNotes += "When spending a " + getLink("Fate Point") +  " within this System, roll 1d10. On a 9, it has no effect. If it was spent to alter a Test in some way, it counts as the only Fate Point that can be used for that Test as normal, even though it had no effect. Void Born Explorers recover " + getLink("Fate Point") +  "s lost in this manner (thanks to the result of 9) as normal."; break;
                case 5: GMNotes += "All Willpower Tests made within this System are made at a –10 penalty."; break;
                case 6: GMNotes += "Whenever an Explorer would gain " + getLink("Insanity") +  " Points while within this System, double the amount of Insanity Points he gains."; break;
                case 7: GMNotes += "Attempting to use Psychic Techniques from the Divination Discipline to gain information about the System or anything within it requires the user to pass a Difficult (–10) " + getLink("Fear") +  " Test before he can attempt the " + getLink("Focus Power Test") +  "."; break;
            } break;
            case 5: GMNotes += "<strong>Pirate Den</strong>: "; 
            i = randomInteger(5)+4;
            GMNotes += i.toString() + " " + this.RandomPirate() + " ships";
            if(randomInteger(10) > 4){GMNotes += " and one space station";}
            GMNotes += ".";
            break;
            case 6: GMNotes += "<strong>Ruined Empire</strong>: ";
            if(randomInteger(3) == 1){StarshipGraveyards[this.InnerCauldron]++;}
            if(randomInteger(3) == 1){StarshipGraveyards[this.PrimaryBiosphere]++;}
            if(randomInteger(3) == 1){StarshipGraveyards[this.OuterReaches]++;}
            if(randomInteger(3) == 1){DerelictStations[this.InnerCauldron]++;}
            if(randomInteger(3) == 1){DerelictStations[this.PrimaryBiosphere]++;}
            if(randomInteger(3) == 1){DerelictStations[this.OuterReaches]++;}                    
            this.EmpireRuins++;
            this.EmpireAbundance++;
            switch(randomInteger(2)){
                case 1: GMNotes += "Add a Xenos Ruins Resource to 1d4 of the Planets in this System. If there are not enough Planets in the System, make up the difference by adding the remaining ruins as Starship Graveyards or Derelict Stations to the System. Increase the Abundance of any Xenos Ruins by 1d10+5 (see page 31).";
                    this.EmpireInhabitants.push(this.RandomRuin("Name"));
                break;
                case 2: GMNotes += "Add an Archeotech Cache Resource to 1d4 of the Planets in this System. If there are not enough Planets in the System, make up the difference by adding the remaining ruins as Starship Graveyards or Derelict Stations to the System. Increase the Abundance of any Archeotech Caches by 1d10+5 (see page 28).";
                    this.EmpireInhabitants.push("Human");
                break;
            } break;
            case 7: GMNotes += "<strong>Starfarers</strong>: ";
            GMNotes += "If the System contains less than four Planets after all System Elements have been generated, the GM should add additional Planets until the Region contains at least four Planets. A common civilisation is spread across the System Features in this System. The liklihood of inhabitation increases to 2+ on habitable planets and 5+ on inhabitable planets. This might be either a non-Imperial human nation or a race of previously unknown, sentient xenos. During the Planet Creation process for this System, all Planets with a native civilisation are automatically inhabited by the appropriate species at a Development level of Voidfarers, Colony, or Orbital Habitation, as appropriate. At least one Planet has a native population at the Voidfarers Development level. Any Habitable Planet not populated by the Starfarers generates Inhabitants normally.";
                    PlanetMinimum += 4;
                    this.VoidInhabitants.push(this.RandomRace("Name"));
            break;
            case 8: GMNotes += "<strong>Stellar Anomaly</strong>: "; 
            switch(randomInteger(3)){
                case 1:
                GMNotes += "Reduce the number of Planets generated by 2, as the presence of a Stellar Anomaly tends to disrupt the formation of any bodies smaller than itself.";
                Planets[randomInteger(3)-1]--; 
                Planets[randomInteger(3)-1]--;
                break;
                case 2: GMNotes += getLink("Scholastic Lore") +  "(Astromancy) and " + getLink("Navigation") +  "(Stellar) Tests made to plot routes through the System, or to determine position within it, receive a +10 bonus."; break;
                case 3: GMNotes += "The massive forces exerted by a Stellar Anomaly sometimes seems to stabilise local Warp routes, though many dismiss this as voidsmen’s superstition and no record exists of any Navigator’s comment on the matter. Ships travelling through the System only need to roll for Warp Travel Encounters for every seven full days of travel (or once, for a trip of under seven days). However, the same forces make the necessity of occasional drops into realspace for course adjustment into an additional hazard. On any result of doubles when rolling for a Warp Travel encounter, the vessel runs afoul of a hazard in realspace instead of applying the normally generated result. The effects of such hazards can be extrapolated from similar System Elements, such as Gravity Riptides, Radiation Bursts, or Solar Flares."; break;
            } break;
            case 9: GMNotes += "<strong>Warp Stasis</strong>: "; 
            switch(randomInteger(4)){
                case 1: GMNotes += "Travel to and from the System is becalmed. Double the base travel time of any trip entering or leaving the area. The time required to send Astrotelepathic messages into or out of the System is likewise doubled. In addition, pushing a coherent message across its boundaries requires incredible focus; Astropaths suffer a –3 penalty to their Psy Rating for the purposes of sending Astrotelepathic messages from this System."; break;
                case 2: GMNotes += getLink("Focus Power Test") +  "s and " + getLink("Psyniscience") +  " Tests within the System are made at a –10 penalty."; break;
                case 3: GMNotes += "Psychic Techniques cannot be used at the Push level within the System."; break;
                case 4: GMNotes += "When rolling on Table 6–2: Psychic Phenomena (see page 160 of the ROGUE TRADER Core Rulebook) within this System, roll twice and use the lower result."; break;
            } break;
            case 10: GMNotes += "<strong>Warp Turbulence</strong>: "; 
            switch(randomInteger(5)){
                case 1: GMNotes += "Navigators suffer a –10 penalty to " + getLink("Navigation") +  "(Warp) Tests for Warp Jumps that begin or end in this System."; break;
                case 2: GMNotes += "Add +10 to all rolls for on Table 6–2: Psychic Phenomena (see page 160 of the ROGUE TRADER Core Rulebook) made within the System."; break;
                case 3: GMNotes += "Whenever an Explorer would gain " + getLink("Corruption") +  " Points within the System, increase the amount gained by 1."; break;
                case 4: GMNotes += "Add +1 to the Psy Rating of any Psychic Technique used at the Unfettered or Push levels."; break;
                case 5: GMNotes += "One of the Planets in the System is engulfed in a permanent Warp storm, rendering it inaccessible to all but the most dedicated (and insane) of travellers. " + getLink("Navigation") +  "(Warp) Tests made within this System suffer a –20 penalty due to the difficulty of plotting courses around this hazard."; break;
            } break;
            break;
        }
        //end this bullet point
        GMNotes += "</li>";
    }
    //close up the bullet point group
    GMNotes += "</ul>";
    
    
    //=====Star Creation=====
    GMNotes += "<br>Stars<br><ul>";
    Notes += "Stars<br><ul>";
    //record the size and type of stars in this system
    output.StarSizes = [];
    output.StarTypes = [];
    //add stars to the system. At setup, the number of stars was set to 1
    while(StarsTotal > 0){
        //we are making a star right now, knock it off the list of stars to make
        StarsTotal--;
        //roll to see the type of star ahead of time
        //roll = randomInteger(10);
        roll = randomInteger(10);
        //rolls of 9+ mean there's an extra star, we will calculate the star sizes later and seporately
        if(roll < 9){
            //what is the star size?
            GMNotes += "<li><strong>";
            Notes += "<li><strong>";
            switch(randomInteger(10)){
                case 1: case 2: case 3:
                    GMNotes += "Sub-";
                    Notes += "Sub-";
                    Elements[this.InnerCauldron] += randomInteger(3);
                    Elements[this.PrimaryBiosphere] += randomInteger(3);
                    Elements[this.OuterReaches] += randomInteger(3);
                    output.StarSizes.push(1);
                break;
                case 4: case 5: case 6: case 7:
                    Elements[this.InnerCauldron] += randomInteger(5);
                    Elements[this.PrimaryBiosphere] += randomInteger(5);
                    Elements[this.OuterReaches] += randomInteger(5);
                    output.StarSizes.push(2);
                break;
                case 8: case 9: case 10:
                    GMNotes += "Supra-";
                    Notes += "Supra-";
                    Elements[this.InnerCauldron] += randomInteger(10);
                    Elements[this.PrimaryBiosphere] += randomInteger(10);
                    Elements[this.OuterReaches] += randomInteger(10);
                    output.StarSizes.push(4);
                break;
            }
        }
        //what is the star type?
        switch(roll){
            case 1: 
                GMNotes += "Mighty</strong>: The fierce light of this star dominates its system utterly. Its coloration is likely to be blue or blue-white. The Inner Cauldron is dominant, and the Primary Biosphere is weak.</li>";
                Notes += "Mighty</strong>: The fierce light of this star dominates its system utterly. Its coloration is likely to be blue or blue-white.</li>";
                Elements[this.InnerCauldron] += randomInteger(3);
                Elements[this.PrimaryBiosphere] -= randomInteger(3);
                output.StarTypes.push("#00ffff");
                break;
            case 2: case 3: case 4:
                GMNotes += "Vigorous</strong>: A steady illumination burns forth from the heart of this star. Its coloration is likely to be a pure white.</li>";
                Notes += "Vigorous</strong>: A steady illumination burns forth from the heart of this star. Its coloration is likely to be a pure white.</li>";
                output.StarTypes.push("#ffffff");
                break;
            case 5: case 6: 
                GMNotes += "Luminous</strong>: Though it is has been long aeons since this star has shone at its brightest, a constant glow nonetheless provides for the system. It is likely to be yellow or yellow-orange in colour. The Inner Cauldron is weak.</li>";
                Notes += "Luminous</strong>: Though it is has been long aeons since this star has shone at its brightest, a constant glow nonetheless provides for the system. It is likely to be yellow or yellow-orange in colour.</li>";
                Elements[this.InnerCauldron] -= randomInteger(3);
                output.StarTypes.push("#ffff00");
                break;
            case 7: 
                GMNotes += "Dull</strong>: The end of the star’s life advances inexorably, although it can still burn for millennia yet. Many stars of this type are of a vast size, seemingly incongruous with their wan light. Its coloration is likely a sullen red. The Outer Reaches are Dominant.</li>";
                Notes += "Dull</strong>: The end of the star’s life advances inexorably, although it can still burn for millennia yet. Many stars of this type are of a vast size, seemingly incongruous with their wan light. Its coloration is likely a sullen red.</li>";
                Elements[this.OuterReaches] += randomInteger(3);
                output.StarTypes.push("#ff0000");
                break;
            case 8:
                GMNotes += "Anomalous</strong>: The star is an unnatural outlier, shedding a strange light that behaves in ways it should not. Its light can be of any colour, even one that is not typical for a star, from bilious green to barely-visible purple. The Game Master can choose to make one Solar Zone dominant or weak at his discretion.</li>";
                Notes += "Anomalous</strong>: The star is an unnatural outlier, shedding a strange light that behaves in ways it should not. Its light can be of any colour, even one that is not typical for a star, from bilious green to barely-visible purple.</li>";
                Elements[this.InnerCauldron] += (randomInteger(7)-4);
                Elements[this.PrimaryBiosphere] += (randomInteger(7)-4);
                Elements[this.OuterReaches] += (randomInteger(7)-4);
                output.StarTypes.push("#ff00ff");
                break;
            case 9: case 10:
                StarsTotal += 2; //the system is at least binary. Roll again for both this star and the new one.
                break;
        }
    }    
    //close a bullet point group
    GMNotes += "</ul>";
    Notes += "</ul>";
    
    //=====System Elements=====
    
    //be sure there is at least one chance to generate an element in each region
    if(Elements[this.InnerCauldron] < 1){Elements[this.InnerCauldron] = 1;}
    if(Elements[this.PrimaryBiosphere] < 1){Elements[this.PrimaryBiosphere] = 1;}
    if(Elements[this.OuterReaches] < 1){Elements[this.OuterReaches] = 1;}
    
    //generate Inner Cauldron Elements
    for(j = 0; j < Elements[this.InnerCauldron]; j++) {
        i = randomInteger(100);
        //if i < 20 then no element
        if(i >= 21 && i <= 29){
            AsteroidClusters[this.InnerCauldron]++;
        } else if(i >= 30 && i <= 41) {
            DustClouds[this.InnerCauldron]++;
        } else if(i >= 42 && i <= 45) {
            GasGiants[this.InnerCauldron]++;
        } else if(i >= 46 && i <= 56) {
            GravityRiptides[this.InnerCauldron]++;
        } else if(i >= 57 && i <= 76) {
            Planets[this.InnerCauldron]++;
        } else if(i >= 77 && i <= 88) {
            RadiationBursts[this.InnerCauldron]++;
        } else if(i >= 89) {
            SolarFlares[this.InnerCauldron]++;
        }
    }
    
    //generate Primary Biosphere Elements
    for(j = 0; j < Elements[this.PrimaryBiosphere]; j++) {
         i = randomInteger(100);
        //if i < 20 then no element
        if(i >= 21 && i <= 30){
            AsteroidBelts[this.PrimaryBiosphere]++;
        } else if(i >= 31 && i <= 41) {
            AsteroidClusters[this.PrimaryBiosphere]++;
        } else if(i >= 42 && i <= 47) {
            DerelictStations[this.PrimaryBiosphere]++;
        } else if(i >= 48 && i <= 58) {
            DustClouds[this.PrimaryBiosphere]++;
        } else if(i >= 59 && i <= 64) {
            GravityRiptides[this.PrimaryBiosphere]++;
        } else if(i >= 65 && i <= 93) {
            Planets[this.PrimaryBiosphere]++;
        } else if(i >= 94) {
            StarshipGraveyards[this.PrimaryBiosphere]++;
        }
    }
    
    //generate Outer Reaches Elements
    for(j = 0; j < Elements[this.OuterReaches]; j++) {
         i = randomInteger(100);
        //if i < 20 then no element
        if(i >= 21 && i <= 29){
            AsteroidBelts[this.OuterReaches]++;
        } else if(i >= 30 && i <= 40) {
            AsteroidClusters[this.OuterReaches]++;
        } else if(i >= 41 && i <= 46) {
            DerelictStations[this.OuterReaches]++;
        } else if(i >= 47 && i <= 55) {
            DustClouds[this.OuterReaches]++;
        } else if(i >= 56 && i <= 73) {
            GasGiants[this.OuterReaches]++;
        } else if(i >= 74 && i <= 80) {
            GravityRiptides[this.OuterReaches]++;
        } else if(i >= 81 && i <= 93) {
            Planets[this.OuterReaches]++;
        } else if(i >= 94) {
            StarshipGraveyards[this.OuterReaches]++;
        }
    }
    
    //be sure there are no negative planets
    for(var i = 0; i < 3; i++){
        if(Planets[i]<0){Planets[i] = 0;}
    }
    
    //be sure the number of planets meets the required minimum for starfarer's System Feature
    while(Planets[this.InnerCauldron]+Planets[this.PrimaryBiosphere]+Planets[this.OuterReaches] < PlanetMinimum){
        Planets[randomInteger(3)-1]++;
    }
    
    //detail the elements
    for(this.region = 0; this.region < 3; this.region++){
        //add the title for the region
        switch(this.region){ 
            case 0: 
                GMNotes += "<hr><strong>Inner Cauldron</strong><br><br>"; 
                Notes += "<strong>Inner Cauldron</strong><ul>"; 
            break;
            case 1: 
                GMNotes += "<hr><strong>Primary Biosphere</strong><br><br>";
                Notes += "<strong>Primary Biosphere</strong><ul>"; 
            break;
            case 2: 
                GMNotes += "<hr><strong>Outer Reaches</strong><br><br>";
                Notes += "<strong>Outer Reaches</strong><ul>"; 
            break;
        }
        
        //Add Asteroid Belts
        for(j = 0; j < AsteroidBelts[this.region]; j++){
            GMNotes += getLink("Asteroid Belt") + "<ul>";
            Notes += "<li>" + getLink("Asteroid Belt") + "</li>";
            //add a random number of minerals, including any System Feature Bonuses
            i = randomInteger(5) + AsteroidBounty;
            while(i > 0) {
                i--;
                GMNotes += "<li>" + this.RandomMineral() + "</li>";
                //each asteroid belt has a chance to house hidden wonder
                if(randomInteger(100) == 1) {
                    GMNotes += this.RandomAdventure();
                }
            }
            GMNotes += "</ul>";
        }
        
        //Add Asteroid Clusters
        for(j = 0; j < AsteroidClusters[this.region]; j++){
            GMNotes += getLink("Asteroid Cluster") + "<ul>";
            Notes += "<li>" + getLink("Asteroid Cluster") + "</li>";
            //add a random number of minerals, including any System Feature Bonuses
            i = randomInteger(5) + AsteroidBounty;
            while(i > 0) {
                i--;
                GMNotes += "<li>" + this.RandomMineral() + "</li>";
                //each asteroid cluster has a chance to house hidden wonder
                if(randomInteger(100) == 1) {
                    GMNotes += this.RandomAdventure();
                }
            }
            
            GMNotes += "</ul>";
        }
        
        //Add Derelict Stations
        for(j = 0; j < DerelictStations[this.region]; j++){
            GMNotes += "Derelict Station<ul><li>";
            Notes += "<li>Derelict Station</li>";
            //if there is a resident empire ruin, go with that ruin, otherwise, make it random
            if(this.EmpireInhabitants.length > 0){
                ResourceType = this.EmpireInhabitants[randomInteger(this.EmpireInhabitants.length)-1];
            } else {
                ResourceType = this.RandomRuin("Name");
            }
            GMNotes += "<strong>" + ResourceType + " station</strong>";
            /*
            //What kind of station is this and what type of resources does it contain?
            //if there is a ruined empire, i is a string that records the race
            //if there is no preset ruin, i is a random number
            //once a race has been selected, a random station type is often rolled for
            if(i === "Egarian" || (Number(i) >= 1 && Number(i) <= 10)) {
                ResourceType = "Egarian";
                GMNotes += "<strong>Egarian Void-maze</strong>: The station is a bafflfling construct of crystals with no readily apparent purpose or function, but built along similar geometrical principles as the dead cities of the Egarian Dominion.";
                
            } else if(i === "Eldar" || (Number(i) >= 11 && Number(i) <= 20)) {
                ResourceType = "Eldar";
                switch(randomInteger(3)){
                    case 1: GMNotes += "<strong>Eldar Gate</strong>: This vast Eldar contraption resembles nothing so much as the frame of an enormous door, but only the empty void shows through it. No amount of searching yields a sign of its purpose or function."; break;
                    default: GMNotes += "<strong>Eldar Orrery</strong>: The station is constructed of the smooth, bone-like material from which the Eldar make their ships, and is riddled with cloistered cells. Examination by a Navigator or psyker hints at a long-vanished power permeating the structure."; break;
                }
            } else if(i === "Ork" || (Number(i) >= 26 && Number(i) <= 40)) {
                ResourceType = "Ork";
                GMNotes += "<strong>Ork Rok</strong>: From the outside, this “station” appears to be nothing more than a lonely, out of the way asteroid. Despite its appearance, it has been thoroughly hollowed out, and fifilled with dubious Orky technology. Some of the technology might even have worked at one point.";
            } else if(i === "Human" || (Number(i) >= 41 && Number(i) <= 65)) {
                ResourceType = "Human";
                switch(randomInteger(5)){
                    case 1: case 2: GMNotes += "<strong>STC Defence Station</strong>: The core of the station is based off a standard pattern derived from Standard Template Construct technology, like countless others throughout the Imperium. What remains of the banks of weapon batteries and torpedo bays indicates that it was once intended to safeguard a human colony from attack."; break;
                    default: GMNotes += "<strong>STC Monitor Station</strong>: The core of the station is based off a standard pattern derived from Standard Template Construct technology, like countless others throughout the Imperium. Despite its age, the hull still bristles with auger arrays and reception panels that indicate its former use as a communications or intelligence hub."; break;
                }
            } else {
                ResourceType = "Unknown Xenos";
                switch(randomInteger(7)){
                    case 1: case 2: GMNotes += "<strong>Stryxis Collection</strong>: Calling this accumulation of wreckage and junk a space station would insult an Ork Mek, much less a shipwright of the Adeptus Mechanicus. The only explanation for its accretion comes from the vox-beacon broadcasting some kind of territorial claim by the Stryxis."; break;
                    case 3: case 4: GMNotes += "<strong>Xenos Defence Station</strong>: The architecture of the station does not match any examples yet encountered, but it is clearly inhuman in origin. Though the technology that comprises it is strange, there is no mistaking the intended purpose of its decaying armaments."; break;
                    default: GMNotes += "<strong>Xenos Monitor Station</strong>: The architecture of the station does not match any examples yet encountered, but it is clearly inhuman in origin. Its purpose is hard to ascertain for sure, but some of the arcane devices that line its hull resemble vox hubs and other necessities for a deep space monitor station."; break;
                }
            }
            */
            GMNotes += "</li>";
            
            //exactly how many resources does it contain?
            for(k = randomInteger(5)-1; k > 0; k--) {
                GMNotes += "<li>" + this.RandomRuin(randomInteger(100),ResourceType) + "</li>";
            }
            //each derelict station has a chance to house hidden perils
            if(randomInteger(10) == 1) {
                GMNotes += this.RandomAdventure();
            }
            GMNotes += "</ul>";
        }
        
        //Add Dust Clouds
        if(DustClouds[this.region] > 0) {
            GMNotes += getLink("Dust Cloud") + "(x" + DustClouds[this.region].toString() + ")<br><br>";
            Notes += "<li>" + getLink("Dust Cloud") + "(x" + DustClouds[this.region].toString() + ")</li>";
        }
        
        //Add Gravity Riptides
        if(GravityRiptides[this.region] > 0) {
            GMNotes += getLink("Gravity Riptide") + "(x" + GravityRiptides[this.region].toString() + ")<br><br>";
            //For right now I am not going to make Gravity Tides freely available to the player
            //Notes += "<li>" + getLink("Gravity Riptide") + "(x" + GravityRiptides[this.region].toString() + ")</li>";
        }
        
        //Add Radiation Bursts
        if(RadiationBursts[this.region] > 0) {
            GMNotes += getLink("Radiation Burst") + "(x" + RadiationBursts[this.region].toString() + ")<br><br>";
            //For right now I am not going to make Radiation Bursts freely available to the player
            //Notes += "<li>" + getLink("Radiation Burst") + "(x" + RadiationBursts[this.region].toString() + ")</li>";
        }
        
        //Add Solar Flares
        if(SolarFlares[this.region] > 0) {
            GMNotes += getLink("Solar Flare") + "(x" + SolarFlares[this.region].toString() + ")<br><br>";
            //For right now I am not going to make Solar Flares freely available to the player
            //Notes += "<li>" + getLink("Solar Flare") + "(x" + SolarFlares[this.region].toString() + ")</li>";
        }
        
        //Add Starship Graveyards
        for(j = 0; j < StarshipGraveyards[this.region]; j++){
            GMNotes += getLink("Starship Graveyard") + "<ul>";
            Notes += "<li>" + getLink("Starship Graveyard") + "</li>";
            ResourceType = [0,0];
            for(k = 0; k < ResourceType.length; k++){
                //if there is a preset empire, go with the ruined empire. Otherwise generate a random ship
                if(k < this.EmpireInhabitants.length)
                {
                    ResourceType[k] = this.EmpireInhabitants[randomInteger(this.EmpireInhabitants.length)-1];
                }else {
                    ResourceType[k] = this.RandomRuin("Name");
                }
            }
            //note what lead to this wasteland
            GMNotes += "<li>";
            switch(randomInteger(20)){
                case 1: case 2: case 3:
                    GMNotes += "<strong>Crushed Defence Force/Routed Invasion</strong>: The wreckage is all that remains of a defeated battlefleet. Whichever side of the long-ago conflict that fielded these vessels was decisively defeated, with most or all of the hulks belonging to the same force. The graveyard consists of " + (randomInteger(5) + randomInteger(5)) + " ships, of which most or all have been shattered beyond any value.";
                break;
                case 4:
                    GMNotes += "<strong>Fleet Engagement</strong>: A massive conflict once raged here, as evidenced by the abundance of battle-scarred hulls left behind by both sides. The graveyard consists of " + (randomInteger(10)+6) + " hulks, and can also include vast fields of unexploded mines, spent volleys of torpedoes, or the drifting wings of attack craft. Roughly half of the ships and materiel expended came from each side. The fury of the conflict consumed much of value, but the sturdy construction of warships means that at least a few of them might be worth salvaging.";
                break;
                case 5: case 6: case 7:
                    GMNotes += "<strong>Lost Explorers</strong>: These ships were not lost to enemy action, but to overextended supply vaults, or the failure of long suffering vital systems. The expedition is unlikely to include as many as even half a dozen ships, but few (if any) of them have deteriorated enough to prohibit salvage efforts.";
                break;
                case 8: case 9: case 10: case 11: case 12: case 13:
                    GMNotes += "<strong>Plundered Convoy</strong>: A lost shipping lane of some kind might have once crossed this system, as evidenced by this gutted procession of transports and cargo vessels. Their holds have been long since emptied, but it is possible their attackers might have missed something of value. There are " + (randomInteger(5)+2) + " ships in the convoy, of which most or all remain intact enough to allow boarding, but little else."
                break;
                case 14: case 15: case 16: case 17: case 18:
                    GMNotes += "<strong>Skirmish</strong>: Elements from two different battlefleets clashed here, with each leaving behind a handful of their complement. The graveyard consists of " + (randomInteger(5)+3) + " hulks. Roughly half of the ships came from each side. The fury of the conflict all ships involved, but the sturdy construction of warships means that at least a few of them might be worth salvaging."
                break;
                case 19: case 20:
                    GMNotes += "<strong>Unknown Provenance</strong>: The bizarre assortment of different vessels drifting past defies easy explanation. It is likely to bring to mind the eerie legends of the Processional of the Damned, where broken ships from across the Expanse arrive like spectres in some strange afterlife. Whether associated with that haunted realm, or the result of some more mundane confusion, the graveyard consists of the twisted wreckage of dozens of utterly ruined ships of all kinds, as well as " + (randomInteger(5)) + " hulks in varying degrees of integrity. None of the hulks share an origin."
                break;
            }
            GMNotes += "</li>"
            //add all the noteworthy ships
            for(k = randomInteger(10) + 2; k > 0; k--) {
                //note the abundance of the random resource
                GMNotes += "<li>" + this.RandomRuin(randomInteger(10) + randomInteger(10) + 25,ResourceType[randomInteger(2)-1]) + "</li>";
                //each ship has their own chance for danger, but to keep it reasonable the chance is small (1/100).
                if(randomInteger(100) == 1) {
                    GMNotes += this.RandomAdventure();
                }
            }
            
            //close the bullet group
            GMNotes += "</ul>";
        }
        
        
        
        //Add Planets
        for(j = 0; j < Planets[this.region]; j++){
            GMNotes += getLink("Planet") + " " + this.Sector + "-" + this.SystemNumber + "-" + this.PlanetNumber;
            Notes += "<li>" + getLink("Planet") + " " + this.Sector + "-" + this.SystemNumber + "-" + this.PlanetNumber + "</li>";
            GMNotes += this.RandomPlanet();
        }
        
        //Add Gas Giants
        for(j = 0; j < GasGiants[this.region]; j++){
            GMNotes += getLink("Gas Giant") + " " + this.Sector + "-" + this.SystemNumber + "-" + this.PlanetNumber + "<ul>";
            Notes += "<li>" + getLink("Gas Giant") + " " + this.Sector + "-" + this.SystemNumber + "-" + this.PlanetNumber + "</li>";
            //reset temporary planet generation variables
            Gravity = 0;
            this.RegionShift = 0;
            this.OrbitalFeatures = 0;
            this.MoonNumber = 1;
            
            //Generate the Body of the Gas Giant
            GMNotes += "<li><strong>Body</strong>: ";
            
            switch(randomInteger(10)){
                case 1: case 2: GMNotes += "Gas Dwarf"; 
                Gravity = -5;
                break;
                case 3: case 4: case 5: case 6: case 7: case 8: GMNotes += "Gas Giant"; break;
                case 9: case 10: GMNotes += "Gas Titan";
                Gravity = 3;
                if(randomInteger(10) > 7 && this.region != this.InnerCauldron) {
                    Gravity = 9;
                    this.RegionShift = -1;
                } else {
                    Gravity = 3;
                }
                break;
            }
            //close this bullet point
            GMNotes += "</li>";
            
            //Generate the Gravity of the Gas Giant
            GMNotes += "<li><strong>Gravity</strong>: ";
            i = Gravity + randomInteger(10);
            //now that Gravity is recorded for the purposes of random Gravity, the variable Gravity will used to determine Gravity's influence on the previlance of Orbital Features
            if(i <= 2) {
               GMNotes  += "Weak";
               Gravity = 10;
               this.OrbitalFeatures = randomInteger(10)-5;
            } else if(i >= 3 && i <= 6) {
               GMNotes += "Strong";
               Gravity = 15;
               this.OrbitalFeatures = randomInteger(10)-3;
            } else if(i >= 7 && i <= 9) {
               GMNotes += "Powerful";
               Gravity = 20;
               this.OrbitalFeatures = randomInteger(10)+2;
            } else { //if(i >= 10)
               GMNotes += "Titanic";
               Gravity = 30;
               this.OrbitalFeatures = randomInteger(5)+randomInteger(5)+randomInteger(5)+3;
            }
            //close this bullet point
            GMNotes += "</li>";
            
            //be sure at least one orbital feature will have a chance at being generated
            //generate Orbital Features for the Gas Giant
            do {
                //generate a random oribital feature, influenced by the gravity of the planet
                i = randomInteger(100)+Gravity;
                if(i >= 21 && i <= 35) {
                    GMNotes += "<li><strong>Planetary Rings</strong>: Debris</li>";
                } else if(i >= 36 && i <= 50) {
                    GMNotes += "<li><strong>Planetary Rings</strong>: Dust</li>";
                } else if(i >= 51 && i <= 85) {
                    GMNotes += "<li><strong>Lesser Moon</strong>: " + this.Sector + "-" + this.SystemNumber + "-" + this.PlanetNumber + "-" + this.MoonNumber + "</li>";
                    this.MoonNumber++; //another moon has been added to this body
                    if(randomInteger(2) == 2){
                        GMNotes += "<ul><li>" + this.RandomMineral(randomInteger(5)+randomInteger(5)+randomInteger(5)+randomInteger(5)+randomInteger(5)+5) + "</li></ul>";
                    }
                    //each mini moon has a chance to house a lovely lovely adventure, but it is tiny
                    if(randomInteger(100) == 1) {
                        GMNotes += this.RandomAdventure();
                    }
                } else if(i >= 86) {
                    GMNotes += "<li><strong>Moon</strong>: "  + this.Sector + "-" + this.SystemNumber + "-" + this.PlanetNumber + "-" + this.MoonNumber + "</li>";
                    GMNotes += this.RandomPlanet("Moon");
                }
                this.OrbitalFeatures--;
            } while(this.OrbitalFeatures > 0);
            this.PlanetNumber++; //another planet like body has been added to the System
            //close the bullet point group
            GMNotes += "</ul>";
        }
        Notes += "</ul>"
    }
    
    //record the Handout Notes
    NewSystem.set('bio',Notes);
    NewSystem.set('gmnotes',GMNotes);
    
    //edit the gmnotes of the handout
    sendChat("System", "/w gm Generated " + getLink(UniqueName, "http://journal.roll20.net/character/" + NewSystem.id));
    
    //output the id of the character sheet and a list of the stars
    return output;
    }
   
}

on("chat:message", function(msg) {
if(msg.type == "api" && msg.content.indexOf("!NewSystem") == 0 && playerIsGM(msg.playerid) && msg.selected == undefined) {
    mySystem = new System();
    mySystem.Generate(msg.content);
    delete mySystem;
} 
});//Generates a random vehicle for the use of a native Xenos
    this.RandomVehicle = function(type, tech, creature){
        //type is selected outside of this function, the type will determine the weapons, size, movement, and special abilities
        //the possibilities for type are as follows: miniature, light vehicle, transport, heavy vehicle, artillery, fighter, bomber, lander, titan
        
        //tech is selected outside of this function, it 
        //the possibilities for tech range from -3 to 1
        
        //creature is the entire creature object with all of its stats and abilities
        
        //create an object to contain all of the vehicle stats
        vehicle =  {WS: 0, BS:0, S:0, T:0, Ag:0, Wp:0, It:0, Pr:0, Fe:0,
                    Unnatural_WS: 0, Unnatural_BS:0, Unnatural_S:0, Unnatural_T:0, Unnatural_Ag:0, Unnatural_Wp:0, Unnatural_It:0, Unnatural_Pr:0, Unnatural_Fe:0,
                    Weapons: [], 
                    MType: "",
                    TSpeed: 0,
                    AUs: 0,
                    CSpeed: 0,
                    SIntegrity: 0,
                    Size: 0,
                    FArmour: 0, SArmour: 0, RArmour: 0,
                    CarryC: 0,
                    Special: ""};
        
        //use the vehicle type to generate all of its weapons and bonuses
        switch(type){
            case "miniature":
                //store the speed tech modifier
                vehicle.CSpeed = 0;
                //generate a size for the vehicle
                vehicle.Size = creature.Size + 1 - randomInteger(3);
                //generate weapons for the vehicle
                if(randomInteger(2) == 1){
                    vehicle.Weapons[0] = this.RandomWeapon("pistol", tech)
                    //duplicate this weapon a random number of times
                    vehicle.Weapons[0].Num = randomInteger(6);
                } else {
                    vehicle.Weapons[0] = this.RandomWeapon("basic", tech)
                    //duplicate this weapon a random number of times
                    vehicle.Weapons[0].Num = randomInteger(2);
                }
                //note any special abilities
                vehicle.Special += "<strong>Unpiloted</strong>: Ignores Jarring Blow, Staggered, and other pilot targeted effects.<br>";
                break;
            case "light vehicle":
                //store the speed tech modifier
                vehicle.CSpeed = 2;
                //generate a size for the vehicle
                vehicle.Size = creature.Size + randomInteger(2) - 1;
                //generate weapons for the vehicle
                if(randomInteger(3) == 1){
                    vehicle.Weapons[0] = this.RandomWeapon("basic", tech)
                    //duplicate this weapon a random number of times
                    vehicle.Weapons[0].Num = randomInteger(3);
                } else {
                    vehicle.Weapons[0] = this.RandomWeapon("heavy", tech)
                    //duplicate this weapon a random number of times
                    vehicle.Weapons[0].Num = 1;
                }
                //chance for an additional weapon
                if(randomInteger(2) == 1){
                    if(randomInteger(3) > 1){
                        vehicle.Weapons[1] = this.RandomWeapon("basic", tech)
                        //duplicate this weapon a random number of times
                        vehicle.Weapons[1].Num = 1;
                    } else {
                        vehicle.Weapons[1] = this.RandomWeapon("heavy", tech)
                        //duplicate this weapon a random number of times
                        vehicle.Weapons[1].Num = 1;
                    }
                }
                //note any special abilities
                vehicle.Special += "";
                break;
            case "transport":
                //store the speed tech modifier
                vehicle.CSpeed = 1;
                //generate a size for the vehicle
                vehicle.Size = creature.Size + randomInteger(3);
                //generate weapons for the vehicle
                if(randomInteger(3) == 1){
                    vehicle.Weapons[0] = this.RandomWeapon("basic", tech)
                    //duplicate this weapon a random number of times
                    vehicle.Weapons[0].Num = randomInteger(3);
                } else {
                    vehicle.Weapons[0] = this.RandomWeapon("heavy", tech)
                    //duplicate this weapon a random number of times
                    vehicle.Weapons[0].Num = 1;
                }
                //chance for an additional weapon
                if(randomInteger(10) > 1){
                    vehicle.Weapons.push(this.RandomWeapon("basic", tech));
                    //duplicate this weapon a random number of times
                    vehicle.Weapons[1].Num = 1;
                }
                //note any special abilities
                vehicle.Special += "<strong>Carrying Capacity</strong>: Can transport " + (vehicle.Size - creature.Size).toString() + " units.<br>";
                break;
            case "heavy vehicle":
                break;
            case "artillery":
                break;
            case "fighter":
                break;
            case "bomber":
                break;
            case "lander":
                break;
            case "titan":
                break;
        }
        
        //randomly determine movement type
        switch(this.TechRoll(tech-1,10)){
            case 1:  
                vehicle.Movement = "beast";
                break;
            case 2:  
                vehicle.Movement = "chariot";
                break;
            case 3: case 4: case 5:  
                vehicle.Movement = "locomotion";
                break;
            case 6: case 7: case 8:
                vehicle.Movement = "walker";
                break;
            case 9: case 10:
                vehicle.Movement = "skimmer";
                break;
        }
        
        
    }    //Re-roll multiple dice a number of times seeking the lowest or highest result
    this.TechRoll = function(rerolls, diceSides, diceNum){
        //how many dice are we rolling each time?
        diceNum = diceNum || 1;
        //is this a D5, D10, D100, etc?
        diceSides = diceSides || 10;
        //how many times are we attempting to reroll this 
        //and are we searching for the lowest (negative) or the highest (positive)
        rerolls = rerolls || -1;
        
        //save the output
        var output = 0;
        //roll the dice for the first time
        //keep rolling dice for the roll up to diceNum
        for(var j = 0; j < diceNum; j++){
            //roll a D5, D10, etc as speciied
            output += randomInteger(diceSides);
        }
        var temproll = 0;
        //keep rerolling for all of the rerolls
        for(var i = 0; i < Math.abs(rerolls); i++){
            //make a temporary variable for each re-roll
            var temproll = 0;    
            //keep rolling dice for the roll up to diceNum
            for(var j = 0; j < diceNum; j++){
                //roll a D5, D10, etc as speciied
                temproll += randomInteger(diceSides);
            }
            //are we seeking the smallest die roll & is this temproll smaller than the saved one?
            //OR
            //are we seeking the largest die roll & is this temproll larger than the saved one?
            if((rerolls < 0 && temproll < output) || (rerolls > 0 && temproll > output)){
                output = temproll;
            }
        }
        //report the final roll
        return output;
    }
    
    //Generates a random weapon to detail a native creature or their vehicle.
    this.RandomWeapon = function(type, tech, qualities, blast, rangemultiplier, clipmultiplier){
      //==input==
        //what type of weapon is this? (Melee, Thrown, Pistol, Basic, Heavy, Superheavy)
        type = type || "melee"
        //what is the tech level of native?
        tech = tech || -3
        //what special abilities have been added to this weapon?
        qualities = qualities || ""
        //add extra blast radius
        blast = blast || -1;
        //a multiplier for the range
        rangemultiplier = rangemultiplier || 1;
        //a multiplier for the clip
        clipmultiplier = clipmultiplier || 1;
        //try to reduce the tech level by one
        tech = tech - 1;
      //==output==
        //create an object that will contain all of the weapon's stats
        weapon = {};
    
        //how many qualities does this weapon have?
        var totalQualities = this.TechRoll(tech,5)-1;
        weapon.Qualities = "";
    
        //which type of weapon are we working with?
        switch(type){
            case "thrown":
                weapon.WeaponName = "Thrown Weapon";
                weapon.Type = "Thrown";
                weapon.Damage =  this.TechRoll(tech,10)-2;
                weapon.DiceNum = this.TechRoll(tech,3,2)-2;
                weapon.Pen =     this.TechRoll(tech,10)-1;
                weapon.Range = -1 * randomInteger(5);  //3 x Str
                break;
            case "pistol":
                weapon.WeaponName = "Pistol Weapon";
                weapon.Type = "Pistol";
                weapon.Damage =  this.TechRoll(tech,10)-2;
                weapon.DiceNum = this.TechRoll(tech,3,2)-2;
                weapon.Pen =     this.TechRoll(tech,10)-1;
                weapon.Range =   this.TechRoll(tech,50);
                //20% chance to be able to fire on single
                weapon.Single =  this.TechRoll(tech,10) > 8
                //20% chance to be able to fire on semiauto
                if(this.TechRoll(tech,10) > 8){
                    weapon.Semi = this.TechRoll(tech,3)+1
                }
                //20% chance to be able to fire on fullauto
                if(this.TechRoll(tech,10) > 8){
                    weapon.Full = this.TechRoll(tech,10)+5
                }
                //you should at least be able to fire on Single if you can't do anything else
                if (!(weapon.Semi || weapon.Full)){
                    weapon.Single = true;
                }
                //the clip size is based on the maximum fire setting
                if(weapon.Full){
                    weapon.Clip = weapon.Full * this.TechRoll(tech,10)
                } else if(weapon.Semi){
                    weapon.Clip = weapon.Semi * this.TechRoll(tech,10)
                } else {
                    weapon.Clip = this.TechRoll(tech,5)
                }
                break;
            case "basic":
                weapon.WeaponName = "Basic Weapon";
                weapon.Type = "Basic";
                weapon.Damage =  this.TechRoll(tech,15)-2;
                weapon.DiceNum = this.TechRoll(tech,3,2)-2;
                weapon.Pen =     this.TechRoll(tech,10)-1;
                weapon.Range =   this.TechRoll(tech,100,2);
                //30% chance to be able to fire on single
                weapon.Single =  this.TechRoll(tech,10) > 7
                //30% chance to be able to fire on semiauto
                if(this.TechRoll(tech,10) > 7){
                    weapon.Semi = this.TechRoll(tech,3)+1
                }
                //30% chance to be able to fire on fullauto
                if(this.TechRoll(tech,10) > 7){
                    weapon.Full = this.TechRoll(tech,10)+5
                }
                //you should at least be able to fire on Single if you can't do anything else
                if (!(weapon.Semi || weapon.Full)){
                    weapon.Single = true;
                }
                //the clip size is based on the maximum fire setting
                if(weapon.Full){
                    weapon.Clip = weapon.Full * this.TechRoll(tech,10)
                } else if(weapon.Semi){
                    weapon.Clip = weapon.Semi * this.TechRoll(tech,10)
                } else {
                    weapon.Clip = this.TechRoll(tech,10)
                }
                break;
            case "heavy":
                weapon.WeaponName = "Heavy Weapon";
                weapon.Type = "Heavy";
                weapon.Damage =  this.TechRoll(tech,20);
                weapon.DiceNum = this.TechRoll(tech,3,2)-2;
                weapon.Pen =     this.TechRoll(tech,10)-1;
                weapon.Range =   this.TechRoll(tech,250,2);
                //40% chance to be able to fire on single
                weapon.Single =  this.TechRoll(tech,10) > 6
                //40% chance to be able to fire on semiauto
                if(this.TechRoll(tech,10) > 6){
                    weapon.Semi = this.TechRoll(tech,3)+1
                }
                //40% chance to be able to fire on fullauto
                if(this.TechRoll(tech,10) > 6){
                    weapon.Full = this.TechRoll(tech,10)+5
                }
                //you should at least be able to fire on Single if you can't do anything else
                if (!(weapon.Semi || weapon.Full)){
                    weapon.Single = true;
                }
                //the clip size is based on the maximum fire setting
                if(weapon.Full){
                    weapon.Clip = weapon.Full * this.TechRoll(tech,20)
                } else if(weapon.Semi){
                    weapon.Clip = weapon.Semi * this.TechRoll(tech,20)
                } else {
                    weapon.Clip = this.TechRoll(tech,20)
                }
                break;
            case "superheavy":
                weapon.WeaponName = "Superheavy Weapon";
                weapon.Type =    "Superheavy";
                weapon.Damage =  this.TechRoll(tech,50);
                weapon.DiceNum = this.TechRoll(tech,5,2)-2;
                weapon.Pen =     this.TechRoll(tech,20)-1;
                weapon.Range =   this.TechRoll(tech,1000,2);
                //40% chance to be able to fire on single
                weapon.Single =  this.TechRoll(tech,10) > 6
                //40% chance to be able to fire on semiauto
                if(this.TechRoll(tech,10) > 6){
                    weapon.Semi = this.TechRoll(tech,3)+1
                }
                //40% chance to be able to fire on fullauto
                if(this.TechRoll(tech,10) > 6){
                    weapon.Full = this.TechRoll(tech,10)+5
                }
                //you should at least be able to fire on Single if you can't do anything else
                if (!(weapon.Semi || weapon.Full)){
                    weapon.Single = true;
                }
                //the clip size is based on the maximum fire setting
                if(weapon.Full){
                    weapon.Clip = weapon.Full * this.TechRoll(tech,20)
                } else if(weapon.Semi){
                    weapon.Clip = weapon.Semi * this.TechRoll(tech,20)
                } else {
                    weapon.Clip = this.TechRoll(tech,20)
                }
                break;
            //case "melee":
            default:
                weapon.WeaponName = "Melee Weapon";
                weapon.Type = "Melee";
                weapon.Damage =  this.TechRoll(tech,10)-3;
                weapon.DiceNum = this.TechRoll(tech,3,2)-2;
                weapon.Pen =     this.TechRoll(tech,10)-1;
                weapon.Range = 0;
        }
        //apply the multipliers and be sure the multiplier is positive
        if(clipmultiplier > 0){
            weapon.Clip *= clipmultiplier;
        } else{
            weapon.Clip = 1;
        }
        if(rangemultiplier > 0){
            weapon.Range *= rangemultiplier;
        } else{
            weapon.Range = 0;
        }
        
        //determine the damage type (Impact, Rending, Explosive, Energy)
        //lower tech nations are much more likely to have impact weapons
        switch(this.TechRoll(tech,10)){
            case 1: case 2: case 3: case 4:
                weapon.DamageType = "I";
                break;
            case 5: case 6: case 7:
                weapon.DamageType = "R";
                break;
            case 8: case 9:
                weapon.DamageType = "X";
                break;
            case 10:
                weapon.DamageType = "E";
                break;
        }
        //will we force the first property to be Primitive?
        if(randomInteger(100) < 1 + -20*tech){
            //add a link to Primitive and prepare for more qualities
            weapon.Qualities += getLink("Primitive") + ", ";
            //reduce the number of weapon qualities by one
            totalQualities--;
        }
        
        //add the total number of random qualities to the weapon
        var randomQuality;
        //preset all of the valued qualities to negative one
        weapon.Blast = blast;
        weapon.Claws = -1;
        weapon.Concussive = -1;
        weapon.Crippling = -1;
        weapon.Devastating = -1;
        weapon.Felling = -1;
        weapon.Hallucinogenic = -1;
        weapon.Haywire = -1;
        weapon.Proven = -1;
        weapon.Smoke = -1;
        weapon.Toxic = -1;
        weapon.Spray = -1;
        weapon.AreaSaturation = -1;
        for(quality = 0; quality < totalQualities; quality++){
            //if this is a melee weapon generate a random general or melee quality
            if(weapon.Type == "Melee"){
                randomQuality = randomInteger(29+7);
            //otherwise generate a random general or ranged quality
            }else{
                randomQuality = randomInteger(29+16);
            }
            switch(randomQuality){
                case 1:
                    weapon.Qualities += getLink("Corrosive") + ", ";
                    break;
                case 2:
                    weapon.Qualities += getLink("Decay") + ", ";
                    break;
                case 3:
                    weapon.Qualities += getLink("Irradiated") + ", ";
                    break;
                case 4:
                    weapon.Qualities += getLink("Overcharge") + ", ";
                    break;
                case 5:
                    //start at 0
                    if(weapon.Blast < 0){weapon.Blast = 0;}
                    weapon.Blast += randomInteger(5);
                    break;
                case 6:
                    //start at 0
                    if(weapon.Claws < 0){weapon.Claws = 0;}
                    weapon.Claws += randomInteger(3);
                    break;
                case 7:
                    weapon.Concussive += randomInteger(5);
                    break;
                case 8:
                    //start at 0
                    if(weapon.Crippling < 0){weapon.Crippling = 0;}
                    weapon.Crippling += randomInteger(5);
                    break;
                case 9:
                    weapon.Qualities += getLink("Deadly Snare") + ", ";
                    break;
                case 10:
                    //start at 0
                    if(weapon.Devastating < 0){weapon.Devastating = 0;}
                    weapon.Devastating += randomInteger(5);
                    break;
                case 11:
                    //start at 0
                    if(weapon.Felling < 0){weapon.Felling = 0;}
                    weapon.Felling += randomInteger(5);
                    break;
                case 12:
                    weapon.Qualities += getLink("Fire") + ", ";
                    break;
                case 13:
                    weapon.Qualities += getLink("Force") + ", ";
                    break;
                case 14:
                    weapon.Qualities += getLink("Gauss") + ", ";
                    break;
                case 15:
                    weapon.Hallucinogenic += randomInteger(5);
                    break;
                case 16:
                    //start at 0
                    if(weapon.Haywire < 0){weapon.Haywire = 0;}
                    weapon.Haywire += randomInteger(5);
                    break;
                case 17:
                    weapon.Proven += randomInteger(5);
                    break;
                case 18:
                    weapon.Qualities += getLink("Razor Sharp") + ", ";
                    break;
                case 19:
                    weapon.Qualities += getLink("Rune Weapon") + ", ";
                    break;
                case 20:
                    weapon.Qualities += getLink("Sanctified") + ", ";
                    break;
                case 21:
                    weapon.Qualities += getLink("Shocking") + ", ";
                    break;
                case 22:
                    //start at 0
                    if(weapon.Smoke < 0){weapon.Smoke = 0;}
                    weapon.Smoke += randomInteger(5);
                    break;
                case 23:
                    weapon.Qualities += getLink("Snare") + ", ";
                    break;
                case 24:
                    weapon.Qualities += getLink("Tainted") + ", ";
                    break;
                case 25:
                    weapon.Qualities += getLink("Tearing") + ", ";
                    break;
                case 26:
                    weapon.Qualities += getLink("Tesla") + ", ";
                    break;
                case 27:
                    weapon.Toxic += randomInteger(5);
                    break;
                case 28:
                    weapon.Qualities += getLink("Unstable") + ", ";
                    break;
                case 29:
                    weapon.Qualities += getLink("Volatile") + ", ";
                    break;
                default:
                    //for ease of modifying in the future, scale back the random number by the number of generic qualities
                    randomQuality -= 29;
                    //should we generate a melee quality?
                    if(weapon.Type == "Melee"){
                        switch(randomQuality){
                            case 1:
                                weapon.Qualities += getLink("Balanced") + ", ";
                                break;
                            case 2:
                                weapon.Qualities += getLink("Defensive") + ", ";
                                break;    
                            case 3:
                                weapon.Qualities += getLink("Fist") + ", ";
                                break;
                            case 4:
                                weapon.Qualities += getLink("Flexible") + ", ";
                                break;
                            case 5:
                                weapon.Qualities += getLink("Powerfield") + ", ";
                                break;
                            case 6:
                                weapon.Qualities += getLink("Unbalanced") + ", ";
                                break;
                            case 7:
                                weapon.Qualities += getLink("Unwieldy") + ", ";
                                break;
                        }
                    //otherwise the weapon is ranged. Generate ranged qualities
                    }else{
                        switch(randomQuality){
                            case 1:
                                weapon.Qualities += getLink("Accurate") + ", ";
                                break;
                            case 2:
                                weapon.Qualities += getLink("Customised") + ", ";
                                break;
                            case 3:
                                weapon.Qualities += getLink("Gyro-Stabalised") + ", ";
                                break;
                            case 4:
                                weapon.Qualities += getLink("Inaccurate") + ", ";
                                break;
                            case 5:
                                weapon.Qualities += getLink("Living Ammunition") + ", ";
                                break;
                            case 6:
                                weapon.Qualities += getLink("Maximal") + ", ";
                                break;
                            case 7:
                                weapon.Qualities += getLink("Melta") + ", ";
                                break;
                            case 8:
                                weapon.Qualities += getLink("Overheats") + ", ";
                                break;
                            case 9:
                                weapon.Qualities += getLink("Recharge") + ", ";
                                break;
                            case 10:
                                weapon.Qualities += getLink("Reliable") + ", ";
                                break;
                            case 11:
                                weapon.Qualities += getLink("Scatter") + ", ";
                                break;
                            case 12:
                                //have we already added the Spray quality?
                                if(weapon.Spray < 0){
                                    //note that this weapon has the spray quality
                                    weapon.Spray = 0;
                                    //reduce the range to Sqrt[range]
                                    weapon.Range = Math.ceil(Math.sqrt(weapon.Range));
                                } else {
                                    //somehow we rolled Spray multiple times, extend the range of the spray
                                    weapon.Range *= 2;
                                }
                                //roll to see if we are extending the origin point range
                                if(randomInteger(10) == 1){
                                    //extend the origin point range by 100% to 300%
                                    weapon.Spray += weapon.Range * (99 + randomInteger(200))/100
                                }
                                break;
                            case 13:
                                weapon.Qualities += getLink("Storm") + ", ";
                                break;
                            case 14:
                                weapon.Qualities += getLink("Twin-linked") + ", ";
                                break;
                            case 15:
                                weapon.Qualities += getLink("Unreliable") + ", ";
                                break;
                            case 16:
                                weapon.AreaSaturation += weapon.Range / randomInteger(50);
                                break;
                        }
                    }
            }
            
        }
        //add the numerical qualities to the weapons
        if(weapon.Blast >= 0){
            weapon.Qualities += getLink("Blast") + "(" + weapon.Blast.toString() + "), ";
        }
        if(weapon.Claws >= 0){
            weapon.Qualities += getLink("Claws") + "(" + weapon.Claws.toString() + "), ";
        }
        if(weapon.Concussive >= 0){
            weapon.Qualities += getLink("Concussive") + "(" + weapon.Concussive.toString() + "), ";
        }
        if(weapon.Crippling >= 0){
            weapon.Qualities += getLink("Crippling") + "(" + weapon.Crippling.toString() + "), ";
        }
        if(weapon.Devastating >= 0){
            weapon.Qualities += getLink("Devastating") + "(" + weapon.Devastating.toString() + "), ";
        }
        if(weapon.Felling >= 0){
            weapon.Qualities += getLink("Felling") + "(" + weapon.Felling.toString() + "), ";
        }
        if(weapon.Hallucinogenic >= 0){
            weapon.Qualities += getLink("Hallucinogenic") + "(" + weapon.Hallucinogenic.toString() + "), ";
        }
        if(weapon.Haywire >= 0){
            weapon.Qualities += getLink("Haywire") + "(" + weapon.Haywire.toString() + "), ";
        }
        if(weapon.Proven >= 0){
            weapon.Qualities += getLink("Proven") + "(" + weapon.Proven.toString() + "), ";
        }
        if(weapon.Smoke >= 0){
            weapon.Qualities += getLink("Smoke") + "(" + weapon.Smoke.toString() + "), ";
        }
        if(weapon.Toxic >= 0){
            weapon.Qualities += getLink("Toxic") + "(" + weapon.Toxic.toString() + "), ";
        }
        if(weapon.Spray >= 0){
            weapon.Qualities += getLink("Spray") + "(" + weapon.Spray.toString() + "m), ";
        }
        if(weapon.AreaSaturation >= 0){
            weapon.Qualities += getLink("Area Saturation") + "(" + weapon.AreaSaturation.toString() + "m), ";
        }
        //prepend any preselected qualities
        weapon.Qualities = qualities + ", " + weapon.Qualities;
        //delete the last comma from the Qualities
        weapon.Qualities = weapon.Qualities.substring(0,weapon.Qualities.length - 2);
        //return all the aspects of the weapon
        return weapon;
    }    //Generates a random Xenos to complicate a planet or adventure. Saves it into a handout.
    RandomCreature  = function(input,location) {
        input = input || "";

        input = input.toLowerCase();

        location = location || "";

        var CreatureNumber = 1;
        var XenosType = "";
        var XenosBase;
        var XenosWorld = "exotic";
        var XenosSize;
        var NewXenos;
        var XenosDie = 0;
        var ExoticTraits = 0;
        var Mutations = 0;
        var Xenos = {WS: 0, BS:0, S:0, T:0, Ag:0, Wp:0, It:0, Pr:0, Fe:0,
                    Wounds: 0, Fatigue: 0,
                    Arms: 2, Legs: 2,
                    Armour_H: 0, Armour_RA: 0, Armour_LA: 0, Armour_B: 0, Armour_RL: 0, Armour_LL:0,
                    Unnatural_WS: 0, Unnatural_BS:0, Unnatural_S:0, Unnatural_T:0, Unnatural_Ag:0, Unnatural_Wp:0, Unnatural_It:0, Unnatural_Pr:0, Unnatural_Fe:0,
                    HalfMove: 0, FullMove: 0, Charge: 0, Run: 0,
                    Weapons: "",
                    Damage: 0, Pen: 0, DamageType: "", WeaponName: "", Qualities: "",
                    RDamage: 0, RPen: 0, RDamageType: "", RWeaponName: "", RQualities: "", RRange: 0,
                    NativeWeapons: [],
                    Skills: "", Talents: "", Traits: "", gmnotes: "",
                    Burrower: 0, Civilization: "",
                    isApex: false, isResilient: false, isDeadly: false, isFlexible: 0, isMighty:false,
                    Climb: -1, Swim: -1, Concealment: -1, SilentMove: -1, Shadowing: -1, Dodge: -1, Awareness: -1};

        //create a function to quickly add armour to every location
        Xenos.ArmourAll = function (increase){
            Xenos.Armour_H  += increase;
            Xenos.Armour_B  += increase;
            Xenos.Armour_LA += increase;
            Xenos.Armour_RA += increase;
            Xenos.Armour_LL += increase;
            Xenos.Armour_RL += increase;
        }
        //create a function to handle multiple Swift Attack Talents
        Xenos.SwiftAttack = function(){
            if(Xenos.Talents.indexOf("Swift Attack") != -1 && Xenos.Talents.indexOf("Lightning Attack") != -1){
                Xenos.WS += 10;
            } else if(Xenos.Talents.indexOf("Swift Attack") != -1) {
                Xenos.Talents += getLink("Lightning Attack") + "<br>";
            } else {
                Xenos.Talents += getLink("Swift Attack") + "<br>";
            }
        }
        //create a function for every trait
        Xenos.ImprovedNaturalWeapons = function(){
            if(Xenos.Traits.indexOf("Improved Natural Weapons") != -1){
                Xenos.Damage += 2;
            } else {
                Xenos.Traits += getLink("Improved Natural Weapons") + "<br>";
            }
        }
        Xenos.Apex = function (){
            Xenos.Traits += "Apex<br>";
            if(Xenos.isApex){
                Xenos.Unnatural_S += Math.floor(Xenos.S/10);
                Xenos.Unnatural_T += Math.floor(Xenos.T/10);
            } else {
                Xenos.WS += 10;
                Xenos.S  += 10;
                Xenos.T  += 10;
                Xenos.Ag += 10;
                Xenos.Pr += 10;
                Xenos.ImprovedNaturalWeapons();
                Xenos.isApex = true;
            }
        }
        Xenos.Amorphous = function(){
            Xenos.T += 10;
            Xenos.Traits += getLink("Amorphous") + "<br>";
            if(!Xenos.isAmorphous){
                Xenos.isAmorphous = true;
                Xenos.Traits += getLink("Strange Physiology") + "<br>";
                Xenos.Traits += getLink("Unnatural Senses") + "<br>";
                Xenos.Traits += getLink("Fear") + "(2)<br>";
            }
            if(randomInteger(2)==1){
                Xenos.Climb++;
                Xenos.Swim++;
            }
        }
        Xenos.Amphibious = function(){
            Xenos.Traits += getLink("Amphibious") + "<br>";
        }
        Xenos.Aquatic = function(){
            Xenos.Traits += getLink("Aquatic") + "<br>";
        }
        Xenos.Arboreal = function(){
            Xenos.Skills += getLink("Acrobatics") + "+20<br>";
            Xenos.Climb += 3;
            Xenos.Dodge += 3;
            Xenos.Traits += getLink("Catfall") + "<br>";
            Xenos.Traits += getLink("Arboreal") + "<br>";
        }
        Xenos.Armoured = function(){
            Xenos.ArmourAll(randomInteger(5));
        }
        Xenos.Crawler = function(){
            if(Xenos.Traits.indexOf("Crawler") == -1){
                Xenos.Traits += getLink("Crawler") + "<br>";
            }
            if(randomInteger(5) == 1){
                Xenos.Climb++;
            }
        }
        Xenos.Darkling = function(){
            if(Xenos.Traits.indexOf("Blink") == -1){
                Xenos.Traits += getLink("Blind") + "<br>";
            }
            if(randomInteger(2) == 1){
                if(Xenos.Traits.indexOf("Sonar Sense") == -1){
                    Xenos.Traits += getLink("Sonar Sense") + "<br>";
                }
            } else {
                if(Xenos.Traits.indexOf("Unnatural Senses") == -1){
                    Xenos.Traits += getLink("Unnatural Senses") + "<br>";
                }
            }
            Xenos.Awareness++;
            Xenos.SilentMove++;
            Xenos.Climb++;
            Xenos.Swim++;
        }
        Xenos.Deadly = function(){
            Xenos.WS += 10;
            if(Xenos.isDeadly && Xenos.Qualities.indexOf("Razor Sharp") == -1){
                Xenos.Qualities += getLink("Razor Sharp") + ", ";
            } else {
                Xenos.ImprovedNaturalWeapons();
            }
        }
        Xenos.Deathdweller = function(){
            if(Xenos.Talents.indexOf("(Radiation)") == -1){
                Xenos.Talents += getLink("Resistance") + "(Radiation)<br>";
                Xenos.Wounds += 3;
            } else {
                Xenos.Wounds += 2;
                Xenos.T += 5;
            }
        }
        Xenos.Deterrent = function(){
            Xenos.Traits += getLink("Deterrent") + "<br>";
        }
        Xenos.Disturbing = function(){
            Xenos.Traits += getLink("Fear") + "<br>";
        }
        Xenos.FadeKind = function(){
            switch(randomInteger(2)){
                case 1: Xenos.Traits += getLink("Incorporeal") + "<br>"; break;
                case 2: Xenos.Traits += getLink("Phase") + "<br>"; break;
            }
            if(randomInteger(4)==1){Xenos.Traits += getLink("Fear") + "<br>";}
        }
        Xenos.Flexible = function(){
            Xenos.Traits += "Flexible<br>";
            //apply a different benefit depending on how many times this result was achieved
            switch(Xenos.isFlexible){
                case 0:
                    Xenos.Skills += getLink("Dodge") + "+10<br>";
                    Xenos.Qualities += getLink("Flexible") + ", ";
                break;
                case 1:
                    Xenos.Qualities += getLink("Snare") + ", ";
                break;
                default:
                    Xenos.Ag += 10;
                break;
            }
            Xenos.isFlexible++;
        }
        Xenos.FoulAura = function(type){
            Xenos.Traits += getLink("Foul Aura") + "(" + type + ")<br>";
        }
        Xenos.Frictionless = function(){
            Xenos.Traits += getLink("Fictionless")  + "<br>";
        }
        Xenos.Gestalt = function(){
            Xenos.T += 10;
            Xenos.Wp += 10;
            Xenos.It -= 10;
            Xenos.Traits += getLink("Gestalt") + "<br>";
        }
        Xenos.LethalDefences = function(){
            Xenos.Traits += getLink("Lethal Defences") + "<br>";
        }
        Xenos.Mighty = function(){
            Xenos.Traits += "Mighty<br>";
            //apply a dfferent benefit depending if this was already taken or not
            if(Xenos.isMighty){
                Xenos.Unnatural_S += Math.floor(Xenos.S/10);
            } else {
                Xenos.isMighty = true;
                Xenos.S += 10;
            }
        }
        Xenos.Paralytic = function(){
            Xenos.Qualities += getLink("Paralytic") + ", ";
        }
        Xenos.ProjectileAttack = function(){
            if(Xenos.BS == 0){
                Xenos.BS = 30;
                Xenos.RDamage = 3;
                switch(randomInteger(3)){
                    case 1: Xenos.RDamageType = "Impact";
                    Xenos.RWeaponName = "Weighted Projectile";
                    break;
                    case 2: Xenos.RDamageType = "Rending";
                    Xenos.RWeaponName = "Arial Spines";
                    break;
                    case 3: Xenos.RDamageType = "Energy";
                    Xenos.RWeaponName = "Acid Spittle";
                    break;
                }
                Xenos.RRange = 15;
            } else {
                Xenos.BS += 10;
                Xenos.RDamage += 1;
                Xenos.RPen += 1;
                Xenos.RRange += 10;
            }
        }
        Xenos.Resilient = function(){
            Xenos.Traits += "Resilient<br>";
            //check to see if the creature already has this trait
            if(Xenos.isResilient){
                //if so, just add unnatural toughness
                Xenos.Unnatural_T += Math.floor(Xenos.T/10);
            } else {
                //if not, record that it does have it now
                Xenos.isResilient = true;
                //and add 10 Toughness
                Xenos.T += 10;
            }
        }
        Xenos.Silicate = function(){
            Xenos.Traits += getLink("Silicate") + "<br>";
            Xenos.Ag -= 10;
            Xenos.ArmourAll(1+randomInteger(5));
            Xenos.Unnatural_S += Math.floor(Xenos.S/10);
            Xenos.Unnatural_T += Math.floor(Xenos.T/10);
        }
        Xenos.Stealthy = function(){
            Xenos.Concealment += 3;
            Xenos.SilentMove += 3;
            Xenos.Shadowing += 3;
        }
        Xenos.Sticky = function(){
            Xenos.Traits += getLink("Sticky") + "<br>";
        }
        Xenos.SustainedLife = function(){
            Xenos.Traits += getLink("Sustained Life") + "<br>";
        }
        Xenos.Swift = function(){
            Xenos.Traits += "Swift<br>";
            if(Xenos.isSwift){
                Xenos.Unnatural_Ag += Math.floor(Xenos.Ag/10);
            } else {
                Xenos.isSwift = true;
                Xenos.Ag += 10;
            }
        }
        Xenos.ThermalAdaptation = function(type){
            Xenos.Talents += getLink("Thermal Adaptation");
            Xenos.T += 5;
            if(Xenos.Talents.indexOf("(Cold)")){
                Xenos.Talents += "(Cold)";
            } else if(Xenos.Talents.indexOf("(Heat)")){
                Xenos.Talents += "(Heat)";
            } else if(type == "Heat") {
                Xenos.Talents += "(Heat)";
            } else if(type == "Cold") {
                Xenos.Talents += "(Cold)";
            }
            Xenos.Talents += "<br>";
        }
        Xenos.Tunneller = function(){
            Xenos.Burrower++;
        }
        Xenos.Unkillable = function(){
            Xenos.Traits += getLink("Regeneration") + "(1)<br>";
            Xenos.Wounds += 5;
        }
        Xenos.UprootedMovement = function(){
            Xenos.Triats += getLink("Uprooted Movement") + "<br>"
        }
        Xenos.Valuable = function(){
            Xenos.Traits += "Valuable<br>";
        }
        Xenos.Venomous = function(){
            Xenos.Qualities += getLink("Toxic") + ", ";
        }
        Xenos.Warped = function(){
            Xenos.Traits += getLink("Mutation") + " - "
            switch(randomInteger(100)){
                case 1:  case 2:  case 3:  case 4:  case 5:  Xenos.Traits += "Grotesque"; break;
                case 6:  case 7:  case 8:  case 9:  case 10: Xenos.Traits += "Tough Hide"; Xenos.ArmourAll(2); break;
                case 11: case 12: case 13: case 14: case 15: Xenos.Traits += "Misshapen"; Xenos.Ag -= randomInteger(10) + randomInteger(10); break;
                case 16: case 17: case 18: case 19: case 20: Xenos.Traits += "Feels No Pain"; Xenos.Wounds += 5; Xenos.Talents += "<br>" + getLink("Iron Jaw"); break;
                case 21: case 22: case 23: case 24: case 25: Xenos.Traits += "Brute"; Xenos.S += 10; Xenos.T += 10; break;
                case 26: case 27: case 28: case 29: case 30: Xenos.Traits += "Nightsider"; Xenos.Traits += "<br>" + getLink("Dark Sight"); break;
                case 31: case 32: case 33: case 34: case 35: Xenos.Traits += "Mental Regressive";
                switch(randomInteger(10)){
                    case 6: case 7: Xenos.It = Math.round(Xenos.It / 2); break; //halve the characteristic
                    case 8: case 9: break; //do nothing
                    case 10: Xenos.It = 5; break; //set it equal to 5
                    default: Xenos.It -= randomInteger(10); break; //reduce it by D10
                }
                switch(randomInteger(10)){
                    case 6: case 7: Xenos.Pr = Math.round(Xenos.Pr / 2); break; //halve the characteristic
                    case 8: case 9: break; //do nothing
                    case 10: Xenos.Pr = 5; break; //set it equal to 5
                    default: Xenos.Pr -= randomInteger(10); break; //reduce it by D10
                }
                switch(randomInteger(10)){
                    case 6: case 7: Xenos.Wp = Math.round(Xenos.Wp / 2); break; //halve the characteristic
                    case 8: case 9: break; //do nothing
                    case 10: Xenos.Wp = 5; break; //set it equal to 5
                    default: Xenos.Wp -= randomInteger(10); break; //reduce it by D10
                }
                switch(randomInteger(10)){
                    case 6: case 7: Xenos.Fe = Math.round(Xenos.Fe / 2); break; //halve the characteristic
                    case 8: case 9: break; //do nothing
                    case 10: Xenos.Fe = 5; break; //set it equal to 5
                    default: Xenos.Fe -= randomInteger(10); break; //reduce it by D10
                }
                break;
                case 36: case 37: case 38: case 39: case 40: Xenos.Traits += "Malformed Hands"; Xenos.WS -= 10; Xenos.BS -= 10; break;
                case 41: case 42: case 43: case 44: case 45: Xenos.Traits += "Tox Blood"; Xenos.It -= randomInteger(10); Xenos.T -= randomInteger(10); break;
                case 46: case 47: case 48: case 49: case 50: Xenos.Traits += "Hulking"; Xenos.Traits += "<br>" + getLink("Size") + "(+1)"; Xenos.S += 10; Xenos.Wounds += 5; break;
                case 51: case 52: case 53: case 54: case 55: Xenos.Traits += "Wyrdling"; Xenos.Traits += "<br>" + getLink("Psy Rating") + "(2)<br>Psychic Technique<br>Psychic Technique"; break;
                case 56: case 57: case 58: case 59:          Xenos.Traits += "Vile Deformity"; Xenos.Traits += "<br>" + getLink("Fear"); break;
                case 60: case 61: case 62: case 63:          Xenos.Traits += "Aberration"; Xenos.S += 10; Xenos.Ag += 10; Xenos.Fe -= 10; Xenos.It -= randomInteger(10); break;
                case 64: case 65: case 66: case 67:          Xenos.Traits += "Degenerate Mind";
                Xenos.It -= randomInteger(10);
                Xenos.Fe -= randomInteger(10);
                switch(randomInteger(3)){
                    case 1: Xenos.Traits += "<br>" + getLink("Frenzy"); break;
                    case 2: Xenos.Traits += "<br>" + getLink("Fearless"); break;
                    case 3: Xenos.Traits += "<br>" + getLink("From Beyond"); break;
                }
                break;
                case 68: case 69: case 70: case 71:          Xenos.Traits += "Ravaged Body"; Die = randomInteger(5); Mutations += Die; ExoticTraits += Die; break;
                case 72: case 73: case 74:                   Xenos.Traits += "Clawed/Fanged";
                Xenos.WS += 10;
                if(Xenos.Deadly && Xenos.Qualities.indexOf("Razor Sharp") == -1){
                    Xenos.Qualities += getLink("Razor Sharp") + ", ";
                } else{
                    Xenos.Deadly = true;
                    if(Xenos.Traits.indexOf("Improved Natural Weapons") != -1){
                        Xenos.Damage += 2;
                    } else {
                        Xenos.Traits += getLink("Improved Natural Weapons") + "<br>";
                    }
                }
                break;
                case 75: case 76: case 77: case 78:          Xenos.Traits += "Necrophage"; Xenos.Traits += "<br>" + getLink("Regeneration") + "(1)"; Xenos.T += 10; break;
                case 79: case 80: case 81:                   Xenos.Traits += "Corrupted Flesh"; break;
                case 82: case 83: case 84: case 85:          Xenos.Traits += "Venomous"; Xenos.Traits += "<br>" + getLink("Toxic"); break;
                case 86: case 87: case 88: case 89:          Xenos.Traits += "Hideous Strength"; Xenos.Unnatural_S += Math.floor(Xenos.S/10); break;
                case 90: case 91:                            Xenos.Traits += "Multiple Appendages"; Xenos.Traits += "<br>" + getLink("Multiple Arms") + "(1)"; break;
                case 92: case 93:                            Xenos.Traits += "Worm"; Xenos.Wounds += 5; Xenos.Traits += "<br>" + getLink("Crawler"); break;
                case 94:                                     Xenos.Traits += "Nightmarish"; Xenos.Traits += "<br>" + getLink("Fear") + "(3)"; break;
                case 95:                                     Xenos.Traits += "Malleable"; Xenos.Ag += 10; break;
                case 96:                                     Xenos.Traits += "Winged"; Die = Math.floor(Xenos.Ag/10) + Xenos.Unnatural_Ag; Xenos.Traits += "<br>" + getLink("Flyer") + "(" + Die.toString() +  ")"; break;
                case 97:                                     Xenos.Traits += "Corpulent"; Xenos.Wounds += 5; Xenos.Unnatural_T += Math.floor(Xenos.T/10); break;
                case 98:                                     Xenos.Traits += "Shadow Kin"; Xenos.Traits += "<br>" + getLink("Phase"); Xenos.S -= 10; Xenos.T -= 10; break;
                case 99:                                     Xenos.Traits += "Corrosive Bile"; Xenos.RWeaponName = "Bile"; Xenos.RRange += 1; Xenos.RDamage += 2; Xenos.RQualities += getLink("Tearing") + ", "; Xenos.RDamageType = "Energy"; break;
                case 100:                                    Xenos.Traits += "Hellspawn"; Xenos.Traits += "<br>" + getLink("Daemonic") + "<br>" + getLink("Fear") + "(2)<br>" + getLink("From Beyond"); break;
            }
            Xenos.Traits += "<br>" + getLink("Mutation") + " - ?<br>";
        }

        //creatures of the hadex anomely have a strong chance to grow one mutation
        if(this.Sector == 'H' || input.indexOf('hadex') != -1){
            Mutations += randomInteger(2)-1;
        }
        //creatures of the screaming vortex are covered in mutaitons
        if(this.Sector == 'S' || input.indexOf('vortex') != -1){
            Mutations += randomInteger(2);
        }
        //Mutations are an Exotic Trait, and thus we need to give the creature access to the exotic traits
        ExoticTraits += Mutations;

        //record the xenos type, can be planet, animal, or sentient
        if(input.indexOf('flora') != -1){
            XenosType = "Flora";
        }
        else if(input.indexOf('fauna') != -1){
            XenosType = "Fauna";
        }else if(input.indexOf('native') != -1){
            //Natives are 20x as likely ot have a Fauna base as a Flora Base
            if(randomInteger(21) == 1){
                XenosType = "Flora";
            } else {
                XenosType = "Fauna";
            }
        }
        else {
            //if nothing was selected, select at random
            //don't make it a native unless the GM says so
            //Fauna is 2x as likely to be dangerous to characters as Flora
            switch(randomInteger(3)){
                case 1: XenosType = "Flora"; break;
                case 2: case 3: XenosType = "Fauna"; break;
            }
        }

        //determine civilization type of native species
        if(input.indexOf('native') != -1){
            if(input.indexOf('primitive clans') != -1){
                Xenos.Civilization = 'primitive clans';
            } else if(input.indexOf('pre-industrial') != -1){
                Xenos.Civilization = 'pre-industrial';
            } else if(input.indexOf('basic industry') != -1){
                Xenos.Civilization = 'basic industry';
            } else if(input.indexOf('advanced industry') != -1){
                Xenos.Civilization = 'advanced industry';
            } else if(input.indexOf('colony') != -1
                    || input.indexOf('orbital habitation') != -1
                    || input.indexOf('voidfarers') != -1){
                //colonys, oribtal habitations, and voidfaring all require similar levels of intelligence and technology
                Xenos.Civilization = 'voidfarers';
            } else {
                //randomly generate the Civilization
                switch(randomInteger(5)){
                    case 1: Xenos.Civilization = 'primitive clans';   break;
                    case 2: Xenos.Civilization = 'pre-industrial';    break;
                    case 3: Xenos.Civilization = 'basic industry';    break;
                    case 4: Xenos.Civilization = 'advanced industry'; break;
                    case 5: Xenos.Civilization = 'voidfarers';        break;
                }
            }
        }

        var UniqueName = XenosType + " ";
        if(location != ""){
            UniqueName += location + "-";
        }
        UniqueName += CreatureNumber.toString();

        var OldCreatures = findObjs({ type: 'character', name: UniqueName });

        while(OldCreatures.length > 0){
            CreatureNumber++;
            UniqueName = XenosType + " ";
            if(location != ""){
                UniqueName += location + "-";
            }
            UniqueName += CreatureNumber.toString();
            OldCreatures = findObjs({ type: 'character', name: UniqueName });
        }

        //there is little overlap between the three types, proceed based on the type
        switch(XenosType) {
            case 'Flora':
                //record the plant's size
                if(input.indexOf('diffuse') != -1){
                    XenosSize = 'diffuse';
                } else if(input.indexOf('small') != -1) {
                    XenosSize = 'small';
                } else if(input.indexOf('large') != -1) {
                    XenosSize = 'large';
                } else if(input.indexOf('massive') != -1) {
                    XenosSize = 'massive';
                } else {
                    //determine the size at random
                    switch(randomInteger(10)){
                        case 1: XenosSize = "diffuse"; break;
                        case 2: case 3: case 4: XenosSize = "small"; break;
                        case 5: case 6: case 7: case 8: XenosSize = "large"; break;
                        case 9: case 10: XenosSize = "massive"; break;
                    }
                }

                //record the type of plant
                if(input.indexOf('passive') != -1) {
                    XenosBase = 'passive-trap';
                } else if(input.indexOf('active') != -1) {
                    XenosBase = 'active-trap';
                } else if(input.indexOf('combatant') != -1) {
                    XenosBase = 'combatant';
                } else {
                    switch(randomInteger(3)){
                        case 1: XenosBase = 'passive-trap'; break;
                        case 2: XenosBase = 'active-trap'; break;
                        case 3: XenosBase = 'combatant'; break;
                    }
                }

                //record the habitat of the plant
                if(input.indexOf("death") != -1) {
                    XenosWorld = 'deathworld';
                } else if(input.indexOf("jungle") != -1) {
                    XenosWorld = "jungle";
                } else if(input.indexOf("temperate") != -1) {
                    XenosWorld = "temperate";
                } else if(input.indexOf("ocean") != -1) {
                    XenosWorld = "ocean";
                } else if(input.indexOf("exotic") != -1) {
                    //exotic traits are handled differently as any creature has a small chance of generating one
                    ExoticTraits++;
                } else {
                    switch(randomInteger(4)){
                        case 1: XenosWorld = "deathworld"; break;
                        case 2: XenosWorld = "jungle"; break;
                        case 3: XenosWorld = "temperate"; break;
                        case 4: XenosWorld = "ocean"; break;
                        //Exotic should be a rare and on demand species
                        //case 5: XenosWorld = "exotic"; break;
                    }
                }

                //generate the creature

                //its base stats are determined by its size
                switch(XenosSize){
                    case 'diffuse':
                        Xenos.WS = 30;
                        Xenos.S = 10;
                        Xenos.T = 10;
                        Xenos.Ag = 25;
                        Xenos.Pr = 15;
                        Xenos.Wounds = 24;
                        Xenos.Traits += getLink("Diffuse") + "<br>";
                        Xenos.Traits += getLink("From Beyond") + "<br>";
                        Xenos.Traits += getLink("Natural Weapons") + "<br>";
                        Xenos.Traits += getLink("Size") + "(Enormous)<br>";
                        Xenos.HalfMove += 2;
                        Xenos.Traits += getLink("Strange Physiology") + "<br>";
                        //basic attack
                        Xenos.Damage = 0;
                        Xenos.Pen = 0;
                        switch(randomInteger(3)){
                            case 1: Xenos.DamageType = "Impact"; break;
                            case 2: case 3: Xenos.DamageType = "Rending"; break;
                        }
                        Xenos.WeaponName = "Tendrils";
                    break;
                    case 'small':
                        Xenos.WS = 40;
                        Xenos.S = 35;
                        Xenos.T = 35;
                        Xenos.Ag = 35;
                        Xenos.Pr = 25;
                        Xenos.Wounds = 8;
                        Xenos.Talents += getLink("Sturdy") + "<br>";
                        Xenos.Traits += getLink("From Beyond") + "<br>";
                        Xenos.Traits += getLink("Natural Weapons") + "<br>";
                        Xenos.Traits += getLink("Size") + "(Scrawny)<br>";
                        Xenos.HalfMove -= 1;
                        Xenos.Traits += getLink("Strange Physiology") + "<br>";
                        //basic attack
                        Xenos.Damage = -1;
                        Xenos.Pen = 0;
                        switch(randomInteger(3)){
                            case 1: Xenos.DamageType = "Impact"; break;
                            case 2: case 3: Xenos.DamageType = "Rending"; break;
                        }
                        Xenos.WeaponName = "Tendrils";
                    break;
                    case 'large':
                        Xenos.WS = 50;
                        Xenos.S = 50;
                        Xenos.T = 50;
                        Xenos.Ag = 20;
                        Xenos.Pr = 35;
                        Xenos.Wounds = 20;
                        Xenos.ArmourAll(2);
                        Xenos.Talents += getLink("Sturdy") + "<br>";
                        Xenos.Traits += getLink("From Beyond") + "<br>";
                        Xenos.Traits += getLink("Natural Weapons") + "<br>";
                        Xenos.Traits += getLink("Size") + "(Enormous)<br>";
                        Xenos.HalfMove += 2;
                        Xenos.Traits += getLink("Strange Physiology") + "<br>";
                        //basic attack
                        Xenos.Damage = 1;
                        Xenos.Pen = 0;
                        switch(randomInteger(3)){
                            case 1: case 2: Xenos.DamageType = "Impact"; break;
                            case 3: Xenos.DamageType = "Rending"; break;
                        }
                        Xenos.WeaponName = "Tendrils";
                    break;
                    case 'massive':
                        Xenos.WS = 45;
                        Xenos.S = 65;
                        Xenos.T = 75;
                        Xenos.Ag = 15;
                        Xenos.Pr = 20;
                        Xenos.Wounds = 40;
                        Xenos.ArmourAll(4);
                        Xenos.Talents += getLink("Sturdy") + "<br>";
                        Xenos.Traits += getLink("From Beyond") + "<br>";
                        Xenos.Traits += getLink("Improved Natural Weapons") + "<br>";
                        Xenos.Traits += getLink("Size") + "(Massive)<br>";
                        Xenos.HalfMove += 3;
                        Xenos.Traits += getLink("Strange Physiology") + "<br>";
                        Xenos.Traits += getLink("Swift Attack") + "<br>";
                        //basic attack
                        Xenos.Damage = 3;
                        Xenos.Pen = 0;
                        switch(randomInteger(3)){
                            case 1: case 2: Xenos.DamageType = "Impact"; break;
                            case 3: Xenos.DamageType = "Rending"; break;
                        }
                        Xenos.WeaponName = "Tendrils";
                    break;
                }

                //genereate two random traits based on type
                for(var i = 0; i < 2; i++){
                    switch(XenosBase){
                        case 'passive-trap':
                            switch(randomInteger(10)){
                                case 1: Xenos.Armoured(); break;
                                case 2: Xenos.Deterrent(); break;
                                case 3: Xenos.Frictionless(); break;
                                case 4: Xenos.Sticky(); break;
                                case 5: case 6: Xenos.FoulAura("Soporific"); break;
                                case 7: case 8: Xenos.FoulAura("Toxic"); break;
                                case 9: Xenos.Resilient(); break;
                                case 10: ExoticTraits++; break; //we will roll on the exotic traits later
                            }
                        break;
                        case 'active-trap':
                            switch(randomInteger(10)){
                                case 1: Xenos.Armoured(); break;
                                case 2: Xenos.Deadly(); break;
                                case 3: Xenos.Flexible(); break;
                                case 4: Xenos.Mighty(); break;
                                case 5: Xenos.Sticky(); break;
                                case 6: Xenos.Paralytic(); break;
                                case 7: Xenos.Resilient(); break;
                                case 8: case 9: Xenos.Venomous(); break;
                                case 10: ExoticTraits++; break; //we will roll on the exotic traits later
                            }
                        break;
                        case 'combatant':
                            switch(randomInteger(10)){
                                case 1: Xenos.Armoured(); break;
                                case 2: Xenos.Deadly(); break;
                                case 3: Xenos.Venomous(); break;
                                case 4: Xenos.Deterrent(); break;
                                case 5: Xenos.Mighty(); break;
                                case 5: Xenos.ProjectileAttack(); break;
                                case 6: Xenos.Paralytic(); break;
                                case 7: case 8: Xenos.Resilient(); break;
                                case 9: Xenos.UprootedMovement(); break;
                                case 10: ExoticTraits++; break; //we will roll on the exotic traits later
                            }
                        break;
                    }
                }

                //generate one random trait based on location
                var Die;
                switch(XenosWorld){
                    case 'deathworld':
                    if(XenosBase == 'passive-trap') {
                        Die = randomInteger(7); //passive trap plants cannot generate aggressive traits
                    } else if(XenosBase == 'active-trap'){
                        Die = randomInteger(9); //trap plants cannot generate combatant traits
                    } else {
                        Die = randomInteger(10); //otherwise, generate away!
                    }
                    switch(Die){
                        case 1: case 2: Xenos.Armoured(); break;
                        case 3: Xenos.Deterrent(); break;
                        case 4: Xenos.Disturbing(); break;
                        case 5: Xenos.Resilient(); break;
                        case 6: Xenos.Unkillable(); break;
                        case 7: Xenos.LethalDefences(); break;
                        case 8: Xenos.Deadly(); break;
                        case 9: Xenos.Mighty(); break;
                        case 10: Xenos.UprootedMovement(); break;
                    }
                    //deathworld species generate two traits
                    if(XenosBase == 'passive-trap') {
                        Die = randomInteger(7); //passive trap plants cannot generate aggressive traits
                    } else if(XenosBase == 'active-trap'){
                        Die = randomInteger(9); //trap plants cannot generate combatant traits
                    } else {
                        Die = randomInteger(10); //otherwise, generate away!
                    }
                    switch(Die){
                        case 1: case 2: Xenos.Armoured(); break;
                        case 3: Xenos.Deterrent(); break;
                        case 4: Xenos.Disturbing(); break;
                        case 5: Xenos.Resilient(); break;
                        case 6: Xenos.Unkillable(); break;
                        case 7: Xenos.LethalDefences(); break;
                        case 8: Xenos.Deadly(); break;
                        case 9: Xenos.Mighty(); break;
                        case 10: Xenos.UprootedMovement(); break;
                    }
                    break;
                    case 'jungle':
                    if(XenosBase == 'passive-trap') {
                        Die = randomInteger(8); //passive trap plants cannot generate aggressive traits
                    } else {
                        Die = randomInteger(10); //otherwise, generate away!
                    }
                    switch(Die){
                        case 1: Xenos.Deterrent(); break;
                        case 2: Xenos.Stealthy(); break;
                        case 3: case 4: Xenos.Flexible(); break;
                        case 5: case 6: Xenos.FoulAura("Soporific"); break;
                        case 7: case 8: Xenos.FoulAura("Toxic"); break;
                        case 9: Xenos.Paralytic(); break;
                        case 10: Xenos.Venomous(); break;
                    }
                    break;
                    case 'temperate':
                    switch(randomInteger(10)){
                        case 1: Xenos.Armoured(); break;
                        case 2: Xenos.Venomous(); break;
                        case 3: Xenos.Stealthy(); break;
                        case 4: case 5: Xenos.Deterrent();
                        case 6: Xenos.FoulAura("Soporific"); break;
                        case 7: Xenos.FoulAura("Toxic"); break;
                        case 8: Xenos.ProjectileAttack(); break;
                        case 9: case 10: Xenos.Venomous(); break;
                    }
                    break;
                    case 'ocean':
                    if(XenosBase == 'passive-trap') {
                        Die = randomInteger(5); //passive trap plants cannot generate aggressive traits
                    } else if(XenosBase == 'active-trap'){
                        Die = randomInteger(7); //trap plants cannot generate combatant traits
                    } else {
                        Die = randomInteger(10); //otherwise, generate away!
                    }
                    switch(Die){
                        case 1: case 2: Xenos.Deterrent(); break;
                        case 3: Xenos.Disturbing(); break;
                        case 4: case 5: Xenos.ProjectileAttack(); break;
                        case 6: Xenos.Paralytic(); break;
                        case 7: Xenos.Venomous(); break;
                        case 8: case 9: case 10: Xenos.UprootedMovement(); break;
                    }
                    break;
                }

                //generate final traits with Exotic
                while(ExoticTraits > 0){
                    //If this Exotic Trait should be a Mutation, preset the roll to 10
                    if(Mutations > 0){
                        Die = 10;
                        Mutations--;
                    } else {
                        Die = randomInteger(10);
                    }
                    switch(Die){
                        case 1: case 2: Xenos.Disturbing(); break;
                        case 3: Xenos.LethalDefences(); break;
                        case 4: case 5: Xenos.Silicate(); break;
                        case 6: case 7: Xenos.FadeKind(); break;
                        case 8: case 9: Xenos.Unkillable(); break;
                        case 10: Xenos.Warped(); break;
                    }
                    ExoticTraits--;
                }
                break;

            case 'Fauna':
                //record the type of animal
                if(input.indexOf('avian') != -1) {
                    XenosBase = 'avian';
                } else if(input.indexOf('herd') != -1) {
                    XenosBase = 'herd';
                } else if(input.indexOf('predator') != -1) {
                    XenosBase = 'predator';
                } else if(input.indexOf('scavenger') != -1) {
                    XenosBase = 'scavenger';
                } else if(input.indexOf('swarm') != -1) {
                    XenosBase = 'swarm';
                } else {
                    switch(randomInteger(10)){
                        case 1: case 2: XenosBase = 'avian'; break;
                        case 3: case 4: case 5: XenosBase = 'herd'; break;
                        case 6: case 7: XenosBase = 'predator'; break;
                        case 8: case 9: XenosBase = 'scavenger'; break;
                        case 10: XenosBase = 'swarm'; break;
                    }
                }

                //record the animal's size
                if(input.indexOf('miniscule') != -1){
                    XenosSize = 'miniscule';
                } else if(input.indexOf('puny') != -1) {
                    XenosSize = 'puny';
                } else if(input.indexOf('scrawny') != -1) {
                    XenosSize = 'scrawny';
                } else if(input.indexOf('average') != -1) {
                    XenosSize = 'average';
                } else if(input.indexOf('hulking') != -1) {
                    XenosSize = 'hulking';
                } else if(input.indexOf('enormous') != -1) {
                    XenosSize = 'enormous';
                } else if(input.indexOf('massive') != -1) {
                    XenosSize = 'massive';
                } else {
                    //determine the size at random
                    if(XenosBase != 'swarm'){
                    switch(randomInteger(10)){
                        case 1: XenosSize = "Miniscule"; break;
                        case 2: XenosSize = "Puny"; break;
                        case 3: case 4: XenosSize = "Scawny"; break;
                        case 5: case 6: XenosSize = "Average"; break;
                        case 7: case 8: XenosSize = "Hulking"; break;
                        case 9: XenosSize = "Enormous"; break;
                        case 10: XenosSize = "Massive"; break;
                    }
                    } else {
                    //swarms of xenos must be at least average in size
                    switch(4 + randomInteger(6)){
                        //case 1: XenosSize = "Miniscule"; break;
                        //case 2: XenosSize = "Puny"; break;
                        //case 3: case 4: XenosSize = "Scawny"; break;
                        case 5: case 6: XenosSize = "Average"; break;
                        case 7: case 8: XenosSize = "Hulking"; Xenos.Wounds += 20; break;
                        case 9: XenosSize = "Enormous";        Xenos.Wounds += 40; break;
                        case 10: XenosSize = "Massive";        Xenos.Wounds += 60; break;
                    }
                    }
                }

                //record the habitat of the plant
                if(input.indexOf("death") != -1) {
                    XenosWorld = 'deathworld';
                } else if(input.indexOf("jungle") != -1) {
                    XenosWorld = "jungle";
                } else if(input.indexOf("temperate") != -1) {
                    XenosWorld = "temperate";
                } else if(input.indexOf("ocean") != -1) {
                    XenosWorld = "ocean";
                } else if(input.indexOf("desert") != -1) {
                    XenosWorld = "desert";
                } else if(input.indexOf("ice") != -1) {
                    XenosWorld = "ice";
                } else if(input.indexOf("volcanic") != -1) {
                    XenosWorld = "volcanic";
                } else if(input.indexOf("exotic") != -1) {
                    //exotic traits are handled differently as any creature has a small chance of generating one
                    ExoticTraits++;
                } else {
                    switch(randomInteger(7)){
                        case 1: XenosWorld = "deathworld"; break;
                        case 2: XenosWorld = "jungle"; break;
                        case 3: XenosWorld = "temperate"; break;
                        case 4: XenosWorld = "ocean"; break;
                        case 5: XenosWorld = "desert"; break;
                        case 6: XenosWorld = "ice"; break;
                        case 7: XenosWorld = "volcanic"; break;
                        //Exotic should be a rare and on demand species
                        //default: XenosWorld = "exotic"; break;
                    }
                }

                //generate the creature
                //The Size of the Creauture influences its stats
                if(XenosBase != 'swarm'){
                    switch(XenosSize){
                        case 'Miniscule': Xenos.S -= 25; Xenos.T -= 25; Xenos.Wounds -= 10; Xenos.HalfMove -= 3; break;
                        case 'Puny':      Xenos.S -= 20; Xenos.T -= 20; Xenos.Wounds -= 10; Xenos.HalfMove -= 2; break;
                        case 'Scawny':    Xenos.S -= 10; Xenos.T -= 10; Xenos.Wounds -= 5;  Xenos.HalfMove -= 1; break;
                        case 'Average':   break;
                        case 'Hulking':   Xenos.S += 5;  Xenos.T += 5;  Xenos.Wounds += 5;  Xenos.Ag -= 5;  Xenos.HalfMove += 1; break;
                        case 'Enormous':  Xenos.S += 10; Xenos.T += 10; Xenos.Wounds += 10; Xenos.Ag -= 10; Xenos.HalfMove += 2;break;
                        case 'Massive':   Xenos.S += 20; Xenos.T += 20; Xenos.Wounds += 20; Xenos.Ag -= 20; Xenos.HalfMove += 3; break;
                    }
                }
                Xenos.Traits += getLink("Size") + "(" + XenosSize + ")<br>";

                //each creature has a chance to generate extra arms
                while(randomInteger(5) == 1){
                    Xenos.Arms += 2;
                }
                if(Xenos.Arms > 2){
                    Xenos.Traits += getLink("Multiple Arms") + "(" + Xenos.Arms + ")<br>";
                }

                //each creature has a chance to generate extra legs
                if(XenosBase == 'herd'){
                    Xenos.Legs += 2; //herd beasts are atleast four legged
                }
                while(randomInteger(5) == 1){
                    Xenos.Legs += 2;
                }
                if(Xenos.Legs > 2){
                    Xenos.Traits += getLink("Multiple Legs") + "(" + Xenos.Legs + ")<br>";
                }

                //add in the base profile
                switch(XenosBase){
                    case 'avian':
                        Xenos.WS += 35;
                        Xenos.S  += 30;
                        Xenos.T  += 30;
                        Xenos.Ag += 45;
                        Xenos.It += 15;
                        Xenos.Pr += 45;
                        Xenos.Wp += 30;
                        Xenos.Wounds += 9;
                        Xenos.Awareness++;
                        Xenos.Traits += getLink("Bestial") + "<br>";
                        Xenos.Flyer = true;
                        Xenos.Traits += getLink("Natural Weapons") + "<br>";
                        Xenos.WeaponName = "Talons";
                        Xenos.DamageType = "Rending";
                    break;
                    case 'herd':
                        Xenos.WS += 25;
                        Xenos.S  += 40;
                        Xenos.T  += 45;
                        Xenos.Ag += 25;
                        Xenos.It += 15;
                        Xenos.Pr += 30;
                        Xenos.Wp += 40;
                        Xenos.Wounds += 14;
                        Xenos.Awareness++;
                        Xenos.Traits += getLink("Bestial") + "<br>";
                        Xenos.Traits += getLink("Sturdy") + "<br>";
                        Xenos.Traits += getLink("Natural Weapons") + "<br>";
                        Xenos.WeaponName = "Hooves";
                        Xenos.DamageType = "Impact";
                    break;
                    case 'predator':
                        Xenos.WS += 50;
                        Xenos.S  += 45;
                        Xenos.T  += 40;
                        Xenos.Ag += 40;
                        Xenos.It += 15;
                        Xenos.Pr += 40;
                        Xenos.Wp += 45;
                        Xenos.Wounds += 15;
                        Xenos.Awareness++;
                        Xenos.Skills += getLink("Tracking") + "<br>";
                        Xenos.Talents += getLink("Swift Attack") + "<br>";
                        Xenos.Traits += getLink("Bestial") + "<br>";
                        Xenos.Traits += getLink("Brutal Charge") + "(3)<br>";
                        Xenos.Traits += getLink("Natural Weapons") + "<br>";
                        Xenos.WeaponName = "Claws";
                        Xenos.DamageType = "Rending";
                    break;
                    case 'scavenger':
                        Xenos.WS += 40;
                        Xenos.S  += 35;
                        Xenos.T  += 35;
                        Xenos.Ag += 40;
                        Xenos.It += 15;
                        Xenos.Pr += 40;
                        Xenos.Wp += 35;
                        Xenos.Wounds += 12;
                        Xenos.Awareness++;
                        Xenos.Skills += getLink("Tracking") + "<br>";
                        Xenos.Traits += getLink("Bestial") + "<br>";
                        Xenos.Traits += getLink("Natural Weapons") + "<br>";
                        Xenos.WeaponName = "Fangs";
                        Xenos.DamageType = "Rending";
                    break;
                    case 'swarm':
                        Xenos.WS += 30;
                        Xenos.S  +=  5;
                        Xenos.T  += 10;
                        Xenos.Ag += 35;
                        Xenos.It +=  5;
                        Xenos.Pr += 40;
                        Xenos.Wp += 10;
                        Xenos.Wounds += 10;
                        Xenos.Awareness++;
                        Xenos.Traits += getLink("Bestial") + "<br>";
                        Xenos.Traits += getLink("Fear") + "<br>";
                        Xenos.Traits += getLink("Natural Weapons") + "<br>";
                        Xenos.WeaponName = "Stingers";
                        Xenos.DamageType = "Rending";
                    break;
                }

                //add in random traits due to the Xenos Base
                for(var i = 0; i < 2; i++){
                    switch(XenosBase){
                        case 'avian':
                            switch(randomInteger(10)){
                                case 1: case 2: case 3: Xenos.Deadly(); break;
                                case 4: Xenos.Flexible(); break;
                                case 5: case 6: Xenos.ProjectileAttack(); break;
                                case 7: Xenos.Stealthy(); break;
                                case 8: Xenos.SustainedLife(); break;
                                case 9: Xenos.Swift(); break;
                                case 10: ExoticTraits++; break;
                            }
                        break;
                        case 'herd':
                            switch(randomInteger(10)){
                                case 1: case 2:  Xenos.Armoured(); break;
                                case 3: Xenos.Deterrent(); break;
                                case 4: Xenos.LethalDefences(); break;
                                case 5: Xenos.Mighty(); break;
                                case 6: case 7: Xenos.Resilient(); break;
                                case 8: case 9: Xenos.Swift(); break;
                                case 10: ExoticTraits++; break;
                            }
                        break;
                        case 'predator':
                            switch(randomInteger(10)){
                                case 1: Xenos.Apex(); break;
                                case 2: Xenos.Armoured(); break;
                                case 3: case 4: Xenos.Deadly(); break;
                                case 5: Xenos.Mighty(); break;
                                case 6: if(randomInteger(2) == 1){Xenos.Paralytic();}else{Xenos.Venomous();} break;
                                case 7: Xenos.ProjectileAttack(); break;
                                case 8: Xenos.Stealthy(); break;
                                case 9: Xenos.Swift(); break;
                                case 10: ExoticTraits++; break;
                            }
                        break;
                        case 'scavenger':
                            switch(randomInteger(10)){
                                case 1: Xenos.Crawler(); break;
                                case 2: Xenos.Darkling(); break;
                                case 3: case 4: Xenos.Deadly(); break;
                                case 5: Xenos.Deathdweller(); break;
                                case 6: Xenos.Disturbing(); break;
                                case 7: Xenos.Flexible(); break;
                                case 8: Xenos.Stealthy(); break;
                                case 9: Xenos.Swift(); break;
                                case 10: ExoticTraits++; break;
                            }
                        break;
                        case 'swarm':
                            switch(randomInteger(10)){
                                case 1: Xenos.Crawler(); break;
                                case 2: Xenos.Darkling(); break;
                                case 3: case 4: Xenos.Deadly(); break;
                                case 5: Xenos.Deathdweller(); break;
                                case 6: case 7: Xenos.Deterrent(); break;
                                case 8: case 9: Xenos.Disturbing(); break;
                                case 10: ExoticTraits++; break;
                            }
                        break;
                    }
                }

                switch(XenosWorld){
                    case 'deathworld':
                    switch(randomInteger(10)){
                        case 1: Xenos.Apex(); break;
                        case 2: Xenos.Armoured(); break;
                        case 3: Xenos.Deadly(); break;
                        case 4: Xenos.Deathdweller(); break;
                        case 5: Xenos.Disturbing(); break;
                        case 6: Xenos.LethalDefences(); break;
                        case 7: Xenos.Mighty(); break;
                        case 8: Xenos.Resilient(); break;
                        case 9: Xenos.Swift(); break;
                        case 10: Xenos.Unkillable(); break;
                    }
                    //deathworld species get two traits
                    switch(randomInteger(10)){
                        case 1: Xenos.Apex(); break;
                        case 2: Xenos.Armoured(); break;
                        case 3: Xenos.Deadly(); break;
                        case 4: Xenos.Deathdweller(); break;
                        case 5: Xenos.Disturbing(); break;
                        case 6: Xenos.LethalDefences(); break;
                        case 7: Xenos.Mighty(); break;
                        case 8: Xenos.Resilient(); break;
                        case 9: Xenos.Swift(); break;
                        case 10: Xenos.Unkillable(); break;
                    }
                    break;
                    case 'desert':
                    switch(randomInteger(10)){
                        case 1: Xenos.Crawler(); break;
                        case 2: Xenos.ThermalAdaptation("Cold"); break;
                        case 3: case 4: Xenos.Deathdweller(); break;
                        case 5: case 6: Xenos.Tunneller(); break;
                        default: Xenos.ThermalAdaptation("Heat"); break;
                    }
                    break;
                    case 'ice':
                    switch(randomInteger(10)){
                        case 1: Xenos.Darkling(); break;
                        case 2: case 3: Xenos.Deathdweller(); break;
                        case 4: Xenos.Silicate(); break;
                        case 10: Xenos.Tunneller(); break;
                        default: Xenos.ThermalAdaptation("Cold");
                    }
                    break;
                    case 'jungle':
                    switch(randomInteger(10)){
                        case 1: case 2: Xenos.Amphibious(); break;
                        case 3: case 4: case 5: Xenos.Arboreal(); break;
                        case 6: case 7: Xenos.Crawler(); break;
                        case 8: Xenos.Paralytic(); break;
                        case 9: Xenos.Stealthy(); break;
                        case 10: Xenos.Venomous(); break;
                    }
                    break;
                    case 'ocean':
                    switch(randomInteger(10)){
                        case 1: case 2: case 3: case 4: Xenos.Amphibious(); break;
                        default: Xenos.Aquatic(); break;
                    }
                    break;
                    case 'temperate':
                    switch(randomInteger(10)){
                        case 1: Xenos.Amphibious(); break;
                        case 2: Xenos.Aquatic(); break;
                        case 3: Xenos.Arboreal(); break;
                        case 4: Xenos.Armoured(); break;
                        case 5: Xenos.Crawler(); break;
                        case 6: Xenos.Mighty(); break;
                        case 7: Xenos.Resilient(); break;
                        case 8: Xenos.Stealthy(); break;
                        case 9: Xenos.Swift(); break;
                        case 10: ExoticTraits++; break;
                    }
                    break;
                    case 'volcanic':
                    switch(randomInteger(10)){
                        case 1: Xenos.Armoured(); break;
                        case 2: case 3: Xenos.Deathdweller(); break;
                        case 4: Xenos.SustainedLife(); break;
                        case 10: Xenos.Tunneller(); break;
                        default: Xenos.ThermalAdaptation("Heat"); break;
                    }
                    break;
                }

                //generate final traits with any Exotic points that have built up
                while(ExoticTraits > 0){
                    //If this Exotic Trait should be a Mutation, preset the roll to 10
                    if(Mutations > 0){
                        Die = 10;
                        Mutations--;
                    } else {
                        Die = randomInteger(10);
                    }
                    switch(Die){
                        case 1: Xenos.Amorphous(); break;
                        case 2: Xenos.Darkling(); break;
                        case 3: Xenos.Disturbing(); break;
                        case 4: Xenos.FadeKind(); break;
                        case 5: Xenos.Gestalt(); break;
                        case 6: Xenos.Silicate(); break;
                        case 7: Xenos.SustainedLife(); break;
                        case 8: Xenos.LethalDefences(); break;
                        case 9: Xenos.Unkillable(); break;
                        case 10: Xenos.Warped(); break;
                    }
                    ExoticTraits--;
                }

                break;
            //case 'Native': break;  at base a native will be a flora or fauna
        }

        //add in benefits if the creature is sentient
        if(input.indexOf('native') != -1){
            //first add mind related benefits available to all sentient beings
            if(Xenos.BS <= 0){
                Xenos.BS += randomInteger(30);
            }
            if(Xenos.It <= 0){
                Xenos.It += randomInteger(30);
            } else {
                Xenos.It += randomInteger(10);
            }
            if(Xenos.Wp <= 0){
                Xenos.Wp += randomInteger(30);
            } else {
                Xenos.Wp += randomInteger(10);
            }
            if(Xenos.Fe <= 0){
                Xenos.Fe += randomInteger(30);
            } else {
                Xenos.Fe += randomInteger(10);
            }
            //beings that have evolved past the primitive stage gain an extra boost to their mind
            if(Xenos.Civilization != 'primitive clans'){
                Xenos.BS += randomInteger(30);
                Xenos.It += randomInteger(30);
                Xenos.Wp += randomInteger(30);
                Xenos.Fe += randomInteger(30);
            }
            //determine which weapons this Native Race will get
            //primitive clans are only likely to have melee and thrown weapons
            if(Xenos.Civilization == 'primitive clans'){
                //do they have melee weapons?
                if(randomInteger(100) <= 90){
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = this.RandomWeapon("melee",-3);
                }
                //do they have thrown weapons?
                if(randomInteger(100) <= 50){
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = this.RandomWeapon("thrown",-3);
                }
                //do they have pistol weapons?
                if(randomInteger(100) <= 5){
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = this.RandomWeapon("pistol",-3);
                }
                //do they have basic weapons?
                if(randomInteger(100) <= 5){
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = this.RandomWeapon("basic",-3);
                }
                //do they have heavy weapons?
                if(randomInteger(100) <= 5){
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = this.RandomWeapon("heavy",-3);
                }

            }else{
                //determine the tech level
                switch(Xenos.Civilization){
                    case 'pre-industrial':
                        Xenos.WeaponTech = -2;
                        break;
                    case 'basic industry':
                        Xenos.WeaponTech = -1;
                        break;
                    case 'advanced industry':
                        Xenos.WeaponTech = 0;
                        break;
                    case 'voidfarers':
                        Xenos.WeaponTech = 1;
                        break;
                }

                //do they have melee weapons?
                if(randomInteger(100) <= 50){
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = this.RandomWeapon("melee",Xenos.WeaponTech);
                }
                //do they have thrown weapons?
                if(randomInteger(100) <= 50){
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = this.RandomWeapon("thrown",Xenos.WeaponTech);
                }
                //do they have pistol weapons?
                if(randomInteger(100) <= 50){
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = this.RandomWeapon("pistol",Xenos.WeaponTech);
                }
                //do they have basic weapons?
                if(randomInteger(100) <= 50){
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = this.RandomWeapon("basic",Xenos.WeaponTech);
                }
                //do they have heavy weapons?
                if(randomInteger(100) <= 50){
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = this.RandomWeapon("heavy",Xenos.WeaponTech);
                }
            }
            /*
            //determine the society's weapon tech level
            //weapons of an unknown civilization are wildly unpredictable
            //however the more advanced the civilization's general technology is, the mroe advanced the weapons tend to be
            Xenos.WeaponTech = 0;
            switch(Xenos.Civilization){
                case 'primitive clans':
                    switch(randomInteger(31)){
                        //pre industry weapons 8/31 ~ 26%
                        case 17: case 18: case 19: case 20:
                        case 21: case 22: case 23: case 24:
                            Xenos.WeaponTech = 10 + randomInteger(10);
                        break;
                        //basic industry weapons 4/31 ~ 13%
                        case 25: case 26: case 27: case 28:
                            Xenos.WeaponTech = 20 + randomInteger(10);
                        break;
                        //advanced industry weapons 2/31 ~ 6%
                        case 29: case 30:
                            Xenos.WeaponTech = 30 + randomInteger(10);
                        break;
                        //voidfarer weapons 1/31 ~ 3%
                        case 31:
                            Xenos.WeaponTech = 40 + randomInteger(10);
                        break;
                         //primitive weapons 16/31 ~ 52%
                        default:
                            Xenos.WeaponTech = randomInteger(10);
                        break;
                    }
                    break;
                case 'pre-industrial':
                    switch(randomInteger(19)){
                        //primitive weapons 4/19 ~ 21%
                        case 9: case 10: case 11: case 12:
                            Xenos.WeaponTech = randomInteger(10);
                        break;
                        //basic industry weapons 4/19 ~ 21%
                        case 13: case 14: case 15: case 16:
                            Xenos.WeaponTech = 20 + randomInteger(10);
                        break;
                        //advanced industry weapons 2/19 ~ 11%
                        case 17: case 18:
                            Xenos.WeaponTech = 30 + randomInteger(10);
                        break;
                        //voidfarer weapons 1/19 ~ 5%
                        case 19:
                            Xenos.WeaponTech = 40 + randomInteger(10);
                        break;
                         //pre-industrial weapons 8/19 ~ 42%
                        default:
                            Xenos.WeaponTech = 10 + randomInteger(10);
                        break;
                    }
                    break;
                case 'basic industry':
                    switch(randomInteger(10)){
                        //primitive weapons 1/10 ~ 10%
                        case 1:
                            Xenos.WeaponTech = randomInteger(10);
                        break;
                        //pre-industrial weapons 2/10 ~ 20%
                        case 2: case 3:
                            Xenos.WeaponTech = 10 + randomInteger(10);
                        break;
                        //basic industry weapons 4/10 ~ 40%
                        case 4: case 5: case 6: case 7:
                            Xenos.WeaponTech = 20 + randomInteger(10);
                        break;
                        //advanced industry weapons 2/10 ~ 20%
                        case 8: case 9:
                            Xenos.WeaponTech = 30 + randomInteger(10);
                        break;
                        //voidfarer weapons 1/10 ~ 10%
                        case 10:
                            Xenos.WeaponTech = 40 + randomInteger(10);
                        break;
                    }
                break;
                case 'advanced industry':
                    switch(randomInteger(19)){
                        //voidfarer weapons 4/19 ~ 21%
                        case 9: case 10: case 11: case 12:
                            Xenos.WeaponTech = 40 + randomInteger(10);
                        break;
                        //basic industry weapons 4/19 ~ 21%
                        case 13: case 14: case 15: case 16:
                            Xenos.WeaponTech = 20 + randomInteger(10);
                        break;
                        //pre industrial weapons 2/19 ~ 11%
                        case 17: case 18:
                            Xenos.WeaponTech = 10 + randomInteger(10);
                        break;
                        //primitive weapons 1/19 ~ 5%
                        case 19:
                            Xenos.WeaponTech =  randomInteger(10);
                        break;
                         //advanced industrial weapons 8/19 ~ 42%
                        default:
                            Xenos.WeaponTech = 30 + randomInteger(10);
                        break;
                    }
                    break;
                case 'voidfarers':
                    switch(randomInteger(31)){
                        //advanced industry weapons 8/31 ~ 26%
                        case 17: case 18: case 19: case 20:
                        case 21: case 22: case 23: case 24:
                            Xenos.WeaponTech = 30 + randomInteger(10);
                        break;
                        //basic industry weapons 4/31 ~ 13%
                        case 25: case 26: case 27: case 28:
                            Xenos.WeaponTech = 20 + randomInteger(10);
                        break;
                        //preindustrial weapons 2/31 ~ 6%
                        case 29: case 30:
                            Xenos.WeaponTech = 10 + randomInteger(10);
                        break;
                        //primitive weapons 1/31 ~ 3%
                        case 31:
                            Xenos.WeaponTech =  randomInteger(10);
                        break;
                         //voidfarer weapons 16/31 ~ 52%
                        default:
                            Xenos.WeaponTech = 40 + randomInteger(10);
                        break;
                    }
                break;
            }
            */
            //determine the society's armour tech level
            //the armour of an unknown civilization is widly unpredictable
            //though, those of a more advanced civilization are generally going to have more advanced armour
            Xenos.ArmourTech = 0;
            switch(Xenos.Civilization){
                case 'primitive clans':
                    switch(randomInteger(31)){
                        //pre industry weapons 8/31 ~ 26%
                        case 17: case 18: case 19: case 20:
                        case 21: case 22: case 23: case 24:
                            Xenos.ArmourTech = 10 + randomInteger(10);
                        break;
                        //basic industry weapons 4/31 ~ 13%
                        case 25: case 26: case 27: case 28:
                            Xenos.ArmourTech = 20 + randomInteger(10);
                        break;
                        //advanced industry weapons 2/31 ~ 6%
                        case 29: case 30:
                            Xenos.ArmourTech = 30 + randomInteger(10);
                        break;
                        //voidfarer weapons 1/31 ~ 3%
                        case 31:
                            Xenos.ArmourTech = 40 + randomInteger(10);
                        break;
                         //primitive weapons 16/31 ~ 52%
                        default:
                            Xenos.ArmourTech = randomInteger(10);
                        break;
                    }
                    break;
                case 'pre-industrial':
                    switch(randomInteger(19)){
                        //primitive weapons 4/19 ~ 21%
                        case 9: case 10: case 11: case 12:
                            Xenos.ArmourTech = randomInteger(10);
                        break;
                        //basic industry weapons 4/19 ~ 21%
                        case 13: case 14: case 15: case 16:
                            Xenos.ArmourTech = 20 + randomInteger(10);
                        break;
                        //advanced industry weapons 2/19 ~ 11%
                        case 17: case 18:
                            Xenos.ArmourTech = 30 + randomInteger(10);
                        break;
                        //voidfarer weapons 1/19 ~ 5%
                        case 19:
                            Xenos.ArmourTech = 40 + randomInteger(10);
                        break;
                         //pre-industrial weapons 8/19 ~ 42%
                        default:
                            Xenos.ArmourTech = 10 + randomInteger(10);
                        break;
                    }
                    break;
                case 'basic industry':
                    switch(randomInteger(10)){
                        //primitive weapons 1/10 ~ 10%
                        case 1:
                            Xenos.ArmourTech = randomInteger(10);
                        break;
                        //pre-industrial weapons 2/10 ~ 20%
                        case 2: case 3:
                            Xenos.ArmourTech = 10 + randomInteger(10);
                        break;
                        //basic industry weapons 4/10 ~ 40%
                        case 4: case 5: case 6: case 7:
                            Xenos.ArmourTech = 20 + randomInteger(10);
                        break;
                        //advanced industry weapons 2/10 ~ 20%
                        case 8: case 9:
                            Xenos.ArmourTech = 30 + randomInteger(10);
                        break;
                        //voidfarer weapons 1/10 ~ 10%
                        case 10:
                            Xenos.ArmourTech = 40 + randomInteger(10);
                        break;
                    }
                break;
                case 'advanced industry':
                    switch(randomInteger(19)){
                        //voidfarer weapons 4/19 ~ 21%
                        case 9: case 10: case 11: case 12:
                            Xenos.ArmourTech = 40 + randomInteger(10);
                        break;
                        //basic industry weapons 4/19 ~ 21%
                        case 13: case 14: case 15: case 16:
                            Xenos.ArmourTech = 20 + randomInteger(10);
                        break;
                        //pre industrial weapons 2/19 ~ 11%
                        case 17: case 18:
                            Xenos.ArmourTech = 10 + randomInteger(10);
                        break;
                        //primitive weapons 1/19 ~ 5%
                        case 19:
                            Xenos.ArmourTech =  randomInteger(10);
                        break;
                         //advanced industrial weapons 8/19 ~ 42%
                        default:
                            Xenos.ArmourTech = 30 + randomInteger(10);
                        break;
                    }
                    break;
                case 'voidfarers':
                    switch(randomInteger(31)){
                        //advanced industry weapons 8/31 ~ 26%
                        case 17: case 18: case 19: case 20:
                        case 21: case 22: case 23: case 24:
                            Xenos.ArmourTech = 30 + randomInteger(10);
                        break;
                        //basic industry weapons 4/31 ~ 13%
                        case 25: case 26: case 27: case 28:
                            Xenos.ArmourTech = 20 + randomInteger(10);
                        break;
                        //preindustrial weapons 2/31 ~ 6%
                        case 29: case 30:
                            Xenos.ArmourTech = 10 + randomInteger(10);
                        break;
                        //primitive weapons 1/31 ~ 3%
                        case 31:
                            Xenos.ArmourTech =  randomInteger(10);
                        break;
                         //voidfarer weapons 16/31 ~ 52%
                        default:
                            Xenos.ArmourTech = 40 + randomInteger(10);
                        break;
                    }
                break;
            }
            /*
            //add the weapons based on technology level
            switch(Xenos.WeaponTech){
                //=================
                //PRIMITIVE WEAPONS - Primitive Quality
                //=================
                case 1:  case 2:  break; //even tool use is beyond them, no weapons at all
                case 3:  case 4:
                    //small rocks and branches
                    //thrown rocks

                    //stick
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Stick";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = -2;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "I";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Primitive") + ", ";
                break;
                case 5:  case 6:
                    //bigger is better: large weapons and rock
                    //thrown large rocks
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Large Rock";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "I";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = (Math.floor(Xenos.S/10) + Xenos.Unnatural_S);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Primitive");
                    //large stick
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Large Stick";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "I";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Primitive") + ", " + getLink("Unwieldy");
                break;
                case 7:
                    //sharper rocks and sticks
                    //thrown large rocks
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Sharp Rock";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = -2;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "R";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 3*(Math.floor(Xenos.S/10) + Xenos.Unnatural_S);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Primitive");
                    //large stick
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Sharp Stick";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = -2;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "R";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Primitive");
                break;
                case 8:
                    //bow and arrow
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Bow and Stick";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = -2;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = 1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "R";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 10;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Primitive") + ", " + getLink("Reliable") + ", " + getLink("Inaccurate");
                break;
                case 9:
                    //sticks with sharpened rock head, (spear)
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Spear";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "R";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Primitive");
                break;
                case 10:
                    //arrows with arrowheads
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Bow";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = 1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "R";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 20;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Primitive");
                break;
                //======================
                //PRE-INDUSTRIAL WEAPONS - Primitive Quality
                //======================
                case 12: case 11:
                    //bronze sword
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Bronze Sword";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "R";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Primitive") + ", " + getLink("Balanced");
                break;
                case 14: case 13:
                    //iron sword
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Iron Sword";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = 1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "R";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Primitive") + ", " + getLink("Balanced");
                break; //iron age
                case 16: case 15:
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Steel Sword";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = 1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "R";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Primitive") + ", " + getLink("Balanced");
                break;
                case 17:
                    //long bow
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Long Bow";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = 1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "R";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 30;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Primitive");
                break;
                case 18:
                    //crossbow
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Crossbow";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 2;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = 1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "R";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 10;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Primitive");
                break; //crossbow
                case 19:
                    //guns, pistols
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Pistol";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = 2;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = 1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "I";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 15;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Inaccurate") + ", " + getLink("Primitive");
                break;
                case 20:
                    //cannon
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Cannon";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = 4;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = 1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "I";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 35;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Inaccurate") + ", " + getLink("Primitive");
                break;
                //======================
                //BASIC INDUSTRY WEAPONS
                //======================
                case 21:
                    //multi-person machine guns - primitive
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Stationary Machine Gun";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = 2;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "I";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = 100;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Semi = 4;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 50;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Inaccurate") + ", " + getLink("Primitive");
                break;
                case 22:
                    //multi-shot guns - primitive
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Personal Machine Gun";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = 2;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = 30;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "I";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Semi = 3;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 30;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Inaccurate") + ", " + getLink("Primitive");
                break;
                case 23:
                    //grenades
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Grenade";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(5)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "X";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 3 * (Math.floor(Xenos.S/10) + Xenos.Unnatural_S);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Blast") + "(" + randomInteger(5) + ")";
                break; //grenades
                case 24:
                    //bombs
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Bomb";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(11)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(6)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "X";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = (Math.floor(Xenos.S/10) + Xenos.Unnatural_S);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Blast") + "(" + randomInteger(10) + ")";
                break;
                case 25:
                    //single person machine guns
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Machinegun";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(5)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(5)*10;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "I";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Semi = 1+randomInteger(3);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(30)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Inaccurate") + ", " + getLink("Primitive");
                break;
                case 26:
                    //flame weapon
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Flamer";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(5)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(20);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "E";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(10)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Spray") + ", " + getLink("Flame");
                break;
                case 27:
                    //chemical weapons
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Acid Spray";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(5)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(20);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "E";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(10)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Spray") + ", " + getLink("Toxic");
                break;
                case 28:
                    //advanced single shot guns!
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Rifle";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(5)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(5)*10;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "I";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(30)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = "";
                break;
                case 29:
                    //advanced machine guns - not primitive!
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Autogun";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(5)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(5)*10;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "I";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Semi = 1+randomInteger(3);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(30)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = "";
                break;
                case 30:
                    //radioactive weapons
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Radbeam";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(11)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(11)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(10);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "E";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(10)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Irradiated");
                break;
                //=========================
                //ADVANCED INDUSTRY WEAPONS
                //=========================
                case 31:
                    //autogun with motion predictor
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Autogun Motion Predictor";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(5)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(5)*10;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "I";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Semi = 1+randomInteger(3);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(30)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Motion Predictor");
                break;
                case 32:
                    //autogun with anti-armoour rounds
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Anti-Armour Autogun";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 2+randomInteger(4);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(5)*10;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "R";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Semi = 1+randomInteger(3);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(30)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = "";
                break;
                case 33:
                    //sniper rifles
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Sniper Rifle";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(4)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 2+randomInteger(6);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(5)*10;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "I";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(30)*10;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Accurate") + ", " + getLink("Reliable") + getLink("Silencer");
                break;
                case 34:
                    //full auto hand held weaponry
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Autogun Mk2";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(5)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(5)*10;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "I";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Semi = 1+randomInteger(3);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Full = 4+randomInteger(6);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(30)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = "";
                break;
                case 35:
                    //single fire las weaponry
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Lasrifle";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(5)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(5)*40;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "E";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(30)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Reliable");
                break;
                case 36:
                    //rapid fire las weaponry
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Lasgun";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(5)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(5)*40;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "E";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Semi = 1+randomInteger(3);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(30)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Reliable");
                break;
                case 37:
                    //large chain weapons
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Chain Hammer";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(11)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "R";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Tearing") + ", " + getLink("Unwieldy");
                break;
                case 38:
                    //balanced chain weapons
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Chain Sword";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "R";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Tearing") + ", " + getLink("Balanced");
                break;
                case 39:
                    //Unwieldy Shock weapons
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Thunder Hammer";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(11)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "I";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Shocking") + ", " + getLink("Unwieldy");
                break;
                case 40:
                    //Balanced Shock Weapons
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Shock Batton";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "I";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Shocking") + ", " + getLink("Balanced");
                break;
                //==================
                //VOID FARER WEAPONS
                //==================
                case 41:
                    //Single Shot Bolter
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Boltrifle";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(11)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(9)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(5)*40;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "X";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(30)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Tearing");
                break;
                case 42:
                    //Rapid Fire Bolter Weapons
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Boltrifle";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(11)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(9)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(5)*40;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "X";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Semi = 1+randomInteger(3);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(30)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Tearing");
                break;
                case 43:
                    //Unbalanced Power Weapons
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Power Fist";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(11)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "E";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Power Field") + ", " + getLink("Unwieldy");
                break;
                case 44:
                    //Balanced Power Weapons
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Power Sword";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "E";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Power Field") + ", " + getLink("Balanced");
                break;
                case 45:
                    //Single Shot Plasma Weapons
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Plasmarifle";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(12);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(12);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(5)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "E";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(30)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Overheats") + ", " + getLink("Blast") + "(" + randomInteger(3) + ")";
                break;
                case 46:
                    //Rapid Fire Plasma Weapons
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Plasmarifle";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(12);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(12);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(5)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "E";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Semi = 1 + randomInteger(3);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(30)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Overheats") + ", " + getLink("Blast") + "(" + randomInteger(3) + ")";
                break;
                case 47:
                    //Single Shop Melta Weapons
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Melta Rifle";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(15)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(25)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(5)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "E";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(5)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Melta");
                break;
                case 48:
                    //Rapid Fire Melta Weapons
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Meltagun";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(15)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(25)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Clip = randomInteger(5)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "E";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Semi = 1 + randomInteger(3);
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = randomInteger(5)*5;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Melta");
                break;
                case 49:
                    //Unbalanced Force Weapons
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Force Hammer";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(11)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "E";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Force") + ", " + getLink("Unwieldy");
                break;
                case 50:
                    //Balanced Force Weapons
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length] = {};
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].WeaponName = "Force Sword";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Damage = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Pen = randomInteger(3)-1;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].DamageType = "E";
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Range = 0;
                    Xenos.NativeWeapons[Xenos.NativeWeapons.length - 1].Qualities = getLink("Force") + ", " + getLink("Balanced");
                break;
            }
            */
            //determine the name and the strength of the native's armour
            var ArmourBase = 0;
            switch(Xenos.ArmourTech){
                //=====================
                //PRIMITIVE CLAN ARMOUR
                //=====================
                case 1: case 2: case 3: case 4: case 5:
                    //still running around naked
                    Xenos.ArmourName = "Warpaints";
                break;
                case 6: case 7: case 8: case 9: case 10:
                    Xenos.ArmourName = "Hides";
                    ArmourBase = 1;
                break;
                //===================
                //PRE-INDUSTRY ARMOUR
                //===================
                case 11: case 12:
                    Xenos.ArmourName = "Bronze Armour";
                    ArmourBase = 1;
                    //slows the native down
                    Xenos.Ag -= 15;
                break;
                case 13: case 14:
                    Xenos.ArmourName = "Iron Armour";
                    ArmourBase = 2;
                    //slows the native down
                    Xenos.Ag -= 15;
                break;
                case 15: case 16:
                    Xenos.ArmourName = "Bronze Armour";
                    ArmourBase = 2;
                    //doesn't slow the native down as much
                    Xenos.Ag -= 5;
                break;
                case 17: case 18: case 19: case 20:
                    //native wear's colourful clothing that offers no combat benefit
                    Xenos.ArmourName = "Colourful Cloth";
                break;
                //=====================
                //BASIC INDUSTRY ARMOUR
                //=====================
                case 21: case 22: case 23: case 24: case 25:
                case 26: case 27: case 28: case 29: case 30:
                    //native wear's clothing that offers no protection, but does help it with concealment
                    Xenos.ArmourName = "Camouflage";
                break;
                //========================
                //ADVANCED INDUSTRY ARMOUR
                //========================
                case 31: case 32:
                    Xenos.ArmourName = "Bullet Proof Vest";
                    ArmourBase = 2;
                break;
                case 33: case 34:
                    //flack armour
                    Xenos.ArmourName = "Flack Cloak";
                    ArmourBase = 3;
                break;
                case 35: case 36:
                    //flack armour
                    Xenos.ArmourName = getLink("Flack Armour");
                    //armour everything but the head
                    ArmourBase = 3;
                break;
                case 37: case 38:
                    //mesh armour
                    Xenos.ArmourName = "Mesh Armour";
                    ArmourBase = 4;
                break;
                case 39: case 40:
                    //mesh armour
                    Xenos.ArmourName = getLink("Reflective") +  " Mesh";
                    ArmourBase = 4;
                break;
                //================
                //VOIDFARER ARMOUR
                //================
                case 41: case 42: case 43:
                    //carapace armour
                    Xenos.ArmourName = "Light Carapace Armour";
                    ArmourBase = 5;
                break;
                case 44: case 45: case 46:
                    //carapace armour
                    Xenos.ArmourName = "Heavy Carapace Armour";
                    ArmourBase = 6;
                    Xenos.Ag -= 5;
                break;
                case 47: case 48:
                    //power armour
                    Xenos.ArmourName = "Light Power Armour";
                    ArmourBase = 7;
                    Xenos.S += 10;
                break;
                case 49:
                    //power armour
                    Xenos.ArmourName = "Power Armour";
                    ArmourBase = 8;
                    Xenos.S += 20;
                break;
                case 50:
                    //terminator armour
                    Xenos.ArmourName = "Terminator Armour";
                    ArmourBase = 10;
                    Xenos.S += 30;
                break;
            }
            //equip the armour
            //and note where the armour is being equipped
            Xenos.ArmourName += " ";
            //armour is sometimes worn on the head
            if(randomInteger(3) != 1){
                Xenos.Armour_H += ArmourBase;
                Xenos.ArmourName += "H/"
            }
            //armour is often worn on the body
            if(randomInteger(10) != 1){
                Xenos.Armour_B += ArmourBase;
                Xenos.ArmourName += "B/"
            }
            //armour is sometimes worn on the arms
            if(randomInteger(3) != 1){
                Xenos.Armour_LA += ArmourBase;
                Xenos.Armour_RA += ArmourBase;
                //rarely armour will be worn on only one of the arms
                if(randomInteger(10) == 1){
                    //pick an arm to take the armour off
                    if(randomInteger(2) == 1){
                        Xenos.Armour_LA -= ArmourBase;
                        //there is only armour on the right arm
                        Xenos.ArmourName += "RA/";
                    } else {
                        Xenos.Armour_RA -= ArmourBase;
                        //there is only armour on the left arm
                        Xenos.ArmourName += "LA/";
                    }
                } else {
                    //the armour was kept on both arms
                    Xenos.ArmourName += "A/";
                }
            }
            //armour is sometimes worn on the legs
            if(randomInteger(3) != 1){
                Xenos.Armour_LL += ArmourBase;
                Xenos.Armour_RL += ArmourBase;
                //rarely armour will be worn on only one of the legs
                if(randomInteger(10) == 1){
                    //pick a leg to take the armour off
                    if(randomInteger(2) == 1){
                        Xenos.Armour_LL -= ArmourBase;
                        //there is only armour on the right leg
                        Xenos.ArmourName += "RL/";
                    } else {
                        Xenos.Armour_RL -= ArmourBase;
                        //there is only armour on the left leg
                        Xenos.ArmourName += "LL/";
                    }
                } else {
                    //the armour was kept on both legs
                    Xenos.ArmourName += "L/";
                }
            }
            //remove the last character of the Name for trimming purposes
            Xenos.ArmourName = Xenos.ArmourName.substr(0,Xenos.ArmourName.length-1);
            //add language based on NOTHING
            var languages = 1;
            Xenos.Language = "";
            while(languages > 0){
                //generate a random language structure
                switch(randomInteger(15)){
                    case 1:  Xenos.Language += "High Gothic Competancy";      break;
                    case 2:  Xenos.Language += "Low Gothic Relic";            break;
                    case 3:  Xenos.Language += "Orkish Roots";                break;
                    case 4:  Xenos.Language += "Ancient Eldar Heritage";      break;
                    case 5:  Xenos.Language += "Necrontyr Grammer Structure"; break;
                    case 6:  Xenos.Language += "Telepathic";                  break;
                    case 7:  Xenos.Language += "Chameleon Surfaces";          break;
                    case 8:  Xenos.Language += "Sublte Facial Movements";     break;
                    case 9:  Xenos.Language += "Appendage Facilitated";       break;
                    case 10: Xenos.Language += "Full Body";                   break;
                    case 11: Xenos.Language += "Intuitive Communicators";     break;
                    case 12: Xenos.Language += "Ultra High Frequency";        break;
                    case 13: Xenos.Language += "Sub Audible";                 break;
                    case 14: Xenos.Language += "Compound"; languages += 2;    break;
                    case 15: Xenos.Language += "Multi-lingual"; languages += 2; break;
                }
                Xenos.Language += ", ";
                languages--;
            }
            //delete the last comma and space
            Xenos.Language = Xenos.Language.substring(0,Xenos.Language.length-2);
            //add culture based on NOTHING
            switch(randomInteger(10)){
                case 1:  Xenos.Culture = "Merchant"; break;
                case 2:  Xenos.Culture = "Hunter"; break;
                case 3:  Xenos.Culture = "Feudal"; break;
                case 4:  Xenos.Culture = "Raider"; break;
                case 5:  Xenos.Culture = "Nomadic"; break;
                case 6:  Xenos.Culture = "Hivemind"; break;
                case 7:  Xenos.Culture = "Scavenger"; break;
                case 8:  Xenos.Culture = "Theocracy"; break;
                case 9:  Xenos.Culture = "Tradition"; break;
                case 10: Xenos.Culture = "Cannibal"; break;
            }
        }

        //Calcuate Burrower
        if(Xenos.Burrower > 0){
            Die = Xenos.Unnatural_S + Math.floor(Xenos.S/10); //start with the creature's strength bonus
            Die += 2*(Xenos.Burrower-1); //Add 2 Burrower for each instane of the trait
            Xenos.Traits += getLink("Burrower") + "(" + Die.toString() + ")"; //Write it down
        }
        if(Xenos.Climb >= 0){
            Xenos.Skills += getLink("Climb");
            if(Xenos.Climb > 0){
                Die = Xenos.Climb * 10;
                Xenos.Skill += "+" + Die.toString();
            }
            Xenos.Skills += "<br>";
        }
        if(Xenos.Swim >= 0){
            Xenos.Skills += getLink("Swim");
            if(Xenos.Swim > 0){
                Die = Xenos.Swim * 10;
                Xenos.Skill += "+" + Die.toString();
            }
            Xenos.Skills += "<br>";
        }
        if(Xenos.Concealment >= 0){
            Xenos.Skills += getLink("Concealment");
            if(Xenos.Concealment > 0){
                Die = Xenos.Concealment * 10;
                Xenos.Skill += "+" + Die.toString();
            }
            Xenos.Skills += "<br>";
        }
        if(Xenos.SilentMove >= 0){
            Xenos.Skills += getLink("Silent Move");
            if(Xenos.SilentMove > 0){
                Die = Xenos.SilentMove * 10;
                Xenos.Skill += "+" + Die.toString();
            }
            Xenos.Skills += "<br>";
        }
        if(Xenos.Shadowing >= 0){
            Xenos.Skills += getLink("Shadowing");
            if(Xenos.Shadowing > 0){
                Die = Xenos.Shadowing * 10;
                Xenos.Skill += "+" + Die.toString();
            }
            Xenos.Skills += "<br>";
        }
        if(Xenos.Dodge >= 0){
            Xenos.Skills += getLink("Dodge");
            if(Xenos.Dodge > 0){
                Die = Xenos.Dodge * 10;
                Xenos.Skill += "+" + Die.toString();
            }
            Xenos.Skills += "<br>";
        }
        if(Xenos.Awareness >= 0){
            Xenos.Skills += getLink("Awareness");
            if(Xenos.Awareness > 0){
                Die = Xenos.Awareness * 10;
                Xenos.Skill += "+" + Die.toString();
            }
            Xenos.Skills += "<br>";
        }
        if(Xenos.Flyer){
            var flyerSpeed = 2*(Math.floor(Xenos.Ag/10) + Xenos.Unnatural_Ag);
             Xenos.Traits += getLink("Flyer") + "(" + flyerSpeed.toString() + ")<br>";
        }
        //calculate movement if not a plant, plants don't move (but walking plants do!)
        if(XenosType != 'flora' || Xenos.Traits.indexOf("Uprooted Movement") != -1){
            //Ag+Unnatural Ag
            Xenos.HalfMove += Math.floor(Xenos.Ag/10) + Xenos.Unnatural_Ag;
            //Size was already accounted for
            //Be sure teh creature can move
            if(Xenos.HalfMove <= 0){Xenos.HalfMove = 1;}
            //Multiple Legs
            Xenos.HalfMove *= Xenos.Legs;
            Xenos.HalfMove /= 2;

            //Calculate the other movement rates from this base move
            Xenos.FullMove = 2*Xenos.HalfMove;
            Xenos.Charge   = 3*Xenos.HalfMove;
            Xenos.Run      = 6*Xenos.HalfMove;
        } else {
            //potted plants don't move!
            Xenos.HalfMove = 0;
        }

        //create the character sheet
        NewXenos = createObj("character", {
            name: UniqueName
        });

        //Compile the Weapons Stats
        //Check to see if the weapon is primitive
        if(Xenos.Traits.indexOf("Improved Natural Weapons") == -1){
            Xenos.Qualities += getLink("Primitive") + ", ";
        }
        //convert the creatures attack into text and save it in Xenos.Weapons
        Xenos.Weapons = Xenos.WeaponName + " (D10";
        Die = Xenos.Damage + Xenos.Unnatural_S + Math.floor(Xenos.S/10);
        if(Die > 0){
            Xenos.Weapons += "+" + Die.toString();
        } else if(Die < 0){
            Xenos.Weapons += Die.toString();
        }
        if(Xenos.DamageType == "Explosive" || Xenos.DamageType.length == 0){
            Xenos.Weapons += " " + getLink("X");
        } else {
            Xenos.Weapons += " " + getLink(Xenos.DamageType[0]);
        }
        Xenos.Weapons += "; Pen " + Xenos.Pen;
        if(Xenos.Qualities.length > 2){
            Xenos.Weapons += "; "  + Xenos.Qualities.substring(0,Xenos.Qualities.length-2);
        }
        Xenos.Weapons += ")<br>";

        //convert to ability
        var AbilityText = "/w gm - @{character_name} deals [[";
        if(Xenos.Qualities.indexOf("Tearing") != -1){
            AbilityText += "2D10k1"
        } else{
            AbilityText += "D10"
        }
        AbilityText += "+" + Xenos.Damage.toString() + "]] ";
        switch(Xenos.DamageType){
            case "I": AbilityText += "Impact"; break;
            case "R": AbilityText += "Rending"; break;
            case "E": AbilityText += "Energy"; break;
            case "X": AbilityText += "Explosive"; break;
        }
        AbilityText += " Damage, ";
        AbilityText += "[[" + Xenos.Pen + "]] Pen";
        if(Xenos.Qualities.length > 2){
            AbilityText += ", "  + Xenos.Qualities.substring(0,Xenos.Qualities.length-2);
        }
        AbilityText += " with " + Xenos.WeaponName;
        createObj("ability", {
            name: Xenos.WeaponName,
            action: AbilityText,
            istokenaction: true,
            characterid: NewXenos.id
        });

        //be sure there is a ranged attack to detail
        if(Xenos.RRange != 0){
            //convert to text
            Xenos.Weapons += Xenos.RWeaponName;
            Xenos.Weapons += " (" + Xenos.RRange + "m; S/-/-;";
            Xenos.Weapons += " D10";
            if(Xenos.Damage > 0){
                Xenos.Weapons += "+" + Xenos.RDamage.toString();
            } else if(Xenos.RDamage < 0){
                Xenos.Weapons += Xenos.RDamage.toString();
            }
            if(Xenos.RDamageType == "Explosive" || Xenos.RDamageType.length == 0){
                Xenos.Weapons += " " + getLink("X");
            } else {
                Xenos.Weapons += " " + getLink(Xenos.RDamageType[0]);
            }
            Xenos.Weapons += "; Pen " + Xenos.RPen;
            if(Xenos.RQualities.length > 2){
                Xenos.Weapons += "; "  + Xenos.RQualities.substring(0,Xenos.RQualities.length-2);
            }
            Xenos.Weapons += ")<br>";

            //convert to ability
            AbilityText = "/w gm - @{character_name} deals [[";
            if(Xenos.RQualities.indexOf("Tearing") != -1){
                AbilityText += "2D10k1"
            } else{
                AbilityText += "D10"
            }
            AbilityText += "+" + Xenos.RDamage.toString() + "]] ";
            switch(Xenos.RDamageType){
                case "I": AbilityText += "Impact"; break;
                case "R": AbilityText += "Rending"; break;
                case "E": AbilityText += "Energy"; break;
                case "X": AbilityText += "Explosive"; break;
            }
            AbilityText += " Damage, ";
            AbilityText += "[[" + Xenos.RPen + "]] Pen";
            if(Xenos.RQualities.length > 2){
                AbilityText += ", "  + Xenos.RQualities.substring(0,Xenos.RQualities.length-2);
            }
            AbilityText += " with " + Xenos.RWeaponName;
            createObj("ability", {
                name: Xenos.RWeaponName,
                action: AbilityText,
                istokenaction: true,
                characterid: NewXenos.id
            });
        }

        //step through all the native weapons
        for(weaponIndex = 0; weaponIndex < Xenos.NativeWeapons.length; weaponIndex++){
            //write out the details of the weapon
            Xenos.Weapons += Xenos.NativeWeapons[weaponIndex].WeaponName + " (";
            //detail the range of the weapon
            if(Xenos.NativeWeapons[weaponIndex].Range > 0){
                //add the range of the weapon
                Xenos.Weapons += Xenos.NativeWeapons[weaponIndex].Range.toString() + "m; ";
                //can this weapon fire on single?
                if(Xenos.NativeWeapons[weaponIndex].Single){
                    Xenos.Weapons += "S";
                }else{
                    Xenos.Weapons += "-";
                }

                Xenos.Weapons += "/";
                //detail the number of semi auto shots
                if(Xenos.NativeWeapons[weaponIndex].Semi > 0){
                    Xenos.Weapons += Xenos.NativeWeapons[weaponIndex].Semi.toString();
                } else {
                    Xenos.Weapons += "-";
                }
                Xenos.Weapons += "/";
                //detail the number of full auto shots
                if(Xenos.NativeWeapons[weaponIndex].Full > 0){
                    Xenos.Weapons += Xenos.NativeWeapons[weaponIndex].Full.toString();
                } else {
                    Xenos.Weapons += "-";
                }
                Xenos.Weapons += "; ";
            //is the weapon thrown?
            }else if(Xenos.NativeWeapons[weaponIndex].Range < 0){
                //multiply the range by the creature's strength bonus
                Xenos.Weapons += (-Xenos.NativeWeapons[weaponIndex].Range * (Xenos.Unnatural_S + Math.floor(Xenos.S/10))).toString() + "m; ";
            }
            //detail the damage
            //is the weapon using D5s?
            if(Xenos.NativeWeapons[weaponIndex].DiceNum == 0){
                Xenos.Weapons +=  "D5";
            //is the weapon usingjust one D10?
            }else if(Xenos.NativeWeapons[weaponIndex].DiceNum == 1){
                Xenos.Weapons +=  "D10";
            //otherwise, show how many D10s the wepaon is using
            }else{
                Xenos.Weapons += Xenos.NativeWeapons[weaponIndex].DiceNum.toString() + "D10";
            }

            var totalDamage = Xenos.NativeWeapons[weaponIndex].Damage;
            //melee weapons have S bonus added to their damage
            if(Xenos.NativeWeapons[weaponIndex].Range == 0){
                totalDamage += Math.floor(Xenos.S/10) + Xenos.Unnatural_S;
            }
            if(totalDamage > 0){
                Xenos.Weapons += "+" + totalDamage.toString();
            } else if(totalDamage < 0){
                Xenos.Weapons += totalDamage.toString();
            }

            //detail the damage type
            Xenos.Weapons += " " + getLink(Xenos.NativeWeapons[weaponIndex].DamageType);
            Xenos.Weapons += "; Pen " + Xenos.NativeWeapons[weaponIndex].Pen.toString();
            if(Xenos.NativeWeapons[weaponIndex].Qualities.length != ""){
                Xenos.Weapons += "; " + Xenos.NativeWeapons[weaponIndex].Qualities;
            }
            Xenos.Weapons += ")<br>";

            //create a token ability for this weapon
            //convert to ability
            AbilityText = "/w gm - @{character_name} deals [[";
            //does this weapon have tearing?
            if(Xenos.NativeWeapons[weaponIndex].Qualities.indexOf("Tearing") != -1){
                 //detail the damage
                //is the weapon using D5s?
                if(Xenos.NativeWeapons[weaponIndex].DiceNum == 0){
                    AbilityText +=  "2D5k1";
                //otherwise, show how many D10s the wepaon is using
                }else{
                    AbilityText += (1+Xenos.NativeWeapons[weaponIndex].DiceNum).toString() + "D10";
                }
            } else{
                //detail the damage
                //is the weapon using D5s?
                if(Xenos.NativeWeapons[weaponIndex].DiceNum == 0){
                    AbilityText +=  "D5";
                //otherwise, show how many D10s the wepaon is using
                }else{
                    AbilityText += Xenos.NativeWeapons[weaponIndex].DiceNum.toString() + "D10";
                }
            }
            AbilityText += "+" + totalDamage.toString() + "]] ";
            switch(Xenos.NativeWeapons[weaponIndex].DamageType){
                case "I": AbilityText += "Impact"; break;
                case "R": AbilityText += "Rending"; break;
                case "E": AbilityText += "Energy"; break;
                case "X": AbilityText += "Explosive"; break;
            }
            AbilityText += " Damage, ";
            AbilityText += "[[" + Xenos.NativeWeapons[weaponIndex].Pen + "]] Pen";
            if(Xenos.NativeWeapons[weaponIndex].Qualities != ""){
                AbilityText += ", "  + Xenos.NativeWeapons[weaponIndex].Qualities;
            }
            AbilityText += " with a(n) " + Xenos.NativeWeapons[weaponIndex].WeaponName;
            createObj("ability", {
                name: Xenos.NativeWeapons[weaponIndex].WeaponName,
                action: AbilityText,
                istokenaction: true,
                characterid: NewXenos.id
            });
        }

        //Compile the GM Notes
        //start with the classifications of this xenos
        Xenos.gmnotes += "<strong>Type</strong>: " + XenosType + "<br>";
        Xenos.gmnotes += "<strong>Size</strong>: " + XenosSize + "<br>";
        Xenos.gmnotes += "<strong>Base</strong>: " + XenosBase + "<br>";
        Xenos.gmnotes += "<strong>World</strong>: " + XenosWorld + "<br>";
        //note the civilized classifications if the nexos is civilized
        if(Xenos.Civilization != ""){
            Xenos.gmnotes += "<strong>Civilization</strong>: " + Xenos.Civilization + "<br>";
            Xenos.gmnotes += "<strong>Culture</strong>: " + Xenos.Culture + "<br>";
            Xenos.gmnotes += "<strong>Language</strong>: " + Xenos.Language + "<br>";
        }



        //Movement
        //setup the title row
        Xenos.gmnotes += "<br><table><tbody><tr><td><strong>Half</strong></td><td><strong>Full</strong></td><td><strong>Charge</strong></td><td><strong>Run</strong></td></tr>";
        //add the Half Move
        Xenos.gmnotes += "<tr><td>" + Xenos.HalfMove + "</td>";
        //add the Full Move
        Xenos.gmnotes += "<td>" + Xenos.FullMove + "</td>";
        //add the Charge Move
        Xenos.gmnotes += "<td>" + Xenos.Charge + "</td>";
        //add the Run Move
        Xenos.gmnotes += "<td>" + Xenos.Run + "</td>";
        //close up the table
        Xenos.gmnotes += "</tbody></table>";

        //Weapons
        Xenos.gmnotes += "<br><strong><u>Weapons</u></strong><br>" + Xenos.Weapons;

        //Gear
        Xenos.gmnotes += "<br><strong><u>Gear</u></strong><br>";
        //if this creature is civilized, list their armour (however insignificant it may be)
        if(Xenos.Civilization != ""){
            Xenos.gmnotes += Xenos.ArmourName + "<br>";
        }

        //Talents
        Xenos.gmnotes += "<br><strong><u>Talents</u></strong><br>" + Xenos.Talents;
        //Traits
        Xenos.gmnotes += "<br><strong><u>Traits</u></strong><br>" + Xenos.Traits;
        //Skills
        Xenos.gmnotes += "<br><strong><u>Skills</u></strong><br>" + Xenos.Skills;

        //record the GM Notes
        NewXenos.set('gmnotes',Xenos.gmnotes);

        //Bring stats to their minimum, and if they are already past that, add D5-1 for a bit of uncertainty
        if(Xenos.WS <= 0){Xenos.WS = 0}else{Xenos.WS += randomInteger(5)-1;}
        if(Xenos.BS <= 0){Xenos.BS = 0}else{Xenos.BS += randomInteger(5)-1;}
        if(Xenos.S  <= 0){Xenos.S  = 0}else{Xenos.S  += randomInteger(5)-1;}
        if(Xenos.T  <= 0){Xenos.T  = 0}else{Xenos.T  += randomInteger(5)-1;}
        if(Xenos.Ag <= 0){Xenos.Ag = 0}else{Xenos.Ag += randomInteger(5)-1;}
        if(Xenos.Wp <= 0){Xenos.Wp = 0}else{Xenos.Wp += randomInteger(5)-1;}
        if(Xenos.Pr <= 0){Xenos.Pr = 0}else{Xenos.Pr += randomInteger(5)-1;}
        if(Xenos.It <= 0){Xenos.It = 0}else{Xenos.It += randomInteger(5)-1;}
        if(Xenos.Fe <= 0){Xenos.Fe = 0}else{Xenos.Fe += randomInteger(5)-1;}

        if(Xenos.Wounds <= 3){Xenos.Wounds = 3}else{Xenos.Wounds += randomInteger(5)-1;}

        //calculate the total toughness bonus and save it as the Fatigue cap
        Xenos.Fatigue = Math.floor(Xenos.T/10) + Xenos.Unnatural_T;
//=========================================================================================
        //Feature not available yet :(
        //create the default token for the Xenos from the 'Ahh! A Monster Blueprint!' Character Sheet
        //var Blueprint = findObjs({type: 'character', name: "Ahh! A Monster Blueprint!"})[0];
        //var Token = carefulParse(Blueprint._defaulttoken) || {};

        //Link the token to the sheet
        //Token.represents = NewXenos.id;

        //Record the Xenos' name
        //Token.name = UniqueName;

        //setup the token bars that are seen by the players
        //Token.bar1_vaule = 0;
        //Token.bar1_max = Xenos.Fatigue.toString();
        //Token.bar2_vaule = 0;
        //Token.bar2_max   = 0;
        //Token.bar3_vaule = Xenos.Wounds.toString();
        //Token.bar3_max   = Xenos.Wounds.toString();

        //record the default token
        //NewXenos.set("defaulttoken", JSON.stringify(Token));
//=========================================================================================

        //Potential work around, create an object to use as the default token
        //start out by finding the creature creation room
        var WaitingRooms = findObjs({type: "page", name: "Creature Creation"});
        var WaitingRoom;
        if(WaitingRooms[0] != undefined){
            WaitingRoom = WaitingRooms[0];
        } else {
            //if the room does not exist, make it exist
            WaitingRoom = createObj("page", {name: "Creature Creation"});
        }

        //create the token in the room
        var Token = createObj("graphic", {pageid: WaitingRoom.id, name: UniqueName, height: 70, width:70, left: 35, top: 35, layer: "objects", imgsrc: "https://s3.amazonaws.com/files.d20.io/images/3360725/NFy-FPDogVUZbxiRowb2Ag/thumb.png?1394439373"});
        //Fatigue
        Token.set("bar1_value", "0");
        Token.set("bar1_max", Xenos.Fatigue.toString());
        //Fate
        Token.set("bar2_value", "0");
        Token.set("bar2_max", "0");
        //Wounds
        Token.set("bar3_value", Xenos.Wounds.toString());
        Token.set("bar3_max", Xenos.Wounds.toString());
        //Link the Token to the Character
        Token.set("represents", NewXenos.id);
        //adjust visibility
        Token.set("showname",true);
        Token.set("showplayers_bar1",true);
        Token.set("showplayers_bar2",true);
        Token.set("showplayers_bar3",true);
        //adjust editing powers
        Token.set("playersedit_name",false);
        Token.set("playersedit_bar1",false);
        Token.set("playersedit_bar2",false);
        Token.set("playersedit_bar3",false);
        Token.set("playersedit_aura1",false);
        Token.set("playersedit_aura2",false);
        //create all the attributes of the player
        //Characteristics: WS,BS,S,T,Ag,Wp,It,Per,Fe
        createObj("attribute", {name: "WS", current: Xenos.WS, max: Xenos.WS, characterid: NewXenos.id});
        createObj("attribute", {name: "BS", current: Xenos.BS, max: Xenos.BS, characterid: NewXenos.id});
        createObj("attribute", {name:  "S", current: Xenos.S,  max: Xenos.S,  characterid: NewXenos.id});
        createObj("attribute", {name:  "T", current: Xenos.T,  max: Xenos.T,  characterid: NewXenos.id});
        createObj("attribute", {name: "Ag", current: Xenos.Ag, max: Xenos.Ag, characterid: NewXenos.id});
        createObj("attribute", {name: "Wp", current: Xenos.Wp, max: Xenos.Wp, characterid: NewXenos.id});
        createObj("attribute", {name: "It", current: Xenos.It, max: Xenos.It, characterid: NewXenos.id});
        createObj("attribute", {name: "Per",current: Xenos.Pr, max: Xenos.Pr, characterid: NewXenos.id});
        createObj("attribute", {name: "Fe", current: Xenos.Fe, max: Xenos.Fe, characterid: NewXenos.id});

        //Stats: Wounds, Fatigue, Fate
        createObj("attribute", {name: "Wounds",  current: Xenos.Wounds, max: Xenos.Wounds, characterid: NewXenos.id});
        createObj("attribute", {name: "Fatigue", current: 0, max: Xenos.Fatigue, characterid: NewXenos.id});
        createObj("attribute", {name: "Fate",    current: 0, max: 0, characterid: NewXenos.id});
        //Armour: H,RA,LA,B,RL,LL
        createObj("attribute", {name: "Armour_H",  current: Xenos.Armour_H,  max: Xenos.Armour_H,  characterid: NewXenos.id});
        createObj("attribute", {name: "Armour_RA", current: Xenos.Armour_RA, max: Xenos.Armour_RA, characterid: NewXenos.id});
        createObj("attribute", {name: "Armour_LA", current: Xenos.Armour_LA, max: Xenos.Armour_LA, characterid: NewXenos.id});
        createObj("attribute", {name: "Armour_B",  current: Xenos.Armour_B,  max: Xenos.Armour_B,  characterid: NewXenos.id});
        createObj("attribute", {name: "Armour_RL", current: Xenos.Armour_RL, max: Xenos.Armour_RL, characterid: NewXenos.id});
        createObj("attribute", {name: "Armour_LL", current: Xenos.Armour_LL, max: Xenos.Armour_LL, characterid: NewXenos.id});
        //PR
        createObj("attribute", {name: "PR", current: 0, max: 0, characterid: NewXenos.id});
        //Unnatural Characteristics: WS,BS,S,T,Ag,Wp,It,Per,Fe
        createObj("attribute", {name: "Unnatural WS", current: Xenos.Unnatural_WS, max: Xenos.Unnatural_WS, characterid: NewXenos.id});
        createObj("attribute", {name: "Unnatural BS", current: Xenos.Unnatural_BS, max: Xenos.Unnatural_BS, characterid: NewXenos.id});
        createObj("attribute", {name: "Unnatural S",  current: Xenos.Unnatural_S,  max: Xenos.Unnatural_S,  characterid: NewXenos.id});
        createObj("attribute", {name: "Unnatural T",  current: Xenos.Unnatural_T,  max: Xenos.Unnatural_T,  characterid: NewXenos.id});
        createObj("attribute", {name: "Unnatural Ag", current: Xenos.Unnatural_Ag, max: Xenos.Unnatural_Ag, characterid: NewXenos.id});
        createObj("attribute", {name: "Unnatural Wp", current: Xenos.Unnatural_Wp, max: Xenos.Unnatural_Wp, characterid: NewXenos.id});
        createObj("attribute", {name: "Unnatural It", current: Xenos.Unnatural_It, max: Xenos.Unnatural_It, characterid: NewXenos.id});
        createObj("attribute", {name: "Unnatural Per",current: Xenos.Unnatural_Pr, max: Xenos.Unnatural_Pr, characterid: NewXenos.id});
        createObj("attribute", {name: "Unnatural Fe", current: Xenos.Unnatural_Fe, max: Xenos.Unnatural_Fe, characterid: NewXenos.id});

        //alert the gm
        sendChat("System","/w gm Created " + getLink(UniqueName,"http://journal.roll20.net/character/" + NewXenos.id));

        return getLink(UniqueName,"http://journal.roll20.net/character/" + NewXenos.id);
    }

on("chat:message", function(msg) {
if(msg.type == 'api' && msg.content.indexOf('!NewXenos') == 0 && playerIsGM(msg.playerid)){
    mySystem = new System();
    mySystem.RandomCreature(msg.content.substring(10).toLowerCase());
    delete mySystem;
}
});
