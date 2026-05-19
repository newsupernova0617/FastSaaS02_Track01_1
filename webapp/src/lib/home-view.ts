import type { BootstrapResponse, HomeResponse, TimelineResponse } from '../data/schemas';

export function buildHomeViewModel(
  homeData: HomeResponse,
  bootstrap: BootstrapResponse | null,
  timeline: TimelineResponse | null,
  isAuthenticated: boolean
) {
  const screen = homeData.screen;
  const bootstrapMessages = bootstrap?.messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
  })) ?? [];
  const timelineMessages = timeline?.items.map((item) => ({
    id: item.id,
    role: item.role,
    content: item.content,
  })) ?? [];
  const visibleMessages = timelineMessages.length
    ? timelineMessages.slice(-6)
    : bootstrapMessages.length
      ? bootstrapMessages.slice(-6)
      : screen.messages?.length
        ? screen.messages.slice(-4)
        : [
            { id: 1, role: 'user' as const, content: screen.userMessage },
            { id: 2, role: 'assistant' as const, content: screen.assistantMessage },
            { id: 3, role: 'user' as const, content: screen.followUpMessage },
          ];

  const latestMessage = visibleMessages[visibleMessages.length - 1] ?? null;
  const sessionId = timeline?.sessionId ?? bootstrap?.activeSession?.id ?? screen.sessionId ?? null;
  const subtitle = isAuthenticated
    ? latestMessage?.content ?? screen.card.sublabel
    : screen.card.sublabel;

  return {
    sessionId,
    dateLabel: screen.dateLabel,
    card: {
      ...screen.card,
      sublabel: subtitle,
    },
    inputPlaceholder: screen.inputPlaceholder,
    visibleMessages,
  };
}
