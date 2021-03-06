// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ICellModel,
} from './model';

import {
  CodeEditor
} from '../../codeeditor';

import {
  CodeEditorWidget
} from '../../codeeditor/widget';

import {
  IChangedArgs
} from '../../common/interfaces';

import {
  ObservableString
} from '../../common/observablestring';


/**
 * The location of requested edges.
 */
export type EdgeLocation = 'top' | 'bottom';


/**
 * An interface describing editor state coordinates.
 */
export
interface ICoords extends JSONObject {
  /**
   * The left coordinate value.
   */
  readonly left: number;

  /**
   * The right coordinate value.
   */
  readonly right: number;

  /**
   * The top coordinate value.
   */
  readonly top: number;

  /**
   * The bottom coordinate value.
   */
  readonly bottom: number;
}


/**
 * An interface describing the state of the editor in an event.
 */
export
interface IEditorState extends JSONObject {
  /**
   * The character number of the editor cursor within a line.
   */
  readonly ch: number;

  /**
   * The height of a character in the editor.
   */
  readonly chHeight: number;

  /**
   * The width of a character in the editor.
   */
  readonly chWidth: number;

  /**
   * The line number of the editor cursor.
   */
  readonly line: number;

  /**
   * The coordinate position of the cursor.
   */
  readonly coords: ICoords;

  /**
   * The cursor position of the request, including line breaks.
   */
  readonly position: number;
}


/**
 * An interface describing editor text changes.
 */
export
interface ITextChange extends IEditorState {
  /**
   * The new value of the editor text.
   */
  readonly newValue: string;
}


/**
 * An interface describing completion requests.
 */
export
interface ICompletionRequest extends IEditorState {
  /**
   * The current value of the editor text.
   */
  readonly currentValue: string;
}


/**
 * A widget for a cell editor.
 */
export
interface ICellEditorWidget extends Widget {
  /**
   * The editor used by the widget.
   */
  readonly editor: CodeEditor.IEditor;

  /**
   * The cell model used by the editor.
   */
  model: ICellModel | null;

  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  edgeRequested: ISignal<ICellEditorWidget, EdgeLocation>;

  /**
   * A signal emitted when a text change is completed.
   */
  textChanged: ISignal<ICellEditorWidget, ITextChange>;

  /**
   * A signal emitted when a completion is requested.
   */
  completionRequested: ISignal<ICellEditorWidget, ICompletionRequest>;

  /**
   * The line numbers state of the editor.
   */
  lineNumbers: boolean;

  /**
   * Change the mime type for an editor.
   */
  setMimeType(mimeType: string): void;

  /**
   * Set whether the editor is read only.
   */
  setReadOnly(readOnly: boolean): void;

  /**
   * Test whether the editor has keyboard focus.
   */
  hasFocus(): boolean;

  /**
   * Returns a zero-based last line number.
   */
  getLastLine(): number;

  /**
   * Returns the position of the cursor.
   */
  getCursorPosition(): number;

  /**
   * Set the position of the cursor.
   *
   * @param position - A new cursor's position.
   */
  setCursorPosition(cursorPosition: number): void;

  /**
   * Set the position of the cursor.
   *
   * @param line - A zero-based line number.
   *
   * @param character - A zero-based character number.
   */
  setCursor(line: number, character: number): void;
}

/**
 * The key code for the up arrow key.
 */
const UP_ARROW = 38;

/**
 * The key code for the down arrow key.
 */
const DOWN_ARROW = 40;

/**
 * The key code for the tab key.
 */
const TAB = 9;

/**
 * The class name added to cell editor widget nodes.
 */
const CELL_EDITOR_CLASS = 'jp-CellEditor';

/**
 * The class name added to read only cell editor widgets.
 */
const READ_ONLY_CLASS = 'jp-mod-readOnly';


/**
 * A code editor widget for a cell editor.
 */
export
class CodeCellEditorWidget extends CodeEditorWidget implements ICellEditorWidget {
  /**
   * Construct a new cell editor widget.
   */
  constructor(editorFactory: (host: Widget) => CodeEditor.IEditor) {
    super(editorFactory);
    this.addClass(CELL_EDITOR_CLASS);

    this.editor.model.value.changed.connect(() => {
      this.onEditorModelChange();
    });
    this.editor.addKeydownHandler((editor, event) => {
      return this.onEditorKeydown(editor, event);
    });
  }

  /**
   * A signal emitted when a tab (text) completion is requested.
   */
  completionRequested: ISignal<ICellEditorWidget, ICompletionRequest>;

  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  edgeRequested: ISignal<ICellEditorWidget, EdgeLocation>;

  /**
   * A signal emitted when a text change is completed.
   */
  textChanged: ISignal<ICellEditorWidget, ITextChange>;

  /**
   * The cell model used by the editor.
   */
  get model(): ICellModel | null {
    return this._model;
  }
  set model(model: ICellModel | null) {
    if (!model && !this._model || model === this._model) {
      return;
    }

    const oldValue = this._model;
    this._model = model;
    this.onModelChanged(oldValue, model);
  }

  /**
   * The line numbers state of the editor.
   */
  get lineNumbers(): boolean {
    return this.editor.lineNumbers;
  }
  set lineNumbers(value: boolean) {
    this.editor.lineNumbers = value;
  }

  /**
   * Dispose of the resources held by the editor.
   */
  dispose(): void {
    this._model = null;
    super.dispose();
  }

  /**
   * Change the mode for an editor based on the given mime type.
   */
  setMimeType(mimeType: string): void {
    this.editor.model.mimeType = mimeType;
  }

  /**
   * Set whether the editor is read only.
   */
  setReadOnly(readOnly: boolean): void {
    let option = readOnly ? true : false;
    this.editor.readOnly = option;
    this.toggleClass(READ_ONLY_CLASS, option);
  }

  /**
   * Test whether the editor has keyboard focus.
   */
  hasFocus(): boolean {
    return this.editor.hasFocus();
  }

  /**
   * Returns a zero-based last line number.
   */
  getLastLine(): number {
    let editorModel = this.editor.model;
    return editorModel.lineCount - 1;
  }

  /**
   * Get the current cursor position of the editor.
   */
  getCursorPosition(): number {
    const cursorPosition = this.editor.getCursorPosition();
    return this.editor.model.getOffsetAt(cursorPosition);
  }

  /**
   * Set the position of the cursor.
   *
   * @param position - A new cursor's position.
   */
  setCursorPosition(offset: number): void {
    const position = this.editor.model.getPositionAt(offset);
    this.editor.setCursorPosition(position);
  }

  /**
   * Set the position of the cursor.
   *
   * @param line - A zero-based line number.
   *
   * @param character - A zero-based character number.
   */
  setCursor(line: number, character: number): void {
    let editorModel = this.editor.model;
    let position = editorModel.getOffsetAt({
      line: line,
      column: character
    });
    this.setCursorPosition(position);
  }

  /**
   * Handle changes in the model.
   *
   * #### Notes
   * Subclasses may override this method as needed.
   */
  protected onModelChanged(oldValue: ICellModel | null, newValue: ICellModel | null): void {
    // If the model is being replaced, disconnect the old signal handler.
    if (oldValue) {
      oldValue.stateChanged.disconnect(this.onModelStateChanged, this);
    }

    if (newValue) {
      this.editor.model.value.text = newValue.source || '';
      this.editor.model.clearHistory();
      newValue.stateChanged.connect(this.onModelStateChanged, this);
    } else {
      this.editor.model.value.text = '';
    }
  }

  /**
   * Handle changes in the model state.
   */
  protected onModelStateChanged(model: ICellModel, args: IChangedArgs<any>): void {
    switch (args.name) {
    case 'source':
      let editorModel = this.editor.model;
      if (editorModel.value.text !== args.newValue) {
        editorModel.value.text = args.newValue;
      }
      break;
    default:
      break;
    }
  }

  /**
   * Handle change events from the editor model.
   */
  protected onEditorModelChange(): void {
    let editor = this.editor;
    let model = this.model;
    let newValue = editor.model.value.text;
    let cursorPosition = editor.getCursorPosition();
    let position = editor.model.getOffsetAt(cursorPosition);
    let line = cursorPosition.line;
    let ch = cursorPosition.column;
    let coords = editor.getCoordinate(cursorPosition) as ICoords;
    let chHeight = editor.lineHeight;
    let chWidth = editor.charWidth;
    if (model) {
      model.source = newValue;
    }
    this.textChanged.emit({
      line, ch, chHeight, chWidth, coords, position, newValue
    });
  }

  /**
   * Handle keydown events from the editor.
   */
  protected onEditorKeydown(editor: CodeEditor.IEditor, event: KeyboardEvent): boolean {
    let editorModel = editor.model;
    let cursorPosition = editor.getCursorPosition();
    let line = cursorPosition.line;
    let ch = cursorPosition.column;

    if (event.keyCode === TAB) {
      // If the tab is modified, ignore it.
      if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
        return false;
      }
      this.onTabEvent(event, ch, line);
      return false;
    }

    if (line === 0 && ch === 0 && event.keyCode === UP_ARROW) {
        if (!event.shiftKey) {
          this.edgeRequested.emit('top');
        }
        return false;
    }

    let lastLine = editorModel.lineCount - 1;
    let lastCh = editorModel.getLine(editorModel.lineCount - 1).length;
    if (line === lastLine && ch === lastCh && event.keyCode === DOWN_ARROW) {
      if (!event.shiftKey) {
        this.edgeRequested.emit('bottom');
      }
      return false;
    }
    return false;
  }

  /**
   * Handle a tab key press.
   */
  protected onTabEvent(event: KeyboardEvent, ch: number, line: number): void {
    let editor = this.editor;
    let editorModel = editor.model;

    // If there is a text selection, no completion requests should be emitted.
    const selection = editor.getSelection();
    if (selection.start === selection.end) {
      return;
    }

    let currentValue = editorModel.value.text;
    let currentLine = currentValue.split('\n')[line];
    let chHeight = editor.lineHeight;
    let chWidth = editor.charWidth;
    let coords = editor.getCoordinate({
      line: line,
      column: ch
    });
    let position = editorModel.getOffsetAt({
      line: line,
      column: ch
    });

    // A completion request signal should only be emitted if the current
    // character or a preceding character is not whitespace.
    //
    // Otherwise, the default tab action of creating a tab character should be
    // allowed to propagate.
    if (!currentLine.substring(0, ch).match(/\S/)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    let data = {
      line, ch, chHeight, chWidth, coords, position, currentValue
    };
    this.completionRequested.emit(data as ICompletionRequest);
  }

  private _model: ICellModel | null = null;
}


// Define the signals for the `CodeCellEditorWidget` class.
defineSignal(CodeCellEditorWidget.prototype, 'completionRequested');
defineSignal(CodeCellEditorWidget.prototype, 'edgeRequested');
defineSignal(CodeCellEditorWidget.prototype, 'textChanged');
