"use client"

import React, { useRef } from "react"
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  HTMLMotionProps,
} from "framer-motion"

interface MotionRevealProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  delay?: number
  duration?: number
  direction?: "up" | "down" | "left" | "right" | "none"
  distance?: number
  scale?: number
  once?: boolean
  amount?: number | "some" | "all"
}

export function MotionReveal({
  children,
  delay = 0,
  duration = 0.5,
  direction = "up",
  distance = 24,
  scale = 0.98,
  once = true,
  amount = 0.2,
  className,
  ...props
}: MotionRevealProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  const getInitialPosition = () => {
    switch (direction) {
      case "up":
        return { y: distance, x: 0 }
      case "down":
        return { y: -distance, x: 0 }
      case "left":
        return { x: distance, y: 0 }
      case "right":
        return { x: -distance, y: 0 }
      case "none":
        return { x: 0, y: 0 }
      default:
        return { y: distance, x: 0 }
    }
  }

  const initialPos = getInitialPosition()

  return (
    <motion.div
      initial={{
        opacity: 0,
        ...initialPos,
        scale: scale,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
      }}
      viewport={{ once, amount }}
      transition={{
        duration,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface MotionStaggerGroupProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  staggerChildren?: number
  delayChildren?: number
  once?: boolean
  amount?: number | "some" | "all"
}

export function MotionStaggerGroup({
  children,
  staggerChildren = 0.1,
  delayChildren = 0,
  once = true,
  amount = 0.15,
  className,
  ...props
}: MotionStaggerGroupProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren,
            delayChildren,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface MotionStaggerItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  distance?: number
  scale?: number
  duration?: number
}

export function MotionStaggerItem({
  children,
  distance = 20,
  scale = 0.97,
  duration = 0.45,
  className,
  ...props
}: MotionStaggerItemProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: distance, scale },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration,
            ease: [0.21, 0.47, 0.32, 0.98],
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface MotionCard3DTiltProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  tiltMaxAngleX?: number
  tiltMaxAngleY?: number
  scaleOnHover?: number
  enable3DTilt?: boolean
}

export function MotionCard3DTilt({
  children,
  tiltMaxAngleX = 7,
  tiltMaxAngleY = 7,
  scaleOnHover = 1.02,
  enable3DTilt = true,
  className,
  ...props
}: MotionCard3DTiltProps) {
  const shouldReduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 25 })
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 25 })

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [tiltMaxAngleX, -tiltMaxAngleX])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-tiltMaxAngleY, tiltMaxAngleY])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || shouldReduceMotion || !enable3DTilt) return
    const rect = ref.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: enable3DTilt ? rotateX : 0,
        rotateY: enable3DTilt ? rotateY : 0,
        transformStyle: "preserve-3d",
      }}
      whileHover={{
        scale: scaleOnHover,
        y: -4,
        transition: { duration: 0.2, ease: "easeOut" },
      }}
      whileTap={{ scale: 0.98 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface MotionButtonProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  scaleDown?: number
  scaleHover?: number
}

export function MotionButton({
  children,
  scaleDown = 0.96,
  scaleHover = 1.02,
  className,
  ...props
}: MotionButtonProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      whileHover={{ scale: scaleHover }}
      whileTap={{ scale: scaleDown }}
      transition={{ duration: 0.15 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}
