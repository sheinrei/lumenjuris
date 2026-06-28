//hook pour le deplacement du widget
import { useRef } from "react";



/**
 * Hook custom afin de déplacement un élément du DOM de façon dynamique.
 * 
 * @param initialRight 
 * @param initialBottom 
 * @returns 
 */
export function useDraggablePosition(initialRight = 20, initialBottom = 80) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const dragStarted = useRef(false);
  const startRef = useRef<{ mouseX: number; mouseY: number } | null>(null);

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragStarted.current = false;
    startRef.current = { mouseX: e.clientX, mouseY: e.clientY };

    function onMouseMove(ev: MouseEvent) {
      if (!btnRef.current || !startRef.current) return;
      dragStarted.current = true;
      const right = Math.max(0, window.innerWidth - ev.clientX - btnRef.current.offsetWidth / 2);
      const bottom = Math.max(0, window.innerHeight - ev.clientY - btnRef.current.offsetHeight / 2);
      btnRef.current.style.right = `${right}px`;
      btnRef.current.style.bottom = `${bottom}px`;
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  return { btnRef, onMouseDown, didDrag: dragStarted, initialRight, initialBottom };
}