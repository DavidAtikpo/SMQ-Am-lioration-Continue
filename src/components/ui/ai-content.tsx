import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export function AiContent({
  content,
  variant = "light",
  className,
}: {
  content: string;
  variant?: "light" | "dark";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ai-content text-[13.5px] leading-relaxed",
        variant === "dark" && "ai-content-dark",
        className,
      )}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
