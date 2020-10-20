import React, { useCallback, useRef, useImperativeHandle, useState } from 'react';
import { EditorState, Transaction, Selection } from 'prosemirror-state';
import { Node as ProsemirrorNode, NodeSpec } from 'prosemirror-model';
import DeleteIcon from '@material-ui/icons/Delete';
import { IconButton, TextField } from '@material-ui/core';
import { gapCursor } from 'prosemirror-gapcursor';
import { dropCursor } from 'prosemirror-dropcursor';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { get } from 'lodash';
import AddPhotoAlternateIcon from '@material-ui/icons/AddPhotoAlternate';

import { RichTextEditor } from 'app/components/rich-text-editor';
import { useFigureEditorStyles } from 'app/components/figure/styles';
import { buildInputRules } from 'app/models/plugins/input-rules';
import { SelectPlugin } from 'app/models/plugins/selection.plugin';
import { PlaceholderPlugin } from 'app/models/plugins/placeholder.plugin';
import { uploadImage } from 'app/utils/view.utils';

/* Prosemirror relies heavily on the positioning of nodes in its internal state presentation.
  Given figure structure

  <figure>
    <figureTitle>Title content</figureTitle>
    <figureLegend>Legend content</figureLegend>
  </figure>

  Method getPos of NodeView will return a position of just before the <figure>. Then position of figureTitle node
  in the entire document will be getPos() + 1 and the position of text content of title is getPos() + 2.
  When creating a new EditorState for figureTitleNode we supply the node itself as a document. In this new document
  the position of text is 0 (zero), thus we are losing the offset of "2". Wh
  en translating all changes to the main document we need to put this adjustments back.
 */

const FIGURE_TITLE_CONTENT_OFFSET_CORRECTION = 2;
const FIGURE_LEGEND_CONTENT_OFFSET_CORRECTION = 2;

export interface FigureEditorHandle {
  updateContent(node: ProsemirrorNode): void;
  focusFromSelection(selection: Selection, figurePos: number): void;
  hasFocus(): boolean;
}

interface FigureEditorProps {
  figureNode: ProsemirrorNode;
  onDelete(): void;
  onNodeChange(change: Transaction, offset: number): void;
  onLabelChange(label: string): void;
  onImageChange(img: string): void;
  onSelectionChange(from: number, anchor: number): void;
}

export const FigureEditor = React.forwardRef((props: FigureEditorProps, ref) => {
  const { figureNode, onNodeChange, onSelectionChange, onDelete, onLabelChange, onImageChange } = props;
  const [isTitleEditorActive, setTitleEditorActive] = useState<boolean>(false);
  const [isLegendEditorActive, setLegendEditorActive] = useState<boolean>(false);
  const [label, setLabel] = useState<string>(figureNode.attrs.label);
  const [image, setImage] = useState<string>(figureNode.attrs.img);
  const [internalTitleState, setInternalTitleState] = useState<EditorState>(createFigureTitleState(figureNode));
  const [internalLegendState, setInternalLegendState] = useState<EditorState>(createFigureLegendState(figureNode));
  const [titleOffset, setTitleOffset] = useState<number>(
    findChildrenByType(figureNode, figureNode.type.schema.nodes.figureTitle)[0].offset +
      FIGURE_TITLE_CONTENT_OFFSET_CORRECTION
  );
  const [legendOffset, setLegendOffset] = useState<number>(
    findChildrenByType(figureNode, figureNode.type.schema.nodes.figureLegend)[0].offset +
      FIGURE_LEGEND_CONTENT_OFFSET_CORRECTION
  );
  const classes = useFigureEditorStyles();
  const titleEditorRef = useRef(null);
  const legendEditorRef = useRef(null);

  useImperativeHandle(ref, () => ({
    updateContent: (updatedFigureNode: ProsemirrorNode) => {
      setLabel(updatedFigureNode.attrs.label);
      const updatedTitleNode = findChildrenByType(
        updatedFigureNode,
        updatedFigureNode.type.schema.nodes.figureTitle
      )[0];

      const updatedLegendNode = findChildrenByType(
        updatedFigureNode,
        updatedFigureNode.type.schema.nodes.figureLegend
      )[0];

      const titleChange = getUpdatesForNode(updatedTitleNode.node, titleEditorRef.current.editorView.state);
      if (titleChange) {
        titleEditorRef.current.editorView.dispatch(titleChange);
      }

      const legendChange = getUpdatesForNode(updatedLegendNode.node, legendEditorRef.current.editorView.state);
      if (legendChange) {
        legendEditorRef.current.editorView.dispatch(legendChange);
      }

      setTitleOffset(updatedTitleNode.offset + FIGURE_TITLE_CONTENT_OFFSET_CORRECTION);
      setLegendOffset(updatedLegendNode.offset + FIGURE_LEGEND_CONTENT_OFFSET_CORRECTION);
      setImage(updatedFigureNode.attrs.img);
    },
    focusFromSelection: (selection: Selection, figurePos: number) => {
      const cursorPos = selection.$from.pos;
      if (
        figurePos + titleOffset <= cursorPos &&
        cursorPos <= figurePos + titleOffset + internalTitleState.doc.nodeSize
      ) {
        titleEditorRef.current.focus();
      } else if (
        figurePos + legendOffset <= cursorPos &&
        cursorPos <= figurePos + legendOffset + internalLegendState.doc.nodeSize
      ) {
        legendEditorRef.current.focus();
      }
    },
    hasFocus: () => titleEditorRef.current.editorView.hasFocus() || legendEditorRef.current.editorView.hasFocus()
  }));

  const handleLabelChange = useCallback(
    (event) => {
      onLabelChange(event.target.value);
      setLabel(event.target.value);
    },
    [onLabelChange]
  );

  const handleTitleChange = useCallback(
    (change: Transaction) => {
      setInternalTitleState(titleEditorRef.current.editorView.state);
      if (change.docChanged && !change.getMeta('parentChange')) {
        onNodeChange(change, titleOffset);
      } else {
        onSelectionChange(change.selection.$from.pos + titleOffset, change.selection.$to.pos + titleOffset);
      }
    },
    [onNodeChange, onSelectionChange, titleOffset]
  );

  const handleLegendChange = useCallback(
    (change: Transaction) => {
      setInternalLegendState(legendEditorRef.current.editorView.state);
      if (change.docChanged && !change.getMeta('parentChange')) {
        onNodeChange(change, legendOffset);
      } else {
        onSelectionChange(change.selection.$from.pos + legendOffset, change.selection.$to.pos + legendOffset);
      }
    },
    [legendOffset, onNodeChange, onSelectionChange]
  );

  const handleTitleFocus = useCallback(() => {
    setTitleEditorActive(true);
  }, [setTitleEditorActive]);

  const handleTitleBlur = useCallback(() => {
    setTitleEditorActive(false);
  }, [setTitleEditorActive]);

  const handleLegendFocus = useCallback(() => {
    setLegendEditorActive(true);
  }, []);

  const handleLegendBlur = useCallback(() => {
    setLegendEditorActive(false);
  }, []);

  const handleUploadImageClick = useCallback(() => {
    uploadImage((imgSource: string) => {
      onImageChange(imgSource);
    });
  }, [onImageChange]);

  return (
    <div className={classes.figureContainer}>
      <div className={classes.figureContent}>
        <TextField
          fullWidth
          name="figureNumber"
          label="Figure number"
          classes={{ root: classes.inputField }}
          InputLabelProps={{ shrink: true }}
          variant="outlined"
          multiline
          value={label}
          onChange={handleLabelChange}
        />
        <div className={classes.imageContainer}>
          <img className={classes.image} alt="figure" src={image} />
          <IconButton classes={{ root: classes.uploadImageCta }} onClick={handleUploadImageClick}>
            <AddPhotoAlternateIcon fontSize="small" />
          </IconButton>
        </div>
        <div className={classes.inputField}>
          <RichTextEditor
            ref={titleEditorRef}
            isActive={isTitleEditorActive}
            variant="outlined"
            label="Title"
            editorState={internalTitleState}
            onChange={handleTitleChange}
            onFocus={handleTitleFocus}
            onBlur={handleTitleBlur}
          ></RichTextEditor>
        </div>
        <RichTextEditor
          ref={legendEditorRef}
          isActive={isLegendEditorActive}
          variant="outlined"
          label="Legend"
          editorState={internalLegendState}
          onChange={handleLegendChange}
          onFocus={handleLegendFocus}
          onBlur={handleLegendBlur}
        ></RichTextEditor>
      </div>
      <IconButton classes={{ root: classes.deleteButton }} onClick={onDelete}>
        <DeleteIcon fontSize="small" />
      </IconButton>
    </div>
  );
});

function createFigureTitleState(node: ProsemirrorNode): EditorState {
  const titleNode = findChildrenByType(node, node.type.schema.nodes.figureTitle)[0];
  return EditorState.create({
    doc: titleNode.node,
    plugins: [buildInputRules(), gapCursor(), dropCursor(), keymap(baseKeymap), SelectPlugin, PlaceholderPlugin('')]
  });
}

function createFigureLegendState(node: ProsemirrorNode): EditorState {
  const legendNode = findChildrenByType(node, node.type.schema.nodes.figureLegend)[0];
  return EditorState.create({
    doc: legendNode.node,
    plugins: [buildInputRules(), gapCursor(), dropCursor(), keymap(baseKeymap), SelectPlugin, PlaceholderPlugin('')]
  });
}

function getUpdatesForNode(updatedNode: ProsemirrorNode, state: EditorState): Transaction | null {
  const start = updatedNode.content.findDiffStart(state.doc.content);
  if (start !== null) {
    let { a: endA, b: endB } = updatedNode.content.findDiffEnd(get(state, 'doc.content'));
    const overlap = start - Math.min(endA, endB);
    if (overlap > 0) {
      endA += overlap;
      endB += overlap;
    }
    return state.tr.replace(start, endB, updatedNode.slice(start, endA)).setMeta('parentChange', true);
  }

  return null;
}

function findChildrenByType(
  node: ProsemirrorNode,
  nodeType: NodeSpec
): Array<{ node: ProsemirrorNode; offset: number }> {
  const foundChildren = [];
  node.descendants((childNode, pos) => {
    if (nodeType === childNode.type) {
      foundChildren.push({ node: childNode, offset: pos });
    }
    return !childNode.type.inlineContent;
  });
  return foundChildren;
}
