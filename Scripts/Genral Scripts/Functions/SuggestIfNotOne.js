const suggestIfNotOne = (items, names, suggestedCMD, playerid, options) => {
  options = options || {};
  options.nameIndex = options.nameIndex || 0;
  options.value = options.value || 'name';

  if(typeof names == 'string') names = [names];
  const name = names[options.nameIndex];

  var suggestionIndex = suggestedCMD.search(/\$([^\$]|$)/);
  suggestedCMD = suggestedCMD.replace(/\$\$/g, '$');
  var suggestionFront = suggestedCMD.substring(0, suggestionIndex).replace(/^!/, '');
  var suggestionEnd = suggestedCMD.substring(suggestionIndex+1);

  if(items.length <= 0){
    whisper('*' + name + '* was not found.', {speakingTo: playerid, gmEcho: true});
    return false;
  } else if(items.length > 1) {
    whisper('There were multiple matches for *' + name + '*.', {speakingTo: playerid,  gmEcho: true});
    _.each(items, function(item){
      if(item.get('_type') == 'player' && options.value == 'name'){
        names[options.nameIndex] = item.get('_displayname');
      } else {
        names[options.nameIndex] = item.get(options.value);
      }

      var suggestion = suggestionFront + names.toString() + suggestionEnd;
      suggestion = '!{URIFixed}' + encodeURIFixed(suggestion);
      whisper('[' + names[options.nameIndex] + '](' + suggestion  + ')', {speakingTo: playerid, gmEcho: true});
    });

    return false;
  } else {
    return true;
  }
}
