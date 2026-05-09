import { describe, it, expect } from 'vitest';

import { detectLanguage } from './detectLanguage';

describe('detectLanguage', () => {

  it('returns "unknown" for empty string', () => {

    expect(detectLanguage('')).toBe('unknown');

  });

  it('returns "unknown" for whitespace only', () => {

    expect(detectLanguage('   ')).toBe('unknown');

  });

  it('returns "en" for English Latin text', () => {

    expect(detectLanguage('Glen Waverley 4 bedroom house')).toBe('en');

  });

  it('returns "zh" for Simplified Chinese', () => {

    expect(detectLanguage('找四房在Glen Waverley')).toBe('zh');

  });

  it('returns "zh" for Traditional Chinese', () => {

    expect(detectLanguage('尋找四房在墨爾本')).toBe('zh');

  });

  it('returns "ko" for Korean Hangul', () => {

    expect(detectLanguage('4 침실 집 찾기')).toBe('ko');

  });

  it('returns "ar" for Arabic', () => {

    expect(detectLanguage('ابحث عن منزل من 4 غرف')).toBe('ar');

  });

  it('returns "hi" for Hindi Devanagari', () => {

    expect(detectLanguage('4 बेडरूम का घर खोजें')).toBe('hi');

  });

  it('returns "th" for Thai', () => {

    expect(detectLanguage('ค้นหาบ้าน 4 ห้องนอน')).toBe('th');

  });

  it('returns "en" for Vietnamese (Latin script — documented Phase 0 limitation)', () => {

    expect(detectLanguage('Tìm nhà 4 phòng ngủ')).toBe('en');

  });

  it('returns "zh" when Chinese chars are mixed with Latin (≥30%)', () => {

    expect(detectLanguage('找4房 in Glen Waverley')).toBe('zh');

  });

  it('returns "en" when non-Latin chars are <30% (proper noun case)', () => {

    expect(detectLanguage('Looking for a house in 北京 area please help')).toBe('en');

  });

});