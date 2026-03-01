import { useRef, useEffect, useCallback } from 'react';
import { createGame, update, startGame, toggleWeapon } from '@/game/engine';
import { render } from '@/game/renderer';
import { GameData } from '@/game/types';

const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameData | null>(null);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gameRef.current) {
      gameRef.current.width = canvas.width;
      gameRef.current.height = canvas.height;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const g = createGame(canvas.width, canvas.height);
    gameRef.current = g;

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      g.keys[key] = true;
      if (key === 'q') {
        toggleWeapon(g);
      }
      e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      g.keys[e.key.toLowerCase()] = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      g.mousePos.x = e.clientX;
      g.mousePos.y = e.clientY;
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      g.mouseDown = true;
      if (g.state === 'start' || g.state === 'gameOver') {
        startGame(g);
      }
    };
    const onMouseUp = () => { g.mouseDown = false; };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('resize', handleResize);

    let running = true;
    const loop = () => {
      if (!running) return;
      update(g, performance.now());
      render(ctx, g);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    return () => {
      running = false;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        cursor: 'crosshair',
      }}
    />
  );
};

export default GameCanvas;
