declare module '@monaco-editor/react' {
  import * as React from 'react'
  
  export interface EditorProps {
    height: string | number
    defaultLanguage?: string
    defaultValue?: string
    value?: string
    theme?: string
    options?: any
    onChange?: (value: string | undefined) => void
    onMount?: (editor: any, monaco: any) => void
  }

  export interface DiffEditorProps {
    height: string | number
    original: string
    modified: string
    language?: string
    theme?: string
    options?: {
      readOnly?: boolean
      renderSideBySide?: boolean
      enableSplitViewResizing?: boolean
      ignoreTrimWhitespace?: boolean
      [key: string]: any
    }
    onMount?: (editor: any) => void
  }

  export const Editor: React.FC<EditorProps>
  export const DiffEditor: React.FC<DiffEditorProps>
}

declare module 'lucide-react' {
  import * as React from 'react'

  interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string
    absoluteStrokeWidth?: boolean
  }

  export const Search: React.FC<IconProps>
  export const Sun: React.FC<IconProps>
  export const Moon: React.FC<IconProps>
  export const Check: React.FC<IconProps>
  export const ChevronDown: React.FC<IconProps>
  export const ChevronUp: React.FC<IconProps>
  export const ArrowUpFromLine: React.FC<IconProps>
  export const Code: React.FC<IconProps>
} 