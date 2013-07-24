$(function() {
	//$('#code').linedtextarea();

	CodeMirror.fromTextArea($('#code')[0], {
		'lineNumbers': true
	});

	var output = new PlaygroundOutput($('#output')[0]);
	var transport = new HTTPTransport();
	$('#run').click(function(){
		var body = $('#code').val();
		transport.Run(body, output)
	})
});


// Copyright 2012 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/*
In the absence of any formal way to specify interfaces in JavaScript,
here's a skeleton implementation of a playground transport.

        function Transport() {
                // Set up any transport state (eg, make a websocket connnection).
                return {
                        Run: function(body, output, options) {
                                // Compile and run the program 'body' with 'options'.
				// Call the 'output' callback to display program output.
                                return {
                                        Kill: function() {
                                                // Kill the running program.
                                        }
                                };
                        }
                };
        }

	// The output callback is called multiple times, and each time it is
	// passed an object of this form.
        var write = {
                Kind: 'string', // 'start', 'stdout', 'stderr', 'end'
                Body: 'string'  // content of write or end status message
        }

	// The first call must be of Kind 'start' with no body.
	// Subsequent calls may be of Kind 'stdout' or 'stderr'
	// and must have a non-null Body string.
	// The final call should be of Kind 'end' with an optional
	// Body string, signifying a failure ("killed", for example).

	// The output callback must be of this form.
	// See PlaygroundOutput (below) for an implementation.
        function outputCallback(write) {
                // Append writes to 
        }
*/
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

		var needScroll = (el.scrollTop + el.offsetHeight) == el.scrollHeight;

		var span = document.createElement('span');
		span.className = cl;
		span.innerHTML = m;
		el.appendChild(span);

		if (needScroll)
			el.scrollTop = el.scrollHeight - el.offsetHeight;
	}
}