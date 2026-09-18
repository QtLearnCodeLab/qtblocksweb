/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview JavaScript for Blockly's Code demo.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

/**
 * Create a namespace for the application.
 */
var Code = {};

/**
 * Lookup for names of supported languages.  Keys should be in ISO 639 format.
 */
Code.LANGUAGE_NAME = {
  'en': 'English'
};

/**
 * List of RTL languages.
 */
Code.LANGUAGE_RTL = ['ar', 'fa', 'he', 'lki'];

/**
 * Blockly's main workspace.
 * @type {Blockly.WorkspaceSvg}
 */
Code.workspace = null;

/**
 * Extracts a parameter from the URL.
 * If the parameter is absent default_value is returned.
 * @param {string} name The name of the parameter.
 * @param {string} defaultValue Value to return if parameter not found.
 * @return {string} The parameter value or the default value if not found.
 */
Code.getStringParamFromUrl = function(name, defaultValue) {
  var val = location.search.match(new RegExp('[?&]' + name + '=([^&]+)'));
  return val ? decodeURIComponent(val[1].replace(/\+/g, '%20')) : defaultValue;
};

/**
 * Get the language of this user from the URL.
 * @return {string} User's language.
 */
Code.getLang = function() {
  //var lang = Code.getStringParamFromUrl('lang', '');
  //if (Code.LANGUAGE_NAME[lang] === undefined) {
    // Default to English.
    //lang = 'en';
  //}
  var lang = window.localStorage.lang;
  if (lang === undefined) {
    lang = 'en'
    window.localStorage.lang = lang;
  }
  return lang;
};

/**
 * Is the current language (Code.LANG) an RTL language?
 * @return {boolean} True if RTL, false if LTR.
 */
Code.isRtl = function() {
  return Code.LANGUAGE_RTL.indexOf(Code.LANG) != -1;
};
Code.LANG = Code.getLang();
/**
 * Load blocks saved on App Engine Storage or in session/local storage.
 * @param {string} defaultXml Text representation of default blocks.
 */
Code.loadBlocks = function(defaultXml) {
  try {
    var loadOnce = window.sessionStorage.loadOnceBlocks;
  } catch(e) {
    // Firefox sometimes throws a SecurityError when accessing sessionStorage.
    // Restarting Firefox fixes this, so it looks like a bug.
    var loadOnce = null;
  }
  if ('BlocklyStorage' in window && window.location.hash.length > 1) {
    // An href with #key trigers an AJAX call to retrieve saved blocks.
    BlocklyStorage.retrieveXml(window.location.hash.substring(1));
  } else if (loadOnce) {
    // Language switching stores the blocks during the reload.
    delete window.sessionStorage.loadOnceBlocks;
    var xml = Blockly.Xml.textToDom(loadOnce);
    Blockly.Xml.domToWorkspace(xml, Code.workspace);
  } else if (defaultXml) {
    // Load the editor with default starting blocks.
    var xml = Blockly.Xml.textToDom(defaultXml);
    Blockly.Xml.domToWorkspace(xml, Code.workspace);
  } else if ('BlocklyStorage' in window) {
    // Restore saved blocks in a separate thread so that subsequent
    // initialization is not affected from a failed load.
    window.setTimeout(BlocklyStorage.restoreBlocks, 0);
  }
};

/**
 * Save the blocks and reload with a different language.
 */
Code.changeLanguage = function() {
  // Store the blocks for the duration of the reload.
  // MSIE 11 does not support sessionStorage on file:// URLs.
  if (window.sessionStorage) {
    var xml = Blockly.Xml.workspaceToDom(Code.workspace);
    var text = Blockly.Xml.domToText(xml);
    window.sessionStorage.loadOnceBlocks = text;
  }

  var languageMenu = document.getElementById('languageMenu');
  var newLang = encodeURIComponent(
      languageMenu.options[languageMenu.selectedIndex].value);
  var search = window.location.search;
  if (search.length <= 1) {
    search = '?lang=' + newLang;
  } else if (search.match(/[?&]lang=[^&]*/)) {
    search = search.replace(/([?&]lang=)[^&]*/, '$1' + newLang);
  } else {
    search = search.replace(/\?/, '?lang=' + newLang + '&');
  }

  window.location = window.location.protocol + '//' +
      window.location.host + window.location.pathname + search;
};

/**
 * Changes the output language by clicking the tab matching
 * the selected language in the codeMenu.
 */
Code.changeCodingLanguage = function() {
  var codeMenu = document.getElementById('code_menu');
  Code.tabClick(codeMenu.options[codeMenu.selectedIndex].value);
}

/**
 * Bind a function to a button's click event.
 * On touch enabled browsers, ontouchend is treated as equivalent to onclick.
 * @param {!Element|string} el Button element or ID thereof.
 * @param {!Function} func Event handler to bind.
 */
Code.bindClick = function(el, func) {
  if (typeof el == 'string') {
    el = document.getElementById(el);
  }
  if (el) {
    el.addEventListener('click', func, true);
    el.addEventListener('touchend', func, true);
  }
};

/**
 * Load the Prettify CSS and JavaScript.
 */
Code.importPrettify = function() {
  var script = document.createElement('script');
  script.setAttribute('src', 'https://cdn.rawgit.com/google/code-prettify/master/loader/run_prettify.js');
  document.head.appendChild(script);
};

/**
 * Compute the absolute coordinates and dimensions of an HTML element.
 * @param {!Element} element Element to match.
 * @return {!Object} Contains height, width, x, and y properties.
 * @private
 */
Code.getBBox_ = function (element) {
  if (!element)
    return;
  var height = element.offsetHeight;
  var width = element.offsetWidth;
  var x = 0;
  var y = 0;
  do {
    x += element.offsetLeft;
    y += element.offsetTop;
    element = element.offsetParent;
  } while (element);
  return {
    height: height,
    width: width,
    x: x,
    y: y
  };
};

/**
 * User's language (e.g. "en").
 * @type {string}
 */
Code.LANG = Code.getLang();

/**
 * List of tab names.
 * @private
 */
Code.TABS_ = ['blocks', 'javascript', 'python', 'xml'];

/**
 * List of tab names with casing, for display in the UI.
 * @private
 */
Code.TABS_DISPLAY_ = [
  'Blocks', 'JavaScript', 'Python', 'XML',
];

Code.selected = 'blocks';

/**
 * Switch the visible pane when a tab is clicked.
 * @param {string} clickedName Name of tab clicked.
 */
Code.tabClick = function(clickedName) {
  // If the XML tab was open, save and render the content.
  if (document.getElementById('tab_xml') && document.getElementById('tab_xml').classList.contains('tabon')) {
    var xmlTextarea = document.getElementById('content_xml');
    var xmlText = xmlTextarea.value;
    var xmlDom = null;
    try {
      xmlDom = Blockly.Xml.textToDom(xmlText);
    } catch (e) {
      var q =
          window.confirm(MSG['badXml'].replace('%1', e));
      if (!q) {
        // Leave the user on the XML tab.
        return;
      }
    }
    if (xmlDom) {
      Code.workspace.clear();
      Blockly.Xml.domToWorkspace(xmlDom, Code.workspace);
    }
  }

  if (document.getElementById('tab_blocks') && document.getElementById('tab_blocks').classList.contains('tabon')) {
    Code.workspace.setVisible(false);
  }
  // Deselect all tabs and hide all panes.
  for (var i = 0; i < Code.TABS_.length; i++) {
    var name = Code.TABS_[i];
    var tab = document.getElementById('tab_' + name);
    if (tab) {
      tab.classList.add('taboff');
      tab.classList.remove('tabon');
    }
    if(document.getElementById('content_' + name))
      document.getElementById('content_' + name).style.visibility = 'hidden';
  }

  // Select the active tab.
  Code.selected = clickedName;
  var selectedTab = document.getElementById('tab_' + clickedName);
  if(selectedTab) {
    selectedTab.classList.remove('taboff');
    selectedTab.classList.add('tabon');
  }
  // Show the selected pane.
  if(document.getElementById('content_' + clickedName))
    document.getElementById('content_' + clickedName).style.visibility =
      'visible';
  Code.renderContent();
  // The code menu tab is on if the blocks tab is off.
  var codeMenuTab = document.getElementById('tab_code');
  if (clickedName == 'blocks') {
    if(Code.workspace) Code.workspace.setVisible(true);
    if(codeMenuTab) codeMenuTab.className = 'taboff';
  } else {
    codeMenuTab.className = 'tabon';
  }
  // Sync the menu's value with the clicked tab value if needed.
  var codeMenu = document.getElementById('code_menu');
  if (codeMenu) {
    for (var i = 0; i < codeMenu.options.length; i++) {
      if (codeMenu.options[i].value == clickedName) {
        codeMenu.selectedIndex = i;
        break;
      }
    }
  }
  if(Code.workspace) Blockly.svgResize(Code.workspace);
};

/**
 * Populate the currently selected pane with content generated from the blocks.
 */
Code.renderContent = function() {
  var content = document.getElementById('content_' + Code.selected);
  // Initialize the pane.
  if (content.id == 'content_xml') {
    var xmlTextarea = document.getElementById('content_xml');
    var xmlDom = Blockly.Xml.workspaceToDom(Code.workspace);
    var xmlText = Blockly.Xml.domToPrettyText(xmlDom);
    xmlTextarea.value = xmlText;
    xmlTextarea.focus();
  } else if (content.id == 'content_javascript') {
    Code.attemptCodeGeneration(Blockly.JavaScript);
  } else if (content.id == 'content_python') {
    Code.attemptCodeGeneration(Blockly.Python);
  }
  if (typeof PR == 'object') {
    PR.prettyPrint();
  }
};

/**
 * Attempt to generate the code and display it in the UI, pretty printed.
 * @param generator {!Blockly.Generator} The generator to use.
 */
Code.attemptCodeGeneration = function(generator) {
  var content = document.getElementById('content_' + Code.selected);
  content.textContent = '';
  if (Code.checkAllGeneratorFunctionsDefined(generator)) {
    var code = generator.workspaceToCode(Code.workspace);
    content.textContent = code;
    // Remove the 'prettyprinted' class, so that Prettify will recalculate.
    content.className = content.className.replace('prettyprinted', '');
  }
};

/**
 * Check whether all blocks in use have generator functions.
 * @param generator {!Blockly.Generator} The generator to use.
 */
Code.checkAllGeneratorFunctionsDefined = function(generator) {
  var blocks = Code.workspace.getAllBlocks(false);
  var missingBlockGenerators = [];
  for (var i = 0; i < blocks.length; i++) {
    var blockType = blocks[i].type;
    if (!generator[blockType]) {
      if (missingBlockGenerators.indexOf(blockType) == -1) {
        missingBlockGenerators.push(blockType);
      }
    }
  }

  var valid = missingBlockGenerators.length == 0;
  if (!valid) {
    var msg = 'The generator code for the following blocks not specified for ' +
        generator.name_ + ':\n - ' + missingBlockGenerators.join('\n - ');
    Blockly.alert(msg);  // Assuming synchronous. No callback.
  }
  return valid;
};

/**
 * Initialize Blockly.  Called on page load.
 */
Code.init = function() {
  Code.initLanguage();

  var rtl = Code.isRtl();
  var container = document.getElementById('content_area');
  var onresize = function(e) {
    var bBox = Code.getBBox_(container);
    if (bBox) {
      for (var i = 0; i < Code.TABS_.length; i++) {
        var el = document.getElementById('content_' + Code.TABS_[i]);
        el.style.top = bBox.y + 'px';
        el.style.left = bBox.x + 'px';
        // Height and width need to be set, read back, then set again to
        // compensate for scrollbars.
        el.style.height = bBox.height + 'px';
        el.style.height = (2 * bBox.height - el.offsetHeight) + 'px';
        el.style.width = bBox.width + 'px';
        el.style.width = (2 * bBox.width - el.offsetWidth) + 'px';
      }
    }
    // Make the 'Blocks' tab line up with the toolbox.
    if (Code.workspace && Code.workspace.getToolbox() &&  Code.workspace.getToolbox().width) {
      document.getElementById('tab_blocks').style.minWidth =
          (Code.workspace.getToolbox().width - 38) + 'px';
          // Account for the 19 pixel margin and on each side.
    }
  };
  window.addEventListener('resize', onresize, false);

  // The toolbox XML specifies each category name using Blockly's messaging
  // format (eg. `<category name="%{BKY_CATLOGIC}">`).
  // These message keys need to be defined in `Blockly.Msg` in order to
  // be decoded by the library. Therefore, we'll use the `MSG` dictionary that's
  // been defined for each language to import each category name message
  // into `Blockly.Msg`.
  // TODO: Clean up the message files so this is done explicitly instead of
  // through this for-loop.
  for (var messageKey in MSG) {
    if (messageKey.indexOf('cat') == 0) {
      Blockly.Msg[messageKey.toUpperCase()] = MSG[messageKey];
    }
  }

  // Construct the toolbox XML, replacing translated variable names.
  if (document.getElementById('toolbox')) {
    var toolboxText = document.getElementById('toolbox').outerHTML;
    toolboxText = toolboxText.replace(/(^|[^%]){(\w+)}/g,
      function (m, p1, p2) { return p1 + MSG[p2]; });
    var toolboxXml = Blockly.Xml.textToDom(toolboxText);

    Code.workspace = Blockly.inject('content_blocks',
      {
        grid:
        {
          spacing: 25,
          length: 3,
          colour: '#ccc',
          snap: true
        },
        media: '../../media/',
        rtl: rtl,
        toolbox: toolboxXml,
        zoom:
        {
          controls: true,
          wheel: true
        }
      });
  }
  // Add to reserved word list: Local variables in execution environment (runJS)
  // and the infinite loop detection function.
  Blockly.JavaScript.addReservedWords('code,timeouts,checkTimeout');

  Code.loadBlocks('');

  if ('BlocklyStorage' in window) {
    // Hook a save function onto unload.
    BlocklyStorage.backupOnUnload(Code.workspace);
  }

  Code.tabClick(Code.selected);

  Code.bindClick('trashButton',
      function() {Code.discard(); Code.renderContent();});
  Code.bindClick('runButton', Code.runJS);
  // Disable the link button if page isn't backed by App Engine storage.
  var linkButton = document.getElementById('linkButton');
  if ('BlocklyStorage' in window) {
    BlocklyStorage['HTTPREQUEST_ERROR'] = MSG['httpRequestError'];
    BlocklyStorage['LINK_ALERT'] = MSG['linkAlert'];
    BlocklyStorage['HASH_ERROR'] = MSG['hashError'];
    BlocklyStorage['XML_ERROR'] = MSG['xmlError'];
    Code.bindClick(linkButton,
        function() {BlocklyStorage.link(Code.workspace);});
  } else if (linkButton) {
    linkButton.className = 'disabled';
  }

  for (var i = 0; i < Code.TABS_.length; i++) {
    var name = Code.TABS_[i];
    Code.bindClick('tab_' + name,
        function(name_) {return function() {Code.tabClick(name_);};}(name));
  }
  Code.bindClick('tab_code', function(e) {
    if (e.target !== document.getElementById('tab_code')) {
      // Prevent clicks on child codeMenu from triggering a tab click.
      return;
    }
    Code.changeCodingLanguage();
  });

  onresize();
  if(Code.workspace) Blockly.svgResize(Code.workspace);

  // Lazy-load the syntax-highlighting.
  window.setTimeout(Code.importPrettify, 1);
};

/**
 * Initialize the page language.
 */
Code.LANG = Code.getLang();


Code.initLanguage = function () {
  var rtl = Code.isRtl();
  $("html").attr('dir', rtl ? 'rtl' : 'ltr');
  $("html").attr('lang', Code.LANG);
  var languages = [];
  for (var lang in Code.LANGUAGE_NAME) {
    languages.push([Code.LANGUAGE_NAME[lang], lang]);
  }
  var comp = function (a, b) {
    if (a[0] > b[0]) return 1;
    if (a[0] < b[0]) return -1;
    return 0;
  };
  languages.sort(comp);
  var languageMenu = $('#languageMenu');
  languageMenu.empty();
  for (var i = 0; i < languages.length; i++) {
    var tuple = languages[i];
    var lang = tuple[tuple.length - 1];
    var option = new Option(tuple[0], lang);
    if (lang == Code.LANG) option.selected = true;
    languageMenu.append(option);
  }
  $('#aboutBody').text(MSG['aboutBody']);
  $('#warning').text(MSG['nanoWarning']);
  $('#aboutModalLabel').text(MSG['aboutModalLabel']);
  $('#cardLabel').text(MSG['cardLabel']);
  $('#aboutcardLabel').text(MSG['aboutcardLabel']);
  $('#aboutusbLabel').text(MSG['aboutusbLabel']);
  $('#usbLabel').text(MSG['usbLabel']);
  $('#configModalLabel').text(MSG['configModalLabel']);
  $('#versionModalLabel').text(MSG['versionModalLabel']);
  $('#exampleModalLabel').text(MSG['exampleModalLabel']);
  $('#variableModalLabel').text(MSG['variableModalLabel']);
  $('#variablebody').text(MSG['variablebody']);
  $('#labelToolboxDefinition').text(MSG['labelToolboxDefinition']);
  $('#survol').text(MSG['survol']);
  $('#span_about').text(MSG['span_about']);
  $('#span_example').text(MSG['span_example']);
  $('#span_connect_serial').text(MSG['span_connect_serial']);
  $('#span_select_all').text(MSG['span_select_all']);
  $('#span_languageMenu').text(MSG['span_languageMenu']);
  $('#span_qtblocks').text(MSG['span_qtblocks']);
  $('#span_update').text(MSG['span_update']);
  $('#span_verify_update').text(MSG['span_verify_update']);
  $('#span_site').text(MSG['span_site']);
  $('#span_forum').text(MSG['span_forum']);
  $('#span_contact').text(MSG['span_contact']);
  $('#btn_close_config').text(MSG['btn_close']);
  $('#btn_valid_config').text(MSG['btn_valid']);
  $('#btn_close_msg').text(MSG['btn_close']);
  $('#btn_valid_msg').text(MSG['btn_valid']);
  $('#btn_variable').text(MSG['btn_variable']);
  var prog = window.localStorage.prog;
  if (prog != "python") {
    $('#btn_preview').attr('title', MSG['btn_preview_ino']);
    $('#btn_saveino').attr('title', MSG['btn_save_ino'])
  } else {
    $('#btn_preview').attr('title', MSG['btn_preview_py']);
    $('#btn_saveino').attr('title', MSG['btn_save_py']);
  }
  $('#btn_copy').attr('title', MSG['btn_copy']);
  $('#btn_print').attr('title', MSG['btn_print']);
  $('#btn_undo').attr('title', MSG['btn_undo']);
  $('#btn_redo').attr('title', MSG['btn_redo']);
  $('#btn_search').attr('title', MSG['btn_search']);
  $('#btn_new').attr('title', MSG['btn_new']);
  $('#btn_saveXML').attr('title', MSG['btn_saveXML']);
  $('#btn_fakeload').attr('title', MSG['btn_fakeload']);
  $('#btn_term').attr('title', MSG['btn_term']);
  $('#btn_factory').attr('title', MSG['btn_factory']);
  $('#btn_config').attr('title', MSG['btn_config']);
  $('#btn_about').attr('title', MSG['btn_about']);
  $('#btn_example').attr('title', MSG['btn_example']);
  $("xml").find("category").each(function () {
    if (!$(this).attr('id')) {
      $(this).attr('id', $(this).attr('name'));
      $(this).attr('name', Blockly.Msg[$(this).attr('name')]);
    }
  });
};

/**
 * Execute the user's code.
 * Just a quick and dirty eval.  Catch infinite loops.
 */
Code.runJS = function() {
  Blockly.JavaScript.INFINITE_LOOP_TRAP = 'checkTimeout();\n';
  var timeouts = 0;
  var checkTimeout = function() {
    if (timeouts++ > 1000000) {
      throw MSG['timeout'];
    }
  };
  var code = Blockly.JavaScript.workspaceToCode(Code.workspace);
  Blockly.JavaScript.INFINITE_LOOP_TRAP = null;
  try {
    eval(code);
  } catch (e) {
    alert(MSG['badCode'].replace('%1', e));
  }
};

/**
 * Discard all blocks from the workspace.
 */
Code.discard = function() {
  var count = Code.workspace.getAllBlocks(false).length;
  if (count < 2 ||
      window.confirm(Blockly.Msg['DELETE_ALL_BLOCKS'].replace('%1', count))) {
    Code.workspace.clear();
    if (window.location.hash) {
      window.location.hash = '';
    }
  }
};

Code.CONTENT=[".blocklySvg {","background-color: #fff;","outline: none;","overflow: hidden;","display: block;","}",".blocklyWidgetDiv {","display: none;","position: absolute;","z-index: 99999;","}",".injectionDiv {","height: 100%;","position: relative;","}",".blocklyNonSelectable {","user-select: none;","-moz-user-select: none;","-webkit-user-select: none;","-ms-user-select: none;","}",".blocklyTooltipDiv {","background-color: #ffffc7;","border: 1px solid #ddc;","box-shadow: 4px 4px 20px 1px rgba(0,0,0,.15);",
"color: #000;","display: none;","font-family: sans-serif;","font-size: 10pt;","opacity: 0.8;","padding: 2px;","position: absolute;","z-index: 100000;","}",".blocklyResizeSE {","cursor: se-resize;","fill: #aaa;","}",".blocklyResizeSW {","cursor: sw-resize;","fill: #aaa;","}",".blocklyResizeLine {","stroke: #888;","stroke-width: 1;","}",".blocklyHighlightedConnectionPath {","fill: none;","stroke: #fc3;","stroke-width: 2px;","}",".blocklyPathLight {","fill: none;","stroke-linecap: round;","stroke-width: 1;",
"}",".blocklySelected>.blocklyPath {","stroke: #fc3;","stroke-width: 2px;","}",".blocklySelected>.blocklyPathLight {","display: none;","}",".blocklyDragging>.blocklyPath,",".blocklyDragging>.blocklyPathLight {","fill-opacity: .8;","stroke-opacity: .8;","}",".blocklyDragging>.blocklyPathDark {","display: none;","}",".blocklyDisabled>.blocklyPath {","fill-opacity: .5;","stroke-opacity: .5;","}",".blocklyDisabled>.blocklyPathLight,",".blocklyDisabled>.blocklyPathDark {","display: none;","}",".blocklyText {",
"cursor: default;","fill: #fff;","font-family: sans-serif;","font-size: 11pt;","}",".blocklyNonEditableText>text {","pointer-events: none;","}",".blocklyNonEditableText>rect,",".blocklyEditableText>rect {","fill: #fff;","fill-opacity: .6;","}",".blocklyNonEditableText>text,",".blocklyEditableText>text {","fill: #000;","}",".blocklyEditableText:hover>rect {","stroke: #fff;","stroke-width: 2;","}",".blocklyBubbleText {","fill: #000;","}",".blocklyFlyoutButton {","fill: #888;","cursor: default;","}",
".blocklyFlyoutButtonShadow {","fill: #666;","}",".blocklyFlyoutButton:hover {","fill: #aaa;","}",".blocklyFlyoutLabel {","cursor: default;","}",".blocklyFlyoutLabelBackground {","opacity: 0;","}",".blocklyFlyoutLabelText {","fill: #000;","}",".blocklyFlyoutLabelText:hover {","fill: #aaa;","}",".blocklySvg text {","user-select: none;","-moz-user-select: none;","-webkit-user-select: none;","cursor: inherit;","}",".blocklyHidden {","display: none;","}",".blocklyFieldDropdown:not(.blocklyHidden) {",
"display: block;","}",".blocklyIconGroup {","cursor: default;","}",".blocklyIconGroup:not(:hover),",".blocklyIconGroupReadonly {","opacity: .6;","}",".blocklyIconShape {","fill: #00f;","stroke: #fff;","stroke-width: 1px;","}",".blocklyIconSymbol {","fill: #fff;","}",".blocklyMinimalBody {","margin: 0;","padding: 0;","}",".blocklyCommentTextarea {","background-color: #ffc;","border: 0;","margin: 0;","padding: 2px;","resize: none;","}",".blocklyHtmlInput {","border: none;","border-radius: 4px;","font-family: sans-serif;",
"height: 100%;","margin: 0;","outline: none;","padding: 0 1px;","width: 100%","}",".blocklyMainBackground {","stroke-width: 1;","stroke: #ffffff;","}",".blocklyMutatorBackground {","fill: #fff;","stroke: #ddd;","stroke-width: 1;","}",".blocklyFlyoutBackground {","fill: #fff;","fill-opacity: .8;","}",".blocklyScrollbarBackground {","opacity: 0;","}",".blocklyScrollbarHandle {","fill: #008080;","}",".blocklyScrollbarBackground:hover+.blocklyScrollbarHandle,",".blocklyScrollbarHandle:hover {","fill: #008080;",
"}",".blocklyZoom>image {","opacity: .4;","}",".blocklyZoom>image:hover {","opacity: .6;","}",".blocklyZoom>image:active {","opacity: .8;","}",".blocklyFlyout .blocklyScrollbarHandle {","fill: #008080;","}",".blocklyFlyout .blocklyScrollbarBackground:hover+.blocklyScrollbarHandle,",".blocklyFlyout .blocklyScrollbarHandle:hover {","fill: #008080;","}",".blocklyInvalidInput {","background: #faa;","}",".blocklyAngleCircle {","stroke: #444;","stroke-width: 1;","fill: #ddd;","fill-opacity: .8;","}",".blocklyAngleMarks {",
"stroke: #444;","stroke-width: 1;","}",".blocklyAngleGauge {","fill: #f88;","fill-opacity: .8;","}",".blocklyAngleLine {","stroke: #f00;","stroke-width: 2;","stroke-linecap: round;","}",".blocklyContextMenu {","border-radius: 4px;","}",".blocklyDropdownMenu {","padding: 0 !important;","}",".blocklyWidgetDiv .goog-option-selected .goog-menuitem-checkbox,",".blocklyWidgetDiv .goog-option-selected .goog-menuitem-icon {","background: url(<<<PATH>>>/sprites.png) no-repeat -48px -16px !important;","}",
".blocklyToolboxDiv {","background-color: #fff;","overflow-x: visible;","overflow-y: auto;","position: absolute;","}",".blocklyTreeRoot {","padding: 4px 0;","}",".blocklyTreeRoot:focus {","outline: none;","}",".blocklyTreeRow {","height: 22px;","line-height: 22px;","margin-bottom: 3px;","padding-right: 8px;","white-space: nowrap;","}",".blocklyHorizontalTree {","float: left;","margin: 1px 5px 8px 0;","}",".blocklyHorizontalTreeRtl {","float: right;","margin: 1px 0 8px 5px;","}",'.blocklyToolboxDiv[dir="RTL"] .blocklyTreeRow {',
"margin-left: 8px;","}",".blocklyTreeRow:not(.blocklyTreeSelected):hover {","background-color: #fff;","}",".blocklyTreeSeparator {","border-bottom: solid #e5e5e5 1px;","height: 0;","margin: 5px 0;","}",".blocklyTreeSeparatorHorizontal {","border-right: solid #e5e5e5 1px;","width: 0;","padding: 5px 0;","margin: 0 5px;","}",".blocklyTreeIcon {","background-image: url(<<<PATH>>>/sprites.png);","height: 16px;","vertical-align: middle;","width: 16px;","}",".blocklyTreeIconClosedLtr {","background-position: -32px -1px;",
"}",".blocklyTreeIconClosedRtl {","background-position: 0px -1px;","}",".blocklyTreeIconOpen {","background-position: -16px -1px;","}",".blocklyTreeSelected>.blocklyTreeIconClosedLtr {","background-position: -32px -17px;","}",".blocklyTreeSelected>.blocklyTreeIconClosedRtl {","background-position: 0px -17px;","}",".blocklyTreeSelected>.blocklyTreeIconOpen {","background-position: -16px -17px;","}",".blocklyTreeIconNone,",".blocklyTreeSelected>.blocklyTreeIconNone {","background-position: -48px -1px;",
"}",".blocklyTreeLabel {","cursor: default;","font-family: sans-serif;","font-size: 16px;","padding: 0 3px;","vertical-align: middle;","}",".blocklyTreeSelected .blocklyTreeLabel {","color: #fff;","}",".blocklyWidgetDiv .goog-palette {","outline: none;","cursor: default;","}",".blocklyWidgetDiv .goog-palette-table {","border: 1px solid #666;","border-collapse: collapse;","}",".blocklyWidgetDiv .goog-palette-cell {","height: 13px;","width: 15px;","margin: 0;","border: 0;","text-align: center;","vertical-align: middle;",
"border-right: 1px solid #666;","font-size: 12px;","}",".blocklyWidgetDiv .goog-palette-colorswatch {","position: relative;","height: 13px;","width: 15px;","border: 1px solid #666;","}",".blocklyWidgetDiv .goog-palette-cell-hover .goog-palette-colorswatch {","border: 1px solid #FFF;","}",".blocklyWidgetDiv .goog-palette-cell-selected .goog-palette-colorswatch {","border: 1px solid #000;","color: #fff;","}",".blocklyWidgetDiv .goog-menu {","background: #fff;","border-color: #ccc #666 #666 #ccc;","border-style: solid;",
"border-width: 1px;","cursor: default;","font: normal 13px Arial, sans-serif;","margin: 0;","outline: none;","padding: 4px 0;","position: absolute;","overflow-y: auto;","overflow-x: hidden;","max-height: 100%;","z-index: 20000;","}",".blocklyWidgetDiv .goog-menuitem {","color: #000;","font: normal 13px Arial, sans-serif;","list-style: none;","margin: 0;","padding: 4px 7em 4px 28px;","white-space: nowrap;","}",".blocklyWidgetDiv .goog-menuitem.goog-menuitem-rtl {","padding-left: 7em;","padding-right: 28px;",
"}",".blocklyWidgetDiv .goog-menu-nocheckbox .goog-menuitem,",".blocklyWidgetDiv .goog-menu-noicon .goog-menuitem {","padding-left: 12px;","}",".blocklyWidgetDiv .goog-menu-noaccel .goog-menuitem {","padding-right: 20px;","}",".blocklyWidgetDiv .goog-menuitem-content {","color: #000;","font: normal 13px Arial, sans-serif;","}",".blocklyWidgetDiv .goog-menuitem-disabled .goog-menuitem-accel,",".blocklyWidgetDiv .goog-menuitem-disabled .goog-menuitem-content {","color: #ccc !important;","}",".blocklyWidgetDiv .goog-menuitem-disabled .goog-menuitem-icon {",
"opacity: 0.3;","-moz-opacity: 0.3;","filter: alpha(opacity=30);","}",".blocklyWidgetDiv .goog-menuitem-highlight,",".blocklyWidgetDiv .goog-menuitem-hover {","background-color: #d6e9f8;","border-color: #d6e9f8;","border-style: dotted;","border-width: 1px 0;","padding-bottom: 3px;","padding-top: 3px;","}",".blocklyWidgetDiv .goog-menuitem-checkbox,",".blocklyWidgetDiv .goog-menuitem-icon {","background-repeat: no-repeat;","height: 16px;","left: 6px;","position: absolute;","right: auto;","vertical-align: middle;",
"width: 16px;","}",".blocklyWidgetDiv .goog-menuitem-rtl .goog-menuitem-checkbox,",".blocklyWidgetDiv .goog-menuitem-rtl .goog-menuitem-icon {","left: auto;","right: 6px;","}",".blocklyWidgetDiv .goog-option-selected .goog-menuitem-checkbox,",".blocklyWidgetDiv .goog-option-selected .goog-menuitem-icon {","background: url(//ssl.gstatic.com/editor/editortoolbar.png) no-repeat -512px 0;","}",".blocklyWidgetDiv .goog-menuitem-accel {","color: #999;","direction: ltr;","left: auto;","padding: 0 6px;",
"position: absolute;","right: 0;","text-align: right;","}",".blocklyWidgetDiv .goog-menuitem-rtl .goog-menuitem-accel {","left: 0;","right: auto;","text-align: left;","}",".blocklyWidgetDiv .goog-menuitem-mnemonic-hint {","text-decoration: underline;","}",".blocklyWidgetDiv .goog-menuitem-mnemonic-separator {","color: #999;","font-size: 12px;","padding-left: 4px;","}",".blocklyWidgetDiv .goog-menuseparator {","border-top: 1px solid #ccc;","margin: 4px 0;","padding: 0;","}",""];

// Load the Code demo's language strings.

document.write('<script src="msg/' + Code.LANG + '.js"></script>\n');
// Load Blockly's language strings.
document.write('<script src="js/blockly/msg/js/' + Code.LANG + '.js"></script>\n');

document.write('<script src="lang/msg_' + Code.LANG + '.js"></script>\n');
document.write('<script src="lang/Blockly_' + Code.LANG + '.js"></script>\n');
document.write('<script src="lang/microbit_' + Code.LANG + '.js"></script>\n');
document.write('<script src="lang/qtblockly_' + Code.LANG + '.js"></script>\n');


window.addEventListener('load', Code.init);
