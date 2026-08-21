import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useRef, useState, useEffect } from 'react';
import { Palette, Trash2, Undo, Download, PenTool, Square, Circle, MoveRight } from 'lucide-react';

const WhiteboardComponent = ({ node, updateAttributes }: any) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#2563eb');
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<'pen' | 'rect' | 'arrow'>('pen');
  const [history, setHistory] = useState<string[]>([]);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load saved canvas data if present
  useEffect(() => {
    if (node.attrs.dataUrl && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = node.attrs.dataUrl;
      }
    }
  }, []);

  const saveCanvas = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
      updateAttributes({ dataUrl });
      setHistory(prev => [...prev.slice(-10), dataUrl]);
    }
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
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

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);

    if (tool === 'pen') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
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
      ctx.stroke();
    }

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
    <NodeViewWrapper className="my-4 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">交互草图白板 (Whiteboard)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Tool selector */}
          <div className="flex items-center bg-white dark:bg-slate-700 rounded p-0.5 border border-slate-200 dark:border-slate-600">
            <button
              type="button"
              onClick={() => setTool('pen')}
              className={`p-1 rounded ${tool === 'pen' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600'}`}
              title="画笔"
            >
              <PenTool className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setTool('rect')}
              className={`p-1 rounded ${tool === 'rect' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600'}`}
              title="矩形"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setTool('arrow')}
              className={`p-1 rounded ${tool === 'arrow' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600'}`}
              title="箭头"
            >
              <MoveRight className="w-3 h-3" />
            </button>
          </div>

          {/* Color picker */}
          <div className="flex items-center gap-1">
            {['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#0f172a'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-3.5 h-3.5 rounded-full border ${color === c ? 'ring-2 ring-emerald-500' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={clearCanvas}
            className="p-1 text-slate-400 hover:text-red-500 transition"
            title="清空白板"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="p-2 flex justify-center bg-slate-50 dark:bg-slate-950">
        <canvas
          ref={canvasRef}
          width={650}
          height={240}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          className="border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded cursor-crosshair shadow-inner"
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
