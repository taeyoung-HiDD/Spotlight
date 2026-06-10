"use client";

import { useCallback, useEffect, useRef } from "react";

type UseDebouncedPersistOptions<T> = {
  data: T;
  /** false면 자동 저장·플러시 비활성 (초기 로딩 등) */
  enabled?: boolean;
  delayMs?: number;
  save: (data: T) => Promise<void>;
};

/**
 * 입력 변경 후 debounce 저장. 사이드바 등으로 단계를 떠날 때(unmount) 대기 중인 변경을 즉시 저장.
 */
export function useDebouncedPersist<T>({
  data,
  enabled = true,
  delayMs = 700,
  save,
}: UseDebouncedPersistOptions<T>) {
  const dataRef = useRef(data);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const flush = useCallback(async (override?: T) => {
    if (override !== undefined) {
      dataRef.current = override;
    }
    if (!dirtyRef.current && override === undefined) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    dirtyRef.current = false;
    try {
      await saveRef.current(dataRef.current);
    } catch (error) {
      dirtyRef.current = true;
      throw error;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    dirtyRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      dirtyRef.current = false;
      void saveRef.current(dataRef.current).catch(() => {
        dirtyRef.current = true;
      });
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [data, enabled, delayMs]);

  useEffect(() => {
    return () => {
      if (!dirtyRef.current) return;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      dirtyRef.current = false;
      void saveRef.current(dataRef.current);
    };
  }, []);

  return { flush };
}
