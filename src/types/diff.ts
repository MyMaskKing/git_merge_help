export type DiffLineType = 'add' | 'delete' | 'unchanged';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  lineNumber: number;
}

export interface DiffDecoration {
  range: {
    startLineNumber: number;
    endLineNumber: number;
    startColumn: number;
    endColumn: number;
  };
  options: {
    isWholeLine: boolean;
    className: string;
  };
} 