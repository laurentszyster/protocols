var Controller = Protocols(JSON.Regular);
var control = new Controller('control');
control.json = {};

function hide (id) {
    CSS.add(document.getElementById(id), ['hidden']);
}
function show (id) {
    CSS.remove(document.getElementById(id), ['hidden']);
}

function jsonrTestInterpret () {
	try {
		control.model = eval('('+$('jsonrModel').value+')');
		HTML.update($('jsonrModelError'), '');
	} catch (e) {
		HTML.update($('jsonrModelError'), HTML.cdata(e.toString()));
		return;
	}
	HTML.update($('jsonrView'), control.view());
	hide('jsonrModelTab');
	show('jsonrViewTab');
}

function jsonrTestSerialize () {
	$('jsonrString').value = JSON.encode(control.json);
	hide('jsonrModelTab');
	hide('jsonrViewTab');
	show('jsonrObjectTab');
}

function jsonrTestModelize () {
	hide('jsonrObjectTab');
	hide('jsonrViewTab');
	show('jsonrModelTab');
}

function jsonrTestRefresh () {
	try {
		control.json= eval('('+$('jsonrString').value+')');
		HTML.update($('jsonrObjectError'), '');
	} catch (e) {
		HTML.update($('jsonrObjectError'), HTML.cdata(e.toString()));
	}
	HTML.update($('jsonrView'), control.view());
	hide('jsonrObjectTab');
	show('jsonrViewTab');
}