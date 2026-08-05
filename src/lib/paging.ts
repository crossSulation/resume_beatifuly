export interface PackableBlock {
  key: string
  kind: 'header' | 'section' | 'entry' | 'content'
}

/**
 * 贪心分页：把块按顺序装入固定高度页面。
 * - 单个块不跨页（除非块本身高于整页）
 * - 章节标题不孤立：标题与下一块一起放不下时，把标题推到新页
 */
export function packBlocks(blocks: PackableBlock[], heights: number[], contentHeight: number): PackableBlock[][] {
  const pages: PackableBlock[][] = []
  let page: PackableBlock[] = []
  let used = 0

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const h = heights[i]

    if (block.kind === 'section' && page.length > 0) {
      const nextH = heights[i + 1] ?? 0
      if (used + h > contentHeight || used + h + nextH > contentHeight) {
        pages.push(page)
        page = []
        used = 0
      }
    }

    if (used + h > contentHeight && page.length > 0) {
      pages.push(page)
      page = []
      used = 0
    }

    page.push(block)
    used += h
  }

  if (page.length) {
    pages.push(page)
  }
  return pages
}
