import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { calculateVisibleItems } from '../utils/performance';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  buffer?: number;
}

export const VirtualizedList = memo(<T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  buffer = 5
}: VirtualizedListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);

  const { start, end } = useMemo(() => 
    calculateVisibleItems(containerHeight, itemHeight, scrollTop, buffer),
    [containerHeight, itemHeight, scrollTop, buffer]
  );

  const visibleItems = useMemo(() => 
    items.slice(start, Math.min(end, items.length)),
    [items, start, end]
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = start * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={start + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}) as <T>(props: VirtualizedListProps<T>) => JSX.Element;
