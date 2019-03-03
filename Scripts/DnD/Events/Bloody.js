on('change:graphic:bar1_value', function(graphic) {
  if(!graphic.get('represents')) return;
  const character = getObj('character', graphic.get('represents'));
  if(!character) return;
  if(character.get('controlledby')) return;
  const wounds = Number(graphic.get('bar1_value'));
  const maxWounds = Number(graphic.get('bar1_max'));
  if(wounds == NaN) return;
  if(maxWounds == NaN) return;
  graphic.set('status_red', 2 * wounds <= maxWounds);
});
