'use client';

import React, { useEffect, useRef } from 'react';

export interface AlphaVideoProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  /** Se llama cuando el primer fotograma ya está pintado (para ocultar la imagen fija) */
  onReady?: () => void;
  /** Se llama si el navegador no puede reproducirlo (sin WebGL, autoplay bloqueado…) */
  onFail?: () => void;
}

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() {
  uv = vec2((p.x + 1.0) * 0.5, 1.0 - (p.y + 1.0) * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

// "Unscreen": alfa = brillo máximo del píxel. Con alfa premultiplicado, el resultado
// sobre cualquier fondo equivale a fundir el vídeo de fondo negro con `screen`.
const FRAG = `
precision mediump float;
varying vec2 uv;
uniform sampler2D t;
void main() {
  vec3 c = texture2D(t, uv).rgb;
  float a = clamp((max(c.r, max(c.g, c.b)) - 0.035) / 0.965, 0.0, 1.0);
  gl_FragColor = vec4(c * a / max(max(c.r, max(c.g, c.b)), 0.0001), a);
}`;

/**
 * Reproduce en bucle un vídeo con fondo negro y lo pinta en un <canvas> WebGL
 * convirtiendo el negro en transparencia real, fotograma a fotograma.
 */
export function AlphaVideo({ src, className, style, onReady, onFail }: AlphaVideoProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) {
      onFail?.();
      return;
    }

    const compile = (type: number, code: string): WebGLShader | null => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, code);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) {
      onFail?.();
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let raf = 0;
    let ready = false;
    let stopped = false;

    const draw = (): void => {
      if (stopped) return;
      if (video.readyState >= 2) {
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          gl.viewport(0, 0, canvas.width, canvas.height);
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (!ready) {
          ready = true;
          onReady?.();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    video.play().catch((err: unknown) => {
      // AbortError = un pause() interrumpió el play (desmontaje, salir de pantalla): no es un fallo
      if (stopped || (err instanceof DOMException && err.name === 'AbortError')) return;
      onFail?.();
    });

    // Pausa cuando no se ve (ahorra batería)
    const io = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      if (entry.isIntersecting) void video.play().catch(() => undefined);
      else video.pause();
    });
    io.observe(canvas);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      video.pause();
    };
  }, [src, onReady, onFail]);

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        // Fuera de pantalla pero "visible" para que iOS decodifique fotogramas
        style={{ position: 'fixed', left: 0, top: 0, width: 2, height: 2, opacity: 0, pointerEvents: 'none' }}
      />
      <canvas ref={canvasRef} className={className} style={style} aria-hidden="true" />
    </>
  );
}
