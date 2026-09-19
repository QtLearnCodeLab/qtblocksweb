/**
 * QtBlocks Studio - Modern Vanilla DOM Core
 * Zero-dependency DOM utilities and QtBlocks UI controllers.
 */
(function (window, document) {
	'use strict';

	// Wrapper class for DOM element collections
	function DomList(elements) {
		this.elements = elements || [];
		this.length = this.elements.length;
		for (var i = 0; i < this.elements.length; i++) {
			this[i] = this.elements[i];
		}
	}

	DomList.prototype = {
		constructor: DomList,

		each: function (fn) {
			for (var i = 0; i < this.elements.length; i++) {
				if (fn.call(this.elements[i], i, this.elements[i]) === false) break;
			}
			return this;
		},

		val: function (value) {
			if (value === undefined) {
				var el = this.elements[0];
				if (!el) return '';
				if (el.type === 'checkbox') return el.checked;
				return el.value !== undefined ? el.value : '';
			}
			return this.each(function () {
				if (this.type === 'checkbox') {
					this.checked = Boolean(value);
				} else {
					this.value = value;
				}
			});
		},

		text: function (text) {
			if (text === undefined) {
				return this.elements[0] ? this.elements[0].textContent : '';
			}
			return this.each(function () {
				this.textContent = text;
			});
		},

		html: function (html) {
			if (html === undefined) {
				var el = this.elements[0];
				if (!el) return '';
				if (el.innerHTML !== undefined && el.innerHTML !== '') return el.innerHTML;
				if (window.XMLSerializer) {
					var str = '';
					for (var i = 0; i < el.childNodes.length; i++) {
						str += new XMLSerializer().serializeToString(el.childNodes[i]);
					}
					return str;
				}
				return el.innerHTML !== undefined ? el.innerHTML : '';
			}
			return this.each(function () {
				this.innerHTML = html;
			});
		},

		attr: function (name, value) {
			if (value === undefined) {
				return this.elements[0] ? this.elements[0].getAttribute(name) : null;
			}
			return this.each(function () {
				this.setAttribute(name, value);
			});
		},

		removeAttr: function (name) {
			return this.each(function () {
				this.removeAttribute(name);
			});
		},

		prop: function (name, value) {
			if (value === undefined) {
				return this.elements[0] ? this.elements[0][name] : undefined;
			}
			return this.each(function () {
				this[name] = value;
			});
		},

		css: function (prop, value) {
			if (typeof prop === 'object') {
				return this.each(function () {
					for (var k in prop) {
						if (Object.prototype.hasOwnProperty.call(prop, k)) {
							this.style[k] = prop[k];
						}
					}
				});
			}
			if (value === undefined) {
				return this.elements[0] ? window.getComputedStyle(this.elements[0])[prop] : '';
			}
			return this.each(function () {
				this.style[prop] = value;
			});
		},

		addClass: function (className) {
			if (!className) return this;
			var classes = className.trim().split(/\s+/);
			return this.each(function () {
				for (var i = 0; i < classes.length; i++) {
					this.classList.add(classes[i]);
				}
			});
		},

		removeClass: function (className) {
			if (!className) return this;
			var classes = className.trim().split(/\s+/);
			return this.each(function () {
				for (var i = 0; i < classes.length; i++) {
					this.classList.remove(classes[i]);
				}
			});
		},

		toggleClass: function (className, state) {
			if (!className) return this;
			var classes = className.trim().split(/\s+/);
			return this.each(function () {
				for (var i = 0; i < classes.length; i++) {
					if (state === undefined) {
						this.classList.toggle(classes[i]);
					} else if (state) {
						this.classList.add(classes[i]);
					} else {
						this.classList.remove(classes[i]);
					}
				}
			});
		},

		hasClass: function (className) {
			if (!this.elements[0]) return false;
			return this.elements[0].classList.contains(className);
		},

		show: function () {
			return this.each(function () {
				this.style.display = '';
				if (window.getComputedStyle(this).display === 'none') {
					this.style.display = 'block';
				}
			});
		},

		hide: function () {
			return this.each(function () {
				this.style.display = 'none';
			});
		},

		on: function (events, selectorOrFn, fn) {
			var handler = typeof selectorOrFn === 'function' ? selectorOrFn : fn;
			var selector = typeof selectorOrFn === 'string' ? selectorOrFn : null;
			var eventList = events.trim().split(/\s+/);

			return this.each(function () {
				var target = this;
				for (var i = 0; i < eventList.length; i++) {
					var ev = eventList[i].split('.')[0]; // strip namespace
					if (!ev) continue;
					if (selector) {
						var delegated = function (e) {
							var match = e.target.closest(selector);
							if (match && target.contains(match)) {
								handler.call(match, e);
							}
						};
						handler._delegated = delegated;
						target.addEventListener(ev, delegated);
					} else {
						target.addEventListener(ev, handler);
					}
				}
			});
		},

		off: function (events, selectorOrFn, fn) {
			var handler = typeof selectorOrFn === 'function' ? selectorOrFn : fn;
			var eventList = events ? events.trim().split(/\s+/) : [];

			return this.each(function () {
				var target = this;
				for (var i = 0; i < eventList.length; i++) {
					var ev = eventList[i].split('.')[0];
					if (handler && handler._delegated) {
						target.removeEventListener(ev, handler._delegated);
					} else if (handler) {
						target.removeEventListener(ev, handler);
					}
				}
			});
		},

		click: function (fn) {
			if (fn) return this.on('click', fn);
			return this.each(function () { this.click(); });
		},

		change: function (fn) {
			if (fn) return this.on('change', fn);
			return this.trigger('change');
		},

		blur: function () {
			return this.each(function () { this.blur(); });
		},

		focus: function () {
			return this.each(function () { this.focus(); });
		},

		trigger: function (eventName) {
			return this.each(function () {
				var evt;
				if (typeof Event === 'function') {
					evt = new Event(eventName, { bubbles: true, cancelable: true });
				} else {
					evt = document.createEvent('Event');
					evt.initEvent(eventName, true, true);
				}
				this.dispatchEvent(evt);
			});
		},

		append: function (content) {
			return this.each(function () {
				if (typeof content === 'string') {
					this.insertAdjacentHTML('beforeend', content);
				} else if (content instanceof Node) {
					this.appendChild(content);
				} else if (content && content.elements) {
					for (var i = 0; i < content.elements.length; i++) {
						this.appendChild(content.elements[i]);
					}
				}
			});
		},

		empty: function () {
			return this.each(function () {
				this.innerHTML = '';
			});
		},

		remove: function () {
			return this.each(function () {
				if (this.parentNode) {
					this.parentNode.removeChild(this);
				}
			});
		},

		find: function (selector) {
			var results = [];
			this.each(function () {
				var matches = this.querySelectorAll(selector);
				for (var i = 0; i < matches.length; i++) {
					if (results.indexOf(matches[i]) === -1) {
						results.push(matches[i]);
					}
				}
			});
			return new DomList(results);
		},

		closest: function (selector) {
			var el = this.elements[0];
			if (!el) return new DomList([]);
			var match = el.closest(selector);
			return match ? new DomList([match]) : new DomList([]);
		},

		children: function (selector) {
			var kids = [];
			this.each(function () {
				var ch = this.children;
				for (var i = 0; i < ch.length; i++) {
					if (!selector || ch[i].matches(selector)) {
						kids.push(ch[i]);
					}
				}
			});
			return new DomList(kids);
		},

		parent: function () {
			var parents = [];
			this.each(function () {
				if (this.parentNode && parents.indexOf(this.parentNode) === -1) {
					parents.push(this.parentNode);
				}
			});
			return new DomList(parents);
		},

		is: function (selector) {
			if (!this.elements.length) return false;
			var el = this.elements[0];
			if (typeof selector === 'string') {
				if (selector === ':checked') return !!el.checked;
				if (selector === ':visible') return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
				if (selector === ':hidden') return !(el.offsetWidth > 0 || el.offsetHeight > 0);
				return el.matches ? el.matches(selector) : false;
			}
			return false;
		},

		fadeIn: function (speed, cb) {
			this.show();
			if (typeof speed === 'function') speed();
			else if (typeof cb === 'function') cb();
			return this;
		},

		fadeOut: function (speed, cb) {
			this.hide();
			if (typeof speed === 'function') speed();
			else if (typeof cb === 'function') cb();
			return this;
		}
	};

	var eventShortcuts = [
		'keyup', 'keydown', 'keypress', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave',
		'mousedown', 'mouseup', 'mousemove', 'click', 'dblclick', 'change', 'select', 'submit',
		'focus', 'blur', 'focusin', 'focusout', 'load', 'unload', 'resize', 'scroll', 'error', 'contextmenu'
	];
	eventShortcuts.forEach(function (name) {
		DomList.prototype[name] = function (fn) {
			if (typeof fn === 'function') return this.on(name, fn);
			return this.trigger(name);
		};
	});

	// Dialog and workspace-pane controller
	var dialogBackdrop = null;
	var dialogTrigger = null;

	function getFocusable(container) {
		return Array.prototype.slice.call(container.querySelectorAll(
			'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
		)).filter(function (element) {
			return element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0;
		});
	}

	function openDialog(dialog, trigger) {
		if (!dialog) return;
		dialogTrigger = trigger || document.activeElement;
		dialog.style.display = 'block';
		dialog.setAttribute('aria-hidden', 'false');
		document.body.classList.add('has-open-dialog');

		if (!dialogBackdrop) {
			dialogBackdrop = document.createElement('div');
			dialogBackdrop.className = 'dialog-backdrop';
			document.body.appendChild(dialogBackdrop);
			dialogBackdrop.addEventListener('click', function () {
				var current = document.querySelector('.dialog-overlay.is-open');
				if (current && current.getAttribute('data-dialog-static') !== 'true') closeDialog(current);
			});
		} else {
			dialogBackdrop.style.display = 'block';
		}

		window.requestAnimationFrame(function () {
			dialogBackdrop.classList.add('is-visible');
			dialog.classList.add('is-open');
			dialog.dispatchEvent(new CustomEvent('qtui:dialog-open', { bubbles: true }));
			var focusable = getFocusable(dialog);
			(focusable[0] || dialog).focus();
		});
	}

	function closeDialog(dialog) {
		if (!dialog) return;
		dialog.classList.remove('is-open');
		dialog.setAttribute('aria-hidden', 'true');
		setTimeout(function () {
			dialog.style.display = 'none';
			dialog.dispatchEvent(new CustomEvent('qtui:dialog-close', { bubbles: true }));
			var remainingOpen = document.querySelectorAll('.dialog-overlay.is-open');
			if (remainingOpen.length === 0) {
				document.body.classList.remove('has-open-dialog');
				if (dialogBackdrop) {
					dialogBackdrop.classList.remove('is-visible');
					dialogBackdrop.style.display = 'none';
				}
				if (dialogTrigger && typeof dialogTrigger.focus === 'function') dialogTrigger.focus();
				dialogTrigger = null;
			}
		}, 150);
	}

	function showPane(target) {
		var pane = typeof target === 'string' ? document.querySelector(target) : target;
		if (!pane || !pane.parentNode) return;
		var panes = pane.parentNode.querySelectorAll('.workspace-pane');
		for (var i = 0; i < panes.length; i++) panes[i].classList.remove('is-active');
		pane.classList.add('is-active');

		var link = document.querySelector('[data-ui-tab="' + '#' + pane.id + '"]');
		if (link) {
			var items = link.closest('.mode-tabs').querySelectorAll('li');
			for (var j = 0; j < items.length; j++) items[j].classList.remove('is-active');
			var item = link.closest('li');
			if (item) item.classList.add('is-active');
		}
	}

	function setToggle(target, state) {
		var checkbox = typeof target === 'string' ? document.querySelector(target) : target;
		if (!checkbox || checkbox.type !== 'checkbox') return;
		var shouldCheck = state === 'on' || state === true;
		if (checkbox.checked !== shouldCheck) {
			checkbox.checked = shouldCheck;
			checkbox.dispatchEvent(new Event('change', { bubbles: true }));
		}
	}

	// Global click delegation for dialog triggers, dismissals and hidden workspace tabs.
	document.addEventListener('click', function (e) {
		var toggleBtn = e.target.closest('[data-dialog-target]');
		if (toggleBtn) {
			var targetSel = toggleBtn.getAttribute('data-dialog-target');
			if (targetSel && targetSel !== '#') {
				var dialog = document.querySelector(targetSel);
				if (dialog) {
					e.preventDefault();
					openDialog(dialog, toggleBtn);
				}
			}
			return;
		}

		var dismissBtn = e.target.closest('[data-dialog-dismiss]');
		if (dismissBtn) {
			var openDialogEl = dismissBtn.closest('.dialog-overlay');
			if (openDialogEl) {
				e.preventDefault();
				closeDialog(openDialogEl);
			}
			return;
		}

		var tabLink = e.target.closest('[data-ui-tab]');
		if (tabLink) {
			e.preventDefault();
			showPane(tabLink.getAttribute('data-ui-tab'));
			return;
		}

		if (e.target.classList.contains('dialog-overlay') && e.target.classList.contains('is-open') && e.target.getAttribute('data-dialog-static') !== 'true') {
			closeDialog(e.target);
		}
	});

	// Keep focus inside the active dialog; Escape closes dismissible dialogs.
	document.addEventListener('keydown', function (e) {
		var openDialogs = document.querySelectorAll('.dialog-overlay.is-open');
		if (!openDialogs.length) return;
		var current = openDialogs[openDialogs.length - 1];
		if ((e.key === 'Escape' || e.keyCode === 27) && current.getAttribute('data-dialog-static') !== 'true') {
			closeDialog(current);
			return;
		}
		if (e.key === 'Tab' || e.keyCode === 9) {
			var focusable = getFocusable(current);
			if (!focusable.length) {
				e.preventDefault();
				current.focus();
				return;
			}
			var first = focusable[0];
			var last = focusable[focusable.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	});

	// Main $ selector function
	function $(selector) {
		if (!selector) return new DomList([]);

		if (typeof selector === 'function') {
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', selector);
			} else {
				selector();
			}
			return;
		}

		if (selector instanceof DomList) return selector;

		if (selector === window || selector === document || selector.nodeType) {
			return new DomList([selector]);
		}

		if (Array.isArray(selector)) {
			return new DomList(selector);
		}

		if (typeof selector === 'string') {
			var trimmed = selector.trim();
			// HTML string creation e.g. $('<option>...</option>')
			if (trimmed.charAt(0) === '<' && trimmed.charAt(trimmed.length - 1) === '>') {
				var template = document.createElement('div');
				template.innerHTML = trimmed;
				var created = [];
				for (var i = 0; i < template.children.length; i++) {
					created.push(template.children[i]);
				}
				return new DomList(created);
			}
			// Regular CSS selector
			try {
				var els = document.querySelectorAll(selector);
				return new DomList(Array.prototype.slice.call(els));
			} catch (err) {
				return new DomList([]);
			}
		}

		return new DomList([]);
	}

	// Static utilities on $
	$.each = function (collection, callback) {
		if (!collection) return collection;
		if (Array.isArray(collection) || typeof collection.length === 'number') {
			for (var i = 0; i < collection.length; i++) {
				if (callback.call(collection[i], i, collection[i]) === false) break;
			}
		} else {
			for (var key in collection) {
				if (Object.prototype.hasOwnProperty.call(collection, key)) {
					if (callback.call(collection[key], key, collection[key]) === false) break;
				}
			}
		}
		return collection;
	};

	$.get = function (url, callback, dataType) {
		return fetch(url)
			.then(function (res) {
				if (!res.ok) throw new Error('Network error: ' + res.status);
				return res.text();
			})
			.then(function (data) {
				if (dataType === 'json') {
					try { data = JSON.parse(data); } catch (e) {}
				}
				if (typeof callback === 'function') callback(data);
				return data;
			})
			.catch(function (err) {
				console.error('Fetch GET error:', err);
			});
	};

	$.ajax = function (options) {
		var url = options.url || '';
		var method = (options.type || options.method || 'GET').toUpperCase();
		var isXml = options.dataType === 'xml';
		var isJson = options.dataType === 'json';

		// Synchronous fallback if explicitly requested (e.g. initial toolbox XML load)
		if (options.async === false) {
			try {
				var xhr = new XMLHttpRequest();
				xhr.open(method, url, false);
				xhr.send();
				var syncText = xhr.responseText;
				var syncData = syncText;
				if (isXml) {
					var xmlParser = new DOMParser();
					syncData = xmlParser.parseFromString(syncText, 'text/xml');
				} else if (isJson) {
					try { syncData = JSON.parse(syncText); } catch (e) {}
				}
				if (typeof options.success === 'function') options.success(syncData);
				var syncWrapper = {
					done: function (cb) { cb(syncData); return syncWrapper; },
					fail: function () { return syncWrapper; }
				};
				return syncWrapper;
			} catch (err) {
				if (typeof options.error === 'function') options.error(err);
				var errWrapper = {
					done: function () { return errWrapper; },
					fail: function (cb) { cb(err); return errWrapper; }
				};
				return errWrapper;
			}
		}

		// Asynchronous default via modern fetch
		var promise = fetch(url, { method: method })
			.then(function (res) {
				if (!res.ok) throw new Error('HTTP ' + res.status);
				return res.text();
			})
			.then(function (text) {
				var data = text;
				if (isXml) {
					var parser = new DOMParser();
					data = parser.parseFromString(text, 'text/xml');
				} else if (isJson) {
					data = JSON.parse(text);
				}
				if (typeof options.success === 'function') options.success(data);
				return data;
			});

		var wrapper = {
			done: function (cb) {
				promise = promise.then(function (data) { cb(data); return data; });
				return wrapper;
			},
			fail: function (cb) {
				promise = promise.catch(function (err) { cb(err); });
				return wrapper;
			}
		};

		return wrapper;
	};

	// Modern replacement for jquery-confirm dialog
	$.confirm = function (opts) {
		var title = opts.title || 'Confirm';
		var content = opts.content || '';
		var okAction = opts.buttons && opts.buttons.ok && opts.buttons.ok.action;
		var cancelAction = opts.buttons && opts.buttons.cancel;

		var confirmed = window.confirm(title + '\n\n' + content);
		if (confirmed) {
			if (typeof okAction === 'function') okAction();
		} else {
			if (typeof cancelAction === 'function') cancelAction();
		}
	};

	$.browser = { safari: false };

	// Expose globally
	$.fn = DomList.prototype;
	window.$ = $;
	window.jQuery = $;
	window.QtUI = {
		openDialog: openDialog,
		closeDialog: closeDialog,
		showPane: showPane,
		setToggle: setToggle
	};

})(window, document);
