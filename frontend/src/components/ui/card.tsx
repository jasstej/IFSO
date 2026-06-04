import * as React from "react"

export type CardProps = React.HTMLAttributes<HTMLDivElement>

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-card text-foreground shadow-glow-blue transition-all ${className}`}
      {...props}
    />
  )
}

export function CardHeader({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`flex flex-col space-y-1.5 p-6 border-b border-border/40 ${className}`}
      {...props}
    />
  )
}

export function CardTitle({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`font-semibold text-lg leading-none tracking-tight text-foreground ${className}`}
      {...props}
    />
  )
}

export function CardDescription({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-sm text-foreground/60 ${className}`}
      {...props}
    />
  )
}

export function CardContent({ className = "", ...props }: CardProps) {
  return (
    <div className={`p-6 ${className}`} {...props} />
  )
}

export function CardFooter({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`flex items-center p-6 pt-0 border-t border-border/40 ${className}`}
      {...props}
    />
  )
}
