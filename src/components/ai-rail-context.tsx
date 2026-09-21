'use client';

import { createContext, useContext, type ReactNode } from 'react';

// AI Communicator 우측 레일에 페이지가 자기 콘텐츠(예: 배너 어시스턴트)를 꽂아 넣기 위한 컨텍스트.
// setRail(id, node): node가 있으면 그 페이지가 레일의 소유자가 되고, null이면 자기 소유일 때만 비운다.
export type AiRailApi = { setRail: (id: string, node: ReactNode | null) => void };

export const AiRailContext = createContext<AiRailApi | null>(null);
export const useAiRail = () => useContext(AiRailContext);
