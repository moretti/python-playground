$(function() {
	'use strict';

	var $code = $('#code');
	var $output = $('#output');

	var editor = CodeMirror.fromTextArea($code [0], {
		'lineNumbers': true,
		'indentUnit': 4,
		'autoCloseBrackets' : true
	});

	var playgroundOutput = new PlaygroundOutput($output[0]);
	var transport = new HTTPTransport();

	$('#run').click(function(){
		var body = editor.getValue();
		transport.Run(body, playgroundOutput)
	});

	$('#format').click(function(){
		var body = editor.getValue();

		$.ajax('/fmt', {
			data: {'body': body},
			type: 'POST',
			dataType: 'JSON',
			success: function(data) {
				if (data.Error) {
					$output.empty().addClass("error").text(data.Error);
				} else {
					editor.setValue(data.Body);
					$output.empty();
				}
			}});
	});

	var origin = function (href) {
		return (""+href).split("/").slice(0, 3).join("/");
	};

	$('#share').click(function(){
		var body = editor.getValue();

		$.ajax('/share', {
			data: {'body': body},
			type: 'POST',
			success: function(data) {
				var url = origin(window.location) + "/p/" + data;
				$('#share-url').show().val(url).focus().select();
			}});
	});
});

// Copyright 2012 The Go Authors. All rights reserved.
// http://code.google.com/p/go-playground/
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file:
// http://go-playground.googlecode.com/hg/LICENSE
function HTTPTransport() {
	'use strict';

	// TODO(adg): support stderr

	function playback(output, events) {
		var timeout;
		output({Kind: 'start'});
		function next() {
			if (events.length === 0) {
				output({Kind: 'end'});
				return;
			}
			var e = events.shift();
			if (e.Delay === 0) {
				output({Kind: 'stdout', Body: e.Message});
				next();
				return;
			}
			timeout = setTimeout(function() {
				output({Kind: 'stdout', Body: e.Message});
				next();
			}, e.Delay / 1000000);
		}
		next();
		return {
			Stop: function() {
				clearTimeout(timeout);
			}
		}
	}

	function error(output, msg) {
		output({Kind: 'start'});
		output({Kind: 'stderr', Body: msg});
		output({Kind: 'end'});
	}

	var seq = 0;
	return {
		Run: function(body, output, options) {
			seq++;
			var cur = seq;
			var playing;
			$.ajax('/run', {
				type: 'POST',
				data: {'body': body},
				dataType: 'json',
				success: function(data) {
					if (seq !== cur) return;
					if (!data) return;
					if (playing) playing.Stop();
					if (data.Errors) {
						error(output, data.Errors);
						return;
					}
					playing = playback(output, data.Events);
				},
				error: function() {
					error(output, 'Error communicating with remote server.');
				}
			});
			return {
				Kill: function() {
					if (playing) playing.Stop();
					output({Kind: 'end', Body: 'killed'});
				}
			};
		}
	};
}

// Copyright 2012 The Go Authors. All rights reserved.
// http://code.google.com/p/go-playground/
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file:
// http://go-playground.googlecode.com/hg/LICENSE
function PlaygroundOutput(el) {
	'use strict';

	return function(write) {
		if (write.Kind == 'start') {
			el.innerHTML = '';
			return;
		}

		var cl = 'system';
		if (write.Kind == 'stdout' || write.Kind == 'stderr')
			cl = write.Kind;

		var m = write.Body;
		if (write.Kind == 'end') 
			m = '\nProgram exited' + (m?(': '+m):'.');

		if (m.indexOf('IMAGE:') === 0) {
			// TODO(adg): buffer all writes before creating image
			var url = 'data:image/png;base64,' + m.substr(6);
			var img = document.createElement('img');
			img.src = url;
			el.appendChild(img);
			return;
		}

		// ^L clears the screen.
		var s = m.split('\x0c');
		if (s.length > 1) {
			el.innerHTML = '';
			m = s.pop();
		}

		m = m.replace(/&/g, '&amp;');
		m = m.replace(/</g, '&lt;');
		m = m.replace(/>/g, '&gt;');

		var span = document.createElement('span');
		span.className = cl;
		span.innerHTML = m;
		el.appendChild(span);

		el.scrollTop = el.scrollHeight;
	}
}