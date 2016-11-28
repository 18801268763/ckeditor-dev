/* bender-tags: editor,table */
/* bender-ckeditor-plugins: basicstyles,undo,table,tabletools,sourcearea,toolbar */

( function() {
	'use strict';

	bender.editor = {
		config: {
			// They make HTML comparison different in build and dev modes.
			removePlugins: 'htmlwriter,entities'
		}
	};

	var selectedClass = 'cke_table-faked-selection';

	function getKeyEvent( keyCode, preventDefaultCallback ) {
		var evt = new CKEDITOR.dom.event( typeof keyCode === 'object' ? keyCode : { keyCode: keyCode, charCode: keyCode } );
		evt.preventDefault = function() {
			preventDefaultCallback && preventDefaultCallback();
		};
		return evt;
	}

	function getRangesForCells( editor, table, indexes ) {
		var ranges = [],
			range,
			cell,
			i;

		for ( i = 0; i < indexes.length; i++ ) {
			cell = table.find( 'td' ).getItem( indexes[ i ] );
			range = editor.createRange();

			cell.addClass( selectedClass );
			range.setStartBefore( cell );
			range.setEndAfter( cell );

			ranges.push( range );
		}

		return ranges;
	}

	function clearTableSelection( editable ) {
		var selected = editable.find( selectedClass ),
			i;

		for ( i = 0; i < selected.count(); i++ ) {
			selected.getItem( i ).removeClass( selectedClass );
		}
	}

	bender.test( {
		'Check if selection is in table': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				table,
				ranges;

			bender.tools.setHtmlWithSelection( editor, '<p id="foo">Foo</p>' +
				CKEDITOR.document.getById( 'simpleTable' ).getHtml() );
			table = editor.editable().findOne( 'table' );

			// Real table selection (one cell).
			selection.selectElement( table.findOne( 'td' ) );
			assert.isTrue( selection.isInTable() );

			// Real table selection (one row).
			selection.selectElement( table.findOne( 'tr' ) );
			assert.isTrue( selection.isInTable() );

			// Real table selection (tbody).
			selection.selectElement( table.findOne( 'tbody' ) );
			assert.isTrue( selection.isInTable() );

			// Real table selection (table).
			selection.selectElement( table );
			assert.isTrue( selection.isInTable() );

			// Fake table selection.
			ranges = getRangesForCells( editor, table, [ 0, 3 ] );
			selection.selectRanges( ranges );
			assert.isTrue( selection.isInTable() );
			clearTableSelection( editor.editable() );

			// Selecting only text node in table.
			selection.selectElement( table.findOne( 'td' ).getChild( 0 ) );
			assert.isTrue( selection.isInTable() );

			// Selecting paragraph.
			selection.selectElement( editor.document.getById( 'foo' ) );
			assert.isFalse( selection.isInTable() );
		},

		'Make fake table selection': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				initialRev = selection.rev,
				realSelection,
				ranges;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );

			selection.selectRanges( ranges );

			assert.isTrue( !!selection.isFake, 'isFake is set' );
			assert.isTrue( selection.isInTable(), 'isInTable is true' );
			assert.isTrue( selection.rev > initialRev, 'Next rev' );
			assert.areSame( ranges.length, selection.getRanges().length, 'Multiple ranges are selected' );
			assert.isNull( selection.getNative(), 'getNative() should be null' );
			assert.isNotNull( selection.getSelectedText(), 'getSelectedText() should not be null' );

			assert.areSame( CKEDITOR.SELECTION_TEXT, selection.getType(), 'Text type selection' );
			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( selection.getSelectedElement() ),
				'Selected element equals to the first selected cell' );

			realSelection = editor.getSelection( 1 );

			assert.areSame( 1, realSelection.getRanges().length, 'Real selection has only one range' );
			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( realSelection.getSelectedElement() ),
				'Real selected element equals to the first selected cell' );

			clearTableSelection( editor.editable() );
		},

		'Switching off fake table selection': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				initialRev = selection.rev,
				realSelection,
				ranges;

			editor.config.tableImprovements = false;
			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1 ] );

			selection.selectRanges( ranges );

			assert.isFalse( !!selection.isFake, 'isFake is not set' );
			assert.isTrue( selection.isInTable(), 'isInTable is true' );
			assert.isTrue( selection.rev > initialRev, 'Next rev' );
			assert.isNotNull( selection.getNative(), 'getNative() is not null' );
			assert.isNotNull( selection.getSelectedText(), 'getSelectedText() should not be null' );

			assert.areSame( CKEDITOR.SELECTION_ELEMENT, selection.getType(), 'Element type selection' );
			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( selection.getSelectedElement() ),
				'Selected element equals to the first selected cell' );

			realSelection = editor.getSelection( 1 );

			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( realSelection.getSelectedElement() ),
				'Real selected element equals to the first selected cell' );

			editor.config.tableImprovements = true;
			clearTableSelection( editor.editable() );
		},

		'Reset fake-selection': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				ranges;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 1 ] );
			selection.selectRanges( ranges );

			selection.reset();

			assert.isFalse( !!selection.isFake, 'isFake is not set' );

			assert.areSame( 1, selection.getRanges().length, 'Only first range remains selected' );
			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( selection.getSelectedElement() ),
				'getSelectedElement() equals to the first selected cell' );
			assert.isNotNull( selection.getNative(), 'getNative() should not be null' );

			clearTableSelection( editor.editable() );
		},

		'Fire selectionchange event': function() {
			var editor = this.editor,
				selectionChange = 0,
				selection = editor.getSelection(),
				ranges,
				selectedElement;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			var listener = editor.on( 'selectionChange', function( evt ) {
				selectionChange++;
				selectedElement = evt.data.selection.getSelectedElement();
			} );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 1 ] );
			selection.selectRanges( ranges );

			wait( function() {
				listener.removeListener();

				assert.areSame( 1, selectionChange, 'selectionChange was fired only once' );
				assert.areSame( ranges[ 0 ].getEnclosedNode(), selectedElement,
					'getSelectedElement() must be the first selected table cell' );

				clearTableSelection( editor.editable() );
			}, 50 );
		},

		'Change selection': function() {
			var editor = this.editor,
				ranges;

			bender.tools.setHtmlWithSelection( editor, '<p id="foo">Foo</p>' +
				CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 1 ] );
			editor.getSelection().selectRanges( ranges );

			wait( function() {
				var selectionChange = 0,
					selectedRanges,
					range;

				editor.on( 'selectionChange', function( evt ) {
					selectionChange++;
					selectedRanges = evt.data.selection.getRanges();
				} );

				range = editor.createRange();
				range.setStart( editor.document.getById( 'foo' ), 0 );
				editor.getSelection().selectRanges( [ range ] );

				wait( function() {
					var range = selectedRanges[ 0 ];

					assert.areSame( 1, selectionChange, 'selectionChange was fired only once' );

					range.optimize();
					assert.areSame( editor.document.getById( 'foo' ), range.startContainer );

					clearTableSelection( editor.editable() );
				}, 50 );
			}, 50 );
		},

		'Fake-selection bookmark': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				ranges,
				bookmarks;

			bender.tools.setHtmlWithSelection( editor, '<p id="foo">Foo</p>' +
				CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 3 ] );
			selection.selectRanges( ranges );

			// Bookmark it.
			bookmarks = selection.createBookmarks();

			// Move the selection somewhere else.
			selection.selectElement( editor.document.getById( 'foo' ) );

			assert.isFalse( !!selection.isFake, 'Selection is no longer fake' );

			selection.selectBookmarks( bookmarks );

			// For the unknown reasons, selecting bookmarks modifies original ranges.
			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 1 ] );

			assert.isTrue( !!selection.isFake, 'isFake is set' );

			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( selection.getSelectedElement() ),
				'getSelectedElement() must return the first selected table cell' );
			assert.areSame( ranges.length, selection.getRanges().length, 'All ranges selected' );

			clearTableSelection( editor.editable() );
		},

		'Fake-selection bookmark (serializable)': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				ranges,
				table,
				bookmarks;

			bender.tools.setHtmlWithSelection( editor, '<p id="foo">Foo</p>' +
				CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 3 ] );
			selection.selectRanges( ranges );


			// Bookmark it.
			bookmarks = selection.createBookmarks( true );

			// Move the selection somewhere else.
			selection.selectElement( editor.document.getById( 'foo' ) );

			// Replace the table with its clone.
			table = editor.editable().findOne( 'table' );
			table.clone( true, true ).replace( table );

			selection.selectBookmarks( bookmarks );

			assert.isTrue( !!selection.isFake, 'isFake is set' );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 3 ] );

			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( selection.getSelectedElement() ),
				'getSelectedElement() must return the first selected table cell' );
			assert.areSame( ranges.length, selection.getRanges().length, 'All ranges selected' );

			clearTableSelection( editor.editable() );
		},

		'Fake-selection bookmark 2': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				ranges,
				bookmarks;

			bender.tools.setHtmlWithSelection( editor, '<p id="foo">Foo</p>' +
				CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 3 ] );
			selection.selectRanges( ranges );

			// Bookmark it.
			bookmarks = selection.createBookmarks2();

			// Move the selection somewhere else.
			selection.selectElement( editor.document.getById( 'foo' ) );

			selection.selectBookmarks( bookmarks );

			assert.isTrue( !!selection.isFake, 'isFake is set' );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 3 ] );

			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( selection.getSelectedElement() ),
				'getSelectedElement() must return the first selected table cell' );
			assert.areSame( ranges.length, selection.getRanges().length, 'All ranges selected' );

			clearTableSelection( editor.editable() );
		},

		'Fake-selection bookmark 2 (normalized)': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				ranges,
				bookmarks;

			bender.tools.setHtmlWithSelection( editor, '<p id="foo">Foo</p>' +
				CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 3 ] );
			selection.selectRanges( ranges );

			// Bookmark it.
			bookmarks = selection.createBookmarks2( true );

			// Move the selection somewhere else.
			selection.selectElement( editor.document.getById( 'foo' ) );

			// Replace the editor DOM.
			editor.editable().setHtml( editor.editable().getHtml() );

			selection.selectBookmarks( bookmarks );

			assert.isTrue( !!selection.isFake, 'isFake is set' );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 3 ] );

			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( selection.getSelectedElement() ),
				'getSelectedElement() must return the first selected table cell' );
			assert.areSame( ranges.length, selection.getRanges().length, 'All ranges selected' );

			clearTableSelection( editor.editable() );
		},

		'Get text from fake table selection': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				ranges;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 1, 2, 3, 4, 5 ] );

			selection.selectRanges( ranges );

			assert.areSame( 'Cell 1.1\tCell 1.2\tCell 1.3\nCell 2.1\tCell 2.2\tCell 2.3', selection.getSelectedText(),
				'getSelectedText should return text from all selected cells.' );

			clearTableSelection( editor.editable() );
		},

		'Table fake selection does not create undo snapshots': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				ranges;

			bender.tools.setHtmlWithSelection( editor, '<p id="foo">Foo</p>' +
				CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 1 ] );

			editor.resetUndo();
			selection.selectRanges( ranges );

			editor.fire( 'saveSnapshot' );
			assert.areSame( CKEDITOR.TRISTATE_DISABLED, editor.getCommand( 'undo' ).state, 'Not undoable after making fake selection' );

			// Make a normal selection.
			editor.getSelection().selectElement( editor.document.getById( 'foo' ) );
			editor.fire( 'saveSnapshot' );
			assert.areSame( CKEDITOR.TRISTATE_DISABLED, editor.getCommand( 'undo' ).state, 'Not undoable after removing fake selection' );

			clearTableSelection( editor.editable() );
		},

		'Table fake selection undo': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				ranges;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0 ] );

			editor.resetUndo();
			selection.selectRanges( ranges );

			// Execute bold, adding a undo step to the editor.
			editor.execCommand( 'bold' );

			assert.areSame( CKEDITOR.TRISTATE_OFF, editor.getCommand( 'undo' ).state, 'Undoable after bold' );

			// Undo bold, which must restore the fake-selection.
			editor.execCommand( 'undo' );

			// Retrieve the selection again.
			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0 ] );
			selection = editor.getSelection();

			assert.isTrue( !!selection.isFake, 'isFake is set' );
			assert.isTrue( selection.isInTable(), 'isInTable is true' );
			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( selection.getSelectedElement() ),
				'Selected element equals to the first selected cell' );

			editor.fire( 'saveSnapshot' );
			assert.areSame( CKEDITOR.TRISTATE_DISABLED, editor.getCommand( 'undo' ).state, 'Not undoable after undo' );

			clearTableSelection( editor.editable() );
		},

		'Navigating left inside table fake selection': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				prevented = false,
				ranges,
				range;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );

			selection.selectRanges( ranges );

			// Left arrow.
			editor.editable().fire( 'keydown', getKeyEvent( 37, function() {
				prevented = true;
			} ) );

			assert.isTrue( prevented, 'Default keydown was prevented' );

			assert.isFalse( !!selection.isFake, 'isFake is not set' );
			assert.isFalse( selection.isInTable(), 'isInTable is false' );
			assert.areSame( 1, selection.getRanges().length, 'Only one range is selected' );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );
			range = selection.getRanges()[ 0 ];

			assert.isTrue( !!range.collapsed, 'Range is collapsed' );
			assert.isTrue( range.startContainer.equals( ranges[ 0 ].getEnclosedNode() ),
				'Selection is in the first cell' );
			assert.areSame( 0, range.startOffset, 'Range is collapsed to the start' );

			clearTableSelection( editor.editable() );
		},

		'Navigating up inside table fake selection': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				prevented = false,
				ranges,
				range;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );

			selection.selectRanges( ranges );

			// Up arrow.
			editor.editable().fire( 'keydown', getKeyEvent( 38, function() {
				prevented = true;
			} ) );

			assert.isTrue( prevented, 'Default keydown was prevented' );

			assert.isFalse( !!selection.isFake, 'isFake is not set' );
			assert.isFalse( selection.isInTable(), 'isInTable is false' );
			assert.areSame( 1, selection.getRanges().length, 'Only one range is selected' );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );
			range = selection.getRanges()[ 0 ];

			assert.isTrue( !!range.collapsed, 'Range is collapsed' );
			assert.isTrue( range.startContainer.equals( ranges[ 0 ].getEnclosedNode() ),
				'Selection is in the first cell' );
			assert.areSame( 0, range.startOffset, 'Range is collapsed to the start' );

			clearTableSelection( editor.editable() );
		},

		'Navigating right inside table fake selection': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				prevented = false,
				ranges,
				range;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );

			selection.selectRanges( ranges );

			// Right arrow.
			editor.editable().fire( 'keydown', getKeyEvent( 39, function() {
				prevented = true;
			} ) );

			assert.isTrue( prevented, 'Default keydown was prevented' );

			assert.isFalse( !!selection.isFake, 'isFake is not set' );
			assert.isFalse( selection.isInTable(), 'isInTable is false' );
			assert.areSame( 1, selection.getRanges().length, 'Only one range is selected' );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );
			range = selection.getRanges()[ 0 ];

			assert.isTrue( !!range.collapsed, 'Range is collapsed' );
			assert.isTrue( range.startContainer.equals( ranges[ 1 ].getEnclosedNode() ),
				'Selection is in the last cell' );
			assert.isTrue( range.startOffset > 0, 'Range is collapsed to the end' );

			clearTableSelection( editor.editable() );
		},

		'Navigating down inside table fake selection': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				prevented = false,
				ranges,
				range;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );

			selection.selectRanges( ranges );

			// Down arrow.
			editor.editable().fire( 'keydown', getKeyEvent( 40, function() {
				prevented = true;
			} ) );

			assert.isTrue( prevented, 'Default keydown was prevented' );

			assert.isFalse( !!selection.isFake, 'isFake is not set' );
			assert.isFalse( selection.isInTable(), 'isInTable is false' );
			assert.areSame( 1, selection.getRanges().length, 'Only one range is selected' );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );
			range = selection.getRanges()[ 0 ];

			assert.isTrue( !!range.collapsed, 'Range is collapsed' );
			assert.isTrue( range.startContainer.equals( ranges[ 1 ].getEnclosedNode() ),
				'Selection is in the last cell' );
			assert.isTrue( range.startOffset > 0, 'Range is collapsed to the end' );

			clearTableSelection( editor.editable() );
		},

		'Deleting content in table fake selection via Backspace': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				prevented = false,
				ranges,
				range,
				i;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );

			selection.selectRanges( ranges );

			// Backspace.
			editor.editable().fire( 'keydown', getKeyEvent( 8, function() {
				prevented = true;
			} ) );

			assert.isTrue( prevented, 'Default keydown was prevented' );

			assert.isFalse( !!selection.isFake, 'isFake is not set' );
			assert.isFalse( selection.isInTable(), 'isInTable is false' );
			assert.areSame( 1, selection.getRanges().length, 'Only one range is selected' );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );
			range = selection.getRanges()[ 0 ];

			assert.isTrue( !!range.collapsed, 'Range is collapsed' );
			assert.isTrue( range.startContainer.equals( ranges[ 0 ].getEnclosedNode() ),
				'Selection is in the first cell' );

			// Check if the content is actually deleted.
			for ( i = 0; i < ranges.length; i++ ) {
				if ( bender.tools.compatHtml( ranges[ i ].getEnclosedNode().getHtml(), 0, 0, 1 ).length > 0 ) {
					assert.fail( 'Content was not deleted' );
				}
			}

			clearTableSelection( editor.editable() );
		},

		'Deleting content in table fake selection via Delete': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				prevented = false,
				ranges,
				range,
				i;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );

			selection.selectRanges( ranges );

			// Delete.
			editor.editable().fire( 'keydown', getKeyEvent( 46, function() {
				prevented = true;
			} ) );

			assert.isTrue( prevented, 'Default keydown was prevented' );

			assert.isFalse( !!selection.isFake, 'isFake is not set' );
			assert.isFalse( selection.isInTable(), 'isInTable is false' );
			assert.areSame( 1, selection.getRanges().length, 'Only one range is selected' );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );
			range = selection.getRanges()[ 0 ];

			assert.isTrue( !!range.collapsed, 'Range is collapsed' );
			assert.isTrue( range.startContainer.equals( ranges[ 0 ].getEnclosedNode() ),
				'Selection is in the first cell' );

			// Check if the content is actually deleted.
			for ( i = 0; i < ranges.length; i++ ) {
				if ( bender.tools.compatHtml( ranges[ i ].getEnclosedNode().getHtml(), 0, 0, 1 ).length > 0 ) {
					assert.fail( 'Content was not deleted' );
				}
			}

			clearTableSelection( editor.editable() );
		},

		'Overwriting content in table fake selection via keypress': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				prevented = false,
				ranges,
				range,
				i;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );

			selection.selectRanges( ranges );

			// Random keypress.
			editor.editable().fire( 'keypress', getKeyEvent( 65, function() {
				prevented = true;
			} ) );

			assert.isFalse( prevented, 'Default keypress was not prevented' );

			assert.isFalse( !!selection.isFake, 'isFake is not set' );
			assert.isFalse( selection.isInTable(), 'isInTable is false' );
			assert.areSame( 1, selection.getRanges().length, 'Only one range is selected' );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );
			range = selection.getRanges()[ 0 ];

			assert.isTrue( !!range.collapsed, 'Range is collapsed' );
			assert.isTrue( range.startContainer.equals( ranges[ 0 ].getEnclosedNode() ),
				'Selection is in the first cell' );

			// Check if the content is actually ovewritten.
			for ( i = 0; i < ranges.length; i++ ) {
				if ( bender.tools.compatHtml( ranges[ i ].getEnclosedNode().getHtml(), 0, 0, 1 ).length > 0 ) {
					assert.fail( 'Content was not overwritten' );
				}
			}

			clearTableSelection( editor.editable() );
		},

		'Not overwriting content in table fake selection via keypress when no character is produced': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				prevented = false,
				ranges,
				i;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );

			selection.selectRanges( ranges );

			// Random keypress.
			editor.editable().fire( 'keypress', getKeyEvent( { keyCode: 113, charCode: 0 }, function() {
				prevented = true;
			} ) );

			assert.isFalse( prevented, 'Default keypress was not prevented' );

			assert.isTrue( !!selection.isFake, 'isFake is set' );
			assert.isTrue( selection.isInTable(), 'isInTable is true' );
			assert.areSame( 2, selection.getRanges().length, 'All ranges are selected' );

			// Check if the content is actually ovewritten.
			for ( i = 0; i < ranges.length; i++ ) {
				if ( bender.tools.compatHtml( ranges[ i ].getEnclosedNode().getHtml(), 0, 0, 1 ).length === 0 ) {
					assert.fail( 'Content was overwritten' );
				}
			}

			clearTableSelection( editor.editable() );
		},

		'Not overwriting content in table fake selection via keypress when Ctrl is pressed': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				prevented = false,
				ranges,
				i;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );

			selection.selectRanges( ranges );

			// Random keypress.
			editor.editable().fire( 'keypress', getKeyEvent( { keyCode: 65, charCode: 65, ctrlKey: true }, function() {
				prevented = true;
			} ) );

			assert.isFalse( prevented, 'Default keypress was not prevented' );

			assert.isTrue( !!selection.isFake, 'isFake is set' );
			assert.isTrue( selection.isInTable(), 'isInTable is true' );
			assert.areSame( 2, selection.getRanges().length, 'All ranges are selected' );

			// Check if the content is actually ovewritten.
			for ( i = 0; i < ranges.length; i++ ) {
				if ( bender.tools.compatHtml( ranges[ i ].getEnclosedNode().getHtml(), 0, 0, 1 ).length === 0 ) {
					assert.fail( 'Content was overwritten' );
				}
			}

			clearTableSelection( editor.editable() );
		},

		'Simulating opening context menu in the same table': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				realSelection,
				ranges,
				range;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );

			selection.selectRanges( ranges );

			// Stub reset method to prevent overwriting fake selection on selectRanges.
			sinon.stub( CKEDITOR.dom.selection.prototype, 'reset' );

			// We must restore this method before any other selectionchange listeners
			// to be sure that selectionchange works as intended.
			editor.editable().once( 'selectionchange', function() {
				CKEDITOR.dom.selection.prototype.reset.restore();
			}, null, null, -2 );

			realSelection = editor.getSelection( 1 );
			range = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 2 ] ) [ 0 ];

			range.collapse();
			realSelection.selectRanges( [ range ] );

			assert.isTrue( !!selection.isFake, 'isFake is set' );
			assert.isTrue( selection.isInTable(), 'isInTable is true' );
			assert.areSame( ranges.length, selection.getRanges().length, 'Multiple ranges are selected' );
			assert.isNull( selection.getNative(), 'getNative() should be null' );
			assert.isNotNull( selection.getSelectedText(), 'getSelectedText() should not be null' );

			assert.areSame( CKEDITOR.SELECTION_TEXT, selection.getType(), 'Text type selection' );
			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( selection.getSelectedElement() ),
				'Selected element equals to the first selected cell' );

			clearTableSelection( editor.editable() );
		},

		'Simulating opening context menu in the different table': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				realSelection,
				ranges,
				range;

			bender.tools.setHtmlWithSelection( editor,
				CKEDITOR.tools.repeat( CKEDITOR.document.getById( 'simpleTable' ).getHtml(), 2 ) );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );

			selection.selectRanges( ranges );

			// Stub reset method to prevent overwriting fake selection on selectRanges.
			sinon.stub( CKEDITOR.dom.selection.prototype, 'reset' );

			// We must restore this method before any other selectionchange listeners
			// to be sure that selectionchange works as intended.
			editor.editable().once( 'selectionchange', function() {
				CKEDITOR.dom.selection.prototype.reset.restore();
			}, null, null, -2 );

			realSelection = editor.getSelection( 1 );
			range = getRangesForCells( editor, editor.editable().find( 'table' ).getItem( 1 ), [ 2 ] ) [ 0 ];

			range.collapse();
			realSelection.selectRanges( [ range ] );

			assert.isFalse( !!selection.isFake, 'isFake is noy set' );
			assert.isFalse( selection.isInTable(), 'isInTable is false' );
			assert.areSame( 1, selection.getRanges().length, 'One range are selected' );
			assert.isNotNull( selection.getNative(), 'getNative() should not be null' );

			assert.isTrue( !!selection.getRanges()[ 0 ].collapsed, 'Selection is collapsed' );

			clearTableSelection( editor.editable() );
		},

		'Simulating opening context menu in the paragraph': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				realSelection,
				ranges,
				range;

			bender.tools.setHtmlWithSelection( editor, '<p>Foo</p>' + CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );

			selection.selectRanges( ranges );

			// Stub reset method to prevent overwriting fake selection on selectRanges.
			sinon.stub( CKEDITOR.dom.selection.prototype, 'reset' );

			// We must restore this method before any other selectionchange listeners
			// to be sure that selectionchange works as intended.
			editor.editable().once( 'selectionchange', function() {
				CKEDITOR.dom.selection.prototype.reset.restore();
			}, null, null, -2 );

			realSelection = editor.getSelection( 1 );
			range = editor.createRange();

			range.selectNodeContents( editor.editable().findOne( 'p' ) );
			range.collapse();
			realSelection.selectRanges( [ range ] );

			assert.isFalse( !!selection.isFake, 'isFake is not set' );
			assert.isFalse( selection.isInTable(), 'isInTable is false' );
			assert.areSame( 1, selection.getRanges().length, 'One range are selected' );
			assert.isNotNull( selection.getNative(), 'getNative() should not be null' );

			assert.isTrue( !!selection.getRanges()[ 0 ].collapsed, 'Selection is collapsed' );

			clearTableSelection( editor.editable() );
		}
	} );
}() );
