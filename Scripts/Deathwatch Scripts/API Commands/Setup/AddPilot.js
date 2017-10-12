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
