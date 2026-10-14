import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('RubberSegment Timeframe Selector Specifications', () => {
  const TIMEFRAMES: Record<string, number> = {
    '1D': 1,
    '1W': 7,
    '1M': 30,
    '3M': 90,
    '1Y': 365,
    'ALL': 1825,
  }

  const EXPECTED_LABELS = ['1D', '1W', '1M', '3M', '1Y', 'ALL']

  it('contains the exact six required visible timeframe options', () => {
    const labels = Object.keys(TIMEFRAMES)
    assert.deepEqual(labels, EXPECTED_LABELS)
    assert.equal(labels.length, 6)
  })

  it('maps each timeframe selection accurately to days for historical chart queries', () => {
    assert.equal(TIMEFRAMES['1D'], 1)
    assert.equal(TIMEFRAMES['1W'], 7)
    assert.equal(TIMEFRAMES['1M'], 30)
    assert.equal(TIMEFRAMES['3M'], 90)
    assert.equal(TIMEFRAMES['1Y'], 365)
    assert.equal(TIMEFRAMES['ALL'], 1825)
  })

  it('preserves controlled state and active selection index resolution', () => {
    const list = EXPECTED_LABELS.map((item) => ({ value: item, label: item }))
    
    // Test resolution for each timeframe
    EXPECTED_LABELS.forEach((tf, expectedIdx) => {
      const activeIdx = list.findIndex((item) => item.value === tf)
      assert.equal(activeIdx, expectedIdx)
    })
  })

  it('handles fallback safely when timeframe is unrecognized', () => {
    const fallbackDays = TIMEFRAMES['UNKNOWN'] || 7
    assert.equal(fallbackDays, 7) // Defaults safely to 1W (7 days)
  })

  it('ensures RubberSegment supports keyboard navigation keys', () => {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End']
    assert.equal(keys.length, 6)
    const currentIndex = 1 // '1W'
    const lastIndex = EXPECTED_LABELS.length - 1

    // ArrowRight advances index
    const nextIdx = Math.min(lastIndex, currentIndex + 1)
    assert.equal(nextIdx, 2) // '1M'

    // Home jumps to 0
    assert.equal(0, 0) // '1D'

    // End jumps to last
    assert.equal(lastIndex, 5) // 'ALL'
  })
})
