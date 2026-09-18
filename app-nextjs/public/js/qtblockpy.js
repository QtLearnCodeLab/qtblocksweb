'use strict';

var QtBlockPy = {};

var prog = "python";
QtBlockPy.content = "on";
QtBlockPy.workspace = null;
var term;
var ws;
var connected = false;
var binary_state = 0;
var put_file_name = null;
var put_file_data = null;
var put_file_data_length = null;
var file_data = null;
var get_file_name = null;
var get_file_data = null;
var download_file = null;
var terminal_state = "close";
var com = 'none';
var lang = "en";
var exe_type = 'none';
// import { Blockp5 } from "./blockp5.js";
// var blockp5 = new Blockp5(blocklyManager.workspace);

class Blockp5 {
	constructor (code) {
		this.p5_obj = {};
		this.code = code;
	}

	runCode () {
		//console.log("Running JS code");
		window.LoopTrap = 1000;
		Blockly.JavaScript.INFINITE_LOOP_TRAP =
			'if (--window.LoopTrap == 0) throw "Infinite loop.";\n';
		let code = this.code;
		Blockly.JavaScript.INFINITE_LOOP_TRAP = null;

		try {
			let s = new Function("p", code);
			this.p5_obj = new p5(s);
		} catch (e) {
			alert(e);
		}
	}

	viewCode () {
		Blockly.JavaScript.INFINITE_LOOP_TRAP = null;
		// let code = Blockly.JavaScript.workspaceToCode(this.workspace);
		let code = this.code;
		let codeDiv = document.getElementById('codeDiv');
		let html = Prism.highlight(code, Prism.languages.javascript, 'javascript');
		codeDiv.innerHTML = html;
	}

}
QtBlockPy.init = function () {
	console.log("initializing toolbox");
	Code.initLanguage();
	//QtBlockPy.selectedToolbox = "toolbox_python"; //default
	//QtBlockPy.selectedCard = "python"; //default
	QtBlockPy.selectedToolbox = "toolbox_qt_neo"; //default
	QtBlockPy.selectedCard = "qtneo"; //default
	QtBlockPy.loadConfig();
	QtBlockPy.workspace = Blockly.inject('content_blocks', { grid: { snap: true }, sounds: true, media: 'media/', toolbox: QtBlockPy.buildToolbox(), zoom: { controls: true, wheel: true } });
	Blockly.getMainWorkspace().setTheme(Blockly.Themes.HighContrast);
	QtBlockPy.bindFunctions();
	QtBlockPy.workspace.addChangeListener(QtBlockPy.renderCodePreview);
	QtBlockPy.workspace.render();
	QtBlockPy.loadFile();
	window.addEventListener('unload', QtBlockPy.backupBlocks, false);
	QtBlockPy.webrepl_init();

	var value = "None";
	$('#boards option[value="' + value + '"]').attr('selected', 'selected').text();
	$('#btn_stop').addClass("hidden");
	$("#toggle").toggle("slide");
};
QtBlockPy.loadFile = function () {
	var urlFile = QtBlockPy.getStringParamFromUrl('url', '');
	if (urlFile.endsWith(".py")) {
		$.get(urlFile, function (data) {
			$('#codeORblock').bootstrapToggle("off");
			$('a[href="#content_code"]').tab('show');
			$('#btn_print').addClass("hidden");
			$('#btn_preview').addClass("hidden");
			$('#btn_search').removeClass("hidden");
			window.localStorage.content = "off";
			editor.session.setMode("ace/mode/python");
			editor.setOptions({
				enableBasicAutocompletion: true,
				enableSnippets: true,
				enableLiveAutocompletion: true
			});
			editor.setValue(data, 1);
		}, 'text');
	}
	if (urlFile.endsWith(".ino")) {
		$.get(urlFile, function (data) {
			$('#codeORblock').bootstrapToggle("off");
			$('a[href="#content_code"]').tab('show');
			$('#btn_print').addClass("hidden");
			$('#btn_preview').addClass("hidden");
			$('#btn_search').removeClass("hidden");
			window.localStorage.content = "off";
			editor.session.setMode("ace/mode/c_cpp");
			editor.setOptions({
				enableBasicAutocompletion: true,
				enableSnippets: true,
				enableLiveAutocompletion: true
			});
			editor.setValue(data, 1);
		}, 'text');
	}
	var loadOnce = null;
	try { loadOnce = window.localStorage.loadOnceBlocks; } catch (e) { }
	if (urlFile) {
		$.get(urlFile, function (data) { QtBlockPy.loadBlocks(data); }, 'text');
	} else {
		QtBlockPy.loadBlocks();
	}
};
QtBlockPy.save_com = function () {
	$("#portseries").blur();
	com = $("#portseries").val();
	//window.localStorage.com = com;
};
QtBlockPy.renderCodePreview = function () {
	var prog = window.localStorage.prog;
	var card = window.localStorage.card;
	if (card == "javascript") {
		$('#pre_preview').text(Blockly.JavaScript.workspaceToCode(QtBlockPy.workspace));
		$('#pre_preview').html(prettyPrintOne($('#pre_preview').html(), 'js'));
	}
	else {
		$('#pre_preview').text(Blockly.Python.workspaceToCode(QtBlockPy.workspace));
		$('#pre_preview').html(prettyPrintOne($('#pre_preview').html(), 'py'));
		var code = Blockly.Python.workspaceToCode(Blockly.getMainWorkspace());
		EDITOR.setCode(code);
	}
};
QtBlockPy.getStringParamFromUrl = function (name, defaultValue) {
	var val = location.search.match(new RegExp('[?&]' + name + '=([^&]+)'));
	return val ? decodeURIComponent(val[1].replace(/\+/g, '%20')) : defaultValue;
};
QtBlockPy.addReplaceParamToUrl = function (url, param, value) {
	var re = new RegExp("([?&])" + param + "=.*?(&|$)", "i");
	var separator = url.indexOf('?') !== -1 ? "&" : "?";
	if (url.match(re)) {
		return url.replace(re, '$1' + param + "=" + value + '$2');
	}
	else {
		return url + separator + param + "=" + value;
	}
};
QtBlockPy.loadBlocks = function (defaultXml) {
	if (defaultXml) {
		var xml = Blockly.Xml.textToDom(defaultXml);
		Blockly.Xml.domToWorkspace(xml, QtBlockPy.workspace);
	} else {
		var loadOnce = null;
		try {
			loadOnce = window.localStorage.loadOnceBlocks;
		} catch (e) { }
		if (loadOnce != null) {
			delete window.localStorage.loadOnceBlocks;
			var xml = Blockly.Xml.textToDom(loadOnce);
			Blockly.Xml.domToWorkspace(xml, QtBlockPy.workspace);
		}
	}
};
QtBlockPy.load = function (event) {
	var files = event.target.files;
	if (files.length != 1) {
		return;
	}
	var reader = new FileReader();
	reader.onloadend = function (event) {
		var target = event.target;
		if (target.readyState == 2) {
			if (files[0].name.endsWith("ino")) {
				$('#codeORblock').bootstrapToggle("off");
				$('a[href="#content_code"]').tab('show');
				$('#btn_print').addClass("hidden");
				$('#btn_preview').addClass("hidden");
				$('#btn_search').removeClass("hidden");
				window.localStorage.content = "off";
				editor.session.setMode("ace/mode/c_cpp");
				editor.setOptions({
					enableBasicAutocompletion: true,
					enableSnippets: true,
					enableLiveAutocompletion: true
				});
				editor.setValue(target.result, 1);
			}
			if (files[0].name.endsWith("py")) {
				$('#codeORblock').bootstrapToggle("off");
				$('a[href="#content_code"]').tab('show');
				$('#btn_print').addClass("hidden");
				$('#btn_preview').addClass("hidden");
				$('#btn_search').removeClass("hidden");
				window.localStorage.content = "off";
				editor.session.setMode("ace/mode/python");
				editor.setOptions({
					enableBasicAutocompletion: true,
					enableSnippets: true,
					enableLiveAutocompletion: true
				});
				editor.setValue(target.result, 1);
			}
			try {
				var xml = Blockly.Xml.textToDom(target.result);

			} catch (e) {
				alert(MSG['xmlError'] + '\n' + e);
				return;
			}
			QtBlockPy.workspace.clear();
			Blockly.Xml.domToWorkspace(xml, QtBlockPy.workspace);
			QtBlockPy.workspace.render();
		}
	};
	reader.readAsText(files[0]);
};
QtBlockPy.backupBlocks = function () {
	if (typeof Blockly != 'undefined' && window.localStorage) {
		var xml = Blockly.Xml.workspaceToDom(QtBlockPy.workspace);
		var text = Blockly.Xml.domToText(xml);
		window.localStorage.loadOnceBlocks = text;
	}
};
QtBlockPy.loadConfig = function () {
	var card = window.localStorage.card;
	var content = window.localStorage.content;
	var prog = window.localStorage.prog;
	console.log("card, content, prog", card, content, prog);
	if (card === undefined) {
		window.localStorage.card = QtBlockPy.selectedCard;
		window.localStorage.prog = profile[QtBlockPy.selectedCard].prog;
		window.localStorage.toolbox = QtBlockPy.selectedToolbox;
		$("#boards").val(QtBlockPy.selectedCard);
		$("#toolboxes").val(QtBlockPy.selectedToolbox);
		QtBlockPy.loadToolboxDefinition(QtBlockPy.selectedToolbox);
	} else {
		var toolbox = "toolbox_qt_neo";
		QtBlockPy.selectedToolbox = toolbox;
		$("#boards").val(card);
		$("#toolboxes").val(toolbox);
		QtBlockPy.loadToolboxDefinition(toolbox);
	}
	if (content === undefined) {
		window.localStorage.content = QtBlockPy.content;
		$('#codeORblock').bootstrapToggle(QtBlockPy.content);
		$('#btn_search').addClass("hidden");
		$('#btn_run_custom').addClass("hidden");
		$('#btn_stop_custom').addClass("hidden");

	}
	else {
		$('#codeORblock').bootstrapToggle(content);
		if (content == "off") {
			$('a[href="#content_code"]').tab('show');
			$('#btn_search').removeClass("hidden");
			$('#btn_run_custom').removeClass("hidden");
			$('#btn_stop_custom').addClass("hidden");
			$('#btn_save_custom_py').removeClass('hidden');
			$('#btn_preview').addClass("hidden");

		}
		else {
			$('#btn_search').addClass("hidden");
			$('#btn_run_custom').addClass("hidden");
			$('#btn_stop_custom').addClass("hidden");
			$('#btn_save_custom_py').addClass('hidden');
		}
	}
	editor.session.setMode("ace/mode/python");
	editor.setOptions({
		enableBasicAutocompletion: true,
		enableSnippets: true,
		enableLiveAutocompletion: true
	});
	if (prog == "python") {
		$('#btn_bin').addClass("hidden");
	}
};
QtBlockPy.change_card = function () {
	var card = window.localStorage.card;
	var new_card = $("#boards").val();
	console.log("handleConfirm card old and new are", card, new_card);
	$("#boards").blur();
	var r;
	$.confirm({
		title: 'Load ' + new_card,
		content: 'Load Blocks of ' + new_card,
		type: 'green',
		buttons: {
			ok: {
				text: "ok!",
				btnClass: 'btn-primary',
				keys: ['enter'],
				action: function () {
					console.log('the user clicked confirm');
					$('#portseries').html('');
					$('#portseries').append('<option value="none">None</option>');
					QtBlockPy.handleConfirm(new_card);
				}
			},
			cancel: function () {
				$("#boards").val(card);
				console.log('the user clicked cancel');
				return;
			}
		}
	});
};

QtBlockPy.handleConfirm = function (new_card) {
	console.log("handleConfirm new card is", new_card);
	com = 'none';
	var new_toolbox = "toolbox_qt_neo"; //default
	if (new_card == "streamlit") {
		new_toolbox = "toolbox_streamlit";
	}
	else if (new_card == "python") {
		new_toolbox = "toolbox_python";
	}
	else if (new_card == "javascript") {
		new_toolbox = "toolbox_javascript";
	}
	else if (new_card == "qtpy") {
		new_toolbox = "toolbox_qtpy";
	}
	else if (new_card == "None") {
		new_toolbox = "toolbox_python";
	}
	else if (new_card == "qtneo") {
		new_toolbox = "toolbox_qt_neo";
		com = "webrepl";
	}
	else if (new_card == "microbit") {
		new_toolbox = "toolbox_microbit";
		com = "usb";
	}
	$('#btn_preview').attr('title', MSG['btn_preview_py']);
	$('#btn_saveino').attr('title', MSG['btn_save_py']);
	$('#btn_bin').addClass("hidden");
	window.localStorage.toolbox = new_toolbox;
	window.localStorage.prog = "python";
	QtBlockPy.workspace.clear();
	console.log("loading  .....", new_toolbox);
	QtBlockPy.loadToolboxDefinition(new_toolbox);
	Blockly.getMainWorkspace().updateToolbox(QtBlockPy.buildToolbox());
	QtBlockPy.workspace.render();
	window.localStorage.card = new_card;
};

QtBlockPy.discard = function () {
	console.log("discard inside");
	var count = QtBlockPy.workspace.getAllBlocks().length;
	if (count < 4 || window.confirm(MSG['discard'])) {
		QtBlockPy.workspace.clear();
		QtBlockPy.workspace.render();
	}
};
QtBlockPy.Undo = function () {
	console.log("Undo inside");
	if (localStorage.getItem("content") == "on") {
		Blockly.mainWorkspace.undo(0);
	} else {
		editor.undo();
	}
};
QtBlockPy.Redo = function () {
	console.log("Redo inside");
	if (localStorage.getItem("content") == "on") {
		Blockly.mainWorkspace.undo(1);
	} else {
		editor.redo();
	}
};
QtBlockPy.search = function () {
	editor.execCommand("find");
};
QtBlockPy.bindFunctions = function () {
	console.log("bindFunctions inside");
	$('.modal-child').on('show.bs.modal', function () {
		var modalParent = $(this).attr('data-modal-parent');
		$(modalParent).css('opacity', 0);
	});
	$('.modal-child').on('hidden.bs.modal', function () {
		var modalParent = $(this).attr('data-modal-parent');
		$(modalParent).css('opacity', 1);
	});
	$('#btn_new').on("click", QtBlockPy.discard);
	$('#btn_undo').on("click", QtBlockPy.Undo);
	$('#btn_redo').on("click", QtBlockPy.Redo);
	$('#btn_print').on("click", QtBlockPy.workspace_capture);
	$('#btn_search').on("click", QtBlockPy.search);
	$('#btn_saveino').on("click", QtBlockPy.save);
	$('#btn_save_custom_py').on("click", QtBlockPy.save_custom);
	$('#btn_saveXML').on("click", QtBlockPy.save_xml);

	$('#btn_copy').on("click", QtBlockPy.copy);
	$('#boards').on("focus", function () {
		QtBlockPy.selectedCard = $(this).val();
	});
	$('#btn_preview').on("click", function () {
		$("#toggle").toggle("slide");
		$('#btn_stop').addClass("hidden");
		$('#btn_run').removeClass("hidden");
		if (terminal_state == "open") {
			$('#toggle_terminal').toggle("slide");
			terminal_state = "close";
		}
	});
	$('#btn_terminal').on("click", function () {
		$('#toggle_terminal').toggle("slide");

	});
	$('#btn_stop').on("click", function () {
		$('#btn_run').removeClass("hidden");
		$('#btn_stop').addClass("hidden");
		if (terminal_state == "open") {
			$('#toggle_terminal').toggle("slide");
			terminal_state = "close";
		}
	});
	$('#btn_stop_custom').on("click", function () {
		$('#btn_run_custom').removeClass("hidden");
		$('#btn_stop_custom').addClass("hidden");
		if (terminal_state == "open") {
			$('#toggle_terminal').toggle("slide");
			terminal_state = "close";
		}
	});
	$('#btn_run').on("click", function () {
		exe_type = "blocks";
		$('#btn_stop').removeClass("hidden");
		if (terminal_state == "close") {
			$('#toggle_terminal').toggle("slide");
			terminal_state = "open";
		}
		//	runit;
	});

	//btn_run_custom
	$('#btn_run_custom').on("click", function () {
		exe_type = "custom";
		$('#btn_stop_custom').removeClass("hidden");
		if (terminal_state == "close") {
			$('#toggle_terminal').toggle("slide");
			terminal_state = "open";
		}
	});
	$('#btn_flash').on("click", function () {
		if (com == "webrepl") {
			$('#toggle_flash').toggle("slide");
		}
		else if (com == "usb") {
			$('#toggle_microbit').toggle("slide");
		}
	});
	//$('#btn_connect').on("click", QtBlockPy.webrepl_button_clicked);
	//$('#btn_run').on('click', QtBlockPy.runJS);
	$('#put-file-select').on("change", handle_put_file_select);
	$('#btn_run').on('click', runit);
	$('#btn_run_custom').on('click', runit);
	$('#codeORblock').on("change", function () {
		if (window.localStorage.prog != "python") {
			editor.session.setMode("ace/mode/c_cpp");
			editor.setOptions({
				enableBasicAutocompletion: true,
				enableSnippets: true,
				enableLiveAutocompletion: true
			});
		} else {
			editor.session.setMode("ace/mode/python");
			editor.setOptions({
				enableBasicAutocompletion: true,
				enableSnippets: true,
				enableLiveAutocompletion: true
			});
		}
		if (window.localStorage.content == "on") {
			if (editor.getValue() == '') {
				editor.setValue($('#pre_preview').text(), 1);
			}

			$('a[href="#content_code"]').tab('show');
			$('#btn_print').addClass("hidden");
			$('#btn_preview').addClass("hidden");
			$('#btn_search').removeClass("hidden");
			$('#btn_run_custom').removeClass("hidden");
			$('#btn_save_custom_py').removeClass('hidden');
			window.localStorage.content = "off";
		} else {
			$('a[href="#content_blocks"]').tab('show');
			$('#btn_print').removeClass("hidden");
			$('#btn_preview').removeClass("hidden");
			$('#btn_search').addClass("hidden");
			$('#btn_run_custom').addClass("hidden");
			$('#btn_stop_custom').addClass("hidden");
			$('#btn_save_custom_py').addClass('hidden');
			window.localStorage.content = "on";
		}
	});

	$('#btn_verify').mouseover(function () {
		document.getElementById("survol").textContent = "Check the code";
	}).mouseout(function () {
		document.getElementById("survol").textContent = "";
	});
	$('#btn_flash').mouseover(function () {
		document.getElementById("survol").textContent = "Upload to board";
	}).mouseout(function () {
		document.getElementById("survol").textContent = "";
	});
	$('#btn_bin').mouseover(function () {
		document.getElementById("survol").textContent = "Export as Binary .hex";
	}).mouseout(function () {
		document.getElementById("survol").textContent = "";
	});
	$('#toolboxes').on("focus", function () {
		QtBlockPy.selectedToolbox = $(this).val();
	});
	$('#toolboxes').on("change", QtBlockPy.changeToolboxDefinition);
	$('#configModal').on('hidden.bs.modal', function (e) {
		QtBlockPy.loadToolboxDefinition(QtBlockPy.selectedToolbox);
	});
	$('#load').on("change", QtBlockPy.load);
	$('#btn_fakeload').on("click", function () {
		$('#load').click();
	});
	$('#btn_config').on("click", QtBlockPy.openConfigToolbox);
	$('#select_all').on("click", QtBlockPy.checkAll);
	$('#btn_valid_config').on("click", QtBlockPy.changeToolbox);
	$('#btn_example').on("click", QtBlockPy.buildExamples);
	//$('#btn_flash').on('click', QtBlockPy.flash);

	$("#btn_microbit_connect").click(function () {
		doConnect();
	});

};
QtBlockPy.checkAll = function () {
	if (this.checked) {
		$('#modal-body-config input:checkbox[id^=checkbox_]').each(function () {
			this.checked = true;
		});
	}
	else {
		$('#modal-body-config input:checkbox[id^=checkbox_]').each(function () {
			this.checked = false;
		});
	}
};
QtBlockPy.openConfigToolbox = function () {
	console.log("openConfigToolbox inside");
	var modalbody = $("#modal-body-config");
	var loadIds = window.localStorage.toolboxids;
	if (loadIds === undefined || loadIds === "") {
		if ($('#defaultCategories').length) {
			loadIds = $('#defaultCategories').html();
		} else {
			loadIds = '';
		}
	}
	modalbody.empty();
	var i = 0, n;
	var ligne = "";
	$("#toolbox").children("category").each(function () {
		n = loadIds.search($(this).attr("id"));
		if (n >= 0) {
			ligne = '<input type="checkbox" checked="checked" name="checkbox_' + i + '" id="checkbox_' + $(this).attr("id") + '"/> ' + Blockly.Msg[$(this).attr("id")] + '<br/>';
		} else {
			ligne = '<input type="checkbox" name="checkbox_' + i + '" id="checkbox_' + $(this).attr("id") + '"/> ' + Blockly.Msg[$(this).attr("id")] + '<br/>';
		}
		i++;
		modalbody.append(ligne);
	});
};
QtBlockPy.changeToolbox = function () {
	console.log("changeToolbox inside");
	QtBlockPy.backupBlocks();

	var toolboxIds = [];
	window.localStorage.lang = $('#languageMenu').val();
	$('#modal-body-config input:checkbox[id^=checkbox_]').each(function () {
		if (this.checked == true) {
			var xmlid = this.id;
			toolboxIds.push(xmlid.replace("checkbox_", ""));
		}
	});
	window.localStorage.toolboxids = toolboxIds;
	Blockly.getMainWorkspace().updateToolbox(QtBlockPy.buildToolbox());
	QtBlockPy.workspace.render();
	$('#configModal').modal('hide');
	window.location.reload();
};
QtBlockPy.buildToolbox = function () {
	var loadIds = window.localStorage.toolboxids;
	console.log("buildToolbox defaultcat", loadIds);
	if (loadIds === undefined || loadIds === "") {
		if ($('#defaultCategories').length) {
			loadIds = $('#defaultCategories').html();
		} else {
			console.log("defaultids");
			loadIds = '';
		}
	}
	var xmlValue = '<xml id="toolbox">';
	var xmlids = loadIds.split(",");
	for (var i = 0; i < xmlids.length; i++) {
		if ($('#' + xmlids[i]).length) {
			xmlValue += $('#' + xmlids[i])[0].outerHTML;
		}
	}
	xmlValue += '</xml>';
	return xmlValue;
};
QtBlockPy.loadToolboxDefinition = function (toolboxFile) {
	$.ajax({
		type: "GET",
		url: "./toolbox/" + toolboxFile + ".xml",
		dataType: "xml",
		async: false
	}).done(function (data) {
		var toolboxXml = '<xml id="toolbox" style="display: none">' + $(data).find('toolbox').html() + '</xml>';
		$("#toolbox").remove();
		$('body').append(toolboxXml);
		$("xml").find("category").each(function () {
			if (!$(this).attr('id')) {
				$(this).attr('id', $(this).attr('name'));
				$(this).attr('name', Blockly.Msg[$(this).attr('name')]);
			}
		});
	}).fail(function (data) {
		$("#toolbox").remove();
	});
};
QtBlockPy.changeToolboxDefinition = function () {
	QtBlockPy.loadToolboxDefinition($("#toolboxes").val());
	QtBlockPy.openConfigToolbox();
};
QtBlockPy.buildExamples = function () {
	$.ajax({
		cache: false,
		url: "./examples/examples.json",
		dataType: "json",
		success: function (data) {
			$("#includedContent").empty();
			$.each(data, function (i, example) {
				if (example.visible) {
					var line = "<tr><td>"
						+ "<a href='?url=./examples/" + example.source_url + "'>" + example.source_text + "</a>"
						+ "</td><td>"
						+ "<a href='" + example.link_url + "' data-toggle='modal'>"
						+ "<img class='vignette' src='./examples/" + example.image + "'></a>"
						+ "</td></tr>";
					$("#includedContent").append(line);
				}
			});
		}
	});
};

QtBlockPy.workspace_capture = function () {
	var ws = QtBlockPy.workspace.svgBlockCanvas_.cloneNode(true);
	ws.removeAttribute("width");
	ws.removeAttribute("height");
	ws.removeAttribute("transform");
	var styleElem = document.createElementNS("http://www.w3.org/2000/svg", "style");
	styleElem.textContent = Code.CONTENT.join('') + ".blocklyText { font-size:1rem !important;text-align:right;fill:rgba(255, 255, 255, 0.9)}";

	ws.insertBefore(styleElem, ws.firstChild);
	var bbox = QtBlockPy.workspace.svgBlockCanvas_.getBBox();
	var canvas = document.createElement("canvas");
	canvas.width = Math.ceil(bbox.width + 10);
	canvas.height = Math.ceil(bbox.height + 10);
	var ctx = canvas.getContext("2d");
	var xml = new XMLSerializer().serializeToString(ws);
	xml = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + bbox.width + '" height="' + bbox.height + '" viewBox="' + bbox.x + ' ' + bbox.y + ' ' + bbox.width + ' ' + bbox.height + '"><rect width="100%" height="100%" fill="white"></rect>' + xml + '</svg>';
	var img = new Image();
	img.setAttribute("src", 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml))));
	img.onload = function () {
		ctx.drawImage(img, 5, 5);
		var canvasdata = canvas.toDataURL("image/png", 1);
		var datenow = Date.now();
		var a = document.createElement("a");
		a.download = "capture" + datenow + ".png";
		a.href = canvasdata;
		document.body.appendChild(a);
		a.click();
	};
};
QtBlockPy.cardPicture_change = function () {
	if ($("#pinout").val() == "nanooptiboot" || $("#pinout").val() == "nano" || $("#pinout").val() == "nona4809") {
		$("#warning").show();
	} else {
		$("#warning").hide();
	}
	if ($("#pinout").val()) {
		$('#arduino_card_mini_picture').attr("src", profile[$("#pinout").val()]['picture']);
	} else {
		$('#arduino_card_mini_picture').attr("src", "");
	}
};

QtBlockPy.save = function () {
	if (typeof (Storage) !== "undefined") {
		var filename = prompt("Save file as", "main.py");
		var code = Blockly.Python.workspaceToCode(Blockly.getMainWorkspace());
		//var codeExt = ".py";
		//QtBlockPy.download(filename + codeExt, code);
		QtBlockPy.download(filename, code);
	}
	else {
		console.log("not saved");
	}
};

QtBlockPy.save_custom = function () {
	if (typeof (Storage) !== "undefined") {
		var filename = prompt("Save file as", "main.py");
		var code = editor.getValue();
		//var codeExt = ".py";
		QtBlockPy.download(filename, code);
	}
	else {
		console.log("not saved");
	}
};

QtBlockPy.save_xml = function () {
	if (typeof (Storage) !== "undefined") {
		var code = '';
		var codeExt = '';
		var filename = prompt("Save file as", "qtpy.xml");
		var xmlDom = Blockly.Xml.workspaceToDom(Blockly.getMainWorkspace());
		var code = Blockly.Xml.domToPrettyText(xmlDom);
		//codeExt = ".xml";
		QtBlockPy.download(filename, code);
		console.log("saved");
	}
	else {
		console.log("not saved");
	}
};

QtBlockPy.download = function (filename, text) {
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);
	element.style.display = 'none';
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
};

QtBlockPy.fallbackCopyTextToClipboard = function (text) {
	var textArea = document.createElement("textarea");
	textArea.value = text;

	// Avoid scrolling to bottom
	textArea.style.top = "0";
	textArea.style.left = "0";
	textArea.style.position = "fixed";

	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();

	try {
		var successful = document.execCommand('copy');
		var msg = successful ? 'successful' : 'unsuccessful';
		console.log('Fallback: Copying text command was ' + msg);
	} catch (err) {
		console.error('Fallback: Oops, unable to copy', err);
	}

	document.body.removeChild(textArea);
};
QtBlockPy.copyTextToClipboard = function (text) {
	if (!navigator.clipboard) {
		QtBlockPy.fallbackCopyTextToClipboard(text);
		return;
	}
	navigator.clipboard.writeText(text).then(function () {
		console.log('Async: Copying to clipboard was successful!');
	}, function (err) {
		console.error('Async: Could not copy text: ', err);
	});
};

QtBlockPy.copy = function () {
	var copyText = Blockly.Python.workspaceToCode(Blockly.getMainWorkspace());
	QtBlockPy.copyTextToClipboard(copyText);
	//navigator.clipboard.writeText(copyText);
	alert('Copied');

};

QtBlockPy.webrepl_run = function () {
	var code = Blockly.Python.workspaceToCode(Blockly.getMainWorkspace());
	var file = new File([code], "qtpi.py");
	handle_put_file(file);
	put_file();
	ws.send('execfile("qtpi.py")\r\n');
};

QtBlockPy.flash = function () {
	window.open("https://micropython.org/webrepl/", "_blank");
};

QtBlockPy.webrepl_init = function () {
	function calculate_size (win) {
		var cols = Math.max(80, Math.min(150, (win.innerWidth - 200) / 7)) | 0;
		var rows = Math.max(24, Math.min(80, (win.innerHeight - 180) / 12)) | 0;
		//return [cols, rows];
		return [cols, 27];
	}

	(function () {
		//window.onload = function () {
		var webrepl_url = window.location.hash.substring(1);
		if (webrepl_url) {
			document.getElementById('webrepl_url').value = 'ws://' + webrepl_url;
		}
		var size = calculate_size(self);
		term = new Terminal({
			cols: size[0],
			rows: size[1],
			useStyle: true,
			screenKeys: true,
			cursorBlink: false
		});
		term.open(document.getElementById("term"));
		//show_https_warning();
		//};
		window.addEventListener('resize', function () {
			var size = calculate_size(self);
			term.resize(size[0], size[1]);
		});
	}).call(this);

	// function show_https_warning () {
	// 	if (window.location.protocol == 'https:') {
	// 		var warningDiv = document.createElement('div');
	// 		warningDiv.style.cssText = 'background:#f99;padding:5px;margin-bottom:10px;line-height:1.5em;text-align:center';
	// 		warningDiv.innerHTML = [
	// 			'At this time, the WebREPL client cannot be accessed over HTTPS connections.',
	// 			'Use a HTTP connection, eg. <a href="http://micropython.org/webrepl/">http://micropython.org/webrepl/</a>.',
	// 			'Alternatively, download the files from <a href="https://github.com/micropython/webrepl">GitHub</a> and run them locally.'
	// 		].join('<br>');
	// 		document.body.insertBefore(warningDiv, document.body.childNodes[0]);
	// 		term.resize(term.cols, term.rows - 7);
	// 	}
	// }
};

QtBlockPy.webrepl_connect = function (url) {
	window.location.hash = url.substring(5);
	ws = new WebSocket(url);
	ws.binaryType = 'arraybuffer';
	ws.onopen = function () {
		term.removeAllListeners('data');
		term.on('data', function (data) {
			// Pasted data from clipboard will likely contain
			// LF as EOL chars.
			data = data.replace(/\n/g, "\r");
			ws.send(data);
		});

		term.on('title', function (title) {
			document.title = title;
		});

		term.focus();
		term.element.focus();
		term.write('\x1b[31mWelcome to MicroPython!\x1b[m\r\n');

		ws.onmessage = function (event) {
			if (event.data instanceof ArrayBuffer) {
				var data = new Uint8Array(event.data);
				switch (binary_state) {
					case 11:
						// first response for put
						if (decode_resp(data) == 0) {
							// send file data in chunks
							for (var offset = 0; offset < put_file_data.length; offset += 1024) {
								ws.send(put_file_data.slice(offset, offset + 1024));
							}
							binary_state = 12;
						}
						break;
					case 12:
						// final response for put
						if (decode_resp(data) == 0) {
							update_file_status('Sent ' + put_file_name + ', ' + put_file_data.length + ' bytes');
						} else {
							update_file_status('Failed sending ' + put_file_name);
						}
						binary_state = 0;
						break;

					case 21:
						// first response for get
						if (decode_resp(data) == 0) {
							binary_state = 22;
							var rec = new Uint8Array(1);
							rec[0] = 0;
							ws.send(rec);
						}
						break;
					case 22: {
						// file data
						var sz = data[0] | (data[1] << 8);
						if (data.length == 2 + sz) {
							// we assume that the data comes in single chunks
							if (sz == 0) {
								// end of file
								binary_state = 23;
							} else {
								// accumulate incoming data to get_file_data
								var new_buf = new Uint8Array(get_file_data.length + sz);
								new_buf.set(get_file_data);
								new_buf.set(data.slice(2), get_file_data.length);
								get_file_data = new_buf;
								update_file_status('Getting ' + get_file_name + ', ' + get_file_data.length + ' bytes');

								var rec = new Uint8Array(1);
								rec[0] = 0;
								ws.send(rec);
							}
						} else {
							binary_state = 0;
						}
						break;
					}
					case 23:
						// final response
						if (decode_resp(data) == 0) {
							update_file_status('Got ' + get_file_name + ', ' + get_file_data.length + ' bytes');
							saveAs(new Blob([get_file_data], { type: "application/octet-stream" }), get_file_name);
						} else {
							update_file_status('Failed getting ' + get_file_name);
						}
						binary_state = 0;
						break;
					case 31:
						// first (and last) response for GET_VER
						console.log('GET_VER', data);
						binary_state = 0;
						break;
				}
			}
			term.write(event.data);
		};
	};

	ws.onclose = function () {
		connected = false;
		if (term) {
			term.write('\x1b[31mDisconnected\x1b[m\r\n');
		}
		term.off('data');
		//prepare_for_connect();
		document.getElementById('webrepl_url').disabled = false;
		document.getElementById('button').value = "Connect";
	};
};

QtBlockPy.webrepl_button_clicked = function () {
	console.log("Connecting");
	if (connected) {
		ws.close();
	} else {
		document.getElementById('webrepl_url').disabled = true;
		document.getElementById('button').value = "Disconnect";
		connected = true;
		QtBlockPy.webrepl_connect(document.getElementById('webrepl_url').value);

	}
};

function decode_resp (data) {
	if (data[0] == 'W'.charCodeAt(0) && data[1] == 'B'.charCodeAt(0)) {
		var code = data[2] | (data[3] << 8);
		return code;
	} else {
		return -1;
	}
}

function update_file_status (s) {
	document.getElementById('file-status').innerHTML = s;
}

QtBlockPy.webrepl_execute = function () {
	ws.send('execfile("qtpi.py")\r\n');
};

function put_file () {
	var dest_fname = put_file_name;
	var dest_fsize = put_file_data.length;
	// WEBREPL_FILE = "<2sBBQLH64s"
	var rec = new Uint8Array(2 + 1 + 1 + 8 + 4 + 2 + 64);
	rec[0] = 'W'.charCodeAt(0);
	rec[1] = 'A'.charCodeAt(0);
	rec[2] = 1; // put
	rec[3] = 0;
	rec[4] = 0; rec[5] = 0; rec[6] = 0; rec[7] = 0; rec[8] = 0; rec[9] = 0; rec[10] = 0; rec[11] = 0;
	rec[12] = dest_fsize & 0xff; rec[13] = (dest_fsize >> 8) & 0xff; rec[14] = (dest_fsize >> 16) & 0xff; rec[15] = (dest_fsize >> 24) & 0xff;
	rec[16] = dest_fname.length & 0xff; rec[17] = (dest_fname.length >> 8) & 0xff;
	for (var i = 0; i < 64; ++i) {
		if (i < dest_fname.length) {
			rec[18 + i] = dest_fname.charCodeAt(i);
		} else {
			rec[18 + i] = 0;
		}
	}

	// initiate put
	binary_state = 11;
	update_file_status('Sending ' + put_file_name + '...');
	download_file = put_file_name;
	ws.send(rec);
}

function handle_put_file_select (evt) {
	// The event holds a FileList object which is a list of File objects,
	// but we only support single file selection at the moment.
	var files = evt.target.files;
	// Get the file info and load its data.
	var f = files[0];
	put_file_name = f.name;
	var reader = new FileReader();
	reader.onload = function (e) {
		console.log("res:", e.target.result);
		//console.log("text: ", e.target.result.toString());
		var string = new TextDecoder("utf-8").decode(e.target.result);
		console.log("str:", string);
		put_file_data = new Uint8Array(e.target.result);
		document.getElementById('put-file-list').innerHTML = '' + escape(put_file_name) + ' - ' + put_file_data.length + ' bytes';
		document.getElementById('put-file-button').disabled = false;
		var str = "print('hello world')";
		var buf = new ArrayBuffer(str.length); // 2 bytes for each char
		var bufView = new Uint16Array(buf);
		for (var i = 0, strLen = str.length; i < strLen; i++) {
			bufView[i] = str.charCodeAt(i);
		}
		console.log("buffer: ", buf);
	};
	console.log("put_file_data", put_file_data);
	reader.readAsArrayBuffer(f);
	console.log("f: ", f);
}

/*function handle_put_file(file_name,str) {
	var file = new File([str], file_name);
	put_file_name = file_name;
	var reader = new FileReader();
	reader.onload = function (e) {
		//console.log("ARRAY BUFFER: ", file);
		put_file_data = new Uint8Array(e.target.result);
		//console.log("PFD: ", put_file_data);	
		document.getElementById('put-file-list').innerHTML = '' + escape(put_file_name) + ' - ' + put_file_data.length + ' bytes';
		document.getElementById('put-file-button').disabled = false;
	};
	reader.readAsArrayBuffer(file);
}*/

function handle_put_file (file) {
	put_file_name = file.name;
	var reader = new FileReader();
	reader.onload = function (e) {
		//console.log("ARRAY BUFFER: ", file);
		put_file_data = new Uint8Array(e.target.result);
		document.getElementById('put-file-list').innerHTML = '' + escape(put_file_name) + ' - ' + put_file_data.length + ' bytes';
		document.getElementById('put-file-button').disabled = false;
	};
	reader.readAsArrayBuffer(file);
}

function outf (text) {
	var mypre = document.getElementById("console");
	mypre.innerHTML = mypre.innerHTML + text;
}
function builtinRead (x) {
	if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
		throw "File not found: '" + x + "'";
	return Sk.builtinFiles["files"][x];
}

function runit () {
	var lang_type = window.localStorage.card;
	if (lang_type == "javascript") {
		window.alert("JS");
		var script = Blockly.JavaScript.workspaceToCode(Blockly.getMainWorkspace());
		var blockp5 = new Blockp5(script);
		blockp5.runCode();
		console.log("Running JS");
	}
	else {
		window.alert("Python");
		if (exe_type == 'blocks') {
			var prog = Blockly.Python.workspaceToCode(Blockly.getMainWorkspace());
		}
		else if (exe_type == "custom") {
			var prog = editor.getValue();
		}
		/*var code = Blockly.JavaScript.workspaceToCode(Code.workspace);
		try {
			eval(code);
		} catch (e) {
			alert(MSG['badCode'].replace('%1', e));
		}*/
		var mypre = document.getElementById("console");
		mypre.innerHTML = '';
		Sk.pre = "output";
		//Sk.configure({ output: outf, read: builtinRead });
		Sk.configure({
			inputfun: function (prompt) {
				return window.prompt(prompt);
			},
			inputfunTakesPrompt: true,
			output: outf,
			read: builtinRead
		});
		var myPromise = Sk.misceval.asyncToPromise(function () {
			return Sk.importMainWithBody("<stdin>", false, prog, true);
		});
		myPromise.then(function (mod) {
			outf('>> successfully executed');
		},
			function (err) {
				let ret = err.toString(); // Simple output message
				// Create stacktrace message
				if (err.traceback) {
					for (let i = 0; i < err.traceback.length; i++) {
						ret += "\n  at " + " line " + err.traceback[i].lineno;
						if ("colno" in err.traceback[i]) {
							ret += " column " + err.traceback[i].colno;
						}
					}
				}
				outf("err >> " + ret.toString());
			});
	}
}

function script (url, id) {
	var s = document.createElement('script');
	if (id) {
		s.id = id;
	}
	s.type = 'text/javascript';
	s.async = false;
	s.defer = true;
	s.src = url;
	var x = document.getElementsByTagName('head')[0];
	x.appendChild(s);
}

/**
 * JS debounce 
 * TODO: could be moved to some helper/util file
 */
function debounce (callback, wait) {
	var timeout = null;

	return function () {
		var args = arguments;
		var next = function () {
			return callback.apply(this, args);
		};

		clearTimeout(timeout);
		timeout = setTimeout(next, wait);
	};
}

// Constants used for iframe messaging
var EDITOR_IFRAME_MESSAGING = Object.freeze({
	// Embed editor host type
	host: "pyeditor",
	// Embed editor messaging actions
	actions: {
		workspacesync: "workspacesync",
		workspacesave: "workspacesave",
		workspaceloaded: "workspaceloaded",
		importproject: "importproject"
	}
});

//Allows for different CSS styling in IE10
var doc = document.documentElement;
doc.setAttribute('data-useragent', navigator.userAgent);

/*
Returns an object that defines the behaviour of the Python editor. The editor
is attached to the div with the referenced id.
*/
function pythonEditor (id, autocompleteApi) {
	'use strict';

	// An object that encapsulates the behaviour of the editor.
	var editor = {};
	editor.initialFontSize = 22;
	editor.fontSizeStep = 4;

	// Generates an expanded list of words for the ACE autocomplete to digest.
	var fullWordList = function (apiObj) {
		var wordsHorizontal = [];
		Object.keys(apiObj).forEach(function (module) {
			wordsHorizontal.push(module);
			if (Array.isArray(apiObj[module])) {
				apiObj[module].forEach(function (func) {
					wordsHorizontal.push(module + "." + func);
				});
			} else {
				Object.keys(apiObj[module]).forEach(function (sub) {
					wordsHorizontal.push(module + "." + sub);
					if (Array.isArray(apiObj[module][sub])) {
						apiObj[module][sub].forEach(function (func) {
							wordsHorizontal.push(module + "." + sub + "." + func);
							wordsHorizontal.push(sub + "." + func);
						});
					}
				});
			}
		});
		return (wordsHorizontal);
	};

	// Represents the ACE based editor.
	var ACE = ace.edit(id);  // The editor is in the tag with the referenced id.
	ACE.setOptions({
		enableSnippets: true,  // Enable code snippets.
	});
	ACE.$blockScrolling = Infinity; // Silences the 'blockScrolling' warning
	ACE.setTheme("ace/theme/kr_theme"); // Make it look nice.
	ACE.getSession().setMode("ace/mode/python"); // We're editing Python.
	ACE.getSession().setTabSize(4); // Tab=4 spaces.
	ACE.getSession().setUseSoftTabs(true); // Tabs are really spaces.
	ACE.setFontSize(editor.initialFontSize);
	editor.ACE = ACE;

	// Configure Autocomplete
	// var langTools = ace.require("ace/ext/language_tools");
	// var extraCompletions = fullWordList(autocompleteApi || []).map(function (word) {
	// 	return { "caption": word, "value": word, "meta": "static" };
	// });
	// langTools.setCompleters([langTools.keyWordCompleter, langTools.textCompleter, {
	// 	"identifierRegexps": [/[a-zA-Z_0-9\.\-\u00A2-\uFFFF]/],
	// 	"getCompletions": function (editor, session, pos, prefix, callback) {
	// 		callback(null, extraCompletions);
	// 	}
	// }]);

	editor.enableAutocomplete = function (enable) {
		ACE.setOption('enableBasicAutocompletion', enable);
		ACE.setOption('enableLiveAutocompletion', enable);
		editor.triggerAutocompleteWithEnter(false);
	};

	editor.triggerAutocompleteWithEnter = function (enable) {
		if (!ACE.completer) {
			// Completer not yet initialise, force it by opening and closing it
			ACE.execCommand('startAutocomplete');
			ACE.completer.detach();
		}
		if (enable) {
			ACE.completer.keyboardHandler.bindKey('Return', function (editor) {
				return editor.completer.insertMatch();
			});
		} else {
			ACE.completer.keyboardHandler.removeCommand('Return');
		}
	};

	// Gets the textual content of the editor (i.e. what the user has written).
	editor.getCode = function () {
		return ACE.getValue();
	};

	// Sets the textual content of the editor (i.e. the Python script).
	editor.setCode = function (code) {
		ACE.setValue(code);
		ACE.gotoLine(ACE.session.getLength());
	};

	// Give the editor user input focus.
	editor.focus = function () {
		ACE.focus();
	};

	// Set a handler function to be run if code in the editor changes.
	editor.on_change = function (handler) {
		ACE.getSession().on('change', handler);
	};

	// Return details of all the snippets this editor knows about.
	editor.getSnippets = function () {
		var snippetManager = ace.require("ace/snippets").snippetManager;
		return snippetManager.snippetMap.python_microbit;
	};

	// Triggers a snippet by name in the editor.
	editor.triggerSnippet = function (snippet) {
		var snippetManager = ace.require("ace/snippets").snippetManager;
		snippet = snippetManager.snippetNameMap.python_microbit[snippet];
		if (snippet) {
			snippetManager.insertSnippet(ACE, snippet.content);
		}
	};

	// Given a password and some plaintext, will return an encrypted version.
	editor.encrypt = function (password, plaintext) {
		var key_size = 24;
		var iv_size = 8;
		var salt = forge.random.getBytesSync(8);
		var derived_bytes = forge.pbe.opensslDeriveBytes(password, salt, key_size + iv_size);
		var buffer = forge.util.createBuffer(derived_bytes);
		var key = buffer.getBytes(key_size);
		var iv = buffer.getBytes(iv_size);
		var cipher = forge.cipher.createCipher('AES-CBC', key);
		cipher.start({ iv: iv });
		cipher.update(forge.util.createBuffer(plaintext, 'binary'));
		cipher.finish();
		var output = forge.util.createBuffer();
		output.putBytes('Salted__');
		output.putBytes(salt);
		output.putBuffer(cipher.output);
		return encodeURIComponent(btoa(output.getBytes()));
	};

	// Given a password and cyphertext will return the decrypted plaintext.
	editor.decrypt = function (password, cyphertext) {
		var input = atob(decodeURIComponent(cyphertext));
		input = forge.util.createBuffer(input, 'binary');
		input.getBytes('Salted__'.length);
		var salt = input.getBytes(8);
		var key_size = 24;
		var iv_size = 8;
		var derived_bytes = forge.pbe.opensslDeriveBytes(password, salt, key_size + iv_size);
		var buffer = forge.util.createBuffer(derived_bytes);
		var key = buffer.getBytes(key_size);
		var iv = buffer.getBytes(iv_size);
		var decipher = forge.cipher.createDecipher('AES-CBC', key);
		decipher.start({ iv: iv });
		decipher.update(input);
		var result = decipher.finish();
		return decipher.output.getBytes();
	};

	return editor;
}
/* Attach to the global object if running in node */
console.log(typeof module);
if (typeof module !== 'undefined' && module.exports) {
	global.pythonEditor = pythonEditor;
}

/*
 * Allows the Python Editor to display in multiple languages by manipulating
 * strings with correct JS language objects.
 */
function translations () {
	'use strict';
	// These values must be valid language codes
	// https://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
	var validLangs = ['en', 'es', 'pl', 'hr', 'zh-HK', 'zh-CN', 'zh-TW'];

	/* Replaces DOM script element with the new language js file. */
	function updateLang (newLang, callback) {
		var elementId = 'lang';
		var newLangURL = 'lang/' + newLang + '.js';
		var endsWithURL = new RegExp(newLangURL + "$");
		var runCallback = function () {
			translateEmbedStrings(language);
			callback(language);
		};
		console.log(document.getElementById(elementId).src);
		if (endsWithURL.test(document.getElementById(elementId).src)) {
			// The request newLang is the current one, don't reload js file
			return runCallback(language);
		}
		// Check for a valid language
		if (validLangs.indexOf(newLang) > - 1) {
			document.getElementById(elementId).remove();
			script(newLangURL, elementId);
			document.getElementById(elementId).onload = runCallback;
		} else {
			// Don't throw an error, but inform the console
			runCallback();
			console.error('Requested language not available: ' + newLang);
		}
	}

	/* Replaces the strings already loaded in the DOM, the rest are dynamically loaded. */
	function translateEmbedStrings (language) {
		var buttons = language['static-strings']['buttons'];
		$('.roundbutton').each(function (object, value) {
			var button_id = $(value).attr('id');
			$(value).attr('title', buttons[button_id]['title']);
			$(value).attr('aria-label', buttons[button_id]['title']);
			$(value).children('.roundlabel').text(buttons[button_id]['label']);
			if ((button_id === 'command-serial') && ($('#repl').css('display') !== 'none')) {
				// Serial button strings depend on the REPL being visible
				$(value).attr('title', buttons[button_id]['title-close']);
				$(value).children(':last').text(buttons[button_id]['label-close']);
			}
		});
		$('.ace_text-input').attr('aria-label', language['static-strings']['text-editor']['aria-label']);
		$('#script-name-label').text(language['static-strings']['script-name']['label']);
		$('#request-repl').text(language['webusb']['request-repl']);
		$('#request-serial').text(language['webusb']['request-serial']);
		$('#flashing-text').text(language['webusb']['flashing-text']);
		var optionsStrings = language['static-strings']['options-dropdown'];
		for (var object in optionsStrings) {
			$("#" + object).text(optionsStrings[object]);
		}
		var helpStrings = language['help'];
		for (var object in helpStrings) {
			if (helpStrings.hasOwnProperty(object)) {
				if (object.match(/ver/)) {
					$('#' + object).text(helpStrings[object]);
					continue;
				}
				$('#' + object).text(helpStrings[object]['label']);
				$('#' + object).attr('title', helpStrings[object]['title']);
			}
		}
		var languages = language['languages'];
		for (var object in languages) {
			if (languages.hasOwnProperty(object)) {
				$('#' + object).attr('title', languages[object]['title']);
			}
		}
	}
	console.log("updated lang: ", updateLang);
	return {
		'updateLang': updateLang
	};
}

/*
The following code contains the various functions that connect the behaviour of
the editor to the DOM (web-page).

See the comments in-line for more information.
*/
function web_editor (config) {
	'use strict';

	// Global (useful for testing) instance of the ACE wrapper object
	window.EDITOR = pythonEditor('editor_microbit', config.microPythonApi);

	//var BLOCKS = blocks();
	var TRANSLATIONS = translations();

	// Represents the REPL terminal
	var REPL = null;

	// Indicates if there are unsaved changes to the content of the editor.
	var dirty = false;

	var inIframe = window !== window.parent;

	// Indicate if editor can listen and respond to messages
	var controllerMode = inIframe && urlparse("controller") === "1";

	var usePartialFlashing = true;

	// MicroPython filesystem to be initialised on page load.
	window.micropythonFs = undefined;

	// Sets the name associated with the code displayed in the UI.
	function setName (x) {
		$("#script-name").val(x);
	}

	// Gets the name associated with the code displayed in the UI.
	function getName () {
		return $("#script-name").val();
	}

	// Gets filename and replaces spaces with underscores
	function getSafeName () {
		return getName().replace(" ", "_");
	}

	// Get the font size of the text currently displayed in the editor.
	function getFontSize () {
		return EDITOR.ACE.getFontSize();
	}

	// Set the font size of the text currently displayed in the editor.
	function setFontSize (size) {
		EDITOR.ACE.setFontSize(size);
		$("#request-repl")[0].style.fontSize = "" + size + "px";
		$("#request-serial")[0].style.fontSize = "" + size + "px";

		// Only update font size if REPL is open
		if ($("#repl").css('display') != 'none') {
			REPL.prefs_.set('font-size', size);
		}
	}

	function setLanguage (lang) {
		TRANSLATIONS.updateLang(lang, function (translations) {
			config.translate = translations;
			document.getElementsByTagName('HTML')[0].setAttribute('lang', lang);
			$('ul.tree > li > span > a').removeClass('is-selected');
			$('#' + lang).addClass('is-selected');
		});
	}

	// Checks for feature flags in the config object and shows/hides UI
	// elements as required.
	function setupFeatureFlags () {
		/*if (config.flags.blocks) {
			$("#command-blockly").removeClass('hidden');
			BLOCKS.init();
		}*/
		if (config.flags.snippets) {
			$("#command-snippet").removeClass('hidden');
		}
		if (config.flags.share) {
			$("#command-share").removeClass('hidden');
		}
		if (config.flags.experimental) {
			$('.experimental').removeClass('experimental');
			EDITOR.ACE.renderer.scroller.style.backgroundImage = "url('static/img/experimental.png')";
			EDITOR.enableAutocomplete(true);
			$('#menu-switch-autocomplete').prop("checked", true);
			$('#menu-switch-autocomplete-enter').prop("checked", false);
		}

		// Update the help link to pass feature flag information.
		var helpAnchor = $("#help-link");
		var featureQueryString = Object.keys(config.flags).filter(function (f) {
			return config.flags[f];
		}).map(function (f) {
			return encodeURIComponent(f) + "=true";
		}).join("&");
		helpAnchor.attr("href", helpAnchor.attr("href") + "?" + featureQueryString);

		if (navigator.usb) {
			script('js/microbit/dap.umd.js');
			script('js/microbit/hterm_all.min.js');
			script('js/microbit/partial-flashing.js');
		}
	}

	// Update the docs link to append MicroPython version
	var docsAnchor = $("#docs-link");
	docsAnchor.attr("href", docsAnchor.attr("href") + "en/" + "v" + UPY_VERSION);

	// This function is called to initialise the editor. It sets things up so
	// the user sees their code or, in the case of a new program, uses some
	// sane defaults.
	function setupEditor (message, migration) {
		// Set version in document title
		document.title = document.title + ' ' + EDITOR_VERSION;
		// Setup the Ace editor.
		if (message.n && message.c && message.s) {
			var template = $('#decrypt-template').html();
			Mustache.parse(template);
			var context = config.translate.decrypt;
			if (message.h) {
				context.hint = '(Hint: ' + decodeURIComponent(message.h) + ')';
			}
			vex.open({
				content: Mustache.render(template, context)
			});
			$('#button-decrypt-link').click(function () {
				var password = $('#passphrase').val();
				setName(EDITOR.decrypt(password, message.n));
				EDITOR.setCode(EDITOR.decrypt(password, message.s));
				vex.close();
				EDITOR.focus();
			});
		} else if (migration != null) {
			setName(migration.meta.name);
			EDITOR.setCode(migration.source);
			EDITOR.focus();
		} else {
			// If there's no name, default to something sensible.
			setName('microbit program');
			// A sane default starting point for a new script.
			EDITOR.setCode('# ' + config.translate.code.start + '\n' +
				'from microbit import *\n\n\n' +
				'while True:\n' +
				'    display.scroll(\'Hello, World!\')\n' +
				'    display.show(Image.HEART)\n' +
				'    sleep(2000)\n');
		}
		window.setTimeout(function () {
			// What to do if the user changes the content of the editor.
			EDITOR.on_change(function () {
				dirty = true;
			});
		}, 1);
		// Handles what to do if the name is changed.
		$("#script-name").on("input keyup blur", function () {
			dirty = true;
		});
		// Describes what to do if the user attempts to close the editor without first saving their work.
		window.addEventListener("beforeunload", function (e) {
			if (dirty) {
				var confirmationMessage = config.translate.confirms.quit;
				(e || window.event).returnValue = confirmationMessage;
				return confirmationMessage;
			}
		});
		// Bind the ESCAPE key.
		$(document).keyup(function (e) {
			if (e.keyCode == 27) { // ESCAPE
				if ($('#command-download').is(':visible')) {
					$('#command-download').focus();
				}
				else if ($('#command-flash').is(':visible')) {
					$('#command-flash').focus();
				}
			}
		});
		// Bind drag and drop into editor.
		$('#editor').on('dragover', function (e) {
			e.preventDefault();
			e.stopPropagation();
		});
		$('#editor').on('dragleave', function (e) {
			e.preventDefault();
			e.stopPropagation();
		});
		//$('#editor').on('drop', doDrop);
		// Focus on the element with TAB-STATE=1
		$("#command-download").focus();
	}

	function initializeIframeMessaging () {
		window.addEventListener("load", function () {
			window.parent.postMessage({ type: EDITOR_IFRAME_MESSAGING.host, action: EDITOR_IFRAME_MESSAGING.actions.workspacesync }, "*");
		});

		window.addEventListener(
			"message",
			function (event) {
				if (event.data) {
					var type = event.data.type;

					if (type === EDITOR_IFRAME_MESSAGING.host) {
						var action = event.data.action;

						switch (action) {
							// Parent is sending code to update editor
							case EDITOR_IFRAME_MESSAGING.actions.importproject:
								if (!event.data.project || typeof event.data.project !== "string") {
									throw new Error("Invalid 'project' data type. String should be provided.");
								}
								EDITOR.setCode(event.data.project);
								break;

							// Parent is sending initial code for editor
							// Also here we can sync parent data with editor's data
							case EDITOR_IFRAME_MESSAGING.actions.workspacesync:
								if (!event.data.projects || !Array.isArray(event.data.projects)) {
									throw new Error("Invalid 'projects' data type. Array should be provided.");
								}
								if (event.data.projects.length < 1) {
									throw new Error("'projects' array should contain at least one item.");
								}
								EDITOR.setCode(event.data.projects[0]);
								// Notify parent about editor successfully configured
								window.parent.postMessage({ type: EDITOR_IFRAME_MESSAGING.host, action: EDITOR_IFRAME_MESSAGING.actions.workspaceloaded }, "*");
								break;

							default:
								throw new Error("Unsupported action.");
						}
					}
				}
			},
			false
		);

		var debounceCodeChange = debounce(function (code) {
			window.parent.postMessage({ type: EDITOR_IFRAME_MESSAGING.host, action: EDITOR_IFRAME_MESSAGING.actions.workspacesave, project: code }, "*");
		}, 1000);

		EDITOR.setCode(" ");
		EDITOR.on_change(function () {
			debounceCodeChange(EDITOR.getCode());
		});
	}

	// Sets up the file system and adds the initial main.py
	function setupFilesystem () {
		micropythonFs = new microbitFs.MicropythonFsHex($('#firmware').text());
		//micropythonFs = new microbitFs.MicropythonFsHex("firmware.hex");
		// Limit filesystem size to 20K
		micropythonFs.setStorageSize(20 * 1024);
		// The the current main.py
		micropythonFs.write('main.py', EDITOR.getCode());
	}

	// Based on the Python code magic comment it detects a module
	function isPyModule (codeStr) {
		var isModule = false;
		if (codeStr.length) {
			var codeLines = codeStr.split(/\r?\n/);
			// Only look at the first three lines
			var loopEnd = Math.min(3, codeLines.length);
			for (var i = 0; i < loopEnd; i++) {
				if (codeLines[i].indexOf('# microbit-module:') == 0) {
					isModule = true;
				}
			}
		}
		return isModule;
	}

	// Loads Python code into the editor and/or filesystem
	function loadPy (filename, codeStr) {
		var isModule = isPyModule(codeStr);
		var moduleName = filename.replace('.py', '');
		filename = isModule ? filename : 'main.py';
		var showModuleLoadedAlert = true;
		if (isModule && micropythonFs.exists(filename)) {
			if (!confirm(config.translate.confirms.replace_module.replace('{{module_name}}', moduleName))) {
				return;
			}
			// A confirmation box to replace the module has already been accepted
			showModuleLoadedAlert = false;
		}
		if (codeStr) {
			try {
				micropythonFs.write(filename, codeStr);
			} catch (e) {
				alert(config.translate.alerts.load_code + '\n' + e.message);
			}
		} else {
			return alert(config.translate.alerts.empty);
		}
		if (isModule) {
			if (micropythonFs.getStorageRemaining() < 0) {
				micropythonFs.remove(filename);
				return alert(config.translate.alerts.module_out_of_space);
			}
			if (showModuleLoadedAlert) {
				alert(config.translate.alerts.module_added.replace('{{module_name}}', moduleName));
			}
		} else {
			setName(moduleName);
			EDITOR.setCode(codeStr);
		}
	}

	// Reset the filesystem and load the files from this hex file to the fs and editor
	function loadHex (filename, hexStr) {
		var errorMsg = '';
		var code = '';
		var importedFiles = [];
		var tryOldMethod = false;
		try {
			// If hexStr is parsed correctly it formats the file system before adding the new files
			importedFiles = micropythonFs.importFilesFromIntelHex(hexStr, {
				overwrite: true,
				formatFirst: true
			});
			// Check if imported files includes a main.py file
			if (importedFiles.indexOf('main.py') > -1) {
				code = micropythonFs.read('main.py');
			} else {
				// There is no main.py file, but there could be appended code
				tryOldMethod = true;
				errorMsg += config.translate.alerts.no_main + '\n';
			}
		} catch (e) {
			tryOldMethod = true;
			errorMsg += e.message + '\n';
		}
		if (tryOldMethod) {
			try {
				code = microbitFs.getIntelHexAppendedScript(hexStr);
				micropythonFs.write('main.py', code);
			} catch (e) {
				// Only display an error if there were no files added to the filesystem
				if (!importedFiles.length) {
					errorMsg += config.translate.alerts.no_script + '\n';
					errorMsg += e.message;
					return alert(config.translate.alerts.no_python + '\n\n' +
						config.translate.alerts.error + errorMsg);
				}
			}
		}
		setName(filename.replace('.hex', ''));
		EDITOR.setCode(code);
	}
	// Generates the text for a hex file with MicroPython and the user code
	function generateFullHex (format) {
		var fullHex;
		try {
			// Remove main.py if editor content is empty to download a hex file
			// that includes the filesystem but doesn't try to run any code
			if (!EDITOR.getCode()) {
				if (micropythonFs.exists('main.py')) {
					micropythonFs.remove('main.py');
				}
			} else {
				micropythonFs.write('main.py', EDITOR.getCode());
			}
			// Generate hex file
			if (format == "bytes") {
				fullHex = micropythonFs.getIntelHexBytes();
			} else {
				fullHex = micropythonFs.getIntelHex();
			}
		} catch (e) {
			// We generate a user readable error here to be caught and displayed
			throw new Error(config.translate.alerts.load_code + '\n' + e.message);
		}
		return fullHex;
	}

	// Trap focus in modal and pass focus to first actionable element
	function focusModal (modalId) {
		document.querySelector('body > :not(.vex)').setAttribute('aria-hidden', true);
		var dialog = document.querySelector(modalId);
		var focusableEls = dialog.querySelectorAll('a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])');
		$(focusableEls).each(function () {
			$(this).attr('tabindex', '0');
		});
		dialog.focus();
		dialog.onkeydown = function (event) {
			if (event.which == 9) {
				// if tab key is pressed
				var numberOfFocusableEls = focusableEls.length;
				if (!numberOfFocusableEls) {
					dialog.focus();
					event.preventDefault();
					return;
				}

				var focusedEl = document.activeElement;
				var focusedElIndex = Array.prototype.indexOf.call(focusableEls, focusedEl);
				if (event.which == 16) {
					// if focused on first item and user shift-tabs back, go to the last focusable item
					if (focusedElIndex == 0) {
						focusableEls.item(numberOfFocusableEls - 1).focus();
						event.preventDefault();
					}
				} else {
					// if focused on the last item and user tabs forward, go to the first focusable item
					if (focusedElIndex == numberOfFocusableEls - 1) {
						focusableEls[0].focus();
						event.preventDefault();
					}
				}
			}
		};
	}
	function invalidFileWarning (fileType) {
		if (fileType == "mpy") {
			modalMsg(config['translate']['load']['invalid-file-title'], config['translate']['load']['mpy-warning'], "");
		} else {
			modalMsg(config['translate']['load']['invalid-file-title'], config['translate']['load']['extension-warning'], "");
		}
	}

	/*function doDrop(e) {
		// Triggered when a user drops a file onto the editor.
		e.stopPropagation();
		e.preventDefault();
		var file = e.originalEvent.dataTransfer.files[0];
		var ext = (/[.]/.exec(file.name)) ? /[^.]+$/.exec(file.name) : null;
		var reader = new FileReader();
		if (ext == 'py') {
			reader.onload = function (e) {
				loadPy(file.name, e.target.result);
			};
			reader.readAsText(file);
			$('#editor').focus();
		} else if (ext == 'hex') {
			reader.onload = function (e) {
				loadHex(file.name, e.target.result);
			};
			reader.readAsText(file);
			$('#editor').focus();
		} else {
			invalidFileWarning(ext);
		}
	}*/

	function showDisconnectError (event) {
		var error = { "name": "device-disconnected", "message": config["translate"]["webusb"]["err"]["device-disconnected"] };
		webusbErrorHandler(error);
	}

	function doConnect (serial) {
		// Change button to connecting
		$("#command-connect").hide();
		$("#command-connecting").show();
		$("#command-disconnect").hide();

		// Show error on WebUSB Disconnect Events
		navigator.usb.addEventListener('disconnect', showDisconnectError);

		var p = Promise.resolve();
		if (usePartialFlashing) {
			console.log("Connecting: Using Quick Flash");
			p = PartialFlashing.connectDapAsync();
		}
		else {
			console.log("Connecting: Using Full Flash");
			p = navigator.usb.requestDevice({
				filters: [{ vendorId: 0x0d28, productId: 0x0204 }]
			}).then(function (device) {
				// Connect to device
				window.transport = new DAPjs.WebUSB(device);
				window.daplink = new DAPjs.DAPLink(window.transport);

				// Ensure disconnected
				window.daplink.disconnect().catch(function (e) {
					// Do nothing if already disconnected
				});

				// Connect to board
				return window.daplink.connect();
			})
				.then(function () {
					console.log('Connection Complete');
				});
		}

		return p.then(function () {
			// Dispatch event for listeners
			document.dispatchEvent(new CustomEvent('webusb', {
				'detail': {
					'flash-type': 'webusb',
					'event-type': 'info',
					'message': 'connected'
				}
			}));

			// Change button to disconnect
			$("#command-connect").hide();
			$("#command-connecting").hide();
			$("#command-disconnect").show();

			// Change download to flash
			$("#command-download").hide();
			$("#command-flash").show();

			if (serial) {
				doSerial();
			}
		})
			.catch(webusbErrorHandler);
	}

	function webusbErrorHandler (err) {
		// Display error handler modal
		$("#flashing-overlay-container").css("display", "flex");
		$("#flashing-info").addClass('hidden');

		// Log error to console for feedback
		console.log("An error occurred whilst attempting to use WebUSB.");
		console.log("Details of the error can be found below, and may be useful when trying to replicate and debug the error.");
		console.log(err);
		console.trace();

		// Disconnect from the microbit
		doDisconnect().then(function () {
			// As there has been an error clear the partial flashing DAPWrapper
			if (window.dapwrapper) {
				window.dapwrapper = null;
			}
			if (window.previousDapWrapper) {
				window.previousDapWrapper = null;
			}
		});

		var errorType;
		var errorTitle;
		var errorDescription;

		// Determine type of error
		switch (typeof err) {
			case "object":
				console.log("Caught in Promise or Error object");
				// We might get Error objects as Promise rejection arguments
				if (!err.message && err.promise && err.reason) {
					err = err.reason;
				}

				// Determine error type
				if (err.message === "No valid interfaces found.") {
					errorType = "update-req";
					errorTitle = err.message;
					errorDescription = config["translate"]["webusb"]["err"][errorType];
				} else if (err.message === "Unable to claim interface.") {
					errorType = "clear-connect";
					errorTitle = err.message;
					errorDescription = config["translate"]["webusb"]["err"][errorType];
				} else if (err.name === "device-disconnected") {
					errorType = "device-disconnected";
					errorTitle = err.message;
					// No additional message provided here, err.message is enough
					errorDescription = "";
				} else if (err.name === "timeout-error") {
					errorType = "timeout-error";
					errorTitle = "Connection Timed Out";
					errorDescription = config["translate"]["webusb"]["err"]["reconnect-microbit"];
				} else {
					// Unhandled error. User will need to reconnect their micro:bit
					errorType = "reconnect-microbit";
					errorTitle = "WebUSB Error";
					errorDescription = config["translate"]["webusb"]["err"][errorType];
					if (usePartialFlashing && config.flags.experimental) {
						errorDescription += '<br>' + config["translate"]["webusb"]["err"]["partial-flashing-disable"];
					}
				}

				break;
			case "string":
				// Caught a string. Example case: "Flash error" from DAPjs
				console.log("Caught a string");

				// Unhandled error. User will need to reconnect their micro:bit
				errorType = "reconnect-microbit";
				errorTitle = "WebUSB Error";
				errorDescription = config["translate"]["webusb"]["err"][errorType];
				if (usePartialFlashing && config.flags.experimental) {
					errorDescription += '<br>' + config["translate"]["webusb"]["err"]["partial-flashing-disable"];
				}
				break;
			default:
				// Unexpected error type
				console.log("Unexpected error type: " + typeof (err));

				// Unhandled error. User will need to reconnect their micro:bit
				errorType = "reconnect-microbit";
				errorTitle = "WebUSB Error";
				errorDescription = config["translate"]["webusb"]["err"][errorType];
				if (usePartialFlashing && config.flags.experimental) {
					errorDescription += '<br>' + config["translate"]["webusb"]["err"]["partial-flashing-disable"];
				}
		}

		// If err is not device disconnected or if there is previous errors, append the download/troubleshoot buttons
		var showOverlayButtons = "";
		if (err.name !== 'device-disconnected' || $("#flashing-overlay-error").html() !== "") {
			showOverlayButtons = '<a title="" href="#" id="flashing-overlay-download" class="action" onclick="actionClickListener(event)">';
		}

		var errorHTML =
			'<div>' +
			'<strong>' + errorTitle + '</strong>' +
			'<br >' +
			errorDescription +
			(err.message ? ("<code>Error: " + err.message + "</code>") : "") +
			'</div>' +
			'<div class="flashing-overlay-buttons">' +
			'<hr />' +
			showOverlayButtons +
			'<a title="" href="#" onclick="flashErrorClose()">' + config["translate"]["webusb"]["close"] + '</a>' +
			'</div>';

		// Show error message, or append to existing errors
		if ($("#flashing-overlay-error").html() == "") {
			$("#flashing-overlay-error").html(errorHTML);
		} else {
			$(".flashing-overlay-buttons").hide(); // Hide previous buttons
			$("#flashing-overlay-error").append("<hr />" + errorHTML);
		}

		// Attach download handler
		//$("#flashing-overlay-download").click(doDownload);

		// Make the modal accessible now that all the content is present
		focusModal("#flashing-overlay");
		// If escape key is pressed close modal
		$('#flashing-overlay').keydown(function (e) {
			if (e.which == 27) {
				flashErrorClose();
			}
		});

		// Send event
		var errorMessage = (err.message ? (err.message.replace(/\W+/g, '-').replace(/\W$/, '').toLowerCase()) : "");
		// Append error message, replace all special chars with '-', if last char is '-' remove it
		var details = {
			"flash-type": (usePartialFlashing ? "partial-flash" : "full-flash"),
			"event-type": ((err.name == "device-disconnected") ? "info" : "error"),
			"message": errorType + "/" + errorMessage
		};

		document.dispatchEvent(new CustomEvent('webusb', { detail: details }));
	}

	function doDisconnect () {
		// Remove disconnect listener
		navigator.usb.removeEventListener('disconnect', showDisconnectError);

		// Hide serial and disconnect if open
		if ($("#repl").css('display') != 'none') {
			closeSerial();
		}

		// Change button to connect
		$("#command-disconnect").hide();
		$("#command-connecting").hide();
		$("#command-connect").show();

		// Change flash to download
		$("#command-flash").hide();
		$("#command-download").show();

		var p = Promise.resolve();

		if (usePartialFlashing && window.dapwrapper) {
			console.log('Disconnecting: Using Quick Flash');
			p = p.then(function () { return window.dapwrapper.disconnectAsync(); });
		}
		else if (window.daplink) {
			console.log('Disconnecting: Using Full Flash');
			p = p.then(function () { return window.daplink.disconnect(); });
		}

		p = p.catch(function () {
			console.log('Error during disconnection');
			document.dispatchEvent(new CustomEvent('webusb', {
				'detail': {
					'flash-type': 'webusb',
					'event-type': 'error',
					'message': 'error-disconnecting'
				}
			}));
		}).finally(function () {
			console.log('Disconnection Complete');
			document.dispatchEvent(new CustomEvent('webusb', {
				'detail': {
					'flash-type': 'webusb',
					'event-type': 'info',
					'message': 'disconnected'
				}
			}));
		});

		return p;
	}

	function doFlash () {
		var startTime = new Date().getTime();

		// Hide serial and disconnect if open
		if ($("#repl").css('display') != 'none') {
			closeSerial();
		}

		// Get the hex to flash in bytes format, exit if there is an error
		try {
			var output = generateFullHex('bytes');
		} catch (e) {
			return alert(config.translate.alerts.error + e.message);
		}

		$("#webusb-flashing-progress").val(0).hide();
		$("#webusb-flashing-complete").hide();
		$("#webusb-flashing-loader").show();
		$('#flashing-overlay-error').html("");
		$("#flashing-info").removeClass('hidden');
		$("#flashing-overlay-container").css("display", "flex");

		var connectTimeout = setTimeout(function () {
			var error = { "name": "timeout-error", "message": config["translate"]["webusb"]["err"]["timeout-error"] };
			webusbErrorHandler(error);
		}, 10000);

		var updateProgress = function (progress) {
			$('#webusb-flashing-progress').val(progress).css('display', 'inline-block');
		};

		var p = Promise.resolve();
		if (usePartialFlashing) {
			p = window.dapwrapper.disconnectAsync()
				.then(function () {
					return PartialFlashing.connectDapAsync();
				})
				.then(function () {
					// Clear connecting timeout
					clearTimeout(connectTimeout);

					// Begin flashing
					$("#webusb-flashing-loader").hide();
					$("#webusb-flashing-progress").val(0).css("display", "inline-block");
					return PartialFlashing.flashAsync(window.dapwrapper, output, updateProgress);
				});
		}
		else {
			// Push binary to board
			console.log("Starting Full Flash");
			p = window.daplink.connect()
				.then(function () {
					// Clear connecting timeout
					clearTimeout(connectTimeout);

					// Event to monitor flashing progress
					window.daplink.on(DAPjs.DAPLink.EVENT_PROGRESS, updateProgress);

					// Encode firmware for flashing
					var enc = new TextEncoder();
					var image = enc.encode(output).buffer;

					$("#webusb-flashing-loader").hide();
					$("#webusb-flashing-progress").val(0).css("display", "inline-block");
					return window.daplink.flash(image);
				});
		}

		return p.then(function () {
			// Show tick
			$("#webusb-flashing-progress").hide();
			$("#webusb-flashing-complete").show();

			// Send flash timing event
			var timeTaken = (new Date().getTime() - startTime);
			var details = { "flash-type": (usePartialFlashing ? "partial-flash" : "full-flash"), "event-type": "flash-time", "message": timeTaken };
			document.dispatchEvent(new CustomEvent('webusb', { detail: details }));

			console.log("Flash complete");

			// Close overview
			setTimeout(flashErrorClose, 500);
		})
			.catch(webusbErrorHandler)
			.finally(function () {
				// Remove event listener
				window.removeEventListener("unhandledrejection", webusbErrorHandler);
			});
	}

	function closeSerial (keepSession) {
		console.log("Closing Serial Terminal");
		$('#repl').empty();
		$('#repl').hide();
		$('serial-buttons').removeClass("hidden");
		$('#request-repl').hide();
		$('#request-serial').hide();
		$('#editor-container').show();

		var serialButton = config['translate']['static-strings']['buttons']['command-serial'];
		$('#command-serial').attr('title', serialButton['title']);
		$('#command-serial > .roundlabel').text(serialButton['label']);

		var daplink = usePartialFlashing ? window.dapwrapper.daplink : window.daplink;
		daplink.stopSerialRead();
		daplink.removeAllListeners(DAPjs.DAPLink.EVENT_SERIAL_DATA);
		REPL.uninstallKeyboard();
		REPL.io.pop();
		REPL = null;
	}

	function doSerial () {
		// Hide terminal if it is currently shown
		var serialButton = config["translate"]["static-strings"]["buttons"]["command-serial"];
		if ($("#repl").css('display') != 'none') {
			closeSerial();
			return;
		}

		console.log("Setting Up Serial Terminal");
		$('serial-buttons').addClass("hidden");
		// Check if we need to connect
		if ($("#command-connect").is(":visible")) {
			doConnect(true);
		} else {
			// Change Serial button to close
			$("#command-serial").attr("title", serialButton["title-close"]);
			$("#command-serial > .roundlabel").text(serialButton["label-close"]);

			var daplink = usePartialFlashing ? window.dapwrapper.daplink : window.daplink;

			daplink.connect()
				.then(function () {
					return daplink.setSerialBaudrate(115200);
				})
				.then(function () {
					return daplink.getSerialBaudrate();
				})
				.then(function (baud) {
					daplink.startSerialRead(1);
					lib.init(setupHterm);
				})
				.catch(webusbErrorHandler);
		}
	}

	function setupHterm () {
		if (REPL == null) {
			hterm.defaultStorage = new lib.Storage.Memory();

			REPL = new hterm.Terminal("opt_profileName");
			REPL.options_.cursorVisible = true;
			REPL.prefs_.set('font-size', 22);
			REPL.onTerminalReady = function () {
				var io = REPL.io.push();
				io.onVTKeystroke = function (str) {
					var daplink = usePartialFlashing ? window.dapwrapper.daplink : window.daplink;
					daplink.serialWrite(str);
				};
				io.sendString = function (str) {
					var daplink = usePartialFlashing ? window.dapwrapper.daplink : window.daplink;
					daplink.serialWrite(str);
				};
				io.onTerminalResize = function (columns, rows) {
				};
			};
			REPL.decorate(document.querySelector('#repl'));
			REPL.installKeyboard();

			var daplink = usePartialFlashing ? window.dapwrapper.daplink : window.daplink;
			daplink.on(DAPjs.DAPLink.EVENT_SERIAL_DATA, function (data) {
				REPL.io.print(data); // first byte of data is length
			});
		}

		$("#editor-container").hide();
		$("#repl").show();
		$("serial-buttons").show();
		$("#request-repl").show();
		$("#request-serial").show();

		// Recalculate terminal height
		$("#repl > iframe").css("position", "relative");
		$("#repl").attr("class", "hbox flex1");
		REPL.prefs_.set('font-size', getFontSize());
	}

	function modalMsg (title, content, links) {
		var overlayContainer = "#modal-msg-overlay-container";
		$(overlayContainer).css("display", "block");
		$("#modal-msg-title").text(title);
		$("#modal-msg-content").html(content);
		var modalLinks = [];
		var addCloseClickListener = false;
		if (links) {
			Object.keys(links).forEach(function (key) {
				if (links[key] === "close") {
					modalLinks.push('<button type="button" area-labelledby="modal-msg-close-link" id="modal-msg-close-link">' + key + '</button>');

					addCloseClickListener = true;
				} else {
					modalLinks.push('<button type="button" aria-label="' + key + '" class="button-link" onclick="window.open(\' ' + links[key] + '\', \'_blank\')">' + key + '</button>');
				}
			});
		}
		$("#modal-msg-links").html((modalLinks).join(' | '));
		focusModal("#modal-msg-overlay");
		var modalMsgClose = function () {
			$(overlayContainer).hide();
			$(overlayContainer).off("keydown");
		};
		$("#modal-msg-close-cross").click(modalMsgClose);
		if (addCloseClickListener) {
			$("#modal-msg-close-link").click(modalMsgClose);
		}
		$(overlayContainer).keydown(function (e) {
			if (e.which == 27) {
				modalMsgClose();
			}
		});
	}

	function formatMenuContainer (parentButtonId, containerId) {
		var container = $('#' + containerId);
		if (container.is(':visible')) {
			var parentButton = $('#' + parentButtonId);
			if ($(window).width() > 720) {
				if (container.offset().left !== parentButton.offset().left) {
					container.css('left', parentButton.offset().left);
					container.css('top', parentButton.offset().top + parentButton.outerHeight() + 10);
				}
			} else {
				var containerRight = container.offset().left + container.outerWidth();
				var parentButtonRight = parentButton.offset().left + parentButton.outerWidth();
				if (containerRight !== parentButtonRight) {
					container.css('left', parentButtonRight - container.outerWidth());
					container.css('top', parentButton.offset().top + parentButton.outerHeight() + 10);
				}
			}
		}
	}

	// Join up the buttons in the user interface with some functions for
	// handling what to do when they're clicked.
	function setupButtons () {
		if (navigator.platform.match('Win') !== null) {
			$(".roundsymbol").addClass("winroundsymbol");
			$("#small-icons-left .status-icon").addClass("win-status-icon");
			$("#small-icons-right .status-icon").addClass("win-status-icon");
		}
		$("#command-download").click(function () {
			doDownload();
		});
		$("#command-flash").click(function () {
			doFlash();
		});
		/*$("#command-files").click(function () {
			doFiles();
		});*/
		if (navigator.usb) {
			$("#command-connect").click(function () {
				doConnect();
			});
			$("#command-disconnect").click(function () {
				doDisconnect();
			});
			$("#command-serial").click(function () {
				doSerial();
			});
			$("#request-repl").click(function () {
				var daplink = usePartialFlashing && window.dapwrapper ? window.dapwrapper.daplink : window.daplink;
				daplink.serialWrite('\x03');
				REPL.focus();
			});
			$("#request-serial").click(function () {
				var daplink = usePartialFlashing && window.dapwrapper ? window.dapwrapper.daplink : window.daplink;
				daplink.serialWrite('\x04');
			});
		} else {
			var WebUSBUnavailable = function () {
				var links = {};
				links[config['translate']['webusb']['err']['find-more']] = 'help.html#WebUSB';
				modalMsg('WebUSB', config['translate']['webusb']['err']['unavailable'], links);
			};
			$("#command-connect").click(WebUSBUnavailable);
			$("#command-serial").click(WebUSBUnavailable);

			$("#modal-msg-overlay-container").click(function () {
				$("#modal-msg-overlay-container").hide();
			});
			$("#modal-msg-overlay").click(function (e) {
				e.stopPropagation();
			});
		}
		$("#command-options").click(function (e) {
			// Hide any other open menus and show/hide options menu
			$('#helpsupport_container').addClass('hidden');
			$('#language_container').addClass('hidden');
			formatMenuContainer('command-options', 'options_container');
			// Stop closure of the menu in other local event handlers
			e.originalEvent.keepMenuOpen = true;
		});
		$("#command-help").click(function (e) {
			// Hide any other open menus and show/hide help menu

			$('#language_container').addClass('hidden');
			$('#helpsupport_container').toggleClass('hidden');
			formatMenuContainer('command-help', 'helpsupport_container');
			// Stop closure of the menu in other local event handlers
			e.originalEvent.keepMenuOpen = true;
		});
		$("#command-language").click(function (e) {
			// Hide any other open menus and show/hide help menu

			$('#helpsupport_container').addClass('hidden');
			$('#language_container').toggleClass('hidden');
			formatMenuContainer('command-language', 'language_container');
			// Stop closure of the menu in other local event handlers
			e.originalEvent.keepMenuOpen = true;
		});

		$(".lang-choice").on("click", function () {
			$("#language_container").addClass('hidden');
			setLanguage($(this).attr('id'));
		});

		$('#menu-switch-autocomplete').on('change', function () {
			var setEnable = $(this).is(':checked');
			if (setEnable) {
				$('#autocomplete-enter').removeClass('hidden');
			} else {
				$('#autocomplete-enter').addClass('hidden');
			}
			EDITOR.enableAutocomplete(setEnable);
			var setEnterEnable = $('#menu-switch-autocomplete-enter').is(':checked');
			EDITOR.triggerAutocompleteWithEnter(setEnterEnable);
		});
		$('#menu-switch-autocomplete-enter').on('change', function () {
			var setEnable = $(this).is(':checked');
			EDITOR.triggerAutocompleteWithEnter(setEnable);
		});
		$('#menu-switch-partial-flashing').on('change', function () {
			var setEnable = $(this).is(':checked');
			return doDisconnect()
				.catch(function (err) {
					// Assume an error means that it is already disconnected.
					// console.log("Error disconnecting when " + (setEnable ? "not " : "") + "using partial flashing: \r\n" + err);
				})
				.then(function () { usePartialFlashing = setEnable; });
		});

		window.addEventListener('resize', function () {
			formatMenuContainer('command-options', 'options_container');
			formatMenuContainer('command-help', 'helpsupport_container');
			formatMenuContainer('command-language', 'language_container');
		});

		document.body.addEventListener('click', function (event) {
			if (event.keepMenuOpen) return;
			// Close any button menu on a click is outside menu or a link within
			if ($(event.target).closest('.buttons_menu_container').length == 0 ||
				$(event.target).prop('tagName').toLowerCase() === 'a') {
				$('.buttons_menu_container').addClass('hidden');
			}
		});
	}

	// This function describes what to do when the download button is clicked.
	function doDownload () {
		try {
			var output = generateFullHex("string");
		} catch (e) {
			alert(config.translate.alerts.error + e.message);
			return;
		}
		// Safari before v10 had issues downloading the file blob
		if ($.browser.safari && ($.browser.versionNumber < 10)) {
			alert(config.translate.alerts.download);
			window.open('data:application/octet;charset=utf-8,' + encodeURIComponent(output), '_newtab');
			return;
		}
		// This works in all other browser
		var filename = getSafeName();
		var blob = new Blob([output], { 'type': 'application/octet-stream' });
		saveAs(blob, filename + '.hex');
	}

	// Extracts the query string and turns it into an object of key/value
	// pairs.
	function get_qs_context () {
		var query_string = window.location.search.substring(1);
		if (window.location.href.indexOf("file://") == 0) {
			// Running from the local file system so switch off network share.
			$('#command-share').hide();
			return {};
		}
		var kv_pairs = query_string.split('&');
		var result = {};
		for (var i = 0; i < kv_pairs.length; i++) {
			var kv_pair = kv_pairs[i].split('=');
			result[kv_pair[0]] = decodeURIComponent(kv_pair[1]);
		}
		return result;
	}

	function get_migration () {
		var compressed_project = window.location.toString().split("#project:")[1];
		if (typeof compressed_project === "undefined") return null;
		var bytes = base64js.toByteArray(compressed_project);
		var project = JSON.parse(LZMA.decompress(bytes));
		return project;
	}

	var qs = get_qs_context();
	var migration = get_migration();
	setupFeatureFlags();
	setupEditor(qs, migration);
	setupButtons();
	setLanguage(qs.l || 'en');
	document.addEventListener('DOMContentLoaded', function () {
		// Firmware at the end of the HTML file has to be loaded first
		setupFilesystem();
	});

	// If iframe messaging allowed, initialize it
	if (controllerMode) {
		initializeIframeMessaging();
	}
}

/*
 * Function to close flash error box
 */
function flashErrorClose () {
	$('#flashing-overlay-error').html("");
	$('#flashing-overlay-container').hide();
	$('#flashing-overlay').off("keydown");
}
