//copied and edited from https://github.com/Roll20/roll20-api-scripts/blob/master/5th%20Edition%20OGL%20by%20Roll20%20Companion/1.4/5th%20Edition%20OGL%20by%20Roll20%20Companion.js
//allows rolltemplates sent by API to trigger death save handling
on('chat:message', function(msg) {
  if(msg.playerid.toLowerCase() === "api" && msg.rolltemplate) {
    var cnamebase = msg.content.split("charname=")[1];
    var cname = cnamebase ? cnamebase.replace('}}','').trim() : (msg.content.split("{{name=")[1]||'').split("}}")[0].trim();
    var character = cname ? findObjs({name: cname, type: 'character'})[0] : undefined;
    var player = getObj("player", msg.playerid);
    if(["simple","npc"].indexOf(msg.rolltemplate) > -1) {
      if(_.has(msg,'inlinerolls') && msg.content.indexOf("^{death-save-u}") > -1 && character && state.FifthEditionOGLbyRoll20.deathsavetracking === "on") {
          handledeathsave(msg,character);
      }
    }
  }
});
//end copy of https://github.com/Roll20/roll20-api-scripts/blob/master/5th%20Edition%20OGL%20by%20Roll20%20Companion/1.4/5th%20Edition%20OGL%20by%20Roll20%20Companion.js
