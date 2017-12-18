var expect = require('chai').expect;
var fs = require('fs');
var path = require('path');
require('mock20');
describe('INQWeapon()', function() {
	it('should create objects', function(){
		Campaign().MOCK20reset();
		var filePath = path.join(__dirname, '..', '..', '..', '..', '..', 'INQTotal.js');
		var MyScript = fs.readFileSync(filePath, 'utf8');
		eval(MyScript);
		MOCK20endOfLastScript();

    expect(new INQWeapon()).to.be.an.instanceof(INQWeapon);
  });
  it('should have default properties', function(){
		Campaign().MOCK20reset();
		var filePath = path.join(__dirname, '..', '..', '..', '..', '..', 'INQTotal.js');
		var MyScript = fs.readFileSync(filePath, 'utf8');
		eval(MyScript);
		MOCK20endOfLastScript();

    var inqweapon = new INQWeapon();
    expect(inqweapon).to.have.property('Class');
    expect(inqweapon).to.have.property('Range');
    expect(inqweapon).to.have.property('Single');
    expect(inqweapon).to.have.property('Semi');
    expect(inqweapon).to.have.property('Full');
    expect(inqweapon).to.have.property('Damage');
    expect(inqweapon).to.have.property('DamageType');
    expect(inqweapon).to.have.property('Penetration');
    expect(inqweapon).to.have.property('Clip');
    expect(inqweapon).to.have.property('Reload');
    expect(inqweapon).to.have.property('Special');
    expect(inqweapon).to.have.property('Weight');
    expect(inqweapon).to.have.property('Requisition');
    expect(inqweapon).to.have.property('Renown');
    expect(inqweapon).to.have.property('Availability');
    expect(inqweapon).to.have.property('FocusModifier');
    expect(inqweapon).to.have.property('FocusTest');
		expect(inqweapon).to.have.property('Opposed');
  });
  it('should inherent from INQObject', function(){
    Campaign().MOCK20reset();
		var filePath = path.join(__dirname, '..', '..', '..', '..', '..', 'INQTotal.js');
		var MyScript = fs.readFileSync(filePath, 'utf8');
		eval(MyScript);
		MOCK20endOfLastScript();

    var inqobject = new INQObject();
    var inqweapon = new INQWeapon();
    for(var prop in inqobject) {
      expect(inqweapon).to.have.property(prop);
    }
  });
	it('should be able to parse a Roll20 handout', function(done){
		Campaign().MOCK20reset();
		var filePath = path.join(__dirname, '..', '..', '..', '..', '..', 'INQTotal.js');
		var MyScript = fs.readFileSync(filePath, 'utf8');
		eval(MyScript);
		MOCK20endOfLastScript();

    var text = '';
    text += '<strong>Class</strong>: Pistol';
    text += '<br>';
    text += '<strong>Range</strong>: 13m';
    text += '<br>';
    text += '<strong>RoF</strong>: S/PR/2PR';
    text += '<br>';
    text += '<strong>Dam</strong>: 2D5 + 5 I';
    text += '<br>';
    text += '<strong>Pen</strong>: 3D10+6';
    text += '<br>';
    text += '<strong>Clip</strong>: 14';
    text += '<br>';
    text += '<strong>Reload</strong>: 3Full';
    text += '<br>';
    text += '<strong>Special</strong>: Reliable, Razor Sharp';
    text += '<br>';
    text += '<strong>Weight</strong>: 10 kgs';
    text += '<br>';
    text += '<strong>Req</strong>: 13';
    text += '<br>';
    text += '<strong>Renown</strong>: -';
    text += '<br>';
    text += '<strong>Availability</strong>: Scarce';
    text += '<br>';
    text += '<strong>Focus Power</strong>: Opposed (+20) Toughness Test';

    var handout = createObj('handout', {name: 'INQWeapon handout'});
    handout.set('notes', text);
    new INQWeapon(handout, function(inqweapon){
			expect(inqweapon.Class).to.equal('Psychic');
			expect(inqweapon.Range).to.deep.equal(new INQFormula('13'));
			expect(inqweapon.Single).to.equal(true);
			expect(inqweapon.Semi).to.deep.equal(new INQFormula('PR'));
			expect(inqweapon.Full).to.deep.equal(new INQFormula('2PR'));
			expect(inqweapon.Damage).to.deep.equal(new INQFormula('2d5+5'));
			expect(inqweapon.DamageType).to.deep.equal(new INQLink('I'));
			expect(inqweapon.Penetration).to.deep.equal(new INQFormula('3D10+6'));
			expect(inqweapon.Clip).to.equal(14);
			expect(inqweapon.Reload).to.equal(3);
			expect(inqweapon.Special).to.deep.equal([new INQLink('Reliable'), new INQLink('Razor Sharp')]);
			expect(inqweapon.Weight).to.equal(10);
			expect(inqweapon.Requisition).to.equal(13);
			expect(inqweapon.Renown).to.equal('Initiate');
			expect(inqweapon.Availability).to.equal('Scarce');
			expect(inqweapon.FocusModifier).to.equal(20);
			expect(inqweapon.FocusTest).to.equal('Toughness');
			expect(inqweapon.Opposed).to.equal(true);
      done();
    });
	});
	it('should be able to parse a Weapon Note string', function(done){
		Campaign().MOCK20reset();
		var filePath = path.join(__dirname, '..', '..', '..', '..', '..', 'INQTotal.js');
		var MyScript = fs.readFileSync(filePath, 'utf8');
		eval(MyScript);
		MOCK20endOfLastScript();

    var text = 'My Weapon';
		text += '(';
    text += 'Pistol; ';
    text += '13m; ';
    text += 'S/PR/2PR; ';
    text += '2D5 + 5 I; ';
    text += 'Pen 3D10+6; ';
    text += 'Clip 14; ';
    text += 'Rld 3Full; ';
    text += 'Reliable, Razor Sharp';
		text += ')';

    new INQWeapon(text, function(inqweapon){
			expect(inqweapon.Class).to.equal('Pistol');
			expect(inqweapon.Range).to.deep.equal(new INQFormula('13'));
			expect(inqweapon.Single).to.equal(true);
			expect(inqweapon.Semi).to.deep.equal(new INQFormula('PR'));
			expect(inqweapon.Full).to.deep.equal(new INQFormula('2PR'));
			expect(inqweapon.Damage).to.deep.equal(new INQFormula('2d5+5'));
			expect(inqweapon.DamageType).to.deep.equal(new INQLink('I'));
			expect(inqweapon.Penetration).to.deep.equal(new INQFormula('3D10+6'));
			expect(inqweapon.Clip).to.equal(14);
			expect(inqweapon.Reload).to.equal(3);
			expect(inqweapon.Special).to.deep.equal([new INQLink('Reliable'), new INQLink('Razor Sharp')]);
      done();
    });
	});
});
