import ReportCard from './ReportCard';
import ReportChart from './ReportChart';
import ActionButton from './ActionButton';
import type { ChatMessage } from '../../api';

interface ChatBubbleProps {
  message: ChatMessage;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const metadata = message.metadata as Record<string, unknown> | undefined;
  const report = metadata?.report as Record<string, unknown> | undefined;

  // Parse metadata for report sections
  const reportSections = report?.sections as Array<Record<string, unknown>> || [];

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-2xl rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {/* Main message content */}
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>

        {/* Report sections (for assistant messages with report metadata) */}
        {!isUser && reportSections.length > 0 && (
          <div className="mt-4 space-y-3">
            {reportSections.map((section, idx) => {
              const sectionType = section.type as string;

              // Render different components based on section type
              if (['pie', 'bar', 'line'].includes(sectionType)) {
                return (
                  <ReportChart
                    key={idx}
                    section={section as any}
                  />
                );
              }

              if (['card', 'alert', 'suggestion'].includes(sectionType)) {
                return (
                  <ReportCard
                    key={idx}
                    section={section as any}
                  />
                );
              }

              return null;
            })}
          </div>
        )}

        {/* Action button for navigation */}
        {!isUser && metadata && (
          <div className="mt-3">
            <ActionButton metadata={metadata} />
          </div>
        )}
      </div>
    </div>
  );
}
