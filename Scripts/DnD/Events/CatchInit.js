on('chat:message', (msg) => {
  const matches = msg.content.match(/{{rname=\^{init(?:-u)?}}}.*graphicid=(\S*)\s.*$/);
  if(!matches) return;
  if(/\[(INIT|DEX)\]/.test(msg.inlinerolls[0].expression)) return;
  const graphicid = matches[1];
  const graphic = getObj('graphic', graphicid);
  const init = msg.inlinerolls[0].results.total;
  const turns = new INKTurns();
  turns.addTurn(graphic, init);
  turns.save();
  whisper('Init Caught');
});
