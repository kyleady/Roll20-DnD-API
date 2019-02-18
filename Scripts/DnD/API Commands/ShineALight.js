const INKCustomLight = (matches, msg) => {
  const bright = Number(matches[1]);
  const dim = Number(matches[2]);
  const allCanSee = matches[3] != '';
  const angle = Number(matches[4] || 360);

  eachCharacter(msg, (character, graphic) => {
    graphic.set({
      light_radius: dim,
      light_dimradius: bright,
      light_otherplayers: allCanSee,
      light_angle: angle,
    });
  });

  whisper(`Light Added: ${bright} ${dim} ${matches[3]} % ${angle}`);
}

const INKLight = (matches, msg) => {
  const requestLight = matches[1];
  for(let light of INKLight.sources){
    if(toRegex(light).test(requestLight)){
      return INKCustomLight([
        '',
        light.Bright,
        light.Dim,
        light.CanSee,
        light.Angle,
      ], msg);
    }
  }

  whisper('The requested light source, ' + requestLight + ', could not be found.', { speakingTo: msg.playerid, gmEcho: true });
}

INKLight.sources = [
  { Name: 'Torch', Bright: '20', Dim: '40', CanSee: 'all', Angle: '360' },
  { Name: 'Candle', Bright: '0', Dim: '5', CanSee: 'all', Angle: '360' },
  { Name: 'Lamp', Bright: '15', Dim: '30', CanSee: 'all', Angle: '360' },
  { Name: 'Lantern', Bright: '30', Dim: '60', CanSee: 'all', Angle: '360' },
  { Name: 'Light', Bright: '20', Dim: '40', CanSee: 'all', Angle: '360' },
  { Name: 'None', Bright: '0', Dim: '0', CanSee: '', Angle: '360' },
  { Name: 'Dark Vision', Bright: '0', Dim: '30', CanSee: '', Angle: '360' },
];

on('ready', () => {
  const lightRegExps = INKLight.sources.map(light => toRegex(light, { str: true }));
  const lights = '(' + lightRegExps.join('|') + ')';
  CentralInput.addCMD(RegExp('^!\\s*add\\s*light\\s*' + lights + '\\s*$', 'i'), INKLight, true);
  const customLight = '(\\d+)\\s*(\\d*)\\s*(|all)\\s*%?\\s*(\\d*)';
  CentralInput.addCMD(RegExp('^!\\s*add\\s*custom\\s*light\\s*' + customLight + '\\s*$', 'i'), INKCustomLight, true);
});
