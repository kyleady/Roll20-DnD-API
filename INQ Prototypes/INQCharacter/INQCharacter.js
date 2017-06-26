//the prototype for characters
function INQCharacter(character, graphic){
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

  //check if the character has an inqlink with the given name
  //and within the given list
  //if there are no subgroups for the inqlink, just return {Bonus}
  //if there are, return the inqlink's subgroups with a bonus for each
  //if nothing was found, return undefined
  this.has = function(ability, list){
    var info = undefined;
    _.each(this.List[list], function(rule){
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

  //return the attribute bonus Stat/10 + Unnatural Stat
  this.bonus = function(stat){
    var bonus = 0;
    //get the bonus from the stat
    if(this.Attributes[stat]){
      bonus += Math.floor(this.Attributes[stat]/10);
    }
    //add in the unnatural bonus
    if(this.Attributes["Unnatural " + stat]){
      bonus += this.Attributes["Unnatural " + stat];
    }
    return bonus;
  }

  this.getCharacterBio = function(){
    //create the gmnotes of the character
    var gmnotes = "";

    //Movement
    //present movement in the form of a table
    gmnotes += "<table><tbody>";
    gmnotes += "<tr>"
    for(var move in this.Movement){
      gmnotes += "<td><strong>" + move + "</strong></td>";
    }
    gmnotes += "</tr>"
    gmnotes += "<tr>"
    for(var move in this.Movement){
      gmnotes += "<td>" + this.Movement[move] + "</td>";
    }
    gmnotes += "</tr>";
    gmnotes += "</tbody></table>";

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

  //create a character object from the prototype
  this.toCharacterObj = function(isPlayer, characterid){
    //get the character
    var character = undefined;
    if(characterid){
      character = getObj("character", characterid);
    }
    if(character == undefined){
      //create the character
      var character = createObj("character", {});
    }
    var oldAttributes = findObjs({
      _characterid: character.id,
      _type: "attribute"
    });
    _.each(oldAttributes, function(attr){
      attr.remove();
    });
    var oldAbilities = findObjs({
      _characterid: character.id,
      _type: "ability"
    });
    _.each(oldAbilities, function(ability){
      ability.remove();
    });
    //save the character name
    character.set("name", this.Name);


    //save the object ID
    this.ObjID = character.id;

    //write the character's notes down
    var gmnotes = this.getCharacterBio();
    if(isPlayer){
      character.set("bio", gmnotes);
    } else {
      character.set("gmnotes", gmnotes);
    }

    //create all of the character's attributes
    for(var name in this.Attributes){
      createObj("attribute",{
        name: name,
        characterid: this.ObjID,
        current: this.Attributes[name],
        max: this.Attributes[name]
      });
    }

    //create all of the character's abilities
    var customWeapon = new Hash();
    customWeapon.custom = "true";
    for(var i = 0; i < this.List.Weapons.length; i++){
      createObj("ability", {
        name: this.List.Weapons[i].Name,
        characterid: this.ObjID,
        istokenaction: true,
        action: this.List.Weapons[i].toAbility(this, undefined, customWeapon)
      });
    }

    //note who controlls the character
    character.set("controlledby", this.controlledby);

    //return the resultant character object
    return character;
  }

  //allow the user to immediately parse a character in the constructor
  if(character != undefined){
    if(typeof character == "string"){
      Object.setPrototypeOf(this, new INQCharacterImportParser());
      this.parse(character)
    } else {
      Object.setPrototypeOf(this, new INQCharacterParser());
      this.parse(character, graphic);
    }

    Object.setPrototypeOf(this, new INQCharacter());
  }
}

on("ready", function(){
  CentralInput.addCMD(/^!\s*weapontest\s+(\S.*)$/i,function(matches, msg){
    var objs = matchingObjs("handout", matches[1].split(" "));
    if(objs.length < 1){
      whisper("No matches")
    } else if(objs.length > 1){
      whisper("Too many matches. Please specify.")
    } else {
      var obj = new INQWeapon(objs[0]);
      log(obj)
      whisper("See log")
    }
  });

  CentralInput.addCMD(/^!\s*charactertest\s+(\S.*)$/i,function(matches, msg){
    var objs = matchingObjs("character", matches[1].split(" "));
    if(objs.length < 1){
      whisper("No matches")
    } else if(objs.length > 1){
      whisper("Too many matches. Please specify.")
    } else {
      objs[0].get("bio", function(bio){
        log(bio)
      });
    }
  });
});
