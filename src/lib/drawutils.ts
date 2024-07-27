export type Point = { x: number; y: number };

export function drawCircle(context: CanvasRenderingContext2D, center: Point, size: number) {
  context.moveTo(center.x, center.y);
  context.arc(center.x, center.y, size, 0, Math.PI * 2);
  // context.fillStyle = color;
  // context.fill();
}

export function drawLine(context: CanvasRenderingContext2D, start: Point, end: Point) {
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
}

export function findMidPoint(point1: Point, point2: Point): Point {
  return { x: (point1.x + point2.x) / 2, y: (point1.y + point2.y) / 2 };
}
