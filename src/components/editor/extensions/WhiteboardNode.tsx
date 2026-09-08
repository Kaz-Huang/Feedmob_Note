import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import React, { useRef, useState, useEffect } from 'react';
import { Palette, Trash2, Undo, Download, PenTool, Square, Circle, MoveRight } from 'lucide-react';

const WhiteboardComponent = ({ node, updateAttributes, editor }: NodeViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#2563eb');
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<'pen' | 'rect' | 'arrow'>('pen');
  const latestDataRef = useRef<string | null>(null);
  const drawingRef = useRef(false);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Attributes are the source of truth, including editor undo/redo.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || latestDataRef.current === node.attrs.dataUrl) return;
    latestDataRef.current = node.attrs.dataUrl;
    let cancelled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (node.attrs.dataUrl) {
      const img = new Image();
      img.onload = () => { if (!cancelled) { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); } };
      img.src = node.attrs.dataUrl;
    }
    return () => { cancelled = true; };
  }, [node.attrs.dataUrl]);

  const saveCanvas = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
      latestDataRef.current = dataUrl;
      updateAttributes({ dataUrl });
    }
  };

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * canvas.width / rect.width,
      y: (e.clientY - rect.top) * canvas.height / rect.height,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pos = getPos(e);
    startPos.current = pos;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);

    if (tool === 'pen') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const pos = getPos(e);

    if (ctx && tool === 'rect') {
      const width = pos.x - startPos.current.x;
      const height = pos.y - startPos.current.y;
      ctx.strokeRect(startPos.current.x, startPos.current.y, width, height);
    } else if (ctx && tool === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(startPos.current.x, startPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      const angle = Math.atan2(pos.y - startPos.current.y, pos.x - startPos.current.x);
      const head = 12;
      ctx.moveTo(pos.x - head * Math.cos(angle - Math.PI / 6), pos.y - head * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(pos.x, pos.y);
      ctx.lineTo(pos.x - head * Math.cos(angle + Math.PI / 6), pos.y - head * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }

    drawingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDrawing(false);
    saveCanvas();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      saveCanvas();
    }
  };

  return (
    <NodeViewWrapper contentEditable={false} className="my-4 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">交互草图白板 (Whiteboard)</span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Tool selector */}
          <div className="flex items-center bg-white dark:bg-slate-700 rounded-lg p-0.5 border border-slate-200 dark:border-slate-600">
            <button
              type="button"
              onClick={() => setTool('pen')}
              className={`p-1.5 rounded-md ${tool === 'pen' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}
              title="画笔"
            >
              <PenTool className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTool('rect')}
              className={`p-1.5 rounded-md ${tool === 'rect' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}
              title="矩形"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTool('arrow')}
              className={`p-1.5 rounded-md ${tool === 'arrow' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}
              title="箭头"
            >
              <MoveRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color picker */}
          <div className="flex items-center gap-1.5">
            {['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#0f172a'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-4 h-4 rounded-full border ${color === c ? 'ring-2 ring-emerald-500' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <button type="button" onClick={() => editor.commands.undo()} title="撤销" className="p-1.5 text-slate-500"><Undo className="w-4 h-4" /></button>
          <button
            type="button"
            onClick={clearCanvas}
            className="p-1.5 text-slate-400 hover:text-red-500 transition rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
            title="清空白板"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>


      {/* Canvas Area */}
      <div className="p-2 flex justify-center bg-slate-50 dark:bg-slate-950 overflow-x-auto">
        <canvas
          ref={canvasRef}
          width={960}
          height={280}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={stopDraw}
          onPointerCancel={stopDraw}
          style={{ touchAction: 'none' }}
          className="border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl cursor-crosshair shadow-inner max-w-full"
        />
      </div>
    </NodeViewWrapper>
  );

};

export const WhiteboardNode = Node.create({
  name: 'whiteboard',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      dataUrl: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="whiteboard"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'whiteboard' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WhiteboardComponent);
  },
});
