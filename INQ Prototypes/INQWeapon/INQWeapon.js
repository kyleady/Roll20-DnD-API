//the prototype for weapons
function INQWeapon(obj){

  //default weapon stats
  this.Class          = "Melee";
  this.Range          = 0;
  this.Single         = 0;
  this.Semi           = 0;
  this.Full           = 0;
  this.DiceType       = 10;
  this.DiceNumber     = 0;
  this.DiceMultiplier = 1;
  this.DamageBase     = 0;
  this.DamageType     = "I";
  this.Penetration    = 0;
  this.Clip           = 0;
  this.Reload         = -1;
  this.Special        = [];
  this.Weight         = 0;
  this.Requisition    = 0;
  this.Renown         = "";
  this.Availability   = "";

  //allow the user to immediately parse a weapon in the constructor
  if(obj != undefined){
    Object.setPrototypeOf(this, new INQWeaponParser());
    this.parse(obj);
    Object.setPrototypeOf(this, new INQWeapon());
  }

  //prototype -> text functions

  //turns the weapon prototype into text for use within a character's macros
  this.toAbility = function(charPrototype){
    var output = "";
    return output;
  }

  //turns the weapon prototype into text for an NPC's notes
  this.toNote = function(){
    var output = "";
    //The output will aim for the following format (ignorning fields that are irrelevant)
    //Name (Class; Range; RoF; Damage Damage Type; Pen; Clip; Reload; Special Rules)
    //begin with the name
    output += this.Name;
    //detail the weapon
    output += " (";
    //weapon class
    output += this.Class + "; ";
    //is this a ranged weapon?
    if(this.Range > 0){
      //what units are we using?
      if(this.Range < 1000){
        output += this.Range.toString() + "m; ";
      } else {
        output += Math.round(this.Range/1000).toString() + "km; ";
      }
    //is this a thrown weapon?
    } else if(this.Range < 0){
      output += "SB x " + (this.Range*-1).toString() + "; ";
    }
    //does this weapon have a Rate of Fire?
    if(this.Single > 0 || this.Semi > 0 || this.Full > 0){
      if(this.Single){
        output += "S";
      } else {
        output += "-";
      }
      output += "/";
      if(this.Semi > 0){
        output += this.Semi.toString();
      } else {
        output += "-";
      }
      output += "/";
      if(this.Full > 0){
        output += this.Full.toString();
      } else {
        output += "-";
      }
      output += "; ";
    }
    //damage section
    //damage multiplier
    if(this.DiceMultiplier == "PR" || this.DiceMultiplier > 1){
      output += this.DiceMultiplier + " x ";
    }
    //damage roll
    if(this.DiceNumber > 0){
      output += this.DiceNumber.toString();
      output += "D" + this.DiceType.toString();
    }
    //damage base
    if(this.DamageBase > 0){
      output += "+" + this.DamageBase.toString();
    } else if(this.DamageBase < 0){
      output += this.DamageBase.toString();
    }
    //damage type
    output += " " + GetLink(this.DamageType) + "; ";
    //Penetration
    output += "Pen " + this.Penetration.toString();
    //Clip
    if(this.Clip > 0){
      output += "Clip " + this.Clip.toString() + "; ";
    }
    //Reload
    if(this.Reload == 0){
      output += "Reload Free; ";
    } else if(this.Reload == 0.5){
      output += "Reload Half; ";
    } else if(this.Reload == 1){
      output += "Reload Full; ";
    } else {
      output += "Reload " + Math.floor(this.Reload).toString() + " Full; ";
    }
    //Special Rules
    _.each(this.Special, function(rule){
      output += GetLink(rule.Name);
      if(rule.Value >= 0){
        output += "[" + rule.Value + "]";
      }
      output += "; ";
    });
    //get rid of the last separator "; "
    output = output.replace(/;\s*$/,"");
    //close up the notes
    output += ")";
    //return the note in text form
    return output;
  }
};