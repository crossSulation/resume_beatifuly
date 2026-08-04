import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { Resume } from '../types/resume'

const HISTORY_LIMIT = 50

export function useResumeHistory(resume: Resume, setResume: Dispatch<SetStateAction<Resume>>) {
  const pastRef = useRef<Resume[]>([])
  const futureRef = useRef<Resume[]>([])
  const previousRef = useRef<Resume | null>(null)
  const skipRef = useRef(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false
      previousRef.current = resume
      return
    }
    if (previousRef.current) {
      pastRef.current = [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), previousRef.current]
    }
    previousRef.current = resume
    futureRef.current = []
    setCanUndo(pastRef.current.length > 0)
    setCanRedo(false)
  }, [resume])

  const undo = () => {
    const prev = pastRef.current[pastRef.current.length - 1]
    if (!prev) return
    pastRef.current = pastRef.current.slice(0, -1)
    futureRef.current = [...futureRef.current, resume]
    setCanUndo(pastRef.current.length > 0)
    setCanRedo(true)
    skipRef.current = true
    setResume(prev)
  }

  const redo = () => {
    const next = futureRef.current[futureRef.current.length - 1]
    if (!next) return
    futureRef.current = futureRef.current.slice(0, -1)
    pastRef.current = [...pastRef.current, resume]
    setCanUndo(true)
    setCanRedo(futureRef.current.length > 0)
    skipRef.current = true
    setResume(next)
  }

  const resetHistory = () => {
    pastRef.current = []
    futureRef.current = []
    previousRef.current = resume
    setCanUndo(false)
    setCanRedo(false)
  }

  return { canUndo, canRedo, undo, redo, resetHistory }
}
