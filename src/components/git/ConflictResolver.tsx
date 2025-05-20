import { useState, useEffect } from 'react';
import { GitBrowserClient } from '@/lib/git/browser-client';

interface ConflictResolverProps {
  client: GitBrowserClient;
  conflictFiles: string[];
  onResolved: () => void;
  onCancel: () => void;
}

export function ConflictResolver({ client, conflictFiles, onResolved, onCancel }: ConflictResolverProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedFiles, setResolvedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 当选择冲突文件变化时，加载文件内容
  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    }
  }, [selectedFile]);

  // 初始化选择第一个冲突文件
  useEffect(() => {
    if (conflictFiles.length > 0 && !selectedFile) {
      setSelectedFile(conflictFiles[0]);
    }
  }, [conflictFiles, selectedFile]);

  // 加载文件内容
  async function loadFileContent(filePath: string) {
    setIsLoading(true);
    setError(null);
    
    try {
      const content = await client.getFileContent(filePath);
      setFileContent(content);
    } catch (error) {
      console.error('加载文件内容失败:', error);
      setError('加载文件内容失败');
    } finally {
      setIsLoading(false);
    }
  }

  // 保存解决后的文件内容
  async function saveResolvedContent() {
    if (!selectedFile) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await client.resolveConflict(selectedFile, fileContent);
      
      // 添加到已解决列表
      const newResolvedFiles = [...resolvedFiles, selectedFile];
      setResolvedFiles(newResolvedFiles);
      
      // 如果还有未解决的文件，选择下一个
      const nextUnresolved = conflictFiles.find(file => 
        !newResolvedFiles.includes(file)
      );
      
      if (nextUnresolved) {
        setSelectedFile(nextUnresolved);
      } else {
        // 所有文件都已解决
        onResolved();
      }
    } catch (error) {
      console.error('保存解决后的内容失败:', error);
      setError('保存解决后的内容失败');
    } finally {
      setIsLoading(false);
    }
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setFileContent(e.target.value);
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">解决合并冲突</h2>
      
      <div className="flex mb-4">
        <div className="w-1/4 mr-4">
          <h3 className="text-md font-medium mb-2">冲突文件</h3>
          <div className="bg-gray-50 p-2 rounded-md max-h-64 overflow-auto">
            {conflictFiles.map(file => (
              <div 
                key={file}
                onClick={() => setSelectedFile(file)}
                className={`
                  p-2 mb-1 cursor-pointer rounded
                  ${selectedFile === file ? 'bg-blue-100' : 'hover:bg-gray-200'}
                  ${resolvedFiles.includes(file) ? 'text-green-600' : ''}
                `}
              >
                {file}
                {resolvedFiles.includes(file) && (
                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">已解决</span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="w-3/4">
          <h3 className="text-md font-medium mb-2">
            {selectedFile ? `编辑: ${selectedFile}` : '选择一个文件'}
          </h3>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md">
              <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : selectedFile ? (
            <>
              <textarea
                value={fileContent}
                onChange={handleContentChange}
                className="w-full h-64 font-mono text-sm p-4 border border-gray-300 rounded-md"
              />
              
              <div className="flex justify-between mt-4">
                <div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                  >
                    取消
                  </button>
                  <button
                    onClick={saveResolvedContent}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    disabled={isLoading}
                  >
                    保存并解决冲突
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md text-gray-400">
              请选择一个冲突文件
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 