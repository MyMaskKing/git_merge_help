declare module 'clsx' {
  type ClassValue = string | number | boolean | undefined | null | { [key: string]: any } | ClassValue[]
  export function clsx(...inputs: ClassValue[]): string
  export default clsx
}

declare module 'tailwind-merge' {
  export function twMerge(...inputs: string[]): string
}

declare module '@radix-ui/react-select' {
  import * as React from 'react'

  type SelectProps = {
    value?: string
    onValueChange?: (value: string) => void
    children?: React.ReactNode
  }

  export const Root: React.FC<SelectProps>
  export const Group: React.FC<{ children?: React.ReactNode }>
  export const Value: React.FC<{ children?: React.ReactNode }>
  export const Trigger: React.FC<React.ComponentPropsWithoutRef<'button'>>
  export const Content: React.FC<React.ComponentPropsWithoutRef<'div'> & { position?: 'popper' }>
  export const Label: React.FC<React.ComponentPropsWithoutRef<'label'>>
  export const Item: React.FC<React.ComponentPropsWithoutRef<'div'>>
  export const ItemText: React.FC<{ children?: React.ReactNode }>
  export const ItemIndicator: React.FC<{ children?: React.ReactNode }>
  export const Separator: React.FC<React.ComponentPropsWithoutRef<'div'>>
  export const ScrollUpButton: React.FC<React.ComponentPropsWithoutRef<'button'>>
  export const ScrollDownButton: React.FC<React.ComponentPropsWithoutRef<'button'>>
  export const Portal: React.FC<{ children?: React.ReactNode }>
  export const Viewport: React.FC<React.ComponentPropsWithoutRef<'div'>>
  export const Icon: React.FC<{ asChild?: boolean; children?: React.ReactNode }>
}

declare module '@radix-ui/react-slot' {
  import * as React from 'react'

  interface SlotProps {
    children?: React.ReactNode
  }

  export const Slot: React.FC<SlotProps>
}

declare module 'class-variance-authority' {
  export type VariantProps<T extends (...args: any) => any> = {
    [K in keyof Parameters<T>[0]]: Parameters<T>[0][K]
  }

  export function cva(base: string, config?: {
    variants?: Record<string, Record<string, string>>
    defaultVariants?: Record<string, string>
    compoundVariants?: Array<Record<string, any> & { class: string }>
  }): (props?: Record<string, any>) => string
}

declare module 'lucide-react' {
  import * as React from 'react'

  interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string
    absoluteStrokeWidth?: boolean
  }

  export const Check: React.FC<IconProps>
  export const ChevronDown: React.FC<IconProps>
  export const ChevronUp: React.FC<IconProps>
} 