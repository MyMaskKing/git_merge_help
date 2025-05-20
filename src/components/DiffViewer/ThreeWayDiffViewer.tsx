'use client';

import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Editor } from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { computeDiff, getDecorations } from '@/lib/diff-utils';
import type { editor } from 'monaco-editor';

interface ThreeWayDiffViewerProps {
  baseContent: string;
  oursContent: string;
  theirsContent: string;
  fileName: string;
  className?: string;
}

export const ThreeWayDiffViewer: React.FC<ThreeWayDiffViewerProps> = ({
  baseContent,
  oursContent,
  theirsContent,
  fileName,
  className,
}) => {
  const baseEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const oursEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const theirsEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (oursEditorRef.current && theirsEditorRef.current) {
      // 计算差异并应用高亮
      const oursDiff = computeDiff(baseContent, oursContent);
      const theirsDiff = computeDiff(baseContent, theirsContent);

      const oursDecorations = getDecorations(oursDiff);
      const theirsDecorations = getDecorations(theirsDiff);

      oursEditorRef.current.deltaDecorations([], oursDecorations);
      theirsEditorRef.current.deltaDecorations([], theirsDecorations);
    }
  }, [baseContent, oursContent, theirsContent]);

  // 设置编辑器同步滚动
  const setupSyncScroll = (editor: editor.IStandaloneCodeEditor, type: 'base' | 'ours' | 'theirs') => {
    editor.onDidScrollChange((e) => {
      const scrollTop = e.scrollTop;
      const scrollLeft = e.scrollLeft;
      
      if (type !== 'base' && baseEditorRef.current) {
        baseEditorRef.current.setScrollPosition({
          scrollTop,
          scrollLeft,
        });
      }
      
      if (type !== 'ours' && oursEditorRef.current) {
        oursEditorRef.current.setScrollPosition({
          scrollTop,
          scrollLeft,
        });
      }
      
      if (type !== 'theirs' && theirsEditorRef.current) {
        theirsEditorRef.current.setScrollPosition({
          scrollTop,
          scrollLeft,
        });
      }
    });
  };

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, type: 'base' | 'ours' | 'theirs') => {
    if (type === 'base') {
      baseEditorRef.current = editor;
    } else if (type === 'ours') {
      oursEditorRef.current = editor;
    } else {
      theirsEditorRef.current = editor;
    }
    setupSyncScroll(editor, type);
  };

  return (
    <div className={cn('flex flex-col w-full h-full', className)}>
      <div className="grid grid-cols-3 gap-2 h-full">
        {/* BASE版本 */}
        <div className="flex flex-col border rounded-lg">
          <div className="p-2 bg-muted text-sm font-medium border-b">
            BASE（共同祖先）
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              defaultValue={baseContent}
              onMount={(editor) => handleEditorDidMount(editor, 'base')}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                lineNumbers: 'on',
                renderSideBySide: false,
                scrollBeyondLastLine: false,
                fontSize: 14,
                wordWrap: 'on',
              }}
            />
          </ScrollArea>
        </div>

        {/* OURS版本 */}
        <div className="flex flex-col border rounded-lg">
          <div className="p-2 bg-muted text-sm font-medium border-b">
            OURS（当前分支）
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              defaultValue={oursContent}
              onMount={(editor) => handleEditorDidMount(editor, 'ours')}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                lineNumbers: 'on',
                renderSideBySide: false,
                scrollBeyondLastLine: false,
                fontSize: 14,
                wordWrap: 'on',
              }}
            />
          </ScrollArea>
        </div>

        {/* THEIRS版本 */}
        <div className="flex flex-col border rounded-lg">
          <div className="p-2 bg-muted text-sm font-medium border-b">
            THEIRS（要合并的分支）
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              defaultValue={theirsContent}
              onMount={(editor) => handleEditorDidMount(editor, 'theirs')}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                lineNumbers: 'on',
                renderSideBySide: false,
                scrollBeyondLastLine: false,
                fontSize: 14,
                wordWrap: 'on',
              }}
            />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}; 