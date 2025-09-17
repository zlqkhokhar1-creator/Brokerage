declare module 'react-window' {
  import { ComponentType, CSSProperties, ReactElement } from 'react';

  export interface ListChildComponentProps {
    index: number;
    style: CSSProperties;
  }

  export interface FixedSizeListProps {
    children: ComponentType<ListChildComponentProps>;
    height: number;
    itemCount: number;
    itemSize: number;
    width: number | string;
    className?: string;
    style?: CSSProperties;
    direction?: 'ltr' | 'rtl';
    initialScrollOffset?: number;
    innerRef?: React.Ref<any>;
    innerElementType?: string | ComponentType<any>;
    itemData?: any;
    itemKey?: (index: number, data: any) => string | number;
    onItemsRendered?: (props: { overscanStartIndex: number; overscanStopIndex: number; visibleStartIndex: number; visibleStopIndex: number }) => void;
    onScroll?: (props: { scrollDirection: 'forward' | 'backward'; scrollOffset: number; scrollUpdateWasRequested: boolean }) => void;
    overscanCount?: number;
    useIsScrolling?: boolean;
  }

  export class FixedSizeList extends React.Component<FixedSizeListProps> {}
  export class VariableSizeList extends React.Component<any> {}
  export class FixedSizeGrid extends React.Component<any> {}
  export class VariableSizeGrid extends React.Component<any> {}
}
