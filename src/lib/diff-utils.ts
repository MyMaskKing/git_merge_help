import { DiffLine } from '@/types/diff';

export function computeDiff(base: string, compare: string): DiffLine[] {
  const baseLines = base.split('\n');
  const compareLines = compare.split('\n');
  const result: DiffLine[] = [];
  
  let i = 0;
  let j = 0;
  
  while (i < baseLines.length || j < compareLines.length) {
    if (i >= baseLines.length) {
      // 基准文本已结束，剩余的都是新增行
      result.push({
        type: 'add',
        content: compareLines[j],
        lineNumber: j + 1,
      });
      j++;
    } else if (j >= compareLines.length) {
      // 比较文本已结束，剩余的都是删除行
      result.push({
        type: 'delete',
        content: baseLines[i],
        lineNumber: i + 1,
      });
      i++;
    } else if (baseLines[i] === compareLines[j]) {
      // 行内容相同
      result.push({
        type: 'unchanged',
        content: baseLines[i],
        lineNumber: i + 1,
      });
      i++;
      j++;
    } else {
      // 行内容不同
      result.push({
        type: 'delete',
        content: baseLines[i],
        lineNumber: i + 1,
      });
      result.push({
        type: 'add',
        content: compareLines[j],
        lineNumber: j + 1,
      });
      i++;
      j++;
    }
  }
  
  return result;
}

export function getDecorations(diffLines: DiffLine[]) {
  return diffLines.map((line, index) => {
    const decoration = {
      range: {
        startLineNumber: line.lineNumber,
        endLineNumber: line.lineNumber,
        startColumn: 1,
        endColumn: line.content.length + 1,
      },
      options: {
        isWholeLine: true,
        className: '',
      },
    };

    switch (line.type) {
      case 'add':
        decoration.options.className = 'bg-green-100 dark:bg-green-900/30';
        break;
      case 'delete':
        decoration.options.className = 'bg-red-100 dark:bg-red-900/30';
        break;
      default:
        decoration.options.className = '';
    }

    return decoration;
  });
} 