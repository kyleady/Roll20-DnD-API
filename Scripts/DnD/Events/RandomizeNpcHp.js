INK_NPC_HP = 'DEFAULT'

on('add:graphic', (graphic) => {
    const charID = graphic.get('represents');
    if(!charID) return;
    const hpFormula = getAttrByName(charID, 'npc_hpformula');
    if(!hpFormula) return;
    switch(INK_NPC_HP) {
      case "RANDOM":
        sendChat('INK', '/r ' + hpFormula, (ops) => {
            const hp = JSON.parse(ops[0].content).total;
            graphic.set('bar1_value', hp);
            graphic.set('bar1_max', hp);
        });
        break;
      case "MIN":
      case "MAX":
        const hpRegex = /(\d*)\s*D\s*(\d*)\s*([^\d\s]?)\s*(\d*)/i
        const hpMathces = hpFormula.match(hpRegex)
        if(!hpMathces) return whisper('Invalid NPC HP formula.');
        let [, hpDiceNumber, hpDiceType, hpOperator, hpBase] = hpMathces;
        hpDiceNumber = Number(hpDiceNumber) || 1;
        hpDiceType = Number(hpDiceType) || 1;
        hpBase = Number(hpBase) || 0;

        let hp = hpDiceNumber;
        if(INK_NPC_HP == 'MAX') hp *= hpDiceType;
        hp += hpOperator == '+' ? hpBase : -1 * hpBase;

        graphic.set('bar1_value', hp);
        graphic.set('bar1_max', hp);
    }
});
