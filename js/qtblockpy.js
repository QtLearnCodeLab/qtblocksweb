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
QtBlockPy._textPromptResolver = null;
QtBlockPy._textPromptValidator = null;

QtBlockPy.finishTextPrompt = function (value) {
	var dialog = document.getElementById('textPromptDialog');
	var resolver = QtBlockPy._textPromptResolver;
	QtBlockPy._textPromptResolver = null;
	QtBlockPy._textPromptValidator = null;
	if (dialog && window.QtUI && QtUI.closeDialog) QtUI.closeDialog(dialog);
	if (resolver) resolver(value);
};

QtBlockPy.requestText = function (options) {
	options = options || {};
	return new Promise(function (resolve) {
		var dialog = document.getElementById('textPromptDialog');
		var title = document.getElementById('textPromptTitle');
		var label = document.getElementById('textPromptLabel');
		var input = document.getElementById('textPromptInput');
		var error = document.getElementById('textPromptError');
		if (!dialog || !input || !window.QtUI || !QtUI.openDialog) {
			resolve(null);
			return;
		}
		if (QtBlockPy._textPromptResolver) QtBlockPy.finishTextPrompt(null);
		QtBlockPy._textPromptResolver = resolve;
		QtBlockPy._textPromptValidator = options.validate || null;
		title.textContent = options.title || 'Enter a name';
		label.textContent = options.label || options.message || 'Name';
		input.value = options.initialValue || '';
		error.textContent = '';
		QtUI.openDialog(dialog, document.activeElement);
		setTimeout(function () { input.focus(); input.select(); }, 0);
	});
};

QtBlockPy.setupTextPrompt = function () {
	var form = document.getElementById('textPromptForm');
	var cancel = document.getElementById('textPromptCancel');
	var input = document.getElementById('textPromptInput');
	var error = document.getElementById('textPromptError');
	if (!form || form.dataset.bound === 'true') return;
	form.dataset.bound = 'true';
	form.addEventListener('submit', function (event) {
		event.preventDefault();
		var value = input.value.trim();
		var validation = QtBlockPy._textPromptValidator ? QtBlockPy._textPromptValidator(value) : null;
		if (validation) {
			error.textContent = validation;
			input.focus();
			return;
		}
		QtBlockPy.finishTextPrompt(value);
	});
	cancel.addEventListener('click', function () { QtBlockPy.finishTextPrompt(null); });

	if (window.Blockly && Blockly.dialog && Blockly.dialog.setPrompt) {
		Blockly.dialog.setPrompt(function (message, defaultValue, callback) {
			QtBlockPy.requestText({
				title: 'Create variable',
				label: message,
				initialValue: defaultValue || '',
				validate: function (value) { return value ? null : 'Enter a variable name.'; }
			}).then(function (value) { callback(value); });
		});
	}
};

QtBlockPy.PROJECT_STORAGE_KEY = 'qtblocks-project-v1';
QtBlockPy.project = null;
QtBlockPy._projectEditorUpdate = false;
QtBlockPy._codeModeDirty = false;
QtBlockPy._lastGeneratedBlockCode = '';

QtBlockPy.isBlockMode = function () {
	return window.localStorage.content !== 'off';
};

QtBlockPy.textToDom = function (xmlText) {
	if (Blockly.utils && Blockly.utils.xml && typeof Blockly.utils.xml.textToDom === 'function') {
		return Blockly.utils.xml.textToDom(xmlText);
	}
	if (Blockly.Xml && typeof Blockly.Xml.textToDom === 'function') {
		return Blockly.Xml.textToDom(xmlText);
	}
	throw new Error('XML project loading is unavailable in this Blockly version.');
};

QtBlockPy.generateBlocksCode = function () {
	if (!QtBlockPy.workspace) return '';
	return Blockly.Python.workspaceToCode(QtBlockPy.workspace);
};

QtBlockPy.syncEditorFromBlocks = function () {
	var code = QtBlockPy.generateBlocksCode();
	QtBlockPy._lastGeneratedBlockCode = code;
	if (QtBlockPy.project && QtBlockPy.project.activeFile) {
		QtBlockPy.project.files[QtBlockPy.project.activeFile] = code;
		QtBlockPy.project.blocksXml = Blockly.Xml.domToPrettyText(Blockly.Xml.workspaceToDom(QtBlockPy.workspace));
	}
	if (window.editor && editor.getValue() !== code) {
		QtBlockPy._projectEditorUpdate = true;
		editor.setValue(code, 1);
		QtBlockPy._projectEditorUpdate = false;
	}
	QtBlockPy._codeModeDirty = false;
	QtBlockPy.persistProject();
	return code;
};

QtBlockPy.getActiveProgramSource = function () {
	if (QtBlockPy.isBlockMode()) return QtBlockPy.syncEditorFromBlocks();
	return window.editor ? editor.getValue() : '';
};

QtBlockPy.createDefaultProject = function () {
	return {
		schemaVersion: 1,
		name: 'My QtPi Project',
		entryFile: 'main.py',
		activeFile: 'main.py',
		files: { 'main.py': '' },
		blocksXml: '',
		targetBoard: window.localStorage.card || 'qtneo'
	};
};

QtBlockPy.validateProjectFilename = function (value) {
	var name = String(value || '').trim();
	if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.py$/.test(name)) return 'Use a simple Python file name ending in .py.';
	if (name.length > 64) return 'Keep file names to 64 characters or fewer.';
	return null;
};

QtBlockPy.persistProject = function () {
	if (!QtBlockPy.project) return;
	try { window.localStorage.setItem(QtBlockPy.PROJECT_STORAGE_KEY, JSON.stringify(QtBlockPy.project)); } catch (_) {}
};

QtBlockPy.syncActiveProjectFile = function () {
	if (!QtBlockPy.project || !window.editor || QtBlockPy._projectEditorUpdate) return;
	QtBlockPy.project.files[QtBlockPy.project.activeFile] = editor.getValue();
	if (!QtBlockPy.isBlockMode()) QtBlockPy._codeModeDirty = true;
	QtBlockPy.persistProject();
};

QtBlockPy.setProjectFilesVisible = function (visible) {
	var bar = document.getElementById('project-filebar');
	if (bar) bar.classList.toggle('is-visible', Boolean(visible));
	if (window.editor) setTimeout(function () { editor.resize(); }, 0);
};

QtBlockPy.renderProjectTabs = function () {
	var tabs = document.getElementById('project-file-tabs');
	if (!tabs || !QtBlockPy.project) return;
	tabs.innerHTML = '';
	Object.keys(QtBlockPy.project.files).forEach(function (filename) {
		var button = document.createElement('button');
		button.type = 'button';
		button.className = 'project-file-tab' + (filename === QtBlockPy.project.activeFile ? ' is-active' : '');
		button.textContent = filename === QtBlockPy.project.entryFile ? filename + ' ★' : filename;
		button.title = filename === QtBlockPy.project.entryFile ? 'Project start file' : 'Open ' + filename;
		button.addEventListener('click', function () { QtBlockPy.openProjectFile(filename); });
		tabs.appendChild(button);
	});
};

QtBlockPy.openProjectFile = function (filename) {
	if (!QtBlockPy.project || !Object.prototype.hasOwnProperty.call(QtBlockPy.project.files, filename)) return;
	QtBlockPy.syncActiveProjectFile();
	QtBlockPy.project.activeFile = filename;
	QtBlockPy._projectEditorUpdate = true;
	editor.session.setMode('ace/mode/python');
	editor.setValue(QtBlockPy.project.files[filename], 1);
	QtBlockPy._projectEditorUpdate = false;
	QtBlockPy.persistProject();
	QtBlockPy.renderProjectTabs();
};

QtBlockPy.uniqueProjectFilename = function (filename) {
	if (!Object.prototype.hasOwnProperty.call(QtBlockPy.project.files, filename)) return filename;
	var base = filename.replace(/\.py$/i, '');
	var index = 2;
	while (QtBlockPy.project.files[base + '-' + index + '.py'] !== undefined) index++;
	return base + '-' + index + '.py';
};

QtBlockPy.projectOpenImportedFile = function (filename, content) {
	if (!QtBlockPy.project) QtBlockPy.project = QtBlockPy.createDefaultProject();
	var safeName = QtBlockPy.normalizeDownloadFilename(filename, '.py');
	if (QtBlockPy.validateProjectFilename(safeName)) safeName = 'imported.py';
	if (QtBlockPy.project.files[safeName] !== undefined && safeName !== QtBlockPy.project.activeFile) {
		safeName = QtBlockPy.uniqueProjectFilename(safeName);
	}
	QtBlockPy.syncActiveProjectFile();
	QtBlockPy.project.files[safeName] = String(content || '');
	QtBlockPy.openProjectFile(safeName);
	QtBlockPy.setProjectFilesVisible(true);
};

QtBlockPy.newProjectFile = async function () {
	var value = await QtBlockPy.requestText({
		title: 'New project file',
		label: 'Python file name',
		initialValue: 'module.py',
		validate: function (name) {
			var error = QtBlockPy.validateProjectFilename(name);
			if (error) return error;
			return QtBlockPy.project.files[name] !== undefined ? 'A file with this name already exists.' : null;
		}
	});
	if (value === null) return;
	QtBlockPy.syncActiveProjectFile();
	QtBlockPy.project.files[value] = '';
	QtBlockPy.openProjectFile(value);
};

QtBlockPy.renameProjectFile = async function () {
	var current = QtBlockPy.project.activeFile;
	var value = await QtBlockPy.requestText({
		title: 'Rename project file',
		label: 'Python file name',
		initialValue: current,
		validate: function (name) {
			var error = QtBlockPy.validateProjectFilename(name);
			if (error) return error;
			return name !== current && QtBlockPy.project.files[name] !== undefined ? 'A file with this name already exists.' : null;
		}
	});
	if (value === null || value === current) return;
	QtBlockPy.syncActiveProjectFile();
	QtBlockPy.project.files[value] = QtBlockPy.project.files[current];
	delete QtBlockPy.project.files[current];
	if (QtBlockPy.project.entryFile === current) QtBlockPy.project.entryFile = value;
	QtBlockPy.project.activeFile = value;
	QtBlockPy.persistProject();
	QtBlockPy.renderProjectTabs();
};

QtBlockPy.deleteProjectFile = function () {
	var names = Object.keys(QtBlockPy.project.files);
	if (names.length <= 1) {
		QtBlockPy.showFriendlyError('A project needs at least one Python file.');
		return;
	}
	var current = QtBlockPy.project.activeFile;
	delete QtBlockPy.project.files[current];
	var next = Object.keys(QtBlockPy.project.files)[0];
	if (QtBlockPy.project.entryFile === current) QtBlockPy.project.entryFile = next;
	QtBlockPy.project.activeFile = next;
	QtBlockPy._projectEditorUpdate = true;
	editor.setValue(QtBlockPy.project.files[next], 1);
	QtBlockPy._projectEditorUpdate = false;
	QtBlockPy.persistProject();
	QtBlockPy.renderProjectTabs();
};

QtBlockPy.exportProject = function () {
	QtBlockPy.syncActiveProjectFile();
	if (QtBlockPy.workspace) {
		QtBlockPy.project.blocksXml = Blockly.Xml.domToPrettyText(Blockly.Xml.workspaceToDom(QtBlockPy.workspace));
	}
	QtBlockPy.project.targetBoard = window.localStorage.card || 'qtneo';
	QtBlockPy.download('qtpi-project.qtpi.json', JSON.stringify(QtBlockPy.project, null, 2));
};

QtBlockPy.uploadProjectToBoard = async function () {
	var port = QtBlockPy.selectedVedaPort;
	if (!port) {
		QtBlockPy.showFriendlyError('Connect a QtPi Veda board before uploading the project.');
		return;
	}
	QtBlockPy.syncActiveProjectFile();
	var files = Object.assign({}, QtBlockPy.project.files);
	if (!Object.prototype.hasOwnProperty.call(files, 'main.py')) {
		files['main.py'] = 'exec(open(' + JSON.stringify(QtBlockPy.project.entryFile) + ').read(), globals())\n';
	}
	var totalSize = Object.keys(files).reduce(function (sum, name) { return sum + files[name].length; }, 0);
	if (totalSize > 256 * 1024) {
		QtBlockPy.showFriendlyError('This project is too large for one classroom upload. Keep the Python files below 256 KB.');
		return;
	}

	await QtBlockPy.stopSerialStream();
	var reader = null;
	var writer = null;
	var reading = true;
	try {
		if (!port.readable || !port.writable) await port.open({ baudRate: 115200 });
		reader = port.readable.getReader();
		writer = port.writable.getWriter();
		QtBlockPy._activeReader = reader;
		QtBlockPy._activeWriter = writer;
		var encoder = new TextEncoder();
		var decoder = new TextDecoder();

		var serialReader = QtBlockPy.createSerialReadQueue(reader, decoder);
		var readUntil = serialReader.readUntil;

		QtBlockPy.showFeedbackToast('Opening the board workspace...');
		var rawRepl = await QtBlockPy.enterRawRepl(writer, serialReader, { encoder: encoder, timeoutMs: 3500 });
		if (!rawRepl.ready) throw new Error(QtBlockPy.rawReplError(rawRepl));

		var names = Object.keys(files);
		for (var index = 0; index < names.length; index++) {
			var filename = names[index];
			var marker = '__QTPI_FILE_' + index + '_OK__';
			var base64 = btoa(unescape(encodeURIComponent(files[filename])));
			var script = 'import ubinascii\r\n' +
				'_d=ubinascii.a2b_base64("' + base64 + '")\r\n' +
				'with open(' + JSON.stringify(filename) + ',"wb") as _f:\r\n _f.write(_d)\r\n' +
				'print("' + marker + '")\r\n';
			QtBlockPy.showFeedbackToast('Uploading ' + filename + ' (' + (index + 1) + '/' + names.length + ')...');
			await writer.write(encoder.encode(script + '\x04'));
			var response = await readUntil(marker, 7000);
			if (!response.includes(marker)) throw new Error('The board did not confirm ' + filename + '.');
		}
		await writer.write(encoder.encode('\x02\x04'));
		QtBlockPy.showFeedbackToast('Project uploaded. The board is restarting now.');
	} catch (error) {
		QtBlockPy.showFriendlyError('Project upload failed: ' + (error.message || error));
	} finally {
		reading = false;
		try { if (reader) { await reader.cancel(); reader.releaseLock(); } } catch (_) {}
		try { if (writer) writer.releaseLock(); } catch (_) {}
		try { await port.close(); } catch (_) {}
		QtBlockPy['_activeReader'] = null;
		QtBlockPy['_activeWriter'] = null;
	}
};

QtBlockPy.importProject = function (text) {
	var parsed = JSON.parse(text);
	if (parsed.schemaVersion !== 1 || !parsed.files || typeof parsed.files !== 'object') throw new Error('This is not a supported QtPi project file.');
	var names = Object.keys(parsed.files);
	if (!names.length || names.some(function (name) { return QtBlockPy.validateProjectFilename(name); })) throw new Error('The project contains an invalid Python file name.');
	if (names.length > 50) throw new Error('A project can contain at most 50 Python files.');
	var safeFiles = {};
	var totalSize = 0;
	names.forEach(function (name) {
		var content = String(parsed.files[name] || '');
		totalSize += content.length;
		safeFiles[name] = content;
	});
	if (totalSize > 1024 * 1024) throw new Error('This project is larger than the 1 MB classroom project limit.');
	if (!parsed.entryFile || parsed.files[parsed.entryFile] === undefined) throw new Error('The project start file is missing.');
	QtBlockPy.project = {
		schemaVersion: 1,
		name: String(parsed.name || 'My QtPi Project'),
		entryFile: parsed.entryFile,
		activeFile: parsed.files[parsed.activeFile] !== undefined ? parsed.activeFile : parsed.entryFile,
		files: safeFiles,
		blocksXml: String(parsed.blocksXml || ''),
		targetBoard: String(parsed.targetBoard || 'qtneo')
	};
	if (QtBlockPy.project.blocksXml && QtBlockPy.workspace) {
		QtBlockPy.replaceWorkspaceFromXml(QtBlockPy.project.blocksXml);
		QtBlockPy.project.files[QtBlockPy.project.activeFile] = QtBlockPy._lastGeneratedBlockCode;
	}
	QtBlockPy.openProjectFile(QtBlockPy.project.activeFile);
	QtBlockPy.setProjectFilesVisible(true);
};

QtBlockPy.initProjectWorkspace = function () {
	try {
		var stored = JSON.parse(window.localStorage.getItem(QtBlockPy.PROJECT_STORAGE_KEY) || 'null');
		var validStoredProject = stored && stored.schemaVersion === 1 && stored.files &&
			typeof stored.files === 'object' && !Array.isArray(stored.files) &&
			Object.keys(stored.files).length > 0;
		QtBlockPy.project = validStoredProject ? stored : QtBlockPy.createDefaultProject();
	} catch (_) {
		QtBlockPy.project = QtBlockPy.createDefaultProject();
	}
	if (!QtBlockPy.project.activeFile || QtBlockPy.project.files[QtBlockPy.project.activeFile] === undefined) {
		QtBlockPy.project.activeFile = QtBlockPy.project.files[QtBlockPy.project.entryFile] !== undefined
			? QtBlockPy.project.entryFile
			: Object.keys(QtBlockPy.project.files)[0];
	}
	if (window.localStorage.content === 'off' && window.editor) {
		QtBlockPy._projectEditorUpdate = true;
		editor.session.setMode('ace/mode/python');
		editor.setValue(String(QtBlockPy.project.files[QtBlockPy.project.activeFile] || ''), 1);
		QtBlockPy._projectEditorUpdate = false;
	}
	QtBlockPy.renderProjectTabs();
	if (window.editor && editor.session) editor.session.on('change', QtBlockPy.syncActiveProjectFile);
	QtBlockPy.setProjectFilesVisible(window.localStorage.content === 'off');
};
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
	QtBlockPy.setupTextPrompt();
	QtBlockPy.initProjectWorkspace();
	QtBlockPy.workspace.addChangeListener(QtBlockPy.renderCodePreview);
	QtBlockPy.workspace.render();
	QtBlockPy.loadFile();
	window.addEventListener('unload', QtBlockPy.backupBlocks, false);
	window.addEventListener('unload', QtBlockPy.releaseAllSerialPorts, false);
	QtBlockPy.webrepl_init();

	var value = "None";
	$('#boards option[value="' + value + '"]').attr('selected', 'selected').text();
	$('#btn_stop').addClass("hidden");
	QtBlockPy.closeCodePreview();

	QtBlockPy.refreshVedaPorts();
	if (navigator.serial) {
		navigator.serial.addEventListener('connect', function () {
			QtBlockPy.refreshVedaPorts();
		});
		navigator.serial.addEventListener('disconnect', function () {
			QtBlockPy.refreshVedaPorts();
		});
	}
};
QtBlockPy.loadFile = function () {
	var urlFile = QtBlockPy.getStringParamFromUrl('url', '');
	if (urlFile.endsWith(".py")) {
		$.get(urlFile, function (data) {
			$('#codeORblock').prop("checked", false);
			QtUI.showPane("#content_code");
			$('#btn_print').addClass("hidden");
			$('#btn_preview').addClass("hidden");
			$('#btn_search').removeClass("hidden");
			$('#btn_run').addClass("hidden");
			$('#btn_run_custom').removeClass("hidden");
			window.localStorage.content = "off";
			if (window.editor) {
				editor.session.setMode("ace/mode/python");
				editor.setOptions({
					enableBasicAutocompletion: true,
					enableSnippets: true,
					enableLiveAutocompletion: true
				});
				QtBlockPy.projectOpenImportedFile((urlFile.split('/').pop() || 'main.py').split('?')[0], data);
			}
			QtBlockPy.setProjectFilesVisible(true);
		}, 'text');
		return;
	}
	if (urlFile.endsWith(".ino")) {
		$.get(urlFile, function (data) {
			$('#codeORblock').prop("checked", false);
			QtUI.showPane("#content_code");
			$('#btn_print').addClass("hidden");
			$('#btn_preview').addClass("hidden");
			$('#btn_search').removeClass("hidden");
			$('#btn_run').addClass("hidden");
			$('#btn_run_custom').removeClass("hidden");
			window.localStorage.content = "off";
			if (window.editor) {
				editor.session.setMode("ace/mode/c_cpp");
				editor.setOptions({
					enableBasicAutocompletion: true,
					enableSnippets: true,
					enableLiveAutocompletion: true
				});
				editor.setValue(data, 1);
			}
			QtBlockPy.setProjectFilesVisible(false);
		}, 'text');
		return;
	}
	if (urlFile.endsWith(".xml")) {
		$.get(urlFile, function (data) {
			if (QtBlockPy.workspace) {
				QtBlockPy.workspace.clear();
			}
			QtBlockPy.loadBlocks(data);
			$('#codeORblock').prop("checked", true);
			window.localStorage.content = "on";
			QtUI.showPane("#content_blocks");
			$('#btn_print').removeClass("hidden");
			$('#btn_preview').removeClass("hidden");
			$('#btn_run').removeClass("hidden");
			$('#btn_run_custom').addClass("hidden");
			$('#btn_stop').addClass("hidden");
			$('#btn_stop_custom').addClass("hidden");
			$('#btn_search').addClass("hidden");
			if (window.editor && QtBlockPy.workspace) {
				var code = Blockly.Python.workspaceToCode(QtBlockPy.workspace);
				editor.setValue(code, 1);
			}
			QtBlockPy.renderCodePreview();
		}, 'text');
		return;
	}
	var loadOnce = null;
	try { loadOnce = window.localStorage.loadOnceBlocks; } catch (e) { }
	if (urlFile) {
		$.get(urlFile, function (data) { QtBlockPy.loadBlocks(data); }, 'text');
	} else {
		QtBlockPy.loadBlocks();
	}
};

QtBlockPy.VEDA_USB_FILTERS = [
	{ usbVendorId: 0x10c4 }, // CP210x (QtPi Veda ESP32)
	{ usbVendorId: 0x1a86 }, // CH340 / CH341 / CH9102 (QtPi Veda ESP32 / Mega)
	{ usbVendorId: 0x303a }, // ESP32-S2 / S3 / native USB
	{ usbVendorId: 0x2341 }, // Mega 2560 / Uno (QtPi Veda Classic)
	{ usbVendorId: 0x0403 }  // FTDI
];

QtBlockPy.activeVedaPorts = [];
QtBlockPy.selectedVedaPort = null;

QtBlockPy.matchVedaBoard = function (portInfo, port) {
	if (!portInfo && !port) return null;
	var vid = (portInfo?.usbVendorId || 0).toString(16).toLowerCase().padStart(4, '0');
	var pid = (portInfo?.usbProductId || 0).toString(16).toLowerCase().padStart(4, '0');
	if (vid === '10c4' && pid === 'ea60') return { name: 'QtPi Veda ESP32 (CP2102)', type: 'usb', label: 'QtPi Veda ESP32 (USB)' };
	if (vid === '1a86' && pid === '7523') return { name: 'QtPi Veda (CH340)', type: 'usb', label: 'QtPi Veda (USB CH340)' };
	if (vid === '303a' && pid === '1001') return { name: 'QtPi Veda ESP32-S3', type: 'usb', label: 'QtPi Veda ESP32-S3 (USB)' };
	if (vid === '303a' && pid === '0002') return { name: 'QtPi Veda ESP32-S2', type: 'usb', label: 'QtPi Veda ESP32-S2 (USB)' };
	if (vid === '2341' && (pid === '0042' || pid === '0010')) return { name: 'QtPi Veda 2560 (Mega)', type: 'usb', label: 'QtPi Veda 2560 (USB)' };

	var portName = String(port?.portName || portInfo?.displayName || '').toLowerCase();
	if (portName.includes('qtveda')) {
		return { name: 'QtVeda (Bluetooth SPP)', type: 'bluetooth', label: 'QtVeda (Bluetooth SPP)' };
	}
	if (vid !== '0000') {
		return { name: 'QtPi Veda (USB Serial)', type: 'usb', label: 'QtPi Veda (USB Serial)' };
	}
	return { name: 'QtVeda Board', type: 'bluetooth', label: 'QtVeda Board (Bluetooth SPP)' };
};

QtBlockPy.deduplicateVedaPorts = function (entries, platform) {
	var items = Array.isArray(entries) ? entries : [];
	var isMac = /mac/i.test(String(platform || ''));
	var seenPorts = [];
	var seenIdentities = {};

	function details(entry) {
		var port = entry.port || {};
		var info = entry.info || {};
		var vid = Number(info.usbVendorId || 0).toString(16).toLowerCase().padStart(4, '0');
		var pid = Number(info.usbProductId || 0).toString(16).toLowerCase().padStart(4, '0');
		var portName = String(port.portName || info.portName || port.displayName || info.displayName || '').toLowerCase();
		var serialNumber = String(info.serialNumber || port.serialNumber || '').toLowerCase();
		return { vid: vid, pid: pid, portName: portName, serialNumber: serialNumber };
	}

	// A CP2102 can appear twice on macOS through Apple's native driver and the
	// legacy Silicon Labs driver. Prefer the native usbserial endpoint.
	var hasNativeCp2102 = isMac && items.some(function (entry) {
		var value = details(entry);
		return value.vid === '10c4' && value.portName.includes('usbserial');
	});

	return items.filter(function (entry) {
		if (seenPorts.indexOf(entry.port) !== -1) return false;
		seenPorts.push(entry.port);
		var value = details(entry);
		if (hasNativeCp2102 && value.vid === '10c4' && value.portName.includes('slab_usb')) return false;

		var stableId = value.serialNumber || value.portName;
		// Chromium may hide both the device path and serial number. On macOS,
		// identical anonymous VID/PID handles are the same dual-driver board.
		var identity = stableId
			? value.vid + ':' + value.pid + ':' + stableId
			: (isMac ? value.vid + ':' + value.pid + ':' + entry.match.type : '');
		if (!identity) return true;
		if (seenIdentities[identity]) return false;
		seenIdentities[identity] = true;
		return true;
	});
};

QtBlockPy.getPreferredVedaPortIndex = function (entries, options) {
	var items = Array.isArray(entries) ? entries : [];
	options = options || {};
	if (items.length === 0) return -1;

	if (options.preferredPort) {
		var exactIndex = items.findIndex(function (entry) { return entry.port === options.preferredPort; });
		if (exactIndex !== -1) return exactIndex;
	}
	if (options.preferredType) {
		var requestedTypeIndex = items.findIndex(function (entry) {
			return entry.match && entry.match.type === options.preferredType;
		});
		if (requestedTypeIndex !== -1) return requestedTypeIndex;
	}

	// A remembered Bluetooth pairing can remain visible after MicroPython is
	// installed, but the QtPi MicroPython console is available over USB. Always
	// prefer a recognized USB board unless the learner explicitly chose Bluetooth.
	var usbIndex = items.findIndex(function (entry) {
		return entry.match && entry.match.type === 'usb';
	});
	return usbIndex === -1 ? 0 : usbIndex;
};


QtBlockPy._activeReader = null;
QtBlockPy._activeWriter = null;
QtBlockPy._activeReadPromise = null;
QtBlockPy._mpyProbedPort = null;
QtBlockPy._isAborted = false;
QtBlockPy._probeRetryTimer = null;
QtBlockPy._boardExecutionActive = false;
QtBlockPy._boardRuntime = 'unknown';

QtBlockPy.createSerialReadQueue = function (reader, decoder) {
	var buffered = '';
	var pendingRead = null;

	async function readChunk(timeoutMs) {
		if (!pendingRead) {
			pendingRead = reader.read().then(function (result) {
				pendingRead = null;
				return result;
			}, function (error) {
				pendingRead = null;
				throw error;
			});
		}
		return Promise.race([
			pendingRead,
			new Promise(function (resolve) {
				setTimeout(function () { resolve({ timeout: true }); }, timeoutMs);
			})
		]);
	}

	return {
		readUntil: async function (delimiter, timeoutMs) {
			var deadline = Date.now() + timeoutMs;
			while (Date.now() < deadline) {
				var delimiterIndex = buffered.indexOf(delimiter);
				if (delimiterIndex !== -1) {
					var matchEnd = delimiterIndex + delimiter.length;
					var matched = buffered.slice(0, matchEnd);
					buffered = buffered.slice(matchEnd);
					return matched;
				}
				var result = await readChunk(Math.max(1, deadline - Date.now()));
				if (!result || result.timeout || result.done) break;
				if (result.value) buffered += decoder.decode(result.value, { stream: true });
			}
			var captured = buffered;
			buffered = '';
			return captured;
		}
	};
};

QtBlockPy.enterRawRepl = async function (writer, serialReader, options) {
	options = options || {};
	var encoder = options.encoder || new TextEncoder();
	var attempts = options.attempts || 3;
	var capture = '';
	var readUntil = typeof serialReader === 'function'
		? serialReader
		: serialReader.readUntil.bind(serialReader);

	for (var attempt = 1; attempt <= attempts; attempt += 1) {
		// Stop main.py first. Sending Ctrl-A in the same burst is unreliable
		// because MicroPython may consume it while printing KeyboardInterrupt.
		await writer.write(encoder.encode('\r\x03\x03'));
		await new Promise(function (resolve) {
			setTimeout(resolve, options.interruptSettleMs || 100);
		});
		await writer.write(encoder.encode('\r\x01'));
		var response = await readUntil('raw REPL', options.timeoutMs || 2600);
		capture += response;
		if (response.includes('raw REPL')) {
			return { ready: true, response: response, capture: capture, attempts: attempt };
		}
		if (attempt < attempts) {
			await new Promise(function (resolve) {
				setTimeout(resolve, (options.retryDelayMs || 160) * attempt);
			});
		}
	}

	return { ready: false, response: '', capture: capture, attempts: attempts };
};

QtBlockPy.rawReplError = function (result) {
	var capture = result && result.capture ? result.capture : '';
	if (/MicroPython|KeyboardInterrupt|Traceback|>>>|uqtpy/i.test(capture)) {
		return 'MicroPython is running, but the current program could not be interrupted. Reset the board and try again.';
	}
	if (!capture.trim()) {
		return 'The board did not respond over USB. Reconnect the cable, select the port again, and retry.';
	}
	return 'The board responded, but did not enter the MicroPython console. It may be running different firmware.';
};

QtBlockPy.getBoardReadinessText = function (isBluetooth) {
	var transport = isBluetooth ? 'Bluetooth paired' : 'USB paired';
	if (QtBlockPy._boardRuntime === 'checking') return transport + ' • Checking board firmware…';
	if (QtBlockPy._boardRuntime === 'micropython') return transport + ' • MicroPython ready for Upload & Run.';
	if (QtBlockPy._boardRuntime === 'firmata') return transport + ' • Code2Play firmware detected; QtBlockly needs MicroPython.';
	return transport + ' • Board runtime not confirmed yet.';
};

QtBlockPy.setBoardRuntime = function (runtime) {
	QtBlockPy._boardRuntime = runtime || 'unknown';
	var flashButton = document.getElementById ? document.getElementById('btn_flash') : null;
	var statusSub = document.getElementById ? document.getElementById('veda_status_sub') : null;
	var activeItem = QtBlockPy.selectedVedaPort && QtBlockPy.activeVedaPorts
		? QtBlockPy.activeVedaPorts.find(function (item) { return item.port === QtBlockPy.selectedVedaPort; })
		: null;
	if (statusSub && activeItem) {
		statusSub.textContent = QtBlockPy.getBoardReadinessText(activeItem.match.type === 'bluetooth');
	}
	if (!flashButton) return;

	var isFirmata = QtBlockPy._boardRuntime === 'firmata';
	var isChecking = QtBlockPy._boardRuntime === 'checking';
	flashButton.classList.toggle('is-runtime-hidden', isFirmata);
	flashButton.disabled = isFirmata || isChecking;

	if (isFirmata) {
		flashButton.setAttribute('aria-label', 'MicroPython required for QtBlockly');
		flashButton.setAttribute('title', 'This board is in Code2Play mode. Install MicroPython to use QtBlockly.');
	} else if (isChecking) {
		flashButton.setAttribute('aria-label', 'Checking board firmware');
		flashButton.setAttribute('title', 'Checking board firmware...');
	} else {
		flashButton.setAttribute('aria-label', 'Upload & Run on QtPi');
		flashButton.setAttribute('title', 'Upload & Run on QtPi');
	}
};

QtBlockPy.setBoardExecutionActive = function (active) {
	QtBlockPy._boardExecutionActive = Boolean(active);
	var codeMode = window.localStorage.content === 'off';
	if (active) {
		$('#btn_run').addClass('hidden');
		$('#btn_run_custom').addClass('hidden');
		$(codeMode ? '#btn_stop_custom' : '#btn_stop').removeClass('hidden');
	} else if (typeof QtBlockPy.cleanupExecution === 'function') {
		QtBlockPy.cleanupExecution();
	}
};

QtBlockPy.stopSerialStream = async function (options) {
	options = options || {};
	QtBlockPy._isAborted = true;
	if (QtBlockPy._probeRetryTimer) {
		clearTimeout(QtBlockPy._probeRetryTimer);
		QtBlockPy._probeRetryTimer = null;
	}
	if (options.interruptBoard && QtBlockPy.selectedVedaPort) {
		var interruptWriter = QtBlockPy._activeWriter;
		var ownsInterruptWriter = false;
		try {
			if (!QtBlockPy.selectedVedaPort.readable || !QtBlockPy.selectedVedaPort.writable) {
				await QtBlockPy.selectedVedaPort.open({ baudRate: 115200 });
			}
			if (!interruptWriter && QtBlockPy.selectedVedaPort.writable) {
				interruptWriter = QtBlockPy.selectedVedaPort.writable.getWriter();
				ownsInterruptWriter = true;
			}
			if (interruptWriter) {
				// Stop the running script, then leave raw REPL for the normal friendly REPL.
				await interruptWriter.write(new TextEncoder().encode('\x03\x03\x02'));
			}
		} catch (e) {
			// The port may already be disconnected; teardown below must still continue.
		} finally {
			if (ownsInterruptWriter && interruptWriter) {
				try { interruptWriter.releaseLock(); } catch (e) {}
			}
		}
	}
	if (QtBlockPy._activeReader) {
		try {
			if (QtBlockPy._activeReader.cancel) await QtBlockPy._activeReader.cancel();
		} catch (e) {}
		if (QtBlockPy._activeReadPromise) {
			try { await QtBlockPy._activeReadPromise; } catch (e) {}
			QtBlockPy._activeReadPromise = null;
		}
		try {
			QtBlockPy._activeReader.releaseLock();
		} catch (e) {}
		QtBlockPy._activeReader = null;
	}
	if (QtBlockPy._activeWriter) {
		try {
			QtBlockPy._activeWriter.releaseLock();
		} catch (e) {}
		QtBlockPy._activeWriter = null;
	}
	if (QtBlockPy.selectedVedaPort && typeof QtBlockPy.selectedVedaPort.close === 'function') {
		try {
			await QtBlockPy.selectedVedaPort.close();
		} catch (e) {}
	}
};

/**
 * releaseAllSerialPorts — safe teardown of every held WebSerial resource.
 * Called on pagehide, visibilitychange (hidden), and unload so the OS serial
 * port is freed for other applications (e.g. Hardware Flasher, Arduino IDE)
 * as soon as QtBlocks is no longer the active page.
 */
QtBlockPy.releaseAllSerialPorts = async function () {
	QtBlockPy._isAborted = true;
	await QtBlockPy.stopSerialStream({ interruptBoard: true });
	if (QtBlockPy._mpyProbedPort && typeof QtBlockPy._mpyProbedPort.close === 'function') {
		try { await QtBlockPy._mpyProbedPort.close(); } catch (_) {}
		QtBlockPy._mpyProbedPort = null;
	}
	QtBlockPy.selectedVedaPort = null;
	QtBlockPy.setBoardRuntime('unknown');
	if (navigator.serial && typeof navigator.serial.getPorts === 'function') {
		try {
			var ports = await navigator.serial.getPorts();
			for (var i = 0; i < ports.length; i++) {
				var p = ports[i];
				if (p) {
					try { await p.close(); } catch (_) {}
				}
			}
		} catch (_) {}
	}
};

// ── Serial Port Lifecycle Hooks ─────────────────────────────────────────────
// pagehide: most reliable in Electron — fires when the BrowserView/WebContents
// is navigated away, the window is closed, or the app quits.
window.addEventListener('pagehide', function () {
	QtBlockPy.releaseAllSerialPorts();
});

// visibilitychange: fires when the user switches to another app or tab.
// Releasing here lets the Hardware Flasher (or any other tool) claim the port
// the moment QtBlocks loses focus, without the user having to manually disconnect.
document.addEventListener('visibilitychange', function () {
	if (document.visibilityState === 'hidden') {
		QtBlockPy.releaseAllSerialPorts();
	}
});

// message: allows parent Electron window to instruct QtBlocks to immediately release ports
window.addEventListener('message', function (e) {
	if (e && e.data === 'release-serial-ports') {
		QtBlockPy.releaseAllSerialPorts();
	}
});


/**
 * classifySerialOutput — identify what's running on the board from raw captured bytes.
 *
 * Returns an object: { type, label, color, icon, details }
 *   type: 'micropython' | 'arduino' | 'crash' | 'booting' | 'unknown'
 */
QtBlockPy.classifySerialOutput = function (rawText) {
	var t = rawText || '';
	var tl = t.toLowerCase();

	// ROM could not find a valid application segment in the selected partition.
	// This is a boot-image/flash-layout failure, not an unknown custom sketch.
	if (tl.includes('load:0xffffffff') && tl.includes('len:-1')) {
		return {
			type: 'boot-failure',
			label: '⚠️ ESP32 Boot Image Read Failure',
			color: '#b45309',
			bg: '#fef3c7',
			icon: 'fa-exclamation-triangle',
			details: 'The ESP32 bootloader could not read a valid application image from the selected flash partition.',
			advice: 'Run Complete Reinstall once to restore the board, then use the updated Active Parts installer.'
		};
	}

	// ── Crash / Guru Meditation (highest priority) ────────────────────────────
	if (tl.includes('guru meditation') || tl.includes('core  0 panic') ||
	    tl.includes('core  1 panic') || tl.includes('illegalinstruction') ||
	    tl.includes('loadstorerror') || tl.includes('integerdividebyzero') ||
	    tl.includes('unhandledexception') || tl.includes('backtrace:') ||
	    tl.includes('a fatal error occurred') || tl.includes('abort() was called')) {
		var crashLine = '';
		t.split('\n').forEach(function (line) {
			if (/guru meditation|panic'ed|exception was|backtrace/i.test(line)) {
				crashLine = line.trim();
			}
		});
		return {
			type: 'crash',
			label: '💥 ESP32 Crash Detected',
			color: '#dc2626',
			bg: '#fee2e2',
			icon: 'fa-exclamation-triangle',
			details: crashLine || 'Guru Meditation Error — see serial log below for full trace.',
			advice: 'The board crashed after last upload. Common causes: stack overflow, illegal instruction at wrong flash offset, or wrong firmware for this board.'
		};
	}

	// ── MicroPython REPL ──────────────────────────────────────────────────────
	if (tl.includes('micropython') || t.includes('raw REPL') ||
	    t.includes('>>>') || tl.includes('mpy version') ||
	    tl.includes('uqtpy') || tl.includes('keyboardinterrupt') ||
	    tl.includes('traceback') || tl.includes('main.py')) {
		var mpyVer = '';
		var verMatch = t.match(/MicroPython\s+([\w.\-]+)/i);
		if (verMatch) mpyVer = ' ' + verMatch[1];
		return {
			type: 'micropython',
			label: '🐍 MicroPython REPL' + mpyVer,
			color: '#065f46',
			bg: '#d1fae5',
			icon: 'fa-terminal',
			details: 'Board is running MicroPython. REPL is active and Python programs can be uploaded.',
			advice: null
		};
	}

	// ── Arduino / Firmata ─────────────────────────────────────────────────────
	if (tl.includes('firmata') || tl.includes('standardfirmata') || tl.includes('code2play')) {
		return {
			type: 'arduino',
			label: '🤖 Arduino / Firmata Sketch',
			color: '#0369a1',
			bg: '#e0f2fe',
			icon: 'fa-microchip',
			details: 'Board is running Arduino / Firmata firmware (Code2Play mode). Serial protocol is binary Firmata.',
			advice: null
		};
	}

	// ── Binary Firmata response ───────────────────────────────────────────────
	// Match an actual protocol frame instead of treating arbitrary high bytes as
	// Firmata. REPORT_FIRMWARE is F0 79 ... F7; REPORT_VERSION is F9 maj min.
	var byteValues = [];
	for (var i = 0; i < Math.min(t.length, 512); i++) {
		byteValues.push(t.charCodeAt(i));
	}
	var hasVersionFrame = byteValues.some(function (b, index) {
		return b === 0xF9 && index + 2 < byteValues.length;
	});
	var firmwareFrameStart = byteValues.findIndex(function (b, index) {
		return b === 0xF0 && byteValues[index + 1] === 0x79;
	});
	var hasFirmwareFrame = firmwareFrameStart >= 0 && byteValues.indexOf(0xF7, firmwareFrameStart + 2) > firmwareFrameStart;
	if (hasVersionFrame || hasFirmwareFrame) {
		return {
			type: 'arduino',
			label: '🤖 Arduino / Firmata (binary protocol)',
			color: '#0369a1',
			bg: '#e0f2fe',
			icon: 'fa-microchip',
			details: 'Board responded with Firmata binary protocol. Direct serial communication is active.',
			advice: null
		};
	}

	// ── Booting (data received but not recognized) ────────────────────────────
	if (t.trim().length > 0) {
		return {
			type: 'unknown',
			label: '⚠️ Unrecognized Serial Output',
			color: '#92400e',
			bg: '#fef3c7',
			icon: 'fa-question-circle',
			details: 'Board is sending data but the firmware type could not be identified.',
			advice: 'Board may be running a custom sketch. Check the serial log below.'
		};
	}

	// ── No response ───────────────────────────────────────────────────────────
	return {
		type: 'unknown',
		label: '⏳ No Response',
		color: '#6b7280',
		bg: '#f3f4f6',
		icon: 'fa-circle-o',
		details: 'Board did not send any data during the probe window.',
		advice: 'Check the USB cable, press RESET once, then choose Check Board Again.'
	};
};

QtBlockPy.openHardwareFlasher = function () {
	window.location.href = 'qtpi://open-app/qtpi-flasher';
};

/**
 * emitSerialLog — write a formatted serial capture block to the terminal drawer.
 */
QtBlockPy.emitSerialLog = function (classification, rawCapture, options) {
	options = options || {};
	var esc = function (s) {
		return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	};
	var timestamp = new Date().toLocaleTimeString();
	var lines = [
		'<div style="border-left:3px solid ' + classification.color + ';margin:6px 0;padding:6px 10px;background:' + classification.bg + ';border-radius:0 4px 4px 0;">',
		'<div style="font-weight:700;color:' + classification.color + ';font-size:12px;">' + esc(classification.label) + '</div>',
		'<div style="font-size:11px;color:#374151;margin-top:2px;">' + esc(classification.details) + '</div>'
	];
	if (classification.advice) {
		lines.push('<div style="font-size:11px;color:#6b7280;margin-top:4px;">💡 ' + esc(classification.advice) + '</div>');
	}
	lines.push('</div>');

	if (rawCapture && rawCapture.trim().length > 0) {
		var printable = rawCapture.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\xff]/g, function (c) {
			return '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0');
		});
		lines.push('<div style="margin:4px 0;">');
		lines.push('<div style="font-size:10px;color:#6b7280;margin-bottom:2px;">📡 [' + timestamp + '] Raw serial capture:</div>');
		lines.push('<pre style="font-size:11px;background:#1e1e2e;color:#cdd6f4;padding:8px;border-radius:4px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;max-height:160px;overflow-y:auto;">' + esc(printable).substring(0, 2000) + (printable.length > 2000 ? '\n… (truncated)' : '') + '</pre>');
		lines.push('</div>');
	}

	outf(lines.join(''));
	if (options.openDrawer !== false) QtBlockPy.openTerminalDrawer();
};

QtBlockPy.probeMicroPythonAndFiles = async function () {
	var port = QtBlockPy.selectedVedaPort;
	var mpySection = document.getElementById('veda_mpy_section');
	var mpyBadge = document.getElementById('veda_mpy_badge');
	var mpyContent = document.getElementById('veda_mpy_content');
	var refreshIcon = document.getElementById('mpy_refresh_icon');

	if (!port) {
		if (mpySection) mpySection.style.display = 'none';
		QtBlockPy.setBoardRuntime('unknown');
		return;
	}
	QtBlockPy.setBoardRuntime('checking');

	if (mpySection) mpySection.style.display = 'block';
	if (mpyBadge) {
		mpyBadge.style.background = '#fef3c7';
		mpyBadge.style.color = '#92400e';
		mpyBadge.textContent = 'Checking board...';
	}
	if (refreshIcon) refreshIcon.classList.add('fa-spin');
	if (mpyContent) {
		mpyContent.innerHTML = '<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-secondary);padding:6px 0;"><span class="fa fa-spinner fa-spin"></span> Checking board firmware and Python files...</div>';
	}

	await QtBlockPy.stopSerialStream();
	QtBlockPy._isAborted = false;

	var reader = null;
	var writer = null;
	var isReading = true;
	var currentReadLoop = null;

	try {
		if (QtBlockPy._isAborted) return;
		// Attempt to open port; if temporarily held during an app switch, retry briefly
		try {
			await port.open({ baudRate: 115200 });
		} catch (openErr) {
			if (openErr && openErr.message && (openErr.message.includes('open') || openErr.message.includes('use') || openErr.message.includes('Failed'))) {
				await new Promise(function (r) { setTimeout(r, 400); });
				if (QtBlockPy._isAborted) return;
				await port.open({ baudRate: 115200 });
			} else {
				throw openErr;
			}
		}

		writer = port.writable.getWriter();
		QtBlockPy._activeWriter = writer;
		reader = port.readable.getReader();
		QtBlockPy._activeReader = reader;
		var textEncoder = new TextEncoder();
		// Latin-1 preserves Firmata protocol bytes while all MicroPython markers
		// used below remain ordinary ASCII.
		var textDecoder = new TextDecoder('latin1');
		var allCapture = ''; // accumulates ALL bytes received during the entire probe

		function readUntil(delimiter, timeoutMs) {
			var readPromise = new Promise(function (resolve) {
				var buffer = '';
				var settled = false;
				function finish(value) {
					if (settled) return;
					settled = true;
					if (value) allCapture += value;
					resolve(value || '');
				}
				var timer = setTimeout(function () {
					// Save everything, even when the board is silent until timeout.
					finish(buffer);
				}, timeoutMs);

				currentReadLoop = (async function loop() {
					try {
						while (isReading && !QtBlockPy._isAborted) {
							var { value, done } = await reader.read();
							if (done || !isReading || QtBlockPy._isAborted) break;
							if (value) {
								buffer += textDecoder.decode(value);
								if (buffer.includes(delimiter)) {
									clearTimeout(timer);
									finish(buffer);
									return;
								}
							}
						}
					} catch (e) {
						clearTimeout(timer);
						finish(buffer);
					}
				})();
				QtBlockPy._activeReadPromise = currentReadLoop;
			});
			readPromise.then(function () {
				if (QtBlockPy._activeReadPromise === currentReadLoop) QtBlockPy._activeReadPromise = null;
			});
			return readPromise;
		}

		// 1. Ask for Firmata identity before sending any MicroPython control bytes.
		// A Firmata board belongs in Code2Play mode and must never be presented as
		// a failed Python console session.
		await writer.write(new Uint8Array([0xF0, 0x79, 0xF7]));
		var firmataCapture = await readUntil(String.fromCharCode(0xF7), 900);
		var initialClassification = QtBlockPy.classifySerialOutput(firmataCapture);

		// End the bounded Firmata read cleanly before starting a new probe cycle.
		isReading = false;
		try { if (writer) { writer.releaseLock(); writer = null; QtBlockPy._activeWriter = null; } } catch (_) {}
		try {
			if (reader) {
				if (reader.cancel) await reader.cancel();
				try { reader.releaseLock(); } catch (_) {}
				reader = null;
				QtBlockPy._activeReader = null;
			}
		} catch (_) {}
		try { await port.close(); } catch (_) {}

		if (initialClassification.type === 'arduino') {
			QtBlockPy.setBoardRuntime('firmata');
			if (mpyBadge) {
				mpyBadge.style.background = '#fee2e2';
				mpyBadge.style.color = '#991b1b';
				mpyBadge.textContent = 'MicroPython required';
			}
			if (mpyContent) {
				mpyContent.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);line-height:1.45;padding:2px 0;">' +
					'<div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#991b1b;margin-bottom:5px;">' +
					'<span class="fa fa-exclamation-circle"></span> This board is in Code2Play mode</div>' +
					'<div>QtBlockly needs MicroPython firmware. Your Firmata firmware is working, but it is for Code2Play.</div>' +
					'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">' +
					'<button type="button" class="btn-mpy-action" onclick="QtBlockPy.openHardwareFlasher()"><span class="fa fa-bolt"></span> Open QtDevice Manager</button>' +
					'<button type="button" class="btn-mpy-action" onclick="QtBlockPy.probeMicroPythonAndFiles()"><span class="fa fa-refresh"></span> Check Board Again</button>' +
					'</div></div>';
			}
			return;
		}

		// Re-open only after Firmata has been ruled out.
		await port.open({ baudRate: 115200 });
		writer = port.writable.getWriter();
		QtBlockPy._activeWriter = writer;
		reader = port.readable.getReader();
		QtBlockPy._activeReader = reader;
		isReading = true;

		// 2. Enter raw REPL — try once, then retry after a 2-second delay.
		// MicroPython needs ~2-4 s after a fresh flash to mount LittleFS
		// and bring the REPL up. A single 1.4-second timeout misses that
		// window and incorrectly shows "Arduino mode".
		var rawReplAttempt = await QtBlockPy.enterRawRepl(writer, readUntil, {
			encoder: textEncoder,
			attempts: 1,
			timeoutMs: 3500
		});
		var rawReplBanner = rawReplAttempt.capture;

		if (!rawReplBanner.includes('raw REPL') && !QtBlockPy._isAborted) {
			// First attempt missed — board may still be booting after a flash.
			// Show a friendly "waiting" hint and retry once after 2 s.
			if (mpyBadge) {
				mpyBadge.style.background = '#fef3c7';
				mpyBadge.style.color = '#92400e';
				mpyBadge.textContent = 'Waiting for board...';
			}
			if (mpyContent) {
				mpyContent.innerHTML = '<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-secondary);padding:6px 0;">' +
					'<span class="fa fa-spinner fa-spin"></span> Board is finishing boot — retrying in 2 seconds…</div>';
			}
			// Release locks safely before the delay so the port isn't held open.
			isReading = false;
			try {
				if (writer) {
					writer.releaseLock();
					writer = null;
					QtBlockPy._activeWriter = null;
				}
			} catch (_) {}
			try {
				if (reader) {
					if (reader.cancel) await reader.cancel();
					try { reader.releaseLock(); } catch (_) {}
					reader = null;
					QtBlockPy._activeReader = null;
				}
			} catch (_) {}
			try { await port.close(); } catch (_) {}

			// Wait 2 seconds for MicroPython to finish mounting.
			await new Promise(function (r) {
				QtBlockPy._probeRetryTimer = setTimeout(r, 2000);
			});
			if (QtBlockPy._isAborted) return;

			// Re-open port and retry.
			await port.open({ baudRate: 115200 });
			writer = port.writable.getWriter();
			QtBlockPy._activeWriter = writer;
			reader = port.readable.getReader();
			QtBlockPy._activeReader = reader;
			isReading = true;
			rawReplAttempt = await QtBlockPy.enterRawRepl(writer, readUntil, {
				encoder: textEncoder,
				attempts: 1,
				timeoutMs: 4500
			});
			rawReplBanner = rawReplAttempt.capture;
		}

		if (!rawReplBanner.includes('raw REPL')) {
			// Both attempts failed — classify what we actually received.
			try { if (writer) writer.write(textEncoder.encode('\x02')); } catch (_) {}
			var classification = QtBlockPy.classifySerialOutput(allCapture);
			QtBlockPy.setBoardRuntime('unknown');

			if (mpyBadge) {
				mpyBadge.style.background = classification.bg;
				mpyBadge.style.color = classification.color;
				mpyBadge.textContent = classification.label;
			}

			var reCheckBtn = '<button type="button" class="btn-mpy-action" style="margin-top:8px;" onclick="QtBlockPy.probeMicroPythonAndFiles()"><span class="fa fa-refresh"></span> Check Board Again</button>';

			if (classification.type === 'crash') {
				if (mpyContent) {
					mpyContent.innerHTML = '<div style="font-size:12px;color:#991b1b;line-height:1.5;padding:4px 0;">' +
						'<div style="display:flex;align-items:center;gap:8px;font-weight:600;color:#dc2626;margin-bottom:4px;">' +
						'<span class="fa fa-exclamation-triangle"></span> ESP32 Crash / Guru Meditation Detected' +
						'</div>' +
						'<div style="font-size:11.5px;margin-top:4px;">' + (classification.details || '') + '</div>' +
						'<div style="margin-top:8px;font-size:11px;color:#6b7280;">💡 ' + (classification.advice || '') + '</div>' +
						reCheckBtn +
						'</div>';
				}
			} else if (classification.type === 'arduino') {
				QtBlockPy.setBoardRuntime('firmata');
				if (mpyContent) {
					mpyContent.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);line-height:1.5;padding:4px 0;">' +
						'<div style="display:flex;align-items:center;gap:8px;font-weight:600;color:#0369a1;margin-bottom:4px;">' +
						'<span class="fa fa-microchip"></span> Arduino / Serial Runtime Active' +
						'</div>' +
						'Your board is connected in <strong>Arduino / Serial Mode</strong> (supports Firmata &amp; direct serial communication for Code2Play / Arduino apps).' +
						'<div style="margin-top:8px;font-size:11.5px;color:var(--text-tertiary);">' +
						'To use QtBlockly, install MicroPython firmware.' +
						'<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
						'<button type="button" class="btn-mpy-action" style="margin-top:8px;" onclick="QtBlockPy.openHardwareFlasher()"><span class="fa fa-bolt"></span> Open QtDevice Manager</button>' +
						reCheckBtn + '</div>' +
						'</div>' +
						'</div>';
				}
			} else {
				QtBlockPy.setBoardRuntime('unknown');
				if (mpyContent) {
					mpyContent.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);line-height:1.5;padding:4px 0;">' +
						'<div style="font-weight:600;margin-bottom:4px;">' + (classification.label || 'No REPL Response') + '</div>' +
						'<div style="font-size:11.5px;">' + (classification.details || '') + '</div>' +
						'<div style="margin-top:6px;font-size:11px;color:#6b7280;">' + (classification.advice || '') + '</div>' +
						reCheckBtn +
						'</div>';
				}
			}

			// Keep automatic board checks in the setup card. Store meaningful
			// diagnostics without forcing the console drawer open.
			if (classification.type === 'crash' || (allCapture && allCapture.trim())) {
				QtBlockPy.emitSerialLog(classification, allCapture, { openDrawer: false });
			}
			return;
		}

		// 2. Query MicroPython version, platform, and directory contents
		var probeScript = 
			'import sys, uos, json\r\n' +
			'def _g():\r\n' +
			' fl = []\r\n' +
			' try:\r\n' +
			'  for e in uos.ilistdir():\r\n' +
			'   fl.append({"name": e[0], "isDir": bool(e[1] & 0x4000), "size": e[3] if len(e) > 3 else 0})\r\n' +
			' except:\r\n' +
			'  try:\r\n' +
			'   for f in uos.listdir():\r\n' +
			'    fl.append({"name": f, "isDir": False, "size": 0})\r\n' +
			'  except:\r\n' +
			'   pass\r\n' +
			' v = ".".join([str(x) for x in sys.implementation.version])\r\n' +
			' return {"mpy": True, "ver": v, "plat": sys.platform, "files": fl}\r\n' +
			'print("__JSON_START__" + json.dumps(_g()) + "__JSON_END__")\r\n';

		await writer.write(textEncoder.encode(probeScript + '\x04'));
		var probeResponse = await readUntil('__JSON_END__', 4500);

		// Exit raw REPL
		await writer.write(textEncoder.encode('\x02'));

		var jsonStart = probeResponse.indexOf('__JSON_START__');
		var jsonEnd = probeResponse.indexOf('__JSON_END__');

		if (jsonStart !== -1 && jsonEnd !== -1) {
			QtBlockPy.setBoardRuntime('micropython');
			var jsonStr = probeResponse.substring(jsonStart + '__JSON_START__'.length, jsonEnd);
			var info = JSON.parse(jsonStr);

			if (mpyBadge) {
				mpyBadge.style.background = '#d1fae5';
				mpyBadge.style.color = '#065f46';
				mpyBadge.textContent = 'MicroPython v' + info.ver + ' (' + info.plat + ')';
			}

			// Keep the confirmation available for diagnostics without interrupting
			// the learner by opening the console drawer.
			QtBlockPy.emitSerialLog(
				{ type: 'micropython', label: '🐍 MicroPython v' + info.ver + ' (' + info.plat + ')', color: '#065f46', bg: '#d1fae5', details: 'Python connection succeeded. Board ready for upload.', advice: null },
				allCapture.substring(0, 400), // only show the Python banner, not the whole file listing
				{ openDrawer: false }
			);

			QtBlockPy.renderMicroPythonFiles(info.files);
		} else {
			QtBlockPy.setBoardRuntime('micropython');
			if (mpyBadge) {
				mpyBadge.style.background = '#d1fae5';
				mpyBadge.style.color = '#065f46';
				mpyBadge.textContent = 'MicroPython Active';
			}
			if (mpyContent) {
				mpyContent.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);">MicroPython is ready. The file list did not respond in time.</div>';
			}
			QtBlockPy.emitSerialLog(
				{ type: 'micropython', label: '🐍 MicroPython Active', color: '#065f46', bg: '#d1fae5', details: 'Python connection succeeded, but file listing timed out.', advice: null },
				allCapture.substring(0, 400),
				{ openDrawer: false }
			);
		}
	} catch (err) {
		QtBlockPy.setBoardRuntime('unknown');
		console.warn('MicroPython probe error:', err);
		if (mpyBadge) {
			mpyBadge.style.background = '#fee2e2';
			mpyBadge.style.color = '#991b1b';
			mpyBadge.textContent = 'Check Failed';
		}
		if (mpyContent) {
			mpyContent.innerHTML = '<div style="font-size:12px;color:#991b1b;">Could not communicate with the board: ' + (err.message || err) + '</div>';
		}
	} finally {
		isReading = false;
		if (writer) {
			try { writer.releaseLock(); } catch (e) {}
			writer = null;
			QtBlockPy._activeWriter = null;
		}
		if (reader) {
			try {
				if (reader.cancel) await reader.cancel();
			} catch (_) {}
			try {
				reader.releaseLock();
			} catch (e) {}
			reader = null;
			QtBlockPy._activeReader = null;
		}
		if (port && typeof port.close === 'function') {
			try { await port.close(); } catch (e) {}
		}
		if (refreshIcon) refreshIcon.classList.remove('fa-spin');
	}
};

QtBlockPy.renderMicroPythonFiles = function (files) {
	var mpyContent = document.getElementById('veda_mpy_content');
	if (!mpyContent) return;

	var topBarHtml = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
		'<span style="font-size:11.5px;color:var(--text-secondary);font-weight:500;">Flash Filesystem (' + (files ? files.length : 0) + ' items):</span>' +
		'<div style="display:flex;gap:6px;">' +
		'<button type="button" class="btn-mpy-save-main" onclick="QtBlockPy.saveCurrentCodeAsMainPy()" title="Save current blocks/code to run on battery boot"><span class="fa fa-save"></span> Save as main.py</button>' +
		'<button type="button" class="btn-mpy-action" onclick="QtBlockPy.copyFileFromPcToBoard()" title="Copy a file from your computer to board flash"><span class="fa fa-upload"></span> Copy File to Board</button>' +
		'</div>' +
		'</div>';

	if (!files || files.length === 0) {
		mpyContent.innerHTML = topBarHtml +
			'<div style="font-size:12px;color:var(--text-secondary);text-align:center;padding:16px 0;background:var(--bg-muted);border-radius:var(--radius-sm);border:1px dashed var(--border-default);">' +
			'<span class="fa fa-folder-open-o" style="font-size:24px;display:block;margin-bottom:6px;opacity:0.6;"></span>' +
			'No files currently found on board flash storage.' +
			'<div style="margin-top:6px;font-size:11px;color:var(--text-tertiary);">Click "Save Code as main.py" to persist your project.</div>' +
			'</div>';
		return;
	}

	var html = topBarHtml;
	html += '<div style="max-height:160px;overflow-y:auto;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);">';
	html += '<table class="veda-mpy-table">';
	html += '<thead><tr>' +
		'<th style="width:50%;">File Name</th>' +
		'<th style="width:20%;">Size</th>' +
		'<th style="width:30%;text-align:right;">Actions</th>' +
		'</tr></thead><tbody>';

	files.forEach(function (f) {
		var icon = f.isDir ? 'fa-folder' : (f.name.endsWith('.py') ? 'fa-file-code-o' : 'fa-file-o');
		var iconColor = f.isDir ? '#f59e0b' : (f.name.endsWith('.py') ? 'var(--color-brand)' : 'var(--text-secondary)');
		var sizeText = f.isDir ? 'DIR' : (f.size < 1024 ? f.size + ' B' : (f.size / 1024).toFixed(1) + ' KB');

		html += '<tr>' +
			'<td style="font-weight:500;color:var(--text-primary);"><span class="fa ' + icon + '" style="margin-right:6px;color:' + iconColor + ';"></span>' + f.name + '</td>' +
			'<td style="color:var(--text-secondary);">' + sizeText + '</td>' +
			'<td style="text-align:right;">' +
			(!f.isDir ? '<button type="button" class="btn-mpy-action" title="Open in editor" onclick="QtBlockPy.loadVedaFile(\'' + f.name + '\')"><span class="fa fa-folder-open-o"></span> Open</button> ' : '') +
			'<button type="button" class="btn-mpy-action btn-mpy-delete" title="Delete file" onclick="QtBlockPy.deleteVedaFile(\'' + f.name + '\')"><span class="fa fa-trash-o"></span></button>' +
			'</td>' +
			'</tr>';
	});

	html += '</tbody></table></div>';
	mpyContent.innerHTML = html;
};

QtBlockPy.saveCurrentCodeAsMainPy = async function () {
	var port = QtBlockPy.selectedVedaPort;
	if (!port) {
		alert('No QtPi Veda board connected.');
		return;
	}

	var code = QtBlockPy.getActiveProgramSource();

	if (!code || !code.trim()) {
		alert('No code to save. Write some code or assemble blocks first.');
		return;
	}

	await QtBlockPy.stopSerialStream();

	var writer = null;
	var reader = null;
	var isReading = true;
	var currentReadLoop = null;
	try {
		QtBlockPy.showFeedbackToast('Writing main.py to board flash...');
		if (!port.readable || !port.writable) {
			await port.open({ baudRate: 115200 });
		}
		writer = port.writable.getWriter();
		QtBlockPy._activeWriter = writer;
		reader = port.readable.getReader();
		QtBlockPy._activeReader = reader;
		var textEncoder = new TextEncoder();
		var textDecoder = new TextDecoder();

		var serialReader = QtBlockPy.createSerialReadQueue(reader, textDecoder);
		var readUntil = serialReader.readUntil;
		var rawRepl = await QtBlockPy.enterRawRepl(writer, serialReader, { encoder: textEncoder });
		if (!rawRepl.ready) throw new Error(QtBlockPy.rawReplError(rawRepl));

		// Write in base64 to prevent escape or newline issues
		var b64 = btoa(unescape(encodeURIComponent(code)));
		var writeScript = 
			'import ubinascii\r\n' +
			'data = ubinascii.a2b_base64("""' + b64 + '""")\r\n' +
			'with open("main.py", "wb") as f:\r\n' +
			' f.write(data)\r\n' +
			'print("__SAVE_OK__")\r\n';

		await writer.write(textEncoder.encode(writeScript + '\x04'));
		var resp = await readUntil('__SAVE_OK__', 4000);
		await writer.write(textEncoder.encode('\x02'));

		if (resp.includes('__SAVE_OK__')) {
			QtBlockPy.showFeedbackToast('Saved main.py! Will run automatically on board boot.');
			await QtBlockPy.probeMicroPythonAndFiles();
		} else {
			alert('Could not confirm main.py write. Response: ' + resp);
		}
	} catch (err) {
		console.error('Error saving main.py:', err);
		alert('Failed to write main.py to board: ' + (err.message || err));
	} finally {
		isReading = false;
		if (writer) {
			try { writer.releaseLock(); } catch (e) {}
			writer = null;
			QtBlockPy._activeWriter = null;
		}
		if (reader) {
			try {
				if (reader.cancel) await reader.cancel();
				if (currentReadLoop) await currentReadLoop;
				reader.releaseLock();
			} catch (e) {}
			reader = null;
			QtBlockPy._activeReader = null;
		}
		if (port && typeof port.close === 'function') {
			try { await port.close(); } catch (e) {}
		}
	}
};

QtBlockPy.deleteVedaFile = async function (filename) {
	if (!confirm('Are you sure you want to delete "' + filename + '" from board flash storage?')) {
		return;
	}

	var port = QtBlockPy.selectedVedaPort;
	if (!port) return;

	await QtBlockPy.stopSerialStream();

	var writer = null;
	var reader = null;
	var isReading = true;
	var currentReadLoop = null;
	try {
		QtBlockPy.showFeedbackToast('Deleting ' + filename + '...');
		if (!port.readable || !port.writable) {
			await port.open({ baudRate: 115200 });
		}
		writer = port.writable.getWriter();
		QtBlockPy._activeWriter = writer;
		reader = port.readable.getReader();
		QtBlockPy._activeReader = reader;
		var textEncoder = new TextEncoder();
		var textDecoder = new TextDecoder();

		var serialReader = QtBlockPy.createSerialReadQueue(reader, textDecoder);
		var readUntil = serialReader.readUntil;
		var rawRepl = await QtBlockPy.enterRawRepl(writer, serialReader, { encoder: textEncoder });
		if (!rawRepl.ready) throw new Error(QtBlockPy.rawReplError(rawRepl));

		var delScript = 
			'import uos\r\n' +
			'try:\r\n' +
			' uos.remove("' + filename + '")\r\n' +
			' print("__DEL_OK__")\r\n' +
			'except Exception as e:\r\n' +
			' print("__DEL_ERR__" + str(e))\r\n';

		await writer.write(textEncoder.encode(delScript + '\x04'));
		var resp = await readUntil('__DEL_OK__', 2500);
		await writer.write(textEncoder.encode('\x02'));

		if (resp.includes('__DEL_OK__')) {
			QtBlockPy.showFeedbackToast('Deleted ' + filename);
			await QtBlockPy.probeMicroPythonAndFiles();
		} else {
			alert('Could not delete ' + filename + '. Response: ' + resp);
		}
	} catch (err) {
		console.error('Error deleting file:', err);
		alert('Failed to delete file: ' + (err.message || err));
	} finally {
		isReading = false;
		if (writer) {
			try { writer.releaseLock(); } catch (e) {}
			writer = null;
			QtBlockPy._activeWriter = null;
		}
		if (reader) {
			try {
				if (reader.cancel) await reader.cancel();
				if (currentReadLoop) await currentReadLoop;
				reader.releaseLock();
			} catch (e) {}
			reader = null;
			QtBlockPy._activeReader = null;
		}
		if (port && typeof port.close === 'function') {
			try { await port.close(); } catch (e) {}
		}
	}
};

QtBlockPy.loadVedaFile = async function (filename) {
	var port = QtBlockPy.selectedVedaPort;
	if (!port) return;

	await QtBlockPy.stopSerialStream();

	var writer = null;
	var reader = null;
	var isReading = true;
	var currentReadLoop = null;
	try {
		QtBlockPy.showFeedbackToast('Reading ' + filename + ' from board...');
		if (!port.readable || !port.writable) {
			await port.open({ baudRate: 115200 });
		}
		writer = port.writable.getWriter();
		QtBlockPy._activeWriter = writer;
		reader = port.readable.getReader();
		QtBlockPy._activeReader = reader;
		var textEncoder = new TextEncoder();
		var textDecoder = new TextDecoder();

		var serialReader = QtBlockPy.createSerialReadQueue(reader, textDecoder);
		var readUntil = serialReader.readUntil;
		var rawRepl = await QtBlockPy.enterRawRepl(writer, serialReader, { encoder: textEncoder });
		if (!rawRepl.ready) throw new Error(QtBlockPy.rawReplError(rawRepl));

		var script = 'try:\r\n with open("' + filename + '", "r") as f:\r\n  print("__FC_START__" + f.read() + "__FC_END__")\r\nexcept Exception as e:\r\n print("__FC_ERR__" + str(e))\r\n';
		await writer.write(textEncoder.encode(script + '\x04'));
		var resp = await readUntil('__FC_END__', 2500);
		await writer.write(textEncoder.encode('\x02'));

		var s = resp.indexOf('__FC_START__');
		var e = resp.indexOf('__FC_END__');
		if (s !== -1 && e !== -1) {
			var fileContent = resp.substring(s + '__FC_START__'.length, e);
			if (window.editor) {
				editor.setValue(fileContent, 1);
				$('#codeORblock').prop('checked', false);
				QtUI.showPane('#content_code');
				window.localStorage.content = 'off';
				QtBlockPy.showFeedbackToast('Loaded ' + filename + ' into editor!');
				var usbModal = document.getElementById('usb');
				if (usbModal && window.QtUI && window.QtUI.closeDialog) {
					window.QtUI.closeDialog(usbModal);
				}
			}
		} else {
			alert('Could not read ' + filename + ' from board.');
		}
	} catch (err) {
		console.error('Failed to load file:', err);
		alert('Could not read ' + filename + ': ' + (err.message || err));
	} finally {
		isReading = false;
		if (writer) {
			try { writer.releaseLock(); } catch (e) {}
			writer = null;
			QtBlockPy._activeWriter = null;
		}
		if (reader) {
			try {
				if (reader.cancel) await reader.cancel();
				if (currentReadLoop) await currentReadLoop;
				reader.releaseLock();
			} catch (e) {}
			reader = null;
			QtBlockPy._activeReader = null;
		}
		if (port && typeof port.close === 'function') {
			try { await port.close(); } catch (e) {}
		}
	}
};

QtBlockPy.showFeedbackToast = function (msg) {
	var $toast = $('#copy_feedback');
	if ($toast.length) {
		$toast.text(msg);
		$toast.addClass('show');
		clearTimeout(QtBlockPy._toastTimer);
		QtBlockPy._toastTimer = setTimeout(function () {
			$toast.removeClass('show');
		}, 3000);
	}
};

QtBlockPy.updateVedaModalUI = function () {
	var dot = document.getElementById('veda_status_dot');
	var text = document.getElementById('veda_status_text');
	var subEl = document.getElementById('veda_status_sub');
	var actionContainer = document.getElementById('veda_status_action');
	var badgeUsb = document.getElementById('badge_usb_connected');
	var badgeBt = document.getElementById('badge_bt_connected');
	var rowUsb = document.getElementById('veda_row_usb');
	var rowBt = document.getElementById('veda_row_bt');
	var usbAction = document.getElementById('usb_row_action');
	var btAction = document.getElementById('bt_row_action');

	var activeItem = null;
	if (QtBlockPy.selectedVedaPort && QtBlockPy.activeVedaPorts.length > 0) {
		activeItem = QtBlockPy.activeVedaPorts.find(function (it) {
			return it.port === QtBlockPy.selectedVedaPort;
		}) || QtBlockPy.activeVedaPorts[0];
	}

	if (activeItem) {
		var isBt = (activeItem.match.type === 'bluetooth');
		if (dot) dot.style.background = isBt ? '#6366f1' : '#10b981';
		if (text) text.textContent = 'Connected: ' + activeItem.match.name;
		if (subEl) subEl.textContent = QtBlockPy.getBoardReadinessText(isBt);
		if (actionContainer) {
			actionContainer.innerHTML = '<button type="button" class="btn-veda-unpair" onclick="QtBlockPy.unpairVedaPort()"><span class="fa fa-unlink"></span> Unpair</button>';
		}

		var mpySection = document.getElementById('veda_mpy_section');
		if (mpySection) {
			mpySection.style.display = 'block';
			if (QtBlockPy._mpyProbedPort !== activeItem.port) {
				QtBlockPy._mpyProbedPort = activeItem.port;
				QtBlockPy.probeMicroPythonAndFiles();
			}
		}

		if (badgeUsb) badgeUsb.style.display = isBt ? 'none' : 'inline-block';
		if (rowUsb) {
			rowUsb.style.display = isBt ? 'flex' : 'none';
			rowUsb.classList.toggle('is-active', false);
		}
		if (usbAction) {
			if (!isBt) {
				usbAction.innerHTML = '<button type="button" class="btn-veda-unpair" onclick="QtBlockPy.unpairVedaPort()"><span class="fa fa-unlink"></span> Unpair</button>';
			} else {
				usbAction.innerHTML = '<button id="btn_pair_usb" type="button" class="btn-veda-pair btn-veda-primary" onclick="QtBlockPy.pairVedaPort(\'usb\')"><span class="fa fa-spinner fa-spin" id="pair_usb_spinner" style="display:none;margin-right:6px;"></span><span id="pair_usb_text">Switch to USB</span></button>';
			}
		}

		if (badgeBt) badgeBt.style.display = isBt ? 'inline-block' : 'none';
		if (rowBt) {
			rowBt.style.display = isBt ? 'none' : 'flex';
			rowBt.classList.toggle('is-active', false);
		}
		if (btAction) {
			if (isBt) {
				btAction.innerHTML = '<button type="button" class="btn-veda-unpair" onclick="QtBlockPy.unpairVedaPort()"><span class="fa fa-unlink"></span> Unpair</button>';
			} else {
				btAction.innerHTML = '<button id="btn_pair_bluetooth" type="button" class="btn-veda-pair btn-veda-secondary" onclick="QtBlockPy.pairVedaPort(\'bluetooth\')"><span class="fa fa-spinner fa-spin" id="pair_bt_spinner" style="display:none;margin-right:6px;"></span><span id="pair_bt_text">Switch to Bluetooth</span></button>';
			}
		}
	} else {
		if (dot) dot.style.background = '#94a3b8';
		if (text) text.textContent = 'No Board Connected';
		if (subEl) subEl.textContent = 'Choose USB Cable or Bluetooth below to connect your QtPi Veda.';
		if (actionContainer) actionContainer.innerHTML = '';

		if (badgeUsb) badgeUsb.style.display = 'none';
		if (rowUsb) {
			rowUsb.style.display = 'flex';
			rowUsb.classList.remove('is-active');
		}
		if (usbAction) {
			usbAction.innerHTML = '<button id="btn_pair_usb" type="button" class="btn-veda-pair btn-veda-primary" onclick="QtBlockPy.pairVedaPort(\'usb\')"><span class="fa fa-spinner fa-spin" id="pair_usb_spinner" style="display:none;margin-right:6px;"></span><span id="pair_usb_text">Pair USB</span></button>';
		}

		if (badgeBt) badgeBt.style.display = 'none';
		if (rowBt) {
			rowBt.style.display = 'flex';
			rowBt.classList.remove('is-active');
		}
		if (btAction) {
			btAction.innerHTML = '<button id="btn_pair_bluetooth" type="button" class="btn-veda-pair btn-veda-secondary" onclick="QtBlockPy.pairVedaPort(\'bluetooth\')"><span class="fa fa-spinner fa-spin" id="pair_bt_spinner" style="display:none;margin-right:6px;"></span><span id="pair_bt_text">Pair Bluetooth</span></button>';
		}
	}
};

QtBlockPy.unpairVedaPort = async function () {
	try {
		if (QtBlockPy.selectedVedaPort) {
			var portToForget = QtBlockPy.selectedVedaPort;
			try {
				if (portToForget.close) {
					await portToForget.close();
				}
			} catch (e) {
				// port was not open
			}
			if (portToForget.forget) {
				await portToForget.forget();
			}
		}
	} catch (err) {
		console.warn('Unpair warning:', err);
	}

	await QtBlockPy.stopSerialStream();
	QtBlockPy.selectedVedaPort = null;
	QtBlockPy._mpyProbedPort = null;
	QtBlockPy.setBoardRuntime('unknown');
	var mpySection = document.getElementById('veda_mpy_section');
	if (mpySection) mpySection.style.display = 'none';
	com = 'none';
	await QtBlockPy.refreshVedaPorts();
	$('#btn_usb').removeClass('is-connected').attr('title', 'Connect & Pair QtPi Veda Board');
	QtBlockPy.showFeedbackToast('Disconnected from board');

	var feedbackEl = $('#veda_pair_feedback');
	feedbackEl.css({
		'display': 'block',
		'background': '#f1f5f9',
		'color': '#475569',
		'border': '1px solid #cbd5e1'
	}).html('<strong>✓ Unpaired:</strong> Board has been disconnected.');
};

QtBlockPy.refreshVedaPorts = async function (options) {
	options = options || {};
	var $portSeries = $('#portseries');
	if (!navigator.serial) {
		$portSeries.html('<option value="none">Port: None</option>');
		return;
	}
	try {
		var allPorts = await navigator.serial.getPorts();
		QtBlockPy.activeVedaPorts = [];
		for (var i = 0; i < allPorts.length; i++) {
			var port = allPorts[i];
			var info = port.getInfo ? port.getInfo() : {};
			var match = QtBlockPy.matchVedaBoard(info, port);
			if (match) {
				QtBlockPy.activeVedaPorts.push({ port: port, match: match, info: info });
			}
		}
		QtBlockPy.activeVedaPorts = QtBlockPy.deduplicateVedaPorts(
			QtBlockPy.activeVedaPorts,
			navigator.userAgentData && navigator.userAgentData.platform ? navigator.userAgentData.platform : navigator.platform
		);

		$portSeries.empty();
		if (QtBlockPy.activeVedaPorts.length === 0) {
			$portSeries.append('<option value="none">Port: None</option>');
			if (com !== 'webrepl' && com !== 'usb') {
				com = 'none';
			}
			QtBlockPy.selectedVedaPort = null;
			QtBlockPy.setBoardRuntime('unknown');
			$('#btn_usb').removeClass('is-connected').attr('title', 'Connect & Pair QtPi Veda Board');
		} else {
			for (var j = 0; j < QtBlockPy.activeVedaPorts.length; j++) {
				var item = QtBlockPy.activeVedaPorts[j];
				var label = item.match.label + (QtBlockPy.activeVedaPorts.length > 1 ? ' (' + (j + 1) + ')' : '');
				$portSeries.append('<option value="veda_' + j + '">' + label + '</option>');
			}
			var preferredIndex = QtBlockPy.getPreferredVedaPortIndex(QtBlockPy.activeVedaPorts, options);
			$portSeries.val('veda_' + preferredIndex);
			QtBlockPy.selectedVedaPort = QtBlockPy.activeVedaPorts[preferredIndex].port;
			QtBlockPy.setBoardRuntime('checking');
			com = 'veda_serial';
			var preferredMatch = QtBlockPy.activeVedaPorts[preferredIndex].match;
			$('#btn_usb').addClass('is-connected').attr('title', 'Connected via ' + (preferredMatch.type === 'bluetooth' ? 'Bluetooth (SPP)' : 'USB') + ': ' + preferredMatch.name);
		}
		QtBlockPy.updateVedaModalUI();
	} catch (err) {
		console.warn('Could not list serial ports:', err);
	}
};

QtBlockPy.pairVedaPort = async function (type) {
	if (!navigator.serial) {
		alert('Web Serial is not supported in this browser. Please run inside QtPi Desktop Suite.');
		return;
	}

	var isUsb = (type === 'usb');
	var btnId = isUsb ? '#btn_pair_usb' : '#btn_pair_bluetooth';
	var textId = isUsb ? '#pair_usb_text' : '#pair_bt_text';
	var spinnerId = isUsb ? '#pair_usb_spinner' : '#pair_bt_spinner';
	var feedbackEl = $('#veda_pair_feedback');

	$(btnId).prop('disabled', true);
	$(spinnerId).show();
	$(textId).text(isUsb ? 'Connecting USB...' : 'Scanning BT...');
	feedbackEl.hide().empty();

	try {
		var requestOptions = isUsb ? { filters: QtBlockPy.VEDA_USB_FILTERS } : {};
		var port;
		try {
			port = await navigator.serial.requestPort(requestOptions);
		} catch (portErr) {
			if (isUsb && portErr.name === "NotFoundError") {
				// Retry without filter in case board vendorId varies
				port = await navigator.serial.requestPort({});
			} else {
				throw portErr;
			}
		}
		await QtBlockPy.refreshVedaPorts({ preferredPort: port, preferredType: type });

		if (QtBlockPy.activeVedaPorts.length > 0) {
			var selectedIdx = QtBlockPy.getPreferredVedaPortIndex(QtBlockPy.activeVedaPorts, { preferredPort: port, preferredType: type });
			$('#portseries').val('veda_' + selectedIdx);
			QtBlockPy.selectedVedaPort = QtBlockPy.activeVedaPorts[selectedIdx].port;
			com = 'veda_serial';
			var chosen = QtBlockPy.activeVedaPorts[selectedIdx];
			var connType = chosen.match.type === 'bluetooth' ? 'Bluetooth Serial (SPP)' : 'USB Cable';
			$('#btn_usb').addClass('is-connected').attr('title', 'Connected via ' + connType + ': ' + chosen.match.name);
			QtBlockPy.showFeedbackToast('Connected: ' + chosen.match.name);

			feedbackEl.css({
				'display': 'block',
				'background': '#d1fae5',
				'color': '#065f46',
				'border': '1px solid #a7f3d0'
			}).html('<strong>✓ Connected:</strong> ' + chosen.match.name + ' via ' + connType + '.');
		}
	} catch (err) {
		if (err.name !== 'NotFoundError') {
			console.error('Serial port pairing error:', err);
		}
		var guidanceMsg = isUsb
			? '<strong>⚠️ No USB Board Detected:</strong><br/>• Connect your QtPi Veda board using a <strong>USB data cable</strong> (charge-only cables will not communicate).<br/>• Verify that the board power switch is turned <strong>ON</strong>.<br/>• If macOS prompts with <em>"Allow accessory to connect"</em>, click <strong>Allow</strong>.'
			: '<strong>⚠️ No Bluetooth Board Available:</strong><br/>• Ensure your QtVeda device (e.g. <strong>QtVedaV3-0123</strong>) is turned ON.<br/>• Check macOS <em>System Settings > Bluetooth</em> to ensure it is paired and connected.';

		feedbackEl.css({
			'display': 'block',
			'background': '#fee2e2',
			'color': '#991b1b',
			'border': '1px solid #fecaca'
		}).html(guidanceMsg);
	} finally {
		$(btnId).prop('disabled', false);
		$(spinnerId).hide();
		$(textId).text(isUsb ? 'Pair USB' : 'Pair Bluetooth');
		QtBlockPy.updateVedaModalUI();
	}
};

QtBlockPy.save_com = function () {
	$("#portseries").blur();
	var selected = $("#portseries").val();
	if (selected && selected.startsWith('veda_')) {
		var idx = parseInt(selected.split('_')[1], 10);
		if (QtBlockPy.activeVedaPorts[idx]) {
			var chosen = QtBlockPy.activeVedaPorts[idx];
			QtBlockPy.selectedVedaPort = chosen.port;
			QtBlockPy.setBoardRuntime('checking');
			com = 'veda_serial';
			$('#btn_usb').addClass('is-connected').attr('title', 'Connected via ' + (chosen.match.type === 'bluetooth' ? 'Bluetooth (SPP)' : 'USB') + ': ' + chosen.match.name);
			QtBlockPy.updateVedaModalUI();
			QtBlockPy.showFeedbackToast('Selected ' + chosen.match.label);
		}
	} else {
		com = selected;
		QtBlockPy.selectedVedaPort = null;
		QtBlockPy.setBoardRuntime('unknown');
		$('#btn_usb').removeClass('is-connected').attr('title', 'Connect & Pair QtPi Veda Board');
		QtBlockPy.updateVedaModalUI();
	}
};

QtBlockPy.uploadToVeda = async function () {
	if (!QtBlockPy.selectedVedaPort) {
		var usbDialog = document.getElementById('usb');
		if (usbDialog && window.QtUI && window.QtUI.openDialog) {
			window.QtUI.openDialog(usbDialog, document.getElementById('btn_flash'));
		}
		return;
	}
	if (QtBlockPy._boardRuntime === 'firmata') {
		var setupDialog = document.getElementById('usb');
		if (setupDialog && window.QtUI && window.QtUI.openDialog) {
			window.QtUI.openDialog(setupDialog, document.getElementById('btn_usb'));
		}
		QtBlockPy.showFeedbackToast('QtBlockly needs MicroPython. Open QtDevice Manager to switch this board from Code2Play mode.');
		return;
	}

	QtBlockPy.openTerminalDrawer();
	outf('\n----------------------------------------\n');
	outf('>> [QtPi Veda] Preparing upload to board...\n');

	var code = QtBlockPy.getActiveProgramSource();

	if (!code || !code.trim()) {
		outf('>> [QtPi Veda] Error: No code to upload! Add some blocks or write Python code first.\n');
		return;
	}

	var writer = null;
	var reader = null;
	try {
		await QtBlockPy.stopSerialStream();
		QtBlockPy._isAborted = false;
		var port = QtBlockPy.selectedVedaPort;
		if (!port.readable || !port.writable) {
			outf('>> [QtPi Veda] Opening serial connection at 115200 baud...\n');
			await port.open({ baudRate: 115200 });
		}

		var textEncoder = new TextEncoder();
		var textDecoder = new TextDecoder();
		writer = port.writable.getWriter();
		QtBlockPy._activeWriter = writer;
		reader = port.readable.getReader();
		QtBlockPy._activeReader = reader;

		var unconsumed = '';
		var pendingRead = null;
		var bufferedReadResult = null;
		function readNextChunk(timeoutMs) {
			if (bufferedReadResult) {
				var buffered = bufferedReadResult;
				bufferedReadResult = null;
				return Promise.resolve(buffered);
			}
			if (!pendingRead) {
				pendingRead = reader.read().then(function (result) {
					pendingRead = null;
					bufferedReadResult = result;
					return result;
				}, function (error) {
					pendingRead = null;
					throw error;
				});
			}
			return new Promise(function (resolve, reject) {
				var waiting = true;
				var timer = setTimeout(function () {
					waiting = false;
					resolve(null);
				}, timeoutMs);
				pendingRead.then(function (result) {
					if (!waiting) return;
					waiting = false;
					clearTimeout(timer);
					if (bufferedReadResult === result) bufferedReadResult = null;
					resolve(result);
				}, function (error) {
					if (!waiting) return;
					waiting = false;
					clearTimeout(timer);
					reject(error);
				});
			});
		}

		function readUntil(delimiter, timeoutMs, matcher) {
			return (async function () {
				var buffer = unconsumed;
				unconsumed = '';
				var deadline = Date.now() + timeoutMs;
				try {
					while (Date.now() < deadline) {
						var matchEnd = matcher ? matcher(buffer) : (function () {
							var idx = buffer.indexOf(delimiter);
							return idx === -1 ? -1 : idx + delimiter.length;
						})();
						if (matchEnd !== -1) {
							unconsumed = buffer.slice(matchEnd);
							return buffer.slice(0, matchEnd);
						}

						var result = await readNextChunk(Math.max(1, deadline - Date.now()));
						if (!result || result.done) break;
						if (result.value) buffer += textDecoder.decode(result.value, { stream: true });
					}
				} catch (e) {
					// The caller handles a missing delimiter or a disconnected stream.
				}
				return buffer;
			})();
		}

		function isRawReplBanner(buffer) {
			var bannerIndex = buffer.indexOf('raw REPL');
			if (bannerIndex === -1) return -1;
			var promptIndex = buffer.indexOf('>', bannerIndex);
			return promptIndex === -1 ? -1 : promptIndex + 1;
		}

		async function requestRawRepl() {
			// Interrupt main.py first, then enter raw REPL on the same open serial
			// session. Closing/reopening CP2102 can toggle ESP32 reset lines and turn
			// a retry into another boot cycle.
			await writer.write(textEncoder.encode('\r\x03\x03'));
			await new Promise(function (resolve) { setTimeout(resolve, 80); });
			await writer.write(textEncoder.encode('\r\x01'));
			// Web Serial adapters and MicroPython builds vary in line endings
			// around the prompt. Require the banner and its following prompt so a
			// normal friendly-REPL response cannot pass.
			return readUntil(null, QtBlockPy._rawReplTimeoutMs || 2600, isRawReplBanner);
		}

		var rawReplBanner = '';
		var rawReplCapture = '';
		for (var rawReplAttempt = 1; rawReplAttempt <= 3; rawReplAttempt += 1) {
			rawReplBanner = await requestRawRepl();
			rawReplCapture += rawReplBanner;
			if (rawReplBanner.includes('raw REPL')) break;
			if (rawReplAttempt === 3) break;
			outf('>> [QtPi Veda] Board is busy; retrying the interrupt (' + (rawReplAttempt + 1) + '/3)...\n');
			await new Promise(function (resolve) { setTimeout(resolve, 160 * rawReplAttempt); });
		}
		if (!rawReplBanner.includes('raw REPL')) {
			if (/MicroPython|KeyboardInterrupt|Traceback|>>>|uqtpy/i.test(rawReplCapture)) {
				throw new Error('MicroPython is running, but the current program could not be interrupted. Reset the board and try Upload & Run again.');
			}
			if (!rawReplCapture.trim()) {
				throw new Error('The board did not respond over USB. Reconnect the cable, select the port again, and retry.');
			}
			throw new Error('The board responded, but did not enter the MicroPython console. It may be running different firmware.');
		}

		// Send code followed by Ctrl-D to execute
		outf('>> [QtPi Veda] Serial connected. Uploading Python script...\n');
		await writer.write(textEncoder.encode(code + '\r\n\x04'));
		writer.releaseLock();
		writer = null;
		QtBlockPy._activeWriter = null;

			outf('>> [QtPi Veda] Program sent. Live output appears below:\n');
			outf('----------------------------------------\n');
			QtBlockPy.setBoardExecutionActive(true);

			var readExecutionPromise = (async function readExecutionOutput() {
			var pending = unconsumed;
			var acknowledged = false;
			var responseSection = 0; // 0 = stdout, 1 = stderr, 2 = complete
			try {
				while (responseSection < 2) {
					if (!acknowledged) {
						var okIndex = pending.indexOf('OK');
						if (okIndex !== -1) {
							acknowledged = true;
							pending = pending.slice(okIndex + 2);
						}
					}

					if (acknowledged && pending.length) {
						var endIndex = pending.indexOf('\x04');
						if (endIndex === -1) {
							if (responseSection === 0) {
								outf(pending);
							} else if (pending) {
								outf('>> [QtPi Veda] Error: ' + pending);
							}
							pending = '';
						} else {
							var sectionText = pending.slice(0, endIndex);
							if (responseSection === 0 && sectionText) {
								outf(sectionText);
							} else if (responseSection === 1 && sectionText) {
								outf('>> [QtPi Veda] Error:\n' + sectionText);
							}
							pending = pending.slice(endIndex + 1);
							responseSection += 1;
							continue;
						}
					}

					var result = await reader.read();
					if (result.done || QtBlockPy._isAborted) break;
					if (!result.value) continue;
					pending += textDecoder.decode(result.value, { stream: true });
				}

				if (responseSection === 2) {
					outf('>> [QtPi Veda] Program finished.\n');
				}
			} catch (e) {
				if (e && e.name !== 'NetworkError') {
					outf('>> [QtPi Veda] Output error: ' + (e.message || e) + '\n');
				}
			} finally {
				if (QtBlockPy._activeReader === reader) {
					QtBlockPy._activeReader = null;
				}
				if (QtBlockPy._activeReadPromise === readExecutionPromise) {
					QtBlockPy._activeReadPromise = null;
				}
				try { reader.releaseLock(); } catch (e) {}
				reader = null;
					if (port && typeof port.close === 'function') {
						try { await port.close(); } catch (e) {}
					}
					QtBlockPy.setBoardExecutionActive(false);
				}
		})();
		QtBlockPy._activeReadPromise = readExecutionPromise;
	} catch (err) {
		outf('>> [QtPi Veda] Upload error: ' + (err.message || err) + '\n');
		console.error('Veda upload error:', err);
		if (QtBlockPy._activeReader === reader) {
			await QtBlockPy.stopSerialStream();
		}
		reader = null;
	} finally {
		if (writer) {
			try { writer.releaseLock(); } catch (e) {}
			writer = null;
			QtBlockPy._activeWriter = null;
		}
		if (reader && QtBlockPy._activeReader !== reader) {
			try { reader.releaseLock(); } catch (e) {}
		}
		if (!QtBlockPy._activeReader && port && typeof port.close === 'function') {
			try { await port.close(); } catch (e) {}
		}
	}
};

QtBlockPy.renderCodePreview = function () {
	var prog = window.localStorage.prog;
	var card = window.localStorage.card;
	if (card == "javascript") {
		$('#preview_drawer_title').text('JavaScript');
		$('#pre_preview').text(Blockly.JavaScript.workspaceToCode(QtBlockPy.workspace));
		$('#pre_preview').html(prettyPrintOne($('#pre_preview').html(), 'js'));
	}
	else {
		$('#preview_drawer_title').text('Python');
		var code = QtBlockPy.generateBlocksCode();
		$('#pre_preview').text(code);
		$('#pre_preview').html(prettyPrintOne($('#pre_preview').html(), 'py'));
		if (QtBlockPy.isBlockMode()) QtBlockPy.syncEditorFromBlocks();
	}
};
QtBlockPy.toggleCodePreview = function (forceState) {
	var $drawer = $('#toggle');
	var willOpen = forceState !== undefined ? forceState : !$drawer.hasClass('is-open');
	if (willOpen) {
		$drawer.addClass('is-open');
		$('body').addClass('has-preview-open');
		$('#btn_preview').addClass('is-active');
		$('#icon_handle_preview').text('chevron_right');
		$('#btn_handle_preview').attr('title', 'Collapse Code Preview');
		QtBlockPy.renderCodePreview();
	} else {
		$drawer.removeClass('is-open');
		$('body').removeClass('has-preview-open');
		$('#btn_preview').removeClass('is-active');
		$('#icon_handle_preview').text('chevron_left');
		$('#btn_handle_preview').attr('title', 'Open Code Preview');
	}
};
QtBlockPy.closeCodePreview = function () {
	QtBlockPy.toggleCodePreview(false);
};
QtBlockPy.openTerminalDrawer = function () {
	$('#toggle_terminal').addClass('is-open');
	terminal_state = "open";
};
QtBlockPy.closeTerminalDrawer = function () {
	$('#toggle_terminal').removeClass('is-open');
	terminal_state = "close";
};
QtBlockPy.toggleTerminalDrawer = function (forceState) {
	var willOpen = forceState !== undefined ? forceState : !$('#toggle_terminal').hasClass('is-open');
	if (willOpen) {
		QtBlockPy.openTerminalDrawer();
	} else {
		QtBlockPy.closeTerminalDrawer();
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
		var xml = QtBlockPy.textToDom(defaultXml);
		Blockly.Xml.domToWorkspace(xml, QtBlockPy.workspace);
	} else {
		var loadOnce = null;
		try {
			loadOnce = window.localStorage.loadOnceBlocks;
		} catch (e) { }
		if (loadOnce != null) {
			delete window.localStorage.loadOnceBlocks;
			var xml = QtBlockPy.textToDom(loadOnce);
			Blockly.Xml.domToWorkspace(xml, QtBlockPy.workspace);
		}
	}
};
QtBlockPy.replaceWorkspaceFromXml = function (xmlText) {
	var xml = QtBlockPy.textToDom(xmlText);
	if (xml && xml.nodeType === 9) xml = xml.documentElement;
	var rootName = String(xml && (xml.nodeName || xml.tagName) || '').toLowerCase();
	if (rootName && rootName !== 'xml') throw new Error('This file is not a QtBlockly XML project.');
	QtBlockPy.workspace.clear();
	Blockly.Xml.domToWorkspace(xml, QtBlockPy.workspace);
	QtBlockPy.workspace.render();
	QtBlockPy.syncEditorFromBlocks();
	QtBlockPy.renderCodePreview();
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
			var filename = files[0].name.toLowerCase();
			if (filename.endsWith('.qtpi.json')) {
				try {
					QtBlockPy.importProject(target.result);
					QtUI.setToggle('#codeORblock', 'off');
					QtUI.showPane('#content_code');
					window.localStorage.content = 'off';
				} catch (error) {
					QtBlockPy.showFriendlyError(error.message);
				}
				return;
			}
			if (filename.endsWith(".ino")) {
				QtUI.setToggle("#codeORblock", "off");
				QtUI.showPane("#content_code");
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
				QtBlockPy.setProjectFilesVisible(false);
				return;
			}
			if (filename.endsWith(".py")) {
				QtUI.setToggle("#codeORblock", "off");
				QtUI.showPane("#content_code");
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
				if (QtBlockPy.projectOpenImportedFile) QtBlockPy.projectOpenImportedFile(files[0].name, target.result);
				return;
			}
			if (!filename.endsWith(".xml")) {
				QtBlockPy.showFriendlyError('Choose a QtBlockly XML project, Python file, or QtPi project file.');
				return;
			}
			try {
				QtBlockPy.replaceWorkspaceFromXml(target.result);
			} catch (e) {
				QtBlockPy.showFriendlyError(MSG['xmlError'] + '\n' + e);
				return;
			}
			QtUI.setToggle('#codeORblock', 'on');
			QtUI.showPane('#content_blocks');
			window.localStorage.content = 'on';
			QtBlockPy.setProjectFilesVisible(false);
		}
	};
	reader.readAsText(files[0]);
};

QtBlockPy.showFriendlyError = function (message) {
	var messageDiv = document.getElementById('messageDIV');
	var dialog = document.getElementById('message');
	if (messageDiv && dialog && window.QtUI && QtUI.openDialog) {
		messageDiv.textContent = message;
		QtUI.openDialog(dialog, document.activeElement);
		setTimeout(function () { QtUI.closeDialog(dialog); }, 3500);
	} else {
		console.error(message);
	}
};

QtBlockPy.normalizeDownloadFilename = function (value, extension) {
	var name = String(value || '').trim().replace(/[\\/:*?"<>|]/g, '-');
	if (!name) return null;
	if (extension && !name.toLowerCase().endsWith(extension.toLowerCase())) name += extension;
	return name;
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
		QtUI.setToggle("#codeORblock", QtBlockPy.content);
		$('#btn_search').addClass("hidden");
		$('#btn_run_custom').addClass("hidden");
		$('#btn_stop_custom').addClass("hidden");

	}
	else {
		QtUI.setToggle("#codeORblock", content);
		if (content == "off") {
			QtUI.showPane("#content_code");
			$('#btn_search').removeClass("hidden");
			$('#btn_run_custom').removeClass("hidden");
			$('#btn_stop_custom').addClass("hidden");
			$('#btn_run').addClass("hidden");
			$('#btn_stop').addClass("hidden");
			$('#btn_save_custom_py').removeClass('hidden');
			$('#btn_preview').addClass("hidden");

		}
		else {
			$('#btn_search').addClass("hidden");
			$('#btn_run_custom').addClass("hidden");
			$('#btn_stop_custom').addClass("hidden");
			$('#btn_run').removeClass("hidden");
			$('#btn_stop').addClass("hidden");
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
				btnClass: 'dialog-primary-button',
				keys: ['enter'],
				action: function () {
					console.log('the user clicked confirm');
					QtBlockPy.handleConfirm(new_card);
					QtBlockPy.refreshVedaPorts();
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
	if (QtBlockPy.isBlockMode()) {
		QtBlockPy.workspace.undo(false);
		QtBlockPy.renderCodePreview();
	} else {
		editor.undo();
	}
};
QtBlockPy.Redo = function () {
	console.log("Redo inside");
	if (QtBlockPy.isBlockMode()) {
		QtBlockPy.workspace.undo(true);
		QtBlockPy.renderCodePreview();
	} else {
		editor.redo();
	}
};
QtBlockPy.search = function () {
	editor.execCommand("find");
};
QtBlockPy.bindFunctions = function () {
	console.log("bindFunctions inside");
	$('#btn_pair_usb').on("click", function (e) {
		e.preventDefault();
		QtBlockPy.pairVedaPort('usb');
	});
	$('#btn_pair_bluetooth').on("click", function (e) {
		e.preventDefault();
		QtBlockPy.pairVedaPort('bluetooth');
	});
	$('#btn_usb').on("click", function (e) {
		e.preventDefault();
		QtBlockPy.pairVedaPort();
	});
	$('#btn_new').on("click", QtBlockPy.discard);
	$('#btn_undo').on("click", QtBlockPy.Undo);
	$('#btn_redo').on("click", QtBlockPy.Redo);
	$('#btn_print').on("click", QtBlockPy.workspace_capture);
	$('#btn_search').on("click", QtBlockPy.search);
	$('#btn_saveino').on("click", QtBlockPy.save);
	$('#btn_save_custom_py').on("click", QtBlockPy.save_custom);
	$('#btn_saveXML').on("click", QtBlockPy.save_xml);
	$('#btn_project_new_file').on('click', QtBlockPy.newProjectFile);
	$('#btn_project_rename_file').on('click', QtBlockPy.renameProjectFile);
	$('#btn_project_delete_file').on('click', QtBlockPy.deleteProjectFile);
	$('#btn_project_upload').on('click', QtBlockPy.uploadProjectToBoard);
	$('#project_import').on('change', QtBlockPy.load);
	$('#btn_project_import').on('click', function () {
		// Clear the previous selection so choosing the same project again still imports it.
		$('#project_import').val('').click();
	});
	$('#btn_project_export').on('click', QtBlockPy.exportProject);

	$('#btn_copy').on("click", QtBlockPy.copy);
	$('#boards').on("focus", function () {
		QtBlockPy.selectedCard = $(this).val();
	});
	$('#btn_preview').on("click", function () {
		QtBlockPy.toggleCodePreview();
		$('#btn_stop').addClass("hidden");
		$('#btn_run').removeClass("hidden");
	});
	$('#btn_handle_preview').on("click", function (e) {
		e.preventDefault();
		e.stopPropagation();
		QtBlockPy.toggleCodePreview();
	});
	$('#btn_close_preview').on("click", function (e) {
		e.preventDefault();
		e.stopPropagation();
		QtBlockPy.closeCodePreview();
	});
	$('#btn_clear_terminal').on("click", function (e) {
		e.preventDefault();
		$('#console').empty();
	});
	$('#btn_close_terminal, #btn_terminal').on("click", function (e) {
		e.preventDefault();
		QtBlockPy.closeTerminalDrawer();
	});
	$('#btn_stop').on("click", QtBlockPy.stopExecution);
	$('#btn_stop_custom').on("click", QtBlockPy.stopExecution);
	$('#btn_run').on("click", function () {
		exe_type = "blocks";
		QtBlockPy.openTerminalDrawer();
	});

	//btn_run_custom
	$('#btn_run_custom').on("click", function () {
		exe_type = "custom";
		QtBlockPy.openTerminalDrawer();
	});
	$('#btn_flash').on("click", function () {
		if (com == "webrepl") {
			$('#toggle_flash').toggle("slide");
		}
		else if (com == "usb") {
			$('#toggle_microbit').toggle("slide");
		}
		else if (com == "veda_serial") {
			QtBlockPy.uploadToVeda();
		}
		else {
			var usbDialog = document.getElementById('usb');
			if (usbDialog && window.QtUI && window.QtUI.openDialog) {
				window.QtUI.openDialog(usbDialog, this);
			} else if (usbDialog) {
				$(usbDialog).addClass('is-open');
			}
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
			QtBlockPy.syncEditorFromBlocks();

			QtUI.showPane("#content_code");
			QtBlockPy.closeCodePreview();
			$('#btn_print').addClass("hidden");
			$('#btn_preview').addClass("hidden");
			$('#btn_run').addClass("hidden");
			$('#btn_stop').addClass("hidden");
			$('#btn_search').removeClass("hidden");
			$('#btn_run_custom').removeClass("hidden");
			$('#btn_save_custom_py').removeClass('hidden');
			window.localStorage.content = "off";
			QtBlockPy.projectOpenImportedFile(QtBlockPy.project?.activeFile || 'main.py', editor.getValue());
			QtBlockPy.setProjectFilesVisible(true);
		} else {
			var generatedCode = QtBlockPy.generateBlocksCode();
			var hasCodeOnlyChanges = QtBlockPy._codeModeDirty && editor.getValue() !== generatedCode;
			if (hasCodeOnlyChanges && !window.confirm('Your Python edits cannot be converted back into blocks. Return to Blocks and replace those edits with code generated from the current blocks?')) {
				$('#codeORblock').prop('checked', false);
				return;
			}
			QtBlockPy.syncEditorFromBlocks();
			QtUI.showPane("#content_blocks");
			$('#btn_print').removeClass("hidden");
			$('#btn_preview').removeClass("hidden");
			$('#btn_run').removeClass("hidden");
			$('#btn_search').addClass("hidden");
			$('#btn_run_custom').addClass("hidden");
			$('#btn_stop_custom').addClass("hidden");
			$('#btn_save_custom_py').addClass('hidden');
			window.localStorage.content = "on";
			QtBlockPy.setProjectFilesVisible(false);
		}
	});

	$('#toolboxes').on("focus", function () {
		QtBlockPy.selectedToolbox = $(this).val();
	});
	$('#toolboxes').on("change", QtBlockPy.changeToolboxDefinition);
	$('#configModal').on('qtui:dialog-close', function () {
		QtBlockPy.loadToolboxDefinition(QtBlockPy.selectedToolbox);
	});
	$('#load').on("change", QtBlockPy.load);
	$('#btn_fakeload').on("click", function () {
		$('#load').val('');
		if (this.tagName !== 'LABEL') {
			$('#load').trigger('click');
		}
	});
	$('#btn_fakeload').on("keydown", function (e) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			$('#load').val('').trigger('click');
		}
	});
	$('#btn_config').on("click", QtBlockPy.openConfigToolbox);
	$('#select_all').on("click", QtBlockPy.checkAll);
	$('#btn_valid_config').on("click", QtBlockPy.changeToolbox);
	$('#modal-body-config').on("change", 'input[type="checkbox"]', function () {
		$(this).closest('.category-chip').toggleClass('is-checked', this.checked);
	});
	$('#btn_example').on("click", QtBlockPy.buildExamples);
	//$('#btn_flash').on('click', QtBlockPy.flash);

	window.addEventListener('dragover', function (e) {
		e.preventDefault();
	});
	window.addEventListener('drop', function (e) {
		e.preventDefault();
		if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length === 1) {
			QtBlockPy.load({ target: { files: e.dataTransfer.files } });
		}
	});
};
QtBlockPy.checkAll = function () {
	if (this.checked) {
		$('#modal-body-config input:checkbox[id^=checkbox_]').each(function () {
			this.checked = true;
			$(this).closest('.category-chip').addClass('is-checked');
		});
	}
	else {
		$('#modal-body-config input:checkbox[id^=checkbox_]').each(function () {
			this.checked = false;
			$(this).closest('.category-chip').removeClass('is-checked');
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
		var isChecked = n >= 0 ? 'checked="checked"' : '';
		var activeClass = n >= 0 ? ' is-checked' : '';
		var catId = $(this).attr("id");
		var labelText = Blockly.Msg[catId] || catId;
		ligne = '<label class="category-chip' + activeClass + '"><input type="checkbox" ' + isChecked + ' name="checkbox_' + i + '" id="checkbox_' + catId + '"/> <span class="chip-label">' + labelText + '</span></label>';
		i++;
		modalbody.append(ligne);
	});
};
QtBlockPy.changeToolbox = function () {
	console.log("changeToolbox inside");
	QtBlockPy.backupBlocks();

	var toolboxIds = [];
	$('#modal-body-config input:checkbox[id^=checkbox_]').each(function () {
		if (this.checked == true) {
			var xmlid = this.id;
			toolboxIds.push(xmlid.replace("checkbox_", ""));
		}
	});
	window.localStorage.toolboxids = toolboxIds;
	Blockly.getMainWorkspace().updateToolbox(QtBlockPy.buildToolbox());
	QtBlockPy.workspace.render();
	QtUI.closeDialog(document.getElementById("configModal"));
	window.location.reload();
};
QtBlockPy.buildToolbox = function () {
	var loadIds = window.localStorage.toolboxids;
	if (loadIds === undefined || loadIds === "") {
		if ($('#defaultCategories').length) {
			loadIds = $('#defaultCategories').html();
		} else {
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
QtBlockPy.openExternalLink = function (url, event) {
	if (event) {
		event.preventDefault();
		event.stopPropagation();
	}
	if (!url) return;
	var targetUrl = url;
	try {
		targetUrl = new URL(url, window.location.href).href;
	} catch (e) {
		targetUrl = url;
	}
	var electronAPI = window.electronAPI || (window.parent && window.parent.electronAPI);
	if (electronAPI && typeof electronAPI.openExternal === 'function') {
		electronAPI.openExternal(targetUrl);
	} else {
		window.open(targetUrl, '_blank', 'noopener,noreferrer');
	}
};

QtBlockPy.loadExampleProject = function (sourceUrl) {
	var fullUrl = "./examples/" + sourceUrl;
	$.get(fullUrl, function (data) {
		if (sourceUrl.endsWith(".xml")) {
			try {
				QtBlockPy.replaceWorkspaceFromXml(data);
			} catch (error) {
				QtBlockPy.showFriendlyError('This example could not be opened: ' + error.message);
				return;
			}
			$('#codeORblock').prop("checked", true);
			window.localStorage.content = "on";
			QtUI.showPane("#content_blocks");
			$('#btn_print').removeClass("hidden");
			$('#btn_preview').removeClass("hidden");
			$('#btn_run').removeClass("hidden");
			$('#btn_run_custom').addClass("hidden");
			$('#btn_stop').addClass("hidden");
			$('#btn_stop_custom').addClass("hidden");
			$('#btn_search').addClass("hidden");
			$('#btn_save_custom_py').addClass('hidden');
		} else if (sourceUrl.endsWith(".py")) {
			$('#codeORblock').prop("checked", false);
			window.localStorage.content = "off";
			QtUI.showPane("#content_code");
			$('#btn_print').addClass("hidden");
			$('#btn_preview').addClass("hidden");
			$('#btn_run').addClass("hidden");
			$('#btn_stop').addClass("hidden");
			$('#btn_stop_custom').addClass("hidden");
			$('#btn_search').removeClass("hidden");
			$('#btn_run_custom').removeClass("hidden");
			$('#btn_save_custom_py').removeClass('hidden');
			if (window.editor) {
				editor.session.setMode("ace/mode/python");
				editor.setValue(data, 1);
			}
		}
		QtUI.closeDialog(document.getElementById("exampleModal"));
	}, 'text');
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
					var actionHtml = "<button type='button' class='example-open-btn' title='Open in Blocks' aria-label='Open example in Blocks' onclick='QtBlockPy.loadExampleProject(\"" + example.source_url + "\")'>"
						+ "<span class='fa fa-folder-open' aria-hidden='true'></span>"
						+ "</button>";
					if (example.link_url) {
						actionHtml += "<a href='" + example.link_url + "' class='example-action-btn' title='Watch Tutorial' onclick='QtBlockPy.openExternalLink(\"" + example.link_url + "\", event)'>"
							+ "<span class='fa fa-youtube-play'></span> Tutorial"
							+ "</a>";
					}
					if (example.image) {
						actionHtml += "<img class='vignette' src='./examples/" + example.image + "' alt='preview' />";
					}
					var line = "<tr class='example-item-row'><td class='example-title-col'>"
						+ "<span class='example-name'>" + example.source_text + "</span>"
						+ "</td><td class='example-action-col'>"
						+ actionHtml
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

QtBlockPy.save = async function () {
	if (typeof (Storage) !== "undefined") {
		var filename = await QtBlockPy.requestText({
			title: 'Save Python file',
			label: 'File name',
			initialValue: 'main.py',
			validate: function (value) { return QtBlockPy.normalizeDownloadFilename(value, '.py') ? null : 'Enter a file name.'; }
		});
		if (filename === null) return;
		filename = QtBlockPy.normalizeDownloadFilename(filename, '.py');
		var code = Blockly.Python.workspaceToCode(Blockly.getMainWorkspace());
		QtBlockPy.download(filename, code);
	}
	else {
		console.log("not saved");
	}
};

QtBlockPy.save_custom = async function () {
	if (typeof (Storage) !== "undefined") {
		var currentName = QtBlockPy.project?.activeFile || 'main.py';
		var filename = await QtBlockPy.requestText({
			title: 'Save Python file',
			label: 'File name',
			initialValue: currentName,
			validate: function (value) { return QtBlockPy.normalizeDownloadFilename(value, '.py') ? null : 'Enter a file name.'; }
		});
		if (filename === null) return;
		filename = QtBlockPy.normalizeDownloadFilename(filename, '.py');
		var code = editor.getValue();
		QtBlockPy.download(filename, code);
	}
	else {
		console.log("not saved");
	}
};

QtBlockPy.save_xml = async function () {
	if (typeof (Storage) !== "undefined") {
		var filename = await QtBlockPy.requestText({
			title: 'Save QtBlockly project',
			label: 'Project file name',
			initialValue: 'qtpy.xml',
			validate: function (value) { return QtBlockPy.normalizeDownloadFilename(value, '.xml') ? null : 'Enter a file name.'; }
		});
		if (filename === null) return;
		filename = QtBlockPy.normalizeDownloadFilename(filename, '.xml');
		var xmlDom = Blockly.Xml.workspaceToDom(Blockly.getMainWorkspace());
		var code = Blockly.Xml.domToPrettyText(xmlDom);
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
	var $feedback = $('#copy_feedback');
	if ($feedback.length) {
		$feedback.addClass('show');
		setTimeout(function () {
			$feedback.removeClass('show');
		}, 1800);
	}
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
	mypre.scrollTop = mypre.scrollHeight;
}
function builtinRead (x) {
	if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
		throw "File not found: '" + x + "'";
	return Sk.builtinFiles["files"][x];
}

QtBlockPy.isExecuting = false;
QtBlockPy.stopRequested = false;

QtBlockPy.stopExecution = async function () {
	var hasBoardSession = QtBlockPy._boardExecutionActive || QtBlockPy._activeReader || QtBlockPy._activeWriter || QtBlockPy._activeReadPromise;
	if (QtBlockPy.isExecuting && !hasBoardSession) {
		QtBlockPy.stopRequested = true;
		outf('\n>> Execution stopped by user.\n');
	}
	if (QtBlockPy.selectedVedaPort && hasBoardSession) {
		outf('\n>> Stopping the board program and releasing the connection...\n');
		await QtBlockPy.stopSerialStream({ interruptBoard: true });
		outf('>> Board stopped. The serial port is ready for another app.\n');
	}
	QtBlockPy._boardExecutionActive = false;
	QtBlockPy.cleanupExecution();
};

QtBlockPy.cleanupExecution = function () {
	QtBlockPy.isExecuting = false;
	QtBlockPy.stopRequested = false;
	$('#btn_stop').addClass("hidden");
	$('#btn_stop_custom').addClass("hidden");
	if (window.localStorage.content == "off") {
		$('#btn_run_custom').removeClass("hidden");
		$('#btn_run').addClass("hidden");
	} else {
		$('#btn_run').removeClass("hidden");
		$('#btn_run_custom').addClass("hidden");
	}
};

function runit () {
	var lang_type = window.localStorage.card;
	if (lang_type == "javascript") {
		var script = Blockly.JavaScript.workspaceToCode(Blockly.getMainWorkspace());
		var blockp5 = new Blockp5(script);
		blockp5.runCode();
		console.log("Running JS");
	}
	else {
		if (exe_type == 'blocks') {
			var prog = Blockly.Python.workspaceToCode(Blockly.getMainWorkspace());
		}
		else if (exe_type == "custom") {
			var prog = editor.getValue();
		}

		var mypre = document.getElementById("console");
		mypre.innerHTML = '';
		if (/(^|\n)\s*(?:from\s+uqtpy\b|import\s+uqtpy\b)/m.test(prog)) {
			outf('This program uses QtPi hardware and cannot run in the local Python simulator.\nConnect your QtPi board, choose its port, then click Upload & Run on QtPi (➔).\n');
			QtBlockPy.cleanupExecution();
			return;
		}
		Sk.pre = "output";
		Sk.configure({
			inputfun: function (prompt) {
				return QtBlockPy.requestText({
					title: 'Program input',
					label: prompt || 'Enter a value',
					initialValue: ''
				}).then(function (value) { return value === null ? '' : value; });
			},
			inputfunTakesPrompt: true,
			output: outf,
			read: builtinRead
		});

		QtBlockPy.isExecuting = true;
		QtBlockPy.stopRequested = false;
		Sk.yieldLimit = 100;

		$('#btn_run').addClass("hidden");
		$('#btn_run_custom').addClass("hidden");
		if (exe_type == "custom") {
			$('#btn_stop_custom').removeClass("hidden");
			$('#btn_stop').addClass("hidden");
		} else {
			$('#btn_stop').removeClass("hidden");
			$('#btn_stop_custom').addClass("hidden");
		}

		var myPromise = Sk.misceval.asyncToPromise(function () {
			return Sk.importMainWithBody("<stdin>", false, prog, true);
		}, {
			"*": function (susp) {
				if (QtBlockPy.stopRequested) {
					throw new Error("Execution stopped by user");
				}
			}
		});

		myPromise.then(function (mod) {
			if (!QtBlockPy.stopRequested) {
				outf('\n>> successfully executed\n');
			}
			QtBlockPy.cleanupExecution();
		},
			function (err) {
				if (!QtBlockPy.stopRequested) {
					let ret = err.toString();
					if (err.traceback) {
						for (let i = 0; i < err.traceback.length; i++) {
							ret += "\n  at " + " line " + err.traceback[i].lineno;
							if ("colno" in err.traceback[i]) {
								ret += " column " + err.traceback[i].colno;
							}
						}
					}
					if (ret.includes("No module named uqtpy")) {
						outf("\nThis program uses QtPi hardware and cannot run in the local Python simulator.\nConnect your QtPi board, choose its port, then click Upload & Run on QtPi (➔).\n");
					} else {
						outf("\nerr >> " + ret.toString() + "\n");
					}
				}
				QtBlockPy.cleanupExecution();
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
			console.warn("Language " + newLang + " is not supported.");
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
		if (migration != null) {
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

	// Trap focus in an overlay and pass focus to its first actionable element.
	function focusOverlay (overlayId) {
		document.querySelector('body > :not(.vex)').setAttribute('aria-hidden', true);
		var dialog = document.querySelector(overlayId);
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
		// Display the WebUSB error overlay.
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

		// Make the overlay accessible now that all the content is present.
		focusOverlay("#flashing-overlay");
		// If escape is pressed, close the overlay.
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
		focusOverlay("#modal-msg-overlay");
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
		if (window.navigator && /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent)) {
			// modern safari handles blobs fine
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
