import { useEffect, useRef, useState } from 'react';

import type { GuideSnapshot } from '../guide/guideController';
import { readJson, writeJson } from '../storage/kv';
import { addPlace, addStep, startWalk, type Walk } from './diary';

const WALKS_KEY = 'tourguide.walks';
const MAX_WALKS = 30;

function saveWalk(walk: Walk): Walk[] {
  const walks = [walk, ...readJson<Walk[]>(WALKS_KEY, []).filter((w) => w.id !== walk.id)].slice(0, MAX_WALKS);
  writeJson(WALKS_KEY, walks);
  return walks;
}

export function useWalkDiary(snapshot: GuideSnapshot, walking: boolean) {
  const [walks, setWalks] = useState<Walk[]>(() => readJson<Walk[]>(WALKS_KEY, []));
  const walkRef = useRef<Walk | null>(null);
  const lastPosRef = useRef<GuideSnapshot['position']>(null);

  useEffect(() => {
    if (walking && !walkRef.current) {
      walkRef.current = startWalk(Date.now());
      lastPosRef.current = null;
    } else if (!walking && walkRef.current) {
      const done = { ...walkRef.current, endedAt: Date.now() };
      walkRef.current = null;
      if (done.places.length > 0) setWalks(saveWalk(done));
    }
  }, [walking]);

  const { position, current, narration } = snapshot;
  useEffect(() => {
    if (!walkRef.current || !position) return;
    walkRef.current = addStep(walkRef.current, lastPosRef.current, position);
    lastPosRef.current = position;
  }, [position]);

  useEffect(() => {
    if (!walkRef.current || !current || !narration) return;
    walkRef.current = addPlace(walkRef.current, {
      id: current.id,
      title: current.title,
      at: Date.now(),
      narration,
      imageUrl: current.image?.url ?? null,
      url: current.url,
    });
  }, [current, narration]);

  return { walks };
}
