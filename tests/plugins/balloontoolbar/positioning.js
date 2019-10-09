/* bender-tags: balloontoolbar */
/* bender-ckeditor-plugins: toolbar,link,balloontoolbar */
/* bender-include: _helpers/default.js */

( function() {
	'use strict';
	bender.editors = {
		editor1: {
			name: 'editor1',
			creator: 'replace',
			config: {
				extraAllowedContent: 'span[id];p{height};img[src]{margin-left}',
				height: 200
			}
		},
		divarea: {
			name: 'divarea',
			creator: 'replace',
			config: {
				extraPlugins: 'divarea',
				extraAllowedContent: 'span[id];p{height};img[src]{margin-left}',
				height: 200
			}
		}
	};

	var parentFrame = window.frameElement,
		originalHeight = parentFrame && parentFrame.style.height,
		balloonToolbar;

	var tests = {
		setUp: function() {
			bender.tools.ignoreUnsupportedEnvironment( 'balloontoolbar' );

			if ( parentFrame ) {
				parentFrame.style.height = '900px';
			}

			var doc = CKEDITOR.document.getDocumentElement(),
				body = CKEDITOR.document.getBody();

			if ( doc.$.scrollTop ) {
				doc.$.scrollTop = 0;
			}

			if ( body.$.scrollTop ) {
				body.$.scrollTop = 0;
			}
		},

		tearDown: function() {
			if ( parentFrame ) {
				parentFrame.style.height = originalHeight;
			}

			// Cleanup balloontoolbar to prevent 'Permission Denied' IE error.
			if ( balloonToolbar ) {
				balloonToolbar.destroy();
				balloonToolbar = null;
			}
		},

		'test panel - out of view - bottom center': function( editor ) {
			if ( editor.name == 'divarea' ) {
				// divarea tests are failing, it's an upstream issue from balloonpanel (#1064).
				assert.ignore();
			}

			var markerElement = editor.editable().findOne( '#marker' ),
				frame = getFrameRect( editor ),
				elementFrame = markerElement.getClientRect(),
				// When window is so small editor is out of view panel might be rendered below editor.
				// Mock view pane size to prevent that.
				viewPaneSpy = sinon.stub( CKEDITOR.dom.window.prototype, 'getViewPaneSize' ).returns( { width: 1000, height: 1000 } ),
				scrollTop,
				balloonToolbarRect,
				rectTop;


			balloonToolbar = new CKEDITOR.ui.balloonToolbarView( editor, {
				width: 100,
				height: 200
			} );

			balloonToolbar.attach( markerElement );
			balloonToolbarRect = balloonToolbar.parts.panel.getClientRect();
			rectTop = CKEDITOR.env.ie && !CKEDITOR.env.edge ? Math.round( balloonToolbarRect.top ) : balloonToolbarRect.top;

			viewPaneSpy.restore();

			// When browser window is so small that panel doesn't fit, window will be scrolled into panel view.
			// Use scroll position to adjust expected result.
			scrollTop = CKEDITOR.document.getWindow().getScrollPosition().y;

			var expectedLeft = makeExpectedLeft( frame.left + elementFrame.left + elementFrame.width / 2 - 50 );
			assert.areEqual( expectedLeft, balloonToolbarRect.left.toFixed( 2 ), 'left align' );
			// We have to add 1px because of border.
			assert.areEqual( ( frame.top + frame.height - scrollTop ).toFixed( 2 ),
				( rectTop + balloonToolbar.height + balloonToolbar.triangleHeight + 1 ).toFixed( 2 ), 'top align' );
		},

		'test panel - out of view - hcenter top': function( editor ) {
			if ( editor.name == 'divarea' || ( bender.config.isTravis && bender.tools.env.isBuild ) ) {
				// divarea tests are failing, it's an upstream issue from balloonpanel (#1064).
				// Ignore test with builded editor in travis.
				assert.ignore();
			}

			var markerElement = editor.editable().findOne( '#marker' ),
				frame = getFrameRect( editor ),
				elementFrame = markerElement.getClientRect(),
				scrollTop,
				balloonToolbarRect,
				rectTop,
				expectedLeft;

			balloonToolbar = new CKEDITOR.ui.balloonToolbarView( editor, {
				width: 100,
				height: 200
			} );

			markerElement.getParent().getNext().scrollIntoView( true );
			balloonToolbar.attach( markerElement );
			balloonToolbarRect = balloonToolbar.parts.panel.getClientRect();
			rectTop = CKEDITOR.env.ie && !CKEDITOR.env.edge ? Math.round( balloonToolbarRect.top ) : balloonToolbarRect.top;

			// When browser window is so small that panel doesn't fit, window will be scrolled into panel view.
			// We need to use scroll position to adjust expected result.
			scrollTop = CKEDITOR.document.getWindow().getScrollPosition().y;

			expectedLeft = makeExpectedLeft( frame.left + elementFrame.left + elementFrame.width / 2 - 50 );

			assert.areEqual( expectedLeft, balloonToolbarRect.left.toFixed( 2 ), 'left align' );
			assert.areEqual( ( frame.top - scrollTop ).toFixed( 2 ), ( rectTop - balloonToolbar.triangleHeight ).toFixed( 2 ), 'top align' );
			balloonToolbar.destroy();
			balloonToolbar = null;
		},

		'test panel adds cke_balloontoolbar class': function( editor ) {
			var markerElement = editor.editable().findOne( '#marker' );

			balloonToolbar = new CKEDITOR.ui.balloonToolbarView( editor, {
				width: 100,
				height: 200
			} );

			balloonToolbar.attach( markerElement );

			assert.isTrue( balloonToolbar.parts.panel.hasClass( 'cke_balloontoolbar' ), 'Panel has a cke_balloontoolbar class' );
			assert.isTrue( balloonToolbar.parts.panel.hasClass( 'cke_balloon' ), 'Class cke_balloon class was not removed' );
			balloonToolbar.destroy();
			balloonToolbar = null;
		},

		'test panel prefers bottom positioning': function( editor ) {
			balloonToolbar = new CKEDITOR.ui.balloonToolbarView( editor, {
				width: 100,
				height: 200
			} );

			var res = balloonToolbar._getAlignments( editor.editable().getFirst().getClientRect(), 10, 10 );

			arrayAssert.itemsAreEqual( [ 'bottom hcenter', 'top hcenter' ], CKEDITOR.tools.object.keys( res ) );
		},

		// #1342, #1496
		'test panel refresh position': function( editor, bot ) {
			bot.setData( '<img src="' + bender.basePath + '/_assets/lena.jpg">', function() {
				balloonToolbar = new CKEDITOR.ui.balloonToolbarView( editor, {
					width: 100,
					height: 200
				} );

				var markerElement = editor.editable().findOne( 'img' ),
					spy = sinon.spy( balloonToolbar, 'reposition' ),
					// This test randomly fails when run from dashboard. That's because balloon toolbar
					// uses also other listeners to reposition, which might be fired before `change`.
					// Prevent all other event's for this TC to check if it's correctly repositions on `change` #(2979).
					listeners = [
						editor.on( 'resize', cancelEvent ),
						CKEDITOR.document.getWindow().on( 'resize', cancelEvent ),
						editor.editable().getDocument().on( 'scroll', cancelEvent )
					],
					initialPosition,
					currentPosition;

				balloonToolbar.attach( markerElement );
				initialPosition = balloonToolbar.parts.panel.getClientRect();

				editor.once( 'change', function() {
					resume( function() {
						CKEDITOR.tools.array.forEach( listeners, function( listener ) {
							listener.removeListener();
						} );

						currentPosition = balloonToolbar.parts.panel.getClientRect();
						assert.areNotSame( initialPosition.left, currentPosition.left, 'position of toolbar' );
						assert.areEqual( 1, spy.callCount );
					} );
				} );

				markerElement.setStyle( 'margin-left', '200px' );
				editor.fire( 'change' );

				wait();

				function cancelEvent( evt ) {
					evt.cancel();
				}
			} );
		},

		// #1496
		'test panel reposition': function( editor, bot ) {
			bot.setData( '<img src="' + bender.basePath + '/_assets/lena.jpg">', function() {
				var markerElement = editor.editable().findOne( 'img' ),
					spy;

				balloonToolbar = new CKEDITOR.ui.balloonToolbarView( editor, {
					width: 100,
					height: 200
				} );

				balloonToolbar.attach( markerElement );
				spy = sinon.spy( balloonToolbar, 'attach' );

				balloonToolbar.reposition();
				spy.restore();

				assert.isTrue( markerElement.equals( spy.args[ 0 ][ 0 ] ) );
			} );
		},

		// #1653
		'test Balloon Toolbar should be respositioned after "window scroll" event': function( editor, bot ) {
			bot.setData( '<p>foo <span id="bar">bar</span> baz</p>', function() {
				var markerElement = editor.editable().findOne( '#bar' ),
					spy,
					win = CKEDITOR.document.getWindow();

				balloonToolbar = new CKEDITOR.ui.balloonToolbarView( editor, {
					width: 100,
					height: 200
				} );

				balloonToolbar.attach( markerElement );

				win.once( 'scroll', function() {
					spy = sinon.spy( balloonToolbar, 'reposition' );
				}, null, null, -100000 );

				win.once( 'scroll', function() {
					// Make it async to have sure that anything related to `scroll` event will finish processing.
					CKEDITOR.tools.setTimeout( function() {
						resume( function() {
							spy.restore();

							sinon.assert.calledOnce( spy );
							assert.pass();
						} );
					} );
				}, null, null, 100000 );

				CKEDITOR.tools.setTimeout( function() {
					win.fire( 'scroll' );
				} );

				wait();
			} );
		},

		// #1653
		'test Balloon Toolbar should be respositioned after "window resize" event': function( editor, bot ) {
			bot.setData( '<p>foo <span id="bar">bar</span> baz</p>', function() {
				var markerElement = editor.editable().findOne( '#bar' ),
					spy,
					win = CKEDITOR.document.getWindow();

				balloonToolbar = new CKEDITOR.ui.balloonToolbarView( editor, {
					width: 100,
					height: 200
				} );

				balloonToolbar.attach( markerElement );

				win.once( 'resize', function() {
					spy = sinon.spy( balloonToolbar, 'reposition' );
				}, null, null, -100000 );

				win.once( 'resize', function() {
					// Make it async to have sure that anything related to `scroll` event will finish processing.
					CKEDITOR.tools.setTimeout( function() {
						resume( function() {
							spy.restore();

							sinon.assert.calledOnce( spy );
							assert.pass();
						} );
					} );
				}, null, null, 100000 );

				CKEDITOR.tools.setTimeout( function() {
					win.fire( 'resize' );
				} );

				wait();
			} );
		},

		// #1653
		'test Balloon Toolbar should be respositioned after "editor change" event': function( editor, bot ) {
			bot.setData( '<p>foo <span id="bar">bar</span> baz</p>', function() {
				var markerElement = editor.editable().findOne( '#bar' ),
					spy;

				balloonToolbar = new CKEDITOR.ui.balloonToolbarView( editor, {
					width: 100,
					height: 200
				} );

				balloonToolbar.attach( markerElement );

				editor.once( 'change', function() {
					spy = sinon.spy( balloonToolbar, 'reposition' );
				}, null, null, -100000 );

				editor.once( 'change', function() {
					// Make it async to have sure that anything related to `scroll` event will finish processing.
					CKEDITOR.tools.setTimeout( function() {
						resume( function() {
							spy.restore();

							sinon.assert.calledOnce( spy );
							assert.pass();
						} );
					} );
				}, null, null, 100000 );

				CKEDITOR.tools.setTimeout( function() {
					editor.fire( 'change' );
				} );

				wait();
			} );
		},

		// #1653
		'test Balloon Toolbar should be respositioned after "editor resize" event': function( editor, bot ) {
			bot.setData( '<p>foo <span id="bar">bar</span> baz</p>', function() {
				var markerElement = editor.editable().findOne( '#bar' ),
					spy;

				balloonToolbar = new CKEDITOR.ui.balloonToolbarView( editor, {
					width: 100,
					height: 200
				} );

				balloonToolbar.attach( markerElement );

				editor.once( 'resize', function() {
					spy = sinon.spy( balloonToolbar, 'reposition' );
				}, null, null, -100000 );

				editor.once( 'resize', function() {
					// Make it async to have sure that anything related to `scroll` event will finish processing.
					CKEDITOR.tools.setTimeout( function() {
						resume( function() {
							spy.restore();

							sinon.assert.calledOnce( spy );
							assert.pass();
						} );
					} );
				}, null, null, 100000 );

				CKEDITOR.tools.setTimeout( function() {
					editor.fire( 'resize' );
				} );
				wait();
			} );
		},

		// #1653
		'test Balloon Toolbar should be respositioned after "editable scroll" event': function( editor, bot ) {
			bot.setData( '<p>foo <span id="bar">bar</span> baz</p>', function() {
				var editable = editor.editable(),
					markerElement = editable.findOne( '#bar' ),
					spy,
					editableScrollElement = editable.isInline() ? editable : editable.getDocument();

				// iOS classic editor listens on frame parent element for editor `scroll` event (#1910).
				// Since iOS 13, this `if` won't be necesary any longer https://bugs.webkit.org/show_bug.cgi?id=149264.
				if ( !editable.isInline() && CKEDITOR.env.iOS ) {
					editableScrollElement = editor.window.getFrame().getParent();
				}

				balloonToolbar = new CKEDITOR.ui.balloonToolbarView( editor, {
					width: 100,
					height: 200
				} );

				balloonToolbar.attach( markerElement );

				editableScrollElement.once( 'scroll', function() {
					spy = sinon.spy( balloonToolbar, 'reposition' );
				}, null, null, -100000 );

				editableScrollElement.once( 'scroll', function() {
					// Make it async to have sure that anything related to `scroll` event will finish processing.
					CKEDITOR.tools.setTimeout( function() {
						resume( function() {
							spy.restore();

							sinon.assert.calledOnce( spy );
							assert.pass();
						} );
					} );
				}, null, null, 100000 );

				CKEDITOR.tools.setTimeout( function() {
					editableScrollElement.fire( 'scroll' );
				} );

				wait();
			} );
		}
	};

	tests = bender.tools.createTestsForEditors( CKEDITOR.tools.object.keys( bender.editors ), tests );
	bender.test( tests );


	function makeExpectedLeft( data ) {
		if ( CKEDITOR.env.ie && CKEDITOR.env.version <= 9 ) {
			return data.toFixed( 0 ) + '.00';
		} else {
			return data.toFixed( 2 );
		}
	}

	function getFrameRect( editor ) {
		var frame = editor.window.getFrame();

		if ( editor.editable().isInline() ) {
			frame = editor.editable();
		} else if ( CKEDITOR.env.safari ) {
			// Use container because iframe has wrong rect values in mobile Safari (#1076).
			frame = frame.getParent();
		}

		return frame.getClientRect();
	}
} )();
