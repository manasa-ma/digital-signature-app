import { useDraggable } from '@dnd-kit/core';

export function DraggableSignature({ id, x, y }: { id: string, x: number, y: number }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    position: 'absolute' as const,
    left: x,
    top: y,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} 
         className="border-2 border-dashed border-blue-500 p-2 bg-blue-100/50 cursor-move">
      Sign Here
    </div>
  );
}