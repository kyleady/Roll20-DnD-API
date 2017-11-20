function getRange(graphic1ID, graphic2ID){
  var graphic1 = getObj('graphic', graphic1ID);
  var graphic2 = getObj('graphic', graphic2ID);

  if(!graphic1) return whisper('getRange: Invalid graphic1.');
  if(!graphic2) return whisper('getRange: Invalid graphic2.');
  if(graphic1.get('_pageid') != graphic2.get('_pageid')) return whisper('getRange: Graphics must be on the same page.');
  var page = getObj('page', graphic.get('_pageid'));
  if(!page) return whisper('getRange: Invalid page.');
  var dx = graphic1.get('left') - graphic2.get('left');
  var dy = graphic1.get('top')  - graphic2.get('top');
  var ds = Math.sqrt(dx * dx + dy * dy);
  ds *= Number(page.get('scale_number'));
  if(/km/.test(page.get('scale_units')) ds *= 1000;
  return ds;
}
