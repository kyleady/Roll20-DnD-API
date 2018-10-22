on('add:graphic', (graphic) => {
    const charID = graphic.get('represents');
    if(!charID) return;
    const hpFormula = getAttrByName(charID, 'npc_hpformula');
    if(!hpFormula) return;
    sendChat('INK', '/r ' + hpFormula, (ops) => {
        const hp = JSON.parse(ops[0].content).total;
        graphic.set('bar1_value', hp);
        graphic.set('bar1_max', hp);
    });
});
